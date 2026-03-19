# Chapter 10: Phase 6 — Architecture Review

![Magnifying glass on documents — systematic architecture review](https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?w=1200&h=400&fit=crop&q=80)

*Photo by [Unsplash](https://unsplash.com) — Free to use under [Unsplash License](https://unsplash.com/license)*

> *"Architecture is the decisions you wish you could get right early."* — Ralph Johnson
>
> Phase 6 is the systematic check that you **did** get them right.

---

## The Rozanski & Woods Framework

Phase 6 applies the most rigorous architecture review framework available: **7 Viewpoints** and **10 Perspectives** from Nick Rozanski and Eoin Woods' *Software Systems Architecture*.

Unlike ad-hoc reviews, this is **systematic and repeatable**. Every viewpoint has specific concerns, stakeholders, diagrams, and verification criteria.

---

## The Seven Viewpoints

Each viewpoint is produced as a **separate Markdown file** with Mermaid diagrams:

### 1. Context Viewpoint
**Concerns**: System boundary, external actors, external systems
**Key diagram**: C4 Context + actor-system interaction map
**Verification**: Is the boundary clear? Are all actors and integrations documented?

### 2. Functional Viewpoint
**Concerns**: System decomposition, capability mapping
**Key diagram**: BC decomposition + information flow between BCs
**Verification**: Is every requirement traceable to a BC? No orphan capabilities?

### 3. Information Viewpoint
**Concerns**: Data ownership, consistency model, data lifecycle
**Key diagram**: ER diagrams showing which BC owns which data
**Verification**: No shared mutable state across BCs? Events carry minimal data?

### 4. Concurrency Viewpoint
**Concerns**: Async event flows, state machines, race conditions
**Key diagram**: State machine diagrams with WHO triggers each transition
**Verification**: All transitions reachable? No deadlocks? Idempotency defined?

> **Critical**: State diagrams must show WHO triggers each transition (actor vs policy vs saga). Gaps here cause implementation bugs.

### 5. Development Viewpoint
**Concerns**: Module structure, Clean Architecture layers, dependencies
**Key diagram**: Package diagrams showing allowed/disallowed dependencies
**Verification**: Dependency Rule satisfied? No circular cross-BC dependencies?

### 6. Deployment Viewpoint
**Concerns**: Runtime topology, scaling, environments
**Key diagram**: Infrastructure topology with all components
**Verification**: No single points of failure? Disaster recovery strategy?

### 7. Operational Viewpoint
**Concerns**: Monitoring, alerting, correlation, runbooks
**Key diagram**: Alert escalation flowchart, trace propagation diagram
**Verification**: All BCs have health checks? All metrics have dashboards?

---

## The Ten Perspectives

Perspectives are cross-cutting quality attributes evaluated across all viewpoints:

| # | Perspective | Key Question |
|---|---|---|
| 1 | **Security** | Are all STRIDE threats mitigated? |
| 2 | **Performance** | Can we meet latency/throughput targets? |
| 3 | **Availability** | What happens when components fail? |
| 4 | **Scalability** | How does the system grow? |
| 5 | **Evolution** | How easily can new BCs/features be added? |
| 6 | **Resilience** | Are Circuit Breakers and fallbacks defined? |
| 7 | **Usability** | What does the user see when backend is down? |
| 8 | **Observability** | Can we understand behavior from outside? |
| 9 | **Testability** | Can each component be tested in isolation? |
| 10 | **Deployability** | Can we deploy safely and roll back? |

Each perspective includes **Quality Attribute Scenarios**:

```
| Scenario                              | Stimulus              | Response           | Measure        |
|---------------------------------------|-----------------------|--------------------|----------------|
| Database down during order placement  | RDS unavailable       | Circuit breaker    | Recovery < 30s |
| Two waiters order for same table      | Concurrent requests   | Optimistic locking | No lost orders |
| Payment service down during hours     | Service unavailable   | Frontend shows err | Retry available|
```

---

## Anti-Pattern Detection

Phase 6 runs **27 anti-pattern guards**:

| # | Anti-Pattern | What It Catches |
|---|---|---|
| 1 | Anemic Domain Model | Aggregates with only getters, no behavior |
| 2 | DDD-Lite | Tactical patterns without strategic design |
| 3 | Smart UI | Business logic in presentation layer |
| 5 | God Aggregate | Aggregate with >5 entities or >10 commands |
| 8 | Dependency Rule Violation | Inner layer referencing outer layer |
| 9 | Test Ice-Cream Cone | More E2E than unit tests |
| 20 | Distributed Monolith | Multiple BCs sharing database or sync chains |
| 22 | Silent Frontend Failure | Pages with no error handling |
| 23 | Phantom Seed Data | Missing data initialization |
| 24 | Contract Field Drift | Frontend types ≠ backend JSON |
| 25 | Response Shape Drift | Expected object, got array (or vice versa) |
| 27 | Endpoint Path Divergence | Backend path ≠ Phase 3 contract |

Each guard reports: **CLEAR** / **CAUTION** / **VIOLATION** with specific recommendations.

---

## Architecture Decision Records (ADRs)

Every significant decision is documented in MADR format:

```markdown
# ADR-001: Microservices Architecture

## Status
Accepted

## Context
The coffeeshop system has 3 bounded contexts with 5 cross-BC events...

## Decision Drivers
- Team plans to grow to 4-6 developers
- Independent scaling needed for preparation queue
- AWS EKS deployment target selected

## Considered Options
1. Modular Monolith (Spring Modulith)
2. Microservices (Spring Boot + SNS/SQS)
3. Start Monolith, Evolve

## Decision Outcome
Chosen: **Microservices**, because team topology requires independent
deployment and BC scaling requirements differ significantly.

## Consequences
### Positive
- Independent deployment per BC
- Independent scaling
### Negative
- Higher operational complexity
- Need distributed tracing
```

---

## Cross-Phase Consistency Verification

The most unique part of Phase 6: verifying that **all phases agree**:

| Thread | Verification |
|---|---|
| **Language** | Every term in glossary used consistently everywhere |
| **Events** | Every event in event-storm appears in aggregates, BDD, and contracts |
| **Invariants** | Every business rule in requirements → aggregate invariants → BDD scenarios |
| **State Machines** | All transitions reachable, including saga-triggered ones |
| **Integration** | Every context-map relationship has a contract definition |

---

## Output

```
.arch/06-review/
├── viewpoints/
│   ├── context-viewpoint.md
│   ├── functional-viewpoint.md
│   ├── information-viewpoint.md
│   ├── concurrency-viewpoint.md
│   ├── development-viewpoint.md
│   ├── deployment-viewpoint.md
│   └── operational-viewpoint.md
├── perspectives.md
├── anti-pattern-report.md
├── quality-scenarios.md
├── cross-phase-consistency.md
└── adrs/
    ├── adr-001-microservices.md
    ├── adr-002-sns-sqs.md
    └── ...
```

---

[← Previous: Phase 5 — Delivery](./09-phase-5-delivery.md) | [Table of Contents](./README.md) | [Next: Phase 7 — Documentation →](./11-phase-7-documentation.md)
