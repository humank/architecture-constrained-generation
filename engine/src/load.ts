import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse, parseAllDocuments } from "yaml";
import { repoRoot } from "./paths.ts";
export { repoRoot };

export function readYaml<T = unknown>(relOrAbs: string, root = repoRoot()): T {
  const abs = relOrAbs.startsWith("/") ? relOrAbs : join(root, relOrAbs);
  return parse(readFileSync(abs, "utf8")) as T;
}

export function readText(relOrAbs: string, root = repoRoot()): string {
  const abs = relOrAbs.startsWith("/") ? relOrAbs : join(root, relOrAbs);
  return readFileSync(abs, "utf8");
}

export function exists(rel: string, root = repoRoot()): boolean {
  return existsSync(join(root, rel));
}

export function listFiles(relDir: string, root = repoRoot(), ext?: string): string[] {
  const abs = join(root, relDir);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return [relDir];
  return readdirSync(abs)
    .filter((f) => (ext ? f.endsWith(ext) : true))
    .map((f) => join(relDir, f));
}

export interface StoryStep {
  id: string;
  sequence: number;
  actor: string;
  activity: string;
  work_object: string;
  medium?: string;
  class: string;
  system_visible: boolean;
  mutates?: string;
  from_actor?: string;
  to_actor?: string;
}

export interface DomainStory {
  id: string;
  name: string;
  purity: string;
  backbone: string;
  covers: string[];
  actors: string[];
  steps: StoryStep[];
}

export function loadStories(root = repoRoot()): { file: string; story: DomainStory }[] {
  const files = listFiles(".arch/01-discovery/domain-stories", root, ".yaml");
  const out: { file: string; story: DomainStory }[] = [];
  for (const file of files) {
    const raw = readFileSync(join(root, file), "utf8");
    let docs: unknown[];
    try {
      docs = parseAllDocuments(raw).map((d) => d.toJSON());
    } catch {
      continue; // schema-dst is the sensor that reports malformed story files
    }
    for (const raw of docs) {
      const doc = raw as {
        story?: DomainStory;
        stories?: DomainStory[];
        domain_story?: DomainStory;
      } | null;
      if (!doc) continue;
      if (doc.story) out.push({ file, story: doc.story });
      else if (doc.stories) {
        for (const s of doc.stories) out.push({ file, story: s });
      } else if (doc.domain_story) {
        out.push({ file, story: { ...doc.domain_story, id: doc.domain_story.id ?? "LEGACY" } });
      }
    }
  }
  return out;
}

export interface StormEvent {
  event: string;
  trigger?: { command?: string; actor?: string; policy?: string };
  sourced_from?: string[];
  aggregate?: string;
}

export interface StormPolicy {
  name: string;
  trigger?: string;
  sourced_from?: string[];
}

export interface EventStorm {
  domain_events?: StormEvent[];
  policies?: StormPolicy[];
  commands?: string[];
}

/** Missing or unreadable storm reads as empty: sensors report, they do not crash. */
export function loadStorm(root = repoRoot()): EventStorm {
  const rel = ".arch/01-discovery/event-storm.yaml";
  if (!existsSync(join(root, rel))) return {};
  try {
    const raw = readYaml<{ event_storm?: EventStorm } & EventStorm>(rel, root);
    return raw?.event_storm ?? raw ?? {};
  } catch {
    return {};
  }
}
