import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SensorFinding } from "../types.ts";
import { listFiles, loadStories, repoRoot } from "../load.ts";
import { na } from "./util.ts";

export function e2eStoryCoverage(root = repoRoot()): SensorFinding[] {
  const stories = loadStories(root).map((s) => s.story);
  const findings: SensorFinding[] = [];
  const journeyFiles = listFiles(".arch/04-specification/features/journeys", root, ".feature");
  const journeyText = journeyFiles
    .map((f) => readFileSync(join(root, f), "utf8"))
    .join("\n");
  const pipelinePath = join(root, ".arch/05-delivery/pipeline.yaml");
  const pipeline = existsSync(pipelinePath) ? readFileSync(pipelinePath, "utf8") : "";

  for (const story of stories) {
    if (story.purity === "as-is") continue;
    const id = story.id;
    if (!journeyText.includes(id)) {
      findings.push({
        sensor: "e2e-story-coverage",
        status: "fail",
        blocking: true,
        message: `${id} has no journey feature under .arch/04-specification/features/journeys/`,
      });
    }
    if (pipeline && !pipeline.includes(id)) {
      findings.push({
        sensor: "e2e-story-coverage",
        status: "fail",
        blocking: true,
        message: `${id} is not listed in pipeline.yaml smoke stories`,
      });
    }
  }

  if (findings.length === 0) {
    const toBe = stories.filter((s) => s.purity !== "as-is").length;
    return [
      toBe === 0
        ? na("e2e-story-coverage", "there are no to-be stories, so no journey or smoke entry is required")
        : {
            sensor: "e2e-story-coverage",
            status: "pass",
            blocking: true,
            // Say what was actually examined. The pipeline is Phase 5's output, so at
            // Phase 4 there is nothing to check there — claiming otherwise made the
            // message describe work the sensor had not done.
            // Deliberately narrow wording. This sensor checks that a journey *file*
            // exists per story and that the pipeline names the story — never that the
            // scenarios inside exercise it. A file containing one spinner assertion
            // passes, which is why the reviewer's verdict is not optional.
            message: pipeline
              ? `${toBe} to-be story/-ies are named by a journey file and a pipeline smoke entry (contents not inspected)`
              : `${toBe} to-be story/-ies are named by a journey file; the pipeline does not exist yet, so its smoke list is checked at 05-delivery`,
          },
    ];
  }
  return findings;
}
