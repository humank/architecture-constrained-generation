import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SensorFinding } from "../types.ts";
import { listFiles, repoRoot } from "../load.ts";
import { activeProfile } from "../profile.ts";
import { fail, na, pass, tryYamlAll, walk } from "./util.ts";

const SENSOR = "commands-implemented";

interface Aggregate {
  name?: string;
  bounded_context?: string;
  commands?: (string | { name?: string })[];
}

/**
 * Every command an aggregate declares must exist in the code.
 *
 * Found when an independent reviewer noticed that none of four designed commands had
 * been written, while `source-fingerprint` reported the event types, the routes and the
 * story E2E names as matching. The deterministic layer was checking that *names* lined
 * up — which is precisely what a generator produces when it produces nothing else.
 *
 * It asks whether the command name appears in the source outside comments. That cannot
 * tell a real handler from a passing reference, but it is decisive for the case that
 * actually occurs — the command was never written. Comments are stripped because the
 * first version of this sensor was satisfied by the sentence "Created by
 * AssignReviewers and nothing else" in a doc comment, which is precisely the kind of
 * name-without-substance it exists to refuse.
 */
export function commandsImplemented(root = repoRoot()): SensorFinding[] {
  const { profile } = activeProfile(root);
  const { roots, extensions } = profile.sources;
  if (roots.length === 0 || extensions.length === 0) {
    return [
      na(SENSOR, `profile "${profile.id}" declares no source roots, so commands were not looked for`),
    ];
  }

  const declared: { command: string; aggregate: string }[] = [];
  for (const file of listFiles(".arch/03-tactical/aggregates", root, ".yaml")) {
    const loaded = tryYamlAll<{ aggregate?: Aggregate }>(SENSOR, file, root);
    if (loaded.finding) return [loaded.finding];
    for (const doc of loaded.docs) {
      const agg = doc.aggregate;
      if (!agg?.name) continue;
      for (const raw of agg.commands ?? []) {
        const command = typeof raw === "string" ? raw : raw?.name;
        if (command) declared.push({ command, aggregate: agg.name });
      }
    }
  }
  if (declared.length === 0) {
    return [na(SENSOR, "no aggregate declares a command, so there is nothing to look for")];
  }

  const files: string[] = [];
  for (const top of roots) for (const ext of extensions) walk(root, top, ext, files);
  const source = [...new Set(files)]
    .map((f) => stripComments(readFileSync(join(root, f), "utf8")))
    .join("\n");
  if (!source.trim()) {
    return [
      fail(
        SENSOR,
        `no source found under ${roots.join(", ")}, so none of the ${declared.length} declared command(s) can be implemented`,
      ),
    ];
  }

  const findings: SensorFinding[] = [];
  for (const { command, aggregate } of declared) {
    if (!new RegExp(`\\b${escape(command)}\\b`).test(source)) {
      findings.push(
        fail(SENSOR, `${aggregate} declares the command ${command}, which appears nowhere in the source`),
      );
    }
  }
  if (findings.length === 0) {
    return [pass(SENSOR, `${declared.length} declared command(s) appear in the source`)];
  }
  return findings;
}

/**
 * Remove block comments, `//` and `#` line comments. Crude on purpose — it only has to
 * stop prose from counting as an implementation, and over-removing a line of real code
 * would at worst make this sensor complain about a command that is implemented, which
 * a human reads and dismisses in seconds.
 */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").replace(/#.*$/, ""))
    .join("\n");
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
