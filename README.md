# Architecture Constrained Generation (ACG)

> **From requirements to running code — with every line traceable to an architecture decision.**

Architecture Constrained Generation is a [Claude Code](https://claude.com/claude-code) skill that transforms business requirements into a fully implemented system through a 9-phase pipeline. It combines 20+ software engineering methodologies — DDD, Event Storming, Event Modeling, BDD, TDD, Clean Architecture, XP, and more — into a single coherent workflow.

## The Core Idea

Traditional code generation asks: *"What code should I write?"*

ACG asks: *"Given these bounded contexts, these aggregate invariants, these BDD scenarios, these API contracts, these deployment targets — what is the **only** correct code?"*

The difference is the **constraint chain**. Each phase produces artifacts that constrain the next phase, creating a traceable path from business requirements to working code.

## The Nine Phases

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
```

## Key Features

- **Human-in-the-loop**: Mandatory assessment gates before architecture decisions (Phase 2) and technology stack (Phase 8)
- **Self-correcting**: 27 anti-pattern guards, 6 consistency threads, 29 feedback loops
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
│   ├── architect.md              # Main orchestrator (9-phase pipeline)
│   ├── phase/
│   │   ├── 00-requirements.md    # Impact Mapping, Story Mapping
│   │   ├── 01-discovery.md       # Event Storming, Event Modeling
│   │   ├── 02-strategic.md       # Bounded Contexts, Context Maps
│   │   ├── 03-tactical.md        # Aggregates, API Contracts, Actor Views
│   │   ├── 03c-ux-design.md      # Design System, Accessibility
│   │   ├── 04-specification.md   # BDD, Threat Model, Test Strategy
│   │   ├── 05-delivery.md        # CI/CD, IaC, Observability
│   │   ├── 06-review.md          # R&W Viewpoints, Perspectives, ADRs
│   │   ├── 07-documentation.md   # C4 Diagrams, Mermaid documentation
│   │   └── 08-implementation.md  # Code generation, Java 21 DDD patterns
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
| **Quality** | BDD (North), TDD (Beck), XP (Beck), SOLID, GRASP |
| **Review** | Rozanski & Woods (7 Viewpoints, 10 Perspectives), STRIDE Threat Modeling |
| **Operations** | Observability (Three Pillars), SLI/SLO, AWS Well-Architected Framework |
| **Delivery** | Continuous Delivery, Contract Testing (Pact), Infrastructure as Code |

## Utility Skills

| Skill | Usage | Description |
|-------|-------|-------------|
| `/architect` | `/architect [requirements]` | Main orchestrator — runs the full pipeline |
| `/assessment` | `/assessment [phase]` | Manually trigger an assessment gate |
| `/quality-gate` | `/quality-gate [phase\|all]` | Run quality checks on phase outputs |
| `/glossary` | `/glossary show\|add\|search\|validate` | Manage the Ubiquitous Language |
| `/refactoring-advisor` | `/refactoring-advisor` | Analyze code for smells with refactoring suggestions |

## Documentation

For a comprehensive guide to ACG's design philosophy, methodology integration, and usage:

**[Read the Full Tutorial](./tutorials/README.md)** — 17 chapters covering everything from the vision to a complete walkthrough.

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
├── 03-tactical/                  # Aggregates, domain models, API contracts
├── 03c-ux-design/                # UX design report
├── 04-specification/             # BDD features, contracts, threat model
├── 05-delivery/                  # Pipeline, observability, runbooks
├── 06-review/                    # Viewpoints, perspectives, ADRs
├── 07-documentation/             # C4 diagrams, domain models, sequences
├── 08-implementation/            # Implementation report
└── quality-reports/              # Quality gate reports
```

Executable code is generated at the project root (`iac/`, `k8s/`, and application source code).

## License

MIT
