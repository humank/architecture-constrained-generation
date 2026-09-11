import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SensorFinding } from "../types.ts";
import { loadStorm, loadStories, repoRoot } from "../load.ts";
import { fail, na, pass, tryYaml, warn } from "./util.ts";
import { activeProfile } from "../profile.ts";

const SENSOR = "source-fingerprint";
const SKIP_DIRS = new Set([
  "build",
  "node_modules",
  "dist",
  ".gradle",
  "target",
  "cdk.out",
  "__pycache__",
  "venv",
  ".venv",
  "vendor",
]);

/**
 * Plan §2 Phase 8: "類名／角色跟 DST；事件型別跟 Storm；路由跟 Actor View；E2E 檔名跟 DS-xx。
 * 結束跑 source fingerprint."
 *
 * The design artifacts named every event, route, and journey. This checks the code
 * used those names and did not invent its own.
 */
export function sourceFingerprint(root = repoRoot()): SensorFinding[] {
  const findings: SensorFinding[] = [];
  const storm = loadStorm(root);
  const stories = loadStories(root).map((s) => s.story);
  const { profile } = activeProfile(root);
  const { roots, extensions, test_patterns, type_declaration } = profile.sources;

  if (roots.length === 0 || extensions.length === 0) {
    return [
      na(
        SENSOR,
        `profile "${profile.id}" declares no source roots or extensions, so the code was not fingerprinted`,
      ),
    ];
  }

  // 1. Every Storm domain event exists as a source type.
  const sources = collectSources(root, roots, extensions);
  const declared = new Set<string>();
  if (type_declaration) {
    for (const file of sources) {
      const body = readFileSync(join(root, file), "utf8");
      for (const m of body.matchAll(new RegExp(type_declaration, "g"))) {
        if (m[1]) declared.add(m[1]);
      }
    }
  }
  if (!type_declaration) {
    findings.push(
      na(SENSOR, `profile "${profile.id}" declares no type-declaration syntax — event types were not checked`),
    );
  } else if (declared.size === 0) {
    findings.push(warn(SENSOR, "No declared types found in the source roots — skipping event type fingerprint"));
  } else {
    for (const event of storm.domain_events ?? []) {
      if (!declared.has(event.event)) {
        findings.push(
          fail(SENSOR, `Event Storm event ${event.event} has no matching type in backend sources`),
        );
      }
    }
  }

  // 2. Every router path is a declared Actor View page — no invented screens.
  const fa = tryYaml<{
    frontend_architecture?: { actor_views?: { actor?: string; pages?: { path?: string }[] }[] };
  }>(SENSOR, ".arch/03-tactical/frontend-architecture.yaml", root);
  if (fa.finding) {
    // No frontend architecture and no router in the profile: this project has no
    // routes to fingerprint. Saying so is the honest answer; failing is not.
    findings.push(
      profile.frontend.router
        ? fa.finding
        : na(SENSOR, `no frontend architecture and profile "${profile.id}" declares no router — no routes to fingerprint`),
    );
  } else {
    const viewPaths = new Set(
      (fa.doc.frontend_architecture?.actor_views ?? [])
        .flatMap((v) => v.pages ?? [])
        .map((p) => trim(p.path ?? ""))
        .filter(Boolean),
    );
    const routerRel = profile.frontend.router;
    const routePattern = profile.frontend.route_pattern;
    if (!routerRel || !routePattern) {
      findings.push(na(SENSOR, `profile "${profile.id}" declares no router file — routes were not checked`));
    } else if (existsSync(join(root, routerRel))) {
      const router = readFileSync(join(root, routerRel), "utf8");
      const routed = new Set<string>();
      for (const m of router.matchAll(new RegExp(routePattern, "g"))) {
        const path = trim(m[1] ?? "");
        if (!path) continue;
        routed.add(path);
        if (!viewPaths.has(path)) {
          findings.push(fail(SENSOR, `${routerRel} routes "${m[1]}", which no Actor View declares`));
        }
      }
      // The other direction, moved here from Phase 3: the router is this phase's
      // output, so this is the first phase that can honestly ask the question.
      for (const declared of viewPaths) {
        if (!routed.has(declared)) {
          findings.push(
            fail(SENSOR, `Actor View declares the page "/${declared}", which ${routerRel} does not route`),
          );
        }
      }
    } else {
      findings.push(warn(SENSOR, `${routerRel} not found — skipping route fingerprint`));
    }
  }

  // 3. Every to-be story has an end-to-end test named after its ID.
  const testFiles = sources.filter((f) => test_patterns.some((pat) => new RegExp(pat).test(f)));
  const declaresTest = profile.sources.test_declaration
    ? new RegExp(profile.sources.test_declaration)
    : null;
  for (const story of stories) {
    if (story.purity === "as-is") continue;
    const named = testFiles.filter((f) => f.includes(story.id));
    if (named.length === 0) {
      findings.push(
        fail(SENSOR, `No end-to-end test file is named after ${story.id} (searched ${testFiles.length} test file(s))`),
      );
      continue;
    }
    if (!declaresTest) {
      findings.push(
        na(SENSOR, `profile "${profile.id}" cannot recognise a test declaration, so ${story.id}'s files were matched by name only`),
      );
      continue;
    }
    // A file named after a story that declares no test is a name, not a test. The
    // naming check alone is satisfied by exactly what a lazy generator produces.
    if (!named.some((f) => declaresTest.test(readFileSync(join(root, f), "utf8")))) {
      findings.push(
        fail(
          SENSOR,
          `${named.join(", ")} is named after ${story.id} but declares no test — the name was delivered and the test was not`,
        ),
      );
    }
    // What this cannot check: whether the test exercises the story. A declaration
    // asserting a loading spinner satisfies everything above. Said out loud so the gate
    // is not read as journey coverage — that judgement is the reviewer's.
  }

  if (findings.every((f) => f.status !== "fail")) {
    findings.push(
      pass(SENSOR, `${storm.domain_events?.length ?? 0} event type(s) and every route match the design; each to-be story has a test file that declares a test (profile ${profile.id}). Whether those tests exercise the stories is not checked here`),
    );
  }
  return findings;
}

function trim(p: string): string {
  return p.replace(/^\//, "").replace(/\/$/, "");
}

function collectSources(root: string, roots: string[], extensions: string[]): string[] {
  const acc: string[] = [];
  for (const top of roots) walk(root, top, extensions, acc);
  return acc;
}

function walk(root: string, rel: string, extensions: string[], acc: string[]): void {
  const abs = join(root, rel);
  if (!existsSync(abs)) return;
  if (!statSync(abs).isDirectory()) {
    if (extensions.some((e) => rel.endsWith(e))) acc.push(rel);
    return;
  }
  for (const name of readdirSync(abs)) {
    if (SKIP_DIRS.has(name) || name.startsWith(".")) continue;
    walk(root, join(rel, name), extensions, acc);
  }
}
