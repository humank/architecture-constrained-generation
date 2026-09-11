#!/usr/bin/env bun
/**
 * PreToolUse guard (slice 6).
 *
 * Two jobs:
 *   1. `.arch/acg-state.yaml`, `.arch/audit/` and `.arch/quality-reports/` are the
 *      engine's own records. No agent tool may write them — the CLI is the only door.
 *   2. Intent isolation (slice 9): the phase that is running may write what it
 *      produces. Writing another phase's artifacts is refused, so Phase 3 cannot
 *      quietly emit Java and call the design done.
 *
 * Fails open. A guard that breaks the session on its own bug is worse than no guard,
 * so anything unexpected allows the write.
 */
import { checkWrite } from "../src/intent.ts";
import { repoRoot } from "../src/paths.ts";

interface HookInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  cwd?: string;
}

function deny(reason: string): never {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

function allow(): never {
  process.exit(0);
}

// Documented escape hatch: meta-work on the engine itself, where the phase board is
// the thing being edited rather than the thing being obeyed.
if (process.env.ACG_GUARD === "off") allow();

const raw = await Bun.stdin.text();
let input: HookInput = {};
try {
  input = JSON.parse(raw) as HookInput;
} catch {
  allow();
}

const paths = ["file_path", "notebook_path", "path"]
  .map((k) => input.tool_input?.[k])
  .filter((v): v is string => typeof v === "string" && v.length > 0);
if (paths.length === 0) allow();

let root: string;
try {
  root = repoRoot(input.cwd ?? process.cwd());
} catch {
  allow(); // not an ACG repo
}

for (const path of paths) {
  let verdict: ReturnType<typeof checkWrite>;
  try {
    verdict = checkWrite(path, root);
  } catch {
    continue; // no state yet, or an unreadable graph: not this guard's business
  }
  if (!verdict.allowed) {
    deny(
      `ACG engine: ${verdict.reason}. ` +
        `Active phase: ${verdict.phase ?? "none"}. ` +
        `Run \`bun engine/src/acg.ts next --json\` and write only what must_write lists.`,
    );
  }
}
allow();
