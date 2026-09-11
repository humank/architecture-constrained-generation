import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { SensorFinding } from "../types.ts";
import { archDir } from "../paths.ts";
import { repoRoot } from "../load.ts";
import { na, pass, warn } from "./util.ts";

const SENSOR = "quality-report-written";

/**
 * Plan §5 keeps this advisory in the first release: the gate writes the report as a
 * side effect, so a missing file means someone ran the gate outside the engine.
 */
export function qualityReportWritten(root = repoRoot(), phase?: string): SensorFinding[] {
  if (!phase) return [pass(SENSOR, "no phase in context", false)];
  const path = join(archDir(root), "quality-reports", `${phase}.yaml`);
  if (!existsSync(path)) {
    // The gate writes the report after the sensors run, so on a phase's very first
    // gate there is legitimately nothing there yet. Warning about that would train
    // people to ignore this sensor, which is the opposite of the point.
    return [na(SENSOR, `no previous gate report for ${phase} — this is its first gate`)];
  }
  try {
    const doc = parse(readFileSync(path, "utf8")) as { quality_report?: { phase?: string } };
    if (doc?.quality_report?.phase !== phase) {
      return [warn(SENSOR, `quality-reports/${phase}.yaml reports phase "${doc?.quality_report?.phase}"`)];
    }
  } catch (e) {
    return [warn(SENSOR, `quality-reports/${phase}.yaml is not valid YAML: ${String(e).split("\n")[0]}`)];
  }
  return [pass(SENSOR, `quality-reports/${phase}.yaml present`, false)];
}
