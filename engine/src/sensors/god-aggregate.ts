import type { SensorFinding } from "../types.ts";
import { listFiles, repoRoot } from "../load.ts";
import { pass, tryYamlAll, warn } from "./util.ts";

const SENSOR = "god-aggregate";

/**
 * Plan §5: the semantic God Aggregate review is second release, but "God Aggregate 的
 * command 計數可先做決定性" — so count commands and invariants and say so. Advisory:
 * a large aggregate is a smell, not a lie.
 */
const MAX_COMMANDS = 7;
const MAX_ENTITIES = 5;

interface Aggregate {
  name?: string;
  bounded_context?: string;
  commands?: unknown[];
  entities?: unknown[];
  invariants?: unknown[];
}

export function godAggregate(root = repoRoot()): SensorFinding[] {
  const files = listFiles(".arch/03-tactical/aggregates", root, ".yaml");
  if (files.length === 0) {
    return [
      warn(SENSOR, "No aggregate files under .arch/03-tactical/aggregates/"),
    ];
  }
  const findings: SensorFinding[] = [];
  let counted = 0;
  for (const file of files) {
    // One file may hold several aggregates as separate YAML documents.
    const loaded = tryYamlAll<{ aggregate?: Aggregate }>(SENSOR, file, root);
    if (loaded.finding) {
      findings.push(warn(SENSOR, loaded.finding.message));
      continue;
    }
    for (const doc of loaded.docs) {
      const agg = doc.aggregate;
      if (!agg?.name) {
        findings.push(warn(SENSOR, `${file} has no aggregate.name`));
        continue;
      }
      counted += 1;
      const commands = agg.commands?.length ?? 0;
      const entities = agg.entities?.length ?? 0;
      if (commands > MAX_COMMANDS) {
        findings.push(
          warn(
            SENSOR,
            `${agg.name} handles ${commands} commands (> ${MAX_COMMANDS}) — check whether one lifecycle is really two`,
          ),
        );
      }
      if (entities > MAX_ENTITIES) {
        findings.push(
          warn(
            SENSOR,
            `${agg.name} contains ${entities} entities (> ${MAX_ENTITIES}) — consider a smaller consistency boundary`,
          ),
        );
      }
      if ((agg.invariants?.length ?? 0) === 0) {
        findings.push(
          warn(
            SENSOR,
            `${agg.name} declares no invariants — an aggregate without rules is a data holder`,
          ),
        );
      }
    }
  }
  if (findings.length === 0) {
    return [
      pass(
        SENSOR,
        `${counted} aggregate(s) within command and entity budgets`,
        false,
      ),
    ];
  }
  return findings;
}
