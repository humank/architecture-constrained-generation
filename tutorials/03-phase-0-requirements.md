# Chapter 3: Phase 0 — Requirements

![Sticky notes on a planning wall — capturing requirements visually](https://images.unsplash.com/photo-1677506050626-90651f770d0a?w=1200&h=400&fit=crop&q=80)

*Photo by [Unsplash](https://unsplash.com) — Free to use under [Unsplash License](https://unsplash.com/license)*

> *"If you don't know where you're going, any road will take you there."*
> — paraphrasing Lewis Carroll
>
> Phase 0 ensures you know exactly where you're going — and why.

---

## The Problem with Raw Requirements

Requirements arrive in many forms: a Slack message, a PRD, a conversation transcript, or a one-page brief. They're always incomplete, often contradictory, and never structured for architecture.

Phase 0 transforms raw input into three structured artifacts that drive everything downstream:

1. **Impact Map** — Why are we building this? (business goals → measurable outcomes)
2. **Story Map** — What do users need? (activities → stories → releases)
3. **Parsed Requirements** — What are the constraints? (functional, non-functional, assumptions)

Plus a **seed glossary** — the first terms of the Ubiquitous Language.

---

## Impact Mapping (Gojko Adzic)

Impact Mapping answers the question every architecture should start with: **"Why?"**

```
       WHY                WHO              HOW                WHAT
  ┌──────────┐     ┌────────────┐   ┌──────────────┐   ┌──────────────┐
  │  Business │────▶│   Actors   │──▶│   Impacts    │──▶│ Deliverables │
  │   Goal    │     │            │   │  (behavior   │   │  (features)  │
  │  (SMART)  │     │            │   │   changes)   │   │              │
  └──────────┘     └────────────┘   └──────────────┘   └──────────────┘
```

### The Four Levels

| Level | Question | Example (Coffeeshop) |
|---|---|---|
| **Goal** | Why are we doing this? | "Streamline order-to-serve: every order tracked accurately" |
| **Actor** | Who helps/hinders? | Waiter, Counter Staff, Barista, Customer |
| **Impact** | What behavior change? | "Waiter places digital order instead of verbal relay" |
| **Deliverable** | What feature supports it? | Order placement page with table number selection |

### Why Impact Mapping First?

Because it connects **features to business outcomes**. Every deliverable must trace to an impact that traces to a goal. If a feature can't be connected, it's speculative generality — [Anti-Pattern #13](./13-quality-gates-and-feedback-loops.md).

Each deliverable gets:
- `in_mvp: true/false` — Is this in the minimum viable product?
- `effort: small/medium/large` — Rough estimation
- Priority via **MoSCoW** (Must / Should / Could / Won't)

---

![Whiteboard with organized sticky notes — mapping user stories](https://images.unsplash.com/photo-1676277757211-ebd7fdeb3d5b?w=1200&h=400&fit=crop&q=80)

## User Story Mapping (Jeff Patton)

Where Impact Mapping provides the "why" tree, Story Mapping provides the **narrative flow** — what users do, step by step.

```
         ┌─────────────────── BACKBONE (Activities) ───────────────────┐
         │                                                              │
         ▼         ▼              ▼              ▼            ▼         │
    ┌─────────┬──────────┬────────────┬──────────────┬──────────┐      │
    │  Take   │ Confirm  │  Process   │   Prepare    │  Deliver │      │
    │  Order  │  Order   │  Payment   │   Coffee     │  Coffee  │      │
    └────┬────┴────┬─────┴─────┬──────┴──────┬───────┴────┬─────┘      │
         │         │           │             │            │
  ── MVP │─────────│───────────│─────────────│────────────│── Release 1
         │         │           │             │            │
    Select    Calculate    Accept cash   View queue   Mark as
    table     total        Make change   Follow       delivered
    Add items                            recipe
    Specify                                           ── Release 2
    customs.   View order                Check
               history    Generate      stock level
                          receipt

```

### Key Concepts

- **Backbone**: Major activities in left-to-right narrative order
- **Body**: Stories under each activity, ordered top-to-bottom by priority
- **Walking Skeleton**: The thinnest end-to-end slice touching every activity
- **Release Slices**: Horizontal lines marking release boundaries (MVP, R1, R2)

### Why Story Mapping Complements Impact Mapping

Impact Mapping tells you **which features matter**. Story Mapping tells you **in what order users encounter them**. Together, they define both the "what" and the "how much" of the MVP.

---

## Seeding the Ubiquitous Language

As the requirements are parsed, domain-specific terms are extracted and added to `glossary.yaml`:

```yaml
terms:
  - term: "Order"
    definition: "A request by a customer for one or more coffee items"
    first_discovered_in: "requirements-parser"
    bounded_context: null  # not yet assigned

  - term: "Counter Staff"
    definition: "Staff member who confirms orders and processes payment"
    aliases: ["Cashier"]
    first_discovered_in: "requirements-parser"

  - term: "Low-Stock Alert"
    definition: "Automatic notification when material drops below 30% capacity"
    first_discovered_in: "requirements-parser"
```

This glossary will grow in every subsequent phase. By Phase 8, every class name, method name, and enum value in the code comes from this glossary.

---

## The Output Artifacts

Phase 0 produces four files in `.arch/00-requirements/`:

### 1. `parsed-requirements.yaml`

Structured extraction of all functional requirements, non-functional requirements, constraints, assumptions, and open questions. Each requirement gets a MoSCoW priority and initial acceptance criteria.

### 2. `impact-map.yaml`

The complete Impact Map with goals, actors, impacts, and deliverables. Each deliverable has MVP flags and effort estimates.

### 3. `story-map.yaml`

The backbone activities, body stories, walking skeleton definition, and release slices.

### 4. `glossary.yaml` (root level)

Initial glossary with 15-30 terms extracted from requirements.

---

## The Decision Point 🔑

After Phase 0, the orchestrator pauses and presents:

```
🔑 Please review and confirm:
1. Are the business goals correct?
2. Is the MVP scope appropriate?
3. Are there missing actors or requirements?
```

This is your chance to correct course before discovery begins. Adding a missing actor here is cheap. Discovering them in Phase 3 triggers a feedback loop back to Phase 1.

---

## Connection to Later Phases

| Phase 0 Output | Consumed By |
|---|---|
| Business goals | Phase 6 (quality attribute scenarios measure goal achievement) |
| Actor list | Phase 1 (Event Storming actors), Phase 3 (Actor Views) |
| Functional requirements | Phase 4 (BDD scenarios must cover every requirement) |
| Non-functional requirements | Phase 5 (SLI/SLO targets), Phase 6 (perspective analysis) |
| MVP scope | Phase 1 (vertical slices prioritized by MVP flag) |
| Glossary | Every phase (language consistency thread) |

---

[← Previous: The Methodology Map](./02-the-methodology-map.md) | [Table of Contents](./README.md) | [Next: Phase 1 — Discovery →](./04-phase-1-discovery.md)
