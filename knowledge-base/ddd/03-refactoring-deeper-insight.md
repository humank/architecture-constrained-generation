# DDD Part III: Refactoring Toward Deeper Insight

## Breakthrough (Ch.8)

- **Breakthrough** — Moments of sudden insight where the model dramatically improves.
- Refactoring toward deeper insight is not just about code cleanliness but about discovering
  richer models.
- **Successive Refinement** — Models improve through many small refactorings and occasional major
  breakthroughs.

---

## Making Implicit Concepts Explicit (Ch.9)

### Digging Out Concepts

Finding hidden concepts through:

| Technique | Description |
|---|---|
| **Listen to Language** | Terms domain experts use repeatedly or correct diplomatically |
| **Scrutinize Awkwardness** | Confusing, hard-to-extend code signals undiscovered abstractions |
| **Contemplate Contradictions** | Different expert perspectives reveal gaps |
| **Read the Domain Literature** | Books and documentation in the field |

### Less Obvious Kinds of Concepts

#### Explicit Constraints

When business rules are complex enough to warrant their own objects rather than hiding in procedural
code. Extract when:

- Evaluation requires data outside normal object definition
- Related rules appear across multiple objects
- Constraints dominate design conversations yet hide in procedural code

#### Processes as Domain Objects

Making business processes first-class citizens in the model. A Service is one way to express a
process explicitly.

#### Policy

A variant of Strategy pattern in the domain; rules that govern behavior. Allows varying business
rules to be encapsulated as separate objects.

### Specification Pattern

Encapsulates predicates/business rules as reusable objects.

#### Three Uses

1. **Validation** — Evaluate if an object fulfills some need or is ready for some purpose
2. **Selection / Querying** — Filter collections through explicit criteria (actual SQL belongs in
   Repositories, not Specifications)
3. **Building-to-Order / Generation** — Pass specifications to Factories to determine what object
   to create

#### Composition

Specifications can be combined with logical operators:

- `AND` — Both specifications must be satisfied
- `OR` — At least one specification must be satisfied
- `NOT` — Specification must not be satisfied

This enables building complex rules from simple, reusable building blocks.

---

## Supple Design (Ch.10)

Design patterns that make the domain model easy to understand, modify, and extend.

### Intention-Revealing Interfaces

Name classes and operations to describe their **effect and purpose** without referencing mechanism.
Callers should not need to read implementation to understand what an operation does.

### Side-Effect-Free Functions

Operations that return results without observable side effects. Strict separation of commands and
queries (CQS — Command-Query Separation).

- **Commands** — Change state, return void
- **Queries** — Return results, do not change state

### Assertions

State post-conditions of operations and invariants of classes and aggregates. Make contracts explicit.

| Type | Description |
|---|---|
| **Pre-conditions** | What must be true before an operation |
| **Post-conditions** | What is guaranteed true after an operation |
| **Class Invariants** | What is always true about an instance |

### Conceptual Contours

Decompose design elements to align with the **natural boundaries of the domain**. Find cohesive
units that evolve together. When elements change at different rates or for different reasons,
they belong in different contours.

### Standalone Classes

Eliminate dependencies so a class depends only on primitives and fundamental library types. Reduce
coupling to the absolute minimum. Every dependency is a cognitive burden.

### Closure of Operations

Define an operation whose return type is the same as the type of its arguments. Borrowed from
mathematics: a set is closed under an operation if the result is always a member of that set.

Example: `Money.add(Money) → Money`

### Declarative Design

Describe **what you want to accomplish** rather than how. Express domain logic through declarations
rather than imperative procedures.

- **Domain-Specific Languages (DSLs)** — The ultimate form of declarative design
- **Pitfalls** — Framework-driven declarative approaches can become restrictive

### Angles of Attack

Combining supple design patterns in practice:

- **Extending Specifications in a Declarative Style** — Using specification composition
  (AND/OR/NOT) as a form of declarative design
- **Drawing on Established Formalisms** — Leveraging existing formal conceptual frameworks
  (e.g., mathematics, accounting, logic) that have been refined over centuries

---

## Applying Analysis Patterns (Ch.11)

- **Analysis Patterns** — Specialized, high-level patterns from established domain knowledge
  (references Martin Fowler's "Analysis Patterns" book).
- Using proven domain models from existing literature to accelerate insight.
- Analysis patterns are not technical solutions but generalized domain models.

---

## Relating Design Patterns to the Model (Ch.12)

Not all GoF patterns apply to domain modeling. Evans selects those with direct domain relevance:

### Strategy (Policy) Pattern

Factor varying parts of a process into a separate "strategy" object in the model. Domain processes
that have alternative implementations.

### Composite Pattern

Model complex structures (like routes composed of sub-routes) as trees where all elements share a
common type.

---

## Bringing the Pieces Together (Ch.13)

- **Initiation** — How to start refactoring toward deeper insight
- **Exploration Teams** — Small teams that investigate alternative model designs
- **Prior Art** — Leveraging existing knowledge and established domain formalisms
- **A Design for Developers** — Keeping supple design approachable
- **Timing** — When to attempt breakthroughs
- **Crisis As Opportunity** — Using pain points as signals for model improvement
