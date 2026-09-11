import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { activeProfile, listProfiles, loadProfile, resolveProfileId } from "../src/profile.ts";
import { decisionNotRestated } from "../src/sensors/decision-not-restated.ts";
import { frameworkVersionMatrix } from "../src/sensors/framework-version-matrix.ts";
import { clContractDeclared, clContractSpecified } from "../src/sensors/cl-contract.ts";
import { glossaryOrigin } from "../src/sensors/glossary-origin.ts";
import { lockAssessment } from "../src/assess.ts";
import { REPO, cleanup, fails, readArch, scratchRoot, writeArch } from "./helpers.ts";

const roots: string[] = [];
function scratch(): string {
  const r = scratchRoot();
  roots.push(r);
  return r;
}
afterEach(() => {
  while (roots.length) cleanup(roots.pop()!);
});

function relock(root: string, id: string, answers: Record<string, unknown>): void {
  const doc = readArch<{ answers: Record<string, unknown> }>(root, `${id}.yaml`);
  Object.assign(doc.answers, answers);
  writeArch(root, `${id}.yaml`, doc);
  lockAssessment(id, root);
}

describe("profiles", () => {
  test("every shipped profile loads and inherits cleanly", () => {
    for (const id of listProfiles()) {
      const p = loadProfile(id);
      expect(p.id).toBe(id);
      expect(Array.isArray(p.sources.roots)).toBe(true);
      expect(Array.isArray(p.vocabulary.event_suffixes)).toBe(true);
    }
  });

  test("inheritance merges onto the base rather than replacing it", () => {
    const tf = loadProfile("terraform-aws");
    // terraform-aws overrides only the region sources and the messaging file
    expect(tf.messaging.file).toBe("iac/modules/messaging/main.tf");
    expect(tf.pinned_values.region!.some((s) => s.file.endsWith(".tf"))).toBe(true);
    expect(tf.pinned_values.region!.some((s) => s.file === "iac/config/staging.ts")).toBe(false);
    // and inherits the frontend and vocabulary from aws-cdk-ts
    expect(tf.frontend.router).toBe("frontend/src/router.tsx");
    expect(tf.vocabulary.technical).toContain("outbox");
    expect(tf.cl_check_set).toBe("http-json-jackson");
  });

  test("generic asserts nothing about any ecosystem", () => {
    const g = loadProfile("generic");
    expect(g.pinned_values).toEqual({});
    expect(g.frontend.router).toBeNull();
    expect(g.sources.roots).toEqual([]);
    expect(g.cl_check_set).toBe("none");
    expect(g.vocabulary.technical).toEqual([]);
  });

  test("an unknown profile is refused with the list of real ones", () => {
    expect(() => loadProfile("nonsense")).toThrow(/Available: /);
  });
});

describe("profile resolution", () => {
  test("the coffeeshop resolves to aws-cdk-ts from its locked iac answer", () => {
    const { id, reason } = resolveProfileId(REPO);
    expect(id).toBe("aws-cdk-ts");
    expect(reason).toContain("iac=cdk-typescript");
  });

  test("an explicit profile answer wins over inference", () => {
    const root = scratch();
    relock(root, "assessment-2", { profile: "terraform-aws" });
    expect(resolveProfileId(root)).toEqual({
      id: "terraform-aws",
      reason: "assessment-2.profile=terraform-aws",
    });
  });

  test("an unknown explicit profile falls back to generic and says so", () => {
    const root = scratch();
    relock(root, "assessment-2", { profile: "made-up" });
    const { id, reason } = resolveProfileId(root);
    expect(id).toBe("generic");
    expect(reason).toContain("not a known profile");
  });

  test("terraform on GCP resolves to the GCP profile", () => {
    const root = scratch();
    relock(root, "assessment-2", { iac: "terraform", deployment_target: "gke" });
    expect(resolveProfileId(root).id).toBe("gcp-terraform");
  });

  test("an on-prem project resolves to the no-cloud profile", () => {
    const root = scratch();
    relock(root, "assessment-2", { deployment_target: "on-prem" });
    expect(resolveProfileId(root).id).toBe("none");
  });
});

describe("the same rule, a different stack", () => {
  test("decision-not-restated reads .tf files under the terraform profile", () => {
    const root = scratch();
    relock(root, "assessment-2", { profile: "terraform-aws" });
    mkdirSync(join(root, "iac/environments/staging"), { recursive: true });
    mkdirSync(join(root, "iac/environments/production"), { recursive: true });
    writeFileSync(join(root, "iac/environments/staging/main.tf"), 'provider "aws" {\n  region = "us-east-1"\n}\n');
    writeFileSync(join(root, "iac/environments/production/main.tf"), 'provider "aws" {\n  region = "us-east-1"\n}\n');
    const bad = fails(decisionNotRestated(root));
    expect(bad.length).toBe(1);
    expect(bad[0]!.message).toContain("main.tf=us-east-1");
    expect(bad[0]!.message).toContain("ap-east-2");
    // the CDK files are not consulted at all on this profile
    expect(bad[0]!.message).not.toContain("iac/config/staging.ts");
  });

  test("agreement passes on the terraform profile too", () => {
    const root = scratch();
    relock(root, "assessment-2", { profile: "terraform-aws", region: "eu-west-1" });
    mkdirSync(join(root, "iac/environments/staging"), { recursive: true });
    mkdirSync(join(root, "iac/environments/production"), { recursive: true });
    for (const env of ["staging", "production"]) {
      writeFileSync(join(root, `iac/environments/${env}/main.tf`), 'provider "aws" {\n  region = "eu-west-1"\n}\n');
    }
    writeFileSync(join(root, ".arch/05-delivery/deployment-strategy.yaml"), "region: eu-west-1\n");
    expect(fails(decisionNotRestated(root))).toEqual([]);
  });

  test("a profile that pins nothing reports na instead of failing", () => {
    const root = scratch();
    relock(root, "assessment-2", { profile: "none" });
    const findings = decisionNotRestated(root);
    expect(findings[0]!.status).toBe("na");
    expect(findings[0]!.message).toMatch(/pins no values/);
  });

  test("the version matrix reads pyproject.toml for a python backend", () => {
    const root = scratch();
    relock(root, "assessment-2", { profile: "gcp-terraform" });
    relock(root, "assessment-8", {
      backend_ecosystem: "python",
      backend_framework_requested: "fastapi-0.115",
      backend_framework_resolved: "",
    });
    writeFileSync(join(root, "pyproject.toml"), '[tool.poetry.dependencies]\nfastapi = "^0.109.0"\n');
    const bad = fails(frameworkVersionMatrix(root));
    expect(bad.length).toBe(1);
    expect(bad[0]!.message).toContain("pyproject.toml");
    expect(bad[0]!.message).toContain("0.109.0");
  });

  test("an explicit resolution reconciles the request on any ecosystem", () => {
    const root = scratch();
    relock(root, "assessment-2", { profile: "gcp-terraform" });
    relock(root, "assessment-8", {
      backend_ecosystem: "python",
      backend_framework_requested: "fastapi-0.115",
      backend_framework_resolved: "fastapi-0.109.0",
    });
    writeFileSync(join(root, "pyproject.toml"), '[tool.poetry.dependencies]\nfastapi = "^0.109.0"\n');
    expect(fails(frameworkVersionMatrix(root))).toEqual([]);
  });

  test("an ecosystem the profile knows nothing about reports na", () => {
    const root = scratch();
    relock(root, "assessment-8", { backend_ecosystem: "ruby" });
    const findings = frameworkVersionMatrix(root);
    expect(findings[0]!.status).toBe("na");
    expect(findings[0]!.message).toMatch(/knows no build file for ecosystem "ruby"/);
  });

  test("the cross-layer check set is selected by profile", () => {
    const root = scratch();
    relock(root, "assessment-2", { profile: "gcp-terraform" }); // cl_check_set: http-json
    const bad = fails(clContractDeclared(root));
    // CL-6 is a Jackson-specific check; it is not in the http-json set, so its absence
    // from a Phase 4 scenario is not a finding here.
    expect(bad.some((f) => /^CL-6/.test(f.message))).toBe(false);
  });

  test("cl_check_set none makes the whole sensor na", () => {
    const root = scratch();
    relock(root, "assessment-2", { profile: "none" });
    const findings = clContractDeclared(root);
    expect(findings[0]!.status).toBe("na");
    expect(findings[0]!.message).toMatch(/defines no cross-layer checks/);
  });
});

describe("vocabulary is a project input", () => {
  test("a project whose domain IS infrastructure can keep its own language", () => {
    const root = scratch();
    // A queueing product legitimately has "Outbox" and "Dead Letter Queue" as domain
    // terms. The engine must not overrule that.
    writeFileSync(
      join(root, ".arch/glossary-policy.yaml"),
      "glossary_policy:\n  technical_vocabulary: []\n",
    );
    const doc = readArch<{ glossary: { terms: { term: string; origin?: string }[] } }>(root, "glossary.yaml");
    for (const t of doc.glossary.terms) {
      if (t.origin === "technical") t.origin = "dst";
    }
    writeArch(root, "glossary.yaml", doc);
    expect(fails(glossaryOrigin(root))).toEqual([]);
  });

  test("the active profile is reported so nobody has to guess", () => {
    const { profile, reason } = activeProfile(REPO);
    expect(profile.id).toBe("aws-cdk-ts");
    expect(reason).toBeTruthy();
  });
});
