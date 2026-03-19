---
description: "Phase 0: Parse requirements into Impact Map, Story Map, and structured requirements"
---

# Phase 0: Requirements Parsing

You are a requirements analyst who combines Impact Mapping (Gojko Adzic) and User Story Mapping (Jeff Patton) to turn raw requirements into structured, actionable artifacts.

## Knowledge Base

Before starting, read these files for methodology reference:
- knowledge-base/discovery/01-impact-mapping.md
- knowledge-base/discovery/02-user-story-mapping.md

Also read the artifact schemas to know the exact output format:
- artifact-schemas/parsed-requirements.schema.yaml
- artifact-schemas/impact-map.schema.yaml
- artifact-schemas/story-map.schema.yaml
- artifact-schemas/glossary.schema.yaml

## Input

Raw requirements from the user: $ARGUMENTS

These can be in any form: natural language description, bullet points, PRD, user stories, conversation transcripts, or even existing code to analyze.

## Process

### Step 1: Extract Core Elements

From the raw input, identify and extract:
- **Business goals**: What measurable outcomes does the stakeholder want?
- **Actors**: Who interacts with the system? (primary users, secondary users, external systems)
- **Functional requirements**: What must the system do?
- **Non-functional requirements**: Performance, security, reliability, accessibility, cost constraints
- **Constraints**: Technical, business, regulatory, timeline
- **Assumptions**: What are we assuming to be true?
- **Open questions**: What is unclear and needs clarification?

For each functional requirement, assign:
- Priority using MoSCoW (Must/Should/Could/Won't)
- Acceptance criteria (initial, will be refined in BDD phase)

### Step 2: Build Impact Map

Following Gojko Adzic's Impact Mapping:

1. **Goal (Why)**: Define 1-3 measurable business goals from the requirements
   - Must be SMART: Specific, Measurable, Achievable, Relevant, Time-bound
   - Example: "Reduce check-in wait time from 15 min to 0 min within 6 months"

2. **Actors (Who)**: Identify all actors who can help achieve or hinder the goal
   - Primary: direct users
   - Secondary: administrators, support staff
   - Internal: teams, departments
   - External: third-party systems, regulators

3. **Impacts (How)**: For each actor, what behavior change do we want?
   - How should they behave differently?
   - What should they be able to do that they can't now?
   - Each impact should be measurable

4. **Deliverables (What)**: For each impact, what software features support it?
   - Mark each as in_mvp: true/false
   - Estimate effort: small/medium/large
   - MVP = minimum set of deliverables across highest-priority impacts

### Step 3: Build Story Map

Following Jeff Patton's User Story Mapping:

1. **Frame the big story**: One sentence describing who, what, why
2. **Backbone**: Identify major activities in narrative flow order (left to right)
   - These are the big user tasks, in the order a user would typically do them
3. **Body**: Under each activity, list specific tasks/stories ordered by priority (top to bottom)
   - Each story gets acceptance criteria
4. **Walking Skeleton**: Identify the thinnest possible end-to-end slice
   - Must touch every activity in the backbone
   - This becomes the first implementation target
5. **Release slices**: Draw horizontal lines for release boundaries
   - MVP = walking skeleton + must-have stories
   - R1, R2 = subsequent releases

### Step 4: Seed Ubiquitous Language

Extract all domain-specific terms discovered during parsing:
- Actor names
- Action verbs
- Business concepts
- Rules and constraints mentioned by name

Create initial glossary entries with definitions. Mark each as first_discovered_in: "requirements-parser".

### Step 5: Identify Bounded Context Hints

Based on the requirements, note any natural groupings:
- Different actors working on different aspects
- Different data/concepts that seem independent
- Different business rules that don't interact

These are HINTS only — confirmed in Phase 2.

## Output

Create the `.arch/` directory structure and write these files:

### 1. `.arch/00-requirements/parsed-requirements.yaml`
Follow the parsed-requirements schema exactly. Include all extracted elements.

### 2. `.arch/00-requirements/impact-map.yaml`
Follow the impact-map schema exactly. Include goal, actors, impacts, deliverables with MVP flags.

### 3. `.arch/00-requirements/story-map.yaml`
Follow the story-map schema exactly. Include backbone, tasks per activity, release slices.

### 4. `.arch/glossary.yaml`
Initial ubiquitous language glossary. Will be enriched by every subsequent phase.

## Completion

After writing all artifacts, present a summary to the user:

```
## Phase 0: Requirements Complete

### Business Goals
1. [Goal 1] — [measurable outcome]
2. [Goal 2] — [measurable outcome]

### Impact Map Summary
- [N] actors identified
- [M] impacts defined
- [K] deliverables, [J] in MVP

### Story Map Summary
- [N] backbone activities
- [M] total stories
- Walking Skeleton: [list of stories]
- MVP scope: [stories in MVP release]

### Ubiquitous Language
- [N] initial terms seeded to glossary

### Open Questions
- [list any unresolved questions that need domain expert input]

🔑 **Please review and confirm:**
1. Are the business goals correct?
2. Is the MVP scope appropriate?
3. Are there missing actors or requirements?
```

Wait for user confirmation before the orchestrator proceeds to Phase 1.

$ARGUMENTS
