import Ajv, { type ValidateFunction } from "ajv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAllDocuments } from "yaml";
import type { SensorFinding } from "../types.ts";
import { listFiles, repoRoot } from "../load.ts";

let validator: ValidateFunction | null = null;

function getValidator(root: string): ValidateFunction {
  if (validator) return validator;
  const schema = JSON.parse(
    readFileSync(join(root, "artifact-schemas/domain-story.schema.json"), "utf8"),
  );
  delete schema.$schema;
  const ajv = new Ajv({ allErrors: true, strict: false, validateSchema: false });
  validator = ajv.compile(schema);
  return validator;
}

export function schemaDst(root = repoRoot()): SensorFinding[] {
  const validate = getValidator(root);
  const files = listFiles(".arch/01-discovery/domain-stories", root, ".yaml");
  if (files.length === 0) {
    return [
      {
        sensor: "schema-dst",
        status: "fail",
        blocking: true,
        message: "No domain story files under .arch/01-discovery/domain-stories/",
      },
    ];
  }

  const findings: SensorFinding[] = [];
  for (const file of files) {
    const docs = parseAllDocuments(readFileSync(join(root, file), "utf8"));
    for (const doc of docs) {
      const json = doc.toJSON();
      if (!json) continue;
      if (json.domain_story && !json.story) {
        findings.push({
          sensor: "schema-dst",
          status: "fail",
          blocking: true,
          message: `${file}: legacy domain_story prose is not a sentence story (missing story.steps)`,
        });
        continue;
      }
      const ok = validate(json);
      if (!ok) {
        const err = (validate.errors ?? [])
          .map((e) => `${e.instancePath || "/"} ${e.message}`)
          .join("; ");
        findings.push({
          sensor: "schema-dst",
          status: "fail",
          blocking: true,
          message: `${file}: ${err}`,
        });
      }
    }
  }
  if (findings.length === 0) {
    findings.push({
      sensor: "schema-dst",
      status: "pass",
      blocking: true,
      message: `${files.length} domain story file(s) match schema`,
    });
  }
  return findings;
}
