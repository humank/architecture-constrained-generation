# Chapter 18: The Engine

![Mechanical gears meshing — the deterministic runtime beneath the methodology](https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=400&fit=crop&q=80)

*Photo by [Unsplash](https://unsplash.com) — Free to use under [Unsplash License](https://unsplash.com/license)*

> *"A phase is complete when its sensors pass and a human approves — never because a model said so in prose."*

---

## The Missing Half

Chapters 1 through 17 describe a methodology: ten phases, an artifact per step, a quality
gate between them. For a long time that was all ACG was — and it had a structural hole.

The methodology was a **control plane**: it said what the phases were, what each consumed
and produced, and what "good" looked like. But nothing executed it. The orchestrator
prompt (`architect.md`) described the order, and an LLM read that description and decided,
turn by turn, which phase it was in and whether that phase was done.

That is not a pipeline. That is a very well-informed guess repeated eleven times.

The failure mode is not hypothetical. It is visible in this repository's own sample. The
coffeeshop shipped with:

- BDD scenarios that gave the *cashier* the command to place an order, when the domain
  story says the Waiter does
- C4 diagrams publishing an `OrderPaid` event that appears in no Event Storm
- seven declared actor-view pages that exist in no router
- a locked AWS region of `ap-east-2` and infrastructure code hardcoding `us-east-1`
- a questionnaire asking for Spring Boot 4.x and a build file pinning 3.4.4

Every one of those passed a quality gate, because the quality gate was a paragraph asking
a model to check carefully, and the same model had just written the thing being checked.
**A prompt cannot be a gate for its own output.**

The engine is the data plane: the part that actually runs, refuses, and records.

---

## The Division of Labour

```
┌─────────────────────────────────────────────────────────────────┐
│  The conductor (Claude, driven by architect.md)                 │
│                                                                 │
│  • writes artifacts        • asks the human questions           │
│  • reads the knowledge base • explains what it did              │
│                                                                 │
│  NEVER: decides phase order, declares a phase complete,         │
│         approves its own work, edits engine state               │
└───────────────────────────────┬─────────────────────────────────┘
                                │ bun engine/src/acg.ts
┌───────────────────────────────▼─────────────────────────────────┐
│  The engine (TypeScript, deterministic, no model in the loop)   │
│                                                                 │
│  • owns the phase graph      • runs the sensors                 │
│  • owns the state machine    • enforces write isolation         │
│  • verifies decision locks   • writes the audit trail           │
└─────────────────────────────────────────────────────────────────┘
```

The conductor's every turn begins the same way:

```bash
bun engine/src/acg.ts next --json
```

Whatever that prints is what happens next. There is no other legitimate answer to
"what now?" — not a directory listing, not the last thing in the conversation, not the
model's memory of where it was.

---

## The Six States

A phase is never simply "done" or "not done":

```
[ ] pending → [-] in_progress → [?] awaiting_approval → [x] completed
                                          ↓
                                   [R] revising → back to [?]
anything unfinished → [S] skipped     (jump, with a recorded reason)
[x] → redo → [ ]                      (cascades to every later phase)
```

Illegal transitions throw. `[x]` requires **all three** of:

1. every blocking sensor green,
2. a human `approved`,
3. on `reviewer: true` phases, an independent reviewer verdict.

`bun engine/src/acg.ts status` prints the whole board:

```
ACG engine  project=coffeeshop  scope=system
cursor: 04-specification (revising)

[x] 00-requirements        Requirements
[x] 01a-dst                Domain Storytelling
[x] 01b-storm              Event Storming
[x] 01c-model              Event Modeling
[x] 02-strategic           Strategic Design
[x] 03-tactical            Tactical Design
[x] 03c-ux-design          UX Design
[R] 04-specification       Specification  gherkin-actor-matches-dst×8
[R] 05-delivery            Delivery  decision-not-restated
...
locks: assessment-2:locked assessment-8:locked
```

Note that Phase 1 is three engine stages — `01a-dst`, `01b-storm`, `01c-model` — because
the storm must erupt from an *approved* set of domain stories, not from a re-reading of
the requirements document. And note Phase 9. The methodology chapters describe ten
phases; the graph has thirteen nodes.

---

## Directives

`next --json` returns exactly one of six actions:

| `action` | What the conductor does |
|---|---|
| `run-phase` | Read the `skill` at its `step`, read every `must_read`, write every `must_write`, then `report --result awaiting-approval` |
| `await-gate` | Present the artifacts and findings. Wait for the human. Then `report --result approved` or `rejected --note "..."` |
| `await-review` | Run the `acg-reviewer` subagent, record its verdict with `review`. Never review your own work |
| `ask-assessment` | Run the assessment skill, write the YAML answers, then `assess-lock`. Stop until it locks |
| `blocked` | Show the blockers verbatim and stop. Fix the artifacts, then report again |
| `done` | Stop |

The directive also carries `intent.allowed_writes` and `intent.forbidden_writes` — the
only paths this phase may touch — plus `advisories`, `lessons`, and whether a `reviewer`
is required.

---

## Sensors: The Deterministic Layer

A **sensor** is a TypeScript function that reads artifacts and returns findings. It has
no model in it, no prompt, and no opinion. There are 23 of them.

```bash
bun engine/src/acg.ts sensors                     # the catalogue
bun engine/src/acg.ts gate --phase 05-delivery    # run this phase's sensors
bun engine/src/acg.ts gate --phase 05-delivery --dry-run   # ...without recording
```

Blocking sensors refuse `[x]`. Advisory sensors are reported and never gate. A sensor
that cannot evaluate a project reports `na` — **never `pass`** — and the reason names the
locked answer or missing profile entry that excluded it.

The full catalogue lives in [`engine/README.md`](../engine/README.md). A representative
slice:

| Sensor | Refuses |
|---|---|
| `schema-dst` | Prose domain stories; a step with no `class` or `system_visible` |
| `story-map-coverage` | An MVP `US-*` that no domain story covers |
| `dst-storm-correspondence` | A visible state-change with no event; an actor-command with no DST sentence |
| `hotspot-classified` | An open `work-unknown` hot spot, which belongs back in 01a, not forward in the model |
| `swimlane-is-story` | Swimlanes cut by bounded context — proving a BC from your own cut is circular |
| `gherkin-actor-matches-dst` | A scenario giving a command to the wrong actor |
| `decision-not-restated` | Infrastructure restating a locked decision as a literal that disagrees with it |
| `docs-events-match-storm` | A diagram inventing an event name |
| `source-fingerprint` | A route no actor view declares; a story whose E2E file is a name with no test in it |
| `commands-implemented` | A command an aggregate declares that appears in no source file |

### Three rules the catalogue is tested against

These were learned the hard way — every one of them from a sensor that was wrong in a way
no unit test noticed.

**1. A sensor may only ask for artifacts that exist by the phase it runs at.**
`actor-view-sourced-from-dst` once demanded `frontend/src/router.tsx` at Phase 3. The
router is Phase 8's output. The consequence: no greenfield UI project could pass Phase 3,
ever. The sample passed only because its router was already imported from a finished
codebase. The provenance check stayed at Phase 3; the route check moved to Phase 8.

**2. A `pass` message must say how much was checked.**
`handoff-equals-context-map` reported a confident green having examined zero handoffs —
it looked for events under `r.events` when the data lives at `integration.events`. A pass
with no number is indistinguishable from a sensor that examined nothing, so a test now
requires every `pass` message to contain a digit. Adding that test immediately exposed an
eighth sensor with the same defect.

**3. A name is not substance.**
Four E2E files, each containing a single comment naming a story, satisfied the
story-coverage check while asserting nothing at all. Four designed commands existed in no
source file while every event name, route and filename "matched". A check that matches
names is satisfied by exactly what a lazy generator produces. Both of those are decidable,
so both are now checked — `source-fingerprint` requires a declared test, and
`commands-implemented` strips comments before searching.

A sensor never throws. A missing or malformed artifact is a finding, not a crash.

---

## What Sensors Cannot Do

The honest boundary matters as much as the capability. Across seven review rounds on this
repository, the independent reviewer raised roughly fifteen findings. Exactly **one** was
something a sensor should have caught — and that sensor was broken.

The rest fell into four classes that are structurally invisible to a deterministic check:

1. **Prose contradicting prose.** Two viewpoint documents describing the same mechanism
   differently. Both are valid English; only meaning separates them.
2. **A payload with nowhere to land.** An event carrying a field that no read model, no
   projection and no screen consumes. Every name resolves; the design is still wrong.
3. **An invented path.** A document referring to a component that was never designed —
   internally consistent, externally fictional.
4. **A name with no substance.** Partially promotable (see rule 3 above), but the general
   case — "is this abstraction actually doing anything?" — is judgement.

This is why Phases 6 and 8 carry `reviewer: true`. The reviewer is a subagent with
**`Read`, `Grep`, `Glob` and nothing else**. It structurally cannot edit an artifact, move
the state machine, or approve itself. Its verdict is recorded through
`acg.ts review --verdict`, and a rejection puts the phase into `[R] revising`.

When the loop ran on this repository, Phase 6 was rejected four times — 4 then 3 then 2
then 1 blocking finding — and approved on the fifth. Phase 8 was rejected twice, then
approved. Every rejection was correct, and each was caused by the previous fix. The gate
converges, and it terminates.

Two checks were **promoted** out of the semantic layer during that process: the CL-2
shared-enum comparison and `commands-implemented`. If a reviewer finding turns out to be
decidable, it belongs in a sensor, not in a checklist that asks a model to be careful.

---

## Decision Locks

An assessment is not complete because a Markdown file says `**Status**: COMPLETED`. A
model can write that sentence. A model cannot forge a hash of answers it did not write.

```bash
bun engine/src/acg.ts assess-lock --id assessment-2        # lock the answers
bun engine/src/acg.ts lock-check --id assessment-2         # verify the fingerprint
bun engine/src/acg.ts locked-answer --id assessment-2 --key region
```

`assess-lock` requires every REQUIRED question to be answered, then records a canonical
sha256 fingerprint of the answer set. Editing an answer afterwards invalidates the lock,
and `next` returns `ask-assessment` instead of letting work continue on a decision that
changed underneath it.

Three things follow from the lock:

**Infrastructure reads rather than restates.** `scripts/deploy.sh` calls
`locked-answer --id assessment-2 --key region` instead of hardcoding a region. Two copies
of a decision are one decision and one lie waiting to happen — which is exactly what
`decision-not-restated` refuses.

**Applicability derives from locked answers.** A `when:` condition in the phase graph
makes a sensor, a path, or an entire phase conditional on a locked answer — never on
hand-editing the graph, because *a graph users may edit is a graph where every red sensor
gets deleted*. Conditions are **default-on**: unlocked, unanswered, or tampered all leave
the check running. A condition that excludes a sensor makes it report `na`, so "this does
not apply here" stays an auditable claim naming the answer that excluded it.

**Approval remembers what it approved.** The state machine records
`approved_with_lock` at approval time. If a locked answer changes afterwards, `next`
detects the drift before anything else and `doctor` reports `lock-drift/<phase>`. A phase
approved under a decision that no longer holds is not approved.

---

## Write Isolation

A phase may write only what it produces.

```json
"intent": {
  "phase": "04-specification",
  "allowed_writes": [
    ".arch/04-specification/features/",
    ".arch/04-specification/contracts/",
    ".arch/04-specification/test-strategy.yaml",
    ".arch/04-specification/threat-model.yaml",
    ".arch/glossary.yaml",
    ".arch/assessment-"
  ],
  "forbidden_writes": [".arch/acg-state.yaml", ".arch/audit/", "..."]
}
```

This is not a guideline in a prompt. Three Claude Code hooks, wired in
[`.claude/settings.json`](../.claude/settings.json), enforce it:

| Hook | Event | What it does |
|---|---|---|
| `guard-write.ts` | PreToolUse | Refuses a write outside the running phase's intent, and any write at all to engine-owned records |
| `stop-next.ts` | Stop | Refuses to end a turn with a phase left in `[-] in_progress` |
| `precompact-breadcrumb.ts` | PreCompact | Writes the board to `.arch/audit/breadcrumb.md` before context is lost |

Paths belonging to no phase — `docs/`, `engine/`, `README.md` — stay writable. The rule
exists to stop Phase 3 from emitting Java, not to freeze the repository. For meta-work on
the engine itself, `ACG_GUARD=off` disables the write guard; the hook also fails open, so
a broken guard never bricks a session.

Three paths are engine-owned and refused to every agent write:
`.arch/acg-state.yaml`, `.arch/audit/`, `.arch/quality-reports/`. Use the CLI.

---

## Tech Profiles

A sensor like `decision-not-restated` needs to know *where* infrastructure might restate a
decision. On AWS CDK that is `iac/config/staging.ts`; on Terraform it is
`iac/environments/<env>/main.tf`; with no cloud it is nowhere at all.

The rule stays in the engine. The file paths live in a profile:

```bash
bun engine/src/acg.ts profile              # which profile is active, and why
bun engine/src/acg.ts profile --id none    # inspect another
```

`engine/data/profiles/` ships `generic`, `aws-cdk-ts`, `terraform-aws`, `gcp-terraform`
and `none`, with `extends` for sharing. The active profile is resolved from a locked
answer, or inferred from the locked `iac` / `deployment_target` answers, or `generic`.
A project on a stack nobody anticipated gets `na` findings that name the missing profile
entry — not false greens, and not false reds.

---

## The Audit Trail and the Learning Loop

Every state transition, gate result, lock, jump and redo is appended to `.arch/audit/`,
sharded per month with an index. It is engine-owned and append-only.

```bash
bun engine/src/acg.ts audit --limit 20
bun engine/src/acg.ts lessons
```

`lessons` is the small learning loop: it reports which sensor has rejected which phase
more than once, and `next` hands those lessons to the conductor. The intent is blunt —
*read this before writing the same thing a third time.*

---

## Escape Hatches, On the Record

The engine is strict, not immovable. Every override is recorded.

```bash
bun engine/src/acg.ts jump --phase 08-implementation --reason "spike"
bun engine/src/acg.ts redo --phase 03-tactical        # cascades to every later phase
bun engine/src/acg.ts redo --phase 03-tactical --only # just this one
bun engine/src/acg.ts scope --set patch               # a named subset of the graph
```

`jump` marks everything it skipped `[S]` with your reason attached. `redo` sends a phase
back to `[ ]`, cascades to everything downstream, and clears `approved_with_lock`.
`scope` swaps the graph for a named subset (`system`, `implement`, `patch`) — a one-file
bug fix should not have to re-run Event Storming.

If sensors are red, the answer is to fix the artifact, or to change the decision through
`redo` and record why. **It is never to restate the claim more confidently.**

---

## Health Checks

```bash
bun engine/src/acg.ts doctor
```

139 checks for drift between the four things that can disagree: the phase graph, the
phase skill frontmatter, the artifacts on disk, and the decision locks. A sensor named in
the graph but not in the registry, a `produces` entry the skill file does not declare, a
`consumes` path missing while the phase claims completion, a lock whose fingerprint no
longer matches — all of it fails loudly rather than degrading quietly.

`doctor` is the first thing to run when something feels wrong, and the last thing to run
before trusting a green board.

---

## Running It

```bash
cd engine && bun install         # once

bun run test                     # 97 tests: the engine, on fixtures that are NOT the sample
bun run test:sample              # 201 tests: the coffeeshop, including its deliberate reds
bun run test:all                 # 298
bunx tsc --noEmit
```

The split matters. `bun run test` runs against two fixture domains deliberately unlike the
sample — a parcel-locker system (UI, cloud, English) and an ETL batch pipeline (no UI, no
cloud, Python, and a Chinese domain vocabulary). Anything that only passes on the
coffeeshop is a coffeeshop-shaped assumption, and the fixtures are there to find it.

The most valuable single test file is `tests/workflow-loop.test.ts`, which drives the full
`next → do → report → review` loop from `init` to `done`. It caught nine defects that no
unit test did, because the defects were in the *sequence*, not in the parts.

And nineteen further defects were found by neither — by running the loop by hand on real
projects of deliberately different shapes. A CLI tool with no UI and no cloud. A
three-actor SPA on AWS CDK. The imported coffeeshop found zero, which is precisely why the
bugs hid there: in an imported project every artifact is already present, so a sensor that
demands a Phase 8 file at Phase 3 never notices it is asking the impossible.

---

## Summary

| The methodology says | The engine makes it true |
|---|---|
| Phases run in order | The phase graph, and `next` is the only answer to "what now?" |
| Each phase consumes the last one's output | `consumes` + `files-exist`, state-aware in `doctor` |
| Quality gates catch violations | 23 sensors, deterministic, no model in the loop |
| Humans decide the strategic calls | Decision locks with canonical fingerprints |
| A phase is complete when it's good | Sensors green **and** human approved **and** independently reviewed |
| Feedback loops send work backward | `[R] revising`, `redo` with cascade, `lessons` |
| Everything is traceable | An append-only audit trail the conductor cannot write |

The methodology was always the valuable part. The engine is what stops it from being
advice.

---

[← Previous: Getting Started](./17-getting-started.md) | [Table of Contents](./README.md)
