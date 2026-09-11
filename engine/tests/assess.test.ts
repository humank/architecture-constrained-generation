import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import {
  fingerprintAnswers,
  isLocked,
  loadAssessment,
  lockAssessment,
  lockIntegrity,
  lockedAnswer,
} from "../src/assess.ts";
import { loadState } from "../src/state.ts";
import { REPO, cleanup, readArch, scratchRoot, writeArch } from "./helpers.ts";

const roots: string[] = [];
function scratch(): string {
  const r = scratchRoot();
  roots.push(r);
  return r;
}
afterEach(() => {
  while (roots.length) cleanup(roots.pop()!);
});

describe("fingerprint", () => {
  test("key order does not change the fingerprint", () => {
    const a = fingerprintAnswers({ region: "ap-east-2", style: "microservices" });
    const b = fingerprintAnswers({ style: "microservices", region: "ap-east-2" });
    expect(a).toBe(b);
  });

  test("a nested value change does change the fingerprint", () => {
    const a = fingerprintAnswers({ components: ["eks", "rds"] });
    const b = fingerprintAnswers({ components: ["eks", "aurora"] });
    expect(a).not.toBe(b);
  });

  test("nested object key order does not change the fingerprint", () => {
    const a = fingerprintAnswers({ vpc: { azs: 2, nat: 1 } });
    const b = fingerprintAnswers({ vpc: { nat: 1, azs: 2 } });
    expect(a).toBe(b);
  });
});

describe("lockAssessment", () => {
  test("locking writes the fingerprint and records the lock in engine state", () => {
    const root = scratch();
    const doc = readArch<Record<string, unknown>>(root, "assessment-2.yaml");
    doc.status = "draft";
    doc.fingerprint = null;
    writeArch(root, "assessment-2.yaml", doc);
    const locked = lockAssessment("assessment-2", root);
    expect(locked.status).toBe("locked");
    expect(locked.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(loadState(root).locks["assessment-2"]?.fingerprint).toBe(locked.fingerprint!);
  });

  test("a missing required answer refuses the lock", () => {
    const root = scratch();
    const doc = readArch<{ answers: Record<string, unknown> }>(root, "assessment-2.yaml");
    doc.answers.region = "";
    writeArch(root, "assessment-2.yaml", doc);
    expect(() => lockAssessment("assessment-2", root)).toThrow(/missing region/);
  });

  test("assessment-8 has its own required answers", () => {
    const root = scratch();
    const doc = readArch<{ answers: Record<string, unknown> }>(root, "assessment-8.yaml");
    delete doc.answers.test_stack;
    writeArch(root, "assessment-8.yaml", doc);
    expect(() => lockAssessment("assessment-8", root)).toThrow(/missing test_stack/);
  });

  test("an unresolved framework request does not block the lock — the sensor reports it", () => {
    const root = scratch();
    expect(lockAssessment("assessment-8", root).status).toBe("locked");
  });

  test("a missing file cannot be locked", () => {
    const root = scratch();
    rmSync(join(root, ".arch/assessment-2.yaml"));
    expect(() => lockAssessment("assessment-2", root)).toThrow(/Missing assessment-2\.yaml/);
  });
});

describe("lockIntegrity", () => {
  test("the repo's own locks are intact", () => {
    expect(lockIntegrity("assessment-2", REPO).ok).toBe(true);
    expect(lockIntegrity("assessment-8", REPO).ok).toBe(true);
  });

  test("editing an answer after locking is detected", () => {
    const root = scratch();
    const doc = readArch<{ answers: Record<string, unknown> }>(root, "assessment-2.yaml");
    doc.answers.region = "eu-west-1";
    writeArch(root, "assessment-2.yaml", doc);
    const integrity = lockIntegrity("assessment-2", root);
    expect(integrity.ok).toBe(false);
    expect(integrity.message).toMatch(/answers changed after lock/);
  });

  test("a draft assessment is not intact — it is not locked at all", () => {
    const root = scratch();
    const doc = readArch<Record<string, unknown>>(root, "assessment-2.yaml");
    doc.status = "draft";
    writeArch(root, "assessment-2.yaml", doc);
    expect(lockIntegrity("assessment-2", root).message).toMatch(/is draft, not locked/);
    expect(isLocked("assessment-2", root)).toBe(false);
  });
});

describe("lockedAnswer", () => {
  test("reads the value the infrastructure must not restate", () => {
    expect(lockedAnswer("assessment-2", "region", REPO)).toBe("ap-east-2");
  });

  test("refuses to answer from an unlocked assessment", () => {
    const root = scratch();
    const doc = readArch<Record<string, unknown>>(root, "assessment-2.yaml");
    doc.status = "awaiting";
    writeArch(root, "assessment-2.yaml", doc);
    expect(() => lockedAnswer("assessment-2", "region", root)).toThrow(/is not locked/);
  });

  test("refuses to answer from a tampered lock", () => {
    const root = scratch();
    const doc = readArch<{ answers: Record<string, unknown> }>(root, "assessment-2.yaml");
    doc.answers.region = "eu-west-1";
    writeArch(root, "assessment-2.yaml", doc);
    expect(() => lockedAnswer("assessment-2", "region", root)).toThrow(/changed after lock/);
  });

  test("refuses an answer that is not there", () => {
    expect(() => lockedAnswer("assessment-2", "not_a_question", REPO)).toThrow(/no answer for/);
  });

  test("the source markdown stays a rendering, not the source of truth", () => {
    // assessment-8.md still says "Spring Boot 4.x"; the YAML is what the engine reads.
    const doc = loadAssessment("assessment-8", REPO);
    expect(doc?.source_markdown).toBe(".arch/assessment-8.md");
    expect(doc?.answers.backend_framework_requested).toBe("spring-boot-4.x");
  });
});
