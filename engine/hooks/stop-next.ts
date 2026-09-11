#!/usr/bin/env bun
/**
 * Stop guard (slice 6).
 *
 * A phase left `[-]` means the conductor did work and walked away without reporting.
 * The engine cannot see the artifacts appear, so it asks for the report before the
 * turn ends. Read-only: it never advances the state machine itself.
 */
import { existsSync } from "node:fs";
import { loadState } from "../src/state.ts";
import { repoRoot, statePath } from "../src/paths.ts";

interface HookInput {
  stop_hook_active?: boolean;
  cwd?: string;
}

const raw = await Bun.stdin.text();
let input: HookInput = {};
try {
  input = JSON.parse(raw) as HookInput;
} catch {
  process.exit(0);
}

// Already re-entered once: say nothing rather than loop.
if (input.stop_hook_active) process.exit(0);

try {
  const root = repoRoot(input.cwd ?? process.cwd());
  if (!existsSync(statePath(root))) process.exit(0);
  const state = loadState(root);
  const phase = state.cursor.phase;
  if (!phase || state.cursor.state !== "in_progress") process.exit(0);
  console.log(
    JSON.stringify({
      decision: "block",
      reason:
        `ACG engine: ${phase} is still [-] in_progress. Before finishing, report it:\n` +
        `  bun engine/src/acg.ts report --phase ${phase} --result awaiting-approval\n` +
        `If the phase is not actually done, say what is left instead of stopping silently. ` +
        `Never edit .arch/acg-state.yaml to mark it complete.`,
    }),
  );
} catch {
  // no engine here, or unreadable state: nothing to enforce
}
process.exit(0);
