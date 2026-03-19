# Test Strategy Shapes for Web Applications

## Overview

A test strategy shape describes the **relative proportion of tests at each layer**. The shape you choose determines feedback speed, maintenance cost, and confidence level. There is no universally correct shape -- it depends on architecture, domain, and team context.

```
Ice Cream Cone (anti-pattern)    Pyramid    Trophy    Honeycomb    Diamond
       ___                         /\        __|__      ____        /\
      /   \  Manual               /  \      / Int \    / Int\      /  \
     / E2E \                     /    \    /       \  /      \    / Int\
    /       \                   / Int  \  |  Unit   | \ Impl /   /      \
   / Integ.  \                 /________\ |_Static_|  \____/    /  Unit  \
  /___Unit____\               Unit         E2E         E2E     /________\
                                                                  E2E
```

---

## 1. Test Pyramid (Mike Cohn, 2009)

**Source**: "Succeeding with Agile" by Mike Cohn

### Layers (bottom to top)

| Layer | Proportion | Scope | Speed | Cost to Write | Cost to Maintain |
|---|---|---|---|---|---|
| **Unit** | ~70% | Single function/class | ms | Low | Low |
| **Integration** | ~20% | Multiple components, DB, APIs | seconds | Medium | Medium |
| **E2E / UI** | ~10% | Full system through UI | minutes | High | High |

### Rationale

- **Speed**: Unit tests run in milliseconds; E2E tests run in seconds-to-minutes. Fast feedback loops accelerate development.
- **Isolation**: Unit tests pinpoint failures. E2E failures require investigation across the entire stack.
- **Cost curve**: Maintenance cost rises sharply with scope. UI tests are brittle (locator changes, timing issues, environment dependencies).
- **Determinism**: Narrow scope = fewer flaky tests. Broader scope = more non-deterministic behavior (network, timing, state).

### When it works best

- **Rich domain logic**: Business rules in pure functions/classes benefit from extensive unit testing (e.g., pricing engines, tax calculators, scheduling algorithms).
- **Backend-heavy systems**: APIs with complex business rules, data transformations, algorithmic processing.
- **Monolithic architectures**: Clear module boundaries within a single deployable unit.
- **Mature teams with strong design discipline**: Code that is testable in isolation (dependency injection, hexagonal architecture).

### When it breaks down

- Systems with thin domain logic and heavy integration (CRUD apps, BFF layers).
- Microservice architectures where bugs live in the interactions, not individual services.
- Teams that write unit tests for trivial getters/setters to hit coverage targets.

---

## 2. Testing Trophy (Kent C. Dodds, 2018)

**Source**: Blog post "Write tests. Not too many. Mostly integration." Adapted from Guillermo Rauch's tweet.

### Layers (bottom to top)

| Layer | Proportion | What It Tests | Tools (React ecosystem) |
|---|---|---|---|
| **Static Analysis** | Base | Type errors, lint rules, dead code | TypeScript, ESLint, Prettier |
| **Unit** | Small | Pure functions, utilities, hooks in isolation | Jest, Vitest |
| **Integration** | **Largest** | Components with children, API calls, state management | Testing Library, MSW |
| **E2E** | Small | Critical user journeys through real browser | Playwright, Cypress |

### Key insight: integration is the thickest layer

> "Integration tests strike the best balance of cost and confidence."

- **Unit tests** for frontend often test implementation details (component internals, state shape). They break on refactoring without catching real bugs.
- **Integration tests** render a component tree, simulate user interactions, and assert on visible output. They test behavior, not implementation.
- **Static analysis** catches an entire class of bugs (type mismatches, undefined variables) at zero runtime cost. This layer did not exist in Cohn's original pyramid.

### The Testing Library philosophy

```
The more your tests resemble the way your software is used,
the more confidence they can give you.
```

Practical implications:
- Query by role/label/text, not by CSS selector or test ID
- Fire real events (`userEvent.click`), not synthetic ones
- Assert on what the user sees, not on component state
- Avoid testing implementation details (internal state, lifecycle methods)

### When it works best

- **Frontend-heavy web applications**: SPAs, component libraries, form-heavy UIs.
- **React/Vue/Svelte ecosystems**: Where Testing Library is the standard.
- **TypeScript codebases**: Static layer handles what unit tests used to catch.
- **Teams shipping UI features rapidly**: Integration tests survive refactors better.

---

## 3. Testing Honeycomb (Spotify, 2018)

**Source**: Spotify Engineering blog, "Testing of Microservices"

### Layers (widest in the middle)

| Layer | Proportion | What It Tests |
|---|---|---|
| **Integrated Tests** (top) | Small | Full end-to-end flows across multiple deployed services |
| **Integration Tests** (middle) | **Largest** | One service against its real dependencies (DB, queues, HTTP APIs via stubs/containers) |
| **Implementation Detail Tests** (bottom) | Small | Internal logic in isolation (pure functions, algorithms) |

### Key distinctions

**Integration tests (NOT "integrated tests")**:
- Test one service's behavior when interacting with external dependencies
- Use Testcontainers, Docker Compose, WireMock, or in-memory replacements
- Verify HTTP endpoints, message consumers, database queries
- Example: "When POST /orders is called with valid payload, order is persisted to DB and event is published to Kafka"

**Implementation detail tests** (deliberately small):
- Only for genuinely complex algorithms or business rules
- Spotify argues most microservice logic is glue code -- routing, mapping, persisting -- better tested through integration
- Testing glue code in isolation leads to tests coupled to implementation that break on refactoring

**Integrated tests** (deliberately small):
- Cross-service tests are slow, flaky, hard to maintain, and difficult to attribute failures
- Prefer contract tests between services (see Section 6)
- Reserve for a handful of critical smoke tests in staging/production

### When it works best

- **Microservice architectures**: Each service is small; value comes from correct integration, not internal logic.
- **Event-driven systems**: Message production/consumption is the critical behavior to test.
- **Services with thin business logic**: CRUD services, API gateways, orchestrators, BFF layers.
- **Teams using Testcontainers**: Docker-based integration testing is fast and reliable enough to be the primary testing strategy.

---

## 4. Testing Diamond

### Shape

```
      /\         E2E (small)
     /  \
    / Int \      Integration (large)
   /      \
   \      /     Unit (large)
    \ Fn /
     \  /
      \/         (narrows at bottom -- fewer trivial unit tests)
```

### Concept

A hybrid shape emerging from teams that combine:
- **Significant unit tests** for rich domain logic (DDD-style aggregates, value objects, domain services)
- **Significant integration tests** for verifying components work together (API tests, DB tests)
- **Few E2E tests** for critical paths only
- **Fewer trivial unit tests** than the pyramid (no testing getters, constructors, or delegation)

### When it works best

- **Domain-rich applications with significant integration surface**: E-commerce platforms, financial systems with external service dependencies.
- **Hexagonal / Clean Architecture**: Domain layer is pure (unit testable), ports/adapters need integration tests.
- **Systems where both internal logic AND external integration are failure-prone**.

---

## 5. Ice Cream Cone (Anti-Pattern)

### Shape (inverted pyramid)

| Layer | Proportion | Problem |
|---|---|---|
| **Manual Testing** | Largest | Slow, expensive, not repeatable, blocks releases |
| **E2E / UI Automated** | Large | Slow, flaky, expensive to maintain |
| **Integration** | Small | Under-invested |
| **Unit** | Smallest | Almost no fast feedback |

### How teams end up here

1. Testing added after the fact to existing untestable code
2. QA team writes E2E tests; developers write few or no tests
3. Management mandates "automated testing" without guidance on layer balance
4. Legacy codebase with tight coupling makes unit testing difficult
5. Over-reliance on record-and-playback UI test tools

### Why it hurts

- **Slow feedback**: Bugs found hours or days after introduction, not seconds
- **Flaky pipelines**: E2E tests fail intermittently, eroding trust in the test suite
- **Release bottleneck**: Manual testing gates every release
- **High maintenance cost**: UI changes cascade into massive test rewrites

---

## 6. Choosing the Right Shape

### Decision Matrix

| Factor | Pyramid | Trophy | Honeycomb | Diamond |
|---|---|---|---|---|
| **Domain logic density** | High | Low-Medium | Low | High |
| **UI complexity** | Low | High | N/A (backend) | Medium |
| **Service count** | 1 (monolith) | 1 (SPA) | Many (microservices) | Few |
| **Integration surface** | Small | Medium | Large | Large |
| **Primary language** | Any | JS/TS | Any | Any |
| **Static typing** | Optional | Essential (base layer) | Optional | Optional |
| **Team testing maturity** | Any | Medium-High | High | High |

### Decision flowchart

```
Is most of the complexity in domain logic (algorithms, rules, calculations)?
├── YES → Is there also significant integration surface?
│   ├── YES → Diamond
│   └── NO  → Pyramid
└── NO  → Is this a frontend/SPA?
    ├── YES → Trophy
    └── NO  → Is this microservices?
        ├── YES → Honeycomb
        └── NO  → Pyramid (default)
```

### Practical guidelines

- **No shape is pure**. Real projects blend approaches. A microservice with a complex pricing engine has a honeycomb shape overall but a pyramid shape within the pricing module.
- **Adjust per module, not per project**. A monolith with a rich domain layer AND a complex UI can use pyramid for the domain and trophy for the frontend.
- **Measure feedback time**. If your test suite takes >10 minutes, you likely have too many slow tests relative to fast ones.
- **Track flake rate**. High flake rates signal over-reliance on broad-scope tests.

---

## 7. Connection to Other Methodologies

### BDD Scenarios Across Test Layers

BDD scenarios (Given/When/Then) can execute at **any** layer:

| Layer | BDD Example | How |
|---|---|---|
| **Unit** | "Given a cart with 3 items, when discount applied, then total reduced by 10%" | Scenario drives a unit test on `Cart.applyDiscount()` |
| **Integration** | "Given a registered user, when they submit an order, then order is persisted" | Scenario drives an API test (HTTP request, DB assertion) |
| **E2E** | "Given a logged-in user, when they complete checkout, then confirmation email is sent" | Scenario drives a browser test (Playwright + mail trap) |

**Best practice**: Write BDD scenarios at the **lowest layer that provides confidence**. Most scenarios belong at the integration layer. Reserve E2E for flows that span UI + backend + external systems.

### TDD and the Test Pyramid

- TDD naturally produces **unit-layer tests** in the Red-Green-Refactor cycle
- **Outside-In TDD** (London School) starts at the integration/acceptance layer and drives inward, producing tests at multiple layers
- **Classical TDD** (Chicago School) focuses on unit tests with real collaborators
- TDD does not prescribe a shape -- it prescribes a workflow. The shape emerges from where you start and how you decompose

### Contract Testing Between Services

Contract testing occupies the **space between integration and E2E** in microservice architectures:

```
E2E (few smoke tests)
─────────────────────
Contract Tests ← replaces most cross-service E2E tests
─────────────────────
Integration Tests (per-service, with Testcontainers)
─────────────────────
Unit Tests
```

- **Consumer-driven contracts** (Pact): Consumer defines expectations, provider verifies
- **Provider-driven contracts** (OpenAPI + verification): Provider publishes spec, consumers validate
- Contract tests are fast (no network, no deployment) and deterministic
- They verify **compatibility**, not correctness. Each service still needs its own integration tests.

### Continuous Delivery Pipeline Stage Design

Test shape maps directly to pipeline stages:

```
Commit Stage        │ Static analysis, unit tests, build
(seconds-minutes)   │ Gate: fast feedback, must pass before merge
                    │
Acceptance Stage    │ Integration tests, contract tests
(minutes)           │ Gate: service works correctly with dependencies
                    │
Production Stage    │ E2E smoke tests, canary deployment, monitoring
(minutes-hours)     │ Gate: system works end-to-end in real environment
```

| Pipeline Principle | Test Shape Implication |
|---|---|
| **Fail fast** | Pyramid's wide unit base catches most errors in the commit stage |
| **Increasing confidence** | Each stage is broader in scope but narrower in count |
| **Parallelize** | Unit/static run in parallel; integration tests run per-service in parallel |
| **Deploy independently** | Contract tests enable independent service deployment without cross-service E2E |
| **Keep the pipeline green** | Fewer E2E tests = fewer flaky failures = more trustworthy pipeline |

### Relationship summary

```
Methodology          Primary Test Layer     Shape Affinity
─────────────────────────────────────────────────────────
TDD (Classical)      Unit                   Pyramid
TDD (Outside-In)     Integration → Unit     Diamond / Trophy
BDD                  Any (prefer lowest)    Shape-agnostic
Contract Testing     Between services       Honeycomb (replaces E2E)
CD Pipeline          All (staged)           Maps to any shape
```

---

## 8. Common Mistakes

| Mistake | Why It Happens | Fix |
|---|---|---|
| Testing implementation details | Mocking everything, asserting on internal state | Test behavior and outputs, not how code is structured |
| 100% unit coverage, 0% integration | Coverage metric gaming | Set coverage targets per layer, not globally |
| Duplicating tests across layers | Same scenario tested as unit, integration, AND E2E | Each layer should test something the layer below cannot |
| Flaky E2E suite nobody trusts | Too many broad tests, shared mutable state | Quarantine flaky tests, reduce E2E count, add contract tests |
| One shape for entire organization | Different services have different needs | Let teams choose per service/module |
| No tests for error paths | Happy path bias | Explicitly test failure modes: timeouts, 500s, malformed input, empty states |
