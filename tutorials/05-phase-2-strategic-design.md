# Chapter 5: Phase 2 — Strategic Design

> *"Strategic design is the most valuable part of DDD — and the part most teams skip."* — Vaughn Vernon

---

## The Most Important Decision

Before Phase 2 begins, the pipeline triggers a **mandatory assessment gate**: `assessment-2.md`. This is where the single most consequential architecture decision is made:

**Modular Monolith or Microservices?**

This choice cascades through every subsequent phase:

| Aspect | Modular Monolith | Microservices |
|---|---|---|
| BC communication | In-process events (Spring Modulith) | Message broker (SNS/SQS) + REST/gRPC |
| Database | Shared instance, schema-per-BC | Database per service |
| Deployment | Single deployable | Independent per BC |
| Contract testing | Module boundary tests | Consumer-Driven Contracts (Pact) |
| Service discovery | N/A (in-process) | K8s DNS / Consul / Cloud Map |
| Operational complexity | Low | High |
| Team topology | Single team natural fit | Multiple teams natural fit |

The assessment also captures:
- **Team topology** (single team / multiple teams / independent deployment)
- **AWS region** (affects latency, service availability, data residency)
- **VPC design** (public+private subnets / private-only)
- **Infrastructure components** (EKS, RDS, SNS/SQS, CloudFront, etc.)

See [Chapter 15: Assessment Gates](./15-assessment-gates.md) for the complete assessment template.

---

## Confirming Bounded Context Boundaries

Phase 1 identified BC **candidates** from Event Storming swimlanes. Phase 2 confirms them using five tests:

### The Five Boundary Tests

| Test | Question | Failure Signal |
|---|---|---|
| **Linguistic** | Do the same words mean different things in different contexts? | Same term, different definition |
| **Pivotal Event** | Do pivotal events mark natural boundaries? | Events that change everything |
| **Change Rate** | Do things that change together stay together? | Different release cadences |
| **Team Ownership** | Can one team own this context? (Conway's Law) | Shared ownership = coupling |
| **Data Ownership** | Does this context own its data exclusively? | Shared mutable state = monolith |

### Example: Coffeeshop BCs

```
BC Candidates from Phase 1:          Confirmed BCs after Phase 2:
┌───────────────────────────┐        ┌───────────────────────────┐
│  Order-related events     │ ──────▶│  Ordering BC (Core)       │
│  Payment events           │        │  - Order lifecycle        │
│  Delivery events          │        │  - Pricing & payment      │
└───────────────────────────┘        │  - Fulfillment tracking   │
                                     └───────────────────────────┘
┌───────────────────────────┐        ┌───────────────────────────┐
│  Preparation events       │ ──────▶│  Preparation BC (Core)    │
│  Recipe-related           │        │  - Coffee preparation     │
└───────────────────────────┘        │  - Recipe management      │
                                     └───────────────────────────┘
┌───────────────────────────┐        ┌───────────────────────────┐
│  Stock events             │ ──────▶│  Inventory BC (Supporting)│
│  Replenishment events     │        │  - Stock tracking         │
└───────────────────────────┘        │  - Threshold alerts       │
                                     │  - Replenishment flow     │
                                     └───────────────────────────┘
```

---

## Subdomain Classification (DDD Distillation)

Each confirmed BC is classified using Eric Evans' distillation framework:

| Classification | Criteria | Investment Strategy |
|---|---|---|
| **Core** | Competitive advantage, unique to this business | Best developers, highest investment, custom development |
| **Supporting** | Necessary but not differentiating | Custom but simpler, less senior team |
| **Generic** | Same across all businesses | Buy/use existing solution (SaaS, open source) |

For each **Core** domain, a **Domain Vision Statement** is written — 2-3 sentences capturing the essence of why this domain matters:

> *"The Ordering domain is the core competitive differentiator of the coffeeshop system. It manages the complete lifecycle of customer orders from placement through payment to delivery, with accurate pricing that accounts for coffee type, size, and customizations. Zero-error order tracking is the primary business goal."*

---

## Context Mapping

For each pair of BCs that interact, Phase 2 defines:

1. **Direction**: Which is upstream (provides data), which is downstream (consumes)?
2. **Relationship pattern** (from Evans' 9 patterns)
3. **API technology** (REST, gRPC, events)
4. **Communication type** (sync, async)
5. **Contract testing strategy**

### The Nine DDD Relationship Patterns

```
 Strong coupling ◀────────────────────────────────────▶ No coupling

 Shared    Partner-  Customer-   Conformist   ACL     OHS +     Separate
 Kernel    ship      Supplier                         Published  Ways
                                                      Language
```

| Pattern | When to Use |
|---|---|
| **Partnership** | Two teams coordinate closely, evolve together |
| **Shared Kernel** | Small shared model, both teams maintain (e.g., `DomainEvent` interface) |
| **Customer-Supplier** | Downstream influences upstream's backlog |
| **Conformist** | Downstream conforms to upstream's model (no translation) |
| **ACL** | Downstream translates upstream's model to its own |
| **Open Host Service** | Upstream provides well-defined API for all consumers |
| **Published Language** | Shared schema for integration (OpenAPI, AsyncAPI, Protobuf) |
| **Separate Ways** | No integration needed |
| **Big Ball of Mud** | Legacy system — isolate with ACL |

### Example Context Map

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    Ordering ─────[OHS + Events]─────▶ Preparation           │
│       │                                    │                │
│       │ [Published Language:                │ [ACL:          │
│       │  OrderSubmittedToBarista]           │  CoffeePrep    │
│       │                                    │  StartedEvent]  │
│       │         ┌──────────────────────────┘                │
│       │         │                                           │
│       │         ▼                                           │
│       └────▶ Inventory                                      │
│             [ACL: IngredientsConsumed]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Style Validation

Based on the assessment-2 answer, Phase 2 validates the design against the chosen style:

### If Microservices

- [ ] Each BC can deploy independently?
- [ ] Each BC has its own database (or schema)?
- [ ] No synchronous call chains > 2 hops?
- [ ] No shared mutable state between BCs?
- [ ] Cross-service events have ordering guarantees defined?
- [ ] Schema evolution strategy per event?

**Violation = "Distributed Monolith" risk** — the worst of both worlds.

### If Modular Monolith

- [ ] Each BC has clear module boundary?
- [ ] No cross-BC table joins?
- [ ] In-process events for cross-BC communication?
- [ ] Module boundary enforced by framework or tests?

---

## Output Artifacts

```
.arch/02-strategic/
├── bounded-contexts.yaml   # BCs with classification, vision, aggregates, events
├── context-map.yaml        # Relationships, API tech, communication patterns
└── api-specs/              # Placeholder OpenAPI/AsyncAPI stubs per integration
```

---

## Decision Point 🔑

```
🔑 Please review and confirm:
1. Core/Supporting/Generic classification correct?
2. Integration patterns appropriate for chosen architecture style?
3. Any BCs that should be merged or split?
```

---

[← Previous: Phase 1 — Discovery](./04-phase-1-discovery.md) | [Table of Contents](./README.md) | [Next: Phase 3 — Tactical Design →](./06-phase-3-tactical-design.md)
