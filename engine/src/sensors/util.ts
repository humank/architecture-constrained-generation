import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse, parseAllDocuments } from "yaml";
import type { SensorFinding } from "../types.ts";

export function fail(sensor: string, message: string, blocking = true): SensorFinding {
  return { sensor, status: "fail", blocking, message };
}

export function pass(sensor: string, message: string, blocking = true): SensorFinding {
  return { sensor, status: "pass", blocking, message };
}

export function warn(sensor: string, message: string): SensorFinding {
  return { sensor, status: "warn", blocking: false, message };
}

/**
 * The sensor cannot evaluate this project. Always non-blocking, always reported —
 * never silently a pass. `reason` must say what was missing, not just "skipped".
 */
export function na(sensor: string, reason: string): SensorFinding {
  return { sensor, status: "na", blocking: false, message: reason };
}

/**
 * A sensor must never throw: a malformed or missing artifact is a finding, not a
 * crash, or one bad file would take the whole gate offline.
 */
export function tryYaml<T>(
  sensor: string,
  rel: string,
  root: string,
): { doc: T; finding?: undefined } | { doc?: undefined; finding: SensorFinding } {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    return { finding: fail(sensor, `Missing ${rel}`) };
  }
  try {
    return { doc: parse(readFileSync(abs, "utf8")) as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
    return { finding: fail(sensor, `${rel} is not valid YAML: ${msg}`) };
  }
}

/** Same contract as tryYaml, for artifacts that legitimately hold several documents. */
export function tryYamlAll<T>(
  sensor: string,
  rel: string,
  root: string,
): { docs: T[]; finding?: undefined } | { docs?: undefined; finding: SensorFinding } {
  const abs = join(root, rel);
  if (!existsSync(abs)) return { finding: fail(sensor, `Missing ${rel}`) };
  try {
    const docs = parseAllDocuments(readFileSync(abs, "utf8"))
      .map((d) => d.toJSON())
      .filter((d) => d != null) as T[];
    return { docs };
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
    return { finding: fail(sensor, `${rel} is not valid YAML: ${msg}`) };
  }
}

export function tryText(
  sensor: string,
  rel: string,
  root: string,
): { text: string; finding?: undefined } | { text?: undefined; finding: SensorFinding } {
  const abs = join(root, rel);
  if (!existsSync(abs)) return { finding: fail(sensor, `Missing ${rel}`) };
  return { text: readFileSync(abs, "utf8") };
}

/** Recursively collect files with an extension; returns repo-relative paths. */
export function walk(root: string, rel: string, ext: string, acc: string[] = []): string[] {
  const abs = join(root, rel);
  if (!existsSync(abs)) return acc;
  if (!statSync(abs).isDirectory()) {
    if (rel.endsWith(ext)) acc.push(rel);
    return acc;
  }
  for (const name of readdirSync(abs)) {
    walk(root, join(rel, name), ext, acc);
  }
  return acc;
}
