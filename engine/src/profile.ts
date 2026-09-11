import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { engineDir, repoRoot } from "./paths.ts";
import { loadAssessment } from "./assess.ts";

export interface PinnedSource {
  file: string;
  /** Regex with one capture group. Omit for `kind: yaml`. */
  pattern?: string;
  kind?: "yaml";
  /** Dotted key paths to try, for `kind: yaml`. */
  keys?: string[];
}

export interface BuildFile {
  file: string;
  pattern: string;
  framework: string;
}

export interface Profile {
  id: string;
  extends?: string;
  description?: string;
  /** Locked answer key → the places infrastructure might restate it. */
  pinned_values: Record<string, PinnedSource[]>;
  derived_markers: string[];
  frontend: { router: string | null; route_pattern: string | null };
  sources: {
    roots: string[];
    extensions: string[];
    test_patterns: string[];
    type_declaration: string | null;
    test_declaration: string | null;
  };
  messaging: { file: string | null };
  build_files: Record<string, BuildFile[]>;
  cl_check_set: string;
  vocabulary: { technical: string[]; event_suffixes: string[] };
}

const cache = new Map<string, Profile>();

function profilePath(id: string): string {
  return join(engineDir(), "../data/profiles", `${id}.yaml`);
}

export function profileExists(id: string): boolean {
  return existsSync(profilePath(id));
}

export function listProfiles(): string[] {
  const dir = join(engineDir(), "../data/profiles");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""))
    .sort();
}

/**
 * Load a profile, merging it onto whatever it extends.
 *
 * A profile says *where the values live* — `iac/config/staging.ts`, `build.gradle.kts`,
 * `frontend/src/router.tsx`. The rule that a locked decision must not be restated as a
 * literal belongs to the engine; the list of places it might be restated does not.
 * Keeping them apart is what lets the same sensors work on Terraform, on GCP, or on a
 * project with no cloud at all.
 */
export function loadProfile(id: string, seen: string[] = []): Profile {
  const cached = cache.get(id);
  if (cached) return cached;
  if (seen.includes(id)) throw new Error(`Profile inheritance cycle: ${[...seen, id].join(" → ")}`);
  const path = profilePath(id);
  if (!existsSync(path)) {
    throw new Error(`Unknown profile "${id}". Available: ${listProfiles().join(", ")}`);
  }
  const raw = parse(readFileSync(path, "utf8")) as Partial<Profile>;
  const base = raw.extends ? loadProfile(raw.extends, [...seen, id]) : EMPTY;
  const merged: Profile = {
    id: raw.id ?? id,
    extends: raw.extends,
    description: raw.description ?? base.description,
    pinned_values: { ...base.pinned_values, ...(raw.pinned_values ?? {}) },
    derived_markers: raw.derived_markers ?? base.derived_markers,
    frontend: { ...base.frontend, ...(raw.frontend ?? {}) },
    sources: { ...base.sources, ...(raw.sources ?? {}) },
    messaging: { ...base.messaging, ...(raw.messaging ?? {}) },
    build_files: { ...base.build_files, ...(raw.build_files ?? {}) },
    cl_check_set: raw.cl_check_set ?? base.cl_check_set,
    vocabulary: { ...base.vocabulary, ...(raw.vocabulary ?? {}) },
  };
  cache.set(id, merged);
  return merged;
}

const EMPTY: Profile = {
  id: "empty",
  pinned_values: {},
  derived_markers: [],
  frontend: { router: null, route_pattern: null },
  sources: {
    roots: [],
    extensions: [],
    test_patterns: [],
    type_declaration: null,
    test_declaration: null,
  },
  messaging: { file: null },
  build_files: {},
  cl_check_set: "none",
  vocabulary: { technical: [], event_suffixes: [] },
};

/**
 * Which profile is this project on?
 *
 * The locked `profile` answer wins. Failing that it is inferred from the locked IaC
 * choice, so an existing project does not have to answer a new question to keep
 * working. Failing that, `generic` — which asserts nothing.
 */
export function resolveProfileId(root = repoRoot()): { id: string; reason: string } {
  const doc = loadAssessment("assessment-2", root);
  const answers = doc?.answers ?? {};
  const declared = answers.profile;
  if (typeof declared === "string" && declared) {
    if (!profileExists(declared)) {
      return { id: "generic", reason: `assessment-2.profile="${declared}" is not a known profile` };
    }
    return { id: declared, reason: `assessment-2.profile=${declared}` };
  }
  const iac = typeof answers.iac === "string" ? answers.iac : "";
  const target = typeof answers.deployment_target === "string" ? answers.deployment_target : "";
  if (target === "none" || target === "on-prem") {
    return { id: "none", reason: `deployment_target=${target}` };
  }
  if (/cdk/i.test(iac)) return { id: "aws-cdk-ts", reason: `inferred from iac=${iac}` };
  if (/terraform/i.test(iac)) {
    const gcp = /gke|gcp|cloud-run/i.test(target);
    return {
      id: gcp ? "gcp-terraform" : "terraform-aws",
      reason: `inferred from iac=${iac}, deployment_target=${target || "?"}`,
    };
  }
  return { id: "generic", reason: "no profile answer and no recognisable iac choice" };
}

export function activeProfile(root = repoRoot()): { profile: Profile; reason: string } {
  const { id, reason } = resolveProfileId(root);
  return { profile: loadProfile(id), reason };
}
