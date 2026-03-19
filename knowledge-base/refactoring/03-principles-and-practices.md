# Refactoring: Principles, Practices, and Connection to DDD

## The Two Hats (Kent Beck)

Two distinct activities — wear only **one hat at a time**:

1. **Adding Functionality** — Focus exclusively on adding new capabilities. Do not change structure.
2. **Refactoring** — Focus exclusively on restructuring. Do not add any new functionality.

Swap hats frequently (every few minutes), but never do both simultaneously.

---

## Six Workflows of Refactoring

### 1. Rule of Three (Don Roberts)

> First time: just do it. Second time: wince at duplication, do it anyway. Third time: refactor.

### 2. Preparatory Refactoring

Restructure code **before** adding a feature to make the addition easier.

### 3. Comprehension Refactoring

> "Whenever you have to figure out what code is doing, move that understanding into the code."

### 4. Litter-Pickup Refactoring

Camp-site rule: "Always leave the code better than when you found it."

### 5. Planned Refactoring

Dedicated sessions. Fowler notes this indicates insufficient day-to-day refactoring.

### 6. Long-Term Refactoring

Large-scale restructuring spanning weeks/months. Uses **Branch by Abstraction** to keep
the system working throughout.

### TDD Refactoring (Red-Green-Refactor)

Third step of every TDD cycle — clean up the code you just wrote to make the tests pass.

---

## When NOT to Refactor

- **Code you don't need to modify** — If never touched, no payback
- **When rewriting is easier** — Code so broken that restructuring is harder than starting over
- **Without sufficient test coverage** — "Walking a tightrope without a safety net"
- **Without sufficient experience** — Knowing when/how much comes with practice

---

## Refactoring and Performance

- Do **not** worry about performance during refactoring
- Build well-factored code first, then use a profiler to find hot spots
- Usually 10% of the code accounts for 90% of the time
- Optimize only those hot spots

---

## Refactoring and Testing

- Tests are the **essential safety net**
- Refactoring should keep all tests passing at every step
- Small steps minimize risk — if a test fails, you know which step caused it
- "Before refactoring, check that you have a solid suite of tests"

---

## The Strangler Fig Pattern

Replace legacy systems incrementally rather than big-bang rewrites.

### Process

1. Build new functionality **alongside** the legacy system
2. Route requests through a proxy/facade (old or new)
3. Incrementally migrate behavior from legacy to new
4. Eventually decommission the legacy system

### Branch by Abstraction (Related Technique)

For long-term refactoring within a single codebase:

1. Introduce an abstraction layer over the code to change
2. Migrate clients to use the abstraction
3. Build new implementation behind the abstraction
4. Switch from old to new implementation
5. Remove the abstraction if no longer needed

---

## Connection to DDD: Three Levels of Refactoring

### Level 1: Micro-Refactorings

Small, mechanical improvements from Fowler's catalog. Improve code clarity but don't
change the domain model.

### Level 2: Refactoring to Design Patterns

Apply Strategy, Specification, Composite, etc. to restructure at a higher level.

### Level 3: Refactoring to a Deeper Model

The most impactful DDD contribution. Motivated by **new insights into the domain** rather
than purely technical concerns.

### The Breakthrough Concept

Wide-scale refactoring when the team gains fundamentally deeper domain insight:

- Rebuilding previously completed functionality
- Higher risk but proportionally higher returns
- Moves from "shallow knowledge" to "deep models"

### The Feedback Loop

> "A design can actually feed insight into the model discovery process when it has the
> flexibility to let a developer experiment and the clarity to show what is happening."

This is **supple design** — code that is easy to refactor encourages further domain exploration.

### Key Insight

> Fowler's techniques provide the **mechanical foundation** (safe, incremental code changes).
> DDD provides the **strategic direction** (what the model should look like based on domain insight).
> The two are deeply complementary.
