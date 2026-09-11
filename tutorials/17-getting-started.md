# Chapter 17: Getting Started

![Rocket launch — getting started with Architecture Constrained Generation](https://images.unsplash.com/photo-1680391380341-b67592040e21?w=1200&h=400&fit=crop&q=80)

*Photo by [Unsplash](https://unsplash.com) — Free to use under [Unsplash License](https://unsplash.com/license)*

> *"The secret of getting ahead is getting started."* — Mark Twain
>
> You've read the theory. Now **run it**.

---

## Prerequisites

You need three things:

1. **Claude Code CLI** — installed and authenticated ([installation guide](https://docs.anthropic.com/en/docs/claude-code))
2. **[Bun](https://bun.sh)** — the ACG engine runs on it. `curl -fsSL https://bun.sh/install | bash`
3. **A requirements document** — this can be anything: plain text, Markdown, user stories, a PRD, even a rough paragraph describing what you want to build

No Docker, no cloud account, and no runtime for the language you're *targeting* — ACG generates the project; you decide when to build and deploy. But the engine itself is real code, and it needs Bun.

---

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/humank/architecture-constrained-generation.git
cd architecture-constrained-generation
```

### Step 2: Install the Engine

```bash
cd engine && bun install && cd ..
```

The skills themselves need no build step — they live in `.claude/commands/` and Claude Code auto-discovers any `.md` file there as a slash command. The engine is what needs installing.

### Step 3: Verify

```bash
bun engine/src/acg.ts doctor      # 139 checks: graph vs skills vs disk vs locks
bun engine/src/acg.ts sensors     # the 23-sensor catalogue
cd engine && bun run test && cd .. # 97 tests, no network
```

Then start a session:

```bash
claude
```

Type `/` and you should see `architect` in the autocomplete list.

---

## Working on Your Own Project

The coffeeshop in this repository is a **sample**, and it ships five deliberate defects so
the engine has something to catch. **Do not inherit it.** Keep the toolkit somewhere else
and initialise your own project:

```bash
git clone https://github.com/humank/architecture-constrained-generation.git ~/tools/acg
cd ~/tools/acg/engine && bun install

cd ~/work/my-system
bun ~/tools/acg/engine/src/acg.ts init --project my-system --profile generic
```

`init` writes only what is yours to fill in — the schemas, the phase skills, the reviewer
subagent, the hooks, and two draft questionnaires. It copies no domain stories, no
requirements, and nothing else from the sample. The board it produces is honestly `[ ]` all
the way down.

Full instructions, including the two locked answers that decide which checks apply to you
and how to keep the copied toolkit current with `init --upgrade`, are in
[`docs/adopting-acg.md`](../docs/adopting-acg.md).

---

## Your First Run

### Start the Orchestrator

```
claude
> /architect examples/coffeeshop-requirements.md
```

The orchestrator does **not** decide what to do next. It asks the engine, every turn:

```bash
bun engine/src/acg.ts next --json
```

and does exactly what the directive says. The run therefore looks like this:

1. **Phase 0 — Requirements**: Parses your document, builds an Impact Map and Story Map,
   seeds the glossary. Then `report --result awaiting-approval` and it stops for you.
2. **Phase 1 — Discovery**: Three separate engine stages. `01a-dst` (Domain Storytelling)
   must be *approved* before `01b-storm` (Event Storming) starts, because the storm erupts
   from approved stories rather than from a re-reading of the requirements.
3. **Assessment Gate**: `next` returns `ask-assessment`. You answer the questionnaire, the
   engine locks and fingerprints the answers, and nothing advances until it does.
4. **Phases 2–9**: Strategic Design through Deploy & Verify, each constrained by every
   artifact that came before, each gated by its sensors.

### What You'll See

```
$ bun engine/src/acg.ts status
ACG engine  project=my-system  scope=system
cursor: 01b-storm (in_progress)

[x] 00-requirements        Requirements
[x] 01a-dst                Domain Storytelling
[-] 01b-storm              Event Storming
[ ] 01c-model              Event Modeling
[ ] 02-strategic           Strategic Design
...
locks: assessment-2:missing assessment-8:missing
```

And when a phase is not ready, you get a refusal rather than a paragraph of optimism:

```
$ bun engine/src/acg.ts gate --phase 01b-storm
[fail] hotspot-classified   2 hot spots are unclassified: HS-03, HS-07
[fail] dst-storm-correspondence  DS-02.4 is a visible state-change with no event
gate refused: 2 blocking findings
```

All artifacts live in `.arch/`. All *state* lives in `.arch/acg-state.yaml`, which only the
engine may write — a hook refuses the write if an agent tries.

---

## Resume from Any Point

Every piece of state lives in `.arch/` files. There is no in-memory state, no session tokens, no database. This means:

- **Close your terminal mid-run** — no problem. Run `/architect` again. It runs
  `next --json` and continues from whatever the engine says the cursor is.
- **Decisions persist and are verifiable** — your questionnaire answers live in
  `.arch/assessment-2.yaml` and `.arch/assessment-8.yaml` with a canonical sha256
  fingerprint. Change an answer after a phase was approved under it and the engine
  notices: `next` reports the lock drift before anything else runs.
- **Switch machines** — commit `.arch/` to version control and resume anywhere.
- **Survive a compaction** — a PreCompact hook writes the board to
  `.arch/audit/breadcrumb.md` before context is lost. After compaction the conductor reads
  the breadcrumb and asks `next`, rather than reconstructing the phase from memory.

```bash
# Resume after interruption
bun engine/src/acg.ts status       # where am I, really
claude
> /architect
```

Resumption is **not** "scan the directory and guess which phases look finished".
Directories say what exists; only the engine says what was *accepted*. If you have an
existing `.arch/` with no engine state — say you ran an older version of ACG — derive the
state once:

```bash
bun engine/src/acg.ts import
```

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

There are two layers, and they are adjusted differently.

**The deterministic layer — sensors.** 23 TypeScript checks in `engine/src/sensors/`. To
add one: write the function, register it in `sensors/registry.ts`, mount it on a phase in
`engine/data/phase-graph.yaml`, and add the same name to that phase's skill frontmatter.
`doctor` fails if those disagree. Follow the three catalogue rules in
[Chapter 18](./18-the-engine.md): only ask for artifacts that exist by your phase, put a
number in every `pass` message, and never let a name-match stand in for substance.

**The semantic layer — the checklist.** 27 anti-pattern guards, 6 consistency threads and
29 feedback loops in `.claude/commands/util/quality-gate.md`, plus the independent reviewer
in `.claude/agents/acg-reviewer.md`. This is where judgement lives: prose contradicting
prose, a payload with nowhere to land, an abstraction that is only a name.

**You cannot switch a check off by editing the phase graph.** That is deliberate — a graph
users may edit is a graph where every red sensor gets deleted. Applicability comes from a
*locked* questionnaire answer, so "this does not apply to us" is a fingerprinted decision
someone can disagree with, and the sensor reports `na` naming the answer that excluded it.
If a check genuinely should not apply, set `ui_kind` or `deployment_target` in
`assessment-2` and lock it. If a finding is wrong, fix the sensor.

### Adding New Phases

A phase exists in two places that must agree:

1. Add the node to `engine/data/phase-graph.yaml`: `id`, `ordinal`, `skill`, `step`,
   `gate`, `consumes`, `produces`, `sensors`, and optionally `reviewer: true`,
   `requires_lock`, or a `when:` condition.
2. Create the skill file it points at, with matching frontmatter (`produces`, `sensors`,
   `requires_lock`, `reviewer`, `step`).
3. Run `bun engine/src/acg.ts doctor`. It will tell you precisely what disagrees.

You do **not** edit `architect.md` to sequence it. The orchestrator asks the graph.

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

## The Engine CLI

Everything about *state* goes through the engine, not through a skill:

```bash
bun engine/src/acg.ts status                 # the six-state board
bun engine/src/acg.ts next --json            # the only legitimate "what now?"
bun engine/src/acg.ts gate --phase 05-delivery --dry-run   # ask without recording
bun engine/src/acg.ts report --phase 01a-dst --result approved
bun engine/src/acg.ts review --phase 06-review --verdict rejected --note "..."
bun engine/src/acg.ts assess-lock --id assessment-2
bun engine/src/acg.ts locked-answer --id assessment-2 --key region
bun engine/src/acg.ts jump --phase 08-implementation --reason "spike"
bun engine/src/acg.ts redo --phase 03-tactical      # cascades downstream
bun engine/src/acg.ts scope --set patch             # a named subset of the graph
bun engine/src/acg.ts doctor                        # 139 drift checks
bun engine/src/acg.ts lessons                       # which sensor keeps rejecting what
bun engine/src/acg.ts audit --limit 20
bun engine/src/acg.ts profile                       # where ecosystem-bound sensors look
```

Exit codes: `0` fine, `1` bad invocation, `2` a gate refused. Full reference:
[`engine/README.md`](../engine/README.md) and [Chapter 18](./18-the-engine.md).

---

## Project Structure Reference

```
architecture-constrained-generation/
├── .claude/
│   ├── settings.json             # Wires the three hooks
│   ├── agents/
│   │   └── acg-reviewer.md       # Independent reviewer — Read/Grep/Glob only
│   └── commands/
│       ├── architect.md          # The conductor (asks the engine; never decides)
│       ├── phase/
│       │   ├── 00-requirements.md    # Impact Mapping, User Story Mapping
│       │   ├── 01-discovery.md       # DST + Event Storming + Event Modeling (3 stages)
│       │   ├── 02-strategic.md       # Bounded Contexts, Context Maps
│       │   ├── 03-tactical.md        # Aggregates, Clean Architecture, APIs
│       │   ├── 03c-ux-design.md      # Domain-driven visual design
│       │   ├── 04-specification.md   # BDD, Test Strategy, Threat Modeling
│       │   ├── 05-delivery.md        # CI/CD, IaC, Observability
│       │   ├── 06-review.md          # Rozanski & Woods, ADRs  (reviewer: true)
│       │   ├── 07-documentation.md   # C4 Diagrams, Living Documentation
│       │   ├── 08-implementation.md  # Constrained code generation  (reviewer: true)
│       │   └── 09-deploy.md          # Deploy & post-deployment verification
│       └── util/
│           ├── assessment.md          # Assessment gate skill
│           ├── quality-gate.md        # Semantic layer: 27 patterns, 6 threads, 29 loops
│           ├── glossary-manager.md    # Ubiquitous Language manager
│           └── refactoring-advisor.md # Code smell detection
├── engine/                        # The deterministic runtime — Chapter 18
│   ├── data/
│   │   ├── phase-graph.yaml       # Control plane: phases, sensors, locks, conditions
│   │   ├── scopes.yaml            # system | implement | patch
│   │   └── profiles/              # Where ecosystem-bound sensors look
│   ├── src/
│   │   ├── acg.ts                 # CLI
│   │   ├── state.ts               # The six-state machine
│   │   ├── orchestrate.ts         # next / report / review / gate / redo / doctor
│   │   ├── assess.ts              # Decision locks and fingerprints
│   │   ├── intent.ts              # Write isolation
│   │   └── sensors/               # 23 sensors + registry
│   ├── hooks/                     # PreToolUse / Stop / PreCompact
│   └── tests/                     # 298 tests; 2 fixture domains unlike the sample
├── artifact-schemas/              # What the sensors validate against
├── knowledge-base/                # 50+ methodology documents
├── docs/
│   ├── adopting-acg.md            # Using ACG on your own project
│   ├── acg-engine-development-plan.md
│   └── acg-generalization-plan.md
├── examples/                      # Example requirements
└── tutorials/                     # This guide
```

---

## Tips for Best Results

**Write detailed requirements.** The coffeeshop example in `examples/` is a good template. The more context you provide about actors, workflows, constraints, and non-functional requirements, the more precise every downstream artifact becomes.

**Don't skip assessment gates.** When the orchestrator pauses for your input, it is asking questions that shape every phase that follows. A wrong Bounded Context boundary in Phase 2 cascades into wrong Aggregates in Phase 3, wrong BDD scenarios in Phase 4, and wrong code in Phase 8. Take the time to answer thoughtfully.

**Review quality gate reports.** Quality gates exist to catch issues while they're cheap to fix. A naming inconsistency caught in Phase 1 costs seconds to fix. The same inconsistency caught in Phase 8 means regenerating code.

**The glossary is your source of truth.** If your domain calls it an "Order" and not a "Purchase," the glossary enforces that everywhere — in Bounded Contexts, Aggregates, API endpoints, class names, and test descriptions. Keep it accurate.

**Commit `.arch/` to version control.** These artifacts are not throwaway. They are the architecture record of your system. Future developers (and future runs of ACG) depend on them. That includes `.arch/acg-state.yaml` and `.arch/audit/` — the state and the trail of how it got there.

**Trust the board, not the transcript.** If the conversation says a phase is finished and `status` says `[-]`, the board is right. A model saying "Phase 5 complete" in prose is the single failure mode this engine exists to eliminate; don't reintroduce it by believing the prose.

**Run `doctor` when something feels wrong.** It is 139 checks for disagreement between the graph, the skills, the artifacts on disk, and the locks — and it is almost always faster than reasoning about which of them drifted.

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

If you want to know what is actually running underneath it — the state machine, the
sensors, the locks and the hooks — that is [Chapter 18: The Engine](./18-the-engine.md).

---

[← Previous: Walkthrough — The Coffeeshop](./16-walkthrough-coffeeshop.md) | [Table of Contents](./README.md) | [Next: The Engine →](./18-the-engine.md)
