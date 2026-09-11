import { loadAssessment, lockIntegrity } from "./assess.ts";
import { repoRoot } from "./paths.ts";
import type { Condition, PathRef, SensorRef } from "./types.ts";

export interface Verdict {
  applicable: boolean;
  /** Why, in words a person can act on. Always set, including when applicable. */
  reason: string;
}

/**
 * Evaluate a condition against the locked questionnaires.
 *
 * Default-on: no condition, an unlocked assessment, or a missing answer all leave the
 * check applicable. A sensor should never disappear because someone has not answered
 * a question yet — only because someone answered it, locked it, and the engine can
 * still prove the answer has not been edited since.
 */
export function evaluate(when: Condition | undefined, root = repoRoot()): Verdict {
  if (!when) return { applicable: true, reason: "unconditional" };

  const doc = loadAssessment(when.assessment, root);
  if (!doc) {
    return { applicable: true, reason: `${when.assessment}.yaml is missing — checking anyway` };
  }
  if (doc.status !== "locked") {
    return {
      applicable: true,
      reason: `${when.assessment} is ${doc.status}, not locked — checking anyway`,
    };
  }
  const integrity = lockIntegrity(when.assessment, root);
  if (!integrity.ok) {
    return { applicable: true, reason: `${integrity.message} — checking anyway` };
  }

  const raw = doc.answers?.[when.key];
  if (raw == null || raw === "") {
    return {
      applicable: true,
      reason: `${when.assessment}.${when.key} is unanswered — checking anyway`,
    };
  }
  const value = String(raw);
  const where = `${when.assessment}.${when.key}=${value}`;

  if (when.present !== undefined) {
    return when.present
      ? { applicable: true, reason: `${where} is answered` }
      : { applicable: false, reason: `${where} is answered, so this does not apply` };
  }
  if (when.equals !== undefined) {
    return value === when.equals
      ? { applicable: true, reason: `${where} equals ${when.equals}` }
      : { applicable: false, reason: `${where} is not ${when.equals}` };
  }
  if (when.not !== undefined) {
    return value !== when.not
      ? { applicable: true, reason: `${where} is not ${when.not}` }
      : { applicable: false, reason: `${where} is ${when.not}` };
  }
  if (when.in) {
    return when.in.includes(value)
      ? { applicable: true, reason: `${where} is one of ${when.in.join(", ")}` }
      : { applicable: false, reason: `${where} is not one of ${when.in.join(", ")}` };
  }
  if (when.not_in) {
    return when.not_in.includes(value)
      ? { applicable: false, reason: `${where} is one of ${when.not_in.join(", ")}` }
      : { applicable: true, reason: `${where} is none of ${when.not_in.join(", ")}` };
  }
  return { applicable: true, reason: `${where} has no operator to test — checking anyway` };
}

/** Paths whose condition holds. Used for "must this exist?" questions. */
export function applicablePaths(refs: PathRef[], root = repoRoot()): string[] {
  return refs.filter((r) => evaluate(r.when, root).applicable).map((r) => r.path);
}

/** Every declared path, condition or not. Used for write isolation. */
export function allPaths(refs: PathRef[]): string[] {
  return refs.map((r) => r.path);
}

export interface SensorPlan {
  run: string[];
  skipped: { id: string; reason: string }[];
}

export function planSensors(refs: SensorRef[], root = repoRoot()): SensorPlan {
  const plan: SensorPlan = { run: [], skipped: [] };
  for (const ref of refs) {
    const verdict = evaluate(ref.when, root);
    if (verdict.applicable) plan.run.push(ref.id);
    else plan.skipped.push({ id: ref.id, reason: verdict.reason });
  }
  return plan;
}
