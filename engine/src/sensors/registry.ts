import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";
import type { GateReport, SensorFinding } from "../types.ts";
import { archDir } from "../paths.ts";
import { now } from "../state.ts";
import { schemaDst } from "./schema-dst.ts";
import { dstStormCorrespondence } from "./dst-storm.ts";
import { hotspotClassified } from "./hotspot-classified.ts";
import { gherkinActorMatchesDst } from "./gherkin-actor.ts";
import { decisionNotRestated } from "./decision-not-restated.ts";
import { messagingMatchesContextMap } from "./messaging-context-map.ts";
import { docsEventsMatchStorm } from "./docs-events.ts";
import { actorViewSourcedFromDst } from "./actor-view-sourced.ts";
import { frameworkVersionMatrix } from "./framework-version-matrix.ts";
import { e2eStoryCoverage } from "./e2e-story.ts";
import { handoffEqualsContextMap } from "./handoff-context-map.ts";
import { filesExist } from "./files-exist.ts";
import { qualityReportWritten } from "./quality-report-written.ts";
import { storyMapCoverage } from "./story-map-coverage.ts";
import { glossaryOrigin } from "./glossary-origin.ts";
import { swimlaneIsStory } from "./swimlane-story.ts";
import { clContractDeclared, clContractSpecified } from "./cl-contract.ts";
import { ephemeralNotPersisted } from "./ephemeral-not-persisted.ts";
import { testStackMatrix } from "./test-stack-matrix.ts";
import { sourceFingerprint } from "./source-fingerprint.ts";
import { commandsImplemented } from "./commands-implemented.ts";
import { godAggregate } from "./god-aggregate.ts";

export type SensorRunner = (root?: string, phase?: string) => SensorFinding[];

const RUNNERS: Record<string, SensorRunner> = {
  "files-exist": filesExist,
  "schema-dst": schemaDst,
  "story-map-coverage": storyMapCoverage,
  "dst-storm-correspondence": dstStormCorrespondence,
  "hotspot-classified": hotspotClassified,
  "swimlane-is-story": swimlaneIsStory,
  "handoff-equals-context-map": handoffEqualsContextMap,
  "actor-view-sourced-from-dst": actorViewSourcedFromDst,
  "cl-contract-declared": clContractDeclared,
  "cl-contract-specified": clContractSpecified,
  "ephemeral-not-persisted": ephemeralNotPersisted,
  "test-stack-matrix": testStackMatrix,
  "gherkin-actor-matches-dst": gherkinActorMatchesDst,
  "e2e-story-coverage": e2eStoryCoverage,
  "decision-not-restated": decisionNotRestated,
  "messaging-matches-context-map": messagingMatchesContextMap,
  "docs-events-match-storm": docsEventsMatchStorm,
  "framework-version-matrix": frameworkVersionMatrix,
  "source-fingerprint": sourceFingerprint,
  "commands-implemented": commandsImplemented,
  "glossary-origin": glossaryOrigin,
  "quality-report-written": qualityReportWritten,
  "god-aggregate": godAggregate,
};

export function sensorIds(): string[] {
  return Object.keys(RUNNERS);
}

export function hasSensor(id: string): boolean {
  return id in RUNNERS;
}

export interface RunOptions {
  /** Phase id, for sensors that check a phase's own declarations. */
  phase?: string;
  /** Sensor ids whose findings must never block, whatever they report. */
  advisory?: string[];
  /**
   * Sensors an applicability condition excluded. They are reported as `na` rather
   * than dropped: "this check does not apply here" is a claim, and a claim belongs in
   * the quality report where someone can disagree with it.
   */
  skipped?: { id: string; reason: string }[];
}

export function runSensors(ids: string[], root?: string, options: RunOptions = {}): SensorFinding[] {
  const advisory = new Set(options.advisory ?? []);
  const findings: SensorFinding[] = [];
  for (const { id, reason } of options.skipped ?? []) {
    findings.push({ sensor: id, status: "na", blocking: false, message: `Not applicable: ${reason}` });
  }
  for (const id of ids) {
    const run = RUNNERS[id];
    if (!run) {
      findings.push({
        sensor: id,
        status: "warn",
        blocking: false,
        message: `Unknown sensor "${id}" — skipped`,
      });
      continue;
    }
    let produced: SensorFinding[];
    try {
      produced = run(root, options.phase);
    } catch (e) {
      produced = [
        {
          sensor: id,
          status: "fail",
          blocking: !advisory.has(id),
          message: `Sensor threw: ${e instanceof Error ? e.message : String(e)}`,
        },
      ];
    }
    for (const f of produced) {
      // n/a is never blocking, whatever the graph says about the sensor.
      const blocking = advisory.has(id) || f.status === "na" ? false : f.blocking;
      findings.push({ ...f, blocking });
    }
  }
  return findings;
}

export function blockingFails(findings: SensorFinding[]): SensorFinding[] {
  return findings.filter((f) => f.blocking && f.status === "fail");
}

/** Non-blocking findings worth repeating to the conductor: warnings and n/a. */
export function advisoryFindings(findings: SensorFinding[]): SensorFinding[] {
  return findings.filter((f) => !f.blocking && f.status !== "pass");
}

export function overallStatus(findings: SensorFinding[]): GateReport["status"] {
  if (findings.some((f) => f.blocking && f.status === "fail")) return "fail";
  if (findings.some((f) => f.status === "warn" || f.status === "fail")) return "warn";
  if (findings.length > 0 && findings.every((f) => f.status === "na")) return "na";
  return "pass";
}

export function writeQualityReport(
  phase: string,
  findings: SensorFinding[],
  root?: string,
): GateReport {
  const report: GateReport = {
    phase,
    timestamp: now(),
    status: overallStatus(findings),
    findings,
  };
  const dir = join(archDir(root), "quality-reports");
  mkdirSync(dir, { recursive: true });
  const body = stringify({
    quality_report: {
      phase,
      timestamp: report.timestamp,
      status: report.status,
      checks: findings.map((f) => ({
        name: f.sensor,
        category: f.status === "na" ? "not-applicable" : f.blocking ? "consistency" : "advisory",
        status: f.status,
        message: f.message,
        recommendation: f.blocking && f.status === "fail" ? "block-fix-required" : "proceed",
      })),
      next_action: report.status === "fail" ? "block-fix-required" : "proceed",
    },
  });
  writeFileSync(join(dir, `${phase}.yaml`), body, "utf8");
  return report;
}
