import type { SensorFinding } from "../types.ts";
import { loadStories, loadStorm, repoRoot } from "../load.ts";
import { fail, pass, tryYaml, warn } from "./util.ts";
import { normalizeKey } from "../text.ts";
import { activeProfile } from "../profile.ts";

const SENSOR = "glossary-origin";

/**
 * Which words count as infrastructure rather than domain language is a *project*
 * question, not an engine constant. For a team whose domain is infrastructure — a
 * queueing product, a platform team — "Outbox" and "DLQ" are the ubiquitous language,
 * and an engine that forced them to `origin: technical` would be corrupting the very
 * glossary it exists to protect. So the list comes from the profile, and a project can
 * override it in `.arch/glossary-policy.yaml`.
 */
function technicalVocabulary(root: string): { words: string[]; source: string } {
  const policy = tryYaml<{ glossary_policy?: { technical_vocabulary?: string[] } }>(
    SENSOR,
    ".arch/glossary-policy.yaml",
    root,
  );
  const declared = policy.doc?.glossary_policy?.technical_vocabulary;
  if (declared) return { words: declared, source: ".arch/glossary-policy.yaml" };
  const { profile } = activeProfile(root);
  return { words: profile.vocabulary.technical, source: `profile ${profile.id}` };
}

const ALLOWED_ORIGINS = ["dst", "storm", "event-model", "strategic", "tactical", "technical"];

interface Term {
  term?: string;
  definition?: string;
  origin?: string;
  first_discovered_in?: string;
  aliases?: string[];
  bounded_context?: string;
}

/**
 * Plan §0 lie: "Glossary 污染 — 領域詞混進 Outbox、DLQ".
 *
 * The glossary is the Ubiquitous Language, so a term is either domain language with
 * a discovery origin, or it is infrastructure and must say so with
 * `origin: technical`. Terms the stories discovered must actually be in it.
 */
export function glossaryOrigin(root = repoRoot()): SensorFinding[] {
  const loaded = tryYaml<{ glossary?: { terms?: Term[] }; terms?: Term[] }>(
    SENSOR,
    ".arch/glossary.yaml",
    root,
  );
  if (loaded.finding) return [loaded.finding];
  const terms = loaded.doc.glossary?.terms ?? loaded.doc.terms ?? [];
  if (terms.length === 0) return [fail(SENSOR, "glossary.yaml declares no terms")];

  const { words: technicalWords, source: vocabSource } = technicalVocabulary(root);
  const findings: SensorFinding[] = [];
  const known = new Set<string>();
  for (const t of terms) {
    if (!t.term) continue;
    known.add(norm(t.term));
    for (const a of t.aliases ?? []) known.add(norm(a));

    const origin = (t.origin ?? t.first_discovered_in ?? "").toLowerCase().trim();
    const technical = technicalWords.some(
      (k) => norm(t.term!).includes(norm(k)) || (t.aliases ?? []).some((a) => norm(a).includes(norm(k))),
    );

    if (technical && origin !== "technical") {
      findings.push(
        fail(
          SENSOR,
          `"${t.term}" is infrastructure vocabulary per ${vocabSource} — mark it origin: technical, or override the list in .arch/glossary-policy.yaml if it really is your domain language`,
        ),
      );
      continue;
    }
    if (!origin) {
      findings.push(fail(SENSOR, `"${t.term}" has no origin — every term must say where it was discovered`));
      continue;
    }
    if (!ALLOWED_ORIGINS.includes(origin)) {
      findings.push(
        fail(SENSOR, `"${t.term}" has origin "${origin}"; allowed: ${ALLOWED_ORIGINS.join(", ")}`),
      );
    }
  }

  for (const { story } of loadStories(root)) {
    for (const term of (story as { discovered_terms?: string[] }).discovered_terms ?? []) {
      if (!known.has(norm(term))) {
        findings.push(fail(SENSOR, `${story.id} discovered "${term}", which is missing from the glossary`));
      }
    }
  }

  const storm = loadStorm(root);
  for (const e of storm.domain_events ?? []) {
    if (e.aggregate && !known.has(norm(e.aggregate))) {
      findings.push(warn(SENSOR, `Storm aggregate "${e.aggregate}" is not a glossary term`));
    }
  }

  if (findings.every((f) => f.status !== "fail")) {
    findings.push(pass(SENSOR, `${terms.length} glossary term(s) declare an origin`));
  }
  return findings;
}

/** "SalesReport", "Sales Report", "sales_report" and "銷售 報表" each fold to one key. */
function norm(s: string): string {
  return normalizeKey(s) ?? "";
}
