import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SensorFinding } from "../types.ts";
import { phaseById } from "../graph.ts";
import { repoRoot } from "../load.ts";
import { fail, na, pass } from "./util.ts";
import { applicablePaths } from "../applicability.ts";

const SENSOR = "files-exist";

/**
 * A phase cannot consume a ghost. Plan §0 lists "Phase 4 要讀 vertical-slices.yaml,
 * 磁碟上沒有" as a shipped lie; this makes every declared input checkable.
 */
export function filesExist(root = repoRoot(), phase?: string): SensorFinding[] {
  if (!phase) return [pass(SENSOR, "no phase in context — nothing to check", false)];
  const def = phaseById(phase);
  const expected = applicablePaths(def.consumes, root);
  if (def.consumes.length > 0 && expected.length === 0) {
    return [na(SENSOR, `every declared input of ${phase} is inapplicable to this project`)];
  }
  const findings: SensorFinding[] = [];
  for (const rel of expected) {
    const abs = join(root, rel);
    if (!existsSync(abs)) {
      findings.push(fail(SENSOR, `${phase} consumes ${rel}, which does not exist`));
      continue;
    }
    if (statSync(abs).isDirectory() && readdirSync(abs).length === 0) {
      findings.push(fail(SENSOR, `${phase} consumes ${rel}, which is an empty directory`));
    }
  }
  if (findings.length === 0) {
    return [
      expected.length === 0
        ? na(SENSOR, `${phase} declares no inputs, so there is nothing to check for`)
        : pass(SENSOR, `${expected.length} declared input(s) present for ${phase}`),
    ];
  }
  return findings;
}
