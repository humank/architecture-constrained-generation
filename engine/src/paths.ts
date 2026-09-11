import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function engineDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

/**
 * Find the project root.
 *
 * Ordered by how deliberate the marker is. `.arch/acg-project.yaml` is written by
 * `acg init`, so it is the strongest signal and it means the engine can run inside a
 * project that is not a clone of the ACG repo — which is the whole point of `init`.
 * The older markers stay so existing checkouts keep working.
 */
const MARKERS: { file: string; why: string }[] = [
  { file: ".arch/acg-project.yaml", why: "project descriptor" },
  { file: ".arch", why: "artifact directory" },
  { file: "artifact-schemas", why: "artifact schemas" },
];

export function repoRoot(cwd = process.cwd()): string {
  for (const marker of MARKERS) {
    let dir = resolve(cwd);
    for (let i = 0; i < 12; i++) {
      if (existsSync(join(dir, marker.file))) return dir;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  // Last resort: working inside a clone of the ACG repo itself. Deliberately scoped to
  // that case — from an unrelated directory this must throw, or a user who forgot to
  // run `init` would silently be operating on the toolkit's own artifacts.
  const toolkit = resolve(engineDir(), "../..");
  if (resolve(cwd).startsWith(toolkit) && existsSync(join(toolkit, "artifact-schemas"))) {
    return toolkit;
  }
  throw new Error(
    `Cannot find an ACG project from ${cwd}. Run \`bun engine/src/acg.ts init\` to start one.`,
  );
}

export function archDir(root = repoRoot()): string {
  return join(root, ".arch");
}

export function statePath(root = repoRoot()): string {
  return join(archDir(root), "acg-state.yaml");
}

export function auditDir(root = repoRoot()): string {
  return join(archDir(root), "audit");
}
