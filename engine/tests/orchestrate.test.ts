import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  changeScope,
  doctor,
  gate,
  jump,
  next,
  redo,
  report,
  review,
  statusText,
} from "../src/orchestrate.ts";
import { importFromArch } from "../src/importer.ts";
import { loadState, saveState } from "../src/state.ts";
import { loadLessons } from "../src/lessons.ts";
import { lockAssessment } from "../src/assess.ts";
import { REPO, cleanup, editArchText, readArch, scratchRoot, writeArch } from "./helpers.ts";

const roots: string[] = [];
function scratch(): string {
  const r = scratchRoot();
  roots.push(r);
  return r;
}
afterEach(() => {
  while (roots.length) cleanup(roots.pop()!);
});

/** Make every phase up to (not including) `stop` completed, so `next` reaches it. */
function fixtureAt(stop: string): string {
  const root = scratch();
  importFromArch(root);
  const state = loadState(root);
  for (const [id, rec] of Object.entries(state.phases)) {
    if (id === stop) break;
    rec.state = "completed";
    rec.blockers = [];
  }
  writeState(root, state);
  return root;
}

/**
 * The coffeeshop's Phase 6 prose carries the invented `OrderPaid` /
 * `PreparationCompleted` names too, so `docs-events` rightly refuses the phase. Tests
 * about the *review gate* replace that prose with something clean, so the gate is what
 * is being measured.
 */
function cleanSixReviewProse(root: string): void {
  rmSync(join(root, ".arch/06-review"), { recursive: true, force: true });
  mkdirSync(join(root, ".arch/06-review/viewpoints"), { recursive: true });
  mkdirSync(join(root, ".arch/06-review/adrs"), { recursive: true });
  writeFileSync(join(root, ".arch/06-review/viewpoints/functional.md"), "# Functional\n");
  writeFileSync(join(root, ".arch/06-review/adrs/adr-001.md"), "# ADR-001\n\nAccepted.\n");
  writeFileSync(join(root, ".arch/06-review/perspectives.md"), "# Perspectives\n");
}

/** saveState refreshes the cursor and needs the engine marker the preload set. */
function writeState(root: string, state: ReturnType<typeof loadState>): void {
  saveState(state, root);
}

describe("import from artifacts", () => {
  test("phases whose artifacts exist and whose sensors pass are completed", () => {
    const state = importFromArch(scratch());
    expect(state.phases["00-requirements"].state).toBe("completed");
    expect(state.phases["01a-dst"].state).toBe("completed");
    expect(state.phases["01b-storm"].state).toBe("completed");
    expect(state.phases["01c-model"].state).toBe("completed");
    expect(state.phases["02-strategic"].state).toBe("completed");
  });

  test("phases with blocking sensor failures are revising with their blockers", () => {
    const state = importFromArch(scratch());
    // 03-tactical is green since the router check moved to Phase 8, where the router
    // actually exists.
    expect(state.phases["03-tactical"].state).toBe("completed");
    expect(state.phases["04-specification"].state).toBe("revising");
    expect(state.phases["05-delivery"].state).toBe("revising");
    expect(
      state.phases["04-specification"].blockers?.some(
        (b) => b.sensor === "gherkin-actor-matches-dst",
      ),
    ).toBe(true);
    expect(
      state.phases["05-delivery"].blockers?.some((b) => b.sensor === "decision-not-restated"),
    ).toBe(true);
  });

  test("a phase with artifacts but an unlocked assessment is not completed", () => {
    const root = scratch();
    const doc = readArch<Record<string, unknown>>(root, "assessment-8.yaml");
    doc.status = "draft";
    writeArch(root, "assessment-8.yaml", doc);
    const state = importFromArch(root);
    expect(state.phases["08-implementation"].state).toBe("revising");
    expect(
      state.phases["08-implementation"].blockers?.some((b) => b.sensor === "assessment-lock"),
    ).toBe(true);
  });

  test("a phase with no artifacts is pending", () => {
    const root = scratch();
    rmSync(join(root, ".arch/03c-ux-design"), { recursive: true, force: true });
    expect(importFromArch(root).phases["03c-ux-design"].state).toBe("pending");
  });

  test("an empty produced directory does not count as done", () => {
    const root = scratch();
    rmSync(join(root, ".arch/06-review/adrs"), { recursive: true, force: true });
    expect(importFromArch(root).phases["06-review"].state).toBe("pending");
  });

  test("status renders one line per phase in scope", () => {
    const root = scratch();
    importFromArch(root);
    const text = statusText(root);
    expect(text).toContain("[x] 00-requirements");
    expect(text).toContain("[R] 04-specification");
    expect(text).toContain("locks: assessment-2:locked");
  });
});

describe("next", () => {
  test("blocked on the first revising phase, and does not look past it", () => {
    const root = scratch();
    importFromArch(root);
    const d = next(root);
    expect(d.action).toBe("blocked");
    expect(d.phase).toBe("04-specification");
    expect(d.blockers?.length).toBeGreaterThan(0);
    expect(loadState(root).cursor.phase).toBe("04-specification");
  });

  test("run-phase carries the write intent for that phase only", () => {
    const root = scratch();
    rmSync(join(root, ".arch/00-requirements"), { recursive: true, force: true });
    importFromArch(root);
    const d = next(root);
    expect(d.action).toBe("run-phase");
    expect(d.phase).toBe("00-requirements");
    expect(d.intent?.allowed_writes).toContain(".arch/00-requirements/story-map.yaml");
    expect(d.intent?.forbidden_writes).toContain(".arch/acg-state.yaml");
    expect(d.intent?.forbidden_writes).toContain("services/");
  });

  test("run-phase moves pending → in_progress exactly once", () => {
    const root = scratch();
    rmSync(join(root, ".arch/00-requirements"), { recursive: true, force: true });
    importFromArch(root);
    next(root);
    expect(loadState(root).phases["00-requirements"].state).toBe("in_progress");
    next(root);
    expect(loadState(root).phases["00-requirements"].state).toBe("in_progress");
  });

  test("ask-assessment when a required lock is missing", () => {
    const root = scratch();
    rmSync(join(root, ".arch/assessment-2.yaml"));
    rmSync(join(root, ".arch/02-strategic"), { recursive: true, force: true });
    importFromArch(root);
    const d = next(root);
    expect(d.action).toBe("ask-assessment");
    expect(d.phase).toBe("02-strategic");
    expect(d.skill).toContain("assessment.md");
  });

  test("blocked when a locked assessment was edited after locking", () => {
    const root = fixtureAt("05-delivery");
    const doc = readArch<{ answers: Record<string, unknown> }>(root, "assessment-2.yaml");
    doc.answers.region = "eu-west-1";
    writeArch(root, "assessment-2.yaml", doc);
    const d = next(root);
    expect(d.action).toBe("blocked");
    expect(d.message).toMatch(/answers changed after lock/);
  });

  test("done when every phase is completed", () => {
    const root = scratch();
    importFromArch(root);
    const state = loadState(root);
    for (const rec of Object.values(state.phases)) {
      rec.state = "completed";
      rec.blockers = [];
    }
    writeState(root, state);
    expect(next(root).action).toBe("done");
  });
});

describe("report", () => {
  test("awaiting-approval is refused while a blocking sensor fails", () => {
    const root = scratch();
    importFromArch(root);
    const out = report("04-specification", "awaiting-approval", undefined, root);
    expect(out.ok).toBe(false);
    expect(out.message).toMatch(/cannot enter approval/);
    expect(loadState(root).phases["04-specification"].state).toBe("revising");
  });

  test("approved is refused while a blocking sensor fails", () => {
    const root = scratch();
    importFromArch(root);
    const out = report("05-delivery", "approved", undefined, root);
    expect(out.ok).toBe(false);
    expect(out.message).toMatch(/Refuse approved/);
    expect(loadState(root).phases["05-delivery"].state).toBe("revising");
  });

  test("a green phase reaches awaiting_approval and then completed", () => {
    const root = scratch();
    importFromArch(root);
    const state = loadState(root);
    state.phases["01b-storm"].state = "in_progress";
    writeState(root, state);
    expect(report("01b-storm", "awaiting-approval", undefined, root).ok).toBe(true);
    expect(loadState(root).phases["01b-storm"].state).toBe("awaiting_approval");
    expect(report("01b-storm", "approved", undefined, root).ok).toBe(true);
    expect(loadState(root).phases["01b-storm"].state).toBe("completed");
  });

  test("rejected records the human reason and sends the phase back to revising", () => {
    const root = scratch();
    importFromArch(root);
    const state = loadState(root);
    state.phases["01b-storm"].state = "awaiting_approval";
    writeState(root, state);
    report("01b-storm", "rejected", "hotspot unresolved", root);
    const rec = loadState(root).phases["01b-storm"];
    expect(rec.state).toBe("revising");
    expect(rec.blockers?.[0]?.message).toBe("hotspot unresolved");
  });

  test("an unknown phase is refused", () => {
    const root = scratch();
    importFromArch(root);
    expect(() => report("99-nope", "approved", undefined, root)).toThrow(/Unknown phase/);
  });
});

describe("independent review", () => {
  test("a reviewer phase cannot be approved without a verdict", () => {
    const root = scratch();
    // 06-review's own viewpoints carry the invented event names too, so clear the
    // prose that docs-events would rightly refuse and leave the review gate as the
    // thing under test.
    rmSync(join(root, ".arch/07-documentation"), { recursive: true, force: true });
    cleanSixReviewProse(root);
    importFromArch(root);
    const state = loadState(root);
    state.phases["06-review"].state = "awaiting_approval";
    state.phases["06-review"].blockers = [];
    state.phases["06-review"].review = null;
    writeState(root, state);
    const out = report("06-review", "approved", undefined, root);
    expect(out.ok).toBe(false);
    expect(out.message).toMatch(/requires an independent reviewer verdict/);
  });

  test("next asks for the review before the human gate", () => {
    const root = scratch();
    rmSync(join(root, ".arch/07-documentation"), { recursive: true, force: true });
    importFromArch(root);
    const state = loadState(root);
    for (const [id, rec] of Object.entries(state.phases)) {
      if (id === "06-review") break;
      rec.state = "completed";
      rec.blockers = [];
    }
    state.phases["06-review"].state = "awaiting_approval";
    state.phases["06-review"].blockers = [];
    state.phases["06-review"].review = null;
    writeState(root, state);
    const d = next(root);
    expect(d.action).toBe("await-review");
    expect(d.reviewer).toBe(true);
  });

  test("a rejected review sends the phase back to revising", () => {
    const root = scratch();
    importFromArch(root);
    const state = loadState(root);
    state.phases["06-review"].state = "awaiting_approval";
    writeState(root, state);
    review("06-review", "rejected", "viewpoints contradict the storm", root);
    const rec = loadState(root).phases["06-review"];
    expect(rec.state).toBe("revising");
    expect(rec.review?.verdict).toBe("rejected");
  });

  test("re-submitting after a rejected review clears the stale verdict", () => {
    // Otherwise the phase is permanently unapprovable while `next` reports it as
    // merely awaiting a human — the loop spins on await-gate forever.
    // Both 07-documentation and 06-review's own viewpoints ship the invented
    // `OrderPaid` / `PreparationCompleted`, which `docs-events` rightly refuses.
    // Clear them so 06-review's review gate is the thing under test.
    const root = scratch();
    rmSync(join(root, ".arch/07-documentation"), { recursive: true, force: true });
    cleanSixReviewProse(root);
    importFromArch(root);
    const state = loadState(root);
    // Everything before 06 completed, so `next` reaches the phase under test.
    for (const [id, rec] of Object.entries(state.phases)) {
      if (id === "06-review") break;
      rec.state = "completed";
      rec.blockers = [];
    }
    state.phases["06-review"].state = "awaiting_approval";
    state.phases["06-review"].blockers = [];
    writeState(root, state);
    review("06-review", "rejected", "not yet", root);
    expect(loadState(root).phases["06-review"].state).toBe("revising");

    report("06-review", "awaiting-approval", undefined, root);
    const rec = loadState(root).phases["06-review"];
    expect(rec.state).toBe("awaiting_approval");
    expect(rec.review).toBeNull();
    expect(next(root).action).toBe("await-review");
  });

  test("review is refused on a phase that does not require one", () => {
    const root = scratch();
    importFromArch(root);
    expect(() => review("01b-storm", "approved", undefined, root)).toThrow(
      /does not require an independent review/,
    );
  });
});

describe("jump and redo", () => {
  test("jump skips the unfinished phases before the target and records why", () => {
    const root = scratch();
    importFromArch(root);
    const skipped = jump("08-implementation", "spike only", root);
    expect(skipped).toContain("04-specification");
    expect(skipped).toContain("05-delivery");
    const rec = loadState(root).phases["04-specification"];
    expect(rec.state).toBe("skipped");
    expect(rec.skip_reason).toBe("spike only");
  });

  test("jump leaves completed phases alone", () => {
    const root = scratch();
    importFromArch(root);
    jump("08-implementation", undefined, root);
    expect(loadState(root).phases["01a-dst"].state).toBe("completed");
  });

  test("redo cascades to every later phase", () => {
    const root = scratch();
    importFromArch(root);
    const touched = redo("01b-storm", root);
    expect(touched).toContain("01b-storm");
    expect(touched).toContain("02-strategic");
    expect(loadState(root).phases["01b-storm"].state).toBe("pending");
    expect(loadState(root).phases["02-strategic"].state).toBe("pending");
    expect(loadState(root).phases["01a-dst"].state).toBe("completed");
  });

  test("redo --only touches one phase", () => {
    const root = scratch();
    importFromArch(root);
    const touched = redo("01b-storm", root, false);
    expect(touched).toEqual(["01b-storm"]);
    expect(loadState(root).phases["02-strategic"].state).toBe("completed");
  });

  test("jump to a phase outside the scope is refused", () => {
    const root = scratch();
    importFromArch(root, "patch");
    expect(() => jump("00-requirements", undefined, root)).toThrow(/not in scope/);
  });
});

describe("scope", () => {
  test("the patch scope narrows the board and the cursor", () => {
    const root = scratch();
    importFromArch(root);
    changeScope("patch", root);
    const state = loadState(root);
    expect(Object.keys(state.phases)).toEqual([
      "03-tactical",
      "04-specification",
      "08-implementation",
    ]);
    expect(state.cursor.phase).toBe("04-specification");
  });

  test("switching scope preserves what was already accepted", () => {
    const root = scratch();
    importFromArch(root);
    changeScope("implement", root);
    expect(loadState(root).phases["08-implementation"].state).toBe("revising");
  });

  test("an unknown scope is refused with the list of real ones", () => {
    const root = scratch();
    importFromArch(root);
    expect(() => changeScope("nonsense", root)).toThrow(/Available: system, patch, implement/);
  });
});

describe("learning loop", () => {
  test("repeated sensor failures accumulate with a count", () => {
    const root = scratch();
    importFromArch(root);
    gate("04-specification", root);
    gate("04-specification", root);
    const lesson = loadLessons(root).find(
      (l) => l.phase === "04-specification" && l.sensor === "gherkin-actor-matches-dst",
    );
    expect(lesson).toBeDefined();
    expect(lesson!.failures).toBeGreaterThanOrEqual(2);
  });

  test("next hands recurring lessons back to the conductor", () => {
    const root = scratch();
    importFromArch(root);
    gate("04-specification", root);
    gate("04-specification", root);
    const d = next(root);
    expect(d.phase).toBe("04-specification");
    expect(d.lessons?.some((l) => /gherkin-actor-matches-dst/.test(l))).toBe(true);
  });
});

describe("doctor", () => {
  test("the real repo has no graph, frontmatter, input or lock drift", () => {
    expect(doctor(REPO).filter((f) => !f.ok)).toEqual([]);
  });

  test("a tampered lock is reported", () => {
    const root = scratch();
    importFromArch(root);
    editArchText(root, "assessment-2.yaml", (t) => t.replace("ap-east-2", "eu-west-1"));
    const bad = doctor(root).filter((f) => !f.ok);
    expect(bad.some((f) => f.check === "lock/assessment-2")).toBe(true);
  });
});

describe("a decision that moves after approval invalidates the work", () => {
  /**
   * The plan has always said a changed locked answer forces a redo from the first phase
   * that consumed it. Nothing enforced it: `lockIntegrity` catches answers edited
   * *without* re-locking, and says nothing about a legitimate re-lock that happens after
   * a phase was already approved. Found by doing exactly that — approving Phase 8, then
   * re-locking assessment-8 with a different answer — and watching the board keep
   * saying `[x]`.
   */
  /**
   * 02-strategic is the phase to test this on: it declares `requires_lock:
   * assessment-2` and its sensors genuinely pass on this fixture, so it can really be
   * approved. (08-implementation also requires a lock but has real blocking failures
   * here, so it can never reach approval — a phase that cannot be approved cannot
   * demonstrate what happens after approval.)
   */
  function approvedUnderLock(root: string): string {
    importFromArch(root);
    redo("02-strategic", root, false);
    report("02-strategic", "awaiting-approval", undefined, root);
    const out = report("02-strategic", "approved", undefined, root);
    expect(out.ok, `02-strategic should be approvable: ${out.message}`).toBe(true);
    return "02-strategic";
  }

  test("approval records the lock fingerprint it was granted under", () => {
    const root = scratch();
    const phase = approvedUnderLock(root);
    const rec = loadState(root).phases[phase]!;
    expect(rec.state).toBe("completed");
    expect(rec.approved_with_lock?.id).toBe("assessment-2");
    expect(rec.approved_with_lock?.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  test("re-locking a different answer afterwards blocks, naming the remedy", () => {
    const root = scratch();
    const phase = approvedUnderLock(root);
    const doc = readArch<{ answers: Record<string, unknown> }>(root, "assessment-2.yaml");
    doc.answers.team_topology = "two-teams";
    writeArch(root, "assessment-2.yaml", doc);
    lockAssessment("assessment-2", root);

    const d = next(root);
    expect(d.action).toBe("blocked");
    expect(d.phase).toBe(phase);
    expect(d.message).toMatch(/approved under assessment-2 fingerprint/);
    expect(d.message).toMatch(/redo from the first phase that consumes/);
    expect(doctor(root).some((f) => !f.ok && f.check === `lock-drift/${phase}`)).toBe(true);
  });

  test("re-locking the same answers is not drift", () => {
    const root = scratch();
    approvedUnderLock(root);
    lockAssessment("assessment-2", root); // same answers, new locked_at
    expect(doctor(root).filter((f) => !f.ok && f.check.startsWith("lock-drift/"))).toEqual([]);
  });

  test("redo clears the recorded lock, so a redone phase carries no stale reference", () => {
    const root = scratch();
    const phase = approvedUnderLock(root);
    redo(phase, root, false);
    expect(loadState(root).phases[phase]!.approved_with_lock).toBeNull();
  });
});
