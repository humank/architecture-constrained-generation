# User Story Mapping (Jeff Patton): Complete Reference

## Core Concept

A 2D visualization technique that arranges user activities horizontally (left to right, narrative flow)
against priority and detail vertically (top to bottom) to form a "map" of the product.

> "Shared understanding is the real deliverable, not the map itself."

The map replaces the flat backlog with a spatial narrative that preserves context, relationships,
and the user's journey through the system.

---

## Map Structure

```
 ← Narrative flow (time / sequence) →

┌──────────┬──────────┬──────────┬──────────┐
│Activity A│Activity B│Activity C│Activity D│  ← Backbone (top row)
├──────────┼──────────┼──────────┼──────────┤
│ Task A1  │ Task B1  │ Task C1  │ Task D1  │  ← Walking Skeleton (MVP slice)
│══════════│══════════│══════════│══════════│  ── Release 1 line ──
│ Task A2  │ Task B2  │ Task C2  │          │
│ Task A3  │          │ Task C3  │ Task D2  │
│══════════│══════════│══════════│══════════│  ── Release 2 line ──
│ Task A4  │ Task B3  │ Task C4  │ Task D3  │
│          │ Task B4  │          │ Task D4  │
└──────────┴──────────┴──────────┴──────────┘
  ↓ Increasing detail / decreasing priority ↓
```

### Four Structural Elements

| Element | Position | Description |
|---|---|---|
| **Backbone** | Top row | Activities (big user tasks) in narrative/temporal order, left to right |
| **Walking Skeleton** | First row below backbone | Thinnest possible end-to-end slice that works across all activities |
| **Body** | Rows below skeleton | User stories/tasks under each activity, ordered top-to-bottom by priority |
| **Release Slices** | Horizontal lines across map | Cut across the body to define release boundaries |

### Hierarchy of Abstraction

| Level | Also Called | Granularity | Example |
|---|---|---|---|
| **Activities** | Themes, Epics | Biggest chunks | "Manage Orders" |
| **User Tasks** | Features | What user does to complete activity | "Search for product" |
| **Sub-tasks / Details** | Stories | Specific variations, rules, edge cases | "Filter search by price range" |

---

## Building the Map: Four Steps

### Step 1: Frame the Big Story

Establish the product framing before mapping details.

| Question | Purpose |
|---|---|
| **Who** is it for? | Target users/personas |
| **What** problem does it solve? | Core value proposition |
| **Why** build it now? | Business goal, desired outcome |

Write a short narrative: "As [persona], I want to [goal] so that [outcome]."

### Step 2: Map the Big Picture (Backbone)

- Lay out **activities** left to right in the order users perform them
- Think "a day in the life of the user" or "the user's journey"
- Keep activities at a high level (verb + noun: "Browse Catalog", "Checkout", "Track Delivery")
- Typical backbone: 5-15 activities
- Read the backbone aloud as a story to validate narrative flow

### Step 3: Explore and Fill the Body

Under each activity, brainstorm vertically:

| What to capture | Examples |
|---|---|
| **Happy path tasks** | Core steps to complete the activity |
| **Alternatives** | Different ways to accomplish the same goal |
| **Exceptions** | Error handling, edge cases |
| **Business rules** | Constraints, validations |
| **UI details** | Specific interface needs |
| **Data variations** | Different data types or formats |

Order stories top-to-bottom by priority (most critical at top).

### Step 4: Slice Out Releases

- Draw horizontal lines across the map to define release boundaries
- **First slice = MVP** (walking skeleton + minimum viable stories per activity)
- Each slice must deliver a coherent, usable increment
- Slices should be independently deployable and testable
- Challenge: every story above the line must be justified; push stories down aggressively

---

## Walking Skeleton

The thinnest possible end-to-end implementation that touches every activity in the backbone.

| Property | Description |
|---|---|
| **End-to-end** | Spans all activities, not just a subset |
| **Thin** | Minimal functionality per activity — just enough to connect |
| **Working** | Actually runs, deployable, testable |
| **Architectural** | Validates technical architecture early |
| **Learnable** | Exposes integration risks and assumption gaps fast |

> Build the thinnest possible end-to-end thing first, then add flesh.

Walking skeleton is NOT a prototype or throwaway spike — it is production-quality foundation code.

---

## Story Splitting Patterns

When stories are too large, split using these patterns:

| Pattern | How to Split | Example |
|---|---|---|
| **By Workflow Step** | One story per step in a multi-step process | "Register" → "Enter email", "Verify email", "Set password" |
| **By Business Rule** | One story per rule variation | "Apply discount" → "Percentage discount", "Fixed amount discount", "Buy-one-get-one" |
| **By Data Variation** | One story per data type or format | "Import data" → "Import CSV", "Import JSON", "Import XML" |
| **By Interface** | One story per channel or platform | "View dashboard" → "Web dashboard", "Mobile dashboard", "API endpoint" |
| **By Operation (CRUD)** | One story per operation | "Manage profile" → "Create profile", "View profile", "Edit profile", "Delete profile" |
| **By Performance** | Base functionality first, then optimization | "Search products" → "Basic search (< 5s)", "Optimized search (< 200ms)" |
| **By Happy Path / Edge Case** | Core flow first, exceptions later | "Process payment" → "Successful payment", "Declined card", "Network timeout" |

**Splitting heuristic**: if a story cannot be completed in one iteration, split it.
Prefer splits that deliver independently valuable increments.

---

## Key Principles

| Principle | Explanation |
|---|---|
| **Shared understanding over documentation** | The map is a tool for conversation; the understanding built during mapping is the real output |
| **Stories are placeholders for conversations** | A story card is a promise for a future conversation, not a specification |
| **Build thin slices, not layers** | Deliver end-to-end value, not a complete database layer then a complete API layer |
| **Validate assumptions early** | Walking skeleton exposes wrong assumptions before heavy investment |
| **Minimize output, maximize outcome** | Build less software — focus on the smallest thing that achieves the business goal |
| **Map tells a story** | Read the backbone left to right and it should narrate the user's journey |

---

## Flat Backlog vs. Story Map

| Aspect | Flat Backlog | Story Map |
|---|---|---|
| **Dimensions** | 1D (prioritized list) | 2D (narrative flow x priority) |
| **Context** | Stories lose relationship context | Stories live under activities, preserving narrative |
| **Big picture** | Hard to see; must read all stories | Visible at a glance from backbone |
| **Release planning** | Arbitrary groupings | Coherent horizontal slices across all activities |
| **Gaps** | Hard to spot missing stories | Gaps visible as empty columns or thin areas |
| **Onboarding** | New members read a long list | New members "walk" the map to understand the product |
| **Scope management** | "Cut from the bottom" loses context | "Move below the line" — explicit trade-off per activity |

---

## Workshop Format

### Participants

| Role | Contribution |
|---|---|
| **Product Owner / PM** | Frames the big story, prioritizes slices |
| **UX / Designer** | User journey expertise, persona details |
| **Developers** | Technical feasibility, identifies hidden complexity |
| **Testers / QA** | Edge cases, exception paths, acceptance criteria |
| **Domain Expert** | Business rules, real-world workflow knowledge |
| **Facilitator** | Keeps pace, manages time, resolves conflicts |

Ideal group size: **4-8 people**. Larger groups split into sub-teams per persona or journey.

### Duration and Materials

| Phase | Duration | Output |
|---|---|---|
| Frame the big story | 15-30 min | Persona, goal, outcome statement |
| Map the backbone | 30-60 min | 5-15 activities in narrative order |
| Fill the body | 60-120 min | Tasks and stories under each activity |
| Slice releases | 30-60 min | MVP slice + future release lines |
| **Total** | **2-4 hours** | Complete story map with release slices |

**Materials**: sticky notes (different colors for activities, tasks, details), large wall or whiteboard,
painter's tape (for release slice lines), markers, dot stickers for voting.

**Digital tools**: Miro, Mural, StoriesOnBoard, Avion, CardBoard.

---

## Connection to Other Methodologies

### User Story Mapping → Impact Mapping

| Impact Mapping Level | Maps to |
|---|---|
| Goal | Frames the big story (why) |
| Actors | Personas on the map |
| Impacts | Desired behavior changes inform activity prioritization |
| Deliverables | Become backbone activities or body stories |

Flow: Impact Map first (strategic "what to build") → Story Map (tactical "how to slice and deliver").

### User Story Mapping → Event Storming

| Event Storming Element | Story Map Element |
|---|---|
| Pivotal Events | Activity boundaries on backbone |
| Event flow (timeline) | Left-to-right narrative flow |
| Commands | Map to user tasks in body |
| Aggregates | Cluster under related activities |
| Hot Spots | Become stories or questions on the map |

Flow: Event Storming (discover domain) → Story Map (plan delivery of discovered flows).

### User Story Mapping → Event Modeling

| Event Modeling Element | Story Map Element |
|---|---|
| Timeline of events | Backbone narrative flow |
| Vertical slices | Walking skeleton + release slices |
| UI wireframes | Inform task/story details in body |
| Command/Read patterns | Stories in the body |

Walking skeleton in story mapping corresponds to the first vertical slice in Event Modeling.

### User Story Mapping → BDD

| Story Map Element | BDD Element |
|---|---|
| Each story in the body | Input to Example Mapping session |
| Business rules (captured during mapping) | Yellow cards in Example Mapping |
| Edge cases and exceptions | Red question cards / negative examples |
| Acceptance criteria | Gherkin scenarios (Given-When-Then) |

Flow: Story Map (identify stories) → Example Mapping (discover examples per story) → Gherkin (formalize).

### User Story Mapping → XP

| Story Map Element | XP Element |
|---|---|
| Stories in body | Feed into Planning Game |
| Walking skeleton | Aligns with XP's "simplest thing that works" |
| Release slices | Map to Weekly/Quarterly Cycles |
| Story size | Must satisfy INVEST criteria |

Stories from the map become the input to XP's iteration planning.

### User Story Mapping → DDD

| Story Map Element | DDD Element |
|---|---|
| Activities (backbone) | Candidate Bounded Contexts |
| Activity clusters | Context boundaries |
| Cross-activity dependencies | Context Map relationships |
| Domain vocabulary on stickies | Ubiquitous Language seeds |

Activities that share vocabulary and rules often cluster into a single Bounded Context.
Activities with different meanings for the same term signal separate Bounded Contexts.

### User Story Mapping → Continuous Delivery

| Story Map Element | CD Element |
|---|---|
| Walking skeleton | First deployable increment through full pipeline |
| Release slices | Deployment increments |
| Thin vertical slices | Enable continuous integration of complete features |
| MVP slice | First release candidate |

Each release slice should be independently deployable, validating the deployment pipeline incrementally.
