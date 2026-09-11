import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SensorFinding } from "../types.ts";
import { loadStorm, repoRoot } from "../load.ts";
import { activeProfile } from "../profile.ts";
import { phaseById } from "../graph.ts";
import { na } from "./util.ts";

/**
 * A name that *looks* like a domain event in prose. Built from the profile's suffix
 * vocabulary, because past-participle English is a convention, not a law — and one a
 * project may extend. It under-reports on purpose: an invented event that follows no
 * naming convention slips through, which is better than arguing with every capitalised
 * noun in every document.
 */
function eventish(suffixes: string[]): RegExp | null {
  if (suffixes.length === 0) return null;
  const alt = suffixes.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`\\b([A-Z][A-Za-z]+(?:${alt})\\w*)\\b`, "g");
}

function walkMd(dir: string, acc: string[] = []): string[] {
  // Phase 6 runs this sensor before Phase 7 exists: nothing to contradict yet.
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkMd(p, acc);
    else if (name.endsWith(".md")) acc.push(p);
  }
  return acc;
}

export function docsEventsMatchStorm(root = repoRoot(), phase?: string): SensorFinding[] {
  const storm = loadStorm(root);
  const { profile } = activeProfile(root);
  const EVENTISH = eventish(profile.vocabulary.event_suffixes);
  if (!EVENTISH) {
    return [
      na(
        "docs-events-match-storm",
        `profile "${profile.id}" declares no event-name vocabulary, so documentation names were not checked`,
      ),
    ];
  }
  const allowed = new Set((storm.domain_events ?? []).map((e) => e.event));
  // Scan the prose THIS phase produced, not a directory chosen once. Diagrams are not
  // the only place a name gets invented — a viewpoint or an ADR does it just as easily.
  const dirs = phase
    ? phaseById(phase)
        .produces.map((ref) => ref.path)
        .filter((p) => p.startsWith(".arch/"))
    : [".arch/06-review", ".arch/07-documentation"];
  const findings: SensorFinding[] = [];
  const seen = new Set<string>();
  let scanned = 0;

  for (const file of dirs.flatMap((d) => walkMd(join(root, d)))) {
    scanned += 1;
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(EVENTISH)) {
      const name = m[1]!;
      if (allowed.has(name)) continue;
      const key = `${file}:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const rel = file.slice(root.length + 1);
      findings.push({
        sensor: "docs-events-match-storm",
        status: "fail",
        blocking: true,
        message: `${rel}: event-like name "${name}" is not in event-storm.yaml`,
      });
    }
  }

  if (findings.length === 0) {
    return [
      scanned === 0
        ? na("docs-events-match-storm", `no prose to scan under ${dirs.join(", ")}, so no name can contradict the storm`)
        : {
            sensor: "docs-events-match-storm",
            status: "pass",
            blocking: true,
            message: `${scanned} documentation file(s) use only Event Storm names`,
          },
    ];
  }
  return findings;
}
