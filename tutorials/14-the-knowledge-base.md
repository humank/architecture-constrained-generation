# Chapter 14: The Knowledge Base

> *"If I have seen further, it is by standing on the shoulders of giants."* — Isaac Newton
>
> ACG's knowledge base is those shoulders — 58 reference documents encoding the precise definitions from Evans, Vernon, Brandolini, Dymitruk, Martin, Beck, Fowler, and a dozen more.

---

## Why a Knowledge Base?

Large language models have broad, general knowledge about software engineering. Ask one about aggregates and you'll get a reasonable answer. But "reasonable" is not good enough for **constrained** generation.

The problem is precision. An LLM might generate an aggregate that:
- Exposes its internal state through getters (violating Tell, Don't Ask)
- Accepts another aggregate as a constructor parameter (violating Vernon's Rule 4)
- Returns void from command methods but forgets to emit domain events
- Has a 200-line root class because it absorbed three separate consistency boundaries

These aren't hallucinations — they're the result of **averaged knowledge**. The LLM has seen thousands of "aggregate" implementations, most of which are anemic CRUD wrappers. Without precise methodology anchoring, generation drifts toward the median of the training data.

ACG solves this with a **curated knowledge base**: 58 reference documents spanning 22 methodology areas. Each document distills the **exact definitions, rules, and patterns** from the original authors:

| Problem | Knowledge Base Solution |
|---------|----------------------|
| "Aggregate" means different things in different codebases | `ddd/02-building-blocks.md` defines Vernon's Four Rules precisely |
| Event Storming sticky notes get confused with domain events | `event-storming/01-building-blocks.md` defines each sticky note type |
| BDD scenarios devolve into imperative click-by-click scripts | `bdd/01-bdd-complete.md` defines declarative Gherkin with Example Mapping |
| Test strategy defaults to unit-test-everything | `web-testing/01-test-strategy-shapes.md` defines Pyramid, Trophy, Honeycomb, Diamond |
| Clean Architecture layers get inverted | `clean-architecture/01-clean-architecture-complete.md` defines the Dependency Rule |

The knowledge base ensures ACG uses the **EXACT** definitions from the original authors — not approximations, not interpretations, not the average of Stack Overflow answers.

---

## Knowledge Base Structure

The knowledge base lives in the `knowledge-base/` directory, organized by methodology area. Here is the complete index — 58 documents across 22 areas:

### Discovery (2 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `discovery/01-impact-mapping.md` | Goal, Actor, Impact, Deliverable; prioritization; MVP; measurement | Gojko Adzic |
| `discovery/02-user-story-mapping.md` | Map structure, Walking Skeleton, Story Splitting, Workshop format | Jeff Patton |

### Domain Storytelling (2 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `domain-storytelling/01-core-elements.md` | Actors, Work Objects, Activities, Annotations | Stefan Hofer & Henning Schwentner |
| `domain-storytelling/02-story-types-and-rules.md` | Three dimensions, modeling rules, DDD connection | Stefan Hofer & Henning Schwentner |

### Event Storming (3 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `event-storming/01-building-blocks.md` | Sticky note types, event triggers | Alberto Brandolini |
| `event-storming/02-workshop-formats.md` | Big Picture, Process Level, Design Level | Alberto Brandolini |
| `event-storming/03-facilitation-techniques.md` | Chaotic Exploration, Pivotal Events, Swimlanes, Saga discovery | Alberto Brandolini |

### Event Modeling (1 document)

| File | Content | Original Author |
|------|---------|-----------------|
| `event-modeling/01-event-modeling-complete.md` | Blueprint, Four Patterns, Seven Steps, Slices, CQRS/ES mapping | Adam Dymitruk |

### DDD — Domain-Driven Design (7 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `ddd/01-knowledge-crunching.md` | Part I: Ubiquitous Language, Knowledge Crunching, Model-Driven Design | Eric Evans |
| `ddd/02-building-blocks.md` | Part II: Entities, VOs, Services, Modules, Aggregates, Factories, Repositories, Domain Events | Eric Evans + Vaughn Vernon |
| `ddd/03-refactoring-deeper-insight.md` | Part III: Specification, Supple Design, Making Implicit Explicit | Eric Evans |
| `ddd/04-strategic-design.md` | Part IV: Bounded Context, Context Map, all relationship patterns | Eric Evans |
| `ddd/05-distillation.md` | Part V: Core Domain, Subdomains, Distillation techniques | Eric Evans |
| `ddd/06-large-scale-structure.md` | Part VI: Responsibility Layers, Knowledge Level, Evolving Order | Eric Evans |
| `ddd/07-architecture-patterns.md` | Hexagonal, CQRS, Event Sourcing, Sagas | Vaughn Vernon |

### BDD (1 document)

| File | Content | Original Author |
|------|---------|-----------------|
| `bdd/01-bdd-complete.md` | Three Pillars, Three Amigos, Example Mapping, Gherkin, Outside-In | Dan North / Seb Rose / Matt Wynne |

### TDD (1 document)

| File | Content | Original Author |
|------|---------|-----------------|
| `tdd/01-tdd-complete.md` | Red-Green-Refactor, Three Laws, Schools (Chicago/London), Test Doubles | Kent Beck / Robert C. Martin |

### XP (1 document)

| File | Content | Original Author |
|------|---------|-----------------|
| `xp/01-xp-complete.md` | Values, Principles, Primary/Corollary Practices, Planning Game | Kent Beck |

### OOAD (2 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `ooad/01-ooad-complete.md` | SOLID, GRASP, GoF Patterns, CRC Cards, RDD | Martin / Larman / GoF / Wirfs-Brock |
| `ooad/02-rich-domain-model-principles.md` | Tell Don't Ask, Information Expert, CQS, Law of Demeter, Feature Envy, Primitive Obsession, Specification Pattern, Behavior-on-Enum | Multiple authors |

### Refactoring (3 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `refactoring/01-code-smells.md` | 27 Code Smells (Bloaters, Couplers, Dispensables, etc.) | Martin Fowler / Kent Beck |
| `refactoring/02-refactoring-catalog.md` | 66 Refactoring techniques (Extract, Move, Simplify, etc.) | Martin Fowler |
| `refactoring/03-principles-and-practices.md` | Two Hats, Six Workflows, Strangler Fig, DDD connection | Martin Fowler |

### Clean Architecture (1 document)

| File | Content | Original Author |
|------|---------|-----------------|
| `clean-architecture/01-clean-architecture-complete.md` | Dependency Rule, Layers, Humble Objects, Component Principles, SOLID at architecture level | Robert C. Martin |

### API Design (2 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `api-design/01-api-design-principles.md` | API-First, REST (Richardson Maturity Model), GraphQL, gRPC, BFF, API Gateway | Multiple authors |
| `api-design/02-api-specifications.md` | OpenAPI 3.1, AsyncAPI, Protobuf, JSON Schema, versioning strategies | Multiple authors |

### Event-Driven Architecture (3 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `event-driven-architecture/01-messaging-patterns.md` | Pub/Sub, Competing Consumers, DLQ, Outbox, delivery/ordering guarantees | Multiple authors |
| `event-driven-architecture/02-schema-evolution.md` | Compatibility modes, Schema Registry, Avro/Protobuf, upcasting | Multiple authors |
| `event-driven-architecture/03-consistency-patterns.md` | Saga, idempotency, eventual consistency, CQRS consistency | Multiple authors |

### Microservice Patterns (3 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `microservice-patterns/01-decomposition-and-communication.md` | By subdomain, sync/async, Service Mesh, API Gateway, Conway's Law | Chris Richardson / Sam Newman |
| `microservice-patterns/02-data-patterns.md` | Database per Service, CQRS impl, Event Sourcing impl, CDC, polyglot persistence | Chris Richardson |
| `microservice-patterns/03-resilience-patterns.md` | Circuit Breaker, Bulkhead, Retry/Backoff, Timeout, Fallback, Chaos Engineering | Michael Nygard |

### Frontend Architecture (3 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `frontend-architecture/01-component-architecture.md` | Atomic Design, Feature-Sliced Design, Design System, Design Tokens | Brad Frost / Multiple authors |
| `frontend-architecture/02-state-and-data.md` | Server state, client state, TanStack Query, Zustand, XState, real-time data | Multiple authors |
| `frontend-architecture/03-micro-frontends.md` | Module Federation, single-spa, Shell app, composition approaches | Multiple authors |

### Security (3 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `security/01-threat-modeling.md` | STRIDE, DREAD, attack trees, trust boundaries, DFD for security | Microsoft / Adam Shostack |
| `security/02-auth-patterns.md` | OAuth 2.0, OIDC, JWT, RBAC/ABAC/ReBAC, microservice auth | Multiple authors |
| `security/03-secure-coding.md` | OWASP Top 10, input validation, output encoding, CSP, SAST/DAST | OWASP |

### Observability (3 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `observability/01-three-pillars.md` | Structured logging, metrics (RED/USE), distributed tracing, correlation | Multiple authors |
| `observability/02-opentelemetry.md` | OTel API/SDK/Collector, OTLP, auto-instrumentation, ADOT (AWS) | OpenTelemetry project |
| `observability/03-sli-slo-alerting.md` | SLI/SLO/SLA, error budgets, multi-burn-rate alerting, incident response | Google SRE |

### Web Testing (6 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `web-testing/01-test-strategy-shapes.md` | Test Pyramid, Testing Trophy, Honeycomb, Diamond, choosing the right shape | Multiple authors |
| `web-testing/02-e2e-testing.md` | E2E philosophy, CUJs, Playwright, Cypress, test patterns, BDD integration | Multiple authors |
| `web-testing/03-web-integration-testing.md` | Testing Library, Component Testing, Storybook, MSW, Pact-to-MSW | Kent C. Dodds / Multiple |
| `web-testing/04-visual-regression-testing.md` | Screenshot comparison, Percy, Chromatic, baseline management | Multiple authors |
| `web-testing/05-accessibility-testing.md` | axe-core, WCAG 2.1/2.2, POUR, keyboard/screen reader testing | W3C / Deque |
| `web-testing/06-web-performance-testing.md` | Core Web Vitals, Lighthouse CI, RUM, k6 load testing, performance budgets | Google / Multiple |

### Contract Testing (1 document)

| File | Content | Original Author |
|------|---------|-----------------|
| `contract-testing/01-contract-testing-complete.md` | CDC, Pact, REST/GraphQL/gRPC/Event patterns, DDD context mapping | Pact Foundation |

### Continuous Delivery (3 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `continuous-delivery/01-core-principles.md` | Seven Principles, Deployment Pipeline | Jez Humble / David Farley |
| `continuous-delivery/02-deployment-strategies.md` | Blue-Green, Canary, Feature Flags, Immutable Infrastructure | Multiple authors |
| `continuous-delivery/03-practices.md` | Trunk-Based Dev, Config as Code, DB Migration, Test Pyramid, Observability | Multiple authors |

### Architecture (5 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `architecture/01-rozanski-woods.md` | 7 Viewpoints, 10 Perspectives, Stakeholder Analysis | Nick Rozanski & Eoin Woods |
| `architecture/02-c4-model.md` | 4 Levels, Supplementary Diagrams, Structurizr DSL | Simon Brown |
| `architecture/03-uml.md` | 7 Structure + 7 Behavior diagrams, DDD mapping | OMG / Multiple |
| `architecture/04-continuous-architecture.md` | 6 Principles, 4 Essential Activities | Erder / Pureur / Woods |
| `architecture/05-adr.md` | Structure, MADR, Lifecycle, ADR as Code | Michael Nygard |

### AWS Well-Architected (2 documents)

| File | Content | Original Author |
|------|---------|-----------------|
| `aws-well-architected/01-six-pillars.md` | Operational Excellence, Security, Reliability, Performance, Cost, Sustainability | AWS |
| `aws-well-architected/02-review-process-and-lenses.md` | Review Process, 16+ Lenses, Rozanski & Woods mapping | AWS |

---

## Phase-to-Knowledge Base Mapping

Each phase loads **specific** knowledge base files before executing. This is not optional — it is wired into the phase commands. The AI reads these documents first, then generates constrained by their contents.

| Phase | Knowledge Base Files Loaded | Purpose |
|-------|---------------------------|---------|
| **Phase 0: Requirements** | `discovery/01-impact-mapping.md`, `discovery/02-user-story-mapping.md` | Structure requirements as Impact Maps and Story Maps, not wish lists |
| **Phase 1: Discovery** | `domain-storytelling/01-core-elements.md`, `domain-storytelling/02-story-types-and-rules.md`, `event-storming/01-building-blocks.md`, `event-storming/02-workshop-formats.md`, `event-storming/03-facilitation-techniques.md`, `event-modeling/01-event-modeling-complete.md` | Simulate domain storytelling, event storming, and event modeling workshops |
| **Phase 2: Strategic Design** | `ddd/04-strategic-design.md`, `ddd/05-distillation.md`, `api-design/01-api-design-principles.md`, `api-design/02-api-specifications.md`, `event-driven-architecture/01-messaging-patterns.md`, `event-driven-architecture/02-schema-evolution.md`, `event-driven-architecture/03-consistency-patterns.md`, `microservice-patterns/01-decomposition-and-communication.md` | Define Bounded Contexts using Evans' strategic patterns, plan inter-BC communication |
| **Phase 3: Tactical Design** | `ddd/02-building-blocks.md`, `ddd/03-refactoring-deeper-insight.md`, `ooad/01-ooad-complete.md`, `ooad/02-rich-domain-model-principles.md`, `clean-architecture/01-clean-architecture-complete.md`, `microservice-patterns/02-data-patterns.md`, `microservice-patterns/03-resilience-patterns.md`, `frontend-architecture/01-component-architecture.md`, `frontend-architecture/02-state-and-data.md`, `frontend-architecture/03-micro-frontends.md` | Design aggregates, domain model, API contracts, and frontend architecture |
| **Phase 3c: UX Design** | *(uses ui-ux-pro-max skill)* | Visual design system constrained by domain model actor views |
| **Phase 4: Specification** | `bdd/01-bdd-complete.md`, `tdd/01-tdd-complete.md`, `xp/01-xp-complete.md`, `contract-testing/01-contract-testing-complete.md`, `web-testing/01-test-strategy-shapes.md`, `web-testing/02-e2e-testing.md`, `web-testing/03-web-integration-testing.md`, `security/01-threat-modeling.md`, `security/02-auth-patterns.md`, `security/03-secure-coding.md`, `refactoring/01-code-smells.md`, `refactoring/02-refactoring-catalog.md`, `clean-architecture/01-clean-architecture-complete.md` | Write BDD scenarios, define test strategy, model threats, plan contracts |
| **Phase 5: Delivery** | `continuous-delivery/01-core-principles.md`, `continuous-delivery/02-deployment-strategies.md`, `continuous-delivery/03-practices.md`, `observability/01-three-pillars.md`, `observability/02-opentelemetry.md`, `observability/03-sli-slo-alerting.md`, `security/03-secure-coding.md` | Design CI/CD pipeline, IaC, observability, SLI/SLO |
| **Phase 6: Review** | `architecture/01-rozanski-woods.md`, `architecture/04-continuous-architecture.md`, `architecture/05-adr.md`, `aws-well-architected/01-six-pillars.md`, `aws-well-architected/02-review-process-and-lenses.md`, `clean-architecture/01-clean-architecture-complete.md`, `ooad/02-rich-domain-model-principles.md` | Systematic architecture review across 7 viewpoints and 10 perspectives |
| **Phase 7: Documentation** | `architecture/02-c4-model.md`, `architecture/03-uml.md` | Generate C4 diagrams, sequence diagrams, state machines in Mermaid |
| **Phase 8: Implementation** | `clean-architecture/01-clean-architecture-complete.md`, `ooad/02-rich-domain-model-principles.md`, `tdd/01-tdd-complete.md`, `xp/01-xp-complete.md`, `refactoring/01-code-smells.md`, `microservice-patterns/03-resilience-patterns.md` | Generate code constrained by architecture artifacts using TDD and Clean Architecture |

Notice the pattern: earlier phases load **design** knowledge (DDD strategic, Event Storming), middle phases load **specification** knowledge (BDD, testing, security), and later phases load **implementation** knowledge (TDD, refactoring, Clean Architecture). The knowledge follows the constraint chain.

---

## How Knowledge Constrains Generation

The knowledge base does not serve as "background reading." It functions as **operational constraints** that directly shape the AI's output. Here is a concrete example of how this works.

### Example: Aggregate Design in Phase 3

When Phase 3 designs aggregates, it loads `ddd/02-building-blocks.md`. That document contains Vernon's Four Rules for aggregate design:

1. **Protect business invariants inside Aggregate boundaries**
2. **Design small Aggregates**
3. **Reference other Aggregates by identity only**
4. **Update other Aggregates using eventual consistency**

These rules are not suggestions. They are **hard constraints** on the generation. When the AI encounters a design decision — say, whether the `Order` aggregate should hold a direct reference to the `Customer` aggregate — it doesn't weigh the pros and cons in general terms. It reads Rule 3 and resolves it: reference by `CustomerId`, not by `Customer`.

### The Constraint Chain in Action

Consider a single business requirement flowing through the pipeline:

```
Requirement: "Barista marks drink as ready"

Phase 0 (KB: Impact Mapping)
  → Impact Map deliverable: "Barista status update"

Phase 1 (KB: Event Storming building blocks)
  → Command: MarkDrinkReady
  → Event: DrinkReadyMarked
  → Read Model: OrderBoard shows drink ready

Phase 2 (KB: DDD Strategic Design)
  → Bounded Context: Preparation
  → Integration event to Ordering context

Phase 3 (KB: DDD Building Blocks + OOAD)
  → Aggregate: PreparationOrder
  → Method: markReady() — enforces Tell Don't Ask
  → Domain Event: DrinkReadyMarked emitted inside aggregate
  → Rule: Small aggregate — only preparation state, not full order

Phase 4 (KB: BDD + TDD)
  → Scenario: "Given a drink in preparation, When barista marks it ready,
               Then drink status is READY and DrinkReadyMarked event is emitted"
  → Test doubles defined per London School TDD

Phase 8 (KB: Clean Architecture + Refactoring)
  → Application Service in use-case layer
  → Aggregate in domain layer
  → Repository interface in domain, implementation in infrastructure
  → No domain logic leaks into the controller
```

At every phase transition, the knowledge base provides the **precise vocabulary and rules** that constrain the output. The aggregate isn't just "an object" — it is an object that satisfies Vernon's Four Rules. The BDD scenario isn't just "a test" — it follows Example Mapping structure. The package layout isn't arbitrary — it satisfies the Dependency Rule.

### Precision vs. General Knowledge

Here is the difference the knowledge base makes:

| Without Knowledge Base | With Knowledge Base |
|----------------------|-------------------|
| Aggregate has getters for all fields | Aggregate exposes behavior, not state (Tell Don't Ask from `ooad/02`) |
| Aggregate holds references to other aggregates | Aggregate references by identity only (Vernon Rule 3 from `ddd/02`) |
| Domain events are strings | Domain events are past-tense facts with specific payload (from `event-storming/01`) |
| Test strategy is "write unit tests" | Test strategy follows Trophy shape with integration-heavy emphasis (from `web-testing/01`) |
| API is CRUD: `PUT /orders/{id}` | API is task-based: `POST /orders/{id}/mark-ready` (from `api-design/01`) |
| Architecture review is "looks good to me" | Architecture review covers 7 viewpoints and 10 perspectives (from `architecture/01`) |

---

## The Layered Knowledge Model

The 58 documents are not independent — they form a **layered knowledge model** where each layer builds on the ones below:

```
Layer 4: Delivery & Operations
  continuous-delivery/ + observability/ + aws-well-architected/
  "How do we deploy, monitor, and operate the system?"
         │
         ▼ constrained by
Layer 3: Specification & Quality
  bdd/ + tdd/ + xp/ + web-testing/ + contract-testing/ + security/
  "How do we verify the system is correct and secure?"
         │
         ▼ constrained by
Layer 2: Architecture & Design
  ddd/ + clean-architecture/ + ooad/ + refactoring/ + api-design/
  + event-driven-architecture/ + microservice-patterns/ + frontend-architecture/
  "How do we structure the system?"
         │
         ▼ constrained by
Layer 1: Discovery & Modeling
  discovery/ + domain-storytelling/ + event-storming/ + event-modeling/
  "What is the problem domain?"
         │
         ▼ constrained by
Layer 0: Architecture Governance
  architecture/ (Rozanski & Woods, C4, Continuous Architecture, ADRs)
  "What architectural principles govern all decisions?"
```

Each layer **constrains** the layers above it. You cannot write meaningful BDD scenarios (Layer 3) without understanding the aggregates and commands (Layer 2). You cannot design aggregates without understanding the events and domain stories (Layer 1). And all of it is governed by the architectural principles and viewpoints (Layer 0).

---

## Document Quality Standards

Every knowledge base document follows a consistent structure:

1. **Precise definitions** — not paraphrases, but the actual rules and patterns from the original authors
2. **Concrete examples** — showing correct and incorrect application
3. **DDD connection** — how the methodology integrates with the DDD-centric ACG pipeline
4. **Anti-patterns** — what to avoid, with explanations of why
5. **Checklist** — verification criteria the AI can use during quality gates

This consistency matters because the AI reads these documents programmatically. A vague document produces vague output. A precise document produces precise output.

---

## Extending the Knowledge Base

The knowledge base is **open for extension**. You can add your own methodology documents to customize ACG behavior for your organization's specific practices.

### Adding a New Document

1. Create a Markdown file in the appropriate subdirectory:
   ```
   knowledge-base/your-methodology/01-your-document.md
   ```

2. Follow the standard structure: definitions, examples, DDD connection, anti-patterns, checklist.

3. Register it in `knowledge-base/00-index.md`.

4. Wire it into the relevant phase command in `.claude/commands/phase/`.

### Example: Adding Company-Specific Patterns

Suppose your organization uses a specific event sourcing framework with its own conventions:

```
knowledge-base/company/01-our-event-store.md
```

This document would describe:
- Your event store's API and conventions
- Your event naming standards
- Your snapshot strategy
- Your projection patterns

Wire it into Phase 8 (Implementation), and the generated code will follow **your** conventions, not generic ones.

### Example: Adding a New Methodology Area

Suppose you want ACG to incorporate Wardley Mapping into strategic design:

```
knowledge-base/wardley-mapping/01-core-concepts.md
knowledge-base/wardley-mapping/02-evolution-and-movement.md
```

Register them in the index, wire them into Phase 2 (Strategic Design), and the AI will use Wardley Maps to inform Bounded Context boundary decisions.

### Overriding Existing Knowledge

You can also **replace** existing documents if you disagree with a specific approach. If your team prefers the Chicago School of TDD over the London School, modify `tdd/01-tdd-complete.md` to emphasize state-based testing. The AI will follow whatever the document says.

---

## Why Not Just Prompt Engineering?

A reasonable question: why maintain 58 documents when you could put the key rules in the system prompt?

Three reasons:

**1. Context window management.** Loading all 58 documents at once would consume the entire context window. The phase-based loading strategy means each phase only reads the 2-12 documents it needs, leaving context space for the actual artifacts being generated.

**2. Precision at scale.** A system prompt can hold a few dozen rules. The knowledge base holds thousands of precise definitions, patterns, anti-patterns, and examples. Vernon's Four Rules fit in a prompt. Vernon's Four Rules plus aggregate implementation patterns plus factory patterns plus repository patterns plus domain event patterns do not.

**3. Maintainability.** When Evans publishes a new insight or when your team discovers a new pattern, you update one Markdown file. You don't reverse-engineer which prompt contains which rule.

The knowledge base is ACG's **long-term memory** — too large to fit in a single prompt, but available precisely when needed.

---

## Summary

The knowledge base is the foundation that makes "constrained" generation possible. Without it, the AI generates code based on statistical averages of its training data. With it, the AI generates code based on the **precise rules** defined by Evans, Vernon, Brandolini, Martin, Beck, and the other methodology authors.

| Aspect | Detail |
|--------|--------|
| **Total documents** | 58 |
| **Methodology areas** | 22 |
| **Original authors referenced** | 20+ |
| **Documents loaded per phase** | 2-13, depending on phase complexity |
| **Extensible** | Yes — add your own documents and wire them into phases |
| **Format** | Markdown with consistent structure |
| **Purpose** | Transform general AI knowledge into precise, methodology-constrained generation |

The knowledge base answers a simple question: **How do you make an AI care about the difference between a good aggregate and a bad one?** You give it the exact definition of "good" — written by the person who invented the concept.

---

[<< Previous: Quality Gates & Feedback Loops](./13-quality-gates-and-feedback-loops.md) | [Table of Contents](./README.md) | [Next: Assessment Gates >>](./15-assessment-gates.md)
