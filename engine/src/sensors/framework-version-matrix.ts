import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SensorFinding } from "../types.ts";
import { repoRoot } from "../load.ts";
import { activeProfile } from "../profile.ts";
import { fail, na, pass, tryYaml } from "./util.ts";

const SENSOR = "framework-version-matrix";

/**
 * Plan §2 Phase 8 / slice 7: "相容矩陣（問卷 vs 建置檔）".
 *
 * The questionnaire records what a human chose, verbatim, even when the build cannot
 * honour it — that is deliberate, so the conflict is visible instead of the
 * questionnaire quietly agreeing with the build file. This sensor is the thing that
 * makes it visible.
 *
 * Which build file to read comes from the profile, keyed by the locked
 * `backend_ecosystem`. So the same rule reads `build.gradle.kts` for the JVM,
 * `pyproject.toml` for Python, `go.mod` for Go — and reports n/a for an ecosystem the
 * profile says nothing about, rather than failing a project for not being Java.
 */
export function frameworkVersionMatrix(root = repoRoot()): SensorFinding[] {
  const assess = tryYaml<{
    answers?: {
      backend_ecosystem?: string;
      backend_framework_requested?: string;
      backend_framework_resolved?: string;
    };
  }>(SENSOR, ".arch/assessment-8.yaml", root);
  if (assess.finding) return [assess.finding];

  const answers = assess.doc.answers ?? {};
  const ecosystem = answers.backend_ecosystem ?? "";
  const requested = answers.backend_framework_requested ?? "";
  const resolved = answers.backend_framework_resolved ?? "";

  if (!ecosystem) {
    return [fail(SENSOR, "assessment-8 declares no backend_ecosystem, so no build file can be checked")];
  }
  if (ecosystem === "none") {
    return [na(SENSOR, "assessment-8.backend_ecosystem=none — there is no build file to compare")];
  }

  const { profile } = activeProfile(root);
  const candidates = profile.build_files[ecosystem] ?? [];
  if (candidates.length === 0) {
    return [
      na(
        SENSOR,
        `profile "${profile.id}" knows no build file for ecosystem "${ecosystem}" — add one to check versions here`,
      ),
    ];
  }

  const present = candidates.filter((c) => existsSync(join(root, c.file)));
  if (present.length === 0) {
    return [
      na(
        SENSOR,
        `none of the ${ecosystem} build files exist yet (${candidates.map((c) => c.file).join(", ")})`,
      ),
    ];
  }

  const findings: SensorFinding[] = [];
  for (const candidate of present) {
    const body = readFileSync(join(root, candidate.file), "utf8");
    const actual = body.match(new RegExp(candidate.pattern))?.[1];
    if (!actual) {
      findings.push(
        na(SENSOR, `${candidate.file} exists but declares no ${candidate.framework} version to compare`),
      );
      continue;
    }
    // The requested answer is a label ("spring-boot-4.x"); the build file is a version
    // ("3.4.4"). They agree when the label's version prefix matches, or when a human
    // has explicitly resolved the conflict.
    const decided = resolved || requested;
    if (!decided) {
      findings.push(fail(SENSOR, `assessment-8 records no framework choice to compare with ${candidate.file}=${actual}`));
      continue;
    }
    if (versionSatisfies(decided, actual)) {
      findings.push(
        pass(
          SENSOR,
          `${candidate.file} ${candidate.framework} ${actual} matches ${resolved ? `resolved ${resolved}` : `requested ${requested}`}`,
        ),
      );
      continue;
    }
    findings.push(
      fail(
        SENSOR,
        resolved
          ? `${candidate.file} has ${candidate.framework} ${actual}, but assessment-8 resolved to ${resolved}`
          : `${candidate.file} has ${candidate.framework} ${actual}, but the questionnaire asked for ${requested} — set backend_framework_resolved to record which one wins`,
      ),
    );
  }
  return findings;
}

/** Does the build's version satisfy a label like "spring-boot-3.x" or "spring-boot-3.4.4"? */
function versionSatisfies(label: string, actual: string): boolean {
  const wanted = label.match(/(\d+(?:\.\d+)*(?:\.x)?|x)$/)?.[1];
  if (!wanted) return false;
  if (wanted === "x") return true;
  const wantedParts = wanted.split(".");
  const actualParts = actual.split(".");
  return wantedParts.every((part, i) => part === "x" || part === actualParts[i]);
}
