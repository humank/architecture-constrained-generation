import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { initProject, loadProjectName } from "../src/init.ts";
import { repoRoot } from "../src/paths.ts";
import { doctor, next, statusText } from "../src/orchestrate.ts";
import { loadState } from "../src/state.ts";

const dirs: string[] = [];
function emptyDir(): string {
  const d = mkdtempSync(join(tmpdir(), "acg-init-"));
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe("acg init", () => {
  test("writes a project a person can start from, and nothing from the sample", () => {
    const dir = emptyDir();
    const result = initProject({ dir, name: "my-system", profile: "none" });
    expect(result.created).toContain(".arch/acg-project.yaml");
    expect(result.created).toContain(".arch/assessment-2.yaml");
    expect(result.created).toContain("artifact-schemas/");

    // The sample's artifacts must not come along for the ride.
    for (const leaked of [
      ".arch/01-discovery/domain-stories",
      ".arch/00-requirements",
      ".arch/glossary.yaml",
      ".arch/acg-state.yaml",
    ]) {
      expect(existsSync(join(dir, leaked)), `${leaked} must not be copied`).toBe(false);
    }
  });

  test("installs the toolkit, so /architect and the hooks exist", () => {
    const dir = emptyDir();
    initProject({ dir, name: "my-system" });
    expect(existsSync(join(dir, ".claude/commands/architect.md"))).toBe(true);
    expect(existsSync(join(dir, ".claude/commands/phase/01-discovery.md"))).toBe(true);
    expect(existsSync(join(dir, ".claude/agents/acg-reviewer.md"))).toBe(true);
    expect(existsSync(join(dir, ".claude/settings.json"))).toBe(true);
  });

  test("the questionnaires arrive as drafts with the deciding answers blank", () => {
    const dir = emptyDir();
    initProject({ dir, name: "my-system", profile: "terraform-aws" });
    const a2 = parse(readFileSync(join(dir, ".arch/assessment-2.yaml"), "utf8")) as {
      status: string;
      answers: Record<string, string>;
    };
    expect(a2.status).toBe("draft");
    expect(a2.answers.ui_kind).toBe("");
    expect(a2.answers.deployment_target).toBe("");
    expect(a2.answers.profile).toBe("terraform-aws");
  });

  test("the board is honestly empty and the engine knows what comes first", () => {
    const dir = emptyDir();
    initProject({ dir, name: "my-system", profile: "none" });
    const board = statusText(dir);
    expect(board).toContain("project=my-system");
    expect(board).not.toContain("[x]");
    expect(board).not.toContain("[R]");
    expect(board.match(/\[ \]/g)?.length).toBe(13);

    const directive = next(dir);
    expect(directive.action).toBe("run-phase");
    expect(directive.phase).toBe("00-requirements");
  });

  test("doctor is green on a fresh project — a pending phase may lack its inputs", () => {
    const dir = emptyDir();
    initProject({ dir, name: "my-system", profile: "none" });
    expect(doctor(dir).filter((f) => !f.ok)).toEqual([]);
  });

  test("the project name comes from the descriptor, never a default", () => {
    const dir = emptyDir();
    initProject({ dir, name: "inventory-api" });
    expect(loadProjectName(dir)).toBe("inventory-api");
    expect(loadState(dir).project).toBe("inventory-api");
  });

  test("init is idempotent — it keeps answers you have already written", () => {
    const dir = emptyDir();
    initProject({ dir, name: "my-system" });
    writeFileSync(
      join(dir, ".arch/assessment-2.yaml"),
      "id: assessment-2\nstatus: draft\nanswers:\n  ui_kind: cli\n",
    );
    const again = initProject({ dir, name: "my-system" });
    expect(again.skipped).toContain(".arch/assessment-2.yaml");
    expect(readFileSync(join(dir, ".arch/assessment-2.yaml"), "utf8")).toContain("ui_kind: cli");
  });

  test("an unknown profile is refused before anything is written", () => {
    const dir = emptyDir();
    expect(() => initProject({ dir, profile: "made-up" })).toThrow(/Available: /);
    expect(existsSync(join(dir, ".arch/acg-project.yaml"))).toBe(false);
  });
});

describe("project root detection", () => {
  test("an initialised directory is a root, without being a clone of this repo", () => {
    const dir = emptyDir();
    initProject({ dir, name: "my-system" });
    expect(repoRoot(dir)).toBe(dir);
  });

  test("it is found from a nested working directory", () => {
    const dir = emptyDir();
    initProject({ dir, name: "my-system" });
    const nested = join(dir, ".arch");
    expect(repoRoot(nested)).toBe(dir);
  });

  test("a directory with no markers anywhere is refused with the fix", () => {
    // /tmp itself has no .arch and no artifact-schemas above it.
    const orphan = mkdtempSync(join(tmpdir(), "acg-orphan-"));
    dirs.push(orphan);
    let message = "";
    try {
      repoRoot(orphan);
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    }
    expect(message).toMatch(/acg\.ts init/);
  });
});
