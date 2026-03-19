# BDD (Behavior-Driven Development): Complete Reference

## Three Pillars

### 1. Discovery

- Talking about concrete examples with stakeholders
- Exploring system requirements through examples
- Uncovering real examples early to reduce ambiguity and avoid late-stage rework
- Structured conversations called discovery workshops
- Growing shared understanding of user needs, system rules, and scope

### 2. Formulation

- Documentation of examples in a format that can be automated
- Creating Gherkin scenarios with Given-When-Then structure
- Bridging the gap between human language and automated testing
- Teams check for agreement on documented examples

### 3. Automation

- Implementing behavior described by each documented example
- Starting with an automated test to guide development
- Scenarios come alive as executable code
- Living proof that system meets specific business needs

---

## Three Amigos: Collaborative Workshop

| Role | Perspective | Contribution |
|---|---|---|
| **Product Owner / BA** | "Request" | Brings the problem needing a solution |
| **Developer** | "Suggest" | Proposes possible solutions |
| **Tester** | "Protest" | Asks about edge cases, negative scenarios |

- Recommended duration: 35-60 minutes
- Happens **before** development starts (test-first approach)
- Focus on concrete examples, not abstract requirements

---

## Example Mapping

Card-based workshop format for structured discovery.

| Card Color | Represents |
|---|---|
| Yellow | **Rules** — Business rules governing behavior |
| Green | **Examples** — Concrete instances illustrating rules |
| Red | **Questions** — Unresolved issues needing clarification |
| Blue | **Story** — The user story being explored |

### Process

1. Place the story card (blue) at top
2. For each business rule, add a yellow card
3. For each rule, add green example cards illustrating it
4. Capture questions as red cards
5. Too many red cards = story not ready for development

---

## Impact Mapping

Strategic planning technique connecting business goals to deliverables.

```
Goal → Actors → Impacts → Deliverables
```

| Level | Question |
|---|---|
| **Goal** | Why are we doing this? |
| **Actors** | Who can produce the desired effect? Who can prevent it? |
| **Impacts** | How should actors' behavior change? |
| **Deliverables** | What can we do to support the required impacts? |

---

## Specification by Example

- **Concrete Examples** — Use specific, real-world examples instead of abstract requirements
- **Key Examples** — The minimal set that illustrates all rules
- **Boundary Examples** — Edge cases that test limits
- **Living Documentation** — Executable specifications that serve as always-up-to-date documentation

---

## Gherkin Syntax (Complete)

### Keywords

| Keyword | Purpose |
|---|---|
| `Feature` | High-level description of a software feature |
| `Rule` | Business rule grouping scenarios (Gherkin 6+) |
| `Scenario` | A concrete example of behavior |
| `Scenario Outline` | Template for parameterized scenarios |
| `Given` | Pre-condition / initial context |
| `When` | Action / event that triggers behavior |
| `Then` | Expected outcome / post-condition |
| `And` / `But` | Additional steps (same type as preceding) |
| `Background` | Shared setup steps for all scenarios in a feature |
| `Examples` | Data table for Scenario Outline parameters |
| `@tag` | Tags for filtering, organizing, hooks |

### Example

```gherkin
Feature: Order Payment

  Rule: Orders under $100 are auto-approved

    Scenario: Small order is auto-approved
      Given a customer with a verified account
      And an order totaling $50
      When the customer submits payment
      Then the order should be approved automatically
      And a confirmation email should be sent

    Scenario Outline: Various order amounts
      Given an order totaling <amount>
      When the customer submits payment
      Then the order status should be <status>

      Examples:
        | amount | status        |
        | $50    | approved      |
        | $150   | pending_review|
```

---

## Outside-In Development (Double Loop)

```
┌─────────────────────────────────┐
│  BDD Outer Loop                 │
│  (Acceptance Test — RED)        │
│                                 │
│   ┌─────────────────────────┐   │
│   │  TDD Inner Loop         │   │
│   │  Red → Green → Refactor │   │
│   │  Red → Green → Refactor │   │
│   │  ...                    │   │
│   └─────────────────────────┘   │
│                                 │
│  (Acceptance Test — GREEN)      │
└─────────────────────────────────┘
```

1. Write a failing BDD acceptance test (outer loop RED)
2. Use TDD inner loops to implement the required behavior
3. When all inner TDD tests pass, the outer BDD test should also pass (GREEN)
4. Refactor

---

## Automation Concepts

- **Step Definitions** — Code that maps Gherkin steps to executable test code
- **Hooks** — Before/After handlers for setup and teardown
- **World / Context Objects** — Shared state within a scenario
- **Tags** — For filtering which scenarios to run
- **Pending Steps** — Placeholders for steps not yet implemented
