import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { loadGraph, loadScopes, orderedPhases, phaseById } from "./graph.ts";
import { loadState, now, saveState, setScope, transition } from "./state.ts";
import {
  advisoryFindings,
  blockingFails,
  hasSensor,
  runSensors,
  writeQualityReport,
} from "./sensors/registry.ts";
import { isLocked, loadAssessment, lockIntegrity } from "./assess.ts";
import { audit } from "./audit.ts";
import { lessonsFor, recordLessons } from "./lessons.ts";
import { intentFor } from "./intent.ts";
import { applicablePaths, allPaths, evaluate, planSensors } from "./applicability.ts";
import { repoRoot } from "./paths.ts";
import { STATE_MARK } from "./types.ts";
import type { AcgState, Directive, PhaseDef, ReportResult, SensorFinding } from "./types.ts";

export function statusText(root = repoRoot()): string {
  const state = loadState(root);
  const lines = [
    `ACG engine  project=${state.project}  scope=${state.scope}`,
    `cursor: ${state.cursor.phase ?? "done"} (${state.cursor.state})`,
    "",
  ];
  for (const p of orderedPhases(state.scope)) {
    const rec = state.phases[p.id];
    if (!rec) continue;
    const extras: string[] = [];
    if (rec.blockers?.length) {
      // One sensor can report many findings; the board names it once, with the count.
      const counts = new Map<string, number>();
      for (const b of rec.blockers) counts.set(b.sensor, (counts.get(b.sensor) ?? 0) + 1);
      extras.push(
        [...counts]
          .map(([sensor, n]) => (n > 1 ? `${sensor}×${n}` : sensor))
          .join(" "),
      );
    }
    if (rec.skip_reason) extras.push(`skipped: ${rec.skip_reason}`);
    if (p.reviewer) extras.push(rec.review ? `review:${rec.review.verdict}` : "review:pending");
    const suffix = extras.length ? `  ${extras.join("  ")}` : "";
    lines.push(`${STATE_MARK[rec.state]} ${p.id.padEnd(22)} ${p.title}${suffix}`);
  }
  const locks =
    Object.entries(state.locks)
      .map(([k, v]) => `${k}:${v.status}`)
      .join(" ") || "(none)";
  lines.push("", `locks: ${locks}`);
  return lines.join("\n");
}

export function next(root = repoRoot()): Directive {
  const state = loadState(root);

  // A decision that moved invalidates everything downstream of it — including phases
  // already marked complete. Checked before anything else, because carrying on would
  // be building on an answer the finished work never saw.
  const drifted = lockDrift(state, root);
  if (drifted) return drifted;

  for (const p of orderedPhases(state.scope)) {
    const rec = state.phases[p.id];
    if (!rec) continue;
    if (rec.state === "completed" || rec.state === "skipped") continue;

    // A phase the project does not have is skipped on the record, not left pending
    // forever and not handed to the conductor to fabricate.
    const shape = evaluate(p.when, root);
    if (!shape.applicable) {
      transition(state, p.id, "skipped");
      rec.skip_reason = shape.reason;
      saveState(state, root);
      audit("STAGE_SKIPPED", { phase: p.id, reason: shape.reason }, root);
      continue;
    }

    const lockBlocker = lockDirective(p, state, root);
    if (lockBlocker) return lockBlocker;

    const base = {
      phase: p.id,
      scope: state.scope,
      skill: p.skill,
      step: p.step,
      must_read: applicablePaths(p.consumes, root),
      must_write: applicablePaths(p.produces, root),
      intent: intentFor(p.id, state.scope, root),
      reviewer: p.reviewer ?? false,
      lessons: lessonsFor(p.id, root),
    };

    if (rec.state === "awaiting_approval") {
      if (p.reviewer && !rec.review) {
        return {
          ...base,
          action: "await-review",
          blockers: rec.blockers,
          advisories: rec.advisories,
          message: `${p.id} needs an independent reviewer verdict — run the acg-reviewer subagent, then \`review --phase ${p.id} --verdict approved|rejected\``,
        };
      }
      return {
        ...base,
        action: "await-gate",
        blockers: rec.blockers,
        advisories: rec.advisories,
        message: `Waiting for human approval on ${p.id}`,
      };
    }

    if (rec.state === "revising") {
      return {
        ...base,
        action: "blocked",
        blockers: rec.blockers,
        advisories: rec.advisories,
        message: `${p.id} is revising — blocking sensors must pass before approval`,
      };
    }

    if (rec.state === "pending") {
      transition(state, p.id, "in_progress");
      saveState(state, root);
      audit("STAGE_STARTED", { phase: p.id, scope: state.scope }, root);
    }

    return { ...base, action: "run-phase" };
  }
  return { action: "done", phase: null, scope: state.scope, message: "All phases completed or skipped" };
}

/**
 * Has a decision moved under a phase that was already approved?
 *
 * The remedy is always the same and always the plan's: `redo` from the first phase that
 * consumed the answer. The engine refuses to advance until then rather than quietly
 * treating finished work as still valid.
 */
function lockDrift(state: AcgState, root: string): Directive | null {
  for (const p of orderedPhases(state.scope)) {
    const rec = state.phases[p.id];
    if (!rec || rec.state !== "completed" || !p.requires_lock) continue;
    const approvedUnder = rec.approved_with_lock;
    if (!approvedUnder) continue; // approved before this was recorded; nothing to compare
    const doc = loadAssessment(p.requires_lock, root);
    const current = doc?.fingerprint ?? null;
    if (!current || current === approvedUnder.fingerprint) continue;
    const message =
      `${p.id} was approved under ${approvedUnder.id} fingerprint ${short(approvedUnder.fingerprint)}, ` +
      `but that lock is now ${short(current)}. The decision moved after the work was accepted — ` +
      `redo from the first phase that consumes ${approvedUnder.id}.`;
    return {
      action: "blocked",
      phase: p.id,
      scope: state.scope,
      skill: ".claude/commands/util/assessment.md",
      message,
      blockers: [{ sensor: "assessment-lock", status: "fail", blocking: true, message }],
    };
  }
  return null;
}

function short(fp: string): string {
  return `${fp.slice(0, 12)}…`;
}

/** A phase whose assessment is unlocked, or locked but tampered with, cannot start. */
function lockDirective(p: PhaseDef, state: AcgState, root: string): Directive | null {
  if (!p.requires_lock) return null;
  if (!isLocked(p.requires_lock, root)) {
    return {
      action: "ask-assessment",
      phase: p.id,
      scope: state.scope,
      skill: ".claude/commands/util/assessment.md",
      message: `${p.id} requires locked ${p.requires_lock}.yaml`,
      blockers: [
        {
          sensor: "assessment-lock",
          status: "fail",
          blocking: true,
          message: `${p.requires_lock} is not locked — answer the questionnaire, then \`assess-lock --id ${p.requires_lock}\``,
        },
      ],
    };
  }
  const integrity = lockIntegrity(p.requires_lock, root);
  if (!integrity.ok) {
    return {
      action: "blocked",
      phase: p.id,
      scope: state.scope,
      skill: ".claude/commands/util/assessment.md",
      message: integrity.message,
      blockers: [
        { sensor: "assessment-lock", status: "fail", blocking: true, message: integrity.message },
      ],
    };
  }
  return null;
}

export interface GateOptions {
  /**
   * Run the sensors and report, but write nothing: no quality report, no lesson, and
   * an audit line marked as exploratory.
   *
   * `gate` is invited as a "what would the sensors say?" command, and every such run
   * used to overwrite the phase's recorded evidence. A report describing a hypothesis
   * someone was trying out is worse than no report, because the gate — and any
   * reviewer — reads it as the phase's own verdict.
   *
   * Found when an independent reviewer read the audit trail, saw a locked answer
   * round-trip 11 → 12 → 11 in 270ms with a `fail` report left behind, and refused to
   * certify the phase. It was right to: from the files alone, a demonstration is
   * indistinguishable from moving the requirement to fit the artifact.
   */
  dryRun?: boolean;
}

export function gate(
  phaseId: string,
  root = repoRoot(),
  options: GateOptions = {},
): SensorFinding[] {
  const def = phaseById(phaseId);
  const plan = planSensors([...def.sensors, ...def.advisory_sensors], root);
  const findings = runSensors(plan.run, root, {
    phase: phaseId,
    advisory: def.advisory_sensors.map((s) => s.id),
    skipped: plan.skipped,
  });
  const status = blockingFails(findings).length ? "fail" : "pass";
  if (options.dryRun) {
    audit("SENSOR_DRY_RUN", { phase: phaseId, status, recorded: false }, root);
    return findings;
  }
  writeQualityReport(phaseId, findings, root);
  recordLessons(phaseId, findings, root);
  audit("SENSOR_RUN", { phase: phaseId, status }, root);
  return findings;
}

export function report(
  phaseId: string,
  result: ReportResult,
  note?: string,
  root = repoRoot(),
): { ok: boolean; findings: SensorFinding[]; message: string } {
  const state = loadState(root);
  const rec = state.phases[phaseId];
  if (!rec) throw new Error(`Unknown phase ${phaseId} in scope ${state.scope}`);
  const def = phaseById(phaseId);

  if (result === "rejected") {
    if (rec.state === "pending") transition(state, phaseId, "in_progress");
    if (rec.state === "in_progress" || rec.state === "awaiting_approval") {
      transition(state, phaseId, "revising");
    }
    rec.blockers = [
      {
        sensor: "human-rejected",
        status: "fail",
        blocking: true,
        message: note ?? "Rejected at gate",
      },
    ];
    rec.review = null;
    saveState(state, root);
    audit("GATE_REJECTED", { phase: phaseId, note }, root);
    return { ok: true, findings: rec.blockers, message: `${phaseId} → revising` };
  }

  const findings = gate(phaseId, root);
  const fails = blockingFails(findings);
  rec.advisories = advisoryFindings(findings);

  if (result === "awaiting-approval") {
    if (rec.state === "pending") transition(state, phaseId, "in_progress");
    if (fails.length) {
      if (rec.state === "in_progress" || rec.state === "awaiting_approval") {
        transition(state, phaseId, "revising");
      }
      rec.blockers = fails;
      saveState(state, root);
      audit("SENSOR_FAILED", { phase: phaseId, sensors: unique(fails) }, root);
      return {
        ok: false,
        findings,
        message: `${phaseId} cannot enter approval — ${fails.length} blocking sensor finding(s): ${unique(fails).join(", ")}`,
      };
    }
    if (rec.state === "in_progress" || rec.state === "revising") {
      transition(state, phaseId, "awaiting_approval");
    }
    rec.blockers = [];
    // A rejected review belongs to the submission that was rejected. Re-submitting
    // needs a fresh verdict — leaving the old one in place made the phase permanently
    // unapprovable while `next` reported it as merely awaiting a human.
    if (def.reviewer && rec.review?.verdict === "rejected") rec.review = null;
    saveState(state, root);
    audit("STAGE_AWAITING_APPROVAL", { phase: phaseId }, root);
    const pendingReview = def.reviewer && !rec.review;
    return {
      ok: true,
      findings,
      message: pendingReview
        ? `${phaseId} → awaiting approval (independent review still required)`
        : `${phaseId} → awaiting approval`,
    };
  }

  // approved
  if (fails.length) {
    if (rec.state === "awaiting_approval" || rec.state === "in_progress") {
      transition(state, phaseId, "revising");
    }
    rec.blockers = fails;
    saveState(state, root);
    audit("GATE_REJECTED", { phase: phaseId, reason: "sensors" }, root);
    return {
      ok: false,
      findings,
      message: `Refuse approved: ${phaseId} has blocking sensor failures (${unique(fails).join(", ")})`,
    };
  }
  if (def.reviewer && rec.review?.verdict !== "approved") {
    saveState(state, root);
    return {
      ok: false,
      findings,
      message: `Refuse approved: ${phaseId} requires an independent reviewer verdict (\`review --phase ${phaseId} --verdict approved\`)`,
    };
  }
  if (rec.state === "pending") transition(state, phaseId, "in_progress");
  if (rec.state === "in_progress" || rec.state === "revising") {
    transition(state, phaseId, "awaiting_approval");
  }
  transition(state, phaseId, "completed");
  rec.blockers = [];
  // Remember which decision this was approved under, so a later re-lock cannot leave
  // the phase `[x]` under answers it never saw.
  if (def.requires_lock) {
    const doc = loadAssessment(def.requires_lock, root);
    rec.approved_with_lock = doc?.fingerprint
      ? { id: def.requires_lock, fingerprint: doc.fingerprint }
      : null;
  }
  saveState(state, root);
  audit(
    "GATE_APPROVED",
    { phase: phaseId, lock: rec.approved_with_lock ?? undefined },
    root,
  );
  audit("STAGE_COMPLETED", { phase: phaseId }, root);
  return { ok: true, findings, message: `${phaseId} → completed` };
}

/** Record the independent reviewer's verdict (slice 9). Sensors still rule. */
export function review(
  phaseId: string,
  verdict: "approved" | "rejected",
  note: string | undefined,
  root = repoRoot(),
): string {
  const state = loadState(root);
  const rec = state.phases[phaseId];
  if (!rec) throw new Error(`Unknown phase ${phaseId}`);
  const def = phaseById(phaseId);
  if (!def.reviewer) throw new Error(`${phaseId} does not require an independent review`);
  rec.review = { verdict, note, at: now() };
  if (verdict === "rejected") {
    if (rec.state === "in_progress" || rec.state === "awaiting_approval") {
      transition(state, phaseId, "revising");
    }
    rec.blockers = [
      {
        sensor: "independent-review",
        status: "fail",
        blocking: true,
        message: note ?? "Independent reviewer rejected the phase",
      },
    ];
  }
  saveState(state, root);
  audit("REVIEW_RECORDED", { phase: phaseId, verdict, note }, root);
  return verdict === "approved"
    ? `${phaseId} review recorded: approved`
    : `${phaseId} review recorded: rejected → revising`;
}

export function redo(phaseId: string, root = repoRoot(), cascade = true): string[] {
  const state = loadState(root);
  const rec = state.phases[phaseId];
  if (!rec) throw new Error(`Unknown phase ${phaseId}`);
  const phases = orderedPhases(state.scope);
  const from = phases.findIndex((p) => p.id === phaseId);
  if (from < 0) throw new Error(`${phaseId} is not in scope ${state.scope}`);
  const touched: string[] = [];
  const targets = cascade ? phases.slice(from) : [phases[from]];
  for (const p of targets) {
    const r = state.phases[p.id];
    if (!r) continue;
    if (r.state === "pending") continue;
    r.state = "pending";
    r.completed_at = null;
    r.blockers = [];
    r.advisories = [];
    r.review = null;
    r.approved_with_lock = null;
    delete r.skip_reason;
    touched.push(p.id);
  }
  saveState(state, root);
  audit("STAGE_REDO", { phase: phaseId, cascade, reset: touched }, root);
  return touched;
}

/**
 * Skip forward. Everything not yet complete before the target becomes `[S]` with a
 * reason, so the gap is on the record instead of being silently jumped over.
 */
export function jump(phaseId: string, reason: string | undefined, root = repoRoot()): string[] {
  const state = loadState(root);
  const phases = orderedPhases(state.scope);
  const target = phases.findIndex((p) => p.id === phaseId);
  if (target < 0) throw new Error(`${phaseId} is not in scope ${state.scope}`);
  const skipped: string[] = [];
  for (const p of phases.slice(0, target)) {
    const rec = state.phases[p.id];
    if (!rec || rec.state === "completed" || rec.state === "skipped") continue;
    transition(state, p.id, "skipped");
    rec.skip_reason = reason ?? `jumped to ${phaseId}`;
    skipped.push(p.id);
  }
  saveState(state, root);
  audit("STAGE_JUMPED", { phase: phaseId, reason, skipped }, root);
  return skipped;
}

export function changeScope(scope: string, root = repoRoot()): string {
  const scopes = loadScopes();
  if (!scopes[scope]) {
    throw new Error(`Unknown scope "${scope}". Available: ${Object.keys(scopes).join(", ")}`);
  }
  const state = setScope(loadState(root), scope);
  saveState(state, root);
  audit("SCOPE_CHANGED", { scope }, root);
  return `scope=${scope} (${scopes[scope].description ?? ""})`;
}

export interface DoctorFinding {
  ok: boolean;
  check: string;
  message: string;
}

/**
 * Management plane. Everything the data plane assumes but never verifies: does the
 * graph agree with the skill frontmatter, do the sensors exist, is every declared
 * input on disk, is each lock still intact.
 */
export function doctor(root = repoRoot()): DoctorFinding[] {
  const out: DoctorFinding[] = [];
  const graph = loadGraph();
  const state = loadState(root);

  const ordinals = graph.phases.map((p) => p.ordinal);
  out.push({
    ok: new Set(ordinals).size === ordinals.length,
    check: "graph/ordinals",
    message: `${graph.phases.length} phases, ${new Set(ordinals).size} distinct ordinals`,
  });

  for (const p of graph.phases) {
    for (const ref of [...p.sensors, ...p.advisory_sensors]) {
      const id = ref.id;
      out.push({
        ok: hasSensor(id),
        check: `graph/${p.id}/sensor`,
        message: hasSensor(id) ? `${id} registered` : `${id} is not registered in the sensor registry`,
      });
      if (!ref.when) continue;
      // A condition on an answer that no questionnaire can hold is a check that is
      // silently off forever.
      const known = assessmentHasKey(ref.when.assessment, ref.when.key, root);
      out.push({
        ok: known,
        check: `graph/${p.id}/when`,
        message: known
          ? `${id} is conditional on ${ref.when.assessment}.${ref.when.key}`
          : `${id} is conditional on ${ref.when.assessment}.${ref.when.key}, which that questionnaire's schema does not define`,
      });
    }
    const fm = frontmatter(join(root, p.skill));
    if (!fm) {
      out.push({ ok: false, check: `skill/${p.id}`, message: `${p.skill} has no machine frontmatter` });
      continue;
    }
    const produces = new Set<string>([...asList(fm.produces), ...asList(fm.also_writes)]);
    const missing = allPaths(p.produces).filter((x) => !produces.has(x));
    out.push({
      ok: missing.length === 0,
      check: `skill/${p.id}/produces`,
      message: missing.length
        ? `${p.skill} frontmatter does not declare: ${missing.join(", ")}`
        : `${p.skill} frontmatter matches the graph`,
    });

    // One skill file can back several engine stages (Phase 1 is 01a/01b/01c), so a
    // multi-stage file declares its per-stage sensors under `stages:`.
    const stage = asStages(fm.stages).find((st) => st.id === p.id);
    const declaredSensors = new Set<string>(asList(stage ? stage.sensors : fm.sensors));
    const missingSensors = p.sensors.map((r) => r.id).filter((x) => !declaredSensors.has(x));
    out.push({
      ok: missingSensors.length === 0,
      check: `skill/${p.id}/sensors`,
      message: missingSensors.length
        ? `${p.skill} frontmatter does not list blocking sensor(s): ${missingSensors.join(", ")}`
        : `${p.sensors.length} blocking sensor(s) declared in both places`,
    });

    const fmLock = stage ? undefined : (fm.requires_lock as string | undefined);
    out.push({
      ok: (fmLock ?? undefined) === (p.requires_lock ?? undefined),
      check: `skill/${p.id}/requires_lock`,
      message:
        (fmLock ?? undefined) === (p.requires_lock ?? undefined)
          ? `requires_lock=${p.requires_lock ?? "none"}`
          : `graph says requires_lock=${p.requires_lock ?? "none"}, frontmatter says ${fmLock ?? "none"}`,
    });

    // A multi-stage skill must say which section each engine step is, or
    // "read the skill at its step" has no answer.
    if (p.step !== "all") {
      const body = existsSync(join(root, p.skill)) ? readFileSync(join(root, p.skill), "utf8") : "";
      const marked = body.includes(`engine step: \`${p.step}\``);
      out.push({
        ok: marked,
        check: `skill/${p.id}/step`,
        message: marked
          ? `${p.skill} marks the "${p.step}" section`
          : `${p.skill} has no section marked \`engine step: ${p.step}\` — the conductor cannot find it`,
      });
    }

    const fmReviewer = Boolean(fm.reviewer);
    out.push({
      ok: fmReviewer === Boolean(p.reviewer),
      check: `skill/${p.id}/reviewer`,
      message:
        fmReviewer === Boolean(p.reviewer)
          ? `reviewer=${Boolean(p.reviewer)}`
          : `graph says reviewer=${Boolean(p.reviewer)}, frontmatter says ${fmReviewer}`,
    });
    // A phase that has not started yet is *supposed* to be missing its inputs — the
    // earlier phases have not written them. doctor reports drift, and "Phase 9 has not
    // happened" is not drift. `files-exist` is what refuses the gate when the phase
    // actually runs.
    const phaseState = state.phases[p.id]?.state;
    const notStarted = phaseState === "pending" || phaseState === "skipped";
    for (const ref of p.consumes) {
      const verdict = evaluate(ref.when, root);
      if (!verdict.applicable) {
        out.push({
          ok: true,
          check: `consumes/${p.id}`,
          message: `${ref.path} not required here (${verdict.reason})`,
        });
        continue;
      }
      const exists = existsSync(join(root, ref.path));
      if (!exists && notStarted) {
        out.push({
          ok: true,
          check: `consumes/${p.id}`,
          message: `${ref.path} not produced yet (${p.id} is ${phaseState === "skipped" ? "[S] skipped" : "[ ] pending"})`,
        });
        continue;
      }
      out.push({
        ok: exists,
        check: `consumes/${p.id}`,
        message: exists ? `${ref.path} present` : `${p.id} consumes ${ref.path}, which does not exist`,
      });
    }
  }

  for (const id of Object.keys(state.locks)) {
    const integrity = lockIntegrity(id, root);
    out.push({ ok: integrity.ok, check: `lock/${id}`, message: integrity.message });
  }
  for (const p of graph.phases) {
    const rec = state.phases[p.id];
    if (!rec || rec.state !== "completed" || !p.requires_lock) continue;
    const approvedUnder = rec.approved_with_lock;
    if (!approvedUnder) continue;
    const current = loadAssessment(p.requires_lock, root)?.fingerprint ?? null;
    const same = current === approvedUnder.fingerprint;
    out.push({
      ok: same,
      check: `lock-drift/${p.id}`,
      message: same
        ? `approved under ${approvedUnder.id} ${short(approvedUnder.fingerprint)}, still current`
        : `approved under ${approvedUnder.id} ${short(approvedUnder.fingerprint)}, which is now ${short(current ?? "gone")} — redo from the first phase that consumes it`,
    });
  }
  const inScope = new Set(orderedPhases(state.scope).map((p) => p.id));
  const stray = Object.keys(state.phases).filter((id) => !inScope.has(id));
  out.push({
    ok: stray.length === 0,
    check: "state/scope",
    message: stray.length ? `state carries out-of-scope phases: ${stray.join(", ")}` : `state matches scope ${state.scope}`,
  });
  return out;
}

/** Does the questionnaire's JSON Schema define this answer key? */
function assessmentHasKey(id: string, key: string, root: string): boolean {
  const schemaPath = join(root, "artifact-schemas", `${id}.schema.json`);
  if (!existsSync(schemaPath)) return false;
  try {
    const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as {
      properties?: { answers?: { properties?: Record<string, unknown> } };
    };
    return Boolean(schema.properties?.answers?.properties?.[key]);
  } catch {
    return false;
  }
}

function frontmatter(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  const body = readFileSync(path, "utf8");
  const m = body.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  try {
    return (parse(m[1]) as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}

interface FrontmatterStage {
  id?: string;
  sensors?: unknown;
}

function asStages(value: unknown): FrontmatterStage[] {
  return Array.isArray(value) ? (value as FrontmatterStage[]) : [];
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return [value];
  return [];
}

function unique(findings: SensorFinding[]): string[] {
  return [...new Set(findings.map((f) => f.sensor))];
}
