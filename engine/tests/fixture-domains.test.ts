import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { schemaDst } from "../src/sensors/schema-dst.ts";
import { storyMapCoverage } from "../src/sensors/story-map-coverage.ts";
import { dstStormCorrespondence } from "../src/sensors/dst-storm.ts";
import { hotspotClassified } from "../src/sensors/hotspot-classified.ts";
import { swimlaneIsStory } from "../src/sensors/swimlane-story.ts";
import { handoffEqualsContextMap } from "../src/sensors/handoff-context-map.ts";
import { ephemeralNotPersisted } from "../src/sensors/ephemeral-not-persisted.ts";
import { glossaryOrigin } from "../src/sensors/glossary-origin.ts";
import { godAggregate } from "../src/sensors/god-aggregate.ts";
import { actorViewSourcedFromDst } from "../src/sensors/actor-view-sourced.ts";
import { clContractDeclared, clContractSpecified } from "../src/sensors/cl-contract.ts";
import { decisionNotRestated } from "../src/sensors/decision-not-restated.ts";
import { frameworkVersionMatrix } from "../src/sensors/framework-version-matrix.ts";
import { messagingMatchesContextMap } from "../src/sensors/messaging-context-map.ts";
import { filesExist } from "../src/sensors/files-exist.ts";
import { docsEventsMatchStorm } from "../src/sensors/docs-events.ts";
import { sourceFingerprint } from "../src/sensors/source-fingerprint.ts";
import { commandsImplemented } from "../src/sensors/commands-implemented.ts";
import { resolveProfileId } from "../src/profile.ts";
import { cleanup, editArchText, fails, fixtureRoot, lockFixture } from "./helpers.ts";

const roots: string[] = [];
function domain(name: "parcel-locker" | "etl-batch"): string {
  const r = fixtureRoot(name);
  lockFixture(r);
  roots.push(r);
  return r;
}
afterEach(() => {
  while (roots.length) cleanup(roots.pop()!);
});

/**
 * These are the sensors that read only `.arch/` — the constraint chain itself. They
 * must hold on any domain, so they are tested on domains that are not the sample.
 */
const ARTIFACT_SENSORS = {
  "schema-dst": schemaDst,
  "story-map-coverage": storyMapCoverage,
  "dst-storm-correspondence": dstStormCorrespondence,
  "hotspot-classified": hotspotClassified,
  "swimlane-is-story": swimlaneIsStory,
  "handoff-equals-context-map": handoffEqualsContextMap,
  "ephemeral-not-persisted": ephemeralNotPersisted,
  "glossary-origin": glossaryOrigin,
};

describe("parcel-locker: a second domain with a UI and a cloud", () => {
  test("every artifact-level sensor is green", () => {
    const root = domain("parcel-locker");
    for (const [name, run] of Object.entries(ARTIFACT_SENSORS)) {
      expect(fails(run(root)), `${name} should pass on parcel-locker`).toEqual([]);
    }
  });

  test("god-aggregate stays advisory and finds nothing to warn about", () => {
    const findings = godAggregate(domain("parcel-locker"));
    expect(findings.every((f) => f.blocking === false)).toBe(true);
    expect(findings.filter((f) => f.status === "warn")).toEqual([]);
  });

  test("the cross-BC handoff is on its context map", () => {
    // DS-01.4 hands the collection code from Courier (Storage) to Recipient (Custody).
    const findings = handoffEqualsContextMap(domain("parcel-locker"));
    expect(fails(findings)).toEqual([]);
  });

  test("breaking the story→event link is caught here too, not only in the sample", () => {
    const root = domain("parcel-locker");
    editArchText(root, "01-discovery/event-storm.yaml", (t) =>
      t.replace("      sourced_from: [DS-01.2]\n", ""),
    );
    const bad = fails(dstStormCorrespondence(root));
    expect(bad.some((f) => /DS-01\.2/.test(f.message))).toBe(true);
    expect(bad.some((f) => /LockerReserved/.test(f.message))).toBe(true);
  });

  test("an unclassified hot spot is caught here too", () => {
    const root = domain("parcel-locker");
    editArchText(root, "01-discovery/event-storm.yaml", (t) =>
      t.replace("      kind: fact-unknown\n", ""),
    );
    expect(fails(hotspotClassified(root)).some((f) => /is not classified/.test(f.message))).toBe(
      true,
    );
  });
});

describe("etl-batch: no UI, no cloud, Python, Chinese domain language", () => {
  test("every artifact-level sensor is green on a Chinese domain model", () => {
    const root = domain("etl-batch");
    for (const [name, run] of Object.entries(ARTIFACT_SENSORS)) {
      expect(fails(run(root)), `${name} should pass on etl-batch`).toEqual([]);
    }
  });

  test("it resolves to the no-cloud profile", () => {
    expect(resolveProfileId(domain("etl-batch")).id).toBe("none");
  });

  test("the frontend sensors report na, not fail", () => {
    const root = domain("etl-batch");
    for (const run of [actorViewSourcedFromDst, clContractDeclared]) {
      const findings = run(root);
      expect(findings.every((f) => f.status !== "fail")).toBe(true);
      expect(findings.some((f) => f.status === "na")).toBe(true);
    }
  });

  test("the cloud and JVM sensors report na, not fail", () => {
    const root = domain("etl-batch");
    for (const run of [decisionNotRestated, frameworkVersionMatrix]) {
      const findings = run(root);
      expect(findings.every((f) => f.status !== "fail")).toBe(true);
      expect(findings.some((f) => f.status === "na")).toBe(true);
    }
  });

  test("a Chinese actor mismatch is still caught — CJK must not match everything", () => {
    // The regression this fixture exists for: 對帳人員 and 系統 both used to
    // normalise to "" and therefore "match".
    const root = domain("etl-batch");
    editArchText(root, "01-discovery/event-storm.yaml", (t) =>
      t.replace("actor: 對帳人員", "actor: 系統"),
    );
    const bad = fails(dstStormCorrespondence(root));
    expect(bad.length).toBeGreaterThan(0);
    expect(bad.some((f) => /系統/.test(f.message) && /對帳人員/.test(f.message))).toBe(true);
  });

  test("a Chinese work object with no read model is still caught", () => {
    const root = domain("etl-batch");
    editArchText(root, "01-discovery/event-model.yaml", (t) =>
      t.replace('read_model: "差異清單（逐筆）"', 'read_model: "Reconciliation output"'),
    );
    expect(fails(swimlaneIsStory(root)).some((f) => /DS-01\.4/.test(f.message))).toBe(true);
  });

  test("a Chinese term missing from the glossary is still caught", () => {
    const root = domain("etl-batch");
    editArchText(root, "glossary.yaml", (t) =>
      t.replace(/    - term: 交易檔\n(?:      .*\n)+/, ""),
    );
    expect(fails(glossaryOrigin(root)).some((f) => /交易檔/.test(f.message))).toBe(true);
  });

  test("a Chinese MVP story with no domain story is still caught", () => {
    const root = domain("etl-batch");
    editArchText(root, "01-discovery/domain-stories/01-daily-reconciliation.yaml", (t) =>
      t.replace("covers: [US-01, US-02]", "covers: [US-01]"),
    );
    expect(fails(storyMapCoverage(root)).some((f) => /US-02/.test(f.message))).toBe(true);
  });

  test("n/a is never silently a pass — every skip states its reason", () => {
    const root = domain("etl-batch");
    for (const run of [actorViewSourcedFromDst, clContractDeclared, decisionNotRestated, frameworkVersionMatrix]) {
      for (const f of run(root).filter((x) => x.status === "na")) {
        expect(f.message.length).toBeGreaterThan(20);
        expect(f.blocking).toBe(false);
      }
    }
  });
});

describe("no sensor may pass without checking anything", () => {
  /**
   * Found live: `handoff-equals-context-map` reported `pass` on a design where every
   * handoff was inside one bounded context — it had examined zero edges and said so as
   * a pass. "A sensor that cannot evaluate must say na, never pass" was already the
   * stated rule; this pins it for the whole catalogue, because a vacuous pass is
   * indistinguishable from a real one at the gate.
   */
  test("a design with no cross-context handoff reports na, not pass", () => {
    // etl-batch has one context and no handoff steps at all.
    const findings = handoffEqualsContextMap(domain("etl-batch"));
    expect(findings.some((f) => f.status === "pass")).toBe(false);
    const verdict = findings.find((f) => f.status === "na");
    expect(verdict).toBeDefined();
    expect(verdict!.message).toMatch(/share a bounded context|handoff/);
  });

  test("a design with no message channels reports na, not pass", () => {
    const findings = messagingMatchesContextMap(domain("etl-batch"));
    expect(findings.some((f) => f.status === "pass")).toBe(false);
    expect(findings.some((f) => f.status === "na")).toBe(true);
  });

  test("a phase that declares no inputs reports na, not pass", () => {
    const findings = filesExist(domain("parcel-locker"), "00-requirements");
    expect(findings[0]!.status).toBe("na");
    expect(findings[0]!.message).toMatch(/declares no inputs/);
  });

  test("every pass message states what was actually examined", () => {
    // A pass whose message contains no number is a pass nobody can audit.
    const root = domain("parcel-locker");
    const passes = [
      ...schemaDst(root),
      ...storyMapCoverage(root),
      ...dstStormCorrespondence(root),
      ...hotspotClassified(root),
      ...swimlaneIsStory(root),
      ...glossaryOrigin(root),
    ].filter((f) => f.status === "pass");
    expect(passes.length).toBeGreaterThan(4);
    for (const f of passes) {
      expect(f.message, `"${f.message}" should say how much it checked`).toMatch(/\d/);
    }
  });
});

describe("a modulith on an in-process bus has no messaging infrastructure", () => {
  /**
   * Found live: the sensor demanded `iac/lib/messaging-stack.ts` from a modulith whose
   * context map carries in-process events. It was loading the infrastructure file
   * before asking whether the design had any channels at all — so the answer depended
   * on a file existing rather than on the design.
   */
  test("no topic or queue on any edge reports na, whatever the profile", () => {
    const root = domain("parcel-locker"); // in-process event bus, no topics
    const findings = messagingMatchesContextMap(root);
    expect(findings[0]!.status).toBe("na");
    expect(findings[0]!.message).toMatch(/no topic or queue/);
    expect(findings.some((f) => /Missing/.test(f.message))).toBe(false);
  });
});

describe("docs-events scans the prose the phase actually produced", () => {
  /**
   * Found by the independent reviewer, not by any test here: the sensor is mounted on
   * both 06-review and 07-documentation but only ever scanned `.arch/07-documentation/`.
   * At 06 it therefore reported `na` "no documentation has been written yet" while that
   * very phase had produced viewpoints, ADRs and perspectives full of event names. A
   * green sensor that scanned none of the prose under review is worse than no sensor,
   * because the gate reads it as evidence.
   */
  test("it reads 06-review's own prose when mounted on 06-review", () => {
    const root = domain("parcel-locker");
    mkdirSync(join(root, ".arch/06-review/adrs"), { recursive: true });
    writeFileSync(
      join(root, ".arch/06-review/adrs/adr-001.md"),
      "# ADR-001\n\nOn ParcelDeposited the locker is closed.\n",
    );
    writeFileSync(join(root, ".arch/06-review/perspectives.md"), "# Perspectives\n");
    const findings = docsEventsMatchStorm(root, "06-review");
    expect(findings[0]!.status).toBe("pass");
    expect(findings[0]!.message).toMatch(/\d+ documentation file/);
  });

  test("an invented event name in a Phase 6 ADR is caught, not ignored", () => {
    const root = domain("parcel-locker");
    mkdirSync(join(root, ".arch/06-review/adrs"), { recursive: true });
    writeFileSync(
      join(root, ".arch/06-review/adrs/adr-001.md"),
      "# ADR-001\n\nWe react to ParcelShipped, which the storm never names.\n",
    );
    const bad = fails(docsEventsMatchStorm(root, "06-review"));
    expect(bad.some((f) => /ParcelShipped/.test(f.message))).toBe(true);
  });

  test("the suffix vocabulary is the known limit, and it under-reports on purpose", () => {
    // "Returned" is not in the profile's event_suffixes, so `ParcelReturned` slips
    // through. That is the documented trade: missing an unconventional name beats
    // arguing with every capitalised noun in every document. The fix is to extend
    // `vocabulary.event_suffixes` in the profile, not to widen the regex.
    const root = domain("parcel-locker");
    mkdirSync(join(root, ".arch/06-review/adrs"), { recursive: true });
    writeFileSync(
      join(root, ".arch/06-review/adrs/adr-001.md"),
      "# ADR-001\n\nWe react to ParcelReturned, which the storm never names.\n",
    );
    expect(fails(docsEventsMatchStorm(root, "06-review"))).toEqual([]);
  });

  test("with no prose yet it says which directories it looked in", () => {
    const findings = docsEventsMatchStorm(domain("parcel-locker"), "07-documentation");
    expect(findings[0]!.status).toBe("na");
    expect(findings[0]!.message).toMatch(/07-documentation/);
  });
});

describe("CL-2 compares the shared enum with the aggregate that owns it", () => {
  /**
   * CL-2's own rule says enum values must match exactly across the layers, but the
   * sensor was only checking that a shared enum had *some* values. Found live: a redo
   * removed `UnderReview` from the `Talk` aggregate and `shared_enums` kept offering it
   * to the frontend — a value the domain can never produce. That drift is decidable, so
   * it belongs here rather than in the reviewer's lap.
   */
  test("an extra shared value the domain cannot produce is refused", () => {
    const root = domain("parcel-locker");
    writeFileSync(
      join(root, ".arch/03-tactical/frontend-architecture.yaml"),
      `frontend_architecture:
  actor_views:
    - actor: Courier
      pages:
        - page: Reserve
          path: "/courier/reserve"
          sourced_from: [DS-01.2]
  api_contract:
    shared_enums:
      - name: LockerSize
        values: [Small, Medium, Large, Enormous]
        used_by: [api, frontend]
  cross_layer_type_contract:
    checks:
${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `      - { id: CL-${n}, name: c${n}, rule: "r${n}" }`).join("\n")}
`,
    );
    const bad = fails(clContractDeclared(root));
    expect(bad.some((f) => /CL-2.*Enormous.*Locker does not define/.test(f.message))).toBe(true);
  });

  test("a domain value withheld from the frontend is refused", () => {
    const root = domain("parcel-locker");
    writeFileSync(
      join(root, ".arch/03-tactical/frontend-architecture.yaml"),
      `frontend_architecture:
  actor_views:
    - actor: Courier
      pages:
        - page: Reserve
          path: "/courier/reserve"
          sourced_from: [DS-01.2]
  api_contract:
    shared_enums:
      - name: LockerSize
        values: [Small, Medium]
        used_by: [api, frontend]
  cross_layer_type_contract:
    checks:
${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `      - { id: CL-${n}, name: c${n}, rule: "r${n}" }`).join("\n")}
`,
    );
    const bad = fails(clContractDeclared(root));
    expect(bad.some((f) => /CL-2.*Large.*withholds/.test(f.message))).toBe(true);
  });

  test("an enum no aggregate owns is not second-guessed", () => {
    const root = domain("parcel-locker");
    writeFileSync(
      join(root, ".arch/03-tactical/frontend-architecture.yaml"),
      `frontend_architecture:
  actor_views:
    - actor: Courier
      pages:
        - page: Reserve
          path: "/courier/reserve"
          sourced_from: [DS-01.2]
  api_contract:
    shared_enums:
      - name: SortOrder
        values: [Newest, Oldest]
        used_by: [api, frontend]
  cross_layer_type_contract:
    checks:
${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `      - { id: CL-${n}, name: c${n}, rule: "r${n}" }`).join("\n")}
`,
    );
    expect(fails(clContractDeclared(root)).filter((f) => /CL-2/.test(f.message))).toEqual([]);
  });
});

describe("names are not substance", () => {
  /**
   * The reviewer's sharpest line about this engine: "the sensors match names, and what
   * was delivered is names." Four E2E files containing one comment each satisfied
   * `source-fingerprint`'s story-naming check, and none of four designed commands
   * existed while the event types, routes and test filenames all "matched". Both gaps
   * are decidable, so neither belongs in a reviewer's lap.
   */
  function withSource(root: string, files: Record<string, string>): void {
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(join(root, rel, ".."), { recursive: true });
      writeFileSync(join(root, rel), body);
    }
  }

  test("an E2E file named after a story but declaring no test is refused", () => {
    const root = domain("parcel-locker");
    withSource(root, {
      "frontend/e2e/DS-01-drop.spec.ts": "// End-to-end replay of DS-01 — named on purpose\n",
    });
    const bad = fails(sourceFingerprint(root));
    expect(bad.some((f) => /named after DS-01 but declares no test/.test(f.message))).toBe(true);
  });

  test("the same file with a real test satisfies it", () => {
    const root = domain("parcel-locker");
    withSource(root, {
      "frontend/e2e/DS-01-drop.spec.ts":
        'import { test, expect } from "@playwright/test";\n\ntest("DS-01 drop and collect", async () => {\n  expect(1).toBe(1);\n});\n',
    });
    expect(fails(sourceFingerprint(root)).some((f) => /declares no test/.test(f.message))).toBe(
      false,
    );
  });

  test("a declared command that exists nowhere in the source is refused", () => {
    const root = domain("parcel-locker");
    withSource(root, { "services/locker/locker.ts": "export class Locker {}\n" });
    const bad = fails(commandsImplemented(root));
    expect(bad.some((f) => /ReserveLocker, which appears nowhere/.test(f.message))).toBe(true);
  });

  test("a command named only in a comment does not count as implemented", () => {
    // The first version of this sensor was satisfied by exactly this.
    const root = domain("parcel-locker");
    withSource(root, {
      "services/locker/locker.ts":
        "// Reserved by ReserveLocker and nothing else.\n/* also DepositParcel */\nexport class Locker {}\n",
    });
    const bad = fails(commandsImplemented(root));
    expect(bad.some((f) => /ReserveLocker/.test(f.message))).toBe(true);
    expect(bad.some((f) => /DepositParcel/.test(f.message))).toBe(true);
  });

  test("a command that does appear in code passes", () => {
    const root = domain("parcel-locker");
    withSource(root, {
      "services/locker/locker.ts":
        "export class ReserveLocker {}\nexport class DepositParcel {}\nexport class CollectParcel {}\n",
    });
    expect(fails(commandsImplemented(root))).toEqual([]);
  });

  test("no source at all is a failure, not a vacuous pass", () => {
    const root = domain("parcel-locker");
    const bad = fails(commandsImplemented(root));
    expect(bad.length).toBeGreaterThan(0);
    expect(bad[0]!.message).toMatch(/no source found under/);
  });
});
