export type PhaseState =
  | "pending"
  | "in_progress"
  | "awaiting_approval"
  | "revising"
  | "completed"
  | "skipped";

export const STATE_MARK: Record<PhaseState, string> = {
  pending: "[ ]",
  in_progress: "[-]",
  awaiting_approval: "[?]",
  revising: "[R]",
  completed: "[x]",
  skipped: "[S]",
};

export type ReportResult = "awaiting-approval" | "approved" | "rejected";

/**
 * `na` means the sensor could not evaluate this project — no frontend to check, an
 * unlocked assessment, a Gherkin dialect it cannot read. It is always non-blocking and
 * it is always reported, because "this check does not apply here" is a claim someone
 * should be able to audit. A sensor that cannot evaluate must never return `pass`.
 */
export interface SensorFinding {
  sensor: string;
  status: "pass" | "warn" | "fail" | "na";
  blocking: boolean;
  message: string;
}

/**
 * A condition on a locked questionnaire answer.
 *
 * This is the whole applicability language, and it is deliberately tiny. Applicability
 * must be *derived* from a fingerprinted, tamper-detected answer — never from editing
 * the phase graph — because a graph the user may edit is a graph where any red sensor
 * gets deleted, and then the engine no longer decides anything.
 *
 * An unlocked assessment leaves the condition **applicable**: a check is never
 * silently switched off by a missing answer. Turning one off takes a locked decision,
 * and changing that decision later cascades through `redo`.
 */
export interface Condition {
  assessment: string;
  key: string;
  equals?: string;
  not?: string;
  in?: string[];
  not_in?: string[];
  present?: boolean;
}

export interface SensorRef {
  id: string;
  when?: Condition;
}

export interface PathRef {
  path: string;
  when?: Condition;
}

export interface PhaseDef {
  id: string;
  ordinal: number;
  title: string;
  skill: string;
  step: string;
  gate: string;
  /**
   * When present and false, this phase does not exist for this project — a UX design
   * phase in an API-only system, for instance. The engine marks it `[S]` with the
   * reason, rather than asking the conductor to invent artifacts nobody wants.
   */
  when?: Condition;
  requires_lock?: string;
  consumes: PathRef[];
  produces: PathRef[];
  /**
   * Paths this phase may update but does not own.
   *
   * Ownership and contribution are different things. Phase 0 owns the story map, but
   * 01a is what fills in each `US-* → DS-xx` link, and the glossary grows in every
   * phase. Write isolation without this concept either forbids the contribution (and
   * the field stays inert forever) or gives up on ownership entirely.
   */
  also_writes: PathRef[];
  sensors: SensorRef[];
  /** Non-blocking sensors: reported, never gate completion. */
  advisory_sensors: SensorRef[];
  /** When true, the conductor must run an independent reviewer subagent before approval. */
  reviewer?: boolean;
}

export interface PhaseGraph {
  version: number;
  scope: string;
  phases: PhaseDef[];
}

export interface PhaseRecord {
  state: PhaseState;
  completed_at?: string | null;
  blockers?: SensorFinding[];
  advisories?: SensorFinding[];
  /** Set by `jump`; explains why a phase was skipped. */
  skip_reason?: string;
  /** Independent reviewer verdict, required before approval on reviewer phases. */
  review?: { verdict: "approved" | "rejected"; note?: string; at: string } | null;
  /**
   * The decision lock this phase was approved under.
   *
   * `lockIntegrity` catches answers edited *without* re-locking. It cannot catch the
   * other direction: approve a phase, then legitimately re-lock the questionnaire with
   * different answers, and the phase stays `[x]` under a decision it never saw. The
   * plan has always said a changed lock forces a redo from the first phase that
   * consumed it; this is what makes that enforceable rather than aspirational.
   */
  approved_with_lock?: { id: string; fingerprint: string } | null;
}

export interface AssessmentLock {
  status: "draft" | "awaiting" | "locked";
  fingerprint?: string | null;
  locked_at?: string | null;
}

export interface AcgState {
  version: number;
  project: string;
  scope: string;
  imported_at?: string | null;
  updated_at: string;
  cursor: { phase: string | null; state: PhaseState | "done" };
  phases: Record<string, PhaseRecord>;
  locks: Record<string, AssessmentLock>;
}

/** Write scope handed to the conductor for the current phase (slice 9: intent isolation). */
export interface Intent {
  phase: string;
  allowed_writes: string[];
  forbidden_writes: string[];
}

export interface Directive {
  action: "run-phase" | "blocked" | "await-gate" | "ask-assessment" | "await-review" | "done";
  phase: string | null;
  scope?: string;
  skill?: string;
  step?: string;
  must_read?: string[];
  must_write?: string[];
  blockers?: SensorFinding[];
  advisories?: SensorFinding[];
  intent?: Intent;
  reviewer?: boolean;
  lessons?: string[];
  message?: string;
}

export interface GateReport {
  phase: string;
  timestamp: string;
  status: "pass" | "warn" | "fail" | "na";
  findings: SensorFinding[];
}

/** One accumulated sensor failure, used by the learning loop. */
export interface Lesson {
  sensor: string;
  phase: string;
  failures: number;
  first_seen: string;
  last_seen: string;
  last_message: string;
}
