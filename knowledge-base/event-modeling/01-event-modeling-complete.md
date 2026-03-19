# Event Modeling (Adam Dymitruk): Complete Reference

## What is Event Modeling

A collaborative design methodology for describing information systems by visualizing how
information changes over time. Created by Adam Dymitruk (2018), synthesizing:

1. Greg Young's long-running process specifications (CQRS/ES)
2. Alberto Brandolini's Event Storming sticky notes
3. UI/UX storyboarding

Central philosophy: systems are best described as **timelines of state-changing events**,
told as stories — aligning with episodic memory (sequential narratives) rather than flowcharts.

---

## The Blueprint Metaphor

The Event Model is a **blueprint** for a software system:

- Single unified visual document (not scattered diagrams)
- Shows complete information architecture upfront
- Serves as living documentation
- Enables "information completeness" testing — every field has origin and destination
- Replaces specification documents, JIRA boards, scattered user stories

> "While Event Storming focuses on discovering the problem space,
> Event Modeling creates a blueprint for a solution."

---

## The Row Structure

```
┌─────────────────────────────────────────────────────────┐
│  UI Wireframes / Mockups (white)    ← what users see    │
├─────────────────────────────────────────────────────────┤
│  Commands (blue)                    ← intentions         │
├─────────────────────────────────────────────────────────┤
│  Events (orange) ──── TIMELINE ──── ← facts              │
├─────────────────────────────────────────────────────────┤
│  Read Models / Views (green)        ← projections        │
├─────────────────────────────────────────────────────────┤
│  UI Wireframes / Mockups (white)    ← what users see    │
└─────────────────────────────────────────────────────────┘
```

The flow creates a visual **sine wave** pattern:
UI → Command → Event → Read Model → UI

Swimlanes separate different actors/subsystems.

---

## Building Blocks

### Events (Orange/Yellow)

- **Business facts** that mutated system state
- Named in past tense: "Guest Checked In", "Payment Processed"
- Immutable once stored ("no erasers," like accounting ledgers)
- Source of truth for the system

### Commands (Blue)

- **Intentions to change** the system's state
- Represent **transactional boundaries**: "either registered successfully or not"
- Specified using **Given-When-Then**:
  - Given: prior events that set up state
  - When: the command is issued
  - Then: resulting events (or rejection)

### Read Models / Views (Green)

- **Passive representations** of accumulated event data
- Named with noun phrases
- Cannot reject events — purely projective
- Specified as: "Given [events], Then [view displays X]"
- Align with CQRS query-side projections

### UI Wireframes (White)

- What users actually see — black and white wireframes
- Show all data fields (every field must be accounted for)
- Multiple swimlanes for different user roles

### Processors / Automations (Gear/Robot Icon)

- System-to-system or automated background work
- Modeled as **"todo lists"** for background processors
- Read a view (todo list) → execute commands → translate responses
- Ensure idempotency
- No business logic in the processor itself

---

## The Four Patterns

**All information flow** in any system can be described by just four patterns:

### Pattern 1: Command Pattern (State Change / Input)

```
Trigger (UI/API) → Command (blue) → Event(s) (orange)
```

How state changes enter the system. Command encapsulates intention.
Business rules applied. If accepted → events. If rejected → error.

### Pattern 2: View / Read Pattern (Query / Output)

```
Event(s) (orange) → Read Model (green) → UI/Screen
```

How accumulated data is presented. Events projected into read-optimized views.

### Pattern 3: Automation Pattern (Todo List)

```
Event(s) → View (todo list) → Robot → Command → Event(s)
```

System does something **automatically**. View acts as state machine/todo list.
When rules indicate completeness, calls a command.
"Complexity never above reading a todo list and making a call."

### Pattern 4: Translation Pattern

```
External Event(s) → View → Robot → Command → Internal Event(s)
```

Transfers knowledge **between systems**. Translates external into local.
Acts as **Anti-Corruption Layer** (DDD). Can implement as Saga or event handler.

---

## The Seven-Step Process

### Step 1: Brainstorm Events

- List all state-changing events
- Filter non-events ("Guest Viewed Calendar" is not a state change)
- Similar to Event Storming's initial divergent phase

### Step 2: Create the Timeline (The Plot)

- Arrange events chronologically into a plausible sequence
- Must make logical sense as a narrative

### Step 3: Add Wireframes/UX (Storyboarding)

- UI mockups above the timeline
- Show all data fields — information completeness validation
- Multiple swimlanes for different roles

### Step 4: Identify Commands (Inputs)

- Blue boxes link UI actions to events
- Given-When-Then specifications written collaboratively

### Step 5: Create Read Models (Outputs)

- Green boxes show how events inform users
- Given-Then: "Given these events, the view shows X"

### Step 6: Apply Conway's Law / Add Automations

- Events organized into swimlanes = autonomous components
- Separate teams own separate swimlanes
- Add processors for system-to-system communication

### Step 7: Elaborate Scenarios / Identify Slices

- Given-When-Then specs for each command and view
- **Vertical slices** identified for implementation
- Each slice = minimal deliverable with complete architectural info

---

## Key Advantages

### Direct Mapping to CQRS + Event Sourcing

- Commands → write side of CQRS
- Read Models → query side of CQRS
- Events → event store
- Does NOT require Event Sourcing — works with traditional databases too

### Constant/Flat Cost Curve

- Each workflow step has **consistent effort** regardless of when built
- Features built **in any order** without compounding complexity
- "Done is done, done right"

### Slices and Estimation

- Each slice independently implementable
- Velocity measured empirically per slice
- Enables **reliable estimation**: slice count × measured velocity
- Can enable fixed-price subcontracting — pay per slice

### Information Completeness

- Can trace every piece of data from origin to destination
- Every field in every UI screen accounted for
- Validates designs **before implementation**

### Simplicity

- ~15 minutes to learn basics
- Only 3 building block types + wireframes
- Only 4 patterns
- Non-technical stakeholders participate meaningfully

---

## Connection to DDD

| Event Modeling | DDD |
|---|---|
| Events (orange) | Domain Events |
| Commands (blue) | Aggregate commands |
| Read Models (green) | CQRS Query Side / Projections |
| Swimlanes | Bounded Contexts |
| Automations | Policies / Sagas / Process Managers |
| Translation Pattern | Anti-Corruption Layer |
| Event/command names | Ubiquitous Language |
| Slices | Features within bounded contexts |

---

## Connection to Event Storming

| Aspect | Event Storming | Event Modeling |
|---|---|---|
| Nature | Exploratory / divergent | Structured / convergent |
| Purpose | Discover problem space | Create solution blueprint |
| Duration | One-off workshop | Ongoing living document |
| UI/UX | Not included | Core element (wireframes) |
| Memory type | Semantic (abstract rules) | Episodic (sequential stories) |
| Audience | Harder for non-technical at detail level | Accessible ("it's just a story") |
| Output | Sticky notes, photos | Implementation blueprint |

### Complementary Use

- Event Storming → initial domain exploration
- Event Modeling → detailed implementation planning
- Event Storming output feeds directly into Event Modeling

---

## Additional Concepts

### Legacy System Application

- **Side-car pattern**: Freeze old systems, build new alongside
- **Y-valve redirection**: Intercept user actions without modifying legacy code
- Event Modeling aids refactoring by analyzing state changes, not code structure

### Traditional (Non-Event-Sourced) Systems

- Works with CRUD/state-based systems
- Focus on what changed in database rows over time
- Same planning benefits without event sourcing infrastructure

### Challenges

- Mindset shift from data models to event-centric thinking
- Managing eventual consistency in read models
- Event schema evolution over time (upcasting)
- Fine-grained event complexity at scale
