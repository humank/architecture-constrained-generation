# Domain Storytelling: Story Types and Modeling Rules

## Three Independent Dimensions

Domain stories are categorized along three independent dimensions:

### Dimension 1: Temporal Scope (Time)

| Type | Description | Use Case |
|---|---|---|
| **As-Is** | Describes current state of a process | Establish baseline understanding |
| **To-Be** | Describes desired future state | Support change design and improvement |

### Dimension 2: Level of Detail (Granularity)

| Type | Description | Use Case |
|---|---|---|
| **Coarse-Grained** | Bird's-eye perspective, fewer elements | Alignment, onboarding, finding boundaries |
| **Fine-Grained** | Detailed drill-down, more elements | Implementation, deriving domain models |

Stories can be positioned anywhere on the spectrum.

### Dimension 3: Domain Purity

| Type | Description | Use Case |
|---|---|---|
| **Pure Domain** | Excludes software systems entirely | Understand core business logic and intent |
| **Digitalized** | Includes software systems as actors | Understand current digital landscape |

### Typical Journey

1. Start with coarse-grained, pure, as-is stories to explore
2. Move to coarse-grained, pure, to-be stories to see improvements
3. Drill down with fine-grained, pure, as-is stories for subdomains
4. Digitalize as needed to capture system interactions

---

## Core Modeling Rules

### Rule 1: One Story Per Scenario

Every domain story tells exactly one scenario. Alternative scenarios get separate stories.
Use annotations for minor variations.

### Rule 2: Each Actor Appears Once Per Activity

An actor appears only once per distinct activity. If an actor performs multiple activities,
they appear multiple times.

### Rule 3: Separate Work Object Per Activity

For every activity, a separate work object is drawn — even if the same work object appeared
in a previous sentence. Makes arranging objects and arrows easier.

### Rule 3.1: Work Object Representation Flexibility

Same work object can have different icons if the medium/form changes.
Example: "Invoice" as physical document vs. email attachment vs. digital record.

### Rule 4: Document Assumptions

Any assumptions made during recording are written down as annotations.
Helps avoid drifting into different story lines.

---

## Handling Variations

### Small Variations
Use annotations. Don't create separate stories for minor variations.

### Significant Variations
Create separate domain stories for each important alternative.
Example: "Credit card payment" as one story, "Invoice payment" as another.

### Loops / Repeating Activities

**Option 1: Annotation** — "For each [item], [activity is performed]"
**Option 2: Group work objects** — Label the group to indicate repetition

---

## Workshop Facilitation

### Key Roles

| Role | Responsibility |
|---|---|
| **Moderator/Facilitator** | Guides storytelling, asks questions, records story graphically |
| **Domain Experts** | Tell stories about actual work, validate recording |
| **IT Experts** | Listen, understand domain, contribute feasibility insights |

### How to Run a Session

1. **Communicate Purpose** — What are we trying to understand?
2. **Begin Storytelling** — Ask domain expert to tell a story
3. **Active Facilitation** — "What happens next? Where do you get this info?"
4. **Immediate Visual Recording** — Draw as told; your pace controls their pace
5. **Validation Loop** — Replay from beginning, ask "Did we miss anything?"

### Tips

- Max 1 hour per session before break
- Smaller groups are more effective
- Can be done remotely (better than Event Storming for remote)

---

## Connection to DDD

### Ubiquitous Language

Domain experts use natural language while telling stories. Terms become labels on elements.
This feeds directly into ubiquitous language development.

### Bounded Context Discovery

| Indicator | Description |
|---|---|
| Activity clustering | Activities related closely from single actor's perspective |
| Terminology shifts | Different terms for conceptually similar things |
| System boundaries | Where one system/department ends and another begins |
| Information flows | Handoff points and integration boundaries |
| Independent models | Where different mental models are in use |

### Domain Message Flow Modeling

Extension for modeling communication between bounded contexts. Shows how messages flow between
contexts. Useful for microservice architecture design.

---

## Tools

| Tool | Description |
|---|---|
| **Egon.io** | Official DST tool, browser-based, open-source, replay feature |
| **draw.io** | Domain Stories Kit available, open-source |
| **Miro** | Collaborative whiteboard with templates |
| **PlantUML** | DomainStory-PlantUML macros for "modeling as code" |
| **Physical** | Whiteboard + markers + sticky notes |

### File Formats

- **.dst** — JSON-based source format, portable
- **.svg** — Contains embedded .dst file (since v1.2.0), usable as image AND editable
