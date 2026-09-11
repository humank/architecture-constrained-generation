---
description: "Phase 1: Discovery — Domain Storytelling, Event Storming, Event Modeling"
engine_stages: [01a-dst, 01b-storm, 01c-model]
gate: human
consumes:
  - .arch/00-requirements/story-map.yaml
  - .arch/00-requirements/parsed-requirements.yaml
produces:
  - .arch/01-discovery/domain-stories/
  - .arch/glossary.yaml
  - .arch/01-discovery/event-storm.yaml
  - .arch/01-discovery/event-model.yaml
# Owned by Phase 0, updated in 01a: this is where `covered_by: pending_story` becomes
# a DS id.
also_writes:
  - .arch/00-requirements/story-map.yaml
stages:
  - id: 01a-dst
    step: dst
    produces: [.arch/01-discovery/domain-stories/, .arch/glossary.yaml]
    also_writes: [.arch/00-requirements/story-map.yaml]
    sensors: [files-exist, schema-dst, story-map-coverage]
    advisory_sensors: [glossary-origin]
  - id: 01b-storm
    step: storm
    produces: [.arch/01-discovery/event-storm.yaml]
    sensors: [files-exist, dst-storm-correspondence, hotspot-classified]
  - id: 01c-model
    step: model
    produces: [.arch/01-discovery/event-model.yaml]
    sensors: [files-exist, swimlane-is-story]
sensors: [schema-dst, story-map-coverage, dst-storm-correspondence, hotspot-classified, swimlane-is-story]
---

# Phase 1: Discovery

You are a domain discovery expert combining three complementary methods: Domain Storytelling (understand the business), Event Storming (discover events and boundaries), and Event Modeling (create an implementation blueprint).

## Knowledge Base

Read these files for methodology reference:
- knowledge-base/domain-storytelling/01-core-elements.md
- knowledge-base/domain-storytelling/02-story-types-and-rules.md
- knowledge-base/event-storming/01-building-blocks.md
- knowledge-base/event-storming/02-workshop-formats.md
- knowledge-base/event-storming/03-facilitation-techniques.md
- knowledge-base/event-modeling/01-event-modeling-complete.md

Read artifact schemas:
- artifact-schemas/domain-story.schema.json
- artifact-schemas/event-storm.schema.yaml
- artifact-schemas/glossary.schema.yaml

## Input

Read these artifacts from previous phases:
- `.arch/00-requirements/parsed-requirements.yaml`
- `.arch/00-requirements/impact-map.yaml`
- `.arch/00-requirements/story-map.yaml`
- `.arch/glossary.yaml`

## Process

### Step 1: Domain Storytelling  <!-- engine step: `dst` -->

> Engine stage `01a-dst`. Run this section alone, then
> `report --phase 01a-dst --result awaiting-approval`.

For each major activity in the story map backbone:

1. Identify **actors** (stick figures), **work objects** (documents, things), and **activities** (arrows with verbs)
2. Model the **as-is** story (how it works today, or how the user described it)
3. Model the **to-be** story (how it should work with the new system)
4. Apply the **three dimensions**:
   - Time: coarse-grained (overview) -> fine-grained (detailed)
   - Granularity: one story per scenario
   - Purity: as-is (descriptive) vs to-be (prescriptive)
5. Note **annotations**: variations, questions, assumptions

Write domain stories as YAML files in `.arch/01-discovery/domain-stories/`.
Each file MUST validate against `artifact-schemas/domain-story.schema.json`.
Narrative-only `domain_story.narrative` files are invalid.

Engine stage **01a-dst** owns this step. Do not start Event Storming until
`bun engine/src/acg.ts report --phase 01a-dst --result approved` succeeds.

Each story uses sentence form. Classify every step:

| class | system_visible | Later phases may turn it into |
|-------|----------------|-------------------------------|
| collaboration | false | nothing (no command, no API, no screen control) |
| medium-change | when the system catches it | one work object, two media |
| state-change | true | Event Storm command/event (`sourced_from: DS-xx.y`) |
| handoff | true | Context Map edge + policy/event |
| read | true | read model / Actor View GET |

```yaml
story:
  id: DS-01
  name: "Order to Serve"
  purity: to-be-only          # or as-is / to-be; to-be-only requires purity_reason
  purity_reason: "Requirements already describe intended floor process"
  backbone: "Order Taking"
  covers: [US-03, US-04]
  actors: [Customer, Waiter, Counter Staff, Barista, System]
  steps:
    - id: DS-01.2
      sequence: 2
      actor: Customer
      activity: tells
      work_object: DrinkChoice
      medium: spoken
      class: collaboration
      system_visible: false
    - id: DS-01.5
      sequence: 5
      actor: Waiter
      activity: enters
      work_object: Order
      medium: digital
      class: state-change
      system_visible: true
      mutates: Order
  annotations:
    - "Customer must not become a kiosk user"
  discovered_terms: [Order, DrinkChoice]
```

Engine stage **01b-storm**. Every actor-triggered event MUST include `sourced_from: [DS-xx.y]` pointing at a system-visible DST step. Do not invent events for `class: collaboration` steps.

### Step 2: Event Storming (Big Picture -> Process -> Design Level)  <!-- engine step: `storm` -->

> Engine stage `01b-storm`. Requires `01a-dst` approved: the storm erupts from
> `system_visible` story steps, not from re-reading the requirements document.

**Big Picture (Chaotic Exploration -> Timeline -> Boundaries):**

1. From domain stories and requirements, brainstorm ALL domain events:
   - Named in past tense: "GuestCheckedIn", "PaymentProcessed"
   - Filter non-events (views, queries are NOT events)
   - Arrange chronologically

2. For each event, identify:
   - What command triggered it?
   - Who/what issued the command? (actor, policy, external system, timer)
   - Which aggregate handles the command?

3. Identify **policies** (reactive logic):
   - "WHEN [event] THEN [command]"
   - These often become Saga/Process Manager candidates

4. Identify **read models** needed:
   - What data does the UI need to show?
   - What data does a policy need to make decisions?

5. Mark **hot spots** (red): questions, disagreements, missing knowledge

6. Identify **pivotal events**: events that mark significant state transitions
   - These become bounded context boundary candidates

7. Draw **swimlanes**: group events by bounded context candidate

**Process Level (per BC candidate):**
- Detail the command -> event chains within each BC
- Confirm aggregate boundaries

**Design Level:**
- Specify aggregate roots, entities, value objects
- Confirm policies and read models

### Step 3: Event Modeling  <!-- engine step: `model` -->

> Engine stage `01c-model`. Requires `01b-storm` approved.

Transform Event Storming output into an Event Model blueprint:

1. **Timeline**: Arrange all events chronologically
2. **Commands** (blue): For each command, write Given-When-Then spec:
   ```yaml
   command:
     name: "CheckIn"
     given:
       - "Guest has valid reservation for today"
       - "Guest identity is verified"
       - "Room is clean and available"
     when: "Guest requests self check-in"
     then:
       - "RoomAssigned event"
       - "DigitalKeyIssued event"
     reject_when:
       - given: "Room is not ready"
         then: "CheckInRejected with reason 'room not ready'"
   ```
3. **Read Models** (green): For each view, write Given-Then spec:
   ```yaml
   read_model:
     name: "GuestCheckInStatus"
     given_events: [RoomAssigned, DigitalKeyIssued]
     then_displays:
       - room_number: "from RoomAssigned.roomNumber"
       - digital_key: "from DigitalKeyIssued.keyCode"
       - check_in_time: "from RoomAssigned.timestamp"
   ```
4. **Automations**: Identify system-to-system flows (todo list pattern)
5. **Translations**: Identify cross-system integrations (ACL pattern)
6. **Vertical Slices**: Cut the model into independently implementable slices
7. **Information Completeness**: Verify every data field has origin and destination

### Step 4: Update Glossary  <!-- engine step: `dst`, `storm`, `model` -->

> Every stage contributes. `.arch/glossary.yaml` is writable from any phase.

Add all new terms discovered during discovery to `.arch/glossary.yaml`.
Every event name, command name, aggregate name, read model name should be in the glossary.

## Output

Write these artifacts:

### `.arch/01-discovery/domain-stories/*.yaml`
One file per domain story.

### `.arch/01-discovery/event-storm.yaml`
Follow the event-storm schema. Include: domain_events, commands, aggregates, policies, read_models, external_systems, hot_spots, bounded_context_candidates.

### `.arch/01-discovery/event-model.yaml`
Include: command specs (GWT), read model specs (GT), automations, translations.

Every swimlane declares `story: DS-xx`. Lanes are cut by domain story (or story × BC),
never by bounded context first — cutting by BC and then proving the BC from your own
cut is circular. `swimlane-is-story` refuses a lane with no story, and refuses a DST
`class: read` step that no read model serves.

**There is no `vertical-slices.yaml`.** A slice is a story × a command; both already
exist, so a third file would only be a place for them to disagree. If you need to talk
about a slice, name it `DS-01 / ProcessPayment`.

### `.arch/glossary.yaml`
Updated with all new terms.

## Completion

Present summary:

```
## Phase 1: Discovery Complete

### Domain Stories
- [N] stories modeled (as-is and to-be)

### Event Storm
- [N] domain events discovered
- [M] commands identified
- [K] aggregate candidates
- [P] policies (reactive logic)
- [R] read models
- [H] hot spots ([X] resolved, [Y] open)
- [B] bounded context candidates: [list names]

### Event Model
- [N] command specs with Given-When-Then
- [M] read model specs with Given-Then
- [A] automations, [T] translations
- [S] vertical slices identified

### Ubiquitous Language
- [N] new terms added to glossary (total: [M])

### Open Hot Spots
- [list unresolved hot spots]

Please review and confirm:
1. Are all key business events captured?
2. Do the BC candidates make sense?
3. Any hot spots that need domain expert input?
```

$ARGUMENTS
