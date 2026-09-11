import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { SensorFinding } from "../types.ts";
import { repoRoot } from "../load.ts";
import { activeProfile, type PinnedSource } from "../profile.ts";
import { loadAssessment } from "../assess.ts";
import { fail, na, pass } from "./util.ts";

const SENSOR = "decision-not-restated";

interface Source {
  name: string;
  value: string | null;
  missing: boolean;
  /** Reads the locked answer at run time, so it cannot disagree. */
  derived?: boolean;
}

/**
 * Plan §2 Phase 5: "Region 只信 assessment-2 fingerprint."
 *
 * Generalised from the AWS-region check it started as. The rule is the engine's: a
 * decision that was locked must not be restated as a literal somewhere else, because
 * two copies of a decision are one decision and one lie waiting to happen. *Where* it
 * might be restated is the profile's business — `iac/config/staging.ts` on CDK,
 * `iac/environments/<env>/main.tf` on Terraform, nowhere at all with no cloud.
 *
 * A source that resolves the value through the engine at run time is reported as
 * derived and left out of the comparison. That is the fix, not a loophole: it is the
 * only spelling that cannot drift.
 */
export function decisionNotRestated(root = repoRoot()): SensorFinding[] {
  const { profile, reason } = activeProfile(root);
  const keys = Object.keys(profile.pinned_values);
  if (keys.length === 0) {
    return [
      na(SENSOR, `profile "${profile.id}" pins no values in infrastructure (${reason})`),
    ];
  }

  const doc = loadAssessment("assessment-2", root);
  const findings: SensorFinding[] = [];

  for (const key of keys) {
    const locked = doc?.answers?.[key];
    const sources: Source[] = [
      {
        name: `.arch/assessment-2.yaml (${key})`,
        value: locked == null || locked === "" ? null : String(locked),
        missing: doc == null,
      },
      ...profile.pinned_values[key]!.map((src) => readSource(root, src, profile.derived_markers)),
    ];

    const literal = sources.filter((s) => !s.missing && !s.derived && s.value);
    const unique = [...new Set(literal.map((s) => s.value))];
    const detail = sources
      .map((s) => `${s.name}=${s.missing ? "<missing>" : s.derived ? "<derived from lock>" : s.value}`)
      .join("; ");

    if (unique.length === 1) {
      findings.push(pass(SENSOR, `${key}: all sources agree on ${unique[0]} (${detail})`));
    } else if (unique.length === 0) {
      findings.push(fail(SENSOR, `${key} is not pinned anywhere (${detail})`));
    } else {
      findings.push(
        fail(SENSOR, `${key} mismatch — the lock and the infrastructure disagree (${detail})`),
      );
    }
  }
  return findings;
}

function readSource(root: string, src: PinnedSource, derivedMarkers: string[]): Source {
  const abs = join(root, src.file);
  if (!existsSync(abs)) return { name: src.file, value: null, missing: true };
  const body = readFileSync(abs, "utf8");

  if (src.kind === "yaml") {
    try {
      const doc = parse(body) as Record<string, unknown>;
      for (const path of src.keys ?? []) {
        const value = path.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], doc);
        if (typeof value === "string" && value) return { name: src.file, value, missing: false };
      }
    } catch {
      return { name: src.file, value: null, missing: false };
    }
    return { name: src.file, value: null, missing: false };
  }

  if (!src.pattern) return { name: src.file, value: null, missing: false };
  const m = body.match(new RegExp(src.pattern));
  const captured = m?.[1] ?? null;
  if (captured && derivedMarkers.some((marker) => new RegExp(marker).test(captured))) {
    return { name: src.file, value: null, missing: false, derived: true };
  }
  // A file that resolves the value through the engine anywhere near the assignment is
  // derived even if the capture itself looks literal.
  if (captured && derivedMarkers.some((marker) => new RegExp(marker).test(body))) {
    const literalElsewhere = new RegExp(src.pattern).exec(body);
    if (literalElsewhere && /\$|`/.test(literalElsewhere[0])) {
      return { name: src.file, value: null, missing: false, derived: true };
    }
  }
  return { name: src.file, value: captured, missing: false };
}
