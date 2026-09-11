import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import type { Lesson, SensorFinding } from "./types.ts";
import { auditDir, repoRoot } from "./paths.ts";
import { now } from "./state.ts";

/**
 * Slice 9 learning loop.
 *
 * Not model training — an append-only tally of which sensor keeps rejecting which
 * phase. `next` hands the recurring ones back to the conductor so the same lie is
 * not re-authored a fourth time.
 */
function lessonsPath(root: string): string {
  return join(auditDir(root), "lessons.yaml");
}

export function loadLessons(root = repoRoot()): Lesson[] {
  const path = lessonsPath(root);
  if (!existsSync(path)) return [];
  const doc = parse(readFileSync(path, "utf8")) as { lessons?: Lesson[] } | null;
  return doc?.lessons ?? [];
}

export function recordLessons(
  phase: string,
  findings: SensorFinding[],
  root = repoRoot(),
): Lesson[] {
  const fails = findings.filter((f) => f.status === "fail");
  if (fails.length === 0) return loadLessons(root);
  const lessons = loadLessons(root);
  const stamp = now();
  for (const f of fails) {
    const found = lessons.find((l) => l.sensor === f.sensor && l.phase === phase);
    if (found) {
      found.failures += 1;
      found.last_seen = stamp;
      found.last_message = f.message;
    } else {
      lessons.push({
        sensor: f.sensor,
        phase,
        failures: 1,
        first_seen: stamp,
        last_seen: stamp,
        last_message: f.message,
      });
    }
  }
  lessons.sort((a, b) => b.failures - a.failures || a.phase.localeCompare(b.phase));
  mkdirSync(auditDir(root), { recursive: true });
  writeFileSync(lessonsPath(root), stringify({ lessons }, { lineWidth: 120 }), "utf8");
  return lessons;
}

/** Sensors that have rejected this phase more than once — worth saying out loud. */
export function lessonsFor(phase: string, root = repoRoot(), minFailures = 2): string[] {
  return loadLessons(root)
    .filter((l) => l.phase === phase && l.failures >= minFailures)
    .map((l) => `${l.sensor} has rejected ${phase} ${l.failures}× — last: ${l.last_message}`);
}
