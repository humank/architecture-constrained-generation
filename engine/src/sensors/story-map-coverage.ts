import type { SensorFinding } from "../types.ts";
import { loadStories, repoRoot } from "../load.ts";
import { fail, na, pass, tryYaml } from "./util.ts";

const SENSOR = "story-map-coverage";

interface UserStory {
  id?: string;
  priority?: string;
  covered_by?: string;
}

interface StoryMap {
  story_map?: {
    backbone?: {
      activity?: string;
      steps?: { step?: string; stories?: UserStory[] }[];
    }[];
  };
}

/**
 * Plan §2 Phase 0: "Story Map backbone 活動 = DST 故事候選" and every US-* carries a
 * `pending_story` until 01a fills a DS-xx. So every MVP user story must be covered by
 * some domain story, and every DST backbone must name a real backbone activity.
 */
export function storyMapCoverage(root = repoRoot()): SensorFinding[] {
  const loaded = tryYaml<StoryMap>(SENSOR, ".arch/00-requirements/story-map.yaml", root);
  if (loaded.finding) return [loaded.finding];
  const stories = loadStories(root).map((s) => s.story);
  if (stories.length === 0) return [fail(SENSOR, "No domain stories to cover the story map")];

  const covered = new Set(stories.flatMap((s) => s.covers ?? []));
  const coversOf = new Map(stories.map((s) => [s.id, new Set(s.covers ?? [])]));
  const backbones = new Set(
    (loaded.doc.story_map?.backbone ?? []).map((b) => (b.activity ?? "").trim()).filter(Boolean),
  );
  const findings: SensorFinding[] = [];
  let mvp = 0;

  for (const activity of loaded.doc.story_map?.backbone ?? []) {
    for (const step of activity.steps ?? []) {
      for (const story of step.stories ?? []) {
        if (!story.id) continue;
        const where = `${activity.activity} / ${step.step}`;
        if ((story.priority ?? "").toUpperCase() === "MVP") {
          mvp += 1;
          if (!covered.has(story.id)) {
            findings.push(
              fail(SENSOR, `MVP story ${story.id} ("${where}") is not covered by any DS-* story`),
            );
          }
        }

        // The Phase 0 → 01a link, checked in the other direction: a `covered_by` that
        // names a story which does not list this US back is a one-way claim.
        const link = story.covered_by;
        if (link === undefined || link === "pending_story") continue;
        const claimed = coversOf.get(link);
        if (!claimed) {
          findings.push(
            fail(SENSOR, `${story.id} ("${where}") is covered_by ${link}, which does not exist`),
          );
        } else if (!claimed.has(story.id)) {
          findings.push(
            fail(
              SENSOR,
              `${story.id} claims covered_by ${link}, but ${link} does not list ${story.id} in its own covers`,
            ),
          );
        }
      }
    }
  }

  for (const story of stories) {
    if (story.backbone && !backbones.has(story.backbone.trim())) {
      findings.push(
        fail(
          SENSOR,
          `${story.id} claims backbone "${story.backbone}", which is not a story-map backbone activity (${[...backbones].join(", ")})`,
        ),
      );
    }
  }

  if (findings.length === 0) {
    return [
      mvp === 0
        ? na(SENSOR, "the story map marks no story as MVP, so there is no coverage to require")
        : pass(SENSOR, `${mvp} MVP user story/-ies covered by ${stories.length} domain story/-ies`),
    ];
  }
  return findings;
}
