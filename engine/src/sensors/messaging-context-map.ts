import type { SensorFinding } from "../types.ts";
import { repoRoot } from "../load.ts";
import { fail, na, pass, tryText, tryYaml } from "./util.ts";
import { activeProfile } from "../profile.ts";

const SENSOR = "messaging-matches-context-map";

interface Relationship {
  upstream?: string;
  downstream?: string;
  events?: string[];
  integration?: {
    topic?: string;
    queue?: string;
    events?: string[];
    subscription_filter?: { eventType?: string[] };
  };
}

/**
 * Plan §2 Phase 5: "SNS/SQS 對 Context Map 邊."
 *
 * This is a real correspondence, unlike the IAM-role-per-actor idea the plan once
 * asked for and has since withdrawn: an IAM role is a workload identity, a DST actor
 * is a person's job. A topic and a queue, though, *are* a context map edge — so every
 * channel the IaC creates must be on the map, and its subscription filter must carry
 * exactly the events that edge declares. A filter that is wider than the map is a
 * context quietly consuming events nobody said it could see.
 */
export function messagingMatchesContextMap(root = repoRoot()): SensorFinding[] {
  const cmap = tryYaml<{ context_map?: { relationships?: Relationship[] } }>(
    SENSOR,
    ".arch/02-strategic/context-map.yaml",
    root,
  );
  if (cmap.finding) return [cmap.finding];
  const relationships = cmap.doc.context_map?.relationships ?? [];
  const async = relationships.filter((r) => r.integration?.topic || r.integration?.queue);
  if (async.length === 0) {
    return [
      na(
        SENSOR,
        "the context map declares no topic or queue on any edge — this design has no message channels to compare",
      ),
    ];
  }

  const { profile } = activeProfile(root);
  const messagingFile = profile.messaging.file;
  if (!messagingFile) {
    return [
      na(SENSOR, `profile "${profile.id}" declares no messaging definition file, so channels were not checked`),
    ];
  }
  const iac = tryText(SENSOR, messagingFile, root);
  if (iac.finding) return [iac.finding];

  const declaredTopics = new Set<string>();
  const declaredQueues = new Set<string>();
  const findings: SensorFinding[] = [];

  for (const r of async) {
    const edge = `${r.upstream} → ${r.downstream}`;
    const topic = r.integration?.topic;
    const queue = r.integration?.queue;
    const events = [...(r.events ?? []), ...(r.integration?.events ?? [])];

    if (topic) {
      declaredTopics.add(topic);
      if (!new RegExp(`topicName:\\s*\`\\$\\{prefix\\}-${escape(topic)}\``).test(iac.text) &&
          !iac.text.includes(`'${topic}'`) && !iac.text.includes(`"${topic}"`)) {
        findings.push(fail(SENSOR, `Context map edge ${edge} uses topic "${topic}", which ${messagingFile} does not create`));
      }
    }
    if (queue) {
      declaredQueues.add(queue);
      if (!iac.text.includes(`'${queue}'`) && !iac.text.includes(`"${queue}"`)) {
        findings.push(fail(SENSOR, `Context map edge ${edge} uses queue "${queue}", which ${messagingFile} does not create`));
      }
      // The subscription filter is the edge's contract: exactly these events.
      const filter = subscriptionAllowlist(iac.text, queue);
      if (filter === null) {
        findings.push(
          fail(SENSOR, `Queue "${queue}" (${edge}) has no subscription filter — it receives every event on its topic, not just [${events.join(", ")}]`),
        );
      } else if (events.length) {
        const extra = filter.filter((e) => !events.includes(e));
        const missing = events.filter((e) => !filter.includes(e));
        if (extra.length) {
          findings.push(
            fail(SENSOR, `Queue "${queue}" (${edge}) also accepts [${extra.join(", ")}], which the context map does not put on that edge`),
          );
        }
        if (missing.length) {
          findings.push(
            fail(SENSOR, `Queue "${queue}" (${edge}) filters out [${missing.join(", ")}], which the context map says it must receive`),
          );
        }
      }
    }
  }

  // The other direction: a channel the IaC invented.
  for (const m of iac.text.matchAll(/createQueueWithDlq\(\s*['"`]([^'"`]+)['"`]/g)) {
    if (!declaredQueues.has(m[1]!)) {
      findings.push(fail(SENSOR, `${messagingFile} creates queue "${m[1]}", which is not on the context map`));
    }
  }
  for (const m of iac.text.matchAll(/topicName:\s*`\$\{prefix\}-([^`]+)`/g)) {
    if (!declaredTopics.has(m[1]!)) {
      findings.push(fail(SENSOR, `${messagingFile} creates topic "${m[1]}", which is not on the context map`));
    }
  }

  if (findings.length === 0) {
    return [
      pass(SENSOR, `${async.length} async context map edge(s) match the topics, queues and subscription filters in ${messagingFile}`),
    ];
  }
  return findings;
}

/** The allowlist of the subscription that feeds this queue, or null if unfiltered. */
function subscriptionAllowlist(source: string, queue: string): string[] | null {
  const at = source.indexOf(`this.queues['${queue}']`);
  if (at < 0) return null;
  // The filter policy follows the queue reference inside the same addSubscription call.
  const window = source.slice(at, at + 500);
  const end = window.indexOf("addSubscription", 1);
  const block = end > 0 ? window.slice(0, end) : window;
  const m = block.match(/allowlist:\s*\[([^\]]*)\]/);
  if (!m) return null;
  return m[1]!
    .split(",")
    .map((v) => v.trim().replace(/^['"`]|['"`]$/g, ""))
    .filter(Boolean);
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
