#!/usr/bin/env bun
import { markEngineWrite } from "./guard.ts";
markEngineWrite();

import {
  changeScope,
  doctor,
  gate,
  jump,
  next,
  redo,
  report,
  review,
  statusText,
} from "./orchestrate.ts";
import { importFromArch } from "./importer.ts";
import { lockAssessment, lockIntegrity, lockedAnswer } from "./assess.ts";
import { checkWrite } from "./intent.ts";
import { loadLessons } from "./lessons.ts";
import { readAudit } from "./audit.ts";
import { loadScopes } from "./graph.ts";
import { activeProfile, listProfiles, loadProfile } from "./profile.ts";
import { initProject } from "./init.ts";
import { sensorIds } from "./sensors/registry.ts";
import type { ReportResult } from "./types.ts";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function has(flag: string): boolean {
  return process.argv.includes(flag);
}

function required(flag: string, usage: string): string {
  const value = arg(flag);
  if (!value) throw new Error(usage);
  return value;
}

const USAGE = `acg-engine — deterministic runtime for Architecture Constrained Generation

  init [--dir <path>] [--project <name>] [--profile <id>] [--language <tag>]
                                               start a project here (no sample artifacts)
  init --upgrade                               refresh the copied schemas/skills/hooks
  status                                       six-state board for the active scope
  next [--json]                                the only legitimate answer to "what now?"
  gate --phase <id> [--dry-run]                run this phase's sensors; --dry-run writes no report
  report --phase <id> --result awaiting-approval|approved|rejected [--note text]
  review --phase <id> --verdict approved|rejected [--note text]
  import [--scope <name>]                      derive state from artifacts already on disk
  scope [--set <name>]                         list scopes, or switch the active one
  assess-lock --id assessment-2|assessment-8   lock answers and fingerprint them
  locked-answer --id <id> --key <key>          read one locked answer (infrastructure must not restate it)
  check-write --path <path>                    may the active phase write this path?
  jump --phase <id> [--reason text]            skip forward, recording what was skipped
  redo --phase <id> [--only]                   send a phase (and everything after it) back to [ ]
  doctor                                       graph/frontmatter/input/lock drift
  lessons                                      which sensor keeps rejecting which phase
  audit [--limit n]                            tail this month's audit shard
  sensors                                      registered sensor ids
  profile [--id <id>]                          the active tech profile, or one by id`;

const cmd = process.argv[2];

try {
  switch (cmd) {
    case "init": {
      const upgrade = has("--upgrade");
      const result = initProject({
        dir: arg("--dir"),
        name: arg("--project"),
        profile: arg("--profile"),
        language: arg("--language"),
        upgrade,
      });
      console.log(
        upgrade
          ? `ACG toolkit refreshed at ${result.root} (.arch/ untouched)`
          : `ACG project initialised at ${result.root}`,
      );
      for (const f of result.created) console.log(`  created    ${f}`);
      for (const f of result.refreshed) console.log(`  refreshed  ${f}`);
      for (const f of result.skipped) console.log(`  kept       ${f} (already present)`);
      console.log("\nnext:");
      for (const step of result.nextSteps) console.log(`  ${step}`);
      break;
    }

    case "status":
      console.log(statusText());
      break;

    case "next": {
      const d = next();
      if (has("--json")) {
        console.log(JSON.stringify(d, null, 2));
        break;
      }
      console.log(`${d.action}  phase=${d.phase ?? "-"}  scope=${d.scope ?? "-"}`);
      if (d.message) console.log(d.message);
      if (d.skill) console.log(`skill: ${d.skill}  step=${d.step ?? ""}`);
      for (const b of d.blockers ?? []) console.log(`  ! ${b.sensor}: ${b.message}`);
      for (const a of d.advisories ?? []) console.log(`  ~ ${a.sensor}: ${a.message}`);
      for (const l of d.lessons ?? []) console.log(`  ↺ ${l}`);
      if (d.reviewer) console.log("  independent review required before approval");
      break;
    }

    case "gate": {
      const phase = required("--phase", "gate requires --phase <id>");
      const dryRun = has("--dry-run");
      const findings = gate(phase, undefined, { dryRun });
      if (dryRun) console.log(`(dry run — no quality report written for ${phase})`);
      for (const f of findings) {
        const tag = f.status === "na" ? " (not applicable)" : f.blocking ? "" : " (advisory)";
        console.log(`[${f.status}]${tag} ${f.sensor}: ${f.message}`);
      }
      if (findings.some((f) => f.blocking && f.status === "fail")) process.exitCode = 2;
      break;
    }

    case "report": {
      const phase = required("--phase", "report requires --phase and --result");
      const result = required("--result", "report requires --result") as ReportResult;
      if (!["awaiting-approval", "approved", "rejected"].includes(result)) {
        throw new Error(`invalid --result ${result}`);
      }
      const out = report(phase, result, arg("--note"));
      console.log(out.message);
      for (const f of out.findings) {
        if (f.status === "pass") continue;
        const tag = f.status === "na" ? " (not applicable)" : f.blocking ? "" : " (advisory)";
        console.log(`  [${f.status}]${tag} ${f.sensor}: ${f.message}`);
      }
      if (!out.ok) process.exitCode = 2;
      break;
    }

    case "review": {
      const phase = required("--phase", "review requires --phase and --verdict");
      const verdict = required("--verdict", "review requires --verdict approved|rejected");
      if (verdict !== "approved" && verdict !== "rejected") {
        throw new Error(`invalid --verdict ${verdict}`);
      }
      console.log(review(phase, verdict, arg("--note")));
      break;
    }

    case "import": {
      const s = importFromArch(undefined, arg("--scope") ?? "system");
      console.log(statusText());
      console.log(`\nimported. cursor=${s.cursor.phase} (${s.cursor.state})`);
      break;
    }

    case "scope": {
      const set = arg("--set");
      if (set) {
        console.log(changeScope(set));
        console.log("");
        console.log(statusText());
        break;
      }
      for (const [name, spec] of Object.entries(loadScopes())) {
        console.log(`${name.padEnd(12)} ${spec.description ?? ""}`);
        console.log(`             ${spec.phases.join(", ")}`);
      }
      break;
    }

    case "assess-lock": {
      const id = required("--id", "assess-lock requires --id assessment-2");
      const doc = lockAssessment(id);
      console.log(`locked ${id} fingerprint=${doc.fingerprint}`);
      break;
    }

    case "locked-answer": {
      const id = required("--id", "locked-answer requires --id and --key");
      const key = required("--key", "locked-answer requires --key");
      console.log(lockedAnswer(id, key));
      break;
    }

    case "lock-check": {
      const id = required("--id", "lock-check requires --id");
      const integrity = lockIntegrity(id);
      console.log(`${integrity.ok ? "[pass]" : "[fail]"} ${integrity.message}`);
      if (!integrity.ok) process.exitCode = 2;
      break;
    }

    case "check-write": {
      const path = required("--path", "check-write requires --path <path>");
      const verdict = checkWrite(path);
      console.log(
        `${verdict.allowed ? "allow" : "deny"}  phase=${verdict.phase ?? "-"}  ${verdict.reason}`,
      );
      if (!verdict.allowed) process.exitCode = 2;
      break;
    }

    case "jump": {
      const phase = required("--phase", "jump requires --phase <id>");
      const skipped = jump(phase, arg("--reason"));
      console.log(
        skipped.length ? `skipped: ${skipped.join(", ")}` : "nothing to skip — target is already next",
      );
      console.log("");
      console.log(statusText());
      break;
    }

    case "redo": {
      const phase = required("--phase", "redo requires --phase <id>");
      const touched = redo(phase, undefined, !has("--only"));
      console.log(touched.length ? `reset to pending: ${touched.join(", ")}` : "nothing to reset");
      console.log("");
      console.log(statusText());
      break;
    }

    case "doctor": {
      const findings = doctor();
      for (const f of findings) {
        console.log(`${f.ok ? "[pass]" : "[fail]"} ${f.check.padEnd(30)} ${f.message}`);
      }
      const failed = findings.filter((f) => !f.ok).length;
      console.log(`\n${findings.length - failed}/${findings.length} checks pass`);
      if (failed) process.exitCode = 2;
      break;
    }

    case "lessons": {
      const lessons = loadLessons();
      if (lessons.length === 0) {
        console.log("no recorded sensor failures yet");
        break;
      }
      for (const l of lessons) {
        console.log(`${String(l.failures).padStart(3)}×  ${l.phase.padEnd(18)} ${l.sensor}`);
        console.log(`      last: ${l.last_message}`);
      }
      break;
    }

    case "audit": {
      const lines = readAudit(undefined, Number(arg("--limit") ?? 40));
      console.log(lines.length ? lines.join("\n") : "no audit entries this month");
      break;
    }

    case "sensors":
      for (const id of sensorIds()) console.log(id);
      break;

    case "profile": {
      const id = arg("--id");
      if (id) {
        console.log(JSON.stringify(loadProfile(id), null, 2));
        break;
      }
      const { profile, reason } = activeProfile();
      console.log(`active: ${profile.id}  (${reason})`);
      console.log(`  ${profile.description ?? ""}`);
      console.log(`  pinned values:  ${Object.keys(profile.pinned_values).join(", ") || "(none)"}`);
      console.log(`  router:         ${profile.frontend.router ?? "(none)"}`);
      console.log(`  source roots:   ${profile.sources.roots.join(", ") || "(none)"}`);
      console.log(`  messaging:      ${profile.messaging.file ?? "(none)"}`);
      console.log(`  cl check set:   ${profile.cl_check_set}`);
      console.log(`  build files:    ${Object.keys(profile.build_files).join(", ") || "(none)"}`);
      console.log(`\navailable: ${listProfiles().join(", ")}`);
      break;
    }

    case "help":
    case "--help":
    case undefined:
      console.log(USAGE);
      break;

    default:
      throw new Error(`Unknown command: ${cmd}\n\n${USAGE}`);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
}
