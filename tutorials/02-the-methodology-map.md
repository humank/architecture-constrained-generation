# Chapter 2: The Methodology Map

![Compass on a map — charting the methodology landscape](https://images.unsplash.com/photo-1488375634201-b85b28653a79?w=1200&h=400&fit=crop&q=80)

*Photo by [Unsplash](https://unsplash.com) — Free to use under [Unsplash License](https://unsplash.com/license)*

> *"Each of these methodologies solves a piece of the puzzle. ACG is the jigsaw frame that holds them all together."*

---

## The Problem of Methodology Silos

Most teams adopt methodologies in isolation:
- The architect does DDD strategic design.
- The product owner writes user stories.
- The developers practice TDD.
- The DevOps team sets up CI/CD.
- The security team does threat modeling.

Each group speaks a different language, produces different artifacts, and works on different timelines. The result: **fragmented knowledge** that nobody can trace end to end.

ACG solves this by defining **exactly when** each methodology applies and **how its output feeds** the next.

---

## The Methodology-Phase Matrix

```
                 Phase:  0    1    2    3   3c   4    5    6    7    8    9
                        Req  Dis  Str  Tac  UX  Spc  Del  Rev  Doc  Imp  Dep
 ──────────────────────────────────────────────────────────────────────────────
 Impact Mapping          ██
 User Story Mapping      ██
 Domain Storytelling          ██
 Event Storming               ██             ██
 Event Modeling                ██             ██
 DDD Strategic                     ██
 DDD Tactical                           ██
 DDD Distillation                  ██
 Clean Architecture                     ██                       ██
 OOAD/SOLID/GRASP                       ██                       ██
 Supple Design                          ██
 Hexagonal/Ports&Adapt.                 ██                       ██
 API Design (REST)                      ██                       ██
 Atomic Design                          ██   ██                  ██
 BDD (Gherkin)                                    ██             ██
 TDD (Red-Green-Refac.)                           ██             ██
 XP Practices                                     ██             ██
 Contract Testing (Pact)                           ██
 STRIDE Threat Modeling                            ██
 Continuous Delivery                                    ██
 IaC (CDK/Terraform)                                    ██
 Observability (OTel)                                   ██
 SLI/SLO/SRE                                           ██
 Rozanski & Woods                                            ██
 C4 Model                                                         ██
 UML/Mermaid                                                      ██
 ADRs (MADR)                                                 ██
 AWS Well-Architected                                        ██
 Refactoring (Fowler)                                                ██
 Post-Deployment Verif.                                                   ██
```

Each `██` marks where a methodology is actively applied. Notice how they layer — later phases build on earlier ones rather than replacing them.

Phase 1 is three separately-gated engine stages (`01a-dst`, `01b-storm`, `01c-model`), so
Domain Storytelling is approved before Event Storming begins and Event Storming before Event
Modeling. See [Chapter 4](./04-phase-1-discovery.md).

---

![Colorful sticky notes on glass wall — methodologies working together](https://images.unsplash.com/photo-1758691736934-e5d6d0c7f875?w=1200&h=400&fit=crop&q=80)

## How Methodologies Flow Into Each Other

### The Discovery Chain

```
Impact Mapping          → WHY are we building this? (Business Goals)
    │
    ▼
User Story Mapping      → WHAT do users need to do? (Activities, Stories)
    │
    ▼
Domain Storytelling     → HOW do actors interact today? (As-Is / To-Be)
    │
    ▼
Event Storming          → WHAT HAPPENS in the domain? (Events, Commands, Policies)
    │
    ▼
Event Modeling          → HOW does data flow? (Commands → Events → Read Models)
```

Each methodology answers a different question. Impact Mapping starts with business goals; Event Modeling ends with an implementation blueprint. The chain **narrows** from "why" to "how" without losing context.

### The Design Chain

```
DDD Strategic Design    → WHERE are the boundaries? (Bounded Contexts, Context Map)
    │
    ▼
DDD Tactical Design     → WHAT lives inside each boundary? (Aggregates, VOs, Events)
    │
    ▼
Vernon's Four Rules     → HOW BIG should aggregates be? (Invariants, Identity References)
    │
    ▼
Supple Design          → HOW GOOD is the model? (Intention-Revealing, Side-Effect-Free)
    │
    ▼
Clean Architecture      → HOW do layers depend? (Dependency Rule: always inward)
    │
    ▼
Hexagonal Architecture  → HOW do we connect to the outside? (Ports and Adapters)
```

### The Quality Chain

```
BDD Scenarios          → WHAT should the system do? (Executable Specifications)
    │
    ▼
TDD (Outside-In)      → HOW do we implement it? (Red → Green → Refactor)
    │
    ▼
Contract Testing       → DO services agree? (Consumer-Driven Contracts)
    │
    ▼
STRIDE Threat Model    → IS it secure? (Spoofing, Tampering, Repudiation, ...)
    │
    ▼
Observability          → CAN we see what's happening? (Logs, Metrics, Traces)
    │
    ▼
SLI/SLO               → ARE users happy? (Error Budgets, Multi-Burn-Rate Alerts)
```

---

## Methodologies as Constraints

The key insight of ACG is that each methodology produces **constraints** that limit the solution space:

| Methodology | Constraint Produced | What It Eliminates |
|---|---|---|
| Impact Mapping | MVP scope | Features nobody needs |
| Event Storming | Domain events and commands | Invented CRUD operations |
| DDD Strategic | BC boundaries | God services, distributed monoliths |
| DDD Tactical | Aggregate invariants | Business rule violations |
| Vernon's Four Rules | Small aggregates, ID references | God aggregates, object tangles |
| Clean Architecture | Dependency Rule | Framework coupling in domain |
| BDD | Executable specifications | Untested business rules |
| TDD | Test-first, simple design | Over-engineering, dead code |
| STRIDE | Security mitigations | Unprotected attack surfaces |
| Observability | Instrumentation requirements | Blind spots in production |

When you stack all these constraints, the solution space becomes very narrow. The "right" code is not a matter of creativity — it's a matter of **satisfying all constraints simultaneously**.

---

## The Ubiquitous Language Thread

One thread runs through **every** phase: the **Ubiquitous Language** (Evans, Ch.2).

```
Phase 0: Seeds the glossary with terms from requirements
Phase 1: Enriches with events, commands, aggregates from Event Storming
Phase 2: Adds BC names, relationship patterns
Phase 3: Adds VOs, specifications, policies, API terms
Phase 4: Verifies all BDD scenarios use glossary terms
Phase 5: Uses glossary for metric names, log messages
Phase 6: Validates consistency across all phases
Phase 7: All diagram labels use glossary terms
Phase 8: Class names, method names, enum values = glossary terms
```

The `glossary.yaml` file grows across phases and acts as the **single source of truth** for domain terminology. The [Glossary Manager utility](../.claude/commands/util/glossary-manager.md) validates that no artifact uses a term not in the glossary.

---

## Why These Specific Methodologies?

ACG doesn't include methodologies randomly. Each was chosen because it **fills a gap** that others leave:

### Evans' DDD Without Event Storming

Evans wrote DDD in 2003, before Event Storming existed. His knowledge crunching process was manual and hard to scale. **Event Storming** (Brandolini, 2013) provides a structured workshop format that accelerates domain discovery.

### Event Storming Without Event Modeling

Event Storming discovers the problem space. But it doesn't produce an implementation blueprint — just sticky notes and photos. **Event Modeling** (Dymitruk, 2018) transforms those discoveries into a structured timeline with Given-When-Then specs for every command and read model.

### DDD Without Clean Architecture

Evans' layered architecture (UI → Application → Domain → Infrastructure) is correct but imprecise. **Clean Architecture** (Martin, 2017) adds the Dependency Rule and precise layer definitions. **Hexagonal Architecture** (Cockburn, 2005) adds the Ports and Adapters pattern that Vernon strongly advocates in IDDD.

### BDD Without TDD

BDD defines **what** the system should do. TDD defines **how** to implement it incrementally. The **Outside-In Double Loop** (Freeman & Pryce, GOOS 2009) connects them: BDD acceptance test drives TDD inner loops.

### Architecture Without Review

Most teams design architecture but never formally review it. **Rozanski & Woods** provide a systematic framework: 7 viewpoints ensure nothing is overlooked, 10 perspectives ensure quality attributes are addressed.

---

## The Assessment Gate Pattern

Two phases require **mandatory human input** before proceeding:

An assessment is not complete because its Markdown says `**Status**: COMPLETED` — a model
can write that sentence. It is complete when the engine has **locked** the answers and
recorded a canonical sha256 fingerprint of them:

```bash
bun engine/src/acg.ts assess-lock --id assessment-2
```

Every REQUIRED question must be answered, and editing an answer afterwards invalidates the
lock. Those locked answers are then the *only* thing that may switch a check off — see
[Chapter 15](./15-assessment-gates.md) and [Chapter 18](./18-the-engine.md).

### Before Phase 2: Architecture Decisions

```
┌────────────────────────────────────────────────┐
│  assessment-2.md                               │
│                                                │
│  Q1: Architecture Style                        │
│      A) Modular Monolith                       │
│      B) Microservices                          │
│      C) Start Monolith, Evolve                 │
│                                                │
│  Q2: Team Topology                             │
│  Q3-Q7: Infrastructure & Integration           │
│  Q5a-Q5e: AWS-Specific (if applicable)         │
└────────────────────────────────────────────────┘
```

This single decision (modulith vs microservices) **cascades** through every subsequent phase — affecting communication patterns, database strategy, deployment topology, test strategy, and IaC generation.

### Before Phase 8: Technology Stack

```
┌────────────────────────────────────────────────┐
│  assessment-8.md                               │
│                                                │
│  Q1: Language (Java 21 / Kotlin / TypeScript)  │
│  Q2: Framework (Spring Boot / NestJS / ...)    │
│  Q3: Build Tool (Gradle / Maven / npm)         │
│  Q4: Database (PostgreSQL / DynamoDB / ...)     │
│  Q5-Q14: Testing, Frontend, CSS, UX, IaC      │
└────────────────────────────────────────────────┘
```

These decisions determine **how** the architecture is implemented — which language features, which framework conventions, which testing tools.

For full details, see [Chapter 15: Assessment Gates](./15-assessment-gates.md).

---

## The Self-Correcting Mechanism

ACG doesn't just flow forward. It has **23 deterministic sensors**, **29 feedback loops** and **27 anti-pattern guards** that can send the pipeline backward:

```
Phase 8 ──────── "Response Shape Drift detected" ────────→ Back to Phase 3
Phase 6 ──────── "God Aggregate detected" ───────────────→ Back to Phase 1
Phase 4 ──────── "BDD scenario reveals ambiguous rule" ──→ Back to Phase 1
Phase 3 ──────── "Aggregate invariant unenforceable" ────→ Back to Phase 1
```

The first of those three is machine-decidable and blocking; the other two are judgement,
applied by the quality-gate checklist and the independent reviewer. Knowing which is which
is most of the engineering. This is covered in detail in
[Chapter 13: Quality Gates & Feedback Loops](./13-quality-gates-and-feedback-loops.md) and
[Chapter 18: The Engine](./18-the-engine.md).

---

## Summary

ACG is not a single methodology. It is an **orchestration framework** that:

1. **Sequences** 20+ methodologies in the right order — and *enforces* that order, rather than describing it
2. **Connects** each methodology's output to the next methodology's input
3. **Constrains** each phase's output with the previous phase's decisions
4. **Validates** consistency across all phases via sensors that no model can argue with
5. **Corrects** via feedback loops when inconsistencies are detected
6. **Pauses** for human judgment at strategic decision points

The result: a system where architecture and code are the same thing.

---

[← Previous: Why ACG](./01-why-architecture-constrained-generation.md) | [Table of Contents](./README.md) | [Next: Phase 0 — Requirements →](./03-phase-0-requirements.md)
