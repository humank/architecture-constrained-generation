---
description: "Quality gate checker — validates phase outputs against anti-patterns, thread consistency, and feedback loop triggers"
---

# Quality Gate

You are a quality assurance expert that validates the outputs of each architecture phase. You check for anti-patterns, thread consistency, and determine if feedback loops should be triggered.

## Input

Phase to check: $ARGUMENTS (number 0-7, or "all")

## Procedure

**Deterministic sensors first.** From the repo root:

```bash
bun engine/src/acg.ts gate --phase <id>      # run this phase's sensors
bun engine/src/acg.ts sensors                # what is registered
bun engine/src/acg.ts doctor                 # graph / frontmatter / input / lock drift
bun engine/src/acg.ts lessons                # which sensor keeps rejecting which phase
```

`<id>` is an engine phase id (`01a-dst`, `04-specification`, `05-delivery`, …).
The engine writes `.arch/quality-reports/<id>.yaml`. Blocking sensor failures
are authoritative — **do not override them in prose, and do not re-argue them.**
Findings marked `(advisory)` are reported but never gate completion. Findings marked
`(not applicable)` mean the sensor could not evaluate this project — the message names
the locked answer or missing profile entry that excluded it. Never read `na` as `pass`,
and never argue a red sensor into `na` by editing the phase graph: applicability comes
from a locked, fingerprinted answer or not at all.

### What is already deterministic

Do not re-check these by reading files; the sensor already did, and its verdict wins.

| Sensor | Blocking | What it refuses |
|---|---|---|
| `files-exist` | yes | A phase consuming an artifact that is not on disk |
| `schema-dst` | yes | Prose domain stories; a step missing `class` or `system_visible` |
| `story-map-coverage` | yes | An MVP `US-*` no `DS-*` story covers; a one-way `covered_by` claim; a story with an invented backbone |
| `dst-storm-correspondence` | yes | A visible state-change/handoff with no event; an actor-command with no DST sentence |
| `hotspot-classified` | yes | An unclassified hot spot; an open `work-unknown` (send it back to 01a-dst) |
| `swimlane-is-story` | yes | Swimlanes cut by bounded context instead of story; a DST read step with no read model |
| `handoff-equals-context-map` | yes | A cross-context DST handoff missing from the context map |
| `actor-view-sourced-from-dst` | yes | A page with no `sourced_from`, or one sourced from a step the system cannot see |
| `cl-contract-declared` | yes | A missing CL-1..CL-8 declaration; an unclassified query parameter (Phase 3) |
| `cl-contract-specified` | yes | A check with no Phase 4 scenario that does not say it is inapplicable |
| `ephemeral-not-persisted` | yes | A spoken-only work object becoming an entity or a table |
| `test-stack-matrix` | yes | A test strategy naming a runner the locked stack cannot run |
| `gherkin-actor-matches-dst` | yes | A scenario giving a command to the wrong actor |
| `e2e-story-coverage` | yes | A to-be story with no journey feature or no pipeline smoke entry |
| `decision-not-restated` | yes | Infrastructure restating a locked decision as a literal that disagrees with it |
| `docs-events-match-storm` | yes | A diagram inventing an event name |
| `framework-version-matrix` | yes | A questionnaire framework version the build file cannot honour, in any ecosystem |
| `source-fingerprint` | yes | An event with no type, a route no actor view declares, a story whose E2E file has no test in it |
| `commands-implemented` | yes | A declared command that appears nowhere in the source |
| `glossary-origin` | yes | A term with no origin; infrastructure vocabulary posing as domain language |
| `quality-report-written` | no | A gate that ran outside the engine |
| `god-aggregate` | no | An aggregate over its command/entity budget, or with no invariants |

### What is still yours

The anti-pattern table below covers what no sensor can decide: whether the model
*means* anything. Anemic Domain Model, Smart UI, Big Ball of Mud and the semantic half
of God Aggregate are read by you, and on phases marked `reviewer: true` by the
independent `acg-reviewer` subagent as well.

### Step 1: Load artifacts for the specified phase

Read from `.arch/` the artifacts produced by the target phase. Also always read `.arch/glossary.yaml`.

Phase artifact mapping:
- Phase 0: `.arch/00-requirements/` (impact-map.yaml, story-map.yaml, parsed-requirements.yaml)
- Phase 1: `.arch/01-discovery/` (event-storm.yaml, event-model.yaml)
- Phase 2: `.arch/02-strategic/` (bounded-contexts.yaml, context-map.yaml)
- Phase 3: `.arch/03-tactical/` (aggregates/*.yaml)
- Phase 4: `.arch/04-specification/` (features/*.feature, threat-model.yaml)
- Phase 5: `.arch/05-delivery/` (pipeline.yaml, observability/)
- Phase 6: `.arch/06-review/` (architecture-review.md, adrs/)
- Phase 7: `.arch/07-documentation/` (c4/*.dsl, uml/*.puml)

### Step 2: Anti-Pattern Detection (21 patterns)

Check for these anti-patterns. For each, report status (pass/warn/fail):

| # | Anti-Pattern | Detection Method |
|---|---|---|
| 1 | Anemic Domain Model | Aggregates with only getters/setters, no business logic in commands |
| 2 | DDD-Lite | Tactical patterns used without strategic design (no BC definitions) |
| 3 | Smart UI | Business logic references in UI/presentation artifacts |
| 4 | Big Ball of Mud | No clear BC boundaries, everything in one context |
| 5 | God Aggregate | Aggregate with >5 entities or >10 commands |
| 6 | Implicit Constraints | Business rules in procedural descriptions, not as specifications |
| 7 | Accidental Architecture | No ADRs for significant decisions |
| 8 | Dependency Rule Violation | Inner layer referencing outer layer concepts |
| 9 | Test Ice-Cream Cone | More E2E scenarios than unit/integration scenarios |
| 10 | Long-Lived Feature Branch | Not applicable at design time — skip |
| 11 | Manual Deployment | No pipeline definition when code exists |
| 12 | Untested Contracts | BC integrations without contract test definitions |
| 13 | Speculative Generality | Features not traceable to impact map goals |
| 14 | Ice Cream Cone | Same as #9 — check test strategy shape |
| 15 | Mock Drift | MSW mocks defined but no Pact contract link |
| 16 | Inaccessible UI | No accessibility requirements or tests defined |
| 17 | Performance Blindness | No performance budgets or SLIs defined |
| 18 | Security Afterthought | No threat model when implementation exists |
| 19 | Observability Gap | No logging/metrics/tracing when delivery pipeline exists |
| 20 | Distributed Monolith | Multiple BCs sharing same database or synchronous chains |
| 21 | Missing Error Budget | No SLOs defined when system is in delivery phase |
| 22 | Silent Frontend Failure | Pages show blank/loading when backend down; mutations fail silently; no `isError` handling; `tsc --noEmit` has errors |
| 23 | Phantom Seed Data | `schema.sql` or `data.sql` contains INSERT statements but `spring.jpa.hibernate.ddl-auto` is set to `update`/`create`/`create-drop`, which disables Spring Boot SQL initialization. API returns empty array for data that should be pre-populated. **In event-driven systems this is catastrophic**: if seed data is missing when event consumers start, lookups fail (e.g., `Inventory item not found`), SQS messages are retried and lost to DLQ, and the system enters irrecoverable inconsistent state. Detection: curl API endpoints that should have initial data and check for empty responses; check consumer logs for `not found` exceptions on seed data entities. |
| 24 | Contract Field Drift | Frontend `types.ts` field names don't match actual backend JSON response field names. Common cause: Jackson boolean serialization (`isX` → `x`), or Phase 3 YAML artifact names diverged from implementation. Detection: diff frontend interface fields against `curl` response keys. Any mismatch = silent `undefined` at runtime. |
| 25 | Response Shape Drift | Frontend `types.ts` expects an object (e.g., `SalesReport{totalOrders, totalRevenue}`) but backend returns an array of raw records (e.g., `[{orderId, total, ...}]`), or vice versa. Common cause: backend query endpoint dumps raw JPA entities instead of implementing the aggregated read model projection defined in Phase 3 `response_dto`. Detection: `curl` the API and check whether the JSON is an object or array, then compare with the `types.ts` type. Also check that aggregated fields (sum, count, average) are actually computed, not missing. |
| 26 | Dead Read Model Projection | A CQRS read model endpoint (e.g., Reporting BC) returns empty `[]` or `{}` while the upstream BC has data. Common cause: the event listener or projection that populates the read store was never wired, or events are not being published to the downstream BC. Detection: if an upstream service (e.g., Inventory on port 8084) has data but the downstream projection endpoint (e.g., Reporting on port 8085) returns empty, the projection is dead. Also check: is the endpoint path in the frontend Vite proxy pointing to the right service? |
| 27 | Endpoint Path Divergence | Backend implements a different endpoint path than what Phase 3 API contract specifies (e.g., contract says `/api/reporting/cashier/sales` but backend implements `/api/reports/sales`). Frontend Vite proxy and `api.ts` may point to the wrong path. Detection: compare Phase 3 `frontend-architecture.yaml` `api_contract.query_endpoints[].path` with actual backend `@GetMapping`/`@PostMapping` paths and frontend `api.ts` request paths. |

### Step 3: Thread Consistency Checks (5 threads)

**Thread 1 — Language Consistency:**
- Scan all artifacts for terms
- Check each term exists in glossary.yaml
- Flag undefined terms
- Flag terms used inconsistently across phases

**Thread 2 — Event Continuity:**
- Events in event-storm.yaml should appear in aggregates
- Events in aggregates should have BDD scenarios
- Events should have contract definitions if crossing BC boundaries

**Thread 3 — Invariant Coverage:**
- Business rules from requirements should map to aggregate invariants
- Invariants should have BDD scenarios
- Invariants should have specifications (not just implicit checks)

**Thread 4 — Knowledge Evolution:**
- Compare glossary size across phases (should grow)
- Check for resolved hot spots
- Look for model refinements

**Thread 5 — Design Quality:**
- SOLID principles in aggregate design
- Clean Architecture dependency direction
- Component metrics if available

**Thread 6 — Frontend Resilience:**
- Every `data_source` in actor views has `loading_state`, `error_state`, `empty_state` defined
- Every `submit_action` / `row_action` has `on_error` defined
- Design system MASTER.md has `ui_states` section (loading/error/empty visual treatment)
- BDD feature files include error scenarios (service unavailable, timeout)
- Test strategy includes error path tests (≥ 20% of integration tests)
- TypeScript strict mode enforced (`tsc --noEmit` zero errors)

### Step 4: Feedback Loop Evaluation (23 loops)

For each applicable feedback loop, check if the trigger condition is met:

| # | Trigger Condition | Action |
|---|---|---|
| 1 | Hot spots unresolved from event storming | → back to Domain Storytelling |
| 2 | Information completeness fails in event model | → back to Event Storming |
| 3 | Integration complexity too high in context map | → back to BC Design |
| 4 | Aggregate invariant impossible to enforce | → back to Event Storming |
| 5 | Design not supple, breakthrough needed | → Knowledge Crunching |
| 6 | Feature Envy / Data Class detected | → Domain Model Refinement |
| 7 | BDD scenarios reveal ambiguous rules | → Discovery |
| 8 | Tests reveal boundary issues | → Aggregate Design |
| 9 | Contract breaks | → Context Mapping |
| 10 | Pipeline too slow | → optimize tests/build |
| 11 | Security threat unmitigated | → Threat Model refinement |
| 12 | Observability blind spot found | → Delivery refinement |
| 13 | SLO breach risk detected | → Error Budget review |
| 14 | Glossary term conflict across BCs | → Language alignment |
| 15 | Aggregate boundary dispute | → Context Map refinement |
| 16 | Missing event handler for domain event | → Tactical design |
| 17 | Circular dependency between BCs | → Strategic redesign |
| 18 | Feature scenario untestable | → Specification refinement |
| 19 | ADR contradicts prior decision | → Architecture review |
| 20 | C4 diagram inconsistent with model | → Documentation sync |
| 21 | Performance budget exceeded | → Delivery optimization |
| 22 | Accessibility failure in specification | → Specification refinement |
| 23 | Contract incompatible with consumer | → Context Mapping |
| 24 | Frontend error states missing in design | → 03c UX Design (add ui_states) + 03 Tactical (add error_state to actor views) |
| 25 | Frontend error scenarios missing in BDD | → 04 Specification (add error/timeout BDD scenarios) |
| 26 | TypeScript strict compilation fails | → 08 Implementation (fix all TS errors before proceeding) |
| 27 | Response shape drift (object vs array, raw vs aggregated) | → 08 Implementation (fix backend query endpoint to return Phase 3 `response_dto` shape) |
| 28 | Dead read model projection (CQRS endpoint returns empty) | → 08 Implementation (wire event listener/projection, or reroute frontend to correct service) |
| 29 | Endpoint path diverges from Phase 3 contract | → 08 Implementation (align backend path + Vite proxy + frontend api.ts with Phase 3 `api_contract`) |

### Step 5: Generate Quality Report

Write report to `.arch/quality-reports/phase-{N}-report.yaml` following the quality-report schema:

```yaml
quality_report:
  phase: "phase-{N}"
  timestamp: "{ISO 8601}"
  status: "pass|warn|fail"
  checks:
    - name: "check name"
      category: "anti-pattern|completeness|consistency|thread-check"
      status: "pass|warn|fail"
      message: "what was found"
      recommendation: "what to do"
  language_consistency:
    new_terms: [...]
    undefined_terms: [...]
    status: "pass|fail"
  feedback_loops_triggered:
    - from_phase: "phase-X"
      to_phase: "phase-Y"
      reason: "why"
  next_action: "proceed|review-and-proceed|block-fix-required|feedback-loop"
```

### Step 6: Present Results

Output a clear summary:

```
## Quality Gate Report — Phase {N}

Status: PASS / WARN / FAIL

### Anti-Pattern Checks
- [pass] No Anemic Domain Model
- [warn] God Aggregate: CheckIn aggregate has 6 entities (threshold: 5)
- ...

### Thread Consistency
- [pass] Language: 23 terms in glossary, all defined
- [warn] Events: 2 events in storm not yet in aggregates
- ...

### Feedback Loops
- [warn] Loop #4 triggered: Aggregate invariant issue — recommend revisiting Event Storming

### Recommendation
[proceed / review / fix required / feedback loop]
```

## Important Rules

1. **Be thorough**: Check every applicable anti-pattern for the given phase. Not all 21 apply to every phase — note which are not applicable.
2. **Be specific**: When flagging an issue, cite the exact artifact, field, or term that triggered it.
3. **Be actionable**: Every warn/fail must include a concrete recommendation.
4. **Create the report directory** if `.arch/quality-reports/` does not exist.
5. **Aggregate status**: The overall status is the worst status among all checks (fail > warn > pass).
6. **If "all" is specified**, run checks for every phase that has artifacts, and produce a combined report at `.arch/quality-reports/full-report.yaml`.

$ARGUMENTS
