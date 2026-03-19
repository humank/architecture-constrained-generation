# Impact Mapping (Gojko Adzic)

## Core Concept

Impact Mapping is a strategic planning technique that prevents organizations from getting lost in feature delivery by keeping the connection between business goals and software deliverables visible. It uses a mind-map structure with four levels radiating outward from a central goal.

```
Goal (Why) → Actors (Who) → Impacts (How) → Deliverables (What)
```

Key insight: software features are **assumptions**, not guarantees. An impact map makes those assumptions explicit and testable.

---

## The Four Levels

### Level 1: Goal (Why)

The measurable business objective the organization wants to achieve.

| Principle | Detail |
|---|---|
| **Not features** | "Increase mobile conversion by 15%" not "Build mobile app" |
| **SMART** | Specific, Measurable, Achievable, Relevant, Time-bound |
| **One goal per map** | Multiple goals require separate maps |
| **Outcome over output** | Revenue, retention, engagement -- never "deliver feature X" |

Questions to ask:
- Why are we doing this?
- What does success look like in 6 months?
- How will we know we succeeded?

### Level 2: Actors (Who)

People and systems whose behavior affects whether the goal is reached.

| Actor Type | Examples |
|---|---|
| **Primary users** | End users who directly interact with the product |
| **Secondary users** | Support staff, administrators, content managers |
| **Off-stage actors** | Regulators, competitors, partners |
| **System actors** | External APIs, payment providers, legacy systems |

Techniques for identifying actors:
- Personas from user research
- Organizational chart analysis
- Value chain mapping
- "Who can help us reach this goal?" / "Who can obstruct it?"

### Level 3: Impacts (How)

Behavior changes we want to see in actors. This is the most critical level -- it bridges business goals and technical solutions.

| Good Impact | Bad Impact |
|---|---|
| "Customers recommend product to friends" | "Add referral feature" (this is a deliverable) |
| "Support agents resolve tickets 30% faster" | "Build knowledge base" (solution, not impact) |
| "New users complete onboarding in < 3 min" | "Simplify registration" (vague, not measurable) |

Three impact categories:
1. **Create** -- enable actors to do something they cannot do today
2. **Improve** -- help actors do something better, faster, or cheaper
3. **Prevent** -- stop actors from doing something undesirable

### Level 4: Deliverables (What)

Software features, capabilities, or activities that support the desired impacts.

- Each deliverable is a **hypothesis**: "We believe [deliverable] will cause [impact] for [actor], contributing to [goal]"
- Keep deliverables small and independently shippable
- Multiple deliverables may serve the same impact
- The same deliverable may appear under multiple impacts (shared infrastructure)

---

## Process: Facilitated Workshop

### Preparation

- Identify the business goal with stakeholders beforehand
- Invite: product owner, tech lead, UX researcher, domain expert, key stakeholders
- Timebox: 2-4 hours for initial map

### Steps

1. **Place the Goal** at the center. Validate it is measurable and agreed upon.
2. **Identify Actors** (first ring). Brainstorm broadly, then prioritize.
3. **Define Impacts** (second ring). For each prioritized actor, ask: "What behavior change would help us reach the goal?"
4. **Generate Deliverables** (third ring). For each impact, ask: "What could we build or do to support this behavior change?"
5. **Prune and Prioritize**. Draw the map, then cut. Not everything survives.

### Facilitation Tips

- Start divergent (brainstorm), then converge (prioritize)
- Challenge every deliverable: "How does this cause the impact?"
- If a deliverable does not trace back to an impact, it does not belong
- Use dot-voting on impacts to focus energy

---

## Prioritization and MVP

An impact map enables principled prioritization by making trade-offs visible.

### Selecting the MVP Path

1. Identify the **highest-leverage impacts** -- which behavior changes contribute most to the goal?
2. For each selected impact, pick the **smallest deliverable** that could validate the assumption
3. The MVP is the **minimum set of deliverables across the most important impacts** -- not a feature list, but a hypothesis set

### Prioritization Criteria

| Criterion | Question |
|---|---|
| **Impact magnitude** | How much does this behavior change move the goal metric? |
| **Confidence** | How sure are we this deliverable causes this impact? |
| **Effort** | How expensive is this deliverable to build? |
| **Risk** | What happens if we are wrong? |

Use impact/effort matrices or weighted scoring across these dimensions.

---

## Measurement and Hypothesis-Driven Development

Each level of the map contains assumptions that must be validated.

| Level | Assumption | Validation Method |
|---|---|---|
| **Goal** | This metric matters to the business | Executive alignment, strategy review |
| **Actor** | This actor can influence the goal | User research, analytics on actor segments |
| **Impact** | This behavior change moves the metric | A/B tests, cohort analysis, before/after measurement |
| **Deliverable** | This feature causes the behavior change | Feature flags, usage analytics, user interviews |

### Iteration Loop

1. Ship the smallest deliverable for the highest-priority impact
2. Measure whether the deliverable caused the expected impact
3. Measure whether the impact moved the goal metric
4. If yes: continue or amplify. If no: pivot to a different deliverable or impact
5. Update the map -- cross out invalidated paths, add new discoveries

---

## Connection to Other Methodologies

### Impact Mapping to User Story Mapping

Deliverables from impact maps become **activities and tasks** in a User Story Map. The impact provides the "backbone" narrative context for why those stories exist.

```
Impact Map Deliverable → Story Map Activity → User Stories → Sprint Backlog
```

### Impact Mapping to BDD

Impacts define the **context and business value** for BDD scenarios. The impact becomes the "In order to..." clause.

```
Impact: "New users complete onboarding in < 3 min"
  → Feature: Quick onboarding flow
    → Scenario: Given a new user, When they complete registration, Then they reach the dashboard within 3 minutes
```

### Impact Mapping to DDD

| Impact Map Element | DDD Concept |
|---|---|
| Actors | Hint at **bounded contexts** -- each actor type often operates within a distinct subdomain |
| Impacts | Hint at **core domain** -- the impacts with highest business value point to where the domain model must be richest |
| Deliverables | Map to **domain services** or **application services** within contexts |

### Impact Mapping to Event Storming

Deliverables from impact maps map to **command-event flows** discovered in Event Storming. Impacts suggest which flows matter most.

```
Impact Map Deliverable → Event Storming Command → Domain Events → Read Models
```

Run Event Storming on the highest-priority deliverables to discover the domain model.

### Impact Mapping to XP

Impact map priorities feed directly into the **Planning Game**. The impact-level priorities determine which stories get estimated and scheduled first. Short iterations validate impact assumptions quickly.

---

## Anti-Patterns

| Anti-Pattern | Symptom | Remedy |
|---|---|---|
| **Feature factory** | Jump straight to deliverables, skip goal and impacts | Always start from measurable goal; reject orphan features |
| **Solution-first thinking** | Deliverables are decided before actors and impacts are explored | Enforce left-to-right workshop flow; ban deliverable discussion until impacts are defined |
| **Too many deliverables per impact** | 10+ deliverables under one impact, analysis paralysis | Limit to 3-5 deliverables per impact; pick the smallest first |
| **Unmeasurable goals** | "Improve user experience" with no metric | Require a number and a deadline in every goal statement |
| **Ignoring negative actors** | Only map friendly actors | Explicitly ask "Who could prevent us from reaching this goal?" |
| **Static map** | Map created once, never revisited | Review map every iteration; cross out validated/invalidated paths |
| **Equal treatment** | Every branch gets equal effort | Prioritize ruthlessly; most of the map should be "not now" |

---

## Example: Online Learning Platform

**Goal**: Increase course completion rate from 35% to 55% within 6 months.

```
Goal: Course completion 35% → 55% (6 months)
│
├── Actor: Enrolled Students
│   ├── Impact: Students return daily to continue progress
│   │   ├── Deliverable: Daily streak notifications
│   │   ├── Deliverable: Progress bar on dashboard
│   │   └── Deliverable: Bite-sized lesson format (< 10 min)
│   │
│   ├── Impact: Students get unstuck when confused
│   │   ├── Deliverable: In-lesson Q&A with AI tutor
│   │   └── Deliverable: Peer discussion forums per lesson
│   │
│   └── Impact: Students feel accountable to finish
│       ├── Deliverable: Study group matching
│       └── Deliverable: Completion certificate with LinkedIn share
│
├── Actor: Course Instructors
│   ├── Impact: Instructors identify struggling students early
│   │   ├── Deliverable: At-risk student dashboard
│   │   └── Deliverable: Automated nudge emails from instructor
│   │
│   └── Impact: Instructors improve confusing content
│       └── Deliverable: Per-lesson drop-off analytics
│
└── Actor: Employers (who sponsor learners)
    └── Impact: Employers encourage employees to complete courses
        └── Deliverable: Manager progress report
```

**MVP selection**: Highest-leverage path is "Students return daily" + "Students get unstuck." Smallest deliverables: progress bar, bite-sized lessons, in-lesson Q&A. Ship these first, measure completion rate change, then decide next path.
