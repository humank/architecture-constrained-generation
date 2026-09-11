import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decisionNotRestated } from "../src/sensors/decision-not-restated.ts";
import { docsEventsMatchStorm } from "../src/sensors/docs-events.ts";
import { frameworkVersionMatrix } from "../src/sensors/framework-version-matrix.ts";
import { sourceFingerprint } from "../src/sensors/source-fingerprint.ts";
import { gherkinActorMatchesDst } from "../src/sensors/gherkin-actor.ts";
import { messagingMatchesContextMap } from "../src/sensors/messaging-context-map.ts";
import Ajv from "ajv";
import { parse } from "yaml";
import { schemaDst } from "../src/sensors/schema-dst.ts";
import { storyMapCoverage } from "../src/sensors/story-map-coverage.ts";
import { dstStormCorrespondence } from "../src/sensors/dst-storm.ts";
import { hotspotClassified } from "../src/sensors/hotspot-classified.ts";
import { swimlaneIsStory } from "../src/sensors/swimlane-story.ts";
import { handoffEqualsContextMap } from "../src/sensors/handoff-context-map.ts";
import { actorViewSourcedFromDst } from "../src/sensors/actor-view-sourced.ts";
import { clContractDeclared, clContractSpecified } from "../src/sensors/cl-contract.ts";
import { ephemeralNotPersisted } from "../src/sensors/ephemeral-not-persisted.ts";
import { testStackMatrix } from "../src/sensors/test-stack-matrix.ts";
import { e2eStoryCoverage } from "../src/sensors/e2e-story.ts";
import { glossaryOrigin } from "../src/sensors/glossary-origin.ts";
import { qualityReportWritten } from "../src/sensors/quality-report-written.ts";
import { godAggregate } from "../src/sensors/god-aggregate.ts";
import { filesExist } from "../src/sensors/files-exist.ts";
import { runSensors, sensorIds } from "../src/sensors/registry.ts";
import { loadGraph } from "../src/graph.ts";
import {
  REPO,
  cleanup,
  editArchText,
  fails,
  readArch,
  scratchRoot,
  writeArch,
} from "./helpers.ts";

/**
 * The coffeeshop sample, and only the coffeeshop sample.
 *
 * Everything here reads the repo's own `.arch/` and the repo's own code, so it is the
 * one suite that is *supposed* to be coupled to the sample: several of these tests
 * assert that a sensor **fails**, because the sample deliberately ships the lies the
 * engine exists to catch (plan §10).
 *
 * If you replaced `.arch/` with your own domain, this file is expected to fail and the
 * rest of the suite is not. Delete it, or point it at your own artifacts. The engine's
 * own behaviour is covered by `fixture-domains.test.ts` and the unit suites.
 */

const roots: string[] = [];
function scratch(): string {
  const r = scratchRoot();
  roots.push(r);
  return r;
}
afterEach(() => {
  while (roots.length) cleanup(roots.pop()!);
});

describe("gherkin-actor-matches-dst", () => {
  test("ordering.feature gives PlaceOrder to the cashier and must fail", () => {
    const bad = fails(gherkinActorMatchesDst(REPO));
    expect(bad.length).toBeGreaterThan(0);
    expect(bad.some((f) => /PlaceOrder/.test(f.message) && /Waiter/.test(f.message))).toBe(true);
  });

  test("the cashier alias is resolved through the glossary, not a hard-coded table", () => {
    // glossary.yaml lists "Cashier" as an alias of Counter Staff
    const bad = fails(gherkinActorMatchesDst(REPO));
    expect(bad.some((f) => /treats PlaceOrder as Counter Staff/.test(f.message))).toBe(true);
  });

  test("command phrases are derived from the Event Storm command names", () => {
    // Nothing in the sensor knows the word "replenishment": RequestReplenishment
    // becomes "requests replenishment" by splitting the command name.
    const bad = fails(gherkinActorMatchesDst(REPO));
    expect(bad.some((f) => /RequestReplenishment as manager/.test(f.message))).toBe(true);
    expect(bad.some((f) => /DeliverOrder as server/.test(f.message))).toBe(true);
  });

  test("the journey features use the DST actors and are not flagged", () => {
    const bad = fails(gherkinActorMatchesDst(REPO));
    expect(bad.some((f) => f.message.includes("features/journeys/"))).toBe(false);
  });

  test("a storm with no actor-commands is a failure, not a vacuous pass", () => {
    const root = scratch();
    editArchText(root, "01-discovery/event-storm.yaml", (t) =>
      t.replace(/trigger: \{ command: [^}]*\}/g, "trigger: { policy: manual }"),
    );
    expect(fails(gherkinActorMatchesDst(root))[0]?.message).toMatch(/no actor-triggered commands/);
  });
});

describe("decision-not-restated (was region-fingerprint)", () => {
  test("the locked ap-east-2 disagrees with the us-east-1 iac config and must fail", () => {
    const findings = decisionNotRestated(REPO);
    expect(findings[0]?.status).toBe("fail");
    expect(findings[0]?.message).toContain("ap-east-2");
    expect(findings[0]?.message).toContain("us-east-1");
  });

  test("deploy.sh reads the lock instead of restating it", () => {
    expect(decisionNotRestated(REPO)[0]?.message).toContain("scripts/deploy.sh=<derived from lock>");
  });

  test("agreement passes", () => {
    const root = scratch();
    const doc = readArch<{ answers: { region: string } }>(root, "assessment-2.yaml");
    doc.answers.region = "us-east-1";
    writeArch(root, "assessment-2.yaml", doc);
    editArchText(root, "05-delivery/deployment-strategy.yaml", (t) =>
      t.replace(/ap-east-2/g, "us-east-1"),
    );
    const findings = decisionNotRestated(root);
    expect(findings[0]?.status).toBe("pass");
  });
});

describe("messaging-matches-context-map", () => {
  test("every async context map edge is wired in messaging-stack.ts", () => {
    expect(fails(messagingMatchesContextMap(REPO))).toEqual([]);
  });

  test("a queue the context map does not declare is refused", () => {
    const root = scratch();
    editArchText(root, "02-strategic/context-map.yaml", (t) =>
      t.replace("queue: reporting-from-inventory", "queue: reporting-from-warehouse"),
    );
    const bad = fails(messagingMatchesContextMap(root));
    expect(bad.some((f) => /reporting-from-warehouse.*does not create/.test(f.message))).toBe(true);
    expect(bad.some((f) => /creates queue "reporting-from-inventory".*not on the context map/.test(f.message))).toBe(true);
  });

  test("a subscription filter wider than the map edge is refused", () => {
    const root = scratch();
    // The map says Inventory only hears PreparationStarted; claim it hears less than
    // the IaC actually allows and the extra event shows up.
    editArchText(root, "02-strategic/context-map.yaml", (t) =>
      t.replace("        events: [PreparationStarted]\n", "        events: [CoffeePrepared]\n"),
    );
    const bad = fails(messagingMatchesContextMap(root));
    expect(bad.some((f) => /also accepts \[PreparationStarted\]/.test(f.message))).toBe(true);
    expect(bad.some((f) => /filters out \[CoffeePrepared\]/.test(f.message))).toBe(true);
  });

  test("a topic the context map does not declare is refused", () => {
    const root = scratch();
    editArchText(root, "02-strategic/context-map.yaml", (t) =>
      t.replace(/topic: inventory-events/g, "topic: warehouse-events"),
    );
    expect(
      fails(messagingMatchesContextMap(root)).some((f) => /topic "inventory-events".*not on the context map/.test(f.message)),
    ).toBe(true);
  });

  test("a context map with no async edges reports na, not a vacuous pass", () => {
    const root = scratch();
    editArchText(root, "02-strategic/context-map.yaml", (t) =>
      t.replace(/^\s+topic: .*$/gm, "").replace(/^\s+queue: .*$/gm, ""),
    );
    const findings = messagingMatchesContextMap(root);
    expect(findings[0]?.status).toBe("na");
    expect(findings[0]?.message).toMatch(/no topic or queue/);
  });
});

describe("docs-events-match-storm", () => {
  test("the sequence diagram invents OrderPaid and must fail", () => {
    const bad = fails(docsEventsMatchStorm(REPO));
    expect(bad.some((f) => /OrderPaid/.test(f.message))).toBe(true);
  });

  test("with a phase given, an empty produces directory is na rather than a failure", () => {
    const root = scratch();
    rmSync(join(root, ".arch/07-documentation"), { recursive: true, force: true });
    const findings = docsEventsMatchStorm(root, "07-documentation");
    expect(fails(findings)).toEqual([]);
    expect(findings[0]?.status).toBe("na");
  });

  test("the sensor also reads Phase 6's own prose, where the same lie is repeated", () => {
    // Widening the scope from "the 07-documentation directory" to "the prose this phase
    // produced" revealed that OrderPaid / PreparationCompleted appear in the Phase 6
    // viewpoints too — the old scope had been reporting a fraction of the real spread.
    const atSix = fails(docsEventsMatchStorm(REPO, "06-review"));
    expect(atSix.some((f) => /06-review.*PreparationCompleted/.test(f.message))).toBe(true);
    const atSeven = fails(docsEventsMatchStorm(REPO, "07-documentation"));
    expect(atSeven.some((f) => /OrderPaid/.test(f.message))).toBe(true);
  });
});

describe("framework-version-matrix (was spring-boot-matrix)", () => {
  test("the questionnaire asks for 4.x while gradle builds 3.4.4 — must fail", () => {
    const bad = fails(frameworkVersionMatrix(REPO));
    expect(bad.length).toBeGreaterThan(0);
    expect(bad[0]?.message).toContain("3.4.4");
    expect(bad[0]?.message).toContain("spring-boot-4.x");
  });

  test("an explicit resolution reconciles the request with the build", () => {
    const root = scratch();
    const doc = readArch<{ answers: Record<string, string> }>(root, "assessment-8.yaml");
    doc.answers.backend_framework_resolved = "spring-boot-3.4.4";
    writeArch(root, "assessment-8.yaml", doc);
    expect(fails(frameworkVersionMatrix(root))).toEqual([]);
  });

  test("a missing assessment-8 is refused", () => {
    const root = scratch();
    rmSync(join(root, ".arch/assessment-8.yaml"));
    expect(fails(frameworkVersionMatrix(root))[0]?.message).toMatch(/Missing/);
  });
});

describe("source-fingerprint", () => {
  test("the coffeeshop code has events, routes and E2E names that do not match the design", () => {
    const bad = fails(sourceFingerprint(REPO));
    expect(bad.some((f) => /OrderDelivered has no matching type/.test(f.message))).toBe(true);
    expect(bad.some((f) => /no Actor View declares/.test(f.message))).toBe(true);
    expect(bad.some((f) => /named after DS-01/.test(f.message))).toBe(true);
  });
});

describe("registry", () => {
  test("every sensor named in the phase graph is registered", () => {
    const registered = new Set(sensorIds());
    const referenced = loadGraph()
      .phases.flatMap((p) => [...p.sensors, ...p.advisory_sensors])
      .map((ref) => ref.id);
    expect(referenced.filter((id) => !registered.has(id))).toEqual([]);
  });

  test("an unknown sensor id warns instead of throwing", () => {
    const findings = runSensors(["not-a-sensor"], REPO);
    expect(findings[0]?.status).toBe("warn");
    expect(findings[0]?.blocking).toBe(false);
  });

  test("advisory sensors are reported but never blocking", () => {
    const findings = runSensors(["glossary-origin"], REPO, { advisory: ["glossary-origin"] });
    expect(findings.every((f) => f.blocking === false)).toBe(true);
  });

  test("a sensor that throws becomes a finding, not a crash", () => {
    // files-exist needs a phase from the graph; an unknown one makes it throw.
    const findings = runSensors(["files-exist"], REPO, { phase: "99-nope" });
    expect(findings[0]?.status).toBe("fail");
    expect(findings[0]?.message).toMatch(/Sensor threw/);
  });
});

describe("files-exist", () => {
  test("passes for a phase whose declared inputs are all on disk", () => {
    expect(fails(filesExist(REPO, "01b-storm"))).toEqual([]);
  });

  test("fails when a declared input is missing", () => {
    const root = scratch();
    rmSync(join(root, ".arch/01-discovery/domain-stories"), { recursive: true, force: true });
    const bad = fails(filesExist(root, "01b-storm"));
    expect(bad.length).toBe(1);
    expect(bad[0]?.message).toMatch(/domain-stories/);
  });

  test("an empty directory does not count as a produced input", () => {
    const root = scratch();
    rmSync(join(root, ".arch/01-discovery/domain-stories"), { recursive: true, force: true });
    mkdirSync(join(root, ".arch/01-discovery/domain-stories"), { recursive: true });
    expect(fails(filesExist(root, "01b-storm"))[0]?.message).toMatch(/empty directory/);
  });
});

describe("schema-dst", () => {
  test("coffeeshop sentence stories pass", () => {
    expect(fails(schemaDst(REPO))).toEqual([]);
  });

  test("the legacy prose fixture fails the JSON Schema", () => {
    const schema = JSON.parse(
      readFileSync(join(REPO, "artifact-schemas/domain-story.schema.json"), "utf8"),
    );
    delete schema.$schema;
    const validate = new Ajv({ allErrors: true, strict: false, validateSchema: false }).compile(
      schema,
    );
    const prose = parse(readFileSync(join(import.meta.dir, "fixtures/prose-story.yaml"), "utf8"));
    expect(validate(prose)).toBe(false);
  });

  test("a story step missing `class` is refused", () => {
    const root = scratch();
    editArchText(root, "01-discovery/domain-stories/01-order-to-serve.yaml", (t) =>
      t.replace("      class: state-change\n      system_visible: true\n      mutates: Order\n      notes: Table number", "      system_visible: true\n      mutates: Order\n      notes: Table number"),
    );
    const bad = fails(schemaDst(root));
    expect(bad.length).toBeGreaterThan(0);
    expect(bad.some((f) => /class/.test(f.message))).toBe(true);
  });

  test("no story files at all is a failure, not a pass", () => {
    const root = scratch();
    rmSync(join(root, ".arch/01-discovery/domain-stories"), { recursive: true, force: true });
    expect(fails(schemaDst(root))[0]?.message).toMatch(/No domain story files/);
  });
});

describe("story-map-coverage", () => {
  test("every MVP user story is covered by a domain story", () => {
    expect(fails(storyMapCoverage(REPO))).toEqual([]);
  });

  test("dropping DS-03 leaves the reporting stories uncovered", () => {
    const root = scratch();
    rmSync(join(root, ".arch/01-discovery/domain-stories/03-daily-reporting.yaml"));
    const bad = fails(storyMapCoverage(root));
    expect(bad.some((f) => /US-19/.test(f.message))).toBe(true);
    expect(bad.some((f) => /US-20/.test(f.message))).toBe(true);
  });

  test("a covered_by pointing at a story that does not exist is refused", () => {
    const root = scratch();
    editArchText(root, "00-requirements/story-map.yaml", (t) =>
      t.replace("covered_by: DS-01", "covered_by: DS-99"),
    );
    expect(
      fails(storyMapCoverage(root)).some((f) => /covered_by DS-99, which does not exist/.test(f.message)),
    ).toBe(true);
  });

  test("a one-way covered_by claim is refused", () => {
    const root = scratch();
    // US-01 says DS-02 covers it; DS-02 lists only US-14..US-18.
    editArchText(root, "00-requirements/story-map.yaml", (t) =>
      t.replace("            - id: US-01\n              covered_by: DS-01", "            - id: US-01\n              covered_by: DS-02"),
    );
    expect(
      fails(storyMapCoverage(root)).some((f) =>
        /US-01 claims covered_by DS-02, but DS-02 does not list US-01/.test(f.message),
      ),
    ).toBe(true);
  });

  test("pending_story is a legitimate placeholder before 01a runs", () => {
    const root = scratch();
    editArchText(root, "00-requirements/story-map.yaml", (t) =>
      t.replace("covered_by: DS-03", "covered_by: pending_story"),
    );
    // still covered from the DS-03 side, so no finding about the placeholder itself
    expect(
      fails(storyMapCoverage(root)).some((f) => /pending_story/.test(f.message)),
    ).toBe(false);
  });

  test("a story whose backbone is not a story-map activity is refused", () => {
    const root = scratch();
    editArchText(root, "01-discovery/domain-stories/02-replenishment.yaml", (t) =>
      t.replace("backbone: Inventory Management", "backbone: Warehouse Robotics"),
    );
    expect(fails(storyMapCoverage(root)).some((f) => /Warehouse Robotics/.test(f.message))).toBe(
      true,
    );
  });
});

describe("dst-storm-correspondence", () => {
  test("coffeeshop stories and storm correspond", () => {
    expect(fails(dstStormCorrespondence(REPO))).toEqual([]);
  });

  test("removing OrderPlaced.sourced_from breaks the correspondence in both directions", () => {
    const root = scratch();
    editArchText(root, "01-discovery/event-storm.yaml", (t) =>
      t.replace("      sourced_from: [DS-01.5, DS-01.6]\n", ""),
    );
    const bad = fails(dstStormCorrespondence(root));
    // the DST step now has no event, and the actor-command now has no sentence
    expect(bad.some((f) => /DS-01\.5/.test(f.message))).toBe(true);
    expect(bad.some((f) => /OrderPlaced/.test(f.message))).toBe(true);
  });

  test("an event citing a step that does not exist is refused", () => {
    const root = scratch();
    editArchText(root, "01-discovery/event-storm.yaml", (t) =>
      t.replace("sourced_from: [DS-01.7]", "sourced_from: [DS-01.99]"),
    );
    expect(fails(dstStormCorrespondence(root)).some((f) => /DS-01\.99/.test(f.message))).toBe(true);
  });

  test("an event whose actor contradicts the DST step is refused", () => {
    const root = scratch();
    editArchText(root, "01-discovery/event-storm.yaml", (t) =>
      t.replace(
        "trigger: { command: PlaceOrder, actor: Waiter }",
        "trigger: { command: PlaceOrder, actor: Barista }",
      ),
    );
    expect(
      fails(dstStormCorrespondence(root)).some((f) => /actor "Barista"/.test(f.message)),
    ).toBe(true);
  });
});

describe("hotspot-classified", () => {
  test("every coffeeshop hot spot is classified, and the open one is a fact", () => {
    const findings = hotspotClassified(REPO);
    expect(fails(findings)).toEqual([]);
    expect(findings[0]?.message).toMatch(/1 open, all fact-unknown/);
  });

  test("an unclassified hot spot is refused", () => {
    const root = scratch();
    editArchText(root, "01-discovery/event-storm.yaml", (t) =>
      t.replace("      kind: fact-unknown\n      location: PreparationStarted\n", "      location: PreparationStarted\n"),
    );
    expect(fails(hotspotClassified(root)).some((f) => /is not classified/.test(f.message))).toBe(
      true,
    );
  });

  test("an OPEN work-unknown sends the question back to 01a-dst", () => {
    const root = scratch();
    editArchText(root, "01-discovery/event-storm.yaml", (t) =>
      t.replace(
        '      kind: fact-unknown\n      location: LowStockAlertTriggered\n',
        '      kind: work-unknown\n      location: LowStockAlertTriggered\n',
      ),
    );
    const bad = fails(hotspotClassified(root));
    expect(bad.some((f) => /open work-unknown/.test(f.message))).toBe(true);
    expect(bad.some((f) => /redo --phase 01a-dst/.test(f.message))).toBe(true);
  });

  test("a deferred work-unknown is allowed — it has a recorded resolution", () => {
    // "Partial order delivery" and "Customer changes their mind" are both
    // work-unknown, both deferred with a resolution. Neither blocks.
    expect(fails(hotspotClassified(REPO))).toEqual([]);
  });

  test("a resolved hot spot with no resolution is refused", () => {
    const root = scratch();
    editArchText(root, "01-discovery/event-storm.yaml", (t) =>
      t.replace(
        '      resolution: "Yes — recipes are essential for accurate ingredient deduction"\n',
        "",
      ),
    );
    expect(
      fails(hotspotClassified(root)).some((f) => /records no resolution/.test(f.message)),
    ).toBe(true);
  });

  test("a hot spot located at an event the storm does not have is refused", () => {
    const root = scratch();
    editArchText(root, "01-discovery/event-storm.yaml", (t) =>
      t.replace("      location: PreparationStarted\n", "      location: CoffeeSpilled\n"),
    );
    expect(fails(hotspotClassified(root)).some((f) => /CoffeeSpilled/.test(f.message))).toBe(true);
  });

  test("a hot spot citing a DST step that does not exist is refused", () => {
    const root = scratch();
    editArchText(root, "01-discovery/event-storm.yaml", (t) =>
      t.replace("      sourced_from: [DS-02.3]\n", "      sourced_from: [DS-02.99]\n"),
    );
    expect(fails(hotspotClassified(root)).some((f) => /DS-02\.99/.test(f.message))).toBe(true);
  });
});

describe("swimlane-is-story", () => {
  test("coffeeshop swimlanes are cut by story", () => {
    expect(fails(swimlaneIsStory(REPO))).toEqual([]);
  });

  test("a swimlane with no story is refused", () => {
    const root = scratch();
    editArchText(root, "01-discovery/event-model.yaml", (t) =>
      t.replace('    - name: "Inventory"\n      story: DS-02\n', '    - name: "Inventory"\n'),
    );
    expect(fails(swimlaneIsStory(root)).some((f) => /declares no story/.test(f.message))).toBe(true);
  });

  test("a DST read step with no matching read model is refused", () => {
    const root = scratch();
    editArchText(root, "01-discovery/event-model.yaml", (t) =>
      t.replace('read_model: "ReadyOrders (table number, grouped per table)"', 'read_model: "Ready for Pickup"'),
    );
    expect(fails(swimlaneIsStory(root)).some((f) => /DS-01\.16/.test(f.message))).toBe(true);
  });
});

describe("handoff-equals-context-map", () => {
  test("cross-context handoffs are on the coffeeshop context map", () => {
    expect(fails(handoffEqualsContextMap(REPO))).toEqual([]);
  });

  test("removing the OrderReadyForDelivery edge exposes the DS-01.15 handoff", () => {
    const root = scratch();
    editArchText(root, "02-strategic/context-map.yaml", (t) =>
      t.replace("        events: [OrderReadyForDelivery]\n", "        events: []\n"),
    );
    expect(
      fails(handoffEqualsContextMap(root)).some((f) => /DS-01\.15/.test(f.message)),
    ).toBe(true);
  });
});

describe("actor-view-sourced-from-dst", () => {
  test("provenance is clean at Phase 3 — the router gap is Phase 8's to report", () => {
    // The router is Phase 8's output. Asking for it at Phase 3 made every greenfield UI
    // project unpassable, so the check moved to `source-fingerprint`.
    expect(fails(actorViewSourcedFromDst(REPO))).toEqual([]);
    const atEight = fails(sourceFingerprint(REPO));
    expect(atEight.some((f) => /waiter\/orders\/ready.*does not route/.test(f.message))).toBe(true);
  });

  test("every actor view page cites a real DST step", () => {
    const bad = fails(actorViewSourcedFromDst(REPO));
    expect(bad.some((f) => /no sourced_from/.test(f.message))).toBe(false);
    expect(bad.some((f) => /does not exist/.test(f.message))).toBe(false);
  });

  test("a page sourced from an invisible DST step is refused", () => {
    const root = scratch();
    editArchText(root, "03-tactical/frontend-architecture.yaml", (t) =>
      t.replace("sourced_from: [DS-01.5]", "sourced_from: [DS-01.2]"),
    );
    expect(
      fails(actorViewSourcedFromDst(root)).some((f) => /system_visible: false/.test(f.message)),
    ).toBe(true);
  });

  test("malformed YAML is a finding, not an exception", () => {
    const root = scratch();
    editArchText(root, "03-tactical/frontend-architecture.yaml", () => "actor_views: [ unclosed");
    expect(fails(actorViewSourcedFromDst(root))[0]?.message).toMatch(/not valid YAML/);
  });
});

describe("cl-contract-declared", () => {
  test("CL-1..CL-8 are declared in Phase 3 and specified in Phase 4", () => {
    expect(fails(clContractDeclared(REPO))).toEqual([]);
  });

  test("dropping a check declaration is refused", () => {
    const root = scratch();
    editArchText(root, "03-tactical/frontend-architecture.yaml", (t) =>
      t.replace("      - id: CL-4", "      - id: CL-4-disabled"),
    );
    expect(fails(clContractDeclared(root)).some((f) => /CL-4 is not declared/.test(f.message))).toBe(true);
  });

  test("an unclassified query parameter value is refused (CL-1)", () => {
    const root = scratch();
    editArchText(root, "03-tactical/frontend-architecture.yaml", (t) =>
      t.replace('                type: semantic_filter\n                backend_logic: "findByStatusNot(COMPLETED)', '                backend_logic: "findByStatusNot(COMPLETED)'),
    );
    expect(fails(clContractDeclared(root)).some((f) => /CL-1/.test(f.message))).toBe(true);
  });

  test("a check with no Phase 4 scenario is refused by the Phase 4 half", () => {
    const root = scratch();
    for (const file of ["cross-layer-integrity.feature", "query-endpoints.feature"]) {
      editArchText(root, `04-specification/features/${file}`, (t) => t.replace(/CL-\d/g, "XX"));
    }
    const bad = fails(clContractSpecified(root));
    expect(bad.some((f) => /CL-2.*no scenario/.test(f.message))).toBe(true);
    // CL-7 declares current_status: Not applicable, so it is not a finding
    expect(bad.some((f) => /^CL-7 /.test(f.message))).toBe(false);
    // and the declaration half is clean either way
    expect(fails(clContractDeclared(root))).toEqual([]);
  });
});

describe("ephemeral-not-persisted", () => {
  test("DrinkChoice is spoken-only and stays out of the aggregates", () => {
    const findings = ephemeralNotPersisted(REPO);
    expect(fails(findings)).toEqual([]);
    expect(findings[0]?.message).toMatch(/drinkchoice/);
  });

  test("persisting a spoken work object is refused", () => {
    const root = scratch();
    editArchText(root, "03-tactical/aggregates/ordering.yaml", (t) =>
      t.replace("    - name: OrderItem", "    - name: DrinkChoice\n      identity: { field: id, type: UUID }\n    - name: OrderItem"),
    );
    const bad = fails(ephemeralNotPersisted(root));
    expect(bad.some((f) => /persists "DrinkChoice"/.test(f.message))).toBe(true);
    expect(bad.some((f) => /Spoken words are not records/.test(f.message))).toBe(true);
  });

  test("a table named after a spoken work object is refused", () => {
    const root = scratch();
    editArchText(root, "02-strategic/bounded-contexts.yaml", (t) =>
      t.replace("tables: [orders, order_items, payments]", "tables: [orders, order_items, payments, drink_choice]"),
    );
    const bad = fails(ephemeralNotPersisted(root));
    expect(bad.some((f) => /"drink_choice" table/.test(f.message))).toBe(true);
  });

  test("physical invisible work objects are not ephemeral", () => {
    // Table, Counter, Cash and Material are invisible to the system too, but they are
    // things, not words — the model may represent them.
    const findings = ephemeralNotPersisted(REPO);
    expect(findings[0]?.message).not.toMatch(/table|cash|material|counter/);
  });
});

describe("test-stack-matrix", () => {
  test("the aligned test strategy matches the locked stack", () => {
    expect(fails(testStackMatrix(REPO))).toEqual([]);
  });

  test("Jest in a Java + Vitest project is refused — the plan's own example", () => {
    const root = scratch();
    editArchText(root, "04-specification/test-strategy.yaml", (t) =>
      t.replace("- framework: JUnit 5 (backend domain), Vitest (frontend logic)", "- framework: Jest (TypeScript) or pytest (Python)"),
    );
    const bad = fails(testStackMatrix(root));
    expect(bad.some((f) => /names jest/.test(f.message))).toBe(true);
    expect(bad.some((f) => /names pytest/.test(f.message))).toBe(true);
    expect(bad[0]?.message).toContain("cannot run java-21");
  });

  test("an e2e runner outside the locked stack is refused", () => {
    const root = scratch();
    editArchText(root, "04-specification/test-strategy.yaml", (t) =>
      t.replace("tool: Lighthouse CI", "tool: Cypress"),
    );
    expect(fails(testStackMatrix(root)).some((f) => /names cypress/.test(f.message))).toBe(true);
  });

  test("contract and load tools are not constrained by the questionnaire", () => {
    // Pact and k6 appear in test-strategy.yaml and are never flagged.
    expect(fails(testStackMatrix(REPO))).toEqual([]);
  });

  test("a missing test_stack answer is refused", () => {
    const root = scratch();
    const doc = readArch<{ answers: Record<string, unknown> }>(root, "assessment-8.yaml");
    delete doc.answers.test_stack;
    writeArch(root, "assessment-8.yaml", doc);
    expect(fails(testStackMatrix(root))[0]?.message).toMatch(/no test_stack/);
  });
});

describe("e2e-story-coverage", () => {
  test("every to-be story has a journey feature and a pipeline smoke entry", () => {
    expect(fails(e2eStoryCoverage(REPO))).toEqual([]);
  });

  test("removing a journey feature is refused", () => {
    const root = scratch();
    rmSync(join(root, ".arch/04-specification/features/journeys/DS-02-replenishment.feature"));
    expect(fails(e2eStoryCoverage(root)).some((f) => /DS-02.*journey/.test(f.message))).toBe(true);
  });

  test("a story missing from the pipeline smoke list is refused", () => {
    const root = scratch();
    editArchText(root, "05-delivery/pipeline.yaml", (t) => t.replace(/DS-03/g, "DS-XX"));
    expect(fails(e2eStoryCoverage(root)).some((f) => /DS-03.*pipeline/.test(f.message))).toBe(true);
  });
});

describe("glossary-origin", () => {
  test("every coffeeshop glossary term declares an origin", () => {
    expect(fails(glossaryOrigin(REPO))).toEqual([]);
  });

  test("infrastructure vocabulary without origin: technical is refused", () => {
    const root = scratch();
    editArchText(root, "glossary.yaml", (t) =>
      t.replace("    - term: Outbox Pattern\n      origin: technical\n", "    - term: Outbox Pattern\n"),
    );
    expect(
      fails(glossaryOrigin(root)).some((f) => /Outbox Pattern.*infrastructure/.test(f.message)),
    ).toBe(true);
  });

  test("a term the stories discovered but the glossary omits is refused", () => {
    const root = scratch();
    editArchText(root, "glossary.yaml", (t) =>
      t.replace(
        /    - term: BaristaQueue\n(?:      .*\n)+/,
        "",
      ),
    );
    expect(
      fails(glossaryOrigin(root)).some((f) => /BaristaQueue.*missing from the glossary/.test(f.message)),
    ).toBe(true);
  });

  test("an unknown origin value is refused", () => {
    const root = scratch();
    editArchText(root, "glossary.yaml", (t) => t.replace("origin: dst", "origin: vibes"));
    expect(fails(glossaryOrigin(root)).some((f) => /origin "vibes"/.test(f.message))).toBe(true);
  });
});

describe("advisory sensors", () => {
  test("quality-report-written says na on a phase's first gate, not warn", () => {
    // The gate writes the report *after* the sensors run, so on the first gate there
    // is legitimately nothing to read. Warning there would train people to ignore it.
    const root = scratch();
    rmSync(join(root, ".arch/quality-reports"), { recursive: true, force: true });
    const findings = qualityReportWritten(root, "03-tactical");
    expect(findings[0]?.status).toBe("na");
    expect(findings[0]?.blocking).toBe(false);
    expect(findings[0]?.message).toMatch(/first gate/);
  });

  test("quality-report-written warns when a report exists but names another phase", () => {
    const root = scratch();
    writeFileSync(
      join(root, ".arch/quality-reports/03-tactical.yaml"),
      "quality_report:\n  phase: 99-elsewhere\n",
    );
    const findings = qualityReportWritten(root, "03-tactical");
    expect(findings[0]?.status).toBe("warn");
  });

  test("god-aggregate reads a multi-document aggregate file without failing", () => {
    const findings = godAggregate(REPO);
    expect(findings.some((f) => /not valid YAML/.test(f.message))).toBe(false);
    expect(findings.every((f) => f.blocking === false || f.status === "pass")).toBe(true);
  });

  test("god-aggregate warns about an aggregate with no invariants", () => {
    const root = scratch();
    editArchText(root, "03-tactical/aggregates/ordering.yaml", (t) =>
      t.replace("  invariants:", "  invariants_disabled:"),
    );
    const findings = godAggregate(root);
    expect(findings.some((f) => /declares no invariants/.test(f.message))).toBe(true);
    expect(findings.every((f) => f.blocking === false)).toBe(true);
  });

  test("god-aggregate warns when one aggregate handles too many commands", () => {
    const root = scratch();
    editArchText(root, "03-tactical/aggregates/ordering.yaml", (t) =>
      t.replace(
        "  invariants:",
        "    - name: ExtraOne\n    - name: ExtraTwo\n    - name: ExtraThree\n  invariants:",
      ),
    );
    expect(godAggregate(root).some((f) => /handles \d+ commands/.test(f.message))).toBe(true);
  });
});

describe("quality report", () => {
  test("gate findings are written in the shared quality-report shape", () => {
    const root = scratch();
    mkdirSync(join(root, ".arch/quality-reports"), { recursive: true });
    writeFileSync(join(root, ".arch/quality-reports/probe.yaml"), "quality_report:\n  phase: probe\n");
    const findings = qualityReportWritten(root, "probe");
    expect(findings[0]?.status).toBe("pass");
  });
});
