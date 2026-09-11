import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse, stringify } from "yaml";
import { engineDir } from "./paths.ts";
import { listProfiles, profileExists } from "./profile.ts";
import { now } from "./state.ts";

export interface ProjectDescriptor {
  name: string;
  created_at: string;
  /** Human language the domain model is written in. Recorded, not enforced. */
  language: string;
  notes?: string;
}

export interface InitResult {
  root: string;
  created: string[];
  skipped: string[];
  /** Toolkit files replaced by `--upgrade`. */
  refreshed: string[];
  nextSteps: string[];
}

/**
 * Start an ACG project in a directory that is not a clone of this repo.
 *
 * `init` deliberately does **not** copy the coffeeshop. The sample is pedagogy: it
 * ships five known lies on purpose, and inheriting them would hand a new project a
 * board that is red on day one for reasons that are not theirs. So this writes an empty
 * `.arch/`, a project descriptor, and two draft questionnaires — and the board it
 * produces is honestly `[ ]` all the way down.
 */
export function initProject(options: {
  dir?: string;
  name?: string;
  profile?: string;
  language?: string;
  /**
   * Refresh the copied toolkit — schemas, phase skills, reviewer, hooks — from this
   * engine, overwriting what is there. `.arch/` is never touched: your artifacts and
   * your answers are yours. Needed because `init` copies the toolkit, so a project's
   * copy drifts as the engine's phase graph moves on, and `doctor` then reports drift
   * the user has no way to fix.
   */
  upgrade?: boolean;
}): InitResult {
  const root = resolve(options.dir ?? process.cwd());
  const profile = options.profile ?? "generic";
  if (!profileExists(profile)) {
    throw new Error(`Unknown profile "${profile}". Available: ${listProfiles().join(", ")}`);
  }
  const name = options.name ?? root.split("/").filter(Boolean).pop() ?? "project";
  const created: string[] = [];
  const skipped: string[] = [];
  const refreshedPaths: string[] = [];

  const write = (rel: string, body: string): void => {
    const abs = join(root, rel);
    if (existsSync(abs)) {
      skipped.push(rel);
      return;
    }
    mkdirSync(join(abs, "..").replace(/\/\.\.$/, ""), { recursive: true });
    writeFileSync(abs, body, "utf8");
    created.push(rel);
  };

  mkdirSync(join(root, ".arch"), { recursive: true });

  const descriptor: ProjectDescriptor = {
    name,
    created_at: now(),
    language: options.language ?? "en",
    notes: "Written by `acg init`. The engine reads `name` for its state file.",
  };
  write(".arch/acg-project.yaml", stringify({ ...descriptor }, { lineWidth: 100 }));

  write(
    ".arch/assessment-2.yaml",
    `id: assessment-2
# draft → the engine will ask for these before Phase 2 and refuse to lock while any
# required answer is blank. Lock with:
#   bun engine/src/acg.ts assess-lock --id assessment-2
status: draft
answers:
  architecture_style: ""      # modulith | microservices
  team_topology: ""
  communication: ""           # sync_http | async_sns_sqs | in_process_events
  database: ""
  deployment_target: ""       # eks | ecs | lambda | gke | vm | on-prem | none
  region: ""                  # "n/a" when deployment_target is on-prem or none
  iac: ""                     # cdk-typescript | terraform | none
  profile: ${profile}         # where the ecosystem-bound sensors look for values
  # What kind of interface people use. This decides whether actor views, the
  # cross-layer type contract and the whole UX phase apply at all.
  ui_kind: ""                 # spa | mpa | mobile | cli | api-only | none
`,
  );

  write(
    ".arch/assessment-8.yaml",
    `id: assessment-8
status: draft
answers:
  backend_language: ""
  backend_ecosystem: ""       # jvm | node | python | go | dotnet | ruby | other | none
  # Record what was CHOSEN, verbatim, even if the build cannot honour it. The
  # compatibility matrix exists to report that conflict, not to hide it.
  backend_framework_requested: ""
  backend_framework_resolved: ""
  orm: ""
  frontend_framework: ""      # "none" for a system with no UI
  test_stack: ""
  iac: ""
`,
  );

  // The toolkit a project needs to actually run ACG: the schemas the sensors read, the
  // phase skills the conductor loads, the reviewer subagent, and the hooks that make
  // "do not hand-edit the state" enforceable. Without these, `/architect` does not
  // exist and `doctor` reports a dozen missing skills.
  const toolkit = engineDir().replace(/\/engine\/src$/, "");
  for (const rel of ["artifact-schemas", ".claude/commands", ".claude/agents", ".claude/settings.json"]) {
    const from = join(toolkit, rel);
    const to = join(root, rel);
    if (!existsSync(from)) continue;
    if (existsSync(to) && !options.upgrade) {
      skipped.push(rel);
      continue;
    }
    const refreshed = existsSync(to);
    mkdirSync(join(to, "..").replace(/\/\.\.$/, ""), { recursive: true });
    if (refreshed) rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true });
    (refreshed ? refreshedPaths : created).push(rel + (rel.includes(".") ? "" : "/"));
  }

  return {
    root,
    created,
    skipped,
    refreshed: refreshedPaths,
    nextSteps: [
      "Answer .arch/assessment-2.yaml, then: acg.ts assess-lock --id assessment-2",
      "acg.ts status      — the board, honestly [ ] all the way down",
      "acg.ts next --json — what to do first",
      "acg.ts profile     — where the ecosystem-bound sensors will look",
      "acg.ts doctor      — should be green before you start",
    ],
  };
}

export function loadProjectName(root: string): string | null {
  const path = join(root, ".arch/acg-project.yaml");
  if (!existsSync(path)) return null;
  try {
    const doc = parse(readFileSync(path, "utf8")) as ProjectDescriptor | null;
    return doc?.name ?? null;
  } catch {
    return null;
  }
}
