import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { PathRef, PhaseDef, PhaseGraph, SensorRef } from "./types.ts";
import { engineDir } from "./paths.ts";

export interface ScopeSpec {
  description?: string;
  phases: string[];
}

let cached: PhaseGraph | null = null;
let cachedScopes: Record<string, ScopeSpec> | null = null;

export function loadGraph(): PhaseGraph {
  if (cached) return cached;
  const raw = readFileSync(join(engineDir(), "../data/phase-graph.yaml"), "utf8");
  const parsed = parse(raw) as { version: number; scope: string; phases: RawPhase[] };
  if (!parsed?.phases?.length) throw new Error("phase-graph.yaml has no phases");
  cached = {
    version: parsed.version,
    scope: parsed.scope,
    phases: parsed.phases.map(normalizePhase),
  };
  return cached;
}

/**
 * The graph is written for people: a sensor is usually just an id, and a path just a
 * string. Conditions are the exception, so both forms are accepted and normalised once
 * here rather than checked at every call site.
 */
interface RawPhase
  extends Omit<PhaseDef, "consumes" | "produces" | "also_writes" | "sensors" | "advisory_sensors"> {
  consumes?: (string | PathRef)[];
  produces?: (string | PathRef)[];
  also_writes?: (string | PathRef)[];
  sensors?: (string | SensorRef)[];
  advisory_sensors?: (string | SensorRef)[];
}

function normalizePhase(raw: RawPhase): PhaseDef {
  return {
    ...raw,
    consumes: (raw.consumes ?? []).map(toPathRef),
    produces: (raw.produces ?? []).map(toPathRef),
    also_writes: (raw.also_writes ?? []).map(toPathRef),
    sensors: (raw.sensors ?? []).map(toSensorRef),
    advisory_sensors: (raw.advisory_sensors ?? []).map(toSensorRef),
  };
}

function toPathRef(entry: string | PathRef): PathRef {
  if (typeof entry === "string") return { path: entry };
  if (!entry?.path) throw new Error(`phase-graph.yaml: path entry without a "path": ${JSON.stringify(entry)}`);
  return entry;
}

function toSensorRef(entry: string | SensorRef): SensorRef {
  if (typeof entry === "string") return { id: entry };
  if (!entry?.id) throw new Error(`phase-graph.yaml: sensor entry without an "id": ${JSON.stringify(entry)}`);
  return entry;
}

export function loadScopes(): Record<string, ScopeSpec> {
  if (cachedScopes) return cachedScopes;
  cachedScopes = parse(
    readFileSync(join(engineDir(), "../data/scopes.yaml"), "utf8"),
  ) as Record<string, ScopeSpec>;
  return cachedScopes;
}

export function phaseById(id: string): PhaseDef {
  const found = loadGraph().phases.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown phase: ${id}`);
  return found;
}

export function orderedPhases(scope = "system"): PhaseDef[] {
  const all = [...loadGraph().phases].sort((a, b) => a.ordinal - b.ordinal);
  const spec = loadScopes()[scope];
  if (!spec || spec.phases.includes("*")) return all;
  const allow = new Set(spec.phases);
  return all.filter((p) => allow.has(p.id));
}
