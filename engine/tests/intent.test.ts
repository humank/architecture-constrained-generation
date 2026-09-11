import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { checkWrite, intentFor } from "../src/intent.ts";
import { orderedPhases } from "../src/graph.ts";
import { importFromArch } from "../src/importer.ts";
import { loadState, saveState } from "../src/state.ts";
import { cleanup, scratchRoot } from "./helpers.ts";

const roots: string[] = [];
function scratch(): string {
  const r = scratchRoot();
  roots.push(r);
  return r;
}
afterEach(() => {
  while (roots.length) cleanup(roots.pop()!);
});

/** Park the cursor on one phase so write isolation has something to isolate. */
function cursorAt(phase: string): string {
  const root = scratch();
  importFromArch(root);
  const state = loadState(root);
  for (const [id, rec] of Object.entries(state.phases)) {
    rec.state = id === phase ? "in_progress" : "completed";
    rec.blockers = [];
  }
  saveState(state, root);
  return root;
}

describe("intentFor", () => {
  test("a phase's allowed writes are its own produces plus the shared artifacts", () => {
    const intent = intentFor("01a-dst", "system", scratch());
    expect(intent.allowed_writes).toContain(".arch/01-discovery/domain-stories/");
    expect(intent.allowed_writes).toContain(".arch/glossary.yaml");
    expect(intent.allowed_writes).toContain(".arch/assessment-");
  });

  test("every other phase's produces are forbidden", () => {
    const intent = intentFor("01a-dst", "system", scratch());
    expect(intent.forbidden_writes).toContain(".arch/01-discovery/event-storm.yaml");
    expect(intent.forbidden_writes).toContain("services/");
    expect(intent.forbidden_writes).not.toContain(".arch/01-discovery/domain-stories/");
  });

  test("engine records are forbidden to every phase", () => {
    for (const phase of ["00-requirements", "05-delivery", "09-deploy"]) {
      const intent = intentFor(phase, "system", scratch());
      expect(intent.forbidden_writes).toContain(".arch/acg-state.yaml");
      expect(intent.forbidden_writes).toContain(".arch/audit/");
      expect(intent.forbidden_writes).toContain(".arch/quality-reports/");
    }
  });
});

describe("checkWrite", () => {
  test("engine state is never writable, whatever the phase", () => {
    const root = cursorAt("01a-dst");
    const verdict = checkWrite(".arch/acg-state.yaml", root);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/engine-owned/);
  });

  test("the audit log and quality reports are never writable", () => {
    const root = cursorAt("01a-dst");
    expect(checkWrite(".arch/audit/2026-09.md", root).allowed).toBe(false);
    expect(checkWrite(".arch/quality-reports/01a-dst.yaml", root).allowed).toBe(false);
  });

  test("the running phase may write what it produces", () => {
    const root = cursorAt("01a-dst");
    const verdict = checkWrite(".arch/01-discovery/domain-stories/04-new.yaml", root);
    expect(verdict.allowed).toBe(true);
    expect(verdict.phase).toBe("01a-dst");
  });

  test("a design phase may not write code", () => {
    const root = cursorAt("03-tactical");
    const verdict = checkWrite("services/ordering-service/src/main/java/Order.java", root);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/produced by 08-implementation/);
  });

  test("the implementation phase may write code", () => {
    const root = cursorAt("08-implementation");
    expect(checkWrite("services/ordering-service/src/main/java/Order.java", root).allowed).toBe(
      true,
    );
  });

  test("a phase may not write another phase's artifacts", () => {
    const root = cursorAt("01a-dst");
    const verdict = checkWrite(".arch/01-discovery/event-storm.yaml", root);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/produced by 01b-storm/);
  });

  test("the glossary is writable from any phase", () => {
    for (const phase of ["01a-dst", "05-delivery", "08-implementation"]) {
      expect(checkWrite(".arch/glossary.yaml", cursorAt(phase)).allowed).toBe(true);
    }
  });

  test("the directive never lists the same path as allowed and forbidden", () => {
    // A self-contradictory directive is the exact defect class the engine exists to
    // remove. The glossary is shared, so it belongs on one list only.
    const root = cursorAt("01a-dst");
    for (const phase of orderedPhases("system")) {
      const intent = intentFor(phase.id, "system", root);
      const both = intent.allowed_writes.filter((a) => intent.forbidden_writes.includes(a));
      expect(both).toEqual([]);
    }
  });

  test("paths no phase produces stay writable", () => {
    const root = cursorAt("01a-dst");
    expect(checkWrite("docs/notes.md", root).allowed).toBe(true);
    expect(checkWrite("engine/src/acg.ts", root).allowed).toBe(true);
    expect(checkWrite("README.md", root).allowed).toBe(true);
  });

  test("absolute paths inside the repo are resolved before checking", () => {
    const root = cursorAt("01a-dst");
    expect(checkWrite(join(root, ".arch/acg-state.yaml"), root).allowed).toBe(false);
  });

  test("with no engine state on disk nothing is isolated yet", () => {
    const root = scratch();
    rmSync(join(root, ".arch/acg-state.yaml"), { force: true });
    const verdict = checkWrite(".arch/acg-state.yaml", root);
    expect(verdict.allowed).toBe(true);
    expect(verdict.reason).toMatch(/no engine state/);
  });
});
