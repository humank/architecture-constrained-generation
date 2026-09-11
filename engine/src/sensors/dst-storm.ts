import type { SensorFinding } from "../types.ts";
import { loadStories, loadStorm, repoRoot } from "../load.ts";
import { namesMatch, normalizeKey } from "../text.ts";

const NEEDS_EVENT = new Set(["state-change", "handoff"]);

export function dstStormCorrespondence(root = repoRoot()): SensorFinding[] {
  const stories = loadStories(root);
  const storm = loadStorm(root);
  const findings: SensorFinding[] = [];

  if (stories.length === 0) {
    return [
      {
        sensor: "dst-storm-correspondence",
        status: "fail",
        blocking: true,
        message: "No domain stories loaded",
      },
    ];
  }

  const events = storm.domain_events ?? [];
  const policies = storm.policies ?? [];
  const sourced = new Set<string>();
  for (const e of events) for (const id of e.sourced_from ?? []) sourced.add(String(id));
  for (const p of policies) for (const id of p.sourced_from ?? []) sourced.add(String(id));

  const stepsById = new Map<string, { actor: string; class: string; visible: boolean }>();
  for (const { story } of stories) {
    for (const step of story.steps ?? []) {
      stepsById.set(step.id, {
        actor: step.actor,
        class: step.class,
        visible: step.system_visible,
      });
      if (step.system_visible && NEEDS_EVENT.has(step.class) && !sourced.has(step.id)) {
        findings.push({
          sensor: "dst-storm-correspondence",
          status: "fail",
          blocking: true,
          message: `DST step ${step.id} (${step.actor} ${step.activity} ${step.work_object}) is system-visible ${step.class} but no event/policy sourced_from it`,
        });
      }
    }
  }

  for (const e of events) {
    const actor = e.trigger?.actor;
    const command = e.trigger?.command;
    if (!command || !actor) continue;
    const from = e.sourced_from ?? [];
    if (from.length === 0) {
      findings.push({
        sensor: "dst-storm-correspondence",
        status: "fail",
        blocking: true,
        message: `Event ${e.event} (command ${command}, actor ${actor}) has no sourced_from DST step`,
      });
      continue;
    }
    for (const id of from) {
      const step = stepsById.get(id);
      if (!step) {
        findings.push({
          sensor: "dst-storm-correspondence",
          status: "fail",
          blocking: true,
          message: `Event ${e.event} sourced_from ${id} but that step does not exist`,
        });
        continue;
      }
      if (normalizeKey(actor) === null) {
        findings.push({
          sensor: "dst-storm-correspondence",
          status: "fail",
          blocking: true,
          message: `Event ${e.event} has an actor that is only punctuation or whitespace ("${actor}") — it cannot be compared with a DST subject`,
        });
        continue;
      }
      if (!namesMatch(step.actor, actor) && normalizeKey(step.actor) !== normalizeKey("System")) {
        findings.push({
          sensor: "dst-storm-correspondence",
          status: "fail",
          blocking: true,
          message: `Event ${e.event} actor "${actor}" ≠ DST step ${id} actor "${step.actor}"`,
        });
      }
    }
  }

  if (findings.length === 0) {
    const needing = [...stepsById.values()].filter((s) => s.visible && NEEDS_EVENT.has(s.class)).length;
    const actorCommands = events.filter((e) => e.trigger?.command && e.trigger.actor).length;
    findings.push({
      sensor: "dst-storm-correspondence",
      status: needing === 0 && actorCommands === 0 ? "na" : "pass",
      blocking: true,
      message:
        needing === 0 && actorCommands === 0
          ? "no system-visible state-change or handoff step, and no actor-triggered command — there is no correspondence to check"
          : `${needing} visible state-change/handoff step(s) are sourced by an event, and ${actorCommands} actor-command(s) trace back to a DST sentence`,
    });
  }
  return findings;
}

