# Chapter 4: Phase 1 — Discovery

![Team brainstorming with sticky notes on glass wall — collaborative discovery](https://images.unsplash.com/photo-1758691736836-0413b066787a?w=1200&h=400&fit=crop&q=80)

*Photo by [Unsplash](https://unsplash.com) — Free to use under [Unsplash License](https://unsplash.com/license)*

> *"The goal of Event Storming is to bring all the right people in one room and use the right notation to explore the domain." — Alberto Brandolini*
>
> ACG simulates that room — with domain knowledge encoded in the knowledge base.

---

## Three Complementary Methods

Phase 1 combines three discovery methodologies, each serving a distinct purpose:

| Method | Purpose | Output |
|---|---|---|
| **Domain Storytelling** | Understand how the business works today | As-is and to-be stories |
| **Event Storming** | Discover events, commands, and boundaries | Event storm model |
| **Event Modeling** | Create an implementation blueprint | Command/View specs with GWT |

They're applied in sequence, each building on the previous:

```
Domain Storytelling ──→ "Here's how things work"
        │
        ▼
Event Storming ───────→ "Here's what happens"
        │
        ▼
Event Modeling ───────→ "Here's the blueprint for building it"
```

---

## Step 1: Domain Storytelling

Domain Storytelling (Stefan Hofer & Henning Schwentner) captures how actors interact with work objects through activities.

For each major activity from the Story Map backbone, the AI models:

1. **Actors** (stick figures) — who does it
2. **Work Objects** (documents, things) — what they work with
3. **Activities** (arrows with verbs) — what they do

### Example: Order Placement Story

```yaml
story:
  name: "Waiter Takes Order"
  type: "to-be"
  actors: [Waiter, System, CounterStaff]
  steps:
    - sequence: 1
      actor: Waiter
      activity: "goes to"
      work_object: "Table"
    - sequence: 2
      actor: Waiter
      activity: "takes order from"
      work_object: "Customer"
    - sequence: 3
      actor: Waiter
      activity: "enters"
      work_object: "Order (table, items, customizations)"
    - sequence: 4
      actor: System
      activity: "calculates"
      work_object: "Total Price"
  annotations:
    - "What if customer changes mind after ordering?"
    - "Assumes waiter has tablet or terminal access"
  discovered_terms: [Table, Order, Total Price, Customization]
```

### Three Dimensions

| Dimension | Range | Usage |
|---|---|---|
| **Time** | Coarse-grained → Fine-grained | Start with overview, drill into details |
| **Granularity** | One story per scenario | Don't mix scenarios |
| **Purity** | As-is (how it works now) → To-be (how it should work) | Model both to find gaps |

---

![Colorful sticky notes arranged for event storming workshop](https://images.unsplash.com/photo-1758691736934-e5d6d0c7f875?w=1200&h=400&fit=crop&q=80)

## Step 2: Event Storming

Event Storming is where the domain really comes alive. The AI simulates Brandolini's Big Picture → Process → Design Level workshop flow.

### The Building Blocks

```
 ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
 │  🟧      │   │  🔵      │   │  🟡      │   │  🟢      │
 │  Domain  │   │  Command  │   │ Aggregate │   │  Read    │
 │  Event   │   │          │   │          │   │  Model   │
 │(past     │   │(imperative│   │(enforces │   │(UI view) │
 │ tense)   │   │ verb)    │   │invariants)│   │          │
 └──────────┘   └──────────┘   └──────────┘   └──────────┘

 ┌──────────┐   ┌──────────┐   ┌──────────┐
 │  🟣      │   │  🔴      │   │  🩷      │
 │  Policy  │   │ Hot Spot │   │ External │
 │"when X   │   │(question,│   │  System  │
 │ then Y"  │   │ conflict)│   │          │
 └──────────┘   └──────────┘   └──────────┘
```

### Big Picture Phase

1. **Brainstorm ALL domain events** — past tense: "OrderPlaced", "PaymentReceived", "CoffeePrepared"
2. **Arrange chronologically** on a timeline
3. **Identify commands** — what action triggered each event?
4. **Identify actors** — who/what issued each command?
5. **Mark policies** — reactive logic: "WHEN OrderPaid THEN StartPreparation"
6. **Flag hot spots** — questions, disagreements, missing knowledge
7. **Find pivotal events** — events marking significant state transitions (these become BC boundary candidates)
8. **Draw swimlanes** — group events by bounded context candidate

### Process Level (per BC candidate)

Detail the command → event chains within each bounded context. Confirm aggregate boundaries.

### Design Level

Specify aggregate roots, entities, value objects. Confirm policies and read models.

### The Three Event Triggers

Every event in the system is triggered by one of three sources:

| Trigger | Symbol | Example |
|---|---|---|
| **Actor** (human) | 👤 | Waiter places order |
| **Policy** (reactive) | 🟣 | "When paid, submit to barista" |
| **External System** | 🩷 | Supplier confirms delivery |

Understanding **who/what triggers each event** is critical — it directly determines the implementation pattern (API endpoint vs event handler vs scheduled job).

---

## Step 3: Event Modeling

Event Modeling (Adam Dymitruk) transforms the Event Storming output into a structured blueprint.

### The Four Patterns

Every information flow in any system can be described by exactly four patterns:

```
Pattern 1: COMMAND (State Change)
    UI Action → Command (blue) → Event(s) (orange)

Pattern 2: VIEW (Query)
    Event(s) (orange) → Read Model (green) → UI Screen

Pattern 3: AUTOMATION (Todo List)
    Event → View (todo) → Processor → Command → Event

Pattern 4: TRANSLATION (Anti-Corruption Layer)
    External Event → View → Translator → Internal Command → Event
```

### Given-When-Then Specifications

For each command, the Event Model produces a GWT spec:

```yaml
command:
  name: "RecordPayment"
  aggregate: "Order"
  given:
    - "Order exists in CONFIRMED status"
    - "Cash amount ≥ order total"
  when: "Counter Staff processes cash payment"
  then:
    - "PaymentReceived event published"
    - "Order status transitions to PAID"
    - "Change amount calculated"
  reject_when:
    - given: "Cash amount < order total"
      then: "PaymentRejected — insufficient cash"
    - given: "Order not in CONFIRMED status"
      then: "InvalidStateTransition error"
```

These GWT specs become:
- **BDD scenarios** in Phase 4 (Gherkin Given/When/Then)
- **Aggregate command handlers** in Phase 8 (preconditions → state change → events)
- **Test cases** in Phase 8 (given state + when command + then assertions)

### Read Model Specifications

```yaml
read_model:
  name: "PreparationQueueView"
  description: "Barista sees pending preparation items"
  given_events: [OrderSubmittedToBarista, CoffeePreparationStarted, CoffeePrepared]
  then_displays:
    - coffeeId: "from OrderSubmittedToBarista.items[].coffeeId"
    - coffeeType: "from OrderSubmittedToBarista.items[].coffeeType"
    - status: "derived from CoffeePreparationStarted / CoffeePrepared events"
```

### Vertical Slices

The Event Model is cut into independently implementable vertical slices:

```yaml
vertical_slices:
  - name: "Slice 1: Place Order → Confirm → Pay"
    commands: [PlaceOrder, ConfirmOrder, RecordPayment]
    events: [OrderPlaced, OrderConfirmed, PaymentReceived]
    read_models: [OrderSummaryView]
    priority: 1
    in_mvp: true

  - name: "Slice 2: Preparation Queue"
    commands: [MarkPrepared]
    events: [CoffeePreparationStarted, CoffeePrepared]
    read_models: [PreparationQueueView]
    priority: 2
    in_mvp: true
```

Each slice has **complete architectural information** — you know exactly what to build, what data flows where, and how to test it.

---

## The Glossary Grows

Phase 1 typically adds 30-50 new terms to the glossary — every event name, command name, aggregate name, read model name, and policy name becomes a glossary entry.

---

## Output Artifacts

```
.arch/01-discovery/
├── domain-stories/
│   ├── 01-order-to-serve.yaml
│   ├── 02-replenishment.yaml
│   └── 03-daily-reporting.yaml
├── event-storm.yaml          # Events, commands, aggregates, policies, hot spots, BC candidates
└── event-model.yaml          # GWT command specs, read model specs, automations
```

**There is no `vertical-slices.yaml`.** A slice is a domain story × a command, and both of
those already exist in the artifacts above. A third file would add no information and one
more place for them to disagree. When you need to name a slice, name it
`DS-01 / ProcessPayment`.

### Three gates, not one

The engine treats Phase 1 as three separately-gated stages, and the order is load-bearing:

| Stage | Produces | Must be approved before |
|---|---|---|
| `01a-dst` | `domain-stories/`, seeds `glossary.yaml` | the storm may start |
| `01b-storm` | `event-storm.yaml` | the model may start |
| `01c-model` | `event-model.yaml` | Phase 2 |

The reason is that Event Storming must erupt from **approved, system-visible story steps** —
each actor-triggered event declares `sourced_from: [DS-xx.y]` — rather than from a second
independent reading of the requirements document. If the storm runs before the stories are
settled, the two drift, and nothing downstream can tell which one is the record.

---

## Decision Point 🔑

After discovery, the orchestrator pauses:

```
🔑 Please review and confirm:
1. Are all key business events captured?
2. Do the BC candidates make sense?
3. Any hot spots that need domain expert input?
```

Unresolved hot spots 🔴 are flagged — and the engine is specific about which kind may
remain open. `hotspot-classified` blocks on any hot spot with no classification, and on any
**open `work-unknown`**: if what you don't know is how the work actually happens, that
belongs back in `01a-dst` as a question for a domain expert, not forward in the model as a
comment. A `fact-unknown` ("what is the tax rate in this jurisdiction?") may stay open in
the storm.

---

## What Comes Next

Phase 1's output feeds directly into:
- **Phase 2**: BC candidates → confirmed Bounded Contexts
- **Phase 3**: Aggregates, commands, events → Aggregate design with Vernon's Four Rules
- **Phase 4**: GWT specs → BDD Gherkin scenarios
- **Phase 8**: Vertical slices → implementation order

---

[← Previous: Phase 0 — Requirements](./03-phase-0-requirements.md) | [Table of Contents](./README.md) | [Next: Phase 2 — Strategic Design →](./05-phase-2-strategic-design.md)
