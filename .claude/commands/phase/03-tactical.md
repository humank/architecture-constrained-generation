---
description: "Phase 3: Tactical Design — Aggregates, Domain Model, Clean Architecture, Frontend Architecture"
id: 03-tactical
ordinal: 5
step: all
gate: human
consumes:
  - .arch/02-strategic/bounded-contexts.yaml
  - .arch/01-discovery/event-storm.yaml
  - .arch/01-discovery/domain-stories/
produces:
  - .arch/03-tactical/aggregates/
  - .arch/03-tactical/domain-model/
  - .arch/03-tactical/frontend-architecture.yaml
sensors: [files-exist, actor-view-sourced-from-dst, cl-contract-declared, ephemeral-not-persisted]
advisory_sensors: [god-aggregate]
---

# Phase 3: Tactical Design

You are a DDD tactical design expert. You design aggregates following Vernon's rules, refine the domain model using Supple Design principles, apply Clean Architecture structure, and design the frontend architecture per bounded context.

## Knowledge Base

Read these files:
- knowledge-base/ddd/02-building-blocks.md
- knowledge-base/ddd/03-refactoring-deeper-insight.md
- knowledge-base/ooad/01-ooad-complete.md
- knowledge-base/ooad/02-rich-domain-model-principles.md
- knowledge-base/clean-architecture/01-clean-architecture-complete.md
- knowledge-base/microservice-patterns/02-data-patterns.md
- knowledge-base/microservice-patterns/03-resilience-patterns.md
- knowledge-base/frontend-architecture/01-component-architecture.md
- knowledge-base/frontend-architecture/02-state-and-data.md
- knowledge-base/frontend-architecture/03-micro-frontends.md

Read artifact schemas:
- artifact-schemas/aggregate.schema.yaml

## Input

Read from previous phases:
- `.arch/01-discovery/event-storm.yaml`
- `.arch/01-discovery/event-model.yaml`
- `.arch/02-strategic/bounded-contexts.yaml`
- `.arch/02-strategic/context-map.yaml`
- `.arch/assessment-2.md` — Architecture style (modulith/microservices) affects resilience and saga design
- `.arch/glossary.yaml`

## Process

### Step 1: Aggregate Design (per BC)

For each aggregate identified in event storming:

**Apply Vernon's Four Rules:**
1. **Model true invariants in consistency boundaries** — What business rules MUST be enforced atomically?
2. **Design small aggregates** — ~70% should be root entity + value objects only. If >5 entities, it's probably too big.
3. **Reference other aggregates by identity** — Use ID references, not object references.
4. **Use eventual consistency outside the boundary** — Cross-aggregate coordination via domain events.

**For each aggregate, define:**
- Root entity (with identity type)
- Value Objects (with invariants/validation rules) — mark as **record candidates** (immutable, structural equality)
- Internal entities (if any, with their identity)
- Commands: name, input data, preconditions, postconditions, events produced, error cases — mark as **sealed ADT candidates** (closed set of commands per aggregate)
- Domain Events: name, fields — mark as **record candidates** (immutable facts) and **sealed hierarchy candidates** (closed set of events per BC)
- Invariants: preconditions, postconditions, class invariants
- Specifications: composable rule objects (AND/OR/NOT)
- **Domain concept enums**: Identify all String-typed fields that represent a closed set of domain values. These MUST be modeled as enums, NOT raw Strings. If an enum encodes domain knowledge (e.g., serving temperature varies by order type, milk-to-foam ratio varies by cappuccino style), annotate it as a **behavior-on-enum** candidate.

**Map from Event Model command specs:**
- Each command's Given-When-Then maps to:
  - Given → preconditions (aggregate state)
  - When → command handler
  - Then → events produced + state change

### Step 2: Data Pattern Selection (per Aggregate)

Choose data pattern based on requirements:

| Pattern | When to Use |
|---|---|
| Traditional (CRUD) | Simple state, no audit trail needed, low complexity |
| CQRS | Different read/write models needed, complex queries |
| Event Sourcing | Full audit trail needed, temporal queries, undo capability |
| CQRS + ES | Complex domain + audit trail + separate read optimization |

For each choice, specify:
- Write store technology (DynamoDB, Aurora, etc.)
- Read store technology (if CQRS)
- Event store design (if ES): stream per aggregate, snapshot frequency
- Projection strategy (if CQRS/ES)

### Step 3: Saga/Process Manager Design

For cross-aggregate workflows identified in event model automations:

1. Choose: **Choreography** (event-driven, no coordinator) vs **Orchestration** (central coordinator)
   - **If Modular Monolith**: Choreography via in-process events is usually sufficient (simpler, no distributed state)
   - **If Microservices**: Evaluate carefully — Choreography works for simple flows (≤3 steps), Orchestration recommended for complex flows (>3 steps or compensations needed)
2. Define compensating transactions for each step
3. Identify the pivot transaction (point of no return)
4. Define idempotency strategy
   - **If Microservices**: Every command that crosses service boundaries MUST be idempotent (include idempotency key in command/event schema)

### Step 4: Policy & Specification Design

**IMPORTANT**: Three distinct concepts share the word "policy" — they are NOT the same thing:

| Concept | Source | What It Is | Implementation Target |
|---|---|---|---|
| **DDD Specification** | Evans Ch.9 | Composable predicate — `isSatisfiedBy(T)` with AND/OR/NOT | Domain layer: `Specification<T>` interface |
| **DDD Policy** | Evans Ch.12 | Strategy pattern — varying business logic with swappable implementations | Domain layer: Strategy interface + implementations |
| **ES Policy** | Brandolini (purple sticky) | Reactive automation — "when X happens, do Y" | Application layer: Event handler or Saga step |

#### 4a: Classify Event Storming Policies

For each purple sticky (policy/automation) from `event-storm.yaml`:

1. **Simple policy** (event → single command): Maps to an **event handler** in the application layer
   - Example: "When OrderPaid, start preparation" → `OrderPaidHandler` calls `PreparationService.startPreparation()`
2. **Conditional policy** (event → evaluate condition → command): Maps to **Specification + event handler**
   - Example: "When OrderPlaced, if table available, assign table" → `TableAvailabilitySpec.isSatisfiedBy(table)` inside handler
3. **Multi-step policy** (event → orchestrated workflow): Maps to a **Saga** (already designed in Step 3)
   - Example: "When OrderPaid, prepare items, then deliver, then complete" → `OrderFulfillmentSaga`

#### 4b: Design DDD Specification Objects

For each complex business rule or invariant that is:
- Queried in multiple places, OR
- Composed with other rules (AND/OR/NOT), OR
- Needs to be tested independently

Design a **Specification** (Evans Ch.9):
- Name: `{BusinessConcept}Specification` (e.g., `TableAvailabilitySpecification`)
- Input type: The object being evaluated
- Predicate logic: The boolean condition
- Composability: Which Specifications combine (AND/OR/NOT)

#### 4c: Design DDD Policy Objects (Strategy Pattern)

For each place where business logic **varies by context** (e.g., different pricing rules, different preparation methods):

Design a **Policy** (Strategy pattern, Evans Ch.12):
- Interface name: `{BusinessConcept}Policy` (e.g., `PricingPolicy`, `PreparationPolicy`)
- Method signature: What it calculates/decides
- Implementations: One per variant (e.g., `DineInPricingPolicy`, `TakeAwayPricingPolicy`)
- Selection mechanism: How the correct implementation is chosen at runtime (enum-based, config-based, etc.)

#### 4d: Output Schema

Document in aggregate YAML files:
```yaml
specifications:
  - name: "TableAvailabilitySpecification"
    evaluates: "Table"
    rule: "table.status == AVAILABLE && table.capacity >= party.size"
    composed_with: ["TimeSlotSpecification"]  # AND composition
policies:
  - name: "PricingPolicy"
    type: "strategy"
    method: "Money calculatePrice(Order order)"
    implementations:
      - name: "DineInPricingPolicy"
        selection: "order.type == DINE_IN"
      - name: "TakeAwayPricingPolicy"
        selection: "order.type == TAKE_AWAY"
es_policy_mappings:
  - es_policy: "Start preparation when paid"
    classification: "simple"
    trigger_event: "OrderPaid"
    handler: "OrderPaidHandler"
    target_command: "StartPreparation"
```

### Step 5: Domain Model Refinement

**Apply Supple Design principles:**
- **Intention-Revealing Interfaces**: Method names express what, not how
- **Side-Effect-Free Functions**: Separate queries from commands (CQS)
- **Assertions**: Explicit pre/post-conditions
- **Conceptual Contours**: Align object boundaries with domain concepts
- **Standalone Classes**: Minimize coupling
- **Closure of Operations**: Operations return same type

**Make implicit explicit:**
- Extract constraints as Specification objects (designed in Step 4b)
- Model processes as domain objects
- Identify policies as Strategy interfaces (designed in Step 4c)
- **Identify closed type hierarchies**: If a domain concept has a fixed set of variants (e.g., all commands for an aggregate, all events in a BC), mark it as a **sealed interface** candidate. This enforces BC boundaries at the type level and enables exhaustive pattern matching during implementation.

**Apply OOAD quality checks:**
- SOLID principles compliance
- GRASP responsibility assignment (Information Expert, Creator, Controller, etc.)
- GoF patterns where domain-relevant (Strategy, Composite, Observer, etc.)

### Step 6: Clean Architecture Structure

For each BC, define:

**Layers:**
- **Entities (innermost)**: Aggregates, entities, VOs, domain services, specifications
- **Use Cases**: Application services (one per use case / command handler)
- **Interface Adapters**: Controllers, presenters, gateways, repositories (implementations)
- **Frameworks & Drivers (outermost)**: DB, web framework, messaging, external APIs

**Ports (interfaces):**
- **Driving ports**: Use case interfaces (called by controllers)
- **Driven ports**: Repository interfaces, external service interfaces (implemented by adapters)

**Dependency Rule**: All dependencies point inward. Inner layers know nothing about outer layers.

### Step 7: Resilience Design

For each driven port (external dependency):
- Define Circuit Breaker configuration (failure threshold, timeout, half-open trials)
- Define Retry strategy (max retries, backoff type, jitter)
- Define Timeout budget
- Define Fallback behavior (cached data, default value, degraded mode)

**If Microservices** (from assessment-2), additionally:
- Define **Bulkhead isolation** per service dependency (thread pool or semaphore, max concurrent calls)
- Define **Rate limiting** per caller/API (requests/second, burst allowance)
- Define **Backpressure strategy** for async consumers (prefetch limit, consumer concurrency)
- Define **Health check endpoints**: liveness (is process alive?), readiness (can it serve traffic?), startup (is initialization done?)
- Define **Graceful shutdown** behavior (drain in-flight requests, stop accepting new ones)

### Step 8: Application API Contract & Frontend Architecture

**This step designs the driving side of the Hexagonal Architecture** — how external actors (humans via UI, external systems via API) interact with the application. The API contract is derived entirely from DDD artifacts (commands, read models, driving ports), NOT invented as CRUD endpoints.

#### 8a: Application API Contract (per BC)

**Source artifacts:**
- Aggregate commands (Step 1) → task-based command endpoints
- Read models from `event-model.yaml` (Phase 1) → query endpoints (projections, NOT aggregate state)
- Driving ports (Step 6) → application service boundary
- Actor roles from `event-storm.yaml` / `parsed-requirements.yaml` → endpoint grouping

**Design principles (DDD-aligned):**
- **Task-based, NOT CRUD**: Each endpoint represents one domain command or one read model query. No generic PUT/PATCH on entities.
- **Actor-scoped**: Endpoints grouped by actor role. Different actors see different projections and can trigger different commands — even on the same aggregate.
- **Anti-Corruption Layer**: Request/Response DTOs are NOT domain objects. They translate between the outside world and the domain. Aggregate internals are never exposed.
- **BC boundary respected**: Each API group belongs to one BC. Frontend features call ONE BC's API. Cross-BC data coordination is handled by the backend (events/sagas), never by the frontend calling multiple BC APIs directly.
- **Ubiquitous Language**: Endpoint paths, DTO field names, and enum values all use glossary terms.

**For each BC that has actor-facing UI or external API:**

1. **Command endpoints** — one per aggregate command:
   - Map each command from `aggregates/*.yaml` to a POST endpoint
   - Path: `/{actor-role}/{aggregate-plural}` or `/{actor-role}/{aggregate-plural}/{id}/{command-verb}`
   - Request DTO: fields from command input (NOT the full aggregate)
   - Response DTO: minimal confirmation (created ID, new status) — NOT the full aggregate state
   - Actor: which role(s) can invoke this command

2. **Query endpoints** — one per read model:
   - Map each read model from `event-model.yaml` to a GET endpoint
   - Path: `/{actor-role}/{read-model-name}` or `/{actor-role}/{aggregate-plural}`
   - Response DTO: the read model projection fields (derived from `given_events` → projected fields)
   - These are **projections designed for the UI**, not raw aggregate state dumps

3. **Output — API contract per BC:**

```yaml
api_contract:
  base_path: "/api"
  bounded_context: "Ordering"

  command_endpoints:
    - command: "PlaceOrder"                    # from aggregates/Order.yaml
      aggregate: "Order"
      method: "POST"
      path: "/waiter/orders"
      actor: "waiter"
      request_dto:
        name: "PlaceOrderRequest"
        fields:
          - name: "tableNumber"
            type: "int"
            source: "TableNumber VO"
          - name: "orderType"
            type: "OrderType"                  # domain enum, not String
            source: "glossary"
          - name: "items"
            type: "List<OrderItemRequest>"
            source: "PlaceOrder command input"
        nested_dtos:
          - name: "OrderItemRequest"
            fields:
              - { name: "coffeeType", type: "CoffeeType" }
              - { name: "cupSize", type: "CupSize" }
              - { name: "quantity", type: "int" }
      response_dto:
        name: "PlaceOrderResponse"
        fields:
          - { name: "orderId", type: "UUID" }
          - { name: "status", type: "OrderStatus" }
          - { name: "totalCents", type: "int" }

    - command: "ConfirmOrder"
      aggregate: "Order"
      method: "POST"
      path: "/cashier/orders/{orderId}/confirm"
      actor: "cashier"
      request_dto:
        name: "ConfirmOrderRequest"
        fields: []                             # no additional input needed
      response_dto:
        name: "OrderStatusResponse"
        fields:
          - { name: "orderId", type: "UUID" }
          - { name: "status", type: "OrderStatus" }

  query_endpoints:
    - read_model: "OrderSummaryView"           # from event-model.yaml
      method: "GET"
      path: "/waiter/orders"
      actor: "waiter"
      description: "Active orders for waiter's view"
      query_params:                            # MANDATORY for every query endpoint with parameters
        - name: "status"
          type: "semantic_filter"              # NOT an enum literal — requires controller logic
          value: "active"
          semantics: "WHERE status NOT IN (COMPLETED)"  # domain-level meaning
          maps_to_enum: "OrderStatus"          # which enum this relates to
      response_dto:
        name: "List<OrderSummary>"
        fields:
          - { name: "orderId", type: "UUID" }
          - { name: "tableNumber", type: "int" }
          - { name: "status", type: "OrderStatus" }
          - { name: "items", type: "List<OrderItemSummary>" }
          - { name: "totalCents", type: "int" }
          - { name: "createdAt", type: "Instant" }
      given_events: ["OrderPlaced", "OrderConfirmed", "OrderCompleted"]

    - read_model: "PreparationQueueView"
      method: "GET"
      path: "/barista/preparations"
      actor: "barista"
      description: "Pending preparation items for barista's view"
      response_dto:
        name: "List<PreparationItem>"
        fields:
          - { name: "coffeeId", type: "UUID" }
          - { name: "orderId", type: "UUID" }
          - { name: "coffeeType", type: "CoffeeType" }
          - { name: "status", type: "PreparationStatus" }
      given_events: ["OrderSubmittedToBarista", "CoffeePrepared"]

  shared_enums:                                # domain enums shared between frontend and backend
    - { name: "OrderType", values: ["DINE_IN", "TAKE_AWAY"], source: "glossary" }
    - { name: "CoffeeType", values: ["ESPRESSO", "LATTE", "CAPPUCCINO"], source: "glossary" }
    - { name: "OrderStatus", values: ["PLACED", "CONFIRMED", "PAID", "PREPARING", "READY", "DELIVERED", "COMPLETED"], source: "Order state machine" }
```

**DDD quality check for API contract:**
- [ ] Every endpoint maps to exactly one aggregate command or one read model — no "update entity" endpoints
- [ ] No endpoint exposes aggregate internals (child entity IDs, internal state, invariant details)
- [ ] Request DTOs contain ONLY what the command needs — no extra fields "for convenience"
- [ ] Response DTOs for queries are read model projections, not serialized aggregates
- [ ] **Aggregated read models are clearly marked**: If a `response_dto` contains computed fields (sum, count, average, group-by), annotate it as `projection_type: aggregated` so Phase 8 knows the backend MUST compute these — not dump raw records. Example: `SalesReportResponse{weeklyTotal, monthlyTotal}` is aggregated from `OrderCompleted` events, not a list of raw orders.
- [ ] **Response shape is explicit**: `response_dto.name` clearly indicates object vs list (e.g., `SalesReportResponse` = single object, `List<OrderSummary>` = array). Phase 8 backend MUST return this exact shape.
- [ ] Enum values match glossary exactly
- [ ] Cross-BC data needs are served by backend projections, not by frontend calling multiple BCs
- [ ] **Endpoint paths are canonical**: The paths defined here are the single source of truth. Phase 8 backend `@GetMapping`/`@PostMapping`, frontend Vite proxy, and frontend `api.ts` MUST all use these exact paths.

**Cross-Layer Type Contract (MANDATORY):**

Every value that crosses the frontend↔backend boundary must be explicitly typed in the API contract. The following are common sources of cross-layer drift — each MUST be addressed:

- [ ] **Query parameter semantics**: Every query endpoint with parameters MUST have a `query_params` section. Each parameter MUST be typed as one of:
  - `enum_literal` — value is a direct enum value (e.g., `?status=PLACED`). Backend can use `Enum.valueOf()` directly.
  - `semantic_filter` — value is a UI concept that maps to a domain query (e.g., `?status=active` → `WHERE status NOT IN (COMPLETED)`). Backend controller MUST have explicit handling logic — `Enum.valueOf()` will throw.
  - `free_text` — value is user input (e.g., `?q=latte`). Backend must sanitize.
- [ ] **Enum value casing**: Specify whether enum values are UPPER_CASE (Java convention) or PascalCase/camelCase (frontend convention). If different, the API contract MUST note the serialization format.
- [ ] **Money representation**: Specify unit (cents vs dollars) and type (int vs decimal). Frontend and backend MUST agree. Example: `totalAmount: int (THB, NOT satang)`.
- [ ] **DateTime format**: Specify serialization format (ISO-8601 string, epoch millis, etc.). Jackson defaults (`LocalDateTime` → array, `Instant` → epoch) may surprise frontend.
- [ ] **Null vs empty**: For collection fields, specify whether empty means `[]` or `null`. For optional fields, specify whether absent means `null` or omitted from JSON. Frontend code like `items.filter(...)` crashes on `null`.
- [ ] **Boolean serialization**: Java `boolean isActive` serializes as `{"active": true}` (Jackson drops `is` prefix). If a DTO has `boolean isX`, the API contract MUST note the serialized field name.
- [ ] **Pagination**: If any query endpoint returns paginated results, specify the envelope format (`{ content: [], totalPages, totalElements }` vs flat array). Frontend MUST know whether to expect a wrapper or raw array.
- [ ] **Error response format**: Specify the error JSON shape for 4xx/5xx responses (e.g., `{ message: string, code: string }` vs Spring Boot default `{ timestamp, status, error, path }`). Frontend error interceptor MUST parse this shape.

#### 8b: Actor View Design

**For each actor identified in requirements and event storming:**

Design the complete page structure. Each view is a composition of data (read model queries) and actions (commands).

```yaml
actor_views:
  - actor: "waiter"
    page: "WaiterOrderPage"
    description: "Waiter creates and tracks orders for their tables"
    route: "/waiter"
    data_sources:                               # → TanStack Query hooks (GET)
      - hook: "useOrders"
        query_endpoint: "GET /api/waiter/orders?status=active"  # MUST include full URL with query params
        read_model: "OrderSummaryView"
        query_params:                           # mirrors api_contract.query_endpoints[].query_params
          - { name: "status", value: "active", type: "semantic_filter" }
        refresh: "polling(5s)"                  # or "websocket" or "SSE"
        loading_state: "Skeleton loader matching table structure"
        error_state: "Error banner: '無法連線至訂單服務' + retry button"
        empty_state: "Empty illustration: '目前沒有進行中的訂單'"
    sections:
      - name: "OrderForm"
        type: "form"
        purpose: "Place a new order"
        fields:                                 # from PlaceOrder command input
          - { name: "tableNumber", input: "select", options: "1-5", from: "TableNumber VO" }
          - { name: "orderType", input: "radio", options: "OrderType enum" }
          - { name: "items", input: "dynamic-list", item_fields: ["coffeeType:select", "cupSize:select", "quantity:number"] }
        submit_action:
          hook: "usePlaceOrder"
          command_endpoint: "POST /api/waiter/orders"
          command: "PlaceOrder"
          on_success: "invalidate useOrders + show confirmation"
          on_error: "show error toast with service name + HTTP status"

      - name: "ActiveOrdersTable"
        type: "data-table"
        purpose: "Display current orders and their status"
        data_source: "useOrders"
        columns: ["tableNumber", "items (summary)", "status (badge)", "totalCents (formatted)"]
        row_actions:
          - label: "Deliver"
            command_endpoint: "POST /api/waiter/orders/{id}/deliver"
            command: "DeliverOrder"
            visible_when: "status == READY"
          - label: "Complete"
            command_endpoint: "POST /api/waiter/orders/{id}/complete"
            command: "CompleteOrder"
            visible_when: "status == DELIVERED"

  - actor: "barista"
    page: "BaristaPreparationPage"
    description: "Barista sees preparation queue and marks items done"
    route: "/barista"
    data_sources:
      - hook: "usePreparationQueue"
        query_endpoint: "GET /api/barista/preparations"
        read_model: "PreparationQueueView"
        refresh: "polling(3s)"
    sections:
      - name: "PreparationQueue"
        type: "card-grid"
        purpose: "Cards for each coffee being prepared"
        data_source: "usePreparationQueue"
        card_content: ["coffeeType", "cupSize", "specialInstructions"]
        card_actions:
          - label: "Mark Prepared"
            command_endpoint: "POST /api/barista/preparations/{id}/prepared"
            command: "MarkPrepared"
```

#### 8c: Component Architecture

- **Shared Design System** (atoms + molecules): Button, Input, Select, Card, Badge, Table, Modal, Form — technology-agnostic, reusable across BCs
- **BC-specific organisms**: Derived from actor view sections above (e.g., OrderForm, PreparationQueue, StockAlertPanel)
- **Pages**: Assembled from BC-specific organisms, one per actor view

Atomic Design mapping:
| Level | Source | Examples |
|---|---|---|
| Atoms | Design system tokens | Button, Input, Badge, Icon |
| Molecules | Composed atoms | FormField (label + input + error), SearchBar |
| Organisms | Actor view sections (8b) | OrderForm, PreparationQueue, InventoryTable |
| Templates | Page layout structure | SidebarLayout, DashboardLayout |
| Pages | Actor views (8b) | WaiterOrderPage, BaristaPreparationPage |

#### 8d: State Management & Data Flow

```
Actor View → TanStack Query hook → API Client → Backend API → Driving Port → Application Service → Aggregate
                                                                                                       ↓
Actor View ← TanStack Query cache ← API Client ← Backend API ← Read Model Projection ← Domain Events
```

- **Server state (TanStack Query)**: One `useQuery` per read model query endpoint. One `useMutation` per command endpoint. Cache invalidation on mutation success.
  - **MANDATORY resilience**: `retry: 1` (not infinite), `refetchOnWindowFocus: false`. Per-query `refetchInterval` is fine for polling.
  - **MANDATORY error states**: Every `useQuery` consumer MUST handle `isLoading`, `isError`, and success. Every `useMutation` MUST have `onError` callback — never silently fail.
- **Client state (Zustand)**: UI-only state — selected role, notification toasts, form draft state, sidebar collapse. Never duplicates server state.
- **Complex flows (XState)**: Multi-step UI workflows (e.g., multi-page wizard, optimistic state transitions). Optional — only when Zustand is insufficient.

#### 8e: Micro-frontend Boundary (if applicable)

**Only if assessment-2 = microservices AND multiple BCs have actor-facing UI:**

- One MFE per BC
- Module Federation for runtime composition
- Shell app for routing and shared auth
- Shared design system as a federated module
- **MFE error isolation**: Shell MUST catch module load failures and show fallback UI. One MFE failing MUST NOT crash others.

#### 8f: Frontend Resilience Requirements (MANDATORY)

**Every frontend architecture MUST define these for Phase 8 to implement:**

1. **Three-state rendering**: Every page MUST handle `loading` → `error` → `success`. No page may only handle loading + success.
2. **Error identification**: Error messages MUST identify which backend service failed (e.g., "庫存服務無法連線 (port 8084)") so operators can diagnose.
3. **Mutation feedback**: Every `useMutation` MUST have `onError` callback that shows user-visible feedback (toast/alert/inline error). Silent failure is forbidden.
4. **Query resilience**: `QueryClient` defaults MUST limit `retry` (1-2, not infinite) to avoid flooding dead services. `refetchOnWindowFocus: false` to prevent error storms on tab switch.
5. **API error parsing**: The API client MUST handle both JSON and non-JSON error responses (Vite proxy returns `text/plain` on 5xx when backend is down).
6. **TypeScript strict**: All frontend code MUST compile with `tsc --noEmit` with zero errors. Unused imports, possibly-undefined access, and type mismatches are build-breaking.

### Step 9: Java 21 Type Design Annotations

For each aggregate, annotate the following in the output YAML to guide Phase 8 implementation:

```yaml
java21_type_design:
  value_objects_as_records:        # VOs that should be Java records
    - name: Money
      invariant: "amount >= 0"
    - name: TableNumber
      invariant: "1 <= value <= 5"
  events_as_records:               # Domain events that should be Java records
    - OrderPlaced
    - OrderConfirmed
  sealed_hierarchies:              # Closed type sets for sealed interfaces
    - name: OrderCommand
      type: commands
      permits: [PlaceOrder, ConfirmOrder, RecordPayment, DeliverOrder, CompleteOrder]
    - name: OrderEvent
      type: events
      permits: [OrderPlaced, OrderConfirmed, PaymentReceived, OrderCompleted]
  behavior_enums:                  # Enums that encode domain knowledge
    - name: OrderType
      values: [DINE_IN, TAKE_AWAY]
      behavior: "servingTemperatureCelsius: DINE_IN=70, TAKE_AWAY=90"
    - name: CappuccinoStyle
      values: [STANDARD, DRY, WET]
      behavior: "milkToFoamRatio: DRY=0.5, WET=2.0, STANDARD=1.0"
  plain_enums:                     # Enums without behavior (simple closed sets)
    - name: FoamLevel
      values: [NO_FOAM, WITH_FOAM, MORE_FOAM]
    - name: MilkType
      values: [REGULAR, SOY]
```

### Step 10: Update Glossary

Add all aggregate names, VO names, command names, event names, specification names to glossary with bounded_context assignment.

## Output

### `.arch/03-tactical/aggregates/{AggName}.yaml` (one per aggregate)
Follow aggregate schema exactly.

### `.arch/03-tactical/domain-model/{BCName}.yaml` (one per BC)
```yaml
bounded_context: "CheckIn"
clean_architecture:
  entities_layer: [CheckIn, DigitalKey, GuestIdentity, RoomAssignment]
  use_cases: [CheckInUseCase, IssueDigitalKeyUseCase]
  driving_ports: [CheckInPort, DigitalKeyPort]
  driven_ports: [ReservationQueryPort, DoorLockPort, CheckInRepository]
  interface_adapters: [CheckInController, CheckInPresenter, ReservationGateway]
sagas:
  - name: "SelfCheckInSaga"
    type: "orchestration"
    steps: [...]
    compensations: [...]
resilience:
  - port: "ReservationQueryPort"
    circuit_breaker: { failure_threshold: 5, timeout_ms: 3000 }
    retry: { max: 3, backoff: "exponential_with_jitter" }
    fallback: "cached_reservation"
```

### `.arch/03-tactical/frontend-architecture.yaml`
```yaml
design_system:
  shared_components: [Button, Input, Select, Card, Badge, Table, Modal, FormField]
  tokens: [colors, spacing, typography, breakpoints]

bounded_contexts:
  - name: "Ordering"
    api_contract:
      command_endpoints:
        - { command: "PlaceOrder", method: "POST", path: "/waiter/orders", actor: "waiter" }
        - { command: "ConfirmOrder", method: "POST", path: "/cashier/orders/{id}/confirm", actor: "cashier" }
        # ... (full schema as in Step 8a)
      query_endpoints:
        - { read_model: "OrderSummaryView", method: "GET", path: "/waiter/orders", actor: "waiter" }
        # ...
      shared_enums: [OrderType, CoffeeType, CupSize, OrderStatus]
      request_dtos: [PlaceOrderRequest, ConfirmOrderRequest, ...]
      response_dtos: [PlaceOrderResponse, OrderSummary, ...]

    actor_views:
      - { actor: "waiter", page: "WaiterOrderPage", route: "/waiter", sections: [...] }
      - { actor: "cashier", page: "CashierPage", route: "/cashier", sections: [...] }
      # ... (full schema as in Step 8b)

    components:
      organisms: [OrderForm, ActiveOrdersTable, PaymentForm]
      hooks_queries: [useOrders, useOrderDetail]
      hooks_mutations: [usePlaceOrder, useConfirmOrder, useRecordPayment]

    state:
      server: "TanStack Query"
      client: "Zustand"
      complex_flows: null  # or "XState (OrderFlow)" if needed

    micro_frontend:
      enabled: false  # or true if microservices + multiple BC UIs
```

### `.arch/glossary.yaml`
Updated with all tactical terms.

## Completion

Present summary per BC:

```
## Phase 3: Tactical Design Complete

### Per Bounded Context:

#### CheckIn (Core)
- Aggregates: CheckIn (root + 2 VOs), DigitalKey (root + 1 VO)
- Commands: 3, Events: 4, Invariants: 5
- Data Pattern: CQRS + Event Sourcing
- Specifications: 2 (RoomAvailabilitySpec, IdentityVerificationSpec)
- DDD Policies: 1 (KeyIssuancePolicy — strategy)
- ES Policies: 2 simple → event handlers, 1 conditional → Spec + handler
- Sagas: SelfCheckInSaga (orchestration, 3 steps)
- Clean Architecture: 2 driving ports, 3 driven ports
- Resilience: Circuit Breaker on ReservationQueryPort, DoorLockPort
- API Contract: 3 command endpoints, 2 query endpoints (read models), 4 shared enums
- Actor Views: 2 (waiter, cashier) with full section/interaction mapping
- Frontend Components: 3 organisms, 2 query hooks, 3 mutation hooks

[repeat for each BC]

### Design Quality Check
- ✅ Vernon's Rule 1: True invariants in consistency boundaries
- ✅ Vernon's Rule 2: Small aggregates (avg 1.5 entities)
- ✅ Vernon's Rule 3: Identity references only
- ✅ Vernon's Rule 4: Eventual consistency across aggregates
- ✅ SOLID compliance
- ✅ Clean Architecture Dependency Rule
```

$ARGUMENTS
