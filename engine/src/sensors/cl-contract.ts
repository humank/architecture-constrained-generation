import type { SensorFinding } from "../types.ts";
import { listFiles, readText, repoRoot } from "../load.ts";
import { fail, na, pass, tryYaml, tryYamlAll, walk } from "./util.ts";
import { activeProfile } from "../profile.ts";

const DECLARED = "cl-contract-declared";
const SPECIFIED = "cl-contract-specified";

/**
 * Which checks a boundary needs depends on how it serialises.
 *
 * CL-1..CL-8 are the JSON-over-HTTP set, and several are specifically about Jackson —
 * CL-6 is literally Java's `is` prefix. On a gRPC boundary those are not "the same
 * checks in a different place", they are the wrong checks: protobuf has no null-vs-
 * empty ambiguity and no `is` prefix, but it does have field-number compatibility. So
 * the set is selected by profile, and `none` means the sensor says n/a rather than
 * demanding eight declarations nobody can act on.
 */
const CHECK_SETS: Record<string, string[]> = {
  "http-json-jackson": ["CL-1", "CL-2", "CL-3", "CL-4", "CL-5", "CL-6", "CL-7", "CL-8"],
  // Same wire format, no Jackson: the boolean-naming check does not arise.
  "http-json": ["CL-1", "CL-2", "CL-3", "CL-4", "CL-5", "CL-7", "CL-8"],
  "grpc-proto": ["CL-2", "CL-3", "CL-4", "CL-9", "CL-10"],
};

interface Check {
  id?: string;
  name?: string;
  rule?: string;
  current_status?: string;
}

interface FrontendArchitecture {
  frontend_architecture?: {
    actor_views?: {
      actor?: string;
      pages?: { page?: string; data_source?: { endpoint?: string; query_params?: unknown } }[];
    }[];
    api_contract?: {
      query_endpoints?: { path?: string; query_params?: unknown }[];
      shared_enums?: { name?: string; values?: string[]; used_by?: string[] }[];
    };
    cross_layer_type_contract?: { checks?: Check[] };
  };
}

/**
 * CL-1..CL-8, programmatic (plan §5 後續刀), split across the two phases that own the
 * two halves.
 *
 * `cl-contract-declared` (Phase 3): all eight are declared with a rule, and every query
 * parameter is classified semantic_filter or enum_literal — which is CL-1 itself.
 *
 * `cl-contract-specified` (Phase 4, re-run at Phase 8): each check has a scenario or a
 * contract, or says why it does not apply. Asking this at Phase 3 made Phase 3
 * unpassable on a greenfield project, because Phase 4 had not run yet.
 */
interface Loaded {
  required: string[];
  fa: FrontendArchitecture["frontend_architecture"];
  declared: Map<string, Check>;
}

function load(sensor: string, root: string): Loaded | SensorFinding[] {
  const { profile } = activeProfile(root);
  const required = CHECK_SETS[profile.cl_check_set];
  if (!required) {
    return [
      na(
        sensor,
        `profile "${profile.id}" selects cl_check_set "${profile.cl_check_set}", which defines no cross-layer checks`,
      ),
    ];
  }
  const loaded = tryYaml<FrontendArchitecture>(
    sensor,
    ".arch/03-tactical/frontend-architecture.yaml",
    root,
  );
  if (loaded.finding) return [loaded.finding];
  const fa = loaded.doc.frontend_architecture;
  const checks = fa?.cross_layer_type_contract?.checks ?? [];
  return { required, fa, declared: new Map(checks.filter((c) => c.id).map((c) => [c.id!, c])) };
}

/** Phase 3: all eight declared with a rule, and every query parameter classified. */
export function clContractDeclared(root = repoRoot()): SensorFinding[] {
  const loaded = load(DECLARED, root);
  if (Array.isArray(loaded)) return loaded;
  const { required, fa, declared } = loaded;
  const findings: SensorFinding[] = [];

  for (const id of required) {
    const check = declared.get(id);
    if (!check) {
      findings.push(fail(DECLARED, `${id} is not declared in frontend-architecture.yaml cross_layer_type_contract`));
      continue;
    }
    if (!check.rule?.trim() && !/not applicable/i.test(check.current_status ?? "")) {
      findings.push(fail(DECLARED, `${id} is declared without a rule`));
    }
  }

  // CL-1 itself: every query param, wherever it is declared, is classified.
  for (const view of fa?.actor_views ?? []) {
    for (const page of view.pages ?? []) {
      const endpoint = page.data_source?.endpoint;
      if (!endpoint || !endpoint.includes("?")) continue;
      for (const problem of unclassified(page.data_source?.query_params)) {
        findings.push(
          fail(DECLARED, `CL-1: ${view.actor} / ${page.page} endpoint "${endpoint}" ${problem}`),
        );
      }
    }
  }
  for (const endpoint of fa?.api_contract?.query_endpoints ?? []) {
    if (!endpoint.path?.includes("?")) continue;
    for (const problem of unclassified(endpoint.query_params)) {
      findings.push(fail(DECLARED, `CL-1: api_contract "${endpoint.path}" ${problem}`));
    }
  }

  // CL-2: an enum shared across the boundary must list its values exactly once, and
  // must agree with the aggregate that owns it.
  const owned = aggregateEnums(root);
  for (const shared of fa?.api_contract?.shared_enums ?? []) {
    if (!shared.name) continue;
    if (!shared.values?.length) {
      findings.push(fail(DECLARED, `CL-2: shared enum ${shared.name} declares no values`));
      continue;
    }
    if (!shared.used_by?.includes("frontend")) {
      findings.push(
        fail(DECLARED, `CL-2: shared enum ${shared.name} is not marked used_by frontend — it is not a cross-layer contract then`),
      );
    }
    const domain = owned.get(shared.name);
    if (!domain) continue; // not an aggregate enum; nothing to compare it with
    const extra = shared.values.filter((v) => !domain.values.includes(v));
    const missing = domain.values.filter((v) => !shared.values!.includes(v));
    if (extra.length) {
      findings.push(
        fail(
          DECLARED,
          `CL-2: shared enum ${shared.name} offers [${extra.join(", ")}] to the frontend, but ${domain.aggregate} does not define them — a value the domain cannot produce`,
        ),
      );
    }
    if (missing.length) {
      findings.push(
        fail(
          DECLARED,
          `CL-2: ${domain.aggregate} defines ${shared.name} value(s) [${missing.join(", ")}] that the shared enum withholds from the frontend`,
        ),
      );
    }
  }

  if (findings.length === 0) {
    return [pass(DECLARED, `${required.length} cross-layer check(s) declared with a rule; query params classified`)];
  }
  return findings;
}

/** Phase 4 onward: each check is specified, or says why it does not apply. */
export function clContractSpecified(root = repoRoot()): SensorFinding[] {
  const loaded = load(SPECIFIED, root);
  if (Array.isArray(loaded)) return loaded;
  const { required, declared } = loaded;

  const featureText = walk(root, ".arch/04-specification/features", ".feature")
    .map((f) => readText(f, root))
    .join("\n");
  const contractText = listFiles(".arch/04-specification/contracts", root, ".yaml")
    .map((f) => readText(f, root))
    .join("\n");
  const specified = `${featureText}\n${contractText}`;
  if (!specified.trim()) {
    return [na(SPECIFIED, "no Phase 4 features or contracts exist yet, so nothing can specify the checks")];
  }

  const findings: SensorFinding[] = [];
  for (const id of required) {
    const check = declared.get(id);
    if (!check) continue; // cl-contract-declared owns that complaint
    if (new RegExp(`\\b${id}\\b`).test(specified)) continue;
    if (/not applicable/i.test(check.current_status ?? "")) continue;
    findings.push(
      fail(
        SPECIFIED,
        `${id} ("${check.name}") has no scenario or contract in Phase 4 and does not declare current_status: "Not applicable"`,
      ),
    );
  }
  if (findings.length === 0) {
    return [pass(SPECIFIED, `${required.length} cross-layer check(s) specified in Phase 4 or declared not applicable`)];
  }
  return findings;
}

/**
 * A query parameter is classified when the CL-1 distinction is recorded — either on
 * the parameter itself (`type:`) or per accepted value (`valid_values[].type`), which
 * is how api_contract spells it when one parameter accepts both kinds.
 */
function unclassified(params: unknown): string[] {
  if (params == null) return ["declares a query string but no query_params"];
  const list = Array.isArray(params) ? params : [params];
  const entries = list.filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object");
  if (entries.length === 0) return ["declares a query string but no query_params"];

  const problems: string[] = [];
  for (const param of entries) {
    const name = typeof param.name === "string" ? param.name : "(unnamed)";
    const values = param.valid_values;
    if (Array.isArray(values)) {
      const untyped = values.filter((v) => !isClassified((v as Record<string, unknown>)?.type));
      if (untyped.length) {
        problems.push(
          `parameter "${name}" has ${untyped.length} accepted value(s) not typed semantic_filter or enum_literal`,
        );
      }
      continue;
    }
    if (!isClassified(param.type)) {
      problems.push(`parameter "${name}" is not typed semantic_filter or enum_literal`);
    }
  }
  return problems;
}

function isClassified(type: unknown): boolean {
  return type === "semantic_filter" || type === "enum_literal";
}

interface DomainEnum {
  values: string[];
  aggregate: string;
}

/** Enum value objects declared by the aggregates, keyed by enum name. */
function aggregateEnums(root: string): Map<string, DomainEnum> {
  const out = new Map<string, DomainEnum>();
  for (const file of listFiles(".arch/03-tactical/aggregates", root, ".yaml")) {
    const loaded = tryYamlAll<{
      aggregate?: { name?: string; value_objects?: { name?: string; type?: string; values?: string[] }[] };
    }>(DECLARED, file, root);
    if (loaded.finding) continue;
    for (const doc of loaded.docs) {
      const agg = doc.aggregate;
      if (!agg?.name) continue;
      for (const vo of agg.value_objects ?? []) {
        if (vo.type === "enum" && vo.name && vo.values?.length) {
          out.set(vo.name, { values: vo.values, aggregate: agg.name });
        }
      }
    }
  }
  return out;
}
