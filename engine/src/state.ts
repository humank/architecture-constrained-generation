import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parse, stringify } from "yaml";
import type { AcgState, PhaseState } from "./types.ts";
import { orderedPhases } from "./graph.ts";
import { repoRoot, statePath } from "./paths.ts";
import { assertEngineWrite } from "./guard.ts";
import { loadProjectName } from "./init.ts";

const LEGAL: Record<PhaseState, PhaseState[]> = {
  pending: ["in_progress", "skipped"],
  in_progress: ["awaiting_approval", "revising", "skipped"],
  awaiting_approval: ["completed", "revising", "skipped"],
  revising: ["in_progress", "awaiting_approval", "skipped"],
  completed: ["pending"],
  skipped: ["pending"],
};

/** The project name comes from the descriptor `acg init` wrote, never from a default. */
export function projectName(root?: string): string {
  try {
    return loadProjectName(root ?? repoRoot()) ?? "unnamed";
  } catch {
    return "unnamed";
  }
}

export function emptyState(project?: string, scope = "system"): AcgState {
  const phases: AcgState["phases"] = {};
  for (const p of orderedPhases(scope)) {
    phases[p.id] = { state: "pending" };
  }
  const first = orderedPhases(scope)[0]?.id ?? null;
  return {
    version: 1,
    project: project ?? projectName(),
    scope,
    imported_at: null,
    updated_at: now(),
    cursor: { phase: first, state: "pending" },
    phases,
    locks: {},
  };
}

export function loadState(root?: string): AcgState {
  const path = statePath(root);
  // No state yet: an empty board for *this* project, not for whatever the engine's own
  // working directory happens to be.
  if (!existsSync(path)) return emptyState(projectName(root));
  const parsed = parse(readFileSync(path, "utf8")) as AcgState;
  if (!parsed?.phases) throw new Error(`Invalid state file: ${path}`);
  if (!parsed.scope) parsed.scope = "system";
  return parsed;
}

export function saveState(state: AcgState, root?: string): void {
  const path = statePath(root);
  assertEngineWrite(path);
  state.updated_at = now();
  refreshCursor(state);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stringify(state, { lineWidth: 120 }), { encoding: "utf8" });
}

export function transition(state: AcgState, phaseId: string, to: PhaseState): void {
  const current = state.phases[phaseId];
  if (!current) throw new Error(`Phase not in state: ${phaseId}`);
  const from = current.state;
  if (from === to) return;
  const allowed = LEGAL[from];
  if (!allowed.includes(to)) {
    throw new Error(`Illegal transition ${phaseId}: ${from} → ${to}`);
  }
  current.state = to;
  if (to === "completed") current.completed_at = now();
  if (to === "pending") {
    current.completed_at = null;
    current.blockers = [];
    current.review = null;
    delete current.skip_reason;
  }
}

/** Switch the active scope, keeping the state of phases the new scope shares. */
export function setScope(state: AcgState, scope: string): AcgState {
  const kept = state.phases;
  const next = emptyState(state.project, scope);
  next.imported_at = state.imported_at ?? null;
  next.locks = state.locks;
  for (const id of Object.keys(next.phases)) {
    if (kept[id]) next.phases[id] = kept[id];
  }
  return next;
}

export function refreshCursor(state: AcgState): void {
  for (const p of orderedPhases(state.scope || "system")) {
    const rec = state.phases[p.id];
    if (!rec) continue;
    if (rec.state !== "completed" && rec.state !== "skipped") {
      state.cursor = { phase: p.id, state: rec.state };
      return;
    }
  }
  state.cursor = { phase: null, state: "done" };
}

export function now(): string {
  return new Date().toISOString();
}
