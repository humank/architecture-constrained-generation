import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { initProject } from "../src/init.ts";
import { loadGraph } from "../src/graph.ts";
import { lockAssessment } from "../src/assess.ts";
import { gate, next, report, review, statusText } from "../src/orchestrate.ts";
import { loadState } from "../src/state.ts";
import type { Directive } from "../src/types.ts";

/**
 * The conductor loop, driven end to end.
 *
 * Every other suite tests a part: the state machine, one sensor, one directive. None of
 * them ever drove a phase from `[ ]` to `[x]`, and a live walkthrough found seven bugs
 * that unit tests had all missed — a sensor blocking Phase 4 on a Phase 8
 * questionnaire, a glossary nothing was told to write, a reverse link write isolation
 * forbade, JS-shaped test-file names, a route check failing on a project with no
 * routes, and `doctor` demanding inputs for phases that had not run or were skipped.
 *
 * So this test *is* the walkthrough: a CLI-shaped, self-hosted, Python project taken
 * from `init` to `done`. It is deliberately a different shape from the sample, because
 * the shape is what the bugs hid in.
 */

const dirs: string[] = [];
function project(): string {
  const dir = mkdtempSync(join(tmpdir(), "acg-loop-"));
  dirs.push(dir);
  initProject({ dir, name: "link-shortener", profile: "none" });
  return dir;
}
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function put(root: string, rel: string, body: string): void {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body, "utf8");
}

/** Everything a phase must write, keyed by phase. Minimal but sensor-clean. */
const ARTIFACTS: Record<string, (root: string) => void> = {
  "00-requirements": (r) => {
    put(r, ".arch/00-requirements/impact-map.yaml", "impact_map:\n  goal: short links\n");
    put(
      r,
      ".arch/00-requirements/story-map.yaml",
      `story_map:
  backbone:
    - activity: "Publish Link"
      steps:
        - step: "Create Link"
          stories:
            - id: US-01
              story: "As a Marketer, I want a short code for a campaign URL"
              priority: MVP
              covered_by: pending_story
`,
    );
    put(r, ".arch/00-requirements/parsed-requirements.yaml", "parsed_requirements:\n  actors: [Marketer, Visitor, System]\n");
  },

  "01a-dst": (r) => {
    put(
      r,
      ".arch/01-discovery/domain-stories/01-publish.yaml",
      `story:
  id: DS-01
  name: Publish a Link
  purity: to-be-only
  purity_reason: New capability.
  backbone: Publish Link
  covers: [US-01]
  actors: [Marketer, System]
  steps:
    - id: DS-01.1
      sequence: 1
      actor: Marketer
      activity: submits
      work_object: TargetUrl
      medium: digital
      class: state-change
      system_visible: true
      mutates: ShortLink
    - id: DS-01.2
      sequence: 2
      actor: Marketer
      activity: tells
      work_object: ShortCode
      medium: spoken
      class: collaboration
      system_visible: false
    - id: DS-01.3
      sequence: 3
      actor: Marketer
      activity: reviews
      work_object: FollowCount
      medium: digital
      class: read
      system_visible: true
  discovered_terms: [TargetUrl, ShortCode, FollowCount]
`,
    );
    put(
      r,
      ".arch/glossary.yaml",
      `glossary:
  terms:
    - term: TargetUrl
      origin: dst
      definition: The campaign address a link points at
    - term: ShortCode
      origin: dst
      definition: The token a visitor follows
    - term: FollowCount
      origin: dst
      definition: How many redirects a link has served
    - term: ShortLink
      origin: dst
      definition: A code paired with one target
`,
    );
    // 01a fills the reverse link Phase 0 left as `pending_story` — the contribution
    // `also_writes` exists for.
    put(
      r,
      ".arch/00-requirements/story-map.yaml",
      `story_map:
  backbone:
    - activity: "Publish Link"
      steps:
        - step: "Create Link"
          stories:
            - id: US-01
              story: "As a Marketer, I want a short code for a campaign URL"
              priority: MVP
              covered_by: DS-01
`,
    );
  },

  "01b-storm": (r) =>
    put(
      r,
      ".arch/01-discovery/event-storm.yaml",
      `event_storm:
  domain_events:
    - event: ShortLinkRequested
      trigger: { command: RequestShortLink, actor: Marketer }
      sourced_from: [DS-01.1]
      aggregate: ShortLink
  commands: [RequestShortLink]
  hot_spots:
    - topic: Code collisions
      question: What if the generated code is taken?
      kind: fact-unknown
      location: ShortLinkRequested
      sourced_from: [DS-01.1]
      resolution_status: resolved
      resolution: Retry generation; a code is never reused.
`,
    ),

  "01c-model": (r) =>
    put(
      r,
      ".arch/01-discovery/event-model.yaml",
      `event_model:
  swimlanes:
    - name: Publish
      story: DS-01
      slices:
        - command: RequestShortLink
          actor: Marketer
          event: ShortLinkRequested
          read_model: "FollowCount per ShortLink"
`,
    ),

  "02-strategic": (r) => {
    put(
      r,
      ".arch/02-strategic/bounded-contexts.yaml",
      `bounded_contexts:
  - name: Linking
    aggregates: [ShortLink]
    commands: [RequestShortLink]
    events_produced: [ShortLinkRequested]
    data_store: { schema: linking, tables: [short_links] }
`,
    );
    put(r, ".arch/02-strategic/context-map.yaml", "context_map:\n  style: modulith\n  relationships: []\n");
  },

  "03-tactical": (r) => {
    put(
      r,
      ".arch/03-tactical/aggregates/short-link.yaml",
      `aggregate:
  name: ShortLink
  bounded_context: Linking
  root_entity:
    name: ShortLink
    identity: { field: shortLinkId, type: UUID }
  commands:
    - name: RequestShortLink
  invariants:
    - A code maps to exactly one target
`,
    );
    put(r, ".arch/03-tactical/domain-model/linking.yaml", "domain_model:\n  bounded_context: Linking\n");
  },

  "04-specification": (r) => {
    put(r, ".arch/04-specification/features/linking.feature", "Feature: rules\n  Scenario: one target per code\n    Given a link\n");
    put(
      r,
      ".arch/04-specification/features/journeys/DS-01-publish.feature",
      "@journey @DS-01 @mvp\nFeature: DS-01 Publish a Link\n\n  @smoke\n  Scenario: A link is created\n    When the marketer requests a short link\n    Then a code should be issued\n",
    );
    put(r, ".arch/04-specification/contracts/none.yaml", "contract: {}\n");
    put(r, ".arch/04-specification/test-strategy.yaml", "test_strategy:\n  levels:\n    - level: Unit\n      tools:\n        - framework: pytest\n");
    put(r, ".arch/04-specification/threat-model.yaml", "threat_model:\n  method: STRIDE\n  threats: []\n");
  },

  "05-delivery": (r) => {
    put(
      r,
      ".arch/05-delivery/pipeline.yaml",
      `pipeline:
  post_deployment_verification:
    smoke_test:
      type: domain-story-replay
      stories:
        - id: DS-01
          journey: .arch/04-specification/features/journeys/DS-01-publish.feature
`,
    );
    put(r, ".arch/05-delivery/deployment-strategy.yaml", "deployment_strategy:\n  target: self-hosted\n  region: n/a\n");
    put(r, ".arch/05-delivery/observability/sli-slo.yaml", "sli_slo: []\n");
    put(r, ".arch/05-delivery/runbooks/slow.md", "# Runbook\n");
  },

  "06-review": (r) => {
    put(r, ".arch/06-review/viewpoints/functional.md", "# Functional\n\nEnd-to-end scenario is a replay of DS-01.\n");
    put(r, ".arch/06-review/adrs/adr-001.md", "# ADR-001: One deployable\n\nAccepted.\n");
    put(r, ".arch/06-review/perspectives.md", "# Perspectives\n");
  },

  "07-documentation": (r) => {
    put(r, ".arch/07-documentation/README.md", "# Docs\n");
    put(r, ".arch/07-documentation/sequence/ds-01.md", "# DS-01\n\nShortLinkRequested\n");
  },

  "08-implementation": (r) => {
    // Real enough to satisfy the checks that names alone cannot: the declared command
    // exists in code, and the story's test file actually declares a test. This fixture
    // used to be a comment and a class name, and it passed — which is exactly the bug
    // `commands-implemented` and the test-declaration check exist to close.
    put(r, "services/linking/short_link.py", "class ShortLinkRequested:\n    pass\n\n\nclass RequestShortLink:\n    def handle(self, target):\n        return ShortLinkRequested()\n\n\nclass ShortLink:\n    pass\n");
    put(r, "shared-kernel/ids.py", "ShortLinkId = str\n");
    put(r, "tests/test_DS-01_publish.py", "def test_ds_01_publish_a_link():\n    assert True\n");
  },

  "09-deploy": (r) =>
    put(r, ".arch/08-implementation/implementation-report.md", "# Verification\n\n| DS-01 | pass |\n"),
};

const ASSESSMENTS: Record<string, string> = {
  "assessment-2": `id: assessment-2
status: draft
answers:
  architecture_style: modulith
  communication: in_process_events
  database: single_schema
  deployment_target: none
  region: n/a
  iac: none
  profile: none
  ui_kind: cli
`,
  "assessment-8": `id: assessment-8
status: draft
answers:
  backend_language: python-3.12
  backend_ecosystem: python
  backend_framework_requested: fastapi
  backend_framework_resolved: ""
  orm: sqlalchemy
  frontend_framework: none
  test_stack: pytest
  iac: none
`,
};

/**
 * Do exactly what the conductor protocol says, and nothing else. Returns the trace so a
 * test can assert on the shape of the run rather than only its ending.
 */
function runToCompletion(root: string, maxTurns = 40): string[] {
  const trace: string[] = [];
  for (let turn = 0; turn < maxTurns; turn++) {
    const directive: Directive = next(root);
    trace.push(`${directive.action}:${directive.phase ?? "-"}`);
    switch (directive.action) {
      case "done":
        return trace;
      case "ask-assessment": {
        const id = directive.blockers?.[0]?.message.match(/(assessment-\d+)/)?.[1];
        if (!id || !ASSESSMENTS[id]) throw new Error(`no answers prepared for ${id}`);
        put(root, `.arch/${id}.yaml`, ASSESSMENTS[id]);
        lockAssessment(id, root);
        break;
      }
      case "run-phase": {
        const write = ARTIFACTS[directive.phase!];
        if (!write) throw new Error(`no artifacts prepared for ${directive.phase}`);
        write(root);
        report(directive.phase!, "awaiting-approval", undefined, root);
        break;
      }
      case "await-review":
        review(directive.phase!, "approved", "independent review", root);
        break;
      case "await-gate":
        report(directive.phase!, "approved", undefined, root);
        break;
      case "blocked":
        throw new Error(
          `blocked at ${directive.phase}: ${(directive.blockers ?? []).map((b) => `${b.sensor}: ${b.message}`).join(" | ")}`,
        );
    }
  }
  throw new Error(`did not finish in ${maxTurns} turns: ${trace.join(" → ")}`);
}

describe("the conductor loop, end to end", () => {
  test("a CLI-shaped, self-hosted, Python project runs from init to done", () => {
    const root = project();
    const trace = runToCompletion(root);
    expect(trace.at(-1)).toBe("done:-");

    const state = loadState(root);
    expect(state.cursor).toEqual({ phase: null, state: "done" });
    expect(state.project).toBe("link-shortener");

    // Twelve phases completed, one skipped because this project has no UI.
    const byState = Object.entries(state.phases).reduce<Record<string, string[]>>((acc, [id, rec]) => {
      (acc[rec.state] ??= []).push(id);
      return acc;
    }, {});
    expect(byState.completed?.length).toBe(12);
    expect(byState.skipped).toEqual(["03c-ux-design"]);
    expect(byState.pending).toBeUndefined();
    expect(byState.revising).toBeUndefined();
  });

  test("it asks for each questionnaire exactly when the phase needs it", () => {
    const trace = runToCompletion(project());
    expect(trace).toContain("ask-assessment:02-strategic");
    expect(trace).toContain("ask-assessment:08-implementation");
    // and never asks before the phase that requires the lock
    expect(trace.indexOf("ask-assessment:02-strategic")).toBeGreaterThan(
      trace.indexOf("run-phase:01a-dst"),
    );
  });

  test("it demands an independent review on exactly the reviewer phases", () => {
    const trace = runToCompletion(project());
    expect(trace.filter((t) => t.startsWith("await-review"))).toEqual([
      "await-review:06-review",
      "await-review:08-implementation",
    ]);
  });

  test("the phase with no UI is skipped, never handed to the conductor", () => {
    const trace = runToCompletion(project());
    expect(trace.some((t) => t.endsWith(":03c-ux-design"))).toBe(false);
    expect(statusText(project())).toBeTruthy();
  });

  test("every phase leaves a quality report, including the skipped one's neighbours", () => {
    const root = project();
    runToCompletion(root);
    for (const phase of Object.keys(ARTIFACTS)) {
      const findings = gate(phase, root);
      expect(findings.length, `${phase} produced no findings`).toBeGreaterThan(0);
      expect(findings.filter((f) => f.status === "fail"), `${phase} should be clean`).toEqual([]);
    }
  });

  test("no sensor silently passed: every inapplicable check said so out loud", () => {
    const root = project();
    runToCompletion(root);
    const na = [
      ...gate("03-tactical", root),
      ...gate("04-specification", root),
      ...gate("05-delivery", root),
      ...gate("08-implementation", root),
      ...gate("09-deploy", root),
    ].filter((f) => f.status === "na");
    // A UI-less, cloud-less, non-JVM project must have several, each with a reason.
    expect(na.length).toBeGreaterThan(4);
    for (const f of na) {
      expect(f.blocking).toBe(false);
      expect(f.message.length).toBeGreaterThan(20);
    }
    expect(na.some((f) => /ui_kind=cli/.test(f.message))).toBe(true);
    expect(na.some((f) => /deployment_target=none/.test(f.message))).toBe(true);
    // The version matrix now runs for any locked ecosystem and decides for itself; on
    // the `none` profile it says which build file it lacks, naming the ecosystem. It
    // used to be excluded by a `when: equals jvm`, which reported "does not apply" when
    // the truth was "I was told not to look".
    const matrix = na.find((f) => f.sensor === "framework-version-matrix");
    expect(matrix, "the version matrix must report for itself").toBeDefined();
    expect(matrix!.message).toMatch(/python/);
  });

  test("a rejected review sends the phase back and the loop recovers", () => {
    const root = project();
    // Drive up to the first reviewer phase, then reject once.
    let rejected = false;
    // A rejection costs extra turns, so give the loop room rather than assert on a
    // turn budget that has nothing to do with the behaviour under test.
    for (let turn = 0; turn < 80; turn++) {
      const d = next(root);
      if (d.action === "done") break;
      if (d.action === "ask-assessment") {
        const id = d.blockers?.[0]?.message.match(/(assessment-\d+)/)?.[1]!;
        put(root, `.arch/${id}.yaml`, ASSESSMENTS[id]!);
        lockAssessment(id, root);
        continue;
      }
      if (d.action === "run-phase") {
        ARTIFACTS[d.phase!]!(root);
        report(d.phase!, "awaiting-approval", undefined, root);
        continue;
      }
      if (d.action === "await-review") {
        if (!rejected) {
          review(d.phase!, "rejected", "authorisation unaddressed", root);
          expect(loadState(root).phases[d.phase!]!.state).toBe("revising");
          rejected = true;
          // the conductor addresses it and reports again
          report(d.phase!, "awaiting-approval", undefined, root);
          continue;
        }
        review(d.phase!, "approved", undefined, root);
        continue;
      }
      if (d.action === "await-gate") {
        report(d.phase!, "approved", undefined, root);
        continue;
      }
      throw new Error(`unexpected ${d.action} at ${d.phase}`);
    }
    expect(rejected).toBe(true);
    const finalState = loadState(root);
    if (finalState.cursor.state !== "done") {
      const stuck = Object.entries(finalState.phases)
        .filter(([, r]) => r.state !== "completed" && r.state !== "skipped")
        .map(([id, r]) => `${id}=${r.state}`);
      throw new Error(`loop did not finish; still open: ${stuck.join(", ")}`);
    }
  });

  test("a missing artifact blocks the phase instead of being waved through", () => {
    const root = project();
    // Run Phase 0 but write nothing.
    const d = next(root);
    expect(d.action).toBe("run-phase");
    const out = report("00-requirements", "approved", undefined, root);
    // Phase 0 has no blocking sensors, so it is `files-exist` on 01a that must bite.
    expect(out.ok).toBe(true);
    const findings = gate("01a-dst", root);
    expect(findings.some((f) => f.status === "fail" && f.sensor === "files-exist")).toBe(true);
  });
});

/**
 * A sensor must only ask for artifacts that exist by the phase it runs at.
 *
 * Found by running `/architect` on a greenfield SPA project: `actor-view-sourced-from-dst`
 * demanded `frontend/src/router.tsx` at Phase 3, and `cl-contract` demanded Phase 4
 * scenarios at Phase 3. Both made Phase 3 unpassable on any new UI project — and the
 * coffeeshop could never show it, because its artifacts were all imported and therefore
 * all already present.
 */
describe("no sensor may require a later phase's output", () => {
  test("every blocking sensor at a phase reads only that phase's inputs and outputs", () => {
    const phases = loadGraph().phases.sort((a, b) => a.ordinal - b.ordinal);
    // What exists by the time each phase gates: everything earlier plus its own output.
    const producedBy = new Map<string, number>();
    for (const p of phases) {
      for (const ref of p.produces) producedBy.set(ref.path, p.ordinal);
    }
    // A sensor mounted at phase P may not be the one to report a path produced later.
    // This is asserted structurally on the graph rather than by reading sensor source,
    // so it holds for sensors added later too.
    for (const p of phases) {
      for (const ref of p.consumes) {
        const producedAt = producedBy.get(ref.path);
        if (producedAt === undefined) continue; // an external input
        expect(
          producedAt,
          `${p.id} consumes ${ref.path}, which is produced later by ordinal ${producedAt}`,
        ).toBeLessThan(p.ordinal);
      }
    }
  });

  test("a greenfield SPA project reaches Phase 4 — the bug that blocked it", () => {
    const root = mkdtempSync(join(tmpdir(), "acg-spa-"));
    dirs.push(root);
    initProject({ dir: root, name: "spa-probe", profile: "aws-cdk-ts" });
    put(root, ".arch/assessment-2.yaml", `id: assessment-2
status: draft
answers:
  architecture_style: modulith
  communication: in_process_events
  database: single_schema
  deployment_target: ecs
  region: eu-west-1
  iac: cdk-typescript
  profile: aws-cdk-ts
  ui_kind: spa
`);
    lockAssessment("assessment-2", root);
    // Phase 3's own artifacts only — no router, no Phase 4 features. Before the fix
    // this combination could never leave Phase 3.
    put(root, ".arch/03-tactical/frontend-architecture.yaml", `frontend_architecture:
  actor_views:
    - actor: Speaker
      pages:
        - page: Submit
          path: "/speaker/new"
          sourced_from: [DS-01.1]
  api_contract:
    shared_enums:
      - { name: Status, values: [Open, Closed], used_by: [api, frontend] }
  cross_layer_type_contract:
    checks:
      - { id: CL-1, name: Query params, rule: "typed semantic_filter or enum_literal" }
      - { id: CL-2, name: Enum casing, rule: "identical across api and frontend" }
      - { id: CL-3, name: Money, rule: "whole units" }
      - { id: CL-4, name: DateTime, rule: "ISO-8601 string" }
      - { id: CL-5, name: Null vs empty, rule: "[] never null" }
      - { id: CL-6, name: Boolean naming, rule: "serialised name in the type" }
      - { id: CL-7, name: Pagination, rule: "n/a", current_status: "Not applicable" }
      - { id: CL-8, name: Error shape, rule: "JSON envelope" }
`);
    // Earlier phases' outputs, which 03-tactical legitimately consumes. Without these
    // `files-exist` fires, and it would mask the question this test is actually asking.
    put(root, ".arch/02-strategic/bounded-contexts.yaml", "bounded_contexts:\n  - name: Entries\n");
    put(root, ".arch/01-discovery/event-storm.yaml", `event_storm:
  domain_events:
    - event: EntrySubmitted
      trigger: { command: SubmitEntry, actor: Speaker }
      sourced_from: [DS-01.1]
      aggregate: Entry
  commands: [SubmitEntry]
`);
    put(root, ".arch/01-discovery/domain-stories/01.yaml", `story:
  id: DS-01
  name: Submit
  purity: to-be-only
  backbone: Submit
  covers: [US-01]
  actors: [Speaker]
  steps:
    - { id: DS-01.1, sequence: 1, actor: Speaker, activity: submits, work_object: Entry, medium: digital, class: state-change, system_visible: true }
`);
    const findings = gate("03-tactical", root);
    const blocked = findings.filter((f) => f.status === "fail");
    expect(
      blocked.map((f) => `${f.sensor}: ${f.message}`),
      "Phase 3 must not demand the router or Phase 4 scenarios",
    ).toEqual([]);
  });
});

describe("gate records, unless told not to", () => {
  /**
   * `gate` was documented as "sensors only, no state change" and overwrote the phase's
   * quality report every time. An independent reviewer then refused a phase because the
   * recorded evidence was a `fail` left behind by an exploratory run — correctly, since
   * from the files a demonstration and a cover-up look the same.
   */
  test("a plain gate writes the report; --dry-run leaves it alone", () => {
    const root = project();
    ARTIFACTS["00-requirements"]!(root);
    report("00-requirements", "awaiting-approval", undefined, root);
    const reportPath = join(root, ".arch/quality-reports/00-requirements.yaml");
    const recorded = readFileSync(reportPath, "utf8");

    // Break an input, then ask about it without recording.
    put(root, ".arch/00-requirements/story-map.yaml", "story_map:\n  backbone: []\n");
    const dry = gate("00-requirements", root, { dryRun: true });
    expect(dry.length).toBeGreaterThan(0);
    expect(readFileSync(reportPath, "utf8"), "a dry run must not rewrite the record").toBe(
      recorded,
    );

    // A real gate does record it.
    gate("00-requirements", root);
    expect(readFileSync(reportPath, "utf8")).not.toBe(recorded);
  });

  test("a dry run is still audited, marked as not recorded", () => {
    const root = project();
    ARTIFACTS["00-requirements"]!(root);
    gate("00-requirements", root, { dryRun: true });
    const shard = join(root, ".arch/audit", `${new Date().toISOString().slice(0, 7)}.md`);
    const log = readFileSync(shard, "utf8");
    expect(log).toContain("SENSOR_DRY_RUN");
    expect(log).toContain('"recorded":false');
  });
});
