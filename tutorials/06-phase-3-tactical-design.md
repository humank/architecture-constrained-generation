# Chapter 6: Phase 3 — Tactical Design

![Colorful building blocks — assembling tactical design components](https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=1200&h=400&fit=crop&q=80)

*Photo by [Unsplash](https://unsplash.com) — Free to use under [Unsplash License](https://unsplash.com/license)*

> *"The model is the code, and the code is the model."* — Eric Evans
>
> Phase 3 is where domain knowledge becomes executable structure.

---

## The Richest Phase

Phase 3 is the longest and most detailed phase in the ACG pipeline. It produces the artifacts that most directly constrain code generation:

1. **Aggregate Design** — Vernon's Four Rules applied to every aggregate
2. **Policy & Specification Design** — Three distinct "policy" concepts disambiguated
3. **Domain Model Refinement** — Supple Design principles
4. **Clean Architecture Structure** — Layers, ports, adapters per BC
5. **Resilience Design** — Circuit breakers, retries, fallbacks
6. **API Contract** — Task-based (not CRUD!) endpoints derived from DDD
7. **Actor View Design** — Frontend pages driven by domain model
8. **Java 21 Type Annotations** — Records, sealed interfaces, behavior-on-enum

---

## Vernon's Four Rules

Every aggregate is designed following Vaughn Vernon's rules from *Implementing DDD*:

| Rule | What It Means | Why It Matters |
|---|---|---|
| **1. Model True Invariants** | Only group things that MUST be consistent atomically | Defines the transaction boundary |
| **2. Design Small Aggregates** | ~70% should be root + value objects only | Reduces contention, improves performance |
| **3. Reference by Identity** | Use IDs, not object references, across aggregates | Enables distribution and caching |
| **4. Eventual Consistency** | Cross-aggregate coordination via domain events | Decouples aggregates, enables scaling |

### Example: Order Aggregate

```
┌─────────────────────────────────────────────┐
│  Order Aggregate (consistency boundary)      │
│                                             │
│  🔑 Order (Root Entity)                     │
│     ├── UUID id                             │
│     ├── TableNumber (Value Object, 1-5)     │
│     ├── OrderType (Behavior Enum)           │
│     ├── OrderStatus (Enum)                  │
│     ├── Money totalAmount (Value Object)    │
│     ├── Money cashPaid (Value Object)       │
│     └── List<OrderItem> items               │
│            ├── CoffeeType                   │
│            ├── CupSize                      │
│            ├── FoamLevel                    │
│            ├── CappuccinoStyle              │
│            └── MilkType                     │
│                                             │
│  Invariants:                                │
│  • Must have ≥ 1 item                       │
│  • Status transitions follow state machine  │
│  • Payment amount ≥ total price             │
│  • Table number 1-5                         │
└─────────────────────────────────────────────┘

  Outside (referenced by ID only):
  ├── Coffee aggregate → coffeeId: UUID
  └── Table aggregate → tableNumber: int
```

---

## The Three Kinds of "Policy"

Phase 3 carefully disambiguates three concepts that share the word "policy":

| Concept | Source | What It Is | Implementation |
|---|---|---|---|
| **DDD Specification** | Evans Ch.9 | Composable predicate — `isSatisfiedBy(T)` | Domain layer: `Specification<T>` |
| **DDD Policy** | Evans Ch.12 | Strategy pattern — varying business logic | Domain layer: Strategy interface |
| **ES Policy** | Brandolini (🟣 sticky) | Reactive automation — "when X, do Y" | Application layer: Event handler |

This distinction prevents a common confusion where developers mix reactive event handlers with domain predicates.

---

## API Contract: Task-Based, Not CRUD

**This is one of ACG's most important design decisions.**

Traditional API design produces CRUD endpoints:
```
GET    /orders
POST   /orders
PUT    /orders/{id}
DELETE /orders/{id}
```

ACG produces **task-based** endpoints derived from aggregate commands:
```
POST   /api/waiter/orders              → PlaceOrder command
POST   /api/cashier/orders/{id}/confirm → ConfirmOrder command
POST   /api/cashier/orders/{id}/pay     → RecordPayment command
POST   /api/waiter/orders/{id}/deliver  → DeliverOrder command
GET    /api/waiter/orders               → OrderSummaryView read model
GET    /api/barista/preparations        → PreparationQueueView read model
```

### Why Task-Based?

1. **One endpoint = one command** — no ambiguous PUT that could mean 10 different things
2. **Actor-scoped** — different actors see different endpoints, different projections
3. **Anti-Corruption Layer** — Request/Response DTOs are NOT domain objects
4. **BC boundary respected** — each API group belongs to one BC
5. **Ubiquitous Language** — endpoint paths use glossary terms

---

## Actor View Design

For each actor, Phase 3 designs the complete page structure:

```yaml
actor_views:
  - actor: "waiter"
    page: "WaiterOrderPage"
    route: "/waiter"
    data_sources:
      - hook: "useOrders"
        query_endpoint: "GET /api/waiter/orders"
        loading_state: "Skeleton loader matching table structure"
        error_state: "Error banner: '無法連線至訂單服務' + retry button"
        empty_state: "Empty illustration: '目前沒有進行中的訂單'"
    sections:
      - name: "OrderForm"
        type: "form"
        submit_action:
          command_endpoint: "POST /api/waiter/orders"
          on_success: "invalidate useOrders + show confirmation"
          on_error: "show error toast with service name"
      - name: "ActiveOrdersTable"
        type: "data-table"
        data_source: "useOrders"
        row_actions:
          - label: "Deliver"
            visible_when: "status == READY"
```

Every page defines **three states**: loading, error, and success. No page may only handle the happy path — this is enforced by quality gates.

---

## Frontend Data Flow

```
Actor View → TanStack Query hook → API Client → Backend API → Driving Port → Application Service → Aggregate
                                                                                                       │
Actor View ← TanStack Query cache ← API Client ← Backend API ← Read Model Projection ← Domain Events ←┘
```

- **Server state**: TanStack Query (one `useQuery` per read model, one `useMutation` per command)
- **Client state**: Zustand (UI-only: selected role, toasts, form drafts)
- **Complex flows**: XState (optional, only for multi-step wizards)

---

## Java 21 Type Design Annotations

Phase 3 annotates each aggregate with Java 21 implementation hints:

```yaml
java21_type_design:
  value_objects_as_records:
    - name: Money
      invariant: "amount >= 0"
    - name: TableNumber
      invariant: "1 <= value <= 5"
  events_as_records:
    - OrderPlaced
    - OrderConfirmed
  sealed_hierarchies:
    - name: OrderCommand
      permits: [PlaceOrder, ConfirmOrder, RecordPayment, DeliverOrder, CompleteOrder]
  behavior_enums:
    - name: OrderType
      values: [DINE_IN, TAKE_AWAY]
      behavior: "servingTemperatureCelsius: DINE_IN=70, TAKE_AWAY=90"
```

These annotations tell Phase 8 exactly which Java 21 features to use for each domain concept.

---

## Output Artifacts

```
.arch/03-tactical/
├── aggregates/
│   ├── Order.yaml
│   ├── Coffee.yaml
│   └── MaterialStock.yaml
├── domain-model/
│   ├── Ordering.yaml          # Clean Architecture layers, ports, sagas
│   ├── Preparation.yaml
│   └── Inventory.yaml
└── frontend-architecture.yaml  # API contract, actor views, components, state
```

---

[← Previous: Phase 2 — Strategic Design](./05-phase-2-strategic-design.md) | [Table of Contents](./README.md) | [Next: Phase 3c — UX Design →](./07-phase-3c-ux-design.md)
