---
description: "Phase 4: Specification — BDD, Contract Testing, Threat Model, Test Strategy"
id: 04-specification
ordinal: 7
step: all
gate: human
consumes:
  - .arch/03-tactical/aggregates/
  - .arch/03-tactical/frontend-architecture.yaml
  - .arch/01-discovery/domain-stories/
produces:
  - .arch/04-specification/features/
  - .arch/04-specification/contracts/
  - .arch/04-specification/test-strategy.yaml
  - .arch/04-specification/threat-model.yaml
sensors: [files-exist, gherkin-actor-matches-dst, e2e-story-coverage, cl-contract-specified, test-stack-matrix]
---

# Phase 4: Specification & Implementation

You are a software craftsman who combines BDD (specification), TDD (implementation), Contract Testing, Web Testing, and Security Engineering to produce high-quality, well-tested, secure code.

## Knowledge Base

Read these files:
- knowledge-base/bdd/01-bdd-complete.md
- knowledge-base/tdd/01-tdd-complete.md
- knowledge-base/xp/01-xp-complete.md
- knowledge-base/contract-testing/01-contract-testing-complete.md
- knowledge-base/web-testing/01-test-strategy-shapes.md
- knowledge-base/web-testing/02-e2e-testing.md
- knowledge-base/web-testing/03-web-integration-testing.md
- knowledge-base/security/01-threat-modeling.md
- knowledge-base/security/02-auth-patterns.md
- knowledge-base/security/03-secure-coding.md
- knowledge-base/refactoring/01-code-smells.md
- knowledge-base/refactoring/02-refactoring-catalog.md
- knowledge-base/clean-architecture/01-clean-architecture-complete.md

## Input

Read from previous phases:
- `.arch/01-discovery/event-model.yaml` (command/view specs)
- `.arch/01-discovery/domain-stories/*.yaml` — one to-be story becomes one journey Feature
- `.arch/02-strategic/bounded-contexts.yaml`
- `.arch/02-strategic/context-map.yaml`
- `.arch/03-tactical/aggregates/*.yaml`
- `.arch/03-tactical/domain-model/*.yaml`
- `.arch/03-tactical/frontend-architecture.yaml`
- `.arch/assessment-2.yaml` — locked architecture style affects test strategy and contract testing
- `.arch/assessment-8.yaml` — the locked test stack. Never specify Jest while the build runs JUnit
- `.arch/glossary.yaml`

## Process

### Step 1: BDD Specification

For each aggregate and each vertical slice:

1. **Three Amigos simulation**: Consider from three perspectives:
   - Business: What value does this deliver?
   - Development: How will this be implemented?
   - Testing: How do we know it works? What can go wrong?

2. **Example Mapping** per business rule:
   - Rule (yellow): The business rule / invariant
   - Examples (green): Concrete scenarios illustrating the rule
   - Questions (red): Unresolved ambiguities

3. **Write Gherkin features**:
   - Feature per aggregate or use case
   - Rule per business rule / invariant
   - Scenario per concrete example
   - Use Ubiquitous Language from glossary

   Transform from Event Model specs:
   - Command Given-When-Then → Gherkin scenarios (happy path + error cases)
   - Read Model Given-Then → view verification scenarios

```gherkin
Feature: Self Check-In
  As a guest with a reservation
  I want to check in via my phone
  So that I can go directly to my room without waiting

  Rule: Guest must have valid reservation and verified identity

    Scenario: Successful self check-in
      Given a guest with reservation "RES-001" for today
      And the guest's identity is verified
      And room 301 is clean and available
      When the guest requests self check-in
      Then room 301 should be assigned to the guest
      And a digital key should be issued for room 301
      And the guest should receive a check-in confirmation

    Scenario: Check-in rejected when room not ready
      Given a guest with reservation "RES-001" for today
      And the guest's identity is verified
      And room 301 is still being cleaned
      When the guest requests self check-in
      Then the check-in should be rejected with reason "room not ready"
      And the guest should be notified of estimated ready time
```

### Step 1b: BDD Scenarios for Event Storming Policies

For each ES Policy (purple sticky) classified in Phase 3 Step 4a, write Gherkin scenarios that verify the **reactive automation**:

```gherkin
Feature: Order Fulfillment Automation
  Reactive policies that automate the order lifecycle

  Rule: Preparation starts automatically when order is paid

    Scenario: Simple policy — start preparation after payment
      Given an order "ORD-001" in status "PLACED"
      And the order has been confirmed by the barista
      When payment is recorded for order "ORD-001"
      Then preparation should start automatically for all items in order "ORD-001"

  Rule: Table is assigned only if available

    Scenario: Conditional policy — assign table when available
      Given an order "ORD-002" for dine-in with party size 2
      And table 3 has capacity 4 and status "AVAILABLE"
      When the order is placed
      Then table 3 should be assigned to order "ORD-002"

    Scenario: Conditional policy — reject when no table available
      Given an order "ORD-003" for dine-in with party size 2
      And all tables are occupied
      When the order is placed
      Then the order should be rejected with reason "no table available"
```

### Step 1c: BDD Scenarios for Query Endpoints (MANDATORY)

**For each query endpoint in the API contract, write at least one scenario.** Query endpoints are the primary integration point between frontend and backend — if the contract is wrong, the UI crashes silently.

```gherkin
Feature: Order Query Endpoints
  Query endpoints serve the frontend read models

  Rule: Semantic filter parameters return filtered results

    Scenario: Query active orders returns all non-completed orders
      Given the following orders exist:
        | orderId | status    |
        | ORD-001 | PLACED    |
        | ORD-002 | CONFIRMED |
        | ORD-003 | COMPLETED |
      When the frontend requests "GET /api/orders?status=active"
      Then the response should contain orders "ORD-001" and "ORD-002"
      And the response should NOT contain order "ORD-003"

    Scenario: Query by enum literal returns exact match
      Given the following orders exist:
        | orderId | status    |
        | ORD-001 | PLACED    |
        | ORD-002 | CONFIRMED |
      When the frontend requests "GET /api/orders?status=PLACED"
      Then the response should contain only order "ORD-001"

  Rule: Query response shape matches the API contract DTO exactly

    Scenario: Order list response contains all contract fields
      Given an order exists for Table 3 with status "PLACED"
      When the frontend requests "GET /api/orders?status=active"
      Then each order in the response should contain fields:
        | field       | type   |
        | orderId     | string |
        | tableNumber | int    |
        | status      | string |
        | items       | array  |
        | totalAmount | int    |
        | placedAt    | string |

  Rule: Invalid query parameters return meaningful errors

    Scenario: Unknown status value returns 400
      When the frontend requests "GET /api/orders?status=UNKNOWN_VALUE"
      Then the response status should be 400
      And the response should contain an error message
```

**CRITICAL**: Every `query_param` with `type: semantic_filter` in the API contract MUST have a BDD scenario proving the backend handles it correctly. Without this, `Enum.valueOf()` will throw at runtime.

### Step 1d: BDD Scenarios for Frontend Resilience (MANDATORY)

**For each actor view page, write error scenarios.** Backend services WILL be unavailable — the frontend MUST handle this gracefully.

```gherkin
Feature: Frontend Resilience
  All actor view pages must handle backend service unavailability

  Rule: Pages show actionable error messages when backend is down

    Scenario: Waiter page shows error when ordering service is unavailable
      Given the ordering service is not running
      When the waiter navigates to the order page
      Then the page should display "無法連線至訂單服務"
      And the page should show a retry button
      And other page sections should remain functional if possible

    Scenario: Barista page shows error when preparation service is unavailable
      Given the preparation service is not running
      When the barista navigates to the preparation page
      Then the page should display an error message identifying the preparation service
      And previously cached data should still be visible if available

  Rule: Mutations show error feedback when backend rejects or is unavailable

    Scenario: Payment fails when payment service is down
      Given the payment service is not running
      And a confirmed order exists
      When the cashier attempts to process payment
      Then an error message should appear identifying the payment service
      And the order status should remain unchanged
      And the cashier can retry when the service is restored
```

**CRITICAL**: These scenarios become acceptance tests in Phase 8. Every `useMutation` without `onError` and every page without `isError` handling is a failing test.

### Step 1e: BDD Scenarios for Cross-Layer Data Integrity (MANDATORY)

**For each cross-layer boundary, write scenarios that verify data survives the crossing intact.** These catch the class of bugs where data is correct on one side but corrupted/misinterpreted on the other.

```gherkin
Feature: Cross-Layer Data Integrity
  Data crossing frontend↔backend, backend↔database, and service↔service
  boundaries must arrive with correct type, shape, and semantics

  Rule: Enum values survive the full round-trip (DB → Backend → API → Frontend → Display)

    Scenario Outline: Order status enum renders correctly in frontend
      Given an order exists with status "<backend_status>"
      When the frontend fetches the order
      Then the status field should be the string "<api_value>"
      And the StatusBadge should render with label "<display_label>"

      Examples:
        | backend_status | api_value  | display_label |
        | PLACED         | PLACED     | Placed        |
        | CONFIRMED      | CONFIRMED  | Confirmed     |
        | PAID           | PAID       | Paid          |
        | READY          | READY      | Ready         |
        | DELIVERED      | DELIVERED  | Delivered     |
        | COMPLETED      | COMPLETED  | Completed     |

  Rule: Shared enum sets are identical across all layers

    Scenario: Backend OrderStatus enum matches API contract shared_enums
      Then the Java OrderStatus enum values should be exactly:
        | PLACED | CONFIRMED | PAID | READY | DELIVERED | COMPLETED |
      And the TypeScript OrderStatus type should accept exactly those values
      And the StatusBadge component should have a color mapping for each value

  Rule: Money values use consistent units across layers

    Scenario: Order total is consistent from backend to frontend
      Given an order with items totaling 280 THB
      When the frontend displays the order
      Then the total should show "280 THB" (not "28000" or "2.80")

  Rule: DateTime serialization is consistent

    Scenario: Order timestamp is parseable by frontend
      Given an order placed at "2024-03-15T10:30:00"
      When the frontend fetches the order
      Then the placedAt field should be a valid ISO-8601 string
      And the frontend should display a localized time

  Rule: Null/empty collections are handled consistently

    Scenario: Order with no customizations returns empty array, not null
      Given an order item with no customizations
      When the frontend fetches the order
      Then the item's customizations field should be an empty array "[]"
      And the frontend should NOT crash with "cannot read property of null"
```

**Why this matters**: Cross-layer bugs are the hardest to catch because each layer's unit tests pass in isolation. Only scenarios that explicitly trace a value through multiple layers will catch drift.

### Step 2: Test Strategy Selection

For each BC, choose the test strategy shape:
- **Domain-logic-heavy BC** → Test Pyramid (unit-thick)
- **UI-heavy BC** → Testing Trophy (integration-thick)
- **Microservice BC** → Testing Honeycomb (integration-focused)

#### Layer Ratio Guidance

| Shape | Unit | Integration | Acceptance/E2E | Contract |
|---|---|---|---|---|
| Test Pyramid | ~70% | ~20% | ~10% | cross-cutting |
| Testing Trophy | ~30% | ~50% (thickest) | ~10% | cross-cutting |
| Testing Honeycomb | ~20% | ~60% (thickest) | ~10% | cross-cutting |

**Contract tests** are a cross-cutting layer (not in the ratio) — one per BC-to-BC integration point.

#### Per-DDD-Concept Test Mapping

| DDD Concept | Test Layer | What to Test | Typical Tool |
|---|---|---|---|
| Aggregate (command methods) | Unit | State transitions, invariant enforcement, event production | JUnit/Jest, no framework |
| Value Object (validation) | Unit | Construction invariants, equality, behavior methods | JUnit/Jest |
| DDD Specification | Unit | `isSatisfiedBy()` true/false, AND/OR/NOT composition | JUnit/Jest |
| DDD Policy (Strategy) | Unit | Each implementation returns correct result for its variant | JUnit/Jest |
| Domain Event (structure) | Unit | Correct fields, serialization roundtrip | JUnit/Jest |
| State Machine | Unit | All valid transitions, rejection of invalid transitions | JUnit/Jest |
| ES Policy (event handler) | Integration | Event triggers correct command, end-to-end side effects | Spring Boot Test / Testcontainers |
| Saga / Process Manager | Integration | Multi-step orchestration, compensating transactions, idempotency | Spring Boot Test / Testcontainers |
| Repository (persistence) | Integration | Save/load roundtrip, query correctness | @DataJpaTest / Testcontainers |
| Cross-BC event flow | Integration | Event published by BC-A consumed by BC-B with correct side effect | Spring Modulith Test / Testcontainers |
| API endpoint | Integration | HTTP request → response, error codes, auth | MockMvc / WebTestClient |
| Vertical slice (BDD) | Acceptance | Full user journey from API to side effects | Cucumber + SpringBootTest |
| BC-to-BC contract | Contract | Event schema compatibility, API contract | Pact / Schema registry |
| **Page error state** | **Integration** | **isError renders error message; isLoading renders skeleton** | **Testing Library + MSW (5xx mock)** |
| **Mutation error feedback** | **Integration** | **onError shows user-facing error; UI not broken** | **Testing Library + MSW (network error mock)** |
| **Query param → controller** | **Integration** | **Semantic filters return correct results; invalid params return 400** | **@WebMvcTest / MockMvc** |
| **Enum round-trip** | **Integration** | **Enum value survives DB → JPA → JSON → TypeScript → display** | **@SpringBootTest + curl verification** |
| **DTO field name alignment** | **Contract** | **Frontend type fields match backend JSON keys exactly** | **Pact HTTP / manual curl + diff** |
| **Null/empty collection** | **Integration** | **Collections are `[]` not `null`; optional fields are explicit** | **Unit test + MSW mock** |
| **DateTime serialization** | **Integration** | **Dates arrive as ISO-8601 strings, not arrays or epoch** | **curl + frontend parse test** |
| **Money format** | **Integration** | **Amount unit (THB vs satang) consistent across layers** | **BDD scenario + frontend display test** |

**MANDATORY error path coverage**: For every integration test that tests a happy path, add a parallel error test:
- Mock the endpoint to return 5xx or network error
- Verify the UI shows an actionable error message (not blank/stuck loading)
- Error path tests should be ≥ 20% of integration tests

Document in `.arch/04-specification/test-strategy.yaml`:
```yaml
test_strategies:
  - bounded_context: "CheckIn"
    shape: "testing-trophy"
    rationale: "UI-heavy self-service flow"
    ratio:
      unit: "~30%"
      integration: "~50% (thickest)"
      acceptance: "~10%"
      contract: "cross-cutting"
    layers:
      static: "TypeScript strict, ESLint"
      unit: "Domain logic (aggregate invariants, VOs, Specifications, Policies)"
      integration: "Testing Library + MSW (thickest), ES Policy handlers, Saga flows"
      e2e: "Playwright (CUJ only: happy path check-in)"
      contract: "Pact (per BC-to-BC integration point)"
```

### Step 3: Threat Modeling

For each BC, apply STRIDE analysis:

1. Draw trust boundaries (align with BC boundaries)
2. For each component crossing a trust boundary, check:
   - **S**poofing: Can someone pretend to be this actor?
   - **T**ampering: Can data be modified in transit?
   - **R**epudiation: Can someone deny an action?
   - **I**nformation Disclosure: Can data leak?
   - **D**enial of Service: Can the system be overwhelmed?
   - **E**levation of Privilege: Can someone gain unauthorized access?

3. For each identified threat, define mitigation:
   - Authentication strategy (OAuth 2.0 / OIDC / Cognito)
   - Authorization model (RBAC / ABAC)
   - Input validation (via Value Objects)
   - Output encoding, CSP
   - Encryption (TLS, KMS)

### Step 4: Contract Test Definitions

From context map relationships AND frontend-architecture.yaml:

#### 4a: BC-to-BC Event Contracts

For each BC-to-BC integration:
1. Define consumer expectations (what the downstream needs)
2. Define provider capabilities (what the upstream provides)
3. Choose contract format:
   - REST → Pact (HTTP interactions)
   - Events → Pact (message interactions)
   - gRPC → Protobuf compatibility checks
   - GraphQL → schema compatibility
4. Define Pact-to-MSW bridge for frontend integration tests

#### 4b: Frontend→Backend REST Contracts (MANDATORY)

**For each endpoint in `frontend-architecture.yaml` `actor_views[].data_source.endpoint` and `submit_action.endpoint`:**

1. Define the **consumer contract** (what the frontend expects):
   - Full URL including query parameters (e.g., `GET /api/orders?status=active`)
   - Expected response shape (from `response_dto`)
   - Expected HTTP status codes (200 for success, 400/404/500 for errors)
   - Expected `Content-Type: application/json` header
   - Expected error response shape

2. Define the **provider verification** (what the backend must deliver):
   - Controller route matches the contract path exactly
   - Query parameter handling: `enum_literal` params use `Enum.valueOf()`, `semantic_filter` params have dedicated handling logic
   - Response DTO field names match the contract (watch for Jackson serialization quirks: `boolean isX` → `"x"`, record fields vs getter names)
   - Error responses include structured JSON (not HTML or plain text)

3. **Cross-layer type alignment check** (MANDATORY for each endpoint):

```yaml
frontend_backend_contracts:
  - endpoint: "GET /api/orders?status=active"
    consumer: "WaiterOrdersPage → orderApi.getOrders('active')"
    provider: "OrderController.getOrders(@RequestParam status)"
    query_params:
      - name: "status"
        consumer_sends: "active"
        provider_expects: "semantic_filter — controller has if('active'.equalsIgnoreCase(status)) branch"
        enum_mapping: "active → findByStatusNot(COMPLETED)"
    response:
      consumer_type: "Order[]"                 # TypeScript
      provider_type: "List<OrderResponse>"     # Java
      field_mapping:
        - { frontend: "orderId", backend: "orderId", type: "string/UUID" }
        - { frontend: "status", backend: "status", type: "string/OrderStatus.name()" }
        - { frontend: "totalAmount", backend: "totalAmount", type: "number/int (THB)" }
        - { frontend: "placedAt", backend: "placedAt", type: "string/LocalDateTime (ISO-8601)" }
    error_contract:
      consumer_handles: "axios interceptor rejects non-JSON, ErrorState component renders"
      provider_returns: "{ message: string } on 400, Spring default on 500"
```

**CRITICAL**: If ANY query parameter value is NOT a direct enum member, it MUST be documented as `semantic_filter` here. This is the single source of truth that Phase 8 uses to implement controller branching logic.

### Step 5: Implementation Guidance (Outside-In TDD)

For each vertical slice (in priority order), follow the **Outside-In Double Loop** (GOOS):

**MANDATORY: Test-First. No production code without a failing test.**

#### Outer Loop: BDD Acceptance Test
1. Pick a Gherkin scenario from the feature files
2. Write the acceptance test (step definitions) — it will be **RED** (components don't exist yet)
3. This RED acceptance test drives the inner loop

#### Inner Loop: TDD per Clean Architecture Layer

Work **outside-in** through layers. For each component needed to make the acceptance test pass:

| Step | Layer | TDD Cycle | What You Test |
|---|---|---|---|
| 1 | **Entities** | RED→GREEN→REFACTOR | Aggregate commands, VO validation, Specifications, DDD Policies |
| 2 | **Use Cases** | RED→GREEN→REFACTOR | Application services (mock driven ports), ES Policy event handlers |
| 3 | **Interface Adapters** | RED→GREEN→REFACTOR | Controllers (MockMvc), Repository implementations (DB), Saga state |
| 4 | **Frameworks** | Wire up real infrastructure | Configuration, messaging, DB migrations |

After all inner loop components are GREEN → run acceptance test → should now be **GREEN**.

#### Refactor checkpoint:
- Apply refactoring catalog, check for code smells
- Verify no domain logic leaked to application/infrastructure layers
- Verify Specification and Policy objects are in the domain layer

**Apply XP practices:**
- Simple Design (YAGNI)
- Continuous Integration
- Ten-minute build target
- Incremental design

**Security implementation:**
- Input validation in Value Objects (DDD natural fit)
- Authentication in Interface Adapters layer
- Authorization checks in Use Cases
- SAST/SCA configuration for pipeline

### Step 6: Write Implementation Artifacts

Generate the actual code structure (or detailed specs for code generation):

For each BC, produce:
- Directory structure following Clean Architecture
- Entity/VO/Aggregate code (or detailed specs)
- Use case interfaces (driving ports)
- Repository interfaces (driven ports)
- Gherkin feature files
- Contract test definitions
- Test strategy documentation

## Output

### `.arch/04-specification/features/*.feature`
Gherkin feature files, one per aggregate/use case.

### `.arch/04-specification/test-strategy.yaml`
Test strategy shape and layer configuration per BC.

### `.arch/04-specification/threat-model.yaml`
```yaml
threat_models:
  - bounded_context: "CheckIn"
    trust_boundaries: [...]
    threats:
      - component: "CheckIn API"
        stride_category: "spoofing"
        threat: "Unauthenticated check-in request"
        risk: "high"
        mitigation: "OAuth 2.0 via Cognito, JWT validation"
    auth_strategy:
      authentication: "OAuth 2.0 + OIDC (Cognito)"
      authorization: "RBAC (guest, staff, admin)"
```

### `.arch/04-specification/contracts/*.yaml`
Contract definitions per BC pair (BC-to-BC event contracts).

### `.arch/04-specification/contracts/frontend-backend.yaml`
Frontend→Backend REST contracts with cross-layer type alignment. One entry per endpoint in `frontend-architecture.yaml`.
```yaml
frontend_backend_contracts:
  - endpoint: "GET /api/orders?status=active"
    consumer: "WaiterOrdersPage → orderApi.getOrders('active')"
    provider: "OrderController.getOrders(@RequestParam status)"
    query_params:
      - name: "status"
        type: "semantic_filter"
        consumer_sends: "active"
        provider_handling: "if('active'.equalsIgnoreCase(status)) → findByStatusNot(COMPLETED)"
    response_field_mapping:
      - { frontend: "orderId", backend: "orderId", serialization: "UUID.toString()" }
      - { frontend: "totalAmount", backend: "totalAmount", serialization: "int (THB, not satang)" }
      - { frontend: "placedAt", backend: "placedAt", serialization: "ISO-8601 string" }
```

### `.arch/04-specification/implementation-guide.yaml`
```yaml
implementation_order:
  - slice: "Slice 1: Identity Verification → Room Assignment"
    steps:
      - layer: "entities"
        components: [CheckIn, GuestIdentity, RoomAssignment]
        tests: [CheckInTest, GuestIdentityTest]
      - layer: "use_cases"
        components: [CheckInUseCase]
        tests: [CheckInUseCaseTest]
      - layer: "adapters"
        components: [CheckInController, ReservationGateway]
        tests: [CheckInControllerTest]
```

### `.arch/glossary.yaml`
Updated if new terms discovered during specification.

## Completion

```
## Phase 4: Specification & Implementation Complete

### BDD Specifications
- [N] feature files with [M] scenarios across [K] BCs
- [Q] unresolved questions (fed back to discovery)

### Test Strategy
| BC | Shape | Unit | Integration | E2E |
|---|---|---|---|---|
| CheckIn | Trophy | 15 | 25 (thickest) | 3 CUJs |

### Security
- [N] threats identified across [K] BCs
- Auth: [strategy]
- [M] mitigations defined

### Contracts
- [N] contract definitions across [M] BC pairs

### Implementation Guide
- [S] vertical slices ordered for implementation
- Clean Architecture structure defined per BC

Quality gate: checking for anti-patterns...
```

$ARGUMENTS
