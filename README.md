# Architecture Constrained Generation (ACG)

![Architecture blueprint — from design to code](https://images.unsplash.com/photo-1721244654392-9c912a6eb236?w=1200&h=400&fit=crop&q=80)

> **From requirements to running code — with every line traceable to an architecture decision.**

Architecture Constrained Generation is a [Claude Code](https://claude.com/claude-code) skill that transforms business requirements into a fully implemented, deployed, and verified system through a 10-phase pipeline. It combines 20+ software engineering methodologies — DDD, Event Storming, Event Modeling, BDD, TDD, Clean Architecture, XP, and more — into a single coherent workflow.

## The Core Idea

Traditional code generation asks: *"What code should I write?"*

ACG asks: *"Given these bounded contexts, these aggregate invariants, these BDD scenarios, these API contracts, these deployment targets — what is the **only** correct code?"*

The difference is the **constraint chain**. Each phase produces artifacts that constrain the next phase, creating a traceable path from business requirements to working code.

## The Ten Phases

```
Phase 0: Requirements    → Impact Map, Story Map, Ubiquitous Language
Phase 1: Discovery       → Domain Storytelling, Event Storming, Event Modeling
Phase 2: Strategic Design → Bounded Contexts, Context Map, Subdomain Classification
Phase 3: Tactical Design  → Aggregates (Vernon's 4 Rules), API Contracts, Actor Views
Phase 3c: UX Design       → Design System, Status→Color Mapping, Accessibility
Phase 4: Specification    → BDD Scenarios, Test Strategy, Threat Model, Contract Tests
Phase 5: Delivery         → CI/CD Pipeline, IaC (CDK/Terraform), Observability, SLI/SLO
Phase 6: Review           → 7 Viewpoints, 10 Perspectives, Anti-Pattern Detection, ADRs
Phase 7: Documentation    → C4 Diagrams, Domain Models, Sequence Diagrams (all Mermaid)
Phase 8: Implementation   → Architecture-constrained code generation with TDD
Phase 9: Deploy & Verify  → Deploy to target environment, post-deployment verification
```

## Key Features

- **Human-in-the-loop**: Mandatory assessment gates before architecture decisions (Phase 2) and technology stack (Phase 8)
- **Self-correcting**: 27 anti-pattern guards, 6 consistency threads, 29 feedback loops
- **Cross-layer type safety**: 8 cross-layer type contract checks (CL-1 to CL-8) prevent frontend↔backend drift at the architecture level
- **Testing golden triangle**: Unit tests → Integration tests (cross-layer curl) → E2E tests → Post-deployment verification — no layer can be skipped
- **Resumable**: All state is in `.arch/` files — run `/architect` again to continue from where you left off
- **Knowledge-powered**: 50+ reference documents spanning 20+ methodologies ensure precise, methodology-faithful outputs
- **Living documentation**: All diagrams in Mermaid + Markdown, previewable in VS Code and GitHub

## Quick Start

### Prerequisites

- [Claude Code](https://claude.com/claude-code) CLI installed

### Run

```bash
# Clone the repository
git clone https://github.com/anthropics/architecture-constrained-generation.git
cd architecture-constrained-generation

# Start Claude Code
claude

# Run the architect skill with the example
> /architect examples/coffeeshop-requirements.md
```

The orchestrator will:
1. Parse your requirements
2. Walk through each phase, producing structured artifacts in `.arch/`
3. Pause at assessment gates for your decisions
4. Run quality gates between phases
5. Generate constrained, tested code
6. Deploy to target environment and verify with post-deployment checks (Phase 9)

### Use Your Own Requirements

```bash
> /architect path/to/your-requirements.md
```

Or describe your system inline:

```bash
> /architect Build a restaurant reservation system with table management, waitlist, and SMS notifications
```

## Project Structure

```
architecture-constrained-generation/
├── .claude/commands/
│   ├── architect.md              # Main orchestrator (10-phase pipeline)
│   ├── phase/
│   │   ├── 00-requirements.md    # Impact Mapping, Story Mapping
│   │   ├── 01-discovery.md       # Event Storming, Event Modeling
│   │   ├── 02-strategic.md       # Bounded Contexts, Context Maps
│   │   ├── 03-tactical.md        # Aggregates, API Contracts, Cross-Layer Type Contract
│   │   ├── 03c-ux-design.md      # Design System, Accessibility
│   │   ├── 04-specification.md   # BDD, Contract Tests, Query Endpoint Scenarios
│   │   ├── 05-delivery.md        # CI/CD, IaC, Post-Deployment Verification
│   │   ├── 06-review.md          # R&W Viewpoints, Perspectives, Cross-Layer Consistency
│   │   ├── 07-documentation.md   # C4 Diagrams, Mermaid documentation
│   │   └── 08-implementation.md  # Code generation, Testing Golden Triangle, Deploy
│   └── util/
│       ├── assessment.md         # Assessment gate protocol
│       ├── quality-gate.md       # 27 anti-patterns, 6 threads, 29 loops
│       ├── glossary-manager.md   # Ubiquitous Language management
│       └── refactoring-advisor.md # 27 code smells, 66 refactoring techniques
├── knowledge-base/               # 50+ methodology reference documents
│   ├── 00-index.md               # Knowledge base index
│   ├── ddd/                      # Evans Blue Book + Vernon IDDD
│   ├── event-storming/           # Brandolini's method
│   ├── event-modeling/           # Dymitruk's method
│   ├── bdd/                      # BDD, Three Amigos, Gherkin
│   ├── tdd/                      # TDD, Three Laws
│   ├── clean-architecture/       # Martin's Dependency Rule
│   ├── xp/                       # Beck's XP values & practices
│   └── ...                       # 15+ more methodology areas
├── examples/
│   └── coffeeshop-requirements.md # Complete example requirements
└── tutorials/                    # O'Reilly-style comprehensive guide
    └── README.md                 # Tutorial table of contents
```

## Methodologies Integrated

| Category | Methodologies |
|----------|--------------|
| **Discovery** | Impact Mapping (Adzic), User Story Mapping (Patton), Domain Storytelling |
| **Domain Modeling** | DDD (Evans), Event Storming (Brandolini), Event Modeling (Dymitruk) |
| **Architecture** | Clean Architecture (Martin), Hexagonal/Ports & Adapters, C4 Model (Brown) |
| **Quality** | BDD (North), TDD (Beck), XP (Beck), SOLID, GRASP, Consumer-Driven Contract Testing |
| **Review** | Rozanski & Woods (7 Viewpoints, 10 Perspectives), STRIDE Threat Modeling |
| **Cross-Layer** | 8 Type Contract Checks (CL-1–CL-8), Testing Golden Triangle |
| **Operations** | Observability (Three Pillars), SLI/SLO, AWS Well-Architected Framework |
| **Delivery** | Continuous Delivery, Contract Testing (Pact), Infrastructure as Code, Post-Deployment Verification |

## Cross-Layer Type Contract

A key challenge in full-stack systems is **frontend↔backend drift** — where the backend serializes data one way and the frontend expects another. ACG prevents this with 8 mandatory checks enforced across Phases 3, 4, and 8:

| Check | What it Prevents |
|-------|-----------------|
| **CL-1** Semantic filter vs enum literal | `?status=active` is NOT an enum value — needs explicit controller logic |
| **CL-2** Enum value casing | Java `PLACED` vs frontend `Placed` — serialization format must be specified |
| **CL-3** Money representation | Is `totalAmount: 120` in dollars or cents? Backend and frontend must agree |
| **CL-4** DateTime format | Jackson `LocalDateTime` → array by default, but frontend expects ISO-8601 string |
| **CL-5** Null vs empty collection | `items: null` vs `items: []` — frontend `items.filter()` crashes on null |
| **CL-6** Boolean serialization | Java `boolean isActive` → JSON `{"active": true}` (Jackson drops `is` prefix) |
| **CL-7** Pagination envelope | `{ content: [], totalPages }` vs flat array — frontend must know the shape |
| **CL-8** Error response shape | JSON `{error, message, timestamp}` vs HTML Whitelabel — frontend must parse it |

These checks are:
- **Defined** in Phase 3 (`frontend-architecture.yaml` → `cross_layer_type_contract`)
- **Specified** in Phase 4 (BDD scenarios in `cross-layer-integrity.feature`, consumer-driven contracts in `frontend-backend.yaml`)
- **Reviewed** in Phase 6 (`cross-phase-consistency.md` → Thread 6: Cross-Layer Type Consistency)
- **Tested** in Phase 8 (backend `@WebMvcTest` + frontend MSW integration tests)
- **Verified** in Phase 9 (curl against deployed URLs)

## Testing Golden Triangle

ACG enforces a layered testing strategy where **no layer can be skipped**:

```
Unit Tests (domain logic)
  └→ Integration Tests (cross-layer curl with exact frontend query params)
       └→ E2E Tests (Playwright critical user journeys)
            └→ Post-Deployment Verification (same checks against deployed URLs)
```

Phase 8 generates all test layers. Phase 9 runs the post-deployment verification — confirming that what passed locally also passes in the real environment (CloudFront, ALB, EKS).

## Utility Skills

| Skill | Usage | Description |
|-------|-------|-------------|
| `/architect` | `/architect [requirements]` | Main orchestrator — runs the full pipeline |
| `/assessment` | `/assessment [phase]` | Manually trigger an assessment gate |
| `/quality-gate` | `/quality-gate [phase\|all]` | Run quality checks on phase outputs |
| `/glossary` | `/glossary show\|add\|search\|validate` | Manage the Ubiquitous Language |
| `/refactoring-advisor` | `/refactoring-advisor` | Analyze code for smells with refactoring suggestions |

## Tutorials — The Complete Guide

[![Tutorials](https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&h=250&fit=crop&q=80)](./tutorials/README.md)

For a comprehensive, O'Reilly-style guide to ACG's design philosophy, methodology integration, and real-world usage:

**[Read the Full Tutorial →](./tutorials/README.md)** — 17 chapters in 4 parts

| Part | Chapters | What You'll Learn |
|------|----------|-------------------|
| **I. The Vision** | [01](./tutorials/01-why-architecture-constrained-generation.md)–[02](./tutorials/02-the-methodology-map.md) | Why ACG exists, how 20+ methodologies weave together |
| **II. The Ten Phases** | [03](./tutorials/03-phase-0-requirements.md)–[12](./tutorials/12-phase-8-implementation.md) | Deep dive into each phase: Requirements → Discovery → Strategic → Tactical → UX → Specification → Delivery → Review → Documentation → Implementation → Deploy & Verify |
| **III. The Engine Room** | [13](./tutorials/13-quality-gates-and-feedback-loops.md)–[15](./tutorials/15-assessment-gates.md) | Quality gates (27 anti-patterns), feedback loops (29), knowledge base (50+ docs), assessment gates |
| **IV. Putting It Together** | [16](./tutorials/16-walkthrough-coffeeshop.md)–[17](./tutorials/17-getting-started.md) | Complete coffeeshop walkthrough, installation & getting started |

## Output Artifacts

When you run `/architect`, all design artifacts are written to `.arch/`:

```
.arch/
├── glossary.yaml                 # Ubiquitous Language
├── assessment-2.md               # Architecture decisions
├── assessment-8.md               # Technology stack
├── 00-requirements/              # Impact map, story map, parsed requirements
├── 01-discovery/                 # Event storm, event model
├── 02-strategic/                 # Bounded contexts, context map
├── 03-tactical/                  # Aggregates, domain models, API contracts, cross-layer type contract
├── 03c-ux-design/                # UX design report
├── 04-specification/
│   ├── features/                 # BDD features including query-endpoints and cross-layer-integrity
│   └── contracts/                # Consumer-driven contracts (frontend-backend.yaml)
├── 05-delivery/                  # Pipeline (8 stages + post-deployment), observability, runbooks
├── 06-review/                    # Viewpoints, perspectives, ADRs, cross-phase-consistency
├── 07-documentation/             # C4 diagrams, domain models, sequences
├── 08-implementation/            # Implementation report with post-deployment verification results
└── quality-reports/
    ├── pipeline-run-report.yaml
    └── deployment-verification.yaml  # Post-deployment check results (Phase 9)
```

Executable code is generated at the project root (`iac/`, `k8s/`, and application source code).

## License

MIT
