import type { SensorFinding } from "../types.ts";
import { listFiles, loadStories, repoRoot } from "../load.ts";
import { fail, na, pass, tryYaml, tryYamlAll } from "./util.ts";
import { normalizeKey } from "../text.ts";

const SENSOR = "ephemeral-not-persisted";

interface BoundedContext {
  name?: string;
  data_store?: { tables?: string[] };
}

interface Aggregate {
  name?: string;
  root_entity?: { name?: string };
  entities?: { name?: string }[];
  value_objects?: { name?: string }[];
  data_store?: { tables?: string[] };
}

/**
 * Plan §2 Phase 3: "`persisted` work object → 實體／聚合；`ephemeral`（口頭 DrinkChoice）
 * 禁止成表."
 *
 * Ephemeral is derived, not a new schema field: a work object that only ever appears
 * in steps the system cannot see is spoken, not stored. DrinkChoice exists between the
 * customer's mouth and the waiter's memory — the moment it becomes a table, the model
 * claims the shop records something it never records.
 */
export function ephemeralNotPersisted(root = repoRoot()): SensorFinding[] {
  const stories = loadStories(root);
  if (stories.length === 0) return [fail(SENSOR, "No domain stories loaded")];

  const visible = new Set<string>();
  const spoken = new Map<string, string>(); // work object → the step that says it aloud
  for (const { story } of stories) {
    for (const step of story.steps ?? []) {
      const key = norm(step.work_object);
      if (!key) continue;
      if (step.system_visible) {
        visible.add(key);
        continue;
      }
      // Only spoken work objects are ephemeral. Table, Counter, Cash and Material are
      // invisible to the system too, but they are physical things the model may well
      // represent — a table number, a cash amount, a stocked material. Words are not.
      if (step.medium === "spoken" && !spoken.has(key)) {
        spoken.set(key, `${step.id} (${step.actor} ${step.activity} ${step.work_object}, medium: spoken)`);
      }
    }
  }
  // A medium-change work object appears twice — once spoken, once digital — so being
  // said aloud somewhere is not enough; it must never be visible anywhere.
  const ephemeral = [...spoken].filter(([key]) => !visible.has(key));
  if (ephemeral.length === 0) {
    return [
      na(
        SENSOR,
        "no work object is spoken-only in these stories, so there is nothing that must stay out of the database",
      ),
    ];
  }

  const findings: SensorFinding[] = [];
  let entities = 0;

  // "禁止成表" — the tables are declared per bounded context, not in the aggregates.
  const bcs = tryYaml<{
    bounded_contexts?: { contexts?: BoundedContext[] } & BoundedContext[];
  }>(SENSOR, ".arch/02-strategic/bounded-contexts.yaml", root);
  if (!bcs.finding) {
    for (const bc of listContexts(bcs.doc)) {
      for (const table of bc.data_store?.tables ?? []) {
        entities += 1;
        const match = ephemeral.find(([key]) => key === norm(table));
        if (match) {
          findings.push(
            fail(
              SENSOR,
              `bounded-contexts.yaml gives ${bc.name} a "${table}" table, but the stories only ever have it spoken aloud — ${match[1]}. Spoken words are not records.`,
            ),
          );
        }
      }
    }
  }

  for (const file of listFiles(".arch/03-tactical/aggregates", root, ".yaml")) {
    const loaded = tryYamlAll<{ aggregate?: Aggregate }>(SENSOR, file, root);
    if (loaded.finding) {
      findings.push(loaded.finding);
      continue;
    }
    for (const doc of loaded.docs) {
      const agg = doc.aggregate;
      if (!agg) continue;
      const persisted = [
        agg.name,
        agg.root_entity?.name,
        ...(agg.entities ?? []).map((e) => e.name),
        ...(agg.value_objects ?? []).map((v) => v.name),
        ...(agg.data_store?.tables ?? []),
      ].filter((n): n is string => Boolean(n));
      entities += persisted.length;
      for (const name of persisted) {
        const match = ephemeral.find(([key]) => key === norm(name));
        if (match) {
          findings.push(
            fail(
              SENSOR,
              `${file} persists "${name}", but the stories only ever have it spoken aloud — ${match[1]}. Spoken words are not records.`,
            ),
          );
        }
      }
    }
  }

  if (findings.length === 0) {
    return [
      pass(
        SENSOR,
        `${ephemeral.length} spoken work object(s) (${ephemeral.map(([k]) => k).join(", ")}) stay out of the ${entities} persisted name(s)`,
      ),
    ];
  }
  return findings;
}

function listContexts(doc: unknown): BoundedContext[] {
  const root = (doc as { bounded_contexts?: unknown })?.bounded_contexts;
  if (Array.isArray(root)) return root as BoundedContext[];
  const nested = (root as { contexts?: unknown })?.contexts;
  return Array.isArray(nested) ? (nested as BoundedContext[]) : [];
}

/** Null (not "") when the name has no comparable characters, so it never wildcards. */
function norm(s?: string): string | null {
  return normalizeKey(s);
}
