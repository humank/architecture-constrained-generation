import { afterEach, describe, expect, test } from "bun:test";
import { applicablePaths, allPaths, evaluate, planSensors } from "../src/applicability.ts";
import { lockAssessment } from "../src/assess.ts";
import { importFromArch } from "../src/importer.ts";
import { doctor, gate, next, statusText } from "../src/orchestrate.ts";
import { phaseById } from "../src/graph.ts";
import { loadState } from "../src/state.ts";
import { REPO, cleanup, readArch, scratchRoot, writeArch } from "./helpers.ts";

const roots: string[] = [];
function scratch(): string {
  const r = scratchRoot();
  roots.push(r);
  return r;
}
afterEach(() => {
  while (roots.length) cleanup(roots.pop()!);
});

/** Re-answer the questionnaires and re-lock, the way a real project would. */
function reshape(root: string, a2: Record<string, unknown>, a8: Record<string, unknown> = {}): void {
  for (const [id, answers] of [["assessment-2", a2], ["assessment-8", a8]] as const) {
    if (Object.keys(answers).length === 0) continue;
    const doc = readArch<{ answers: Record<string, unknown> }>(root, `${id}.yaml`);
    Object.assign(doc.answers, answers);
    writeArch(root, `${id}.yaml`, doc);
    lockAssessment(id, root);
  }
}

describe("evaluate", () => {
  test("no condition is unconditional", () => {
    expect(evaluate(undefined, REPO)).toEqual({ applicable: true, reason: "unconditional" });
  });

  test("every operator", () => {
    const on = (extra: Record<string, unknown>) =>
      evaluate({ assessment: "assessment-2", key: "ui_kind", ...extra }, REPO).applicable;
    expect(on({ equals: "spa" })).toBe(true);
    expect(on({ equals: "cli" })).toBe(false);
    expect(on({ not: "cli" })).toBe(true);
    expect(on({ not: "spa" })).toBe(false);
    expect(on({ in: ["spa", "mpa"] })).toBe(true);
    expect(on({ in: ["cli"] })).toBe(false);
    expect(on({ not_in: ["cli", "none"] })).toBe(true);
    expect(on({ not_in: ["spa"] })).toBe(false);
    expect(on({ present: true })).toBe(true);
    expect(on({ present: false })).toBe(false);
  });

  test("the reason always names the answer it read", () => {
    const v = evaluate({ assessment: "assessment-2", key: "ui_kind", equals: "cli" }, REPO);
    expect(v.reason).toContain("assessment-2.ui_kind=spa");
  });

  test("default-on: an unlocked assessment leaves the check running", () => {
    const root = scratch();
    const doc = readArch<Record<string, unknown>>(root, "assessment-2.yaml");
    doc.status = "draft";
    writeArch(root, "assessment-2.yaml", doc);
    const v = evaluate({ assessment: "assessment-2", key: "ui_kind", equals: "cli" }, root);
    expect(v.applicable).toBe(true);
    expect(v.reason).toMatch(/not locked — checking anyway/);
  });

  test("default-on: a tampered lock cannot switch a sensor off", () => {
    const root = scratch();
    const doc = readArch<{ answers: Record<string, unknown> }>(root, "assessment-2.yaml");
    doc.answers.ui_kind = "cli"; // edited after locking, so the fingerprint no longer matches
    writeArch(root, "assessment-2.yaml", doc);
    const v = evaluate({ assessment: "assessment-2", key: "ui_kind", not_in: ["cli"] }, root);
    expect(v.applicable).toBe(true);
    expect(v.reason).toMatch(/changed after lock/);
  });

  test("default-on: a missing assessment or unanswered key leaves the check running", () => {
    expect(evaluate({ assessment: "assessment-99", key: "x", equals: "y" }, REPO).applicable).toBe(true);
    const v = evaluate({ assessment: "assessment-2", key: "not_a_question", equals: "y" }, REPO);
    expect(v.applicable).toBe(true);
    expect(v.reason).toMatch(/unanswered/);
  });
});

describe("paths", () => {
  test("allPaths ignores conditions, applicablePaths honours them", () => {
    const def = phaseById("08-implementation");
    expect(allPaths(def.produces)).toContain("frontend/");
    expect(applicablePaths(def.produces, REPO)).toContain("frontend/");
  });

  test("an api-only project does not produce a frontend", () => {
    const root = scratch();
    reshape(root, { ui_kind: "api-only" });
    const def = phaseById("08-implementation");
    expect(applicablePaths(def.produces, root)).not.toContain("frontend/");
    // but it is still not this phase's business to write it
    expect(allPaths(def.produces)).toContain("frontend/");
  });

  test("an on-prem project does not produce iac/ or k8s/", () => {
    const root = scratch();
    reshape(root, { deployment_target: "on-prem" });
    const paths = applicablePaths(phaseById("05-delivery").produces, root);
    expect(paths).not.toContain("iac/");
    expect(paths).not.toContain("k8s/");
    expect(paths).toContain(".arch/05-delivery/pipeline.yaml");
  });
});

describe("planSensors", () => {
  test("excluded sensors are reported, not dropped", () => {
    const root = scratch();
    reshape(root, { ui_kind: "cli" });
    const plan = planSensors(phaseById("03-tactical").sensors, root);
    expect(plan.run).toContain("ephemeral-not-persisted");
    expect(plan.run).not.toContain("cl-contract-declared");
    expect(plan.skipped.map((s) => s.id)).toContain("cl-contract-declared");
    expect(plan.skipped.find((s) => s.id === "cl-contract-declared")!.reason).toContain("ui_kind=cli");
  });
});

describe("an API-only, on-prem, non-JVM project", () => {
  function apiOnly(): string {
    const root = scratch();
    reshape(
      root,
      { ui_kind: "api-only", deployment_target: "on-prem", communication: "sync_http" },
      { backend_ecosystem: "python", frontend_framework: "none" },
    );
    importFromArch(root);
    return root;
  }

  test("frontend sensors report na instead of failing", () => {
    const findings = gate("03-tactical", apiOnly());
    const view = findings.find((f) => f.sensor === "actor-view-sourced-from-dst")!;
    expect(view.status).toBe("na");
    expect(view.blocking).toBe(false);
    expect(view.message).toContain("ui_kind=api-only");
    expect(findings.find((f) => f.sensor === "cl-contract-declared")!.status).toBe("na");
  });

  test("the cloud region sensor reports na instead of failing", () => {
    const findings = gate("05-delivery", apiOnly());
    const region = findings.find((f) => f.sensor === "decision-not-restated")!;
    expect(region.status).toBe("na");
    expect(region.message).toContain("deployment_target=on-prem");
  });

  test("the JVM version matrix reports na for a Python backend", () => {
    const findings = gate("08-implementation", apiOnly());
    expect(findings.find((f) => f.sensor === "framework-version-matrix")!.status).toBe("na");
  });

  test("phases that were blocked only by inapplicable sensors are now completable", () => {
    const state = loadState(apiOnly());
    expect(state.phases["03-tactical"].state).toBe("completed");
    expect(state.phases["05-delivery"].state).toBe("completed");
    expect(state.phases["09-deploy"].state).toBe("completed");
  });

  test("the UX phase is skipped on the record, with the answer that skipped it", () => {
    const root = apiOnly();
    const rec = loadState(root).phases["03c-ux-design"];
    expect(rec.state).toBe("skipped");
    expect(rec.skip_reason).toContain("ui_kind=api-only");
    expect(statusText(root)).toContain("[S] 03c-ux-design");
  });

  test("next does not hand an absent phase to the conductor", () => {
    const root = apiOnly();
    let directive = next(root);
    // walk forward until something is actionable; 03c must never be it
    for (let i = 0; i < 15 && directive.phase !== null; i++) {
      expect(directive.phase).not.toBe("03c-ux-design");
      if (directive.action !== "run-phase") break;
      directive = next(root);
    }
  });

  test("the real lies still fail — inapplicability is not an amnesty", () => {
    const findings = gate("04-specification", apiOnly());
    expect(findings.some((f) => f.sensor === "gherkin-actor-matches-dst" && f.status === "fail")).toBe(
      true,
    );
  });
});

describe("doctor guards the condition language", () => {
  test("every `when` in the graph names an answer its questionnaire schema defines", () => {
    // Otherwise a sensor could be switched off forever by a condition nobody can
    // ever answer, and nobody would notice.
    const bad = doctor(REPO).filter((f) => !f.ok && f.check.endsWith("/when"));
    expect(bad).toEqual([]);
  });

  test("the conditions actually reach the checks — every one is reported", () => {
    const reported = doctor(REPO).filter((f) => f.check.endsWith("/when"));
    expect(reported.length).toBeGreaterThan(0);
  });
});

describe("a condition must not be narrower than the sensor it guards", () => {
  /**
   * Found live on a Node project: the graph pinned `framework-version-matrix` to
   * `backend_ecosystem equals jvm`, so it silently reported `na` for every Node, Python
   * and Go project — even though the sensor had been generalised to read whatever build
   * file the profile declares. The condition said "does not apply"; the truth was "I was
   * told not to look". A guard narrower than its sensor is a check that is off without
   * anyone deciding to turn it off.
   */
  test("the version matrix runs for any ecosystem the profile knows", () => {
    const root = scratch();
    reshape(root, {}, { backend_ecosystem: "node" });
    const plan = planSensors(phaseById("08-implementation").sensors, root);
    expect(plan.run).toContain("framework-version-matrix");
    expect(plan.skipped.map((s) => s.id)).not.toContain("framework-version-matrix");
  });

  test("it is excluded only when there is genuinely no backend", () => {
    const root = scratch();
    reshape(root, {}, { backend_ecosystem: "none" });
    const plan = planSensors(phaseById("08-implementation").sensors, root);
    expect(plan.skipped.map((s) => s.id)).toContain("framework-version-matrix");
  });

  test("an ecosystem the profile knows nothing about is the sensor's call, not the graph's", () => {
    // The graph lets it run; the sensor then says n/a with the reason. That way the
    // decision is visible in the quality report instead of hidden in a `when:`.
    const root = scratch();
    reshape(root, {}, { backend_ecosystem: "ruby" });
    const plan = planSensors(phaseById("08-implementation").sensors, root);
    expect(plan.run).toContain("framework-version-matrix");
    const findings = gate("08-implementation", root);
    const verdict = findings.find((f) => f.sensor === "framework-version-matrix")!;
    expect(verdict.status).toBe("na");
    expect(verdict.message).toMatch(/knows no build file for ecosystem "ruby"/);
  });
});
