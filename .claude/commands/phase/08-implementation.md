---
description: "Phase 8: Implementation — Architecture-constrained code generation with tech-specific guidance"
---

# Phase 8: Implementation

You are a senior software engineer implementing the system designed in Phases 0-7. Your code MUST be constrained by every architecture artifact produced earlier. You do NOT invent — you translate design into code.

## Knowledge Base

Read these files:
- knowledge-base/clean-architecture/01-clean-architecture-complete.md
- knowledge-base/ooad/02-rich-domain-model-principles.md
- knowledge-base/tdd/01-tdd-complete.md
- knowledge-base/xp/01-xp-complete.md
- knowledge-base/refactoring/01-code-smells.md
- knowledge-base/microservice-patterns/03-resilience-patterns.md

## Input — MUST Read ALL Before Writing Any Code

Read EVERY artifact in `.arch/`:
- `00-requirements/parsed-requirements.yaml` — Business rules, constraints, pricing tables
- `01-discovery/event-storm.yaml` — Events, commands, aggregates, policies
- `01-discovery/event-model.yaml` — Command GWT specs, read models, automations, vertical slices
- `02-strategic/bounded-contexts.yaml` — BC boundaries, classification, team ownership
- `02-strategic/context-map.yaml` — BC relationships, integration patterns, messaging topology
- `03-tactical/aggregates/*.yaml` — Aggregate design with invariants, commands, events, specifications
- `03-tactical/domain-model/*.yaml` — Clean Architecture layers, ports, sagas, resilience
- `04-specification/features/*.feature` — BDD scenarios (these become acceptance tests)
- `04-specification/contracts/*.yaml` — Cross-BC event schemas
- `04-specification/test-strategy.yaml` — Test shape and layer config per BC
- `04-specification/threat-model.yaml` — Security requirements
- `05-delivery/pipeline.yaml` — Build/deploy pipeline constraints
- `05-delivery/observability/observability.yaml` — Logging, metrics, tracing requirements
- `06-review/adrs/*.md` — Architecture decisions that constrain implementation
- `glossary.yaml` — Ubiquitous Language (class/method names MUST use these terms)

**UX Design artifacts (if frontend):**
- `03c-ux-design/ux-design-report.yaml` — Design system choices, status→color mapping, accessibility targets
- `design-system/MASTER.md` — Global design tokens (colors, typography, spacing, effects) from ui-ux-pro-max
- `design-system/pages/*.md` — Per-actor page overrides

**MANDATORY assessment files:**
- `.arch/assessment-2.md` — Architecture style (modulith/microservices), team topology, infrastructure decisions
- `.arch/assessment-8.md` — Technology stack (language, framework, DB, deployment target)

## Pre-Implementation: Assessment Gate

**BEFORE writing any code**, run the assessment gate for Phase 8:

### Technology Assessment Checklist

If ANY of these are unspecified, generate `.arch/assessment-8.md` using the Pre-Phase 8 template from the assessment utility:

| Question | Why It Matters |
|---|---|
| Programming language + version | Syntax, features, toolchain |
| Application framework + version | Project structure, DI, lifecycle |
| Build tool + version | Dependency management, plugins |
| Database engine | DDL dialect, reserved words, type mappings |
| Event/messaging mechanism | In-process events vs message broker |
| API style (REST/GraphQL/gRPC) | Controller/resolver/service generation |
| Authentication mechanism | Security middleware setup |
| Test framework | Test annotations, assertion style |
| Target JDK/runtime version | Language features, compatibility |
| Deployment target | Container, serverless, bare metal |

### Framework-Specific Constraints Checklist

After technology is confirmed, verify these constraints:

**For Spring Boot:**
- [ ] JDK version compatible with Spring Boot version (check [Spring Boot system requirements](https://spring.io/projects/spring-boot))
- [ ] Gradle/Maven version compatible with JDK version
- [ ] JPA `@Enumerated(EnumType.STRING)` columns need `@Column(length=...)` for H2/certain DBs
- [ ] Embedded Value Objects: field names must avoid SQL reserved words (`value`, `key`, `order`, `group`, `user`, `table`, `status`)  → use `@Column(name = "...")` explicitly
- [ ] Spring Data JPA query derivation: embedded object navigation uses `_` separator (e.g., `findByTableNumber_Value`)
- [ ] Spring Modulith `EVENT_PUBLICATION` table: `SERIALIZED_EVENT` column default may be too short for events with nested data → configure column size
- [ ] `AbstractAggregateRoot` domain events are published on `repository.save()` → events and state change must be in same transaction
- [ ] `@ApplicationModuleListener` processes events asynchronously by default → ensure cross-BC listeners handle eventual consistency
- [ ] State machine transitions across BC boundaries: verify the full lifecycle is covered including saga-triggered transitions (e.g., PAID → PREPARING must be triggered by saga, not left as a gap)

**For JPA/Hibernate:**
- [ ] H2 database: `enum(...)` DDL type may not be supported → use `@Enumerated(EnumType.STRING)` with explicit column definition
- [ ] `@OneToMany` with `@JoinColumn` on parent: orphan removal + cascade requires careful ordering
- [ ] UUID as `@Id`: ensure proper generation strategy or manual assignment
- [ ] Embedded collections: `@ElementCollection` vs `@OneToMany` choice impacts query performance
- [ ] Lazy loading: aggregates with collections need `EAGER` fetch or explicit join fetch in queries

**For any framework:**
- [ ] Enum names as identifiers: check against target DB reserved word list
- [ ] Event serialization: nested objects (records, lists) must serialize/deserialize correctly
- [ ] Cross-module event handling: verify event type visibility across module boundaries
- [ ] Test fixture values: must match EXACTLY with domain pricing/recipe/capacity tables defined in architecture artifacts

## Java 21 DDD Pattern Guide

When the target language is **Java 21+**, apply these patterns to maximize type safety and DDD alignment:

### Pattern 1: Records for Value Objects
Records provide immutability + structural equality — exactly what DDD Value Objects require.
```java
public record Money(int amount) {
    public Money { if (amount < 0) throw new IllegalArgumentException("Amount must be non-negative"); }
    public Money add(Money other) { return new Money(this.amount + other.amount); }
}
public record TableNumber(int value) {
    public TableNumber { if (value < 1 || value > 5) throw new IllegalArgumentException(); }
}
```
**Note**: JPA cannot directly map records as `@Embedded` — use records for non-persisted VOs or convert at the persistence boundary.

### Pattern 2: Records for Domain Events

**MANDATORY — Type Consistency Rule**: Before writing ANY domain event record, you MUST `Read` the actual `shared-kernel/.../DomainEvent.java` file to check the exact method signatures (`occurredAt()` return type may be `Instant` or `LocalDateTime`). All event records MUST match the actual interface — do NOT copy types from this skill's examples. If multiple agents are generating code in parallel, the shared-kernel MUST be generated FIRST, and all other agents must read it before generating events.

Domain events are immutable facts. DomainEvent MUST be an **interface** (not abstract class) so records can implement it.
```java
public interface DomainEvent {
    UUID eventId();
    Instant occurredAt();
}
public record OrderPlaced(UUID eventId, Instant occurredAt, UUID orderId, int tableNo) implements DomainEvent {
    public OrderPlaced(UUID orderId, int tableNo) {
        this(UUID.randomUUID(), Instant.now(), orderId, tableNo);  // convenience constructor
    }
}
```
**Accessor syntax**: Always use `event.orderId()` (record accessor), NOT `event.getOrderId()`.

### Pattern 3: Sealed Interfaces for Closed Type Hierarchies
Use `sealed` to enforce that a domain concept is a **closed set** — the compiler guarantees exhaustiveness.
```java
// All events within a BC form a closed set
public sealed interface OrderEvent extends DomainEvent
    permits OrderPlaced, OrderConfirmed, PaymentReceived, OrderCompleted {}

// Commands as a sealed ADT (Algebraic Data Type)
public sealed interface OrderCommand
    permits PlaceOrder, ConfirmOrder, RecordPayment, DeliverOrder, CompleteOrder {
    record PlaceOrder(int tableNo, List<ItemRequest> items, OrderType orderType) implements OrderCommand {}
    record ConfirmOrder(UUID orderId) implements OrderCommand {}
    record RecordPayment(UUID orderId, Money cash) implements OrderCommand {}
}
```
**DDD significance**: Bounded Context = closed boundary. Sealed enforces this at compile time.

### Pattern 4: Pattern Matching for Domain Logic Dispatch
Replace `if-else` / visitor chains with pattern matching `switch` — reads closer to Ubiquitous Language.
```java
// Saga event handling
public void handle(DomainEvent event) {
    switch (event) {
        case CoffeePrepared e -> handleItemPrepared(e.orderId(), e.coffeeId());
        case OrderPlaced e    -> startTracking(e.orderId());
        default               -> {}
    }
}
```
With **sealed** interfaces, the compiler enforces all cases are handled (no `default` needed).

### Pattern 5: Record Patterns (Deconstruction)
Destructure nested records to extract exactly what the business logic needs.
```java
if (event instanceof OrderSubmittedToBarista(_, _, var orderId, _, var orderType, var items)) {
    int temp = orderType.getServingTemperatureCelsius();
    items.forEach(item -> startPreparation(orderId, item, temp));
}
```

### Pattern 6: Behavior-on-Enum
Encode domain knowledge **inside the type** instead of scattering it across services.
```java
public enum OrderType {
    DINE_IN(70), TAKE_AWAY(90);
    private final int servingTemperatureCelsius;
    OrderType(int temp) { this.servingTemperatureCelsius = temp; }
    public int getServingTemperatureCelsius() { return servingTemperatureCelsius; }
}
public enum CappuccinoStyle {
    STANDARD, DRY, WET;
    public double milkToFoamRatio() {
        return switch (this) {
            case DRY -> 0.5;       // 1:2 milk-to-foam
            case WET -> 2.0;       // 2:1 milk-to-foam
            case STANDARD -> 1.0;  // 1:1
        };
    }
}
```
**DDD significance**: Rich Domain Model — data and behavior together. No anemic enum + external service anti-pattern.

### Pattern Summary Table

| DDD Concept | Java 21 Feature | Replaces |
|---|---|---|
| Value Object | `record` (immutable, structural equality) | Hand-written immutable class + equals/hashCode |
| Domain Event | `record implements DomainEvent` | class extending abstract DomainEvent |
| Closed type hierarchy (BC boundary) | `sealed interface` | Convention + Javadoc |
| Command (CQRS) | `sealed interface` + inner `record` | Loose DTO classes |
| State machine / event dispatch | Pattern matching `switch` | if-else / visitor pattern |
| Event handling (Saga) | `switch` + record patterns | instanceof chain with casts |
| Domain knowledge in types | Enum with behavior + switch expression | String comparison in services |
| API DTOs | `record` (request/response) | Mutable POJOs / Lombok @Data |

### When NOT to Use Records
- **JPA Entities / Aggregate Roots**: JPA requires mutable state, default constructor, field access — use regular classes with `@Entity`
- **Aggregate child entities**: Same JPA constraint — use `@Entity` classes
- **Objects that need identity-based equality**: Records use structural equality, which is wrong for Entities

## Specification & Policy Code Patterns

### Specification Pattern (DDD, Evans Ch.9)

Composable predicates for complex business rules. Lives in the **domain layer**.

```java
// Base interface
public interface Specification<T> {
    boolean isSatisfiedBy(T candidate);

    default Specification<T> and(Specification<T> other) {
        return candidate -> this.isSatisfiedBy(candidate) && other.isSatisfiedBy(candidate);
    }
    default Specification<T> or(Specification<T> other) {
        return candidate -> this.isSatisfiedBy(candidate) || other.isSatisfiedBy(candidate);
    }
    default Specification<T> not() {
        return candidate -> !this.isSatisfiedBy(candidate);
    }
}

// Domain-specific specification
public class TableAvailabilitySpecification implements Specification<Table> {
    private final int requiredCapacity;
    public TableAvailabilitySpecification(int requiredCapacity) {
        this.requiredCapacity = requiredCapacity;
    }
    @Override
    public boolean isSatisfiedBy(Table table) {
        return table.getStatus() == TableStatus.AVAILABLE
            && table.getCapacity() >= requiredCapacity;
    }
}

// Composition
var spec = new TableAvailabilitySpecification(partySize)
    .and(new TimeSlotSpecification(requestedTime));
var availableTables = tables.stream().filter(spec::isSatisfiedBy).toList();
```

### DDD Policy Pattern (Strategy, Evans Ch.12)

Varying business logic with swappable implementations. Lives in the **domain layer**.

```java
// Policy interface (Strategy)
public interface PricingPolicy {
    Money calculatePrice(Order order);
}

// Implementations per variant
public class DineInPricingPolicy implements PricingPolicy {
    @Override
    public Money calculatePrice(Order order) {
        return order.basePrice(); // no surcharge
    }
}
public class TakeAwayPricingPolicy implements PricingPolicy {
    @Override
    public Money calculatePrice(Order order) {
        return order.basePrice().add(new Money(50)); // packaging surcharge
    }
}

// Selection in application layer (or factory)
public PricingPolicy policyFor(OrderType type) {
    return switch (type) {
        case DINE_IN   -> new DineInPricingPolicy();
        case TAKE_AWAY -> new TakeAwayPricingPolicy();
    };
}
```

### ES Policy → Event Handler Mapping

Event Storming policies (purple stickies) become **event handlers** in the application layer.

```java
// Simple ES Policy: "When OrderPaid, start preparation"
@ApplicationModuleListener  // Modulith: in-process async
public class OrderPaidHandler {
    private final PreparationService preparationService;

    public void on(OrderPaid event) {
        // ES Policy: reactive automation
        preparationService.startPreparation(event.orderId(), event.items());
    }
}

// Conditional ES Policy: "When OrderPlaced, if table available, assign table"
@ApplicationModuleListener
public class OrderPlacedHandler {
    private final TableRepository tableRepository;
    private final TableAvailabilitySpecification spec; // DDD Specification

    public void on(OrderPlaced event) {
        if (event.orderType() == OrderType.DINE_IN) {
            var table = tableRepository.findAll().stream()
                .filter(t -> new TableAvailabilitySpecification(event.partySize()).isSatisfiedBy(t))
                .findFirst()
                .orElseThrow(() -> new NoTableAvailableException());
            table.assignTo(event.orderId());
            tableRepository.save(table);
        }
    }
}
```

**If Microservices**: Replace `@ApplicationModuleListener` with `@RabbitListener`/`@KafkaListener`/`@SqsListener` and add idempotency check:
```java
@RabbitListener(queues = "order.paid")
public void on(OrderPaid event) {
    if (eventStore.alreadyProcessed(event.eventId())) return;  // idempotency
    preparationService.startPreparation(event.orderId(), event.items());
    eventStore.markProcessed(event.eventId());
}
```

## Implementation Process

**CRITICAL — Parallel Agent Protocol**: When code generation is split across parallel agents (one per BC/service):
- Each agent MUST generate BOTH production code AND test code for its service
- Each agent MUST run `./gradlew :services:{service-name}:test` and verify tests pass before reporting completion
- The shared-kernel agent MUST complete FIRST; other agents must read its output before starting
- A service with zero test files (`test NO-SOURCE`) is considered an INCOMPLETE delivery

**MANDATORY: Test-First Development (TDD). No production code without a failing test.**

For each vertical slice (from `04-specification/features/*.feature`), follow the Outside-In Double Loop:

1. **Acceptance test RED**: Write BDD step definitions for the Gherkin scenario → fails (no production code yet)
2. **Domain TDD** (inner loop): For each aggregate, VO, Specification, Policy needed:
   - RED: Write unit test → GREEN: Implement minimum code → REFACTOR
3. **Application TDD** (inner loop): For each use case, event handler, saga:
   - RED: Write integration test → GREEN: Implement → REFACTOR
4. **Infrastructure TDD** (inner loop): For each repository, API endpoint:
   - RED: Write integration test → GREEN: Implement → REFACTOR
5. **Acceptance test GREEN**: All components wired → acceptance test passes

### Step 1: Project Scaffolding

Read architecture style from `assessment-2.md` and technology stack from `assessment-8.md`.

#### If Modular Monolith:

Single project with BC-as-module structure:

```
{project-name}/
├── build.gradle.kts / pom.xml          # Build configuration
├── settings.gradle.kts                   # Multi-module settings (if applicable)
├── src/main/java/com/{project}/
│   ├── {Application}.java               # Single entry point
│   ├── shared/                           # Shared kernel (from glossary)
│   │   ├── domain/                       # Base types (DomainEvent interface), shared VOs, enums
│   │   └── api/                          # Global error handling, CORS
│   ├── {bc1}/                            # Bounded Context 1 (Spring Module)
│   │   ├── package-info.java             # Module boundary declaration (@ApplicationModule)
│   │   ├── domain/
│   │   │   ├── model/                    # Aggregate, Entities, VOs
│   │   │   ├── event/                    # Domain events (records)
│   │   │   └── command/                  # Command objects (if CQRS)
│   │   ├── application/                  # Use cases, event handlers, sagas
│   │   ├── infrastructure/               # JPA repos, external adapters
│   │   └── api/                          # REST controllers, DTOs (records)
│   ├── {bc2}/                            # Bounded Context 2
│   └── {bc3}/                            # Bounded Context 3
├── src/main/resources/
│   ├── application.yml                   # Single configuration
│   └── db/migration/                     # Shared DB, schema-per-BC migrations
└── src/test/java/com/{project}/
    ├── {bc1}/domain/model/               # Unit tests (aggregate logic)
    ├── {bc1}/application/                # Integration tests
    └── ModularityTests.java              # Spring Modulith structure verification
```

#### If Microservices:

One project per BC/service (mono-repo or multi-repo per assessment-2):

```
{project-root}/                           # Mono-repo root (or separate repos)
├── shared-kernel/                        # Published as library/package
│   ├── build.gradle.kts
│   └── src/main/java/com/{project}/shared/
│       └── domain/                       # DomainEvent interface, shared VOs, enums
│                                         # Cross-service event records (contract types)
├── {bc1}-service/                        # Service 1 (independent Spring Boot app)
│   ├── build.gradle.kts                  # Depends on shared-kernel
│   ├── Dockerfile                        # Multi-stage build
│   ├── src/main/java/com/{project}/{bc1}/
│   │   ├── {Bc1Application}.java         # Independent entry point
│   │   ├── domain/
│   │   │   ├── model/                    # Aggregate, Entities, VOs
│   │   │   ├── event/                    # Internal domain events (records)
│   │   │   └── command/                  # Command objects
│   │   ├── application/                  # Services, event handlers, sagas
│   │   ├── infrastructure/
│   │   │   ├── persistence/              # JPA repos
│   │   │   ├── messaging/               # Message broker producer/consumer
│   │   │   └── config/                   # Service-specific configuration
│   │   └── api/                          # REST controllers, DTOs (records)
│   ├── src/main/resources/
│   │   ├── application.yml               # Service-specific config (DB, broker URL)
│   │   └── db/migration/                 # Service-own DB migrations
│   └── src/test/java/
│       └── ...                           # Unit + integration + contract tests
├── {bc2}-service/                        # Service 2 (same structure)
├── {bc3}-service/                        # Service 3 (same structure)
├── docker-compose.yml                    # Local development: all services + DB + broker
└── settings.gradle.kts                   # Mono-repo: multi-project build
```

**Per-service Dockerfile** (generated for each service):
```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN ./gradlew :{bc}-service:bootJar

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/{bc}-service/build/libs/*.jar app.jar
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Step 2: Shared Domain Kernel

From `glossary.yaml`, generate:
- Enums for domain concepts (CoffeeType, CupSize, MaterialType, etc.)
- **Type-safe enums for domain customizations** (e.g., FoamLevel, CappuccinoStyle, MilkType, OrderType) — replaces raw Strings with constrained types
- **Behavior-on-enum pattern**: Enums that encode domain knowledge (e.g., `OrderType.DINE_IN(70)` carries serving temperature, eliminating string comparisons)
- Value Objects with validation (Money, TableNumber, etc.)
- Base types: AggregateRoot (abstract class), **DomainEvent (interface, NOT abstract class — enables records)**
- Pricing/Recipe/Capacity tables as **static reference data** (from parsed-requirements.yaml)

**CRITICAL**: All field names in VOs must be checked against SQL reserved words.

### Step 3: Aggregate Implementation (per BC)

For each aggregate in `03-tactical/aggregates/*.yaml`:

1. **Entity class**: Map aggregate root with JPA annotations
   - `@Entity`, `@Table(name = "...")`, `@Id`
   - `@Enumerated(EnumType.STRING)` for all enum fields
   - `@Embedded` with `@AttributeOverride` for VOs
   - `@OneToMany(cascade = ALL, orphanRemoval = true)` for child entities

2. **Command methods**: Each command from the aggregate YAML becomes a method
   - Factory method for creation commands (returns new instance)
   - Instance method for state-change commands
   - Each method: validate preconditions → mutate state → register events

3. **State machine**: Implement transition validation
   - Define `canTransitionTo(nextState)` method
   - **Verify ALL transitions are reachable** including saga-triggered ones
   - Document which transitions are triggered by which actor vs. which by policies/sagas

4. **Domain events**: One **record** per event (Java 21)
   - Implement `DomainEvent` interface (NOT extend — DomainEvent is an interface to enable records)
   - Use Java records for immutability: `public record OrderPlaced(UUID eventId, Instant occurredAt, UUID orderId, ...) implements DomainEvent {}`
   - Provide convenience constructor that auto-generates `eventId` and `occurredAt`
   - Use record accessor syntax everywhere: `event.orderId()` (NOT `event.getOrderId()`)
   - Cross-BC events carry only IDs and minimal data (per contract definitions)
   - Cross-BC events use type-safe enums (e.g., `OrderType`, `FoamLevel`) not raw Strings
   - Nested data in events uses inner records (e.g., `record ItemDetail(...)` inside event)

### Step 4: Application Layer (per BC)

1. **Service classes**: One per aggregate (wraps command + query methods)
   - `@Service`, `@Transactional`
   - Delegates to aggregate methods (no domain logic in service)

2. **Event handlers**: For cross-BC events (policies from event storm)
   - **If Modular Monolith**: `@ApplicationModuleListener` (Spring Modulith) — in-process async events
   - **If Microservices**: Message broker consumer (e.g., `@RabbitListener`, `@SqsListener`, `@KafkaListener`) — cross-service async events
   - Each handler implements one policy from `01-discovery/event-storm.yaml`
   - **If Microservices**: Each handler MUST be idempotent (check for duplicate eventId before processing)

3. **Saga/Process managers**: From `03-tactical/domain-model/*.yaml`
   - Track multi-step process state
   - Handle compensating actions
   - **If Microservices**: Saga state must be persisted (not in-memory) to survive service restarts

### Step 5: Infrastructure Layer

1. **Repository interfaces**: Extend framework repository (JpaRepository, etc.)
   - Query method names must follow framework conventions
   - For embedded object fields: use proper navigation syntax

2. **Configuration**: Application properties
   - Database URL, DDL strategy, event publication settings
   - **Known issues mitigations** (see Framework-Specific Constraints above)

3. **If Microservices** (from assessment-2), additionally:
   - **Message broker configuration**: Connection URL, queue/topic names, serialization format (from assessment-2)
   - **Transactional Outbox** (if required): Outbox table + polling publisher for reliable event delivery
   - **Service-specific configuration**: Externalized via environment variables or config server (not hardcoded)
   - **Health check endpoints**: `/actuator/health/liveness`, `/actuator/health/readiness` (Spring Boot Actuator)
   - **Graceful shutdown**: `server.shutdown=graceful` + `spring.lifecycle.timeout-per-shutdown-phase=30s`

### Step 6: API Layer

**Translate the API contract** from `03-tactical/frontend-architecture.yaml` `api_contract` section. Every endpoint here is a direct translation — no invention of new endpoints.

1. **REST Controllers**: One controller per actor role per BC
   - Each `command_endpoint` in the API contract → one `@PostMapping` method
   - Each `query_endpoint` in the API contract → one `@GetMapping` method
   - Path prefix: `/api` + the path from the contract (e.g., `/api/waiter/orders`)
   - **CRITICAL**: Endpoint paths, HTTP methods, and actor grouping MUST match the API contract exactly

2. **Request/Response DTOs as Java records** (Anti-Corruption Layer):
   - Each `request_dto` in the API contract → one Java record
   - Each `response_dto` in the API contract → one Java record
   - DTO field names and types MUST match the contract
   - **CRITICAL — Response shape MUST match the contract exactly**:
     - If the contract says `response_dto: SalesReportResponse { weeklyTotal, monthlyTotal, ... }`, the endpoint MUST return that aggregated object — NOT raw database records
     - If the read model requires aggregation (sum, count, average, group-by), the **backend** MUST implement the aggregation logic in the service/repository layer
     - Returning raw entity lists when the contract specifies an aggregated DTO is a Contract Shape Drift violation
   - Shared enums from the contract are already in the shared domain kernel (Step 2)
   - DTOs translate to/from domain commands — they are NOT domain objects

3. **Controller method pattern** (for commands):
   ```java
   @PostMapping("/waiter/orders")
   public ResponseEntity<PlaceOrderResponse> placeOrder(@RequestBody PlaceOrderRequest request) {
       // Translate DTO → domain command
       var command = new PlaceOrder(request.tableNumber(), request.orderType(), ...);
       // Invoke driving port (application service)
       var result = orderService.place(command);
       // Translate domain result → response DTO
       return ResponseEntity.status(201).body(new PlaceOrderResponse(result.id(), result.status()));
   }
   ```

4. **CQRS Read Model endpoints** (for query-only BCs like Reporting):
   - **The query endpoint MUST return the `response_dto` shape defined in the API contract** — not raw JPA entities
   - If the read model aggregates data from events (e.g., `SalesReport` built from `OrderCompleted` events), the backend MUST implement the aggregation query (e.g., SQL `SUM`, `COUNT`, `GROUP BY`) or in-memory transformation
   - If a read model depends on events from another BC, verify the event listener/projection is wired and populating the read store. A CQRS read model that returns `[]` because no events were consumed is a critical bug.
   - **Endpoint paths MUST match the Phase 3 API contract exactly** — do NOT invent different paths (e.g., if contract says `/api/reporting/cashier/sales`, do NOT implement as `/api/reports/sales`)

5. **Error handling**: Global exception handler
   - Domain rejections → 400 BAD_REQUEST
   - Invalid state transitions → 409 CONFLICT
   - Not found → 404
   - Include domain error message in response

### Step 7: Tests (Written BEFORE Production Code — TDD)

From `04-specification/test-strategy.yaml` and `04-specification/features/*.feature`.

**Tests are written FIRST in each TDD cycle, not after. See "Implementation Process" above.**

#### Per-Layer Test Guide

| Layer | DDD Concept | Test Type | Framework Needed? | What to Assert |
|---|---|---|---|---|
| Domain | Aggregate commands | Unit | No | State change + events produced + rejections |
| Domain | Value Object | Unit | No | Construction invariants + equality + behavior |
| Domain | DDD Specification | Unit | No | `isSatisfiedBy()` true/false + AND/OR/NOT composition |
| Domain | DDD Policy (Strategy) | Unit | No | Each impl returns correct result for its variant |
| Domain | State Machine | Unit | No | All valid transitions + invalid transition rejection |
| Domain | Domain Event | Unit | No | Correct fields + serialization roundtrip |
| Application | ES Policy (event handler) | Integration | Yes | Event triggers correct command + side effects |
| Application | Saga / Process Manager | Integration | Yes | Multi-step flow + compensation + idempotency |
| Infrastructure | Repository | Integration | Yes (DB) | Save/load roundtrip + query correctness |
| Infrastructure | Cross-BC event flow | Integration | Yes | Event from BC-A → consumed by BC-B → side effect |
| API | REST Controller | Integration | Yes (MockMvc) | HTTP status + response body + error codes |
| Acceptance | Vertical slice (BDD) | Acceptance | Yes (full) | Gherkin scenario end-to-end |
| Cross-cutting | BC-to-BC contract | Contract | Pact | Event schema + API contract compatibility |

#### Unit tests (~70%) — domain layer, no framework:
- One test class per aggregate
- Test every command: happy path + every rejection case
- Test every state transition
- Test every Specification: satisfied + not satisfied + composition
- Test every DDD Policy: each implementation variant
- Test pricing/recipe/capacity tables with exact values from requirements
- **CRITICAL**: Test values must match EXACTLY with `.arch/` artifacts

#### Integration tests (~20%) — with framework:
- ES Policy event handlers: verify event → command → side effect
- Saga multi-step flows: verify orchestration + compensation
- Repository save/load roundtrip
- Cross-BC event flow end-to-end
- API endpoint request → response

#### Acceptance tests (~10%) — BDD:
- One per Gherkin scenario (from feature files)
- Full vertical slice from API to domain to persistence

#### Contract tests (cross-cutting):
- One per BC-to-BC integration point (from `04-specification/contracts/*.yaml`)
- Verify event schema compatibility

#### Modularity tests (Spring Modulith):
- Verify module boundary enforcement
- Verify no illegal cross-module dependencies

### Step 8: Build and Verify (Backend) — MANDATORY GATE

**This step is a HARD GATE. Code generation is NOT complete until all checks pass.**

1. **Compile gate**: Run `./gradlew compileJava` (or equivalent). Fix ALL errors before proceeding.
2. **Test gate**: Run `./gradlew test`. ALL tests must pass. If any fail, fix and re-run. Do NOT skip this.
3. **Test coverage check**: Every service MUST have `src/test/java/` with actual test files. If `./gradlew test` reports `NO-SOURCE` for any service, that service's tests are MISSING — go back and write them.
4. Start application — verify clean startup
4. **Verify seed data loaded (CRITICAL for event-driven systems)**: For BCs that have initial data (e.g., Inventory materials, menu items), the seed data MUST be loaded **before** any event consumers start processing messages. If consumers receive events before seed data exists, lookups will fail (e.g., `Inventory item not found: coffee_beans`), the SQS messages will be retried and eventually lost to DLQ, and the system will be in an **irrecoverable inconsistent state** (events consumed but never processed).

   **Seed data loading strategy (pick one):**
   - **Recommended: Flyway/Liquibase migration** — seed data runs as part of schema migration, guaranteed before application context starts. Use `V2__seed_data.sql` or similar.
   - **Alternative: `CommandLineRunner` / `ApplicationRunner`** — runs after Spring context is ready but before `@Scheduled` consumers start polling. Ensure `@Order(1)` to run before consumers.
   - **Avoid: `schema.sql` / `data.sql`** — `spring.jpa.hibernate.ddl-auto: update` **disables** Spring Boot SQL initialization by default. If you must use it, set `spring.sql.init.mode: always` AND `spring.jpa.defer-datasource-initialization: true`.

   **Event consumer startup ordering:**
   - Event consumers (`@Scheduled` SQS pollers) MUST NOT start polling until seed data is confirmed loaded
   - Consider adding a startup health check: consumer polls only when `ApplicationReadyEvent` has fired AND seed data query returns non-empty
   - **Test it**: Start all services, then `curl` each API endpoint that should have seed data. Verify response is NOT empty. If empty, fix seed data loading BEFORE sending any commands that trigger cross-BC events.
5. Run API smoke test — full lifecycle from first to last step
6. Verify cross-BC events fire and produce side effects
7. Check for DDL warnings in startup logs

---

## Frontend Implementation

**Skip this section if assessment-8 Q9 = E ("No frontend / API only").**

Read these artifacts:
- `assessment-8.md` — Q9 (framework), Q10 (test tools), Q11 (component docs), Q12 (CSS framework), Q13 (component library)
- `03-tactical/frontend-architecture.yaml` — API contract, actor views, component architecture
- `design-system/MASTER.md` — Global design tokens from Phase 3c (ui-ux-pro-max)
- `design-system/pages/*.md` — Per-actor page overrides
- `03c-ux-design/ux-design-report.yaml` — Status→color mapping, accessibility targets

### Frontend Quality Constraints (MANDATORY)

These constraints apply to ALL frontend code generation:

**1. TypeScript strict mode — zero tolerance for compilation errors:**
- `tsconfig.json` MUST set `"strict": true`
- After writing ALL frontend code, run `npx tsc --noEmit` and fix ALL errors before proceeding
- Common pitfalls to avoid:
  - Unused imports (TS6133): Only import what is actually used in the component
  - Possibly undefined access (TS18048): When grouping/filtering arrays, use concrete array types (e.g., `PreparationItem[]`) instead of `typeof queryResult` which includes `undefined`
  - Type mismatches between frontend DTOs and backend DTOs: verify field names match exactly (e.g., `size` vs `cupSize`)
  - **CRITICAL — Field name contract alignment**: Frontend `types.ts` field names MUST match the actual JSON field names returned by the backend API, NOT the Phase 3 YAML artifact names. Jackson serializes Java `boolean isLowStock` as `"lowStock"` (drops `is` prefix), `boolean lowStock` as `"lowStock"`, etc. After writing backend + frontend, verify alignment by: (1) curl the actual API endpoint, (2) compare JSON field names with frontend `types.ts` interfaces, (3) fix any mismatches. A single field name mismatch (e.g., `isLow` vs `lowStock`) causes silent data loss — the field will be `undefined` at runtime.

**2. Error and loading states — every page MUST handle all three states:**
- `isLoading` → show loading indicator
- `isError` or `!data` (after loading) → show user-friendly error message with service identification (e.g., "無法連線至庫存服務 (port 8084)")
- Success → render data
- **NEVER** leave a page that only handles loading + success. Backend services may be unavailable.

**3. TanStack Query resilience defaults:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,                    // Don't hammer a dead service
      staleTime: 2000,
      refetchOnWindowFocus: false,  // Prevent error floods on tab switch
    },
  },
});
```
- Per-query `refetchInterval` is fine for polling, but default `retry` MUST be limited
- Queries that hit potentially unavailable services should set `retry: false` or `retry: 1`

**4. Mutation error handling — every `useMutation` MUST have `onError`:**
```typescript
useMutation({
  mutationFn: ...,
  onSuccess: () => { ... },
  onError: (error) => {
    // Show user-facing error message, NOT silent failure
    // Identify which service failed for debugging
  },
});
```
- At minimum, display an alert or toast with the error
- For critical mutations (payment, order placement), show which backend service failed

**5. Vite proxy error handling:**
- When backend services are down, Vite proxy returns 500 with `text/plain` content type
- The `api.ts` `request()` function must handle both JSON and non-JSON error responses:
```typescript
if (!res.ok) {
  const error = await res.json().catch(() => ({ message: res.statusText }));
  throw new Error(error.message || `Request failed: ${res.status}`);
}
```

### Step 9: Frontend Project Scaffold

From `assessment-8.md` (Q9: frontend framework, Q10: test tools, Q11: component docs, Q12: CSS framework, Q13: component library):

#### React + Vite + Tailwind + shadcn/ui (default):

**Step 9a: Initialize project and design system tooling**

If Q12 = A (Tailwind) and Q13 = A (shadcn/ui):
```bash
npm create vite@latest {project-name}-web -- --template react-ts
cd {project-name}-web
npx shadcn@latest init                   # Configures Tailwind + shadcn/ui + theme
```

Configure `tailwind.config.ts` with design tokens from `design-system/MASTER.md`:
- Colors → `theme.extend.colors` (map MASTER.md palette to Tailwind semantic tokens)
- Typography → `theme.fontFamily` (heading + body fonts from MASTER.md)
- Spacing → `theme.spacing` (if MASTER.md specifies custom scale)
- Border radius → `theme.borderRadius` (from MASTER.md effects)

Install shadcn/ui components needed by actor view sections:
```bash
npx shadcn@latest add button card table badge select input form dialog toast
```

```
{project-name}-web/                      # or packages/web/ in monorepo
├── package.json                          # Dependencies: react, react-dom, typescript
├── tsconfig.json                         # Strict TypeScript
├── vite.config.ts                        # Vite + React plugin
├── tailwind.config.ts                    # Design tokens from MASTER.md
├── index.html
├── src/
│   ├── main.tsx                          # React root + QueryClientProvider + RouterProvider
│   ├── app/                              # App shell, routing, providers
│   │   ├── App.tsx
│   │   ├── router.tsx                    # Role-based routes from frontend-architecture.yaml
│   │   └── providers.tsx                 # QueryClient, Zustand, error boundary
│   ├── pages/                            # One page per actor view
│   │   ├── WaiterOrderPage.tsx
│   │   ├── CashierPage.tsx
│   │   ├── BaristaPage.tsx
│   │   └── ManagerDashboardPage.tsx
│   ├── features/                         # Feature modules (per BC interaction)
│   │   ├── ordering/
│   │   │   ├── components/               # BC-specific components
│   │   │   │   ├── OrderForm.tsx
│   │   │   │   ├── OrderItemRow.tsx
│   │   │   │   └── OrderStatusBadge.tsx
│   │   │   ├── hooks/                    # TanStack Query hooks
│   │   │   │   ├── useOrders.ts          # useQuery for read model
│   │   │   │   ├── usePlaceOrder.ts      # useMutation for command
│   │   │   │   └── useConfirmOrder.ts
│   │   │   └── types.ts                  # TypeScript types matching DTOs
│   │   ├── preparation/
│   │   │   ├── components/
│   │   │   │   ├── PreparationQueue.tsx
│   │   │   │   └── CoffeeCard.tsx
│   │   │   └── hooks/
│   │   │       ├── usePreparationQueue.ts
│   │   │       └── useMarkPrepared.ts
│   │   └── inventory/
│   │       ├── components/
│   │       └── hooks/
│   ├── shared/                           # Shared UI (design system)
│   │   ├── components/                   # Atoms + molecules
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Select.tsx
│   │   │   └── Table.tsx
│   │   ├── api/                          # API client
│   │   │   └── client.ts                 # Axios/fetch wrapper, base URL, error handling
│   │   └── types/                        # Shared types (enums matching backend)
│   │       ├── enums.ts                  # CoffeeType, CupSize, OrderType, etc.
│   │       └── domain.ts                 # Money, OrderSummary, etc.
│   └── stores/                           # Zustand stores (client state)
│       ├── useNotificationStore.ts
│       └── useRoleStore.ts
├── tests/                                # Test infrastructure
│   ├── setup.ts                          # Testing Library + MSW setup
│   ├── mocks/
│   │   ├── handlers.ts                   # MSW request handlers (from API contracts)
│   │   └── server.ts                     # MSW server setup
│   └── e2e/                              # Playwright E2E tests
│       ├── playwright.config.ts
│       └── order-lifecycle.spec.ts       # CUJ: full order happy path
└── .storybook/                           # Storybook config (if Q11 = A)
    └── main.ts
```

### Step 10: Component Implementation

**Translate** from `03-tactical/frontend-architecture.yaml` (actor views, component architecture) AND `design-system/MASTER.md` (visual design tokens). Every component traces to a design artifact; every style traces to the design system.

**Design system hierarchy** (when styling components):
1. Read `design-system/pages/{actor-page}.md` — if exists, use page-specific overrides
2. Fall back to `design-system/MASTER.md` — global design tokens
3. Use `ux-design-report.yaml` `status_color_mapping` — for domain enum → color mapping (e.g., `OrderStatus.PAID → success → green`)

**Step 10a: Shared TypeScript types (Anti-Corruption Layer)**

From the API contract's `shared_enums`, `request_dtos`, and `response_dtos`:
```typescript
// shared/types/enums.ts — from api_contract.shared_enums
export type OrderType = 'DINE_IN' | 'TAKE_AWAY';
export type CoffeeType = 'ESPRESSO' | 'LATTE' | 'CAPPUCCINO';
export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'PAID' | 'PREPARING' | 'READY' | 'DELIVERED' | 'COMPLETED';

// shared/types/domain.ts — from api_contract.response_dtos
export interface OrderSummary {                // mirrors OrderSummaryView read model
  orderId: string;
  tableNumber: number;
  status: OrderStatus;
  items: OrderItemSummary[];
  totalCents: number;
}

// features/ordering/types.ts — from api_contract.request_dtos
export interface PlaceOrderRequest {           // mirrors PlaceOrderRequest DTO
  tableNumber: number;
  orderType: OrderType;
  items: { coffeeType: CoffeeType; cupSize: CupSize; quantity: number }[];
}
```
**CRITICAL**: These types MUST match the API contract DTOs exactly. They are the frontend's Anti-Corruption Layer.

**Step 10b: Actor view pages**

For each `actor_views` entry in `frontend-architecture.yaml`:

1. **Page component**: Compose sections from the actor view definition
   - Each `section` in the view → one organism component
   - Each `data_source` → one TanStack Query hook call
   - Each `submit_action` or `row_action` → one mutation hook call
   - `visible_when` conditions → conditional rendering based on read model state

2. **Organism components**: Per section in the actor view
   - **Form sections**: Fields derived from the `fields` array in the actor view. Input types (`select`, `radio`, `number`, `dynamic-list`) specified in the design.
   - **Data table sections**: Columns from `columns`, row actions from `row_actions`
   - **Card grid sections**: Card content and actions from the design

3. **Shared design system**: Atoms + molecules from `design_system.shared_components`
   - Follow Atomic Design: Button, Input, Card, Badge, Select, Table, Modal, FormField

### Step 11: State Management & API Integration

**Translate** the API contract endpoints into TanStack Query hooks and API client calls. Every hook maps to exactly one endpoint in the contract.

**Server state (TanStack Query):**

For each `query_endpoint` in the API contract:
```typescript
// hooks/useOrders.ts — maps to query_endpoint: GET /api/waiter/orders → OrderSummaryView read model
export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<OrderSummary[]>('/api/waiter/orders'),  // path from api_contract
    refetchInterval: 5000,  // from actor_views.data_sources.refresh
  });
}
```

For each `command_endpoint` in the API contract:
```typescript
// hooks/usePlaceOrder.ts — maps to command_endpoint: POST /api/waiter/orders → PlaceOrder command
export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: PlaceOrderRequest) =>
      api.post<PlaceOrderResponse>('/api/waiter/orders', request),  // path + DTOs from api_contract
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });  // from submit_action.on_success
    },
  });
}
```

**Traceability check**: Every hook MUST trace back to the API contract:
| Hook | Type | API Contract Endpoint | DDD Source |
|---|---|---|---|
| `useOrders` | query | `GET /api/waiter/orders` | OrderSummaryView read model |
| `usePlaceOrder` | mutation | `POST /api/waiter/orders` | PlaceOrder command |
| `useConfirmOrder` | mutation | `POST /api/cashier/orders/{id}/confirm` | ConfirmOrder command |

**Client state (Zustand):**

For UI-only state (notifications, role selection, form state):
```typescript
// useNotificationStore.ts
export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (msg) => set((s) => ({
    notifications: [...s.notifications, msg],
  })),
  dismiss: (id) => set((s) => ({
    notifications: s.notifications.filter((n) => n.id !== id),
  })),
}));
```

**API client:**

Generate from REST controller endpoints (Step 6):
```typescript
// client.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const api = {
  get: <T>(path: string) => fetch(`${API_BASE}${path}`).then(r => r.json() as T),
  post: <T>(path: string, body: unknown) =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json() as T),
};
```

### Step 12: Frontend Tests

From `04-specification/test-strategy.yaml` Testing Trophy:

#### MSW Mock Handlers (from API contract):

Generate one MSW handler per endpoint in `frontend-architecture.yaml` `api_contract`. Paths and response shapes MUST match the contract DTOs exactly.

```typescript
// mocks/handlers.ts — generated from api_contract command_endpoints + query_endpoints
import { http, HttpResponse } from 'msw';

export const handlers = [
  // GET /api/waiter/orders — from query_endpoint: OrderSummaryView read model
  http.get('/api/waiter/orders', () => {
    return HttpResponse.json([
      { orderId: 'order-1', tableNumber: 1, status: 'PLACED', totalCents: 850,
        items: [{ coffeeType: 'LATTE', cupSize: 'MEDIUM', quantity: 1 }] },
    ]);  // response shape matches OrderSummary response_dto
  }),

  // POST /api/waiter/orders — from command_endpoint: PlaceOrder command
  http.post('/api/waiter/orders', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { orderId: 'order-new', status: 'PLACED', totalCents: 450 },
      { status: 201 }
    );  // response shape matches PlaceOrderResponse response_dto
  }),
];
```

#### Integration Tests (~50%, thickest layer — Testing Library + MSW):

```typescript
// OrderForm.test.tsx — component + API integration
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderForm } from '../features/ordering/components/OrderForm';

test('places an order with selected items', async () => {
  render(<OrderForm />, { wrapper: TestProviders });

  // Select items
  await userEvent.selectOptions(screen.getByLabelText('Coffee Type'), 'LATTE');
  await userEvent.selectOptions(screen.getByLabelText('Size'), 'MEDIUM');
  await userEvent.type(screen.getByLabelText('Table'), '1');

  // Submit
  await userEvent.click(screen.getByRole('button', { name: /place order/i }));

  // Verify — MSW intercepts the API call
  await waitFor(() => {
    expect(screen.getByText(/order placed/i)).toBeInTheDocument();
  });
});
```

#### E2E Tests (Playwright — CUJ only):

From BDD feature files, implement critical user journeys:

```typescript
// e2e/order-lifecycle.spec.ts — from features/order-placement.feature
import { test, expect } from '@playwright/test';

test('full order lifecycle: place → confirm → prepare → deliver → complete', async ({ page }) => {
  // Waiter places order
  await page.goto('/waiter');
  await page.selectOption('[data-testid="coffee-type"]', 'LATTE');
  await page.selectOption('[data-testid="cup-size"]', 'MEDIUM');
  await page.fill('[data-testid="table-number"]', '1');
  await page.click('button:has-text("Place Order")');
  await expect(page.locator('[data-testid="order-status"]')).toHaveText('PLACED');

  // Counter staff confirms and records payment
  await page.goto('/cashier');
  await page.click('button:has-text("Confirm")');
  await page.fill('[data-testid="cash-amount"]', '500');
  await page.click('button:has-text("Record Payment")');

  // Barista prepares
  await page.goto('/barista');
  await expect(page.locator('[data-testid="prep-queue"]')).toContainText('LATTE');
  await page.click('button:has-text("Mark Prepared")');

  // Waiter delivers and completes
  await page.goto('/waiter');
  await page.click('button:has-text("Deliver")');
  await page.click('button:has-text("Complete")');
  await expect(page.locator('[data-testid="order-status"]')).toHaveText('COMPLETED');
});
```

#### Visual Regression (if Storybook enabled):

```typescript
// Storybook stories + Chromatic/Playwright screenshot comparison
// Each shared component gets a story:
// Button.stories.tsx, Card.stories.tsx, OrderForm.stories.tsx
```

### Step 13: Build and Verify (Full Stack)

1. **Backend**: Compile + unit tests + integration tests — all green
2. **Seed data verification**: For each service with initial data, `curl` the API endpoint and confirm the response is NOT empty. If empty, check `spring.jpa.hibernate.ddl-auto` vs `spring.sql.init.mode` configuration.
3. **Frontend-Backend contract alignment (MANDATORY)**:
   - For EVERY query endpoint used by the frontend, `curl` the actual backend API
   - **Shape check**: Compare the JSON response top-level structure with `types.ts` — is it an object or array? If `types.ts` expects `SalesReport{totalOrders, totalRevenue}` (object) but `curl` returns `[{orderId, ...}]` (array), the backend is returning raw records instead of the aggregated read model. Fix the backend.
   - **Field name check**: Compare every JSON field name with the frontend `types.ts` interface fields
   - **Path check**: Compare the actual API endpoint path with the Vite proxy config and `api.ts` — mismatched paths cause 404 or wrong-service routing
   - Common Jackson pitfalls: `boolean isX` serializes as `"x"` (drops `is` prefix); record field names may differ from YAML artifact names
   - **CQRS read model check**: For BCs using CQRS (e.g., Reporting), verify that the read model projection has data. If `curl` returns `[]` but upstream BC has data, the event listener/projection is broken.
   - Fix ALL mismatches before proceeding — a single mismatch causes silent `undefined` at runtime
4. **Frontend TypeScript check**: `npx tsc --noEmit` — ZERO errors (strict mode). Fix ALL before proceeding.
5. **Frontend build**: `npm run build` — zero errors
6. **Frontend unit/integration tests**: `npm test` — all green
7. **Frontend error state audit**: For EVERY page component, verify:
   - Loading state is handled (`isLoading` check)
   - Error state is handled (`isError` or `!data` check with user-facing message)
   - Every `useMutation` has `onError` callback
8. **Start both**: Backend on :8080, Frontend on :5173 (Vite dev server)
9. **Partial backend test**: Stop one backend service, verify the frontend shows error messages (not blank/broken pages)
10. **E2E tests**: `npx playwright test` — CUJ passes
11. **Full lifecycle smoke test**: Manual walkthrough of all actor views
12. **Verify API contract**: Frontend mutation hooks match backend REST endpoints exactly

## Output

### Backend code files in `{project}/src/`
### Frontend code files in `{project}-web/src/` (or `packages/web/src/`)

### `.arch/08-implementation/implementation-report.md`

```markdown
# Implementation Report

## Technology Stack
| Component | Choice | Version |
|---|---|---|
| Language (Backend) | Java | 21 |
| Framework (Backend) | Spring Boot | 3.4.x |
| Language (Frontend) | TypeScript | 5.x |
| Framework (Frontend) | React + Vite | 18.x + 5.x |
| State Management | TanStack Query + Zustand | 5.x + 4.x |
| ...

## Module Structure
### Backend
- {BC1}: {N} classes, {M} tests
- {BC2}: {N} classes, {M} tests

### Frontend
- Pages: {N} (one per actor view)
- Feature components: {N} across {M} BCs
- Shared components: {N} (design system)
- API hooks: {N} queries + {M} mutations

## Test Results
### Backend
- Unit tests: {N} passed
- Integration tests: {N} passed

### Frontend
- Component integration tests: {N} passed (Testing Library + MSW)
- E2E tests: {N} CUJs passed (Playwright)

## Known Issues / Deviations from Architecture
| # | Issue | Architecture Artifact | Resolution |
|---|---|---|---|
| 1 | {issue} | {artifact reference} | {how resolved} |

## API Endpoints
| Method | Path | Actor | Command | Frontend Hook |
|---|---|---|---|---|
| POST | /api/waiter/orders | Waiter | PlaceOrder | usePlaceOrder() |
| ...
```

## Completion

Present:
- Build status: backend (compile + tests) + frontend (build + tests)
- API endpoint summary with frontend hook mapping
- E2E test results (Playwright CUJs)
- Any deviations from architecture artifacts (with justification)
- Known issues or TODOs

$ARGUMENTS
