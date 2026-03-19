# Chapter 13: Quality Gates & Feedback Loops

![Magnifying glass examining code — quality inspection at every gate](https://images.unsplash.com/photo-1516382799247-87df95d790b7?w=1200&h=400&fit=crop&q=80)

*Photo by [Unsplash](https://unsplash.com) — Free to use under [Unsplash License](https://unsplash.com/license)*

> *"Mistakes are the portals of discovery."* — James Joyce
>
> ACG does not merely discover mistakes — it **routes them back to the phase that can fix them**.

---

## The Self-Correcting Mechanism

Traditional software pipelines flow in one direction: requirements become design, design becomes code, code ships. When something goes wrong downstream, the team patches it in place rather than fixing the root cause upstream. This is how architectures decay.

ACG works differently. Every phase transition passes through a **quality gate** — a systematic checkpoint that scans for anti-patterns, verifies consistency threads, and triggers **feedback loops** when problems are detected. If a downstream phase reveals a flaw that originated upstream, the pipeline loops back to the originating phase.

```
Traditional Pipeline (one-way):

  Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ ... ──→ Phase 8
                                                  │
                                                  ▼
                                              (ship it)


ACG Pipeline (self-correcting):

  Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ ... ──→ Phase 8
     ▲            ▲            ▲                  │
     │            │            │    Quality Gate   │
     └────────────┴────────────┴──── Feedback ◄───┘
```

The quality gate has three components:

1. **Anti-Pattern Detection** — 27 guards that catch known architectural smells
2. **Consistency Threads** — 6 threads that verify cross-phase coherence
3. **Feedback Loops** — 29 triggers that route problems back to the right phase

---

## Anti-Pattern Detection (27 Guards)

Each guard inspects the current phase artifacts and reports one of three statuses:

| Status | Meaning |
|--------|---------|
| **CLEAR** | No evidence of this anti-pattern |
| **CAUTION** | Indicators present — review recommended |
| **VIOLATION** | Anti-pattern confirmed — fix required before proceeding |

### The Full Guard Table

| # | Anti-Pattern | Description | What It Catches |
|---|-------------|-------------|-----------------|
| 1 | **Anemic Domain Model** | Aggregates with only getters, no behavior | Domain objects that are data bags — business logic lives elsewhere (services, controllers). Commands don't enforce invariants; they just set fields. |
| 2 | **DDD-Lite** | Tactical patterns without strategic design | Entities and Value Objects exist but no Bounded Context definitions, no Context Map, no Ubiquitous Language. Patterns without purpose. |
| 3 | **Smart UI** | Business logic in presentation layer | Validation rules, calculations, or state transitions coded in React components or API controllers instead of the domain layer. |
| 4 | **Big Ball of Mud** | No clear BC boundaries | Everything lives in one module. No separation of concerns at the strategic level. Aggregates reference each other freely across what should be context boundaries. |
| 5 | **God Aggregate** | Aggregate with >5 entities or >10 commands | A single aggregate that has absorbed too many responsibilities. It becomes the bottleneck for every change and is impossible to test in isolation. |
| 6 | **Implicit Constraints** | Business rules not expressed as specifications | Rules like "an order cannot exceed $10,000" exist only in procedural if-statements instead of named Specification objects or explicit invariant declarations. |
| 7 | **Accidental Architecture** | No ADRs for significant decisions | Key technical decisions (database choice, messaging strategy, authentication approach) have no recorded rationale. Future maintainers cannot understand *why*. |
| 8 | **Dependency Rule Violation** | Inner layer referencing outer layer | Domain layer imports from infrastructure. Application layer depends on a specific web framework. The dependency arrows point the wrong way. |
| 9 | **Test Ice-Cream Cone** | More E2E tests than unit tests | The test pyramid is inverted. Most coverage comes from slow, brittle end-to-end tests while unit tests are sparse or absent. |
| 10 | **Manual Deployment** | No pipeline definition when code exists | Implementation artifacts exist but there is no CI/CD pipeline, no deployment automation, no infrastructure-as-code. |
| 11 | **Untested Contracts** | BC integrations without contract tests | Bounded Contexts communicate via events or APIs but there are no Pact tests, no contract verification, no schema validation at the boundary. |
| 12 | **Speculative Generality** | Features not traceable to impact map goals | Code or design for features that no stakeholder requested. Every feature should trace back to an Impact Map goal; orphans indicate gold-plating. |
| 13 | **Mock Drift** | MSW mocks defined but no Pact contract link | Frontend uses Mock Service Worker stubs that were never validated against the real backend contract. The mocks may pass while the real integration fails. |
| 14 | **Inaccessible UI** | No accessibility requirements or tests defined | No WCAG compliance targets, no aria attributes in component specs, no accessibility test scenarios in BDD features. |
| 15 | **Performance Blindness** | No performance budgets or SLIs defined | No response time targets, no throughput goals, no bundle size budgets. Performance is not a constraint — it is an afterthought. |
| 16 | **Security Afterthought** | No threat model when implementation exists | Code has been written but no STRIDE analysis, no trust boundary diagram, no authentication/authorization design. Security bolted on rather than built in. |
| 17 | **Observability Gap** | No logging/metrics/tracing when delivery pipeline exists | A deployment pipeline is defined but there are no structured logs, no Prometheus metrics, no distributed tracing spans, no health checks. |
| 18 | **Long-Lived Feature Branch** | Branch diverges significantly from main | Not applicable at design time — included for completeness in implementation phases. Detected when branch age exceeds threshold or merge conflicts accumulate. |
| 19 | **Ice Cream Cone (Variant)** | Test strategy shape check | A second pass on the test distribution — ensures the ratio of unit : integration : E2E tests matches the target pyramid (70:20:10). |
| 20 | **Distributed Monolith** | BCs sharing database or synchronous chains | Multiple Bounded Contexts read/write the same database tables, or a request must synchronously traverse three or more services. All the costs of distribution, none of the benefits. |
| 21 | **Missing Error Budget** | No SLOs defined when system is in delivery phase | The system is deployed or deployable but has no Service Level Objectives. There is no way to know when reliability is "good enough" to ship features vs. when to focus on stability. |
| 22 | **Silent Frontend Failure** | No error handling in pages | Pages show blank screens or infinite spinners when the backend is down. Mutations fail silently. No `isError` handling in query hooks. `tsc --noEmit` reports errors that are being ignored. |
| 23 | **Phantom Seed Data** | Missing data initialization | `schema.sql` or `data.sql` contains INSERT statements but the ORM configuration disables SQL initialization. API returns empty arrays for data that should be pre-populated. In event-driven systems, this is catastrophic: missing seed data causes event consumers to fail lookups, retry, and lose messages to the dead letter queue. |
| 24 | **Contract Field Drift** | Frontend types do not match backend JSON | Frontend `types.ts` field names diverge from actual backend JSON response keys. Common cause: Jackson boolean serialization (`isAvailable` becomes `available`), or Phase 3 YAML artifact names diverged during implementation. Any mismatch produces silent `undefined` at runtime. |
| 25 | **Response Shape Drift** | Expected object, got array (or vice versa) | Frontend expects an aggregated object (`{totalOrders: 42, totalRevenue: 1250.00}`) but backend returns raw records (`[{orderId: "abc", total: 29.99}, ...]`). The backend dumped JPA entities instead of implementing the read model projection defined in Phase 3. |
| 26 | **Dead Read Model Projection** | CQRS endpoint returns empty while upstream has data | A read model endpoint (e.g., Reporting BC) returns `[]` or `{}` while the upstream write model (e.g., Ordering BC) has data. The event listener or projection was never wired, or events are not being published across the boundary. |
| 27 | **Endpoint Path Divergence** | Backend path does not match Phase 3 contract | Backend implements `/api/reports/sales` but Phase 3 contract specifies `/api/reporting/cashier/sales`. Frontend Vite proxy and `api.ts` point to the contract path. Requests return 404 and nobody knows why. |

> **Severity escalation**: Guards 22--27 were added based on real implementation failures observed in ACG projects. They target the **frontend-backend seam** — the most common source of "it works in isolation but fails when connected" bugs.

---

## Consistency Threads (6 Threads)

While anti-pattern guards check for local problems within a phase, consistency threads verify **cross-phase coherence**. A system can pass every individual guard but still be inconsistent if the phases do not align.

### Thread 1: Language Consistency

**What it checks**: Every term in every artifact exists in `glossary.yaml`. Terms are used identically across phases — no synonyms, no abbreviations, no drift.

**How it works**:
- Scan all `.arch/` artifacts for domain terms
- Cross-reference each term against the glossary
- Flag undefined terms (terms used but not in glossary)
- Flag inconsistent terms (same concept, different names across phases)

**Example violation**: Phase 1 uses "Order", Phase 3 uses "Purchase", Phase 8 code uses "Transaction" — all meaning the same thing.

### Thread 2: Event Continuity

**What it checks**: Every domain event is traceable from discovery through implementation.

**How it works**:
- Events in `event-storm.yaml` should appear in aggregate definitions
- Events in aggregate definitions should have corresponding BDD scenarios
- Events that cross BC boundaries should have contract definitions
- Events in contracts should have handlers in the consuming BC

**Example violation**: `OrderPaid` appears in the event storm but no aggregate emits it. Or `OrderPaid` is emitted but the Preparation BC has no handler for it.

### Thread 3: Invariant Coverage

**What it checks**: Business rules flow from requirements through aggregates into test scenarios.

**How it works**:
- Business rules from Phase 0 requirements map to aggregate invariants in Phase 3
- Each invariant has at least one BDD scenario in Phase 4
- Each BDD scenario has a corresponding test in Phase 8

**Example violation**: The requirement says "An order cannot contain more than 20 items" but no aggregate enforces this limit, or no BDD scenario tests the boundary.

### Thread 4: Knowledge Evolution

**What it checks**: The model grows richer over time. Hot spots get resolved. The glossary expands.

**How it works**:
- Compare glossary size across phase checkpoints (should grow)
- Verify that hot spots identified in Phase 1 have been resolved by Phase 3
- Look for model refinements (renamed concepts, split aggregates, merged BCs)

**Example violation**: The glossary has not changed since Phase 1 — suggesting the team is not learning from the design process.

### Thread 5: Design Quality

**What it checks**: SOLID principles and Clean Architecture compliance across all design artifacts.

**How it works**:
- Single Responsibility: each aggregate has one reason to change
- Open/Closed: new behavior added via new event handlers, not by modifying existing ones
- Dependency Rule: all arrows point inward (infrastructure → application → domain)
- Interface Segregation: ports are narrow and role-specific
- Component coupling and cohesion metrics where available

**Example violation**: An aggregate's command handler imports from the infrastructure layer to check database state directly.

### Thread 6: Frontend Resilience

**What it checks**: The frontend handles failure gracefully — errors, loading, and empty states are designed, not accidental.

**How it works**:
- Every `data_source` in actor views has `loading_state`, `error_state`, and `empty_state` defined
- Every `submit_action` and `row_action` has `on_error` defined
- Design system includes `ui_states` section with visual treatment for loading, error, and empty
- BDD feature files include error scenarios (service unavailable, timeout)
- Error path tests comprise at least 20% of integration tests
- `tsc --noEmit` produces zero errors under strict mode

**Example violation**: The Menu Board page queries the menu API but has no error boundary. When the backend is down, the user sees a blank white screen with no indication of what went wrong.

---

![Compass on navigation map — feedback loops guiding back to the right path](https://images.unsplash.com/photo-1566341013452-946caa457784?w=1200&h=400&fit=crop&q=80)

## Feedback Loops (29 Loops)

This is the heart of ACG's self-correction. Each feedback loop has a **trigger condition** (something that was detected as wrong) and an **action** (which phase to return to). The system does not patch problems in place — it goes back to the phase where the problem originated.

### The Full Feedback Loop Table

| # | Trigger Condition | Return To | Action |
|---|------------------|-----------|--------|
| 1 | Hot spots unresolved from event storming | Phase 1a: Domain Storytelling | Re-examine the user journey that produced the hot spot. The stories are incomplete. |
| 2 | Information completeness fails in event model | Phase 1b: Event Storming | Missing commands, events, or read models. Re-run the event storm for the affected flow. |
| 3 | Integration complexity too high in context map | Phase 2: BC Design | Too many relationships or wrong integration patterns. Reconsider BC boundaries. |
| 4 | Aggregate invariant impossible to enforce | Phase 1b: Event Storming | The aggregate boundary is wrong. The invariant spans multiple aggregates, which means the event model needs revisiting. |
| 5 | Design not supple, breakthrough needed | Phase 1: Knowledge Crunching | A deeper model is waiting to be discovered. Return to domain expert conversations. |
| 6 | Feature Envy / Data Class detected | Phase 3: Domain Model Refinement | Behavior is in the wrong place. Reallocate responsibilities across aggregates. |
| 7 | BDD scenarios reveal ambiguous rules | Phase 1: Discovery | The domain experts have not clarified this rule. Go back and ask. |
| 8 | Tests reveal boundary issues | Phase 3: Aggregate Design | An aggregate is trying to enforce an invariant it does not own. Redraw boundaries. |
| 9 | Contract breaks between BCs | Phase 2: Context Mapping | The integration pattern between two BCs is wrong. Revisit the Context Map. |
| 10 | Pipeline too slow | Phase 5: Delivery | Optimize test parallelization, build caching, or deployment strategy. |
| 11 | Security threat unmitigated | Phase 4: Threat Model | A STRIDE threat has no countermeasure. Refine the threat model and add mitigations. |
| 12 | Observability blind spot found | Phase 5: Delivery | A failure mode has no alert or metric. Add structured logs, metrics, or traces. |
| 13 | SLO breach risk detected | Phase 5: Error Budget Review | Current error rate approaches the budget. Freeze features and focus on reliability. |
| 14 | Glossary term conflict across BCs | Phase 1: Language Alignment | Two BCs use the same term with different meanings. Clarify via the glossary. |
| 15 | Aggregate boundary dispute | Phase 2: Context Map Refinement | Two teams disagree on who owns an aggregate. The Context Map must arbitrate. |
| 16 | Missing event handler for domain event | Phase 3: Tactical Design | An event is published but no consumer handles it. Add the handler to the consuming aggregate. |
| 17 | Circular dependency between BCs | Phase 2: Strategic Redesign | BC A depends on BC B which depends on BC A. Extract a new BC or reverse the dependency via events. |
| 18 | Feature scenario untestable | Phase 4: Specification Refinement | A Given/When/Then is too vague or too coupled to implementation. Rewrite the scenario. |
| 19 | ADR contradicts prior decision | Phase 6: Architecture Review | Two ADRs conflict. One must be superseded with a clear rationale. |
| 20 | C4 diagram inconsistent with model | Phase 7: Documentation Sync | The diagram shows containers or components that no longer match the implementation. |
| 21 | Performance budget exceeded | Phase 5: Delivery Optimization | Bundle size, response time, or throughput exceeds the defined budget. Optimize or renegotiate. |
| 22 | Accessibility failure in specification | Phase 4: Specification Refinement | WCAG compliance gaps found. Add aria requirements and keyboard navigation scenarios. |
| 23 | Contract incompatible with consumer | Phase 2: Context Mapping | The published contract cannot satisfy the consumer's needs. Renegotiate at the strategic level. |
| 24 | Frontend error states missing in design | Phase 3c: UX Design | Actor views lack `ui_states` definitions. Add `loading_state`, `error_state`, and `empty_state` to every data source and action. Also update Phase 3 tactical artifacts. |
| 25 | Frontend error scenarios missing in BDD | Phase 4: Specification | BDD feature files have no error or timeout scenarios. Add scenarios for service unavailable, network timeout, and validation failure. |
| 26 | TypeScript strict compilation fails | Phase 8: Implementation | `tsc --noEmit` reports errors. Fix all TypeScript errors before proceeding — they indicate type mismatches that will cause runtime failures. |
| 27 | Response shape drift (object vs. array) | Phase 8: Implementation | Backend returns raw entities instead of the aggregated read model defined in Phase 3. Fix the backend query endpoint to return the `response_dto` shape. |
| 28 | Dead read model projection | Phase 8: Implementation | CQRS endpoint returns empty while upstream has data. Wire the event listener, fix event publishing, or reroute the frontend to the correct service port. |
| 29 | Endpoint path diverges from Phase 3 contract | Phase 8: Implementation | Backend path, Vite proxy path, and frontend `api.ts` path must all match the Phase 3 `api_contract`. Align all three. |

> **Reading the table**: Each row answers the question "If X is wrong, where do I go to fix it?" This is fundamentally different from "If X is wrong, patch it here." ACG fixes root causes, not symptoms.

### Feedback Loop Categories

The 29 loops cluster into five categories:

| Category | Loops | Pattern |
|----------|-------|---------|
| **Discovery gaps** | 1, 2, 5, 7, 14 | The domain model is incomplete — go back to domain experts |
| **Strategic misalignment** | 3, 9, 15, 17, 23 | BC boundaries or integration patterns are wrong |
| **Tactical defects** | 4, 6, 8, 16 | Aggregate design does not support the invariants |
| **Specification gaps** | 11, 18, 22, 25 | BDD scenarios or threat models are incomplete |
| **Implementation drift** | 10, 12, 13, 19, 20, 21, 24, 26, 27, 28, 29 | Code or infrastructure diverged from design |

---

## The Quality Report

Every quality gate execution produces a structured YAML report. This report is both human-readable and machine-parseable, enabling automation and trend analysis.

### Schema

```yaml
quality_report:
  phase: "phase-{N}"
  timestamp: "2026-03-19T14:30:00Z"     # ISO 8601
  status: "pass | warn | fail"           # worst status among all checks

  checks:
    - name: "Anemic Domain Model"
      category: "anti-pattern"            # anti-pattern | completeness | consistency | thread-check
      status: "pass | warn | fail"        # CLEAR → pass, CAUTION → warn, VIOLATION → fail
      message: "All aggregates have command methods with invariant enforcement"
      recommendation: ""                  # empty when pass

    - name: "God Aggregate"
      category: "anti-pattern"
      status: "warn"
      message: "CheckIn aggregate has 6 entities (threshold: 5)"
      recommendation: "Consider extracting Loyalty into a separate aggregate"

  language_consistency:
    total_terms: 23
    new_terms:
      - "Barista Station"
      - "Preparation Queue"
    undefined_terms: []                   # terms used in artifacts but not in glossary
    inconsistent_terms: []                # same concept, different names
    status: "pass | fail"

  event_continuity:
    total_events: 14
    events_without_aggregate: []
    events_without_scenario: ["InventoryDepleted"]
    events_without_contract: []
    status: "pass | warn | fail"

  invariant_coverage:
    total_invariants: 8
    invariants_without_scenario:
      - aggregate: "Order"
        invariant: "max_20_items"
    status: "pass | warn | fail"

  design_quality:
    dependency_violations: []
    solid_warnings: []
    status: "pass | warn | fail"

  frontend_resilience:
    views_missing_error_state: []
    actions_missing_on_error: []
    tsc_errors: 0
    error_test_ratio: 0.25               # target: >= 0.20
    status: "pass | warn | fail"

  feedback_loops_triggered:
    - loop_number: 4
      from_phase: "phase-3"
      to_phase: "phase-1b"
      reason: "OrderLimit invariant spans Order and Inventory aggregates"
    - loop_number: 26
      from_phase: "phase-8"
      to_phase: "phase-8"
      reason: "tsc --noEmit reports 3 errors in MenuBoard component"

  next_action: "proceed | review-and-proceed | block-fix-required | feedback-loop"
  # proceed:              all checks pass, move to next phase
  # review-and-proceed:   warnings present, human review recommended
  # block-fix-required:   violations present, must fix before proceeding
  # feedback-loop:        a feedback loop was triggered, return to indicated phase
```

### Report Location

Reports are written to `.arch/quality-reports/`:

```
.arch/
└── quality-reports/
    ├── phase-0-report.yaml
    ├── phase-1-report.yaml
    ├── phase-2-report.yaml
    ├── phase-3-report.yaml
    ├── phase-3c-report.yaml
    ├── phase-4-report.yaml
    ├── phase-5-report.yaml
    ├── phase-6-report.yaml
    ├── phase-7-report.yaml
    ├── phase-8-report.yaml
    └── full-report.yaml          # generated when checking "all" phases
```

### Aggregate Status Rule

The overall report status is the **worst** status among all checks:

```
fail > warn > pass
```

If any single check is `fail`, the entire report is `fail`. The `next_action` field reflects this:
- All `pass` → `proceed`
- Any `warn`, no `fail` → `review-and-proceed`
- Any `fail` → `block-fix-required`
- Any feedback loop triggered → `feedback-loop` (overrides other statuses)

---

## How Quality Gates Run in Practice

### Per-Phase Invocation

After completing any phase, invoke the quality gate:

```
/quality-gate 3        # check Phase 3 artifacts
/quality-gate 8        # check Phase 8 artifacts
/quality-gate all      # check all phases with artifacts
```

### What Happens on Each Status

**CLEAR (proceed)**: The phase is complete. Move to the next phase.

**CAUTION (review-and-proceed)**: Warnings were found. A human should review the report and decide whether the warnings are acceptable or need action. The pipeline does not block.

**VIOLATION (block-fix-required)**: One or more anti-patterns are confirmed. The pipeline blocks. The team must fix the violations and re-run the quality gate before proceeding.

**Feedback Loop (feedback-loop)**: A trigger condition was met. The report specifies which phase to return to and why. The team returns to that phase, makes corrections, and then re-runs forward through all subsequent phases.

```
Example: Feedback Loop #27 triggered during Phase 8

  Phase 3 (contract says response is object)
      │
      ▼
  Phase 8 (backend returns array)        ← violation detected here
      │
      ▼
  Quality Gate detects Response Shape Drift
      │
      ▼
  Feedback Loop #27: return to Phase 8 Implementation
      │
      ▼
  Fix: implement aggregation query, return {totalOrders, totalRevenue}
      │
      ▼
  Re-run Quality Gate → CLEAR → proceed
```

---

## Why This Matters

### Traditional Pipelines Are One-Way Streets

In a traditional CI/CD pipeline, code flows in one direction:

```
commit → build → test → deploy
```

If tests fail, you fix the code. But what if the problem is not the code — what if the problem is the *design*? The pipeline has no mechanism to say "the aggregate boundary is wrong, go back to event storming."

### ACG Pipelines Are Feedback Systems

ACG quality gates can detect problems that originate in any phase and route the fix to the right place:

| Problem detected in... | Root cause in... | Traditional fix | ACG fix |
|------------------------|-----------------|-----------------|---------|
| Phase 8 (code won't compile) | Phase 3 (aggregate boundary wrong) | Hack around it in code | Feedback loop #8 → Phase 3 |
| Phase 8 (frontend shows blank) | Phase 3c (no error states designed) | Add try/catch in component | Feedback loop #24 → Phase 3c |
| Phase 4 (scenario untestable) | Phase 1 (ambiguous business rule) | Guess and write the test | Feedback loop #7 → Phase 1 |
| Phase 8 (404 on API call) | Phase 3 (contract path mismatch) | Change frontend URL | Feedback loop #29 → Phase 8 (align all three: backend + proxy + frontend) |

The key insight: **fixing symptoms is fast but accumulates debt. Fixing root causes is slower per incident but prevents entire categories of future problems.**

### The Compounding Effect

Each feedback loop that fires makes the upstream phase artifacts more precise. More precise Phase 1 artifacts produce better Phase 2 designs. Better Phase 2 designs produce cleaner Phase 3 aggregates. The quality compounds forward through every subsequent phase.

After several iterations, the quality gate report trends toward all-CLEAR — not because the checks got easier, but because the upstream artifacts got better.

---

## Summary

| Component | Count | Purpose |
|-----------|-------|---------|
| Anti-Pattern Guards | 27 | Detect known architectural smells per phase |
| Consistency Threads | 6 | Verify cross-phase coherence |
| Feedback Loops | 29 | Route problems to the phase that can fix them |
| Report Statuses | 4 | `proceed`, `review-and-proceed`, `block-fix-required`, `feedback-loop` |

The quality gate is not a gate you pass once. It is a **continuous verification system** that runs at every phase boundary and can send you back when it detects that the foundation is not sound. This is what makes ACG self-correcting: it treats architecture violations not as code bugs to patch, but as design decisions to revisit.

---

[← Previous: Phase 8 — Implementation](./12-phase-8-implementation.md) | [Table of Contents](./README.md) | [Next: The Knowledge Base →](./14-the-knowledge-base.md)
