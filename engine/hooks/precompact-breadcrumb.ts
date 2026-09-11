#!/usr/bin/env bun
/**
 * PreCompact breadcrumb (slice 6).
 *
 * Compaction is where a long workflow forgets which phase it was in and starts
 * guessing from directory listings. The engine writes the board to disk first, so the
 * post-compaction conductor can read the truth instead of reconstructing it.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadState } from "../src/state.ts";
import { auditDir, repoRoot } from "../src/paths.ts";
import { statusText } from "../src/orchestrate.ts";
import { loadLessons } from "../src/lessons.ts";

interface HookInput {
  trigger?: string;
  cwd?: string;
}

const raw = await Bun.stdin.text();
let input: HookInput = {};
try {
  input = JSON.parse(raw) as HookInput;
} catch {
  process.exit(0);
}

try {
  const root = repoRoot(input.cwd ?? process.cwd());
  const state = loadState(root);
  const lessons = loadLessons(root)
    .filter((l) => l.failures >= 2)
    .map((l) => `- ${l.phase} / ${l.sensor} — ${l.failures}× — ${l.last_message}`);
  const body = [
    "# ACG breadcrumb",
    "",
    `Written before ${input.trigger ?? "unknown"} compaction at ${new Date().toISOString()}.`,
    "",
    "Do not infer the current phase from directory listings. Run:",
    "",
    "```bash",
    "bun engine/src/acg.ts next --json",
    "```",
    "",
    "## Board at compaction time",
    "",
    "```",
    statusText(root),
    "```",
    "",
    `Cursor: ${state.cursor.phase ?? "done"} (${state.cursor.state})`,
    "",
    ...(lessons.length ? ["## Sensors that keep rejecting", "", ...lessons, ""] : []),
  ].join("\n");
  mkdirSync(auditDir(root), { recursive: true });
  writeFileSync(join(auditDir(root), "breadcrumb.md"), body, "utf8");
  console.log("ACG breadcrumb written to .arch/audit/breadcrumb.md — read it before guessing the phase.");
} catch {
  // nothing to record
}
process.exit(0);
