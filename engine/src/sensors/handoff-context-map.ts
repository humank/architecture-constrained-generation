import type { SensorFinding } from "../types.ts";
import { loadStories, loadStorm, repoRoot } from "../load.ts";
import { fail, na, pass, tryYaml, warn } from "./util.ts";
import { normalizeKey, stripParenthetical } from "../text.ts";

const SENSOR = "handoff-equals-context-map";

interface BoundedContext {
  name?: string;
  commands?: (string | { name?: string })[];
  events_produced?: (string | { event?: string; name?: string })[];
}

interface Relationship {
  upstream?: string;
  downstream?: string;
  events?: string[];
  integration?: { events?: string[] };
}

/**
 * Plan §2 Phase 2: "Context Map 每一邊 = 一個 DST handoff".
 *
 * Actor→BC is derived, never tabled: a BC owns the commands it lists, and the
 * Event Storm says which actor issues each command. So an actor works in every BC
 * whose commands they issue. A handoff between actors with no BC in common must
 * show up as a context map edge carrying that step's event.
 */
export function handoffEqualsContextMap(root = repoRoot()): SensorFinding[] {
  const stories = loadStories(root);
  const storm = loadStorm(root);

  const bcs = tryYaml<{ bounded_contexts?: { contexts?: BoundedContext[] } & BoundedContext[] }>(
    SENSOR,
    ".arch/02-strategic/bounded-contexts.yaml",
    root,
  );
  if (bcs.finding) return [bcs.finding];
  const cmap = tryYaml<{ context_map?: { relationships?: Relationship[] } }>(
    SENSOR,
    ".arch/02-strategic/context-map.yaml",
    root,
  );
  if (cmap.finding) return [cmap.finding];

  // Events live under `integration:` in the coffeeshop map and at the relationship
  // top level in the schema example. Both spellings are one context map edge.
  const relEvents = new Set(
    (cmap.doc.context_map?.relationships ?? []).flatMap((r) => [
      ...(r.events ?? []),
      ...(r.integration?.events ?? []),
    ]),
  );

  const contexts = listContexts(bcs.doc);
  const actorBc = deriveActorBcs(contexts, storm);
  const eventBySource = new Map<string, string[]>();
  for (const e of storm.domain_events ?? []) {
    for (const id of e.sourced_from ?? []) {
      const list = eventBySource.get(String(id)) ?? [];
      list.push(e.event);
      eventBySource.set(String(id), list);
    }
  }

  const findings: SensorFinding[] = [];
  let checked = 0;
  let handoffs = 0;
  for (const { story } of stories) {
    for (const step of story.steps ?? []) {
      if (step.class !== "handoff") continue;
      handoffs += 1;
      const events = eventBySource.get(step.id) ?? [];
      if (events.length === 0) continue; // dst-storm-correspondence already flags this
      const fromBcs = actorBc.get(key(step.from_actor)) ?? new Set<string>();
      const toBcs = actorBc.get(key(step.to_actor)) ?? new Set<string>();
      if (fromBcs.size === 0 || toBcs.size === 0) {
        findings.push(
          warn(
            SENSOR,
            `DST handoff ${step.id} (${step.from_actor} → ${step.to_actor}): cannot place ${
              fromBcs.size === 0 ? step.from_actor : step.to_actor
            } in a bounded context — no BC lists a command that actor issues`,
          ),
        );
        continue;
      }
      if ([...fromBcs].some((b) => toBcs.has(b))) continue; // same BC: not a map edge
      checked += 1;
      if (!events.some((ev) => relEvents.has(ev))) {
        findings.push(
          fail(
            SENSOR,
            `DST handoff ${step.id} (${step.from_actor} → ${step.to_actor}) events [${events.join(", ")}] are not on the context map`,
          ),
        );
      }
    }
  }

  if (findings.every((f) => f.status !== "fail")) {
    findings.push(
      checked === 0
        ? na(
            SENSOR,
            `every DST handoff is between actors who share a bounded context, so none of them needs a context map edge (${handoffs} handoff(s) examined)`,
          )
        : pass(SENSOR, `${checked} cross-BC DST handoff(s) appear on the context map`),
    );
  }
  return findings;
}

function listContexts(doc: unknown): BoundedContext[] {
  const root = (doc as { bounded_contexts?: unknown })?.bounded_contexts;
  if (Array.isArray(root)) return root as BoundedContext[];
  const nested = (root as { contexts?: unknown })?.contexts;
  return Array.isArray(nested) ? (nested as BoundedContext[]) : [];
}

function deriveActorBcs(
  contexts: BoundedContext[],
  storm: { domain_events?: { event: string; trigger?: { command?: string; actor?: string } }[] },
): Map<string, Set<string>> {
  const actorByCommand = new Map<string, string>();
  for (const e of storm.domain_events ?? []) {
    if (e.trigger?.command && e.trigger.actor) actorByCommand.set(e.trigger.command, e.trigger.actor);
  }
  const out = new Map<string, Set<string>>();
  for (const bc of contexts) {
    if (!bc.name) continue;
    for (const raw of bc.commands ?? []) {
      const command = typeof raw === "string" ? raw : raw?.name;
      if (!command) continue;
      const actor = actorByCommand.get(command);
      if (!actor) continue;
      const set = out.get(key(actor)) ?? new Set<string>();
      set.add(bc.name);
      out.set(key(actor), set);
    }
  }
  // "System" is not an actor with a keyboard: automated steps run wherever the
  // policy lives, so treat it as present in every context.
  out.set("system", new Set(contexts.map((c) => c.name!).filter(Boolean)));
  return out;
}

/** Actor identity key. Null when the name carries no comparable characters. */
function key(actor?: string): string {
  return normalizeKey(stripParenthetical(actor)) ?? "";
}
