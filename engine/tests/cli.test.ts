import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, scratchRoot } from "./helpers.ts";

const CLI = join(import.meta.dir, "../src/acg.ts");
const HOOKS = join(import.meta.dir, "../hooks");

const roots: string[] = [];
function scratch(): string {
  const r = scratchRoot();
  roots.push(r);
  return r;
}
afterEach(() => {
  while (roots.length) cleanup(roots.pop()!);
});

interface Run {
  code: number;
  out: string;
  err: string;
}

/**
 * The CLI is the only legitimate writer, so it is exercised as a real process —
 * that also proves it sets the ACG_ENGINE marker for itself.
 */
async function acg(root: string, ...args: string[]): Promise<Run> {
  const proc = Bun.spawn(["bun", CLI, ...args], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ACG_ENGINE: undefined },
  });
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { code: await proc.exited, out, err };
}

async function hook(name: string, payload: unknown): Promise<Run> {
  const proc = Bun.spawn(["bun", join(HOOKS, name)], {
    stdin: new TextEncoder().encode(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ACG_GUARD: undefined },
  });
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { code: await proc.exited, out, err };
}

describe("cli", () => {
  test("help lists the commands without touching state", async () => {
    const root = scratch();
    const run = await acg(root, "help");
    expect(run.code).toBe(0);
    expect(run.out).toContain("check-write");
    expect(run.out).toContain("doctor");
    expect(existsSync(join(root, ".arch/acg-state.yaml"))).toBe(false);
  });

  test("an unknown command exits non-zero with the usage text", async () => {
    const run = await acg(scratch(), "frobnicate");
    expect(run.code).toBe(1);
    expect(run.err).toContain("Unknown command");
  });

  test("import writes the state file and prints the board", async () => {
    const root = scratch();
    const run = await acg(root, "import");
    expect(run.code).toBe(0);
    expect(run.out).toContain("[x] 00-requirements");
    expect(existsSync(join(root, ".arch/acg-state.yaml"))).toBe(true);
  });

  test("next --json is machine readable and carries the intent", async () => {
    const root = scratch();
    await acg(root, "import");
    const run = await acg(root, "next", "--json");
    const directive = JSON.parse(run.out) as {
      action: string;
      phase: string;
      intent: { forbidden_writes: string[] };
    };
    expect(directive.action).toBe("blocked");
    expect(directive.phase).toBe("04-specification");
    expect(directive.intent.forbidden_writes).toContain(".arch/acg-state.yaml");
  });

  test("gate exits 2 when a blocking sensor fails, and writes the report", async () => {
    const root = scratch();
    await acg(root, "import");
    const run = await acg(root, "gate", "--phase", "05-delivery");
    expect(run.code).toBe(2);
    expect(run.out).toContain("decision-not-restated");
    const report = readFileSync(join(root, ".arch/quality-reports/05-delivery.yaml"), "utf8");
    expect(report).toContain("status: fail");
  });

  test("report --result approved exits 2 and refuses a red phase", async () => {
    const root = scratch();
    await acg(root, "import");
    const run = await acg(root, "report", "--phase", "05-delivery", "--result", "approved");
    expect(run.code).toBe(2);
    expect(run.out).toContain("Refuse approved");
  });

  test("report rejects an invalid result value", async () => {
    const root = scratch();
    await acg(root, "import");
    const run = await acg(root, "report", "--phase", "05-delivery", "--result", "looksgood");
    expect(run.code).toBe(1);
    expect(run.err).toContain("invalid --result");
  });

  test("missing flags are reported, not guessed", async () => {
    const root = scratch();
    await acg(root, "import");
    expect((await acg(root, "gate")).err).toContain("--phase");
    expect((await acg(root, "review", "--phase", "06-review")).err).toContain("--verdict");
  });

  test("locked-answer prints exactly the value, for shell substitution", async () => {
    const root = scratch();
    const run = await acg(root, "locked-answer", "--id", "assessment-2", "--key", "region");
    expect(run.code).toBe(0);
    expect(run.out.trim()).toBe("ap-east-2");
  });

  test("check-write exits 2 on a denied path", async () => {
    const root = scratch();
    await acg(root, "import");
    const denied = await acg(root, "check-write", "--path", ".arch/acg-state.yaml");
    expect(denied.code).toBe(2);
    expect(denied.out).toContain("deny");
    const allowed = await acg(root, "check-write", "--path", "docs/whatever.md");
    expect(allowed.code).toBe(0);
    expect(allowed.out).toContain("allow");
  });

  test("scope lists the named scopes and switches the board", async () => {
    const root = scratch();
    await acg(root, "import");
    expect((await acg(root, "scope")).out).toContain("patch");
    const run = await acg(root, "scope", "--set", "implement");
    expect(run.out).toContain("scope=implement");
    expect(run.out).not.toContain("00-requirements");
  });

  test("doctor exits 0 on a consistent repo", async () => {
    const root = scratch();
    await acg(root, "import");
    const run = await acg(root, "doctor");
    expect(run.code).toBe(0);
    expect(run.out).toMatch(/\d+\/\d+ checks pass/);
  });

  test("audit is sharded by month and indexed", async () => {
    const root = scratch();
    await acg(root, "import");
    const shard = `${new Date().toISOString().slice(0, 7)}.md`;
    expect(existsSync(join(root, ".arch/audit", shard))).toBe(true);
    const index = readFileSync(join(root, ".arch/audit/local.md"), "utf8");
    expect(index).toContain(shard);
    expect(index).toContain("Audit Index");
    const run = await acg(root, "audit", "--limit", "5");
    expect(run.out).toContain("STATE_IMPORTED");
  });

  test("lessons reports nothing before any gate has run", async () => {
    const root = scratch();
    const run = await acg(root, "lessons");
    expect(run.out).toContain("no recorded sensor failures");
  });

  test("sensors lists every registered id", async () => {
    const run = await acg(scratch(), "sensors");
    expect(run.out).toContain("schema-dst");
    expect(run.out).toContain("source-fingerprint");
    expect(run.out).toContain("god-aggregate");
  });
});

describe("hooks", () => {
  test("the write guard denies the engine state file", async () => {
    const root = scratch();
    await acg(root, "import");
    const run = await hook("guard-write.ts", {
      tool_name: "Write",
      tool_input: { file_path: ".arch/acg-state.yaml" },
      cwd: root,
    });
    const decision = JSON.parse(run.out) as {
      hookSpecificOutput: { permissionDecision: string; permissionDecisionReason: string };
    };
    expect(decision.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(decision.hookSpecificOutput.permissionDecisionReason).toMatch(/engine-owned/);
  });

  test("the write guard allows a path the active phase produces", async () => {
    const root = scratch();
    await acg(root, "import");
    const run = await hook("guard-write.ts", {
      tool_name: "Write",
      tool_input: { file_path: ".arch/04-specification/features/new.feature" },
      cwd: root,
    });
    expect(run.out.trim()).toBe("");
    expect(run.code).toBe(0);
  });

  test("the write guard fails open on unparsable input", async () => {
    const proc = Bun.spawn(["bun", join(HOOKS, "guard-write.ts")], {
      stdin: new TextEncoder().encode("not json"),
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await proc.exited).toBe(0);
    expect(await new Response(proc.stdout).text()).toBe("");
  });

  test("the stop guard asks for a report when a phase is left in progress", async () => {
    const root = scratch();
    await acg(root, "import");
    await acg(root, "scope", "--set", "implement");
    // 08-implementation is revising after import; put it in progress the legitimate way
    await acg(root, "redo", "--phase", "08-implementation");
    await acg(root, "next");
    const run = await hook("stop-next.ts", { cwd: root, stop_hook_active: false });
    const decision = JSON.parse(run.out) as { decision: string; reason: string };
    expect(decision.decision).toBe("block");
    expect(decision.reason).toContain("08-implementation");
    expect(decision.reason).toContain("report --phase");
  });

  test("the stop guard stays silent when it has already fired", async () => {
    const root = scratch();
    await acg(root, "import");
    const run = await hook("stop-next.ts", { cwd: root, stop_hook_active: true });
    expect(run.out.trim()).toBe("");
  });

  test("the stop guard stays silent when no phase is in progress", async () => {
    const root = scratch();
    await acg(root, "import");
    const run = await hook("stop-next.ts", { cwd: root, stop_hook_active: false });
    expect(run.out.trim()).toBe("");
  });

  test("precompact writes a breadcrumb naming the cursor", async () => {
    const root = scratch();
    await acg(root, "import");
    const run = await hook("precompact-breadcrumb.ts", { trigger: "auto", cwd: root });
    expect(run.out).toContain("breadcrumb");
    const body = readFileSync(join(root, ".arch/audit/breadcrumb.md"), "utf8");
    expect(body).toContain("Cursor: 04-specification");
    expect(body).toContain("acg.ts next --json");
  });
});

describe("state schema", () => {
  test("the state the engine writes validates against acg-state.schema.json", async () => {
    const root = scratch();
    await acg(root, "import");
    await acg(root, "jump", "--phase", "05-delivery", "--reason", "schema probe");
    const { default: Ajv } = await import("ajv");
    const { parse } = await import("yaml");
    const schema = JSON.parse(
      readFileSync(join(root, "artifact-schemas/acg-state.schema.json"), "utf8"),
    );
    delete schema.$schema;
    const validate = new Ajv({ allErrors: true, strict: false, validateSchema: false }).compile(
      schema,
    );
    const state = parse(readFileSync(join(root, ".arch/acg-state.yaml"), "utf8"));
    const ok = validate(state);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });
});
