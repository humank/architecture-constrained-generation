# Chapter 17: Getting Started

> *"The secret of getting ahead is getting started."* — Mark Twain
>
> You've read the theory. Now **run it**.

---

## Prerequisites

You need exactly two things:

1. **Claude Code CLI** — installed and authenticated ([installation guide](https://docs.anthropic.com/en/docs/claude-code))
2. **A requirements document** — this can be anything: plain text, Markdown, user stories, a PRD, even a rough paragraph describing what you want to build

That's it. No Docker, no language runtimes, no cloud accounts. ACG generates the project; you decide when to build and deploy.

---

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/anthropics/architecture-constrained-generation.git
cd architecture-constrained-generation
```

### Step 2: There Is No Step 2

The skills live in `.claude/commands/`. Claude Code auto-discovers any `.md` file in that directory and registers it as a slash command. No `npm install`, no `pip install`, no build step.

Verify it works:

```bash
claude
```

Inside the Claude Code session, type `/` and you should see `architect` in the autocomplete list.

---

## Your First Run

### Start the Orchestrator

```
claude
> /architect examples/coffeeshop-requirements.md
```

The orchestrator reads your requirements file and begins the pipeline:

1. **Phase 0 — Requirements**: Parses your document, builds an Impact Map, creates User Story Maps, and seeds the Ubiquitous Language glossary.
2. **Phase 1 — Discovery**: Runs Domain Storytelling and Event Storming (Big Picture, Process Level, Design Level).
3. **Assessment Gate**: The orchestrator **pauses** and asks you to make architecture decisions — Bounded Context boundaries, technology stack, deployment targets.
4. **Phases 2–8**: Strategic Design through Implementation, each constrained by every artifact that came before.

### What You'll See

The orchestrator prints progress as it works:

```
[Phase 0] Reading requirements from examples/coffeeshop-requirements.md
[Phase 0] Impact Map created → .arch/phase-00/impact-map.md
[Phase 0] User Story Map created → .arch/phase-00/user-story-map.md
[Phase 0] Glossary seeded → .arch/glossary.md
[Phase 0] ✓ Quality gate passed (3/3 checks)

[Phase 1] Beginning Domain Storytelling...
[Phase 1] Event Storming — Big Picture...
...
```

All artifacts are written to the `.arch/` directory. Nothing is held in memory.

---

## Resume from Any Point

Every piece of state lives in `.arch/` files. There is no in-memory state, no session tokens, no database. This means:

- **Close your terminal mid-run** — no problem. Run `/architect` again and it detects existing artifacts and continues from where it left off.
- **Assessment decisions persist** — once you answer the architecture questionnaire, those choices are stored in `.arch/assessments/` and reused on subsequent runs.
- **Switch machines** — commit the `.arch/` directory to version control and resume on any machine with Claude Code installed.

```
# Resume after interruption
claude
> /architect examples/coffeeshop-requirements.md
```

The orchestrator scans `.arch/`, identifies completed phases, and picks up at the next incomplete phase.

---

## Customization

### Using Your Own Requirements

Pass a file path:

```
> /architect path/to/your-requirements.md
```

Or provide requirements inline:

```
> /architect Build a restaurant reservation system with online booking, table management, waitlist tracking, and kitchen display integration
```

The requirements can be as short as a sentence or as detailed as a multi-page PRD. More detail produces more precise architecture.

### Extending the Knowledge Base

The knowledge base in `knowledge-base/` contains 50+ methodology documents organized by category. To add your own:

1. Place your document in the appropriate category folder under `knowledge-base/`.
2. Update `knowledge-base/00-index.md` with the new entry.
3. Reference the document in the relevant phase skill file under `.claude/commands/phase/`.

For example, to add a company-specific API design guideline:

```bash
# Add the document
cp your-api-guidelines.md knowledge-base/api-design/company-api-standards.md

# Update the index
# Edit knowledge-base/00-index.md to include the new entry

# Reference in Phase 3 (Tactical Design) if applicable
# Edit .claude/commands/phase/03-tactical.md to reference the new doc
```

### Adjusting Quality Gates

Quality gates are defined in `.claude/commands/util/quality-gate.md`. You can:

- **Add anti-pattern checks** — define new patterns to detect and reject.
- **Remove checks** — comment out or delete checks that don't apply to your context.
- **Tune feedback loop thresholds** — adjust how aggressively the system self-corrects.

### Adding New Phases

To extend the pipeline with a custom phase:

1. Create a new phase file: `.claude/commands/phase/09-your-phase.md`
2. Follow the structure of existing phase files (inputs, outputs, quality checks).
3. Update the orchestrator in `.claude/commands/architect.md` to include your phase in the pipeline sequence.

---

## Utility Skills

ACG includes standalone utility skills you can invoke outside the main pipeline:

| Skill | Command | Purpose |
|-------|---------|---------|
| **Assessment** | `/assessment` | Manually trigger an assessment gate to make or revise architecture decisions. |
| **Quality Gate** | `/quality-gate [phase]` | Run quality checks on a specific phase's artifacts without re-running the phase. |
| **Glossary Manager** | `/glossary show\|add\|search\|validate` | Manage the Ubiquitous Language: view terms, add new ones, search, or validate code against the glossary. |
| **Refactoring Advisor** | `/refactoring-advisor` | Analyze code for 27 code smells with 66 refactoring suggestions drawn from Fowler's catalog. |

Examples:

```
> /glossary show                    # Display all terms
> /glossary add Order               # Add a new term interactively
> /glossary validate src/           # Check code for glossary violations
> /quality-gate 03                  # Run quality checks on Phase 3
> /refactoring-advisor src/order/   # Analyze order module for code smells
```

---

## Project Structure Reference

```
architecture-constrained-generation/
├── .claude/commands/
│   ├── architect.md              # Main orchestrator
│   ├── phase/
│   │   ├── 00-requirements.md    # Impact Mapping, User Story Mapping
│   │   ├── 01-discovery.md       # Domain Storytelling, Event Storming
│   │   ├── 02-strategic.md       # Bounded Contexts, Context Maps
│   │   ├── 03-tactical.md        # Aggregates, Clean Architecture, APIs
│   │   ├── 03c-ux-design.md      # Domain-driven visual design
│   │   ├── 04-specification.md   # BDD, Test Strategy, Threat Modeling
│   │   ├── 05-delivery.md        # CI/CD, IaC, Observability
│   │   ├── 06-review.md          # Rozanski & Woods, ADRs
│   │   ├── 07-documentation.md   # C4 Diagrams, Living Documentation
│   │   └── 08-implementation.md  # Architecture-constrained code generation
│   └── util/
│       ├── assessment.md          # Assessment gate skill
│       ├── quality-gate.md        # Quality gate skill
│       ├── glossary-manager.md    # Ubiquitous Language manager
│       └── refactoring-advisor.md # Code smell detection
├── knowledge-base/                # 50+ methodology documents
├── examples/                      # Example requirements
└── tutorials/                     # This guide
```

---

## Tips for Best Results

**Write detailed requirements.** The coffeeshop example in `examples/` is a good template. The more context you provide about actors, workflows, constraints, and non-functional requirements, the more precise every downstream artifact becomes.

**Don't skip assessment gates.** When the orchestrator pauses for your input, it is asking questions that shape every phase that follows. A wrong Bounded Context boundary in Phase 2 cascades into wrong Aggregates in Phase 3, wrong BDD scenarios in Phase 4, and wrong code in Phase 8. Take the time to answer thoughtfully.

**Review quality gate reports.** Quality gates exist to catch issues while they're cheap to fix. A naming inconsistency caught in Phase 1 costs seconds to fix. The same inconsistency caught in Phase 8 means regenerating code.

**The glossary is your source of truth.** If your domain calls it an "Order" and not a "Purchase," the glossary enforces that everywhere — in Bounded Contexts, Aggregates, API endpoints, class names, and test descriptions. Keep it accurate.

**Commit `.arch/` to version control.** These artifacts are not throwaway. They are the architecture record of your system. Future developers (and future runs of ACG) depend on them.

---

## What's Next

You have everything you need. Here are three paths forward:

1. **Run it on your own project.** Take a real requirements document — even a rough one — and run `/architect` against it. The output will surprise you.

2. **Explore the knowledge base.** The 50+ documents in `knowledge-base/` are a graduate-level survey of software architecture and design methodologies. Even if you never run ACG, they're worth reading.

3. **Contribute.** ACG is open to extension:
   - Add knowledge base documents for methodologies not yet covered.
   - Improve phase skills with better prompts and checks.
   - Add anti-pattern guards to catch new failure modes.
   - Write new utility skills for your workflow.

---

> *"The best time to plant a tree was 20 years ago. The second best time is now."*
>
> Run `/architect`. Build something.

---

[← Previous: Walkthrough — The Coffeeshop](./16-walkthrough-coffeeshop.md) | [Table of Contents](./README.md)
