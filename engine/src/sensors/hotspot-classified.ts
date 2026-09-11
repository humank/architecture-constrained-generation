import type { SensorFinding } from "../types.ts";
import { loadStories, loadStorm, repoRoot } from "../load.ts";
import type { EventStorm } from "../load.ts";
import { fail, pass, warn } from "./util.ts";

const SENSOR = "hotspot-classified";
const KINDS = ["work-unknown", "fact-unknown"];
const STATUSES = ["open", "resolved", "deferred"];

interface HotSpot {
  topic?: string;
  question?: string;
  description?: string;
  kind?: string;
  location?: string;
  sourced_from?: string[];
  resolution_status?: string;
  resolution?: string;
}

/**
 * Plan §2 Phase 1b: "Hotspot 分類：`work-unknown` → 退回 01a；`fact-unknown` 留在 Storm."
 *
 * The two kinds are not the same debt. A fact nobody has decided is what the storm is
 * for — it can sit there openly. A gap in how people actually work means the story is
 * wrong, and no amount of event modelling on top of it will help: that one goes back
 * to Domain Storytelling. So an OPEN work-unknown refuses the phase, and the message
 * says where to take it.
 */
export function hotspotClassified(root = repoRoot()): SensorFinding[] {
  const storm = loadStorm(root) as EventStorm & { hot_spots?: HotSpot[] };
  const spots = storm.hot_spots ?? [];
  if (spots.length === 0) {
    return [warn(SENSOR, "event-storm.yaml records no hot spots — a storm with no open questions is unusual")];
  }

  const events = new Set((storm.domain_events ?? []).map((e) => e.event));
  const commands = new Set((storm.commands ?? []).map(String));
  const stepIds = new Set(
    loadStories(root).flatMap((s) => (s.story.steps ?? []).map((st) => st.id)),
  );

  const findings: SensorFinding[] = [];
  for (const spot of spots) {
    const label = spot.topic ?? spot.description ?? spot.question ?? "(untitled hot spot)";

    if (!spot.kind) {
      findings.push(
        fail(SENSOR, `Hot spot "${label}" is not classified — every hot spot is work-unknown or fact-unknown`),
      );
      continue;
    }
    if (!KINDS.includes(spot.kind)) {
      findings.push(fail(SENSOR, `Hot spot "${label}" has kind "${spot.kind}"; allowed: ${KINDS.join(", ")}`));
      continue;
    }

    const status = spot.resolution_status;
    if (!status || !STATUSES.includes(status)) {
      findings.push(
        fail(SENSOR, `Hot spot "${label}" has resolution_status "${status ?? "<none>"}"; allowed: ${STATUSES.join(", ")}`),
      );
      continue;
    }

    if (spot.kind === "work-unknown" && status === "open") {
      findings.push(
        fail(
          SENSOR,
          `Hot spot "${label}" is an open work-unknown: the work model is incomplete, so this goes back to 01a-dst (redo --phase 01a-dst), not forward into the model`,
        ),
      );
    }

    if (status !== "open" && !spot.resolution?.trim()) {
      findings.push(fail(SENSOR, `Hot spot "${label}" is ${status} but records no resolution`));
    }

    if (spot.location && !events.has(spot.location) && !commands.has(spot.location)) {
      findings.push(
        fail(SENSOR, `Hot spot "${label}" is located at "${spot.location}", which is not an event or command in this storm`),
      );
    }
    for (const id of spot.sourced_from ?? []) {
      if (!stepIds.has(String(id))) {
        findings.push(
          fail(SENSOR, `Hot spot "${label}" cites ${id}, which is not a DST step`),
        );
      }
    }
  }

  if (findings.every((f) => f.status !== "fail")) {
    const open = spots.filter((s) => s.resolution_status === "open").length;
    findings.push(
      pass(SENSOR, `${spots.length} hot spot(s) classified; ${open} open, all fact-unknown`),
    );
  }
  return findings;
}
