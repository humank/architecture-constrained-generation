# Chapter 1: Why Architecture Constrained Generation

![Architecture blueprints representing the gap between design and code](https://images.unsplash.com/photo-1721244654392-9c912a6eb236?w=1200&h=400&fit=crop&q=80)

*Photo by [Unsplash](https://unsplash.com) — Free to use under [Unsplash License](https://unsplash.com/license)*

> *"Plans are worthless, but planning is everything."* — Dwight D. Eisenhower
>
> ACG takes this further: **Plans are essential, and they should generate the code.**

---

## The Gap Everyone Knows About

Every experienced software architect has lived through the same story:

1. You spend weeks designing a beautiful architecture — Bounded Contexts, Clean Architecture layers, carefully drawn C4 diagrams.
2. The developers start coding.
3. Within two sprints, the code has drifted from the architecture.
4. Within two months, the architecture documents are fiction.

This isn't a people problem. It's a **structural** problem. Architecture documents and code live in separate worlds. There is no mechanism to enforce that one follows the other.

```
Traditional Approach:

  Requirements ──→ Architecture Docs ──→ Code
                        │                   │
                        │   ❌ DRIFT ❌      │
                        │                   │
                        └─── (ignored) ─────┘
```

![Compass on a map — navigating the gap between architecture and implementation](https://images.unsplash.com/photo-1524146128017-b9dd0bfd2778?w=1200&h=400&fit=crop&q=80)

## The Three Failures

### Failure 1: Architecture Without Code

Architects draw diagrams. Developers interpret them. Interpretation introduces drift.

A Context Map that says "Ordering → Preparation via events" tells you nothing about:
- What data the event carries
- Who triggers the state transition from PAID to PREPARING
- Whether the event is sync or async
- What happens when the event handler fails

The architecture is **necessary but insufficient**.

### Failure 2: Code Without Architecture

AI code generation (Copilot, ChatGPT, etc.) produces code from natural language prompts. The code works, but:
- No Bounded Context boundaries — everything bleeds together
- No Aggregate invariants — business rules are scattered
- No test strategy — maybe some unit tests, maybe not
- No Clean Architecture — domain logic in controllers
- No API contracts — CRUD endpoints instead of task-based commands

The code compiles but doesn't embody any design discipline.

### Failure 3: Architecture and Code — But Separately

Some teams try to bridge the gap manually:
- Write ADRs → hope developers read them
- Generate OpenAPI specs → hope they match the implementation
- Run ArchUnit tests → catch violations after the fact

These are band-aids. They detect drift after it happens instead of preventing it.

---

## The ACG Thesis

**Architecture Constrained Generation** proposes a different approach:

> Generate code that is mathematically constrained by architecture artifacts.
> Every class, method, endpoint, test, and infrastructure resource traces back
> to a specific design decision.

```
ACG Approach:

  Requirements ──→ Architecture Artifacts ──→ Code
                        │                       │
                        │   ✅ CONSTRAINED ✅    │
                        │                       │
                        └──── (traceable) ──────┘
```

### What "Constrained" Means

In ACG, the code generator (Claude) doesn't **invent** — it **translates**. Every decision has already been made in the architecture phases:

| Code Element | Constrained By | Artifact Source |
|---|---|---|
| Package structure | Bounded Contexts | `02-strategic/bounded-contexts.yaml` |
| Class names | Ubiquitous Language | `glossary.yaml` |
| Aggregate methods | Commands from Event Storming | `01-discovery/event-storm.yaml` |
| State transitions | State machine diagrams | `06-review/viewpoints/concurrency-viewpoint.md` |
| API endpoints | API contract (not CRUD) | `03-tactical/frontend-architecture.yaml` |
| Test scenarios | BDD Gherkin features | `04-specification/features/*.feature` |
| Infrastructure | Assessment decisions + artifacts | `assessment-2.md`, `05-delivery/` |
| Frontend pages | Actor views | `03-tactical/frontend-architecture.yaml` |
| Design tokens | UX design report | `03c-ux-design/ux-design-report.yaml` |

The implementation phase doesn't ask "what should I build?" — it asks "how do I translate these constraints into this technology stack?"

---

## The Pipeline

ACG is a **9-phase pipeline** where each phase produces structured artifacts that constrain the next:

```
Phase 0: Requirements
    │ Impact Map, Story Map, Glossary
    ▼
Phase 1: Discovery
    │ Domain Stories, Event Storm, Event Model
    ▼
Phase 2: Strategic Design          ◄── Assessment Gate: Architecture Decisions
    │ Bounded Contexts, Context Map
    ▼
Phase 3: Tactical Design
    │ Aggregates, Domain Model, API Contracts, Actor Views
    ▼
Phase 3c: UX Design
    │ Design System, Status→Color Mapping
    ▼
Phase 4: Specification
    │ BDD Scenarios, Test Strategy, Threat Model, Contracts
    ▼
Phase 5: Delivery
    │ Pipeline, IaC (CDK/Terraform), Observability, SLI/SLO
    ▼
Phase 6: Architecture Review
    │ 7 Viewpoints, 10 Perspectives, ADRs
    ▼
Phase 7: Documentation
    │ C4 Diagrams, Sequence Diagrams, State Machines
    ▼
Phase 8: Implementation            ◄── Assessment Gate: Technology Stack
    │ Backend Code, Frontend Code, Tests, Infrastructure
    ▼
 Running System
```

Every arrow is a **data dependency**. Phase 3 reads Phase 2's output. Phase 8 reads everything.

---

## Human in the Loop

ACG is not fully autonomous. It pauses at **key decision points** (marked with 🔑) for human judgment:

- **After Phase 0**: "Is this the right MVP scope?"
- **Before Phase 2**: "Microservices or modular monolith? Which AWS region?"
- **After Phase 2**: "Are these Bounded Context boundaries correct?"
- **Before Phase 5**: "Review this Infrastructure Resource Plan before I generate CDK code."
- **Before Phase 8**: "Java 21 + Spring Boot? React + Tailwind? Confirm your stack."

The AI handles the mechanical translation. The human makes the strategic calls.

---

## What Makes This Different

| Approach | Artifacts | Code | Traceability |
|---|---|---|---|
| Manual architecture | Diagrams, docs | Written by hand | By convention |
| AI code generation | None | Generated from prompt | None |
| Architecture testing (ArchUnit) | Separate from code | Written by hand | After-the-fact |
| **ACG** | **Generated, structured** | **Generated from artifacts** | **Built-in** |

ACG is the only approach where:
1. Architecture artifacts are **machine-readable** (YAML schemas, Gherkin features)
2. Code generation is **constrained** by those artifacts
3. Quality gates **verify** the constraints are satisfied
4. Feedback loops **correct** violations automatically

---

## The Knowledge Base: Standing on Giants

ACG doesn't invent methodology. It **synthesizes** 20+ established methodologies into one coherent workflow. Each phase draws on specific bodies of knowledge:

- **Eric Evans**: Domain-Driven Design (Knowledge Crunching, Bounded Contexts, Aggregates, Supple Design)
- **Vaughn Vernon**: Implementing DDD (Vernon's Four Rules, Domain Events as first-class citizens)
- **Alberto Brandolini**: Event Storming (Big Picture, Process Level, Design Level)
- **Adam Dymitruk**: Event Modeling (The Blueprint, Four Patterns, Seven Steps)
- **Robert C. Martin**: Clean Architecture (Dependency Rule, SOLID, Component Principles)
- **Kent Beck**: XP (Test-First, Simple Design, Continuous Integration) and TDD
- **Dan North / Seb Rose**: BDD (Three Amigos, Example Mapping, Gherkin)
- **Nick Rozanski & Eoin Woods**: Software Systems Architecture (7 Viewpoints, 10 Perspectives)
- **Simon Brown**: C4 Model (Context, Container, Component, Code)
- **Gojko Adzic**: Impact Mapping
- **Jeff Patton**: User Story Mapping
- **Martin Fowler**: Refactoring (27 Code Smells, 66 Techniques)
- **Rebecca Wirfs-Brock**: Responsibility-Driven Design
- **AWS**: Well-Architected Framework (6 Pillars)

These aren't just name-dropped. Each methodology has a [detailed knowledge base document](./14-the-knowledge-base.md) that the AI reads before executing the relevant phase.

---

## Next

In the [next chapter](./02-the-methodology-map.md), we'll see exactly how these 20+ methodologies are woven together — which one applies where, and why they complement rather than conflict.

---

[Table of Contents](./README.md) | [Next: The Methodology Map →](./02-the-methodology-map.md)
