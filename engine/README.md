# ACG Engine

Deterministic runtime for Architecture Constrained Generation.

The LLM writes artifacts, asks the human questions, and explains. **This engine owns
phase order, completion, and whether work may advance.** A phase becomes `[x]` when
its sensors pass and a human approves — never because a model said so in prose.

Design and rationale: [`docs/acg-engine-development-plan.md`](../docs/acg-engine-development-plan.md).

```bash
cd engine && bun install     # once
```

## Commands

Run from the repo root.

```bash
bun engine/src/acg.ts init                   # start a project here (no sample artifacts)
bun engine/src/acg.ts init --upgrade         # refresh the copied schemas/skills/hooks
bun engine/src/acg.ts profile                # where the ecosystem-bound sensors look
bun engine/src/acg.ts import                 # derive state from artifacts already on disk
bun engine/src/acg.ts status                 # the six-state board
bun engine/src/acg.ts next --json            # the only legitimate "what now?"
bun engine/src/acg.ts gate --phase 05-delivery
bun engine/src/acg.ts gate --phase 05-delivery --dry-run   # ask without recording
bun engine/src/acg.ts report --phase 01a-dst --result awaiting-approval
bun engine/src/acg.ts report --phase 01a-dst --result approved
bun engine/src/acg.ts report --phase 01a-dst --result rejected --note "hotspot unresolved"
bun engine/src/acg.ts review --phase 06-review --verdict rejected --note "..."
bun engine/src/acg.ts assess-lock --id assessment-2
bun engine/src/acg.ts locked-answer --id assessment-2 --key region
bun engine/src/acg.ts lock-check --id assessment-2
bun engine/src/acg.ts check-write --path services/x/Y.java
bun engine/src/acg.ts jump --phase 08-implementation --reason "spike"
bun engine/src/acg.ts redo --phase 03-tactical          # cascades; --only for one phase
bun engine/src/acg.ts scope --set patch
bun engine/src/acg.ts doctor
bun engine/src/acg.ts lessons
bun engine/src/acg.ts audit --limit 20
bun engine/src/acg.ts sensors
```

Exit codes: `0` fine, `1` bad invocation, `2` a gate refused.

## The six states

```
[ ] pending → [-] in_progress → [?] awaiting_approval → [x] completed
                                        ↓
                                 [R] revising → back to [?]
anything unfinished → [S] skipped   (jump, with a recorded reason)
[x] → redo → [ ]                    (cascades to every later phase)
```

Illegal transitions throw. `[x]` requires: every blocking sensor green, a human
`approved`, and on `reviewer: true` phases an independent reviewer verdict.

## Directives

`next --json` returns one of:

| `action` | Meaning |
|---|---|
| `run-phase` | Do the work. `must_read`, `must_write` and `intent` say what is in bounds |
| `await-gate` | Artifacts are ready and sensors are green; a human must approve |
| `await-review` | This phase needs the `acg-reviewer` subagent before approval |
| `ask-assessment` | A required decision lock is missing or tampered with |
| `blocked` | Blocking sensors failed. Fix the artifacts; do not argue |
| `done` | Nothing left in scope |

## What the engine owns

`.arch/acg-state.yaml`, `.arch/audit/`, `.arch/quality-reports/`. The PreToolUse hook
refuses any agent write to these; use the CLI. The state file's shape is
[`artifact-schemas/acg-state.schema.json`](../artifact-schemas/acg-state.schema.json),
and the engine's own output is tested against it.

## Layout

```
engine/
  data/
    phase-graph.yaml     control plane: phases, consumes, produces, sensors, locks
    scopes.yaml          named subsets of the graph (system, patch, implement)
  src/
    acg.ts               CLI
    orchestrate.ts       next / report / review / gate / jump / redo / scope / doctor
    state.ts             the six-state machine — the only writer of acg-state.yaml
    graph.ts             loads the phase graph and scopes
    intent.ts            write isolation: what the running phase may touch
    assess.ts            decision locks, canonical fingerprints, tamper detection
    importer.ts          derive state from artifacts on disk
    lessons.ts           learning loop: which sensor keeps rejecting which phase
    audit.ts             append-only, sharded per month
    guard.ts             the engine-write marker
    sensors/             one file per sensor, plus registry.ts
  hooks/
    guard-write.ts       PreToolUse: engine records + intent isolation
    stop-next.ts         Stop: refuse to end a turn with a phase left [-]
    precompact-breadcrumb.ts   PreCompact: write the board before context is lost
  tests/
```

Hooks are wired in [`.claude/settings.json`](../.claude/settings.json). For meta-work on
the engine itself — where the phase board is the thing being edited rather than obeyed —
`ACG_GUARD=off` disables the write guard.

## Sensors

Blocking sensors refuse `[x]`. Advisory sensors are reported and never gate. A sensor
that cannot evaluate this project reports `na` — never `pass` — and the reason names the
locked answer or missing profile entry that excluded it.

Three rules the catalogue is tested against:

- **A sensor only asks for artifacts that exist by the phase it runs at.** The router is
  Phase 8's output, so Phase 3 checks a page's provenance and Phase 8 checks its route.
  Getting this wrong made greenfield UI projects unpassable at Phase 3.
- **A `pass` message says how much was checked.** A pass with no number is a pass nobody
  can audit, and it is indistinguishable from a sensor that examined nothing.
- **A name is not substance.** A check that matches names is satisfied by exactly what a
  lazy generator produces. Four E2E files containing one comment each once satisfied the
  story-naming check while asserting nothing, and four designed commands existed in no
  source file while the events, routes and filenames all "matched". Both are decidable,
  so both are now checked.

| Sensor | Blocking | Refuses |
|---|---|---|
| `files-exist` | yes | A phase consuming an artifact that is not on disk |
| `schema-dst` | yes | Prose domain stories; a step missing `class` or `system_visible` |
| `story-map-coverage` | yes | An MVP `US-*` no story covers; a one-way `covered_by` claim; a story with an invented backbone |
| `dst-storm-correspondence` | yes | A visible state-change/handoff with no event; an actor-command with no DST sentence |
| `hotspot-classified` | yes | An unclassified hot spot; an **open `work-unknown`**, which belongs back in 01a-dst, not forward in the model |
| `swimlane-is-story` | yes | Swimlanes cut by bounded context; a DST read step with no read model |
| `handoff-equals-context-map` | yes | A cross-context DST handoff missing from the context map |
| `actor-view-sourced-from-dst` | yes | A page with no `sourced_from`, or one sourced from a step the system cannot see |
| `ephemeral-not-persisted` | yes | A spoken-only work object (DrinkChoice) becoming an entity or a table |
| `cl-contract-declared` | yes | A missing CL-1..CL-8 declaration; an unclassified query parameter (Phase 3) |
| `cl-contract-specified` | yes | A check with no Phase 4 scenario that does not say it is inapplicable |
| `test-stack-matrix` | yes | A test strategy naming a runner the locked stack and language cannot run |
| `gherkin-actor-matches-dst` | yes | A scenario giving a command to the wrong actor |
| `e2e-story-coverage` | yes | A to-be story with no journey feature or no pipeline smoke entry |
| `decision-not-restated` | yes | Infrastructure restating a locked decision as a literal that disagrees with it. Where to look comes from the profile |
| `docs-events-match-storm` | yes | A diagram inventing an event name |
| `framework-version-matrix` | yes | A questionnaire framework version the build file cannot honour, in any ecosystem the profile knows |
| `source-fingerprint` | yes | An event with no type; a route no actor view declares; a declared page nothing routes; a story whose E2E file is a name with no test in it |
| `commands-implemented` | yes | A command an aggregate declares that appears nowhere in the source (comments stripped) |
| `glossary-origin` | yes | A term with no origin; infrastructure vocabulary posing as domain language |
| `quality-report-written` | no | A gate that ran outside the engine |
| `god-aggregate` | no | An aggregate over its command/entity budget, or with no invariants |

A sensor never throws: a missing or malformed artifact is a finding.

## Tests

```bash
cd engine && bun run test        # 97 tests: the engine, on fixtures that are not the sample,
                                 #   including one full init→done conductor loop
cd engine && bun run test:sample # 201 tests: the coffeeshop, including its deliberate reds
cd engine && bun run test:all    # 298
cd engine && bunx tsc --noEmit
```

The coffeeshop `.arch/` is the regression fixture. Tests that write use a scratch clone
of it, so `bun test` never rewrites the project's own state. Several tests assert that
a sensor **fails** — those are the lies the engine exists to catch:

| Test asserts red | The lie |
|---|---|
| `gherkin-actor-matches-dst` | `ordering.feature` lets a cashier place orders and a "server" deliver them, `inventory.feature` lets a "manager" reorder stock; DST says Waiter and Barista |
| `decision-not-restated` | `assessment-2` locks `ap-east-2`; `iac/config/*.ts` say `us-east-1` |
| `docs-events-match-storm` | Diagrams publish `OrderPaid`, which no Event Storm event names |
| `actor-view-sourced-from-dst` | 7 declared actor-view pages are absent from `router.tsx` |
| `framework-version-matrix` | The questionnaire asks for Spring Boot 4.x; Gradle builds 3.4.4 |
| `source-fingerprint` | `OrderDelivered` has no type; no E2E file is named after a story |

They stay red on purpose. Fixing them is a product decision — change the artifact, or
change the decision through `redo` and record why. It is never to restate the claim
more confidently.
