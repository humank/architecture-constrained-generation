import type { SensorFinding } from "../types.ts";
import { loadStories, repoRoot } from "../load.ts";
import { fail, na, pass, tryYaml } from "./util.ts";
import { nameAppearsIn, normalizeKey } from "../text.ts";

const SENSOR = "swimlane-is-story";

interface Slice {
  command?: string;
  actor?: string;
  event?: string;
  automation?: string;
  trigger_event?: string;
  output_event?: string;
  read_model?: string;
  sourced_from?: string[];
}

interface Swimlane {
  name?: string;
  story?: string;
  slices?: Slice[];
}

/**
 * Plan §2 Phase 1c: "泳道用 DST 故事切（或故事 × BC），不要先用 BC 切再回頭證明 BC" and
 * "Read model 名稱來自 DST class: read 的 work object".
 */
export function swimlaneIsStory(root = repoRoot()): SensorFinding[] {
  const loaded = tryYaml<{ event_model?: { swimlanes?: Swimlane[] } }>(
    SENSOR,
    ".arch/01-discovery/event-model.yaml",
    root,
  );
  if (loaded.finding) return [loaded.finding];
  const lanes = loaded.doc.event_model?.swimlanes ?? [];
  if (lanes.length === 0) return [fail(SENSOR, "event-model.yaml declares no swimlanes")];

  const stories = loadStories(root).map((s) => s.story);
  const storyIds = new Set(stories.map((s) => s.id));
  const findings: SensorFinding[] = [];
  const covered = new Set<string>();

  for (const lane of lanes) {
    const label = lane.name ?? "(unnamed)";
    if (!lane.story) {
      findings.push(
        fail(
          SENSOR,
          `Swimlane "${label}" declares no story — lanes are cut by DS-* story, not by bounded context`,
        ),
      );
      continue;
    }
    if (!storyIds.has(lane.story)) {
      findings.push(fail(SENSOR, `Swimlane "${label}" cites story ${lane.story}, which does not exist`));
      continue;
    }
    covered.add(lane.story);
  }

  // Plan §2 Phase 1a: a `read` step must have an Event Model read model. The check
  // runs from the story to the model, not the other way round — an event model also
  // holds intermediate read models that no actor asks for by name.
  const readModels = lanes
    .flatMap((l) => l.slices ?? [])
    .map((s) => s.read_model)
    .filter((r): r is string => Boolean(r));
  for (const story of stories) {
    if (!covered.has(story.id)) {
      findings.push(
        fail(SENSOR, `${story.id} has no swimlane — every to-be story is modelled or explicitly out of scope`),
      );
      continue;
    }
    for (const step of story.steps ?? []) {
      if (step.class !== "read" || !step.system_visible) continue;
      if (normalizeKey(step.work_object) === null) {
        findings.push(
          na(
            SENSOR,
            `DST read step ${step.id} has a work object with no comparable characters ("${step.work_object}") — cannot match it to a read model`,
          ),
        );
        continue;
      }
      if (readModels.some((r) => nameAppearsIn(r, step.work_object))) continue;
      findings.push(
        fail(
          SENSOR,
          `DST read step ${step.id} (${step.actor} views ${step.work_object}) has no matching read model in event-model.yaml — the model calls it something else`,
        ),
      );
    }
  }

  if (findings.every((f) => f.status !== "fail")) {
    findings.push(
      pass(SENSOR, `${lanes.length} swimlane(s) cut by story; every DST read step has a read model`),
    );
  }
  return findings;
}

