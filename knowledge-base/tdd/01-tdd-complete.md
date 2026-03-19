# TDD (Test-Driven Development): Complete Reference

## Core Cycle: Red-Green-Refactor

```
RED → Write a failing test that defines desired behavior
  ↓
GREEN → Write the simplest code to make the test pass
  ↓
REFACTOR → Improve the code while keeping all tests green
  ↓
(repeat)
```

---

## Three Laws of TDD (Robert C. Martin)

1. You are not allowed to write any production code unless it is to make a failing unit test pass
2. You are not allowed to write any more of a unit test than is sufficient to fail (and compilation
   failures are failures)
3. You are not allowed to write any more production code than is sufficient to pass the one
   failing unit test

---

## Transformation Priority Premise (Robert C. Martin)

Guides the order of code transformations during TDD, from simplest to most complex:

1. `{}` → nil (no code → return nil/null)
2. nil → constant
3. constant → variable
4. unconditional → conditional (if/else)
5. scalar → collection
6. statement → recursion
7. value → mutated value
8. if → while (iteration)

The premise: choosing simpler transformations leads to better algorithms and avoids getting stuck.

---

## Classical (Chicago) vs. Mockist (London) School

| Aspect | Classical / Chicago | Mockist / London |
|---|---|---|
| **Approach** | State-based verification | Interaction-based verification |
| **Test Doubles** | Use real collaborators when possible | Mock all collaborators |
| **Design Focus** | Emergent design from tests | Outside-in, contract-driven |
| **Coupling** | Tests coupled to state/output | Tests coupled to interactions |
| **Key Advocates** | Kent Beck | Steve Freeman, Nat Pryce |
| **Key Book** | "Test-Driven Development By Example" | "Growing Object-Oriented Software, Guided by Tests" |

---

## Test Doubles

| Type | Description |
|---|---|
| **Dummy** | Passed around but never used. Fills parameter lists |
| **Stub** | Provides canned answers to calls. No verification of interactions |
| **Spy** | Records calls made to it for later verification |
| **Mock** | Pre-programmed with expectations. Verifies interactions |
| **Fake** | Working implementation with shortcuts (e.g., in-memory database) |

---

## Test Patterns

### Arrange-Act-Assert (AAA)

```
Arrange  → Set up test fixtures and preconditions
Act      → Execute the behavior under test
Assert   → Verify the expected outcome
```

### Given-When-Then

```
Given    → Initial context (same as Arrange)
When     → Action/event (same as Act)
Then     → Expected outcome (same as Assert)
```

### Four-Phase Test

```
Setup    → Establish preconditions
Exercise → Execute behavior
Verify   → Check results
Teardown → Clean up
```

---

## Test Types

| Type | Scope | Speed | Purpose |
|---|---|---|---|
| **Unit** | Single class/function | Fast | Verify isolated behavior |
| **Integration** | Multiple components | Medium | Verify collaboration |
| **Acceptance** | Full system behavior | Slow | Verify business requirements |
| **Contract** | API boundaries | Fast | Verify interface contracts |

---

## Design Principles Emerging from TDD

- **SOLID Principles** — TDD naturally drives toward SOLID designs
- **Low Coupling** — Hard-to-test code reveals excessive coupling
- **High Cohesion** — Tests focus on one behavior → classes focus on one responsibility
- **Dependency Injection** — Required for effective mocking/stubbing
- **Small, Focused Classes** — Large classes are hard to test
- **Intention-Revealing Names** — Test names describe expected behavior

---

## Growing Object-Oriented Software, Guided by Tests (Freeman & Pryce)

### Key Concepts

- **Outside-In Development** — Start from the outside (acceptance test) and work inward
- **Walking Skeleton** — A tiny end-to-end implementation to validate architecture early
- **Ports and Adapters** — Architecture that supports testability
- **Test-Driven by Need** — Let failing tests drive the creation of new abstractions
- **Listen to the Tests** — Tests that are hard to write reveal design problems
- **Roles, Not Objects** — Design in terms of roles (interfaces) that objects play
