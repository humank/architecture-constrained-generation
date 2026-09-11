import type { SensorFinding } from "../types.ts";
import { loadStorm, readText, repoRoot } from "../load.ts";
import { fail, na, pass, tryYaml, walk } from "./util.ts";
import { namesMatch, normalizeKey, splitIdentifier } from "../text.ts";

const SENSOR = "gherkin-actor-matches-dst";

interface GlossaryTerm {
  term?: string;
  aliases?: string[];
}

/**
 * Plan §2 Phase 4: "As a cashier I want to place an order" must fail while DST says
 * Waiter.
 *
 * Both halves are derived, not tabled. The command phrase comes from the Event Storm
 * command name — `PlaceOrder` becomes "place(s) [an|the] order" — and the actor
 * synonyms come from the glossary's own aliases, so "cashier" resolves to Counter
 * Staff because the glossary says so.
 *
 * It under-reports on purpose: a scenario phrased "marks the order delivered" does not
 * match "deliver order" and is left alone. Missing a rephrasing is better than
 * arguing with every English sentence in the suite.
 *
 * Gherkin is localised, and the phrase is derived from an English command name, so a
 * feature in another dialect reports n/a rather than a vacuous pass. A command whose
 * name has no Latin letters cannot yield a phrase either — also n/a. Both are said out
 * loud: a check that quietly matched nothing is the failure mode this engine exists to
 * prevent.
 */
export function gherkinActorMatchesDst(root = repoRoot()): SensorFinding[] {
  const storm = loadStorm(root);
  const actorByCommand = new Map<string, string>();
  for (const e of storm.domain_events ?? []) {
    if (e.trigger?.command && e.trigger.actor) {
      actorByCommand.set(e.trigger.command, e.trigger.actor);
    }
  }
  if (actorByCommand.size === 0) {
    return [fail(SENSOR, "Event Storm declares no actor-triggered commands to check against")];
  }

  const aliases = loadAliases(root);
  const patterns: { command: string; re: RegExp }[] = [];
  const unreadable: string[] = [];
  for (const command of actorByCommand.keys()) {
    const re = commandPattern(command);
    if (re) patterns.push({ command, re });
    else unreadable.push(command);
  }
  const findings: SensorFinding[] = [];
  if (unreadable.length) {
    findings.push(
      na(
        SENSOR,
        `Cannot derive a step phrase for command(s) ${unreadable.join(", ")} — the name has no Latin words to turn into "actor verbs object"`,
      ),
    );
  }
  if (patterns.length === 0) {
    return findings.length ? findings : [na(SENSOR, "No command yielded a checkable step phrase")];
  }

  // Recursive: the journey layer lives in features/journeys/.
  const files = walk(root, ".arch/04-specification/features", ".feature");
  let checked = 0;

  for (const file of files) {
    const text = readText(file, root);
    if (!isEnglishDialect(text)) {
      findings.push(
        na(
          SENSOR,
          `${file} declares "# language: ${languageTag(text)}"; this sensor only reads English step keywords, so its actors were not checked`,
        ),
      );
      continue;
    }
    for (const line of text.split("\n")) {
      if (!/^\s*(When|And|Given)\b/i.test(line)) continue;
      for (const { command, re } of patterns) {
        const m = line.match(re);
        if (!m?.[1]) continue;
        const expected = actorByCommand.get(command)!;
        const actual = resolveActor(m[1], aliases);
        if (normalizeKey(actual) === null) continue; // captured only punctuation
        checked += 1;
        if (!namesMatch(actual, expected)) {
          findings.push(
            fail(
              SENSOR,
              `${file}: "${line.trim()}" treats ${command} as ${actual}, but Event Storm / DST actor is ${expected}`,
            ),
          );
        }
      }
    }
  }

  if (findings.every((f) => f.status !== "fail")) {
    if (checked === 0) {
      findings.push(
        na(SENSOR, "No feature step matched a derived command phrase — nothing was actually compared"),
      );
    } else {
      findings.push(pass(SENSOR, `${checked} command step(s) use the same actors as Event Storm / DST`));
    }
  }
  return findings;
}

/** The `# language:` header, if the file declares one. */
function languageTag(text: string): string {
  return text.match(/^\s*#\s*language:\s*([\w-]+)/im)?.[1] ?? "en";
}

/** True only for dialects whose When/And/Given keywords this sensor recognises. */
function isEnglishDialect(text: string): boolean {
  const tag = languageTag(text).toLowerCase();
  return tag === "en" || tag.startsWith("en-");
}

/**
 * `CompleteCoffeePreparation` → /when the (.+?) completes? (?:a |an |the )?coffee
 * preparation/. The first camelCase word is the verb; the rest is the work object.
 */
function commandPattern(command: string): RegExp | null {
  const words = splitIdentifier(command);
  if (words.length === 0) return null; // no Latin words: no English phrase to derive
  const verb = words[0]!;
  const object = words.slice(1).join(" ");
  const verbForms = `${escape(verb)}(?:s|es)?`;
  const objectPart = object ? `\\s+(?:a |an |the )?${escape(object)}\\b` : "";
  return new RegExp(`\\b(?:when|and|given)\\s+(?:the|a|an)?\\s*(.+?)\\s+${verbForms}${objectPart}`, "i");
}

/** alias (normalized) → canonical glossary term. */
function loadAliases(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const loaded = tryYaml<{ glossary?: { terms?: GlossaryTerm[] }; terms?: GlossaryTerm[] }>(
    SENSOR,
    ".arch/glossary.yaml",
    root,
  );
  if (loaded.finding) return out;
  for (const t of loaded.doc.glossary?.terms ?? loaded.doc.terms ?? []) {
    if (!t.term) continue;
    for (const alias of t.aliases ?? []) {
      const key = normalizeKey(alias);
      if (key) out.set(key, t.term);
    }
  }
  return out;
}

function resolveActor(raw: string, aliases: Map<string, string>): string {
  const trimmed = raw.replace(/^(a|an|the)\s+/i, "").trim();
  return aliases.get(normalizeKey(trimmed) ?? "\u0000") ?? trimmed.replace(/\s+/g, " ");
}




function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
