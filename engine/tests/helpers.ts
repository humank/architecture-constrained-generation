import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parse, stringify } from "yaml";
import { repoRoot } from "../src/paths.ts";
import type { SensorFinding } from "../src/types.ts";
import { lockAssessment } from "../src/assess.ts";

export const REPO = repoRoot();

/** Read-only trees a sensor may consult. Symlinked whole; never written by a test. */
const LINKED_TREES = [
  "artifact-schemas",
  ".claude",
  "frontend",
  "services",
  "shared-kernel",
  "k8s",
];

/**
 * Individual files, linked into real directories.
 *
 * `iac/` is symlinked nowhere on purpose: it is 346MB of CDK output, too big to copy,
 * and a test that wrote `iac/environments/staging/main.tf` through a symlink would be
 * writing into the actual repository. Linking the handful of files the sensors read
 * keeps the directory itself writable and local.
 */
const LINKED_FILES = [
  "iac/config/staging.ts",
  "iac/config/production.ts",
  "iac/config/types.ts",
  "iac/lib/messaging-stack.ts",
  "scripts/deploy.sh",
  "build.gradle.kts",
];

/**
 * A writable clone of the coffeeshop fixture.
 *
 * `.arch/` is copied so a test can mutate artifacts and let the engine write state;
 * everything else is symlinked so the real repo stays the fixture. Tests that write
 * must use this, or `bun test` would rewrite the project's own acg-state.yaml.
 */
export function scratchRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "acg-test-"));
  cpSync(join(REPO, ".arch"), join(root, ".arch"), { recursive: true });
  rmSync(join(root, ".arch", "acg-state.yaml"), { force: true });
  rmSync(join(root, ".arch", "audit"), { recursive: true, force: true });
  for (const entry of LINKED_TREES) {
    if (existsSync(join(REPO, entry))) symlinkSync(join(REPO, entry), join(root, entry));
  }
  for (const file of LINKED_FILES) {
    const from = join(REPO, file);
    if (!existsSync(from)) continue;
    mkdirSync(dirname(join(root, file)), { recursive: true });
    symlinkSync(from, join(root, file));
  }
  return root;
}

/**
 * A writable clone of one of the engine's own test domains.
 *
 * The engine's tests must not depend on the sample: a user who replaces `.arch/` with
 * their own domain should still see a green suite, and must be able to tell "the engine
 * is broken" from "my artifacts differ". So the artifact-level sensors are tested
 * against `tests/fixtures/domains/*`, and only `sample-coffeeshop.test.ts` looks at the
 * repo's own `.arch/`.
 *
 * `parcel-locker` — a second domain with a UI and a cloud, so generalisation is tested
 * rather than assumed.
 * `etl-batch` — no UI, no cloud, Python, Chinese domain language: the n/a paths and the
 * i18n fix.
 */
export function fixtureRoot(domain: "parcel-locker" | "etl-batch"): string {
  const source = join(import.meta.dir, "fixtures/domains", domain, ".arch");
  if (!existsSync(source)) throw new Error(`Unknown fixture domain: ${domain}`);
  const root = mkdtempSync(join(tmpdir(), `acg-${domain}-`));
  cpSync(source, join(root, ".arch"), { recursive: true });
  // Schemas are read-only inputs; the rest of the repo is deliberately absent so a
  // fixture cannot accidentally pass by reading the sample's code.
  symlinkSync(join(REPO, "artifact-schemas"), join(root, "artifact-schemas"));
  symlinkSync(join(REPO, ".claude"), join(root, ".claude"));
  return root;
}

/** Lock both questionnaires of a fixture so applicability conditions can be evaluated. */
export function lockFixture(root: string): void {
  for (const id of ["assessment-2", "assessment-8"]) {
    if (existsSync(join(root, ".arch", `${id}.yaml`))) lockAssessment(id, root);
  }
}

export function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

export function readArch<T = unknown>(root: string, rel: string): T {
  return parse(readFileSync(join(root, ".arch", rel), "utf8")) as T;
}

export function writeArch(root: string, rel: string, doc: unknown): void {
  writeFileSync(join(root, ".arch", rel), stringify(doc, { lineWidth: 120 }), "utf8");
}

export function editArchText(root: string, rel: string, edit: (text: string) => string): void {
  const path = join(root, ".arch", rel);
  writeFileSync(path, edit(readFileSync(path, "utf8")), "utf8");
}

export function fails(findings: SensorFinding[]): SensorFinding[] {
  return findings.filter((f) => f.status === "fail");
}
