import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { archDir, repoRoot } from "./paths.ts";
import { loadState, now, saveState } from "./state.ts";
import { audit } from "./audit.ts";

export interface AssessmentDoc {
  id: string;
  status: "draft" | "awaiting" | "locked";
  generated_at?: string;
  locked_at?: string | null;
  fingerprint?: string | null;
  source_markdown?: string;
  answers: Record<string, unknown>;
}

/** Answers that must exist before a lock is meaningful, per assessment. */
const REQUIRED: Record<string, string[]> = {
  // Plan §2: the fingerprint must bite region, style, communication, database and IaC.
  // `ui_kind` joins them because it decides whether whole phases and sensors apply.
  "assessment-2": [
    "architecture_style",
    "region",
    "deployment_target",
    "communication",
    "database",
    "iac",
    "ui_kind",
  ],
  "assessment-8": [
    "backend_language",
    "backend_ecosystem",
    "backend_framework_requested",
    "orm",
    "frontend_framework",
    "test_stack",
    "iac",
  ],
};

export function fingerprintAnswers(answers: Record<string, unknown>): string {
  return createHash("sha256").update(canonical(answers)).digest("hex");
}

/** Stable serialization: key order must not change the fingerprint. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function assessmentPath(id: string, root: string): string {
  return join(archDir(root), `${id}.yaml`);
}

export function loadAssessment(id: string, root = repoRoot()): AssessmentDoc | null {
  const path = assessmentPath(id, root);
  if (!existsSync(path)) return null;
  return parse(readFileSync(path, "utf8")) as AssessmentDoc;
}

export function lockAssessment(id: string, root = repoRoot()): AssessmentDoc {
  const doc = loadAssessment(id, root);
  if (!doc) throw new Error(`Missing ${id}.yaml — cannot lock`);
  const required = REQUIRED[id] ?? [];
  const missing = required.filter((k) => doc.answers?.[k] == null || doc.answers[k] === "");
  if (missing.length) throw new Error(`Cannot lock ${id}: missing ${missing.join(", ")}`);
  doc.status = "locked";
  doc.locked_at = now();
  doc.fingerprint = fingerprintAnswers(doc.answers);
  writeFileSync(assessmentPath(id, root), stringify(doc, { lineWidth: 100 }), "utf8");
  const state = loadState(root);
  state.locks[id] = {
    status: "locked",
    fingerprint: doc.fingerprint,
    locked_at: doc.locked_at,
  };
  saveState(state, root);
  audit("ASSESSMENT_LOCKED", { id, fingerprint: doc.fingerprint }, root);
  return doc;
}

export function isLocked(id: string, root = repoRoot()): boolean {
  const doc = loadAssessment(id, root);
  return doc?.status === "locked";
}

/**
 * A locked assessment whose fingerprint no longer matches its answers was edited
 * behind the engine's back. `doctor` and `next` treat that as tampering, not drift.
 */
export function lockIntegrity(
  id: string,
  root = repoRoot(),
): { ok: boolean; message: string } {
  const doc = loadAssessment(id, root);
  if (!doc) return { ok: false, message: `${id}.yaml is missing` };
  if (doc.status !== "locked") return { ok: false, message: `${id} is ${doc.status}, not locked` };
  const actual = fingerprintAnswers(doc.answers);
  if (doc.fingerprint !== actual) {
    return {
      ok: false,
      message: `${id} fingerprint ${short(doc.fingerprint)} ≠ answers ${short(actual)} — answers changed after lock; run redo from the first phase that consumed them`,
    };
  }
  return { ok: true, message: `${id} locked and intact (${short(actual)})` };
}

/** Single source of truth for values the infrastructure must not restate as literals. */
export function lockedAnswer(id: string, key: string, root = repoRoot()): string {
  const doc = loadAssessment(id, root);
  if (!doc) throw new Error(`Missing ${id}.yaml`);
  if (doc.status !== "locked") throw new Error(`${id} is not locked — refusing to hand out ${key}`);
  const integrity = lockIntegrity(id, root);
  if (!integrity.ok) throw new Error(integrity.message);
  const value = doc.answers?.[key];
  if (value == null || value === "") throw new Error(`${id} has no answer for ${key}`);
  return String(value);
}

function short(fp?: string | null): string {
  return fp ? `${fp.slice(0, 12)}…` : "<none>";
}
