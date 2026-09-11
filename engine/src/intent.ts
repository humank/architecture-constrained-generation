import { existsSync } from "node:fs";
import { orderedPhases, phaseById } from "./graph.ts";
import { loadState } from "./state.ts";
import { repoRoot, statePath } from "./paths.ts";
import { allPaths } from "./applicability.ts";
import type { Intent } from "./types.ts";

/** Paths only the engine may write, whatever phase is running. */
const ENGINE_OWNED = [
  ".arch/acg-state.yaml",
  ".arch/audit/",
  ".arch/quality-reports/",
];

/** Every phase contributes to the glossary and may draft its own assessment answers. */
const ALWAYS_ALLOWED = [".arch/glossary.yaml", ".arch/assessment-"];

export function intentFor(phaseId: string, scope?: string, root = repoRoot()): Intent {
  const def = phaseById(phaseId);
  // Write isolation ignores applicability: a phase that does not produce `frontend/`
  // in this project still must not write another phase's artifacts.
  const minePaths = allPaths(def.produces);
  const contributed = allPaths(def.also_writes);
  const mine = new Set([...minePaths, ...contributed].map(norm));
  const others: string[] = [];
  for (const p of orderedPhases(scope ?? loadState(root).scope)) {
    if (p.id === phaseId) continue;
    for (const produced of allPaths(p.produces)) {
      const n = norm(produced);
      if (!mine.has(n)) others.push(n);
    }
  }
  return {
    phase: phaseId,
    allowed_writes: [...minePaths.map(norm), ...contributed.map(norm), ...ALWAYS_ALLOWED],
    forbidden_writes: [...ENGINE_OWNED, ...unique(others)],
  };
}

export interface WriteVerdict {
  allowed: boolean;
  reason: string;
  phase: string | null;
}

/**
 * Slice 9 intent isolation: a running phase may only write what it produces.
 * Paths that belong to no phase (docs/, engine/, README) stay writable — the
 * rule exists to stop Phase 3 from emitting Java, not to freeze the repo.
 */
export function checkWrite(path: string, root = repoRoot()): WriteVerdict {
  const target = norm(relativize(path, root));
  // No engine state means no workflow has started: nothing to isolate.
  if (!existsSync(statePath(root))) {
    return { allowed: true, reason: "no engine state on disk", phase: null };
  }
  const state = loadState(root);
  const phase = state.cursor.phase;

  for (const owned of ENGINE_OWNED) {
    if (under(target, owned)) {
      return {
        allowed: false,
        reason: `${owned} is engine-owned — use acg.ts (report/gate/jump/redo), never a file write`,
        phase,
      };
    }
  }
  for (const ok of ALWAYS_ALLOWED) {
    if (under(target, ok)) return { allowed: true, reason: "shared artifact", phase };
  }
  if (!phase) return { allowed: true, reason: "no active phase", phase };

  const intent = intentFor(phase, state.scope, root);
  if (intent.allowed_writes.some((a) => under(target, a))) {
    return { allowed: true, reason: `within ${phase} produces`, phase };
  }
  const stolen = intent.forbidden_writes.find((f) => under(target, f));
  if (stolen) {
    const owner = ownerOf(stolen, state.scope);
    return {
      allowed: false,
      reason: `${target} is produced by ${owner ?? "another phase"}, not by the active phase ${phase}`,
      phase,
    };
  }
  return { allowed: true, reason: "outside every phase's produces", phase };
}

function ownerOf(produced: string, scope?: string): string | null {
  for (const p of orderedPhases(scope)) {
    if (allPaths(p.produces).some((x) => norm(x) === produced)) return p.id;
  }
  return null;
}

function under(target: string, prefix: string): boolean {
  if (prefix.endsWith("/")) return target === prefix.slice(0, -1) || target.startsWith(prefix);
  if (prefix.endsWith("-")) return target.startsWith(prefix); // ".arch/assessment-" family
  return target === prefix || target.startsWith(`${prefix}/`);
}

function norm(p: string): string {
  return p.replace(/^\.\//, "");
}

export function relativize(path: string, root = repoRoot()): string {
  if (!path.startsWith("/")) return path;
  return path.startsWith(root) ? path.slice(root.length + 1) : path;
}

function unique(xs: string[]): string[] {
  return [...new Set(xs)];
}
