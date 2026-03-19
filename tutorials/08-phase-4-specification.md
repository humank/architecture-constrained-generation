# Chapter 8: Phase 4 — Specification

![Hand marking off items on a checklist — executable specifications](https://images.unsplash.com/photo-1754548930574-6a995e5eb5a7?w=1200&h=400&fit=crop&q=80)

*Photo by [Unsplash](https://unsplash.com) — Free to use under [Unsplash License](https://unsplash.com/license)*

> *"BDD is not about testing. It's about having conversations that produce shared understanding, which we then automate."* — Seb Rose

---

## From Design to Executable Specification

Phase 4 transforms the domain model into executable specifications. It combines five disciplines:

1. **BDD** — Gherkin scenarios from Event Model GWT specs
2. **Test Strategy** — Choosing the right test shape per BC
3. **Threat Modeling** — STRIDE analysis per BC
4. **Contract Testing** — Consumer-driven contracts per integration
5. **Implementation Guidance** — Outside-In Double Loop plan

---

## BDD: The Three Amigos (Simulated)

For each aggregate and vertical slice, ACG simulates the Three Amigos perspectives:

| Role | Perspective | Question |
|---|---|---|
| **Business** | "What value does this deliver?" | Why this scenario matters |
| **Development** | "How will this be implemented?" | Technical feasibility |
| **Testing** | "How do we know it works? What can go wrong?" | Edge cases, error paths |

### Example Mapping → Gherkin

Each business rule gets concrete examples that become scenarios:

```gherkin
Feature: Order Payment
  As counter staff I want to process cash payment
  So that orders can be submitted to the barista

  Rule: Cash amount must be sufficient to cover the order total

    Scenario: Successful payment with exact amount
      Given an order "ORD-001" with 2 Latte Tall at $120 each
      And the order is in CONFIRMED status
      And the total is $240
      When counter staff processes payment of $240
      Then the order status should be PAID
      And the change amount should be $0
      And a PaymentReceived event should be published

    Scenario: Payment with change
      Given an order "ORD-002" with total $240
      And the order is in CONFIRMED status
      When counter staff processes payment of $300
      Then the change amount should be $60

    Scenario: Insufficient payment rejected
      Given an order "ORD-003" with total $240
      And the order is in CONFIRMED status
      When counter staff processes payment of $200
      Then the payment should be rejected with reason "insufficient cash"
      And the order status should remain CONFIRMED
```

**Critical**: Test values use **exact prices from the requirements** ($120 for Latte Tall), not invented numbers.

### Frontend Resilience Scenarios (Mandatory)

```gherkin
Feature: Frontend Resilience
  Rule: Pages show actionable error messages when backend is down

    Scenario: Waiter page shows error when ordering service unavailable
      Given the ordering service is not running
      When the waiter navigates to the order page
      Then the page should display "無法連線至訂單服務"
      And the page should show a retry button

    Scenario: Payment fails when payment service is down
      Given the payment service is not running
      When the cashier attempts to process payment
      Then an error message should appear identifying the payment service
      And the order status should remain unchanged
```

These scenarios become **acceptance tests** in Phase 8. Every `useMutation` without `onError` is a failing test.

---

## Test Strategy Shapes

ACG doesn't use one-size-fits-all testing. Each BC gets the test shape that fits:

```
Test Pyramid          Testing Trophy         Testing Honeycomb
(domain-heavy BC)     (UI-heavy BC)          (microservice BC)

    /\                    /\                      /\
   /E2E\                /E2E\                   /E2E\
  /──────\             /──────\                /──────\
 /Integr. \          /Integration\            /Integration\
/───────────\       /──── (thickest)──\      /──── (thickest)──\
/    Unit     \    /      Unit        \    /      Unit          \
/───────────────\ /────────────────────\  /──────────────────────\

   ~70% unit        ~50% integration       ~60% integration
   ~20% integ.      ~30% unit              ~20% unit
   ~10% E2E         ~10% E2E               ~10% E2E
```

### Per-DDD-Concept Test Mapping

| DDD Concept | Test Layer | What to Test |
|---|---|---|
| Aggregate (commands) | Unit | State transitions, invariants, events |
| Value Object | Unit | Construction invariants, equality, behavior |
| DDD Specification | Unit | `isSatisfiedBy()` with AND/OR/NOT |
| DDD Policy (Strategy) | Unit | Each variant returns correct result |
| ES Policy (event handler) | Integration | Event triggers correct command |
| Saga/Process Manager | Integration | Multi-step flow, compensations |
| Repository | Integration | Save/load roundtrip, queries |
| API endpoint | Integration | HTTP request → response, error codes |
| Page error state | Integration | `isError` renders error message |
| Vertical slice (BDD) | Acceptance | Full user journey |
| BC-to-BC contract | Contract | Schema compatibility |

---

![Magnifying glass examining details — security threat analysis](https://images.unsplash.com/photo-1568495341369-1066472c7a27?w=1200&h=400&fit=crop&q=80)

## STRIDE Threat Modeling

For each BC crossing a trust boundary:

| Threat | Question | Coffeeshop Example |
|---|---|---|
| **S**poofing | Can someone pretend to be this actor? | Fake waiter placing orders |
| **T**ampering | Can data be modified in transit? | Order total manipulated |
| **R**epudiation | Can someone deny an action? | Cashier denies receiving cash |
| **I**nformation Disclosure | Can data leak? | Customer order history exposed |
| **D**enial of Service | Can the system be overwhelmed? | Flood of fake orders |
| **E**levation of Privilege | Can someone gain unauthorized access? | Waiter accessing inventory management |

Each threat gets a mitigation mapped to the architecture:
- Input validation → Value Objects (DDD natural fit!)
- Authentication → Interface Adapters layer
- Authorization → Use Cases layer
- Encryption → Infrastructure layer

---

## The Outside-In Double Loop

Phase 4 defines the implementation approach for Phase 8:

```
┌─────────────────────────────────┐
│  BDD Outer Loop                 │
│  (Acceptance Test — RED)        │
│                                 │
│   ┌─────────────────────────┐   │
│   │  TDD Inner Loop         │   │
│   │  1. Entities layer      │   │
│   │  2. Use Cases layer     │   │
│   │  3. Interface Adapters  │   │
│   │  4. Frameworks          │   │
│   │  (Red → Green → Refactor│   │
│   │   for each)             │   │
│   └─────────────────────────┘   │
│                                 │
│  (Acceptance Test — GREEN)      │
└─────────────────────────────────┘
```

Work **outside-in** through Clean Architecture layers until the acceptance test passes.

---

## Output Artifacts

```
.arch/04-specification/
├── features/
│   ├── ordering.feature
│   ├── preparation.feature
│   ├── inventory.feature
│   └── frontend-resilience.feature
├── test-strategy.yaml
├── threat-model.yaml
├── contracts/
│   ├── ordering-to-preparation.yaml
│   └── preparation-to-inventory.yaml
└── implementation-guide.yaml
```

---

[← Previous: Phase 3c — UX Design](./07-phase-3c-ux-design.md) | [Table of Contents](./README.md) | [Next: Phase 5 — Delivery →](./09-phase-5-delivery.md)
