import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { orderedPhases } from "./graph.ts";
import { repoRoot } from "./paths.ts";
import { emptyState, projectName, saveState } from "./state.ts";
import {
  advisoryFindings,
  blockingFails,
  runSensors,
  writeQualityReport,
} from "./sensors/registry.ts";
import { isLocked, loadAssessment, lockIntegrity } from "./assess.ts";
import { applicablePaths, evaluate, planSensors } from "./applicability.ts";
import { audit } from "./audit.ts";
import type { AcgState, SensorFinding } from "./types.ts";

/** A produced artifact counts only if it is really there — an empty directory is not output. */
function produced(rel: string, root: string): boolean {
  const abs = join(root, rel);
  if (!existsSync(abs)) return false;
  if (statSync(abs).isDirectory()) return readdirSync(abs).length > 0;
  return statSync(abs).size > 0;
}

export function importFromArch(root = repoRoot(), scope = "system"): AcgState {
  const state = emptyState(projectName(root), scope);
  state.imported_at = new Date().toISOString();

  for (const id of ["assessment-2", "assessment-8"]) {
    const doc = loadAssessment(id, root);
    if (doc?.status === "locked") {
      state.locks[id] = {
        status: "locked",
        fingerprint: doc.fingerprint,
        locked_at: doc.locked_at,
      };
    } else if (doc) {
      state.locks[id] = { status: doc.status, fingerprint: doc.fingerprint ?? null };
    }
  }

  for (const phase of orderedPhases(scope)) {
    const shape = evaluate(phase.when, root);
    if (!shape.applicable) {
      state.phases[phase.id] = { state: "skipped", skip_reason: shape.reason };
      continue;
    }
    // Only what this project actually produces counts. A backend-only system never
    // writes `frontend/`, and that must not keep Phase 8 permanently unfinished.
    const expected = applicablePaths(phase.produces, root);
    const hasAll = expected.length > 0 && expected.every((p) => produced(p, root));
    if (!hasAll) {
      state.phases[phase.id] = { state: "pending" };
      continue;
    }

    const blockers: SensorFinding[] = [];
    if (phase.requires_lock) {
      if (!isLocked(phase.requires_lock, root)) {
        blockers.push({
          sensor: "assessment-lock",
          status: "fail",
          blocking: true,
          message: `${phase.id} produced artifacts but ${phase.requires_lock} is not locked — the decisions it depends on were never pinned`,
        });
      } else {
        const integrity = lockIntegrity(phase.requires_lock, root);
        if (!integrity.ok) {
          blockers.push({
            sensor: "assessment-lock",
            status: "fail",
            blocking: true,
            message: integrity.message,
          });
        }
      }
    }

    const plan = planSensors([...phase.sensors, ...phase.advisory_sensors], root);
    const findings = runSensors(plan.run, root, {
      phase: phase.id,
      advisory: phase.advisory_sensors.map((s) => s.id),
      skipped: plan.skipped,
    });
    writeQualityReport(phase.id, findings, root);
    blockers.push(...blockingFails(findings));

    if (blockers.length) {
      state.phases[phase.id] = {
        state: "revising",
        blockers,
        advisories: advisoryFindings(findings),
      };
    } else {
      state.phases[phase.id] = {
        state: "completed",
        completed_at: state.imported_at,
        blockers: [],
        advisories: advisoryFindings(findings),
        // An imported phase was never reviewed by this engine; reviewer phases say so.
        review: phase.reviewer ? null : undefined,
      };
    }
  }

  saveState(state, root);
  audit("STATE_IMPORTED", { scope, cursor: state.cursor }, root);
  return state;
}
