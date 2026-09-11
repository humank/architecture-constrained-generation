import type { SensorFinding } from "../types.ts";
import { repoRoot } from "../load.ts";
import { fail, na, pass, tryYaml, walk } from "./util.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SENSOR = "test-stack-matrix";

/**
 * Test frameworks the sensor recognises, and which ecosystem each belongs to.
 * Only unit/component/e2e runners are constrained — contract, load and a11y tools
 * (Pact, k6, Lighthouse) are picked per need and the questionnaire never asks.
 */
const FRAMEWORKS: Record<string, string[]> = {
  jest: ["typescript", "javascript", "node"],
  vitest: ["typescript", "javascript", "node"],
  mocha: ["typescript", "javascript", "node"],
  jasmine: ["typescript", "javascript", "node"],
  pytest: ["python"],
  unittest: ["python"],
  junit: ["java", "kotlin"],
  testng: ["java", "kotlin"],
  spock: ["java", "kotlin", "groovy"],
  kotest: ["kotlin"],
  rspec: ["ruby"],
  minitest: ["ruby"],
  xunit: ["csharp"],
  nunit: ["csharp"],
  phpunit: ["php"],
  playwright: ["e2e"],
  cypress: ["e2e"],
  selenium: ["e2e"],
  puppeteer: ["e2e"],
  webdriverio: ["e2e"],
  testcafe: ["e2e"],
  enzyme: ["typescript", "javascript"],
};

/**
 * Plan §2 Phase 4: "Test strategy 的工具鏈必須來自 assessment-8，禁止寫 Jest 而實作是
 * JUnit."
 *
 * A test strategy naming a runner that neither the locked test stack nor the locked
 * backend language can run is not a plan — it is a paragraph. So every framework the
 * strategy names must be either in `test_stack` or valid for `backend_language`.
 */
export function testStackMatrix(root = repoRoot()): SensorFinding[] {
  const assess = tryYaml<{
    status?: string;
    answers?: { test_stack?: string; backend_language?: string; frontend_framework?: string };
  }>(SENSOR, ".arch/assessment-8.yaml", root);
  if (assess.finding) {
    return [na(SENSOR, "the technology stack has not been drafted yet — re-checked at 08-implementation")];
  }

  // Phase 4 runs before assessment-8 is due, so an unlocked stack is "not decided",
  // not "wrong". The same sensor runs again at 08, where the lock is required and this
  // branch cannot be reached.
  if (assess.doc.status !== "locked") {
    return [
      na(
        SENSOR,
        `assessment-8 is ${assess.doc.status ?? "unlocked"} — the test stack is not decided yet, so there is nothing to contradict. Re-checked at 08-implementation, where the lock is required`,
      ),
    ];
  }

  const stack = assess.doc.answers?.test_stack ?? "";
  const language = (assess.doc.answers?.backend_language ?? "").toLowerCase();
  if (!stack) return [fail(SENSOR, "assessment-8 is locked but declares no test_stack to check against")];

  const allowed = new Set<string>();
  for (const token of stack.toLowerCase().split(/[^a-z0-9]+/)) {
    if (token && token in FRAMEWORKS) allowed.add(token);
  }
  for (const [name, ecosystems] of Object.entries(FRAMEWORKS)) {
    if (ecosystems.some((eco) => language.startsWith(eco))) allowed.add(name);
  }
  if (allowed.size === 0) {
    return [fail(SENSOR, `Cannot resolve any test framework from test_stack "${stack}" and backend_language "${language}"`)];
  }

  const files = ["04-specification/test-strategy.yaml"]
    .map((rel) => `.arch/${rel}`)
    .concat(walk(root, ".arch/04-specification/features", ".feature"));

  const findings: SensorFinding[] = [];
  const seen = new Set<string>();
  for (const rel of files) {
    let body: string;
    try {
      body = readFileSync(join(root, rel), "utf8");
    } catch {
      if (rel.endsWith("test-strategy.yaml")) findings.push(fail(SENSOR, `Missing ${rel}`));
      continue;
    }
    for (const line of body.split("\n")) {
      for (const name of Object.keys(FRAMEWORKS)) {
        if (!new RegExp(`\\b${name}\\b`, "i").test(line)) continue;
        if (allowed.has(name)) continue;
        const key = `${rel}:${name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push(
          fail(
            SENSOR,
            `${rel} names ${name}, which is not in the locked test_stack "${stack}" and cannot run ${language} — "${line.trim()}"`,
          ),
        );
      }
    }
  }

  if (findings.length === 0) {
    return [pass(SENSOR, `Test tooling matches the locked stack (${[...allowed].sort().join(", ")})`)];
  }
  return findings;
}
