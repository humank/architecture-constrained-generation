# Chapter 12: Phase 8 — Implementation

![Code on a laptop screen — translating architecture into implementation](https://images.unsplash.com/photo-1661877737564-3dfd7282efcb?w=1200&h=400&fit=crop&q=80)

*Photo by [Unsplash](https://unsplash.com) — Free to use under [Unsplash License](https://unsplash.com/license)*

> *"The purpose of software engineering is to control complexity, not to create it."* — Pamela Zave
>
> Phase 8 is where all prior architecture artifacts converge into code. **You do NOT invent — you translate design into code.**

---

## The Core Principle

By the time you reach Phase 8, the system has been designed through seven prior phases. Every Bounded Context is mapped. Every Aggregate has invariants. Every domain event has been stormed. Every BDD scenario has acceptance criteria. Every API contract has request/response shapes. Every deployment target has been selected.

The implementation phase does not ask "what should we build?" — that question was answered in Phases 0 through 7. Phase 8 asks: **"Given all these constraints, what is the only correct code?"**

```
Phase 0 (Requirements)     → User stories, acceptance criteria
Phase 1 (Discovery)        → Events, commands, aggregates, policies
Phase 2 (Strategic Design) → Bounded Contexts, Context Map
Phase 3 (Tactical Design)  → Aggregate rules, Clean Architecture, API contracts
Phase 4 (Specification)    → BDD scenarios, test strategy
Phase 5 (Delivery)         → CI/CD, IaC, observability
Phase 6 (Review)           → Viewpoints, perspectives, ADRs
Phase 7 (Documentation)    → C4 diagrams, state machines, sequence diagrams
                                    │
                                    ▼
Phase 8 (Implementation)  → Code that provably implements all of the above
```

Every artifact constrains the code:

| Artifact | Constrains |
|---|---|
| Ubiquitous Language glossary | Class names, method names, variable names |
| Event Storm events | Domain event classes, event handlers |
| Aggregate invariants | Guard clauses, validation logic |
| BDD scenarios | Acceptance tests (outer loop) |
| API contracts | DTOs, controller endpoints, OpenAPI specs |
| Context Map relationships | Integration patterns (ACL, OHS, events) |
| State machine diagrams | Enum states, transition methods |
| Clean Architecture layers | Package structure, dependency direction |
| Deployment target | Infrastructure code, configuration |

---

## Pre-Implementation Assessment Gate

Before writing a single line of code, the Implementation phase opens with a **technology stack assessment**. This is a human-in-the-loop gate — the architect confirms or adjusts the stack.

### Technology Stack Questionnaire

| Decision | Options | Impact |
|---|---|---|
| **Language** | Java 21, Kotlin, TypeScript, Go | Pattern availability, type safety |
| **Framework** | Spring Boot 3.x, Quarkus, Micronaut | Annotation model, DI, testing |
| **Database** | PostgreSQL, MySQL, DynamoDB | JPA vs SDK, migration strategy |
| **Messaging** | SNS/SQS, Kafka, RabbitMQ | Event publishing patterns |
| **Deployment** | EKS, ECS, Lambda, EC2 | Packaging (container, JAR, native) |
| **Build tool** | Gradle (Kotlin DSL), Maven | Multi-module structure |
| **Test framework** | JUnit 5 + AssertJ, Kotest | BDD integration approach |
| **BDD framework** | Cucumber, custom step defs | Scenario-to-test mapping |

> **Why this gate matters**: A JPA entity cannot be a Java record. A DynamoDB model does not use `@Entity`. Choosing the wrong stack-to-pattern mapping produces code that fights the framework instead of leveraging it.

---

## Framework-Specific Constraints Checklist

Once the stack is confirmed, a **constraints checklist** is applied. Here is the checklist for the most common ACG stack: **Spring Boot 3.x + JPA/Hibernate + PostgreSQL**.

### Spring Boot Constraints

| Constraint | Rule | Rationale |
|---|---|---|
| **Bean naming** | Use Ubiquitous Language — `OrderService`, not `OrderSvc` | Glossary traceability |
| **Package structure** | `{bc}.domain`, `{bc}.application`, `{bc}.infrastructure`, `{bc}.api` | Clean Architecture layers |
| **Dependency direction** | `api → application → domain ← infrastructure` | Dependency Rule (domain has zero imports from outer layers) |
| **Configuration** | One `application.yml` per profile (`local`, `test`, `prod`) | Environment separation |
| **Event publishing** | `ApplicationEventPublisher` for intra-BC; SNS/SQS for cross-BC | BC isolation |

### JPA/Hibernate Gotchas

| Gotcha | Wrong | Right |
|---|---|---|
| **Entities as records** | `record Order(...)` with `@Entity` | `class Order` — JPA needs mutable state, default constructor |
| **Value Object mapping** | Separate table for `Money` | `@Embeddable` Money class embedded in entity |
| **Lazy loading outside transaction** | Access lazy collection in controller | Fetch in application service within `@Transactional` |
| **Aggregate root only** | Repository for `OrderItem` | Repository only for `Order` (the aggregate root) |
| **Optimistic locking** | No versioning | `@Version` on every aggregate root |

---

![Building blocks — assembling code from architecture patterns](https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=1200&h=400&fit=crop&q=80)

## Java 21 DDD Pattern Guide

Java 21 introduces language features that map directly to DDD tactical patterns. These six patterns form the implementation vocabulary for ACG.

### Pattern 1: Records for Value Objects

Value Objects are immutable, defined by their attributes (structural equality), and carry no identity. Java records are a perfect fit.

```java
// domain/model/vo/Money.java
public record Money(BigDecimal amount, Currency currency) {

    // Compact constructor — enforces invariants
    public Money {
        Objects.requireNonNull(amount, "amount must not be null");
        Objects.requireNonNull(currency, "currency must not be null");
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("amount must be non-negative");
        }
    }

    public Money add(Money other) {
        requireSameCurrency(other);
        return new Money(this.amount.add(other.amount), this.currency);
    }

    public Money multiply(int quantity) {
        return new Money(this.amount.multiply(BigDecimal.valueOf(quantity)), this.currency);
    }

    private void requireSameCurrency(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException(
                "Cannot combine %s with %s".formatted(this.currency, other.currency)
            );
        }
    }
}
```

**Why records?**
- `equals()` / `hashCode()` are structural — two `Money(5.00, USD)` instances are equal
- Immutable by design — no setter can corrupt the value
- Compact constructor validates invariants at creation time
- Transparent — fields are the API

### Pattern 2: Records for Domain Events

Domain events are immutable facts about something that happened. They carry data, have structural equality, and are never mutated after creation.

```java
// domain/event/DomainEvent.java
public interface DomainEvent {
    Instant occurredAt();
    String aggregateId();
}

// domain/event/OrderPlaced.java
public record OrderPlaced(
    String orderId,
    OrderType orderType,
    List<OrderItem> items,
    Money totalPrice,
    Instant occurredAt
) implements DomainEvent {

    public OrderPlaced {
        Objects.requireNonNull(orderId);
        Objects.requireNonNull(orderType);
        items = List.copyOf(items);  // defensive copy — immutable list
    }

    @Override
    public String aggregateId() {
        return orderId;
    }
}
```

**Traceability**: Every `record ... implements DomainEvent` maps 1:1 to an event from the Event Storm (Phase 1). If the event does not appear on the Event Storm wall, it should not exist in code.

### Pattern 3: Sealed Interfaces for Closed Type Hierarchies

Sealed interfaces enforce Bounded Context boundaries at **compile time**. If only three order statuses exist in the domain, the compiler guarantees no fourth status can sneak in.

```java
// domain/model/OrderStatus.java
public sealed interface OrderStatus
    permits OrderStatus.Placed, OrderStatus.Preparing, OrderStatus.Ready,
            OrderStatus.PickedUp, OrderStatus.Cancelled {

    record Placed(Instant at) implements OrderStatus {}
    record Preparing(Instant at, String baristaId) implements OrderStatus {}
    record Ready(Instant at) implements OrderStatus {}
    record PickedUp(Instant at) implements OrderStatus {}
    record Cancelled(Instant at, String reason) implements OrderStatus {}
}
```

**Why sealed?**
- The set of permitted subtypes comes from the **state machine diagram** (Phase 7)
- Adding a new status requires modifying the `permits` clause — a conscious design decision, not an accidental one
- Pattern matching (next pattern) becomes exhaustive — the compiler warns if you miss a case

### Pattern 4: Pattern Matching for Domain Logic Dispatch

Pattern matching with `switch` expressions replaces visitor patterns and long `if-else` chains. Combined with sealed interfaces, the compiler enforces exhaustiveness.

```java
// application/service/OrderService.java
public String describeStatus(OrderStatus status) {
    return switch (status) {
        case OrderStatus.Placed p     -> "Order placed at " + p.at();
        case OrderStatus.Preparing p  -> "Being prepared by " + p.baristaId();
        case OrderStatus.Ready r      -> "Ready for pickup since " + r.at();
        case OrderStatus.PickedUp p   -> "Picked up at " + p.at();
        case OrderStatus.Cancelled c  -> "Cancelled: " + c.reason();
    };
    // No default needed — sealed interface guarantees exhaustiveness
}
```

**If a new status is added to the sealed interface, every `switch` that dispatches on it will produce a compile error.** This is architecture enforcement through the type system.

### Pattern 5: Record Patterns (Deconstruction)

Record patterns allow direct extraction of record components inside pattern matching — eliminating temporary variables and getter chains.

```java
public Money calculateDiscount(OrderPlaced event) {
    return switch (event) {
        case OrderPlaced(var id, OrderType.DINE_IN, var items, var total, var at)
            when items.size() >= 5
            -> total.multiply(10).divide(100);  // 10% bulk dine-in discount

        case OrderPlaced(var id, OrderType.TAKE_AWAY, var items, var total, var at)
            -> total;  // no discount for take-away

        case OrderPlaced(var id, var type, var items, var total, var at)
            -> total;  // default: no discount
    };
}
```

**Traceability**: The guard clause `when items.size() >= 5` traces directly to a business rule from the Ubiquitous Language glossary or a BDD scenario's `Given` clause.

### Pattern 6: Behavior-on-Enum (Domain Knowledge Inside the Type)

Enums in DDD carry domain behavior, not just labels. When the Event Storm reveals that order types have different preparation rules, the enum encapsulates that knowledge.

```java
// domain/model/OrderType.java
public enum OrderType {
    DINE_IN {
        @Override public Money applyTax(Money subtotal) {
            return subtotal.multiply(110).divide(100);  // 10% dine-in tax
        }

        @Override public boolean requiresTableNumber() {
            return true;
        }
    },
    TAKE_AWAY {
        @Override public Money applyTax(Money subtotal) {
            return subtotal;  // no tax for take-away
        }

        @Override public boolean requiresTableNumber() {
            return false;
        }
    };

    public abstract Money applyTax(Money subtotal);
    public abstract boolean requiresTableNumber();
}
```

**Why behavior-on-enum?**
- Prevents scattered `if (orderType == DINE_IN)` checks across the codebase
- Adding a new enum value forces implementing all abstract methods — no missing cases
- Domain experts can verify: "Yes, dine-in has tax and needs a table number"

---

## When NOT to Use Records

Records are powerful, but they have a hard limitation: **JPA entities cannot be records.**

| Concept | Use Record? | Why |
|---|---|---|
| Value Object (`Money`, `Address`) | Yes | Immutable, structural equality |
| Domain Event (`OrderPlaced`) | Yes | Immutable fact |
| Command (`PlaceOrderCommand`) | Yes | Immutable instruction |
| DTO (`OrderResponse`) | Yes | Data carrier |
| **JPA Entity** (`Order`) | **No** | JPA requires default constructor, mutable state, proxy-friendly class |
| **Aggregate Root** (when persisted via JPA) | **No** | Same as above — JPA needs `setXxx()` for hydration |

### JPA Entity Pattern for Aggregates

```java
// domain/model/Order.java
@Entity
@Table(name = "orders")
public class Order {

    @Id
    private String id;

    @Version
    private Long version;  // optimistic locking

    @Enumerated(EnumType.STRING)
    private OrderType orderType;

    @Embedded
    private Money totalPrice;  // Value Object as @Embeddable

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderLineItem> items = new ArrayList<>();

    @Transient
    private final List<DomainEvent> domainEvents = new ArrayList<>();

    protected Order() {}  // JPA requires this

    // Factory method — enforces invariants at creation
    public static Order place(String id, OrderType orderType, List<OrderLineItem> items) {
        var order = new Order();
        order.id = id;
        order.orderType = orderType;
        order.items.addAll(items);
        order.totalPrice = calculateTotal(items, orderType);

        order.domainEvents.add(new OrderPlaced(
            id, orderType, items, order.totalPrice, Instant.now()
        ));

        return order;
    }

    public List<DomainEvent> domainEvents() {
        return Collections.unmodifiableList(domainEvents);
    }

    public void clearDomainEvents() {
        domainEvents.clear();
    }

    // ... domain behavior methods
}
```

> **Key insight**: The aggregate root collects domain events in a `@Transient` list. The application service publishes them after the transaction commits. This keeps the domain layer free of infrastructure concerns.

---

## Specification & Policy Patterns

Two patterns from Evans' *Domain-Driven Design* appear repeatedly in ACG implementations: **Specifications** and **Policies**.

### Specification Pattern (Evans, Chapter 9)

A Specification is a composable predicate that lives in the **domain layer**. It encapsulates a business rule as a first-class object.

```java
// domain/specification/Specification.java
@FunctionalInterface
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

// domain/specification/OrderReadyForPreparation.java
public class OrderReadyForPreparation implements Specification<Order> {

    @Override
    public boolean isSatisfiedBy(Order order) {
        return order.isPaid() && !order.items().isEmpty();
    }
}

// domain/specification/HighValueOrder.java
public class HighValueOrder implements Specification<Order> {

    private final Money threshold;

    public HighValueOrder(Money threshold) {
        this.threshold = threshold;
    }

    @Override
    public boolean isSatisfiedBy(Order order) {
        return order.totalPrice().isGreaterThanOrEqual(threshold);
    }
}
```

**Composition in use**:

```java
var spec = new OrderReadyForPreparation()
    .and(new HighValueOrder(Money.of(50, USD)));

orders.stream()
    .filter(spec::isSatisfiedBy)
    .forEach(priorityQueue::enqueue);
```

**Traceability**: Each specification class maps to a business rule in the Ubiquitous Language glossary. If the glossary says "An order is ready for preparation when it is paid and has at least one item," that sentence becomes `OrderReadyForPreparation`.

### DDD Policy Pattern (Strategy, Evans Chapter 12)

A Policy encapsulates a **varying business rule** — a strategy that can differ by context, configuration, or business decision.

```java
// domain/policy/PricingPolicy.java
public interface PricingPolicy {
    Money calculatePrice(List<OrderLineItem> items, OrderType orderType);
}

// domain/policy/StandardPricingPolicy.java
public class StandardPricingPolicy implements PricingPolicy {

    @Override
    public Money calculatePrice(List<OrderLineItem> items, OrderType orderType) {
        Money subtotal = items.stream()
            .map(item -> item.unitPrice().multiply(item.quantity()))
            .reduce(Money.ZERO_USD, Money::add);
        return orderType.applyTax(subtotal);
    }
}

// domain/policy/HappyHourPricingPolicy.java
public class HappyHourPricingPolicy implements PricingPolicy {

    private final int discountPercent;

    public HappyHourPricingPolicy(int discountPercent) {
        this.discountPercent = discountPercent;
    }

    @Override
    public Money calculatePrice(List<OrderLineItem> items, OrderType orderType) {
        Money subtotal = items.stream()
            .map(item -> item.unitPrice().multiply(item.quantity()))
            .reduce(Money.ZERO_USD, Money::add);
        Money discounted = subtotal.multiply(100 - discountPercent).divide(100);
        return orderType.applyTax(discounted);
    }
}
```

### Event Storm Policy to Event Handler Mapping

In the Event Storm (Phase 1), **Policies** are the lilac sticky notes that react to events and trigger commands. In code, they become **event handlers** in the application layer.

| Event Storm | Code |
|---|---|
| Lilac sticky: "When OrderPlaced, start preparation" | `@EventListener` method in application service |
| Lilac sticky: "When PaymentFailed, cancel order" | `@EventListener` method in application service |
| Lilac sticky: "When OrderReady, notify customer" | `@EventListener` method in application service |

```java
// application/handler/PreparationPolicyHandler.java
@Component
public class PreparationPolicyHandler {

    private final PreparationService preparationService;
    private final Specification<Order> readySpec;

    public PreparationPolicyHandler(PreparationService preparationService) {
        this.preparationService = preparationService;
        this.readySpec = new OrderReadyForPreparation();
    }

    @EventListener
    public void onOrderPlaced(OrderPlaced event) {
        // Policy: When an order is placed and ready, start preparation
        var order = // ... fetch order
        if (readySpec.isSatisfiedBy(order)) {
            preparationService.startPreparation(order.id());
        }
    }
}
```

> **The mapping rule**: Every lilac sticky on the Event Storm wall becomes an `@EventListener` method. If you have an event handler in code that does not correspond to a lilac sticky, you have invented behavior that was never designed. Remove it or go back to Phase 1.

---

## Implementation Process: Outside-In Double Loop TDD

Phase 8 does not generate all code at once. It follows the **Outside-In Double Loop** from Phase 4 (Specification), writing tests first and implementation second.

```
┌─────────────────────────────────────────────────────────────┐
│  OUTER LOOP: Acceptance Test (BDD Scenario)                 │
│                                                             │
│  1. Write acceptance test from BDD scenario ─── RED         │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  INNER LOOP: Unit Tests                               │  │
│  │                                                       │  │
│  │  2. Domain TDD ─── RED → GREEN → REFACTOR            │  │
│  │  3. Application TDD ─── RED → GREEN → REFACTOR       │  │
│  │  4. Infrastructure TDD ─── RED → GREEN → REFACTOR    │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  5. Acceptance test ─── GREEN                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 1: Acceptance Test RED (Outer Loop)

Start from a BDD scenario written in Phase 4:

```gherkin
# From Phase 4 specification
Scenario: Place a dine-in order
  Given the menu has "Latte" priced at $4.50
  And the menu has "Croissant" priced at $3.00
  When a customer places a dine-in order for 2 Lattes and 1 Croissant
  Then the order should be created with total $13.20
  And an OrderPlaced event should be published
  And the order type should be DINE_IN
```

```java
// Acceptance test — starts RED
@SpringBootTest
class PlaceDineInOrderAcceptanceTest {

    @Autowired OrderController controller;
    @Autowired TestEventCaptor eventCaptor;

    @Test
    void placeDineInOrder() {
        // Given
        var request = new PlaceOrderRequest(
            OrderType.DINE_IN,
            List.of(
                new OrderItemRequest("Latte", 2),
                new OrderItemRequest("Croissant", 1)
            ),
            5  // table number
        );

        // When
        var response = controller.placeOrder(request);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().totalPrice()).isEqualTo("13.20");
        assertThat(response.getBody().orderType()).isEqualTo("DINE_IN");
        assertThat(eventCaptor.captured()).hasSize(1);
        assertThat(eventCaptor.captured().get(0)).isInstanceOf(OrderPlaced.class);
    }
}
```

### Step 2: Domain TDD (Inner Loop)

Build domain objects to satisfy the acceptance test — starting with the innermost layer.

```
RED:   Money.add() fails — Money class doesn't exist
GREEN: Implement Money record with add()
REFACTOR: Extract Currency validation

RED:   Order.place() fails — Order class doesn't exist
GREEN: Implement Order.place() factory method
REFACTOR: Extract total calculation to OrderType.applyTax()

RED:   OrderPlaced event not emitted
GREEN: Add domainEvents list to Order, emit OrderPlaced in place()
REFACTOR: Extract event creation to private method
```

### Step 3: Application TDD (Inner Loop)

Build the application service that orchestrates the domain.

```
RED:   PlaceOrderUseCase.execute() fails — use case doesn't exist
GREEN: Implement use case: create Order, save, publish events
REFACTOR: Extract event publishing to EventPublisher port
```

### Step 4: Infrastructure TDD (Inner Loop)

Build the adapters that connect to external systems.

```
RED:   JPA OrderRepository fails — entity mapping doesn't exist
GREEN: Implement @Entity mapping, JpaRepository
REFACTOR: Add @Embeddable for Money

RED:   REST controller fails — endpoint doesn't exist
GREEN: Implement OrderController with @PostMapping
REFACTOR: Extract DTO mapping
```

### Step 5: Acceptance Test GREEN

With all layers implemented, the acceptance test turns green. The BDD scenario from Phase 4 is now executable code.

---

## Project Scaffolding

The project structure is generated based on the **deployment decision** from Phase 2 (Strategic Design).

### Modular Monolith (Spring Modulith)

```
coffeeshop/
├── build.gradle.kts
├── settings.gradle.kts
├── app/                          # Boot application
│   └── src/main/java/
│       └── com/coffeeshop/Application.java
├── ordering/                     # BC: Ordering
│   └── src/
│       ├── main/java/com/coffeeshop/ordering/
│       │   ├── domain/
│       │   │   ├── model/        # Aggregates, Entities, VOs
│       │   │   ├── event/        # Domain Events
│       │   │   ├── policy/       # Domain Policies
│       │   │   ├── specification/# Specifications
│       │   │   └── port/         # Repository interfaces (outbound)
│       │   ├── application/
│       │   │   ├── usecase/      # Use cases (inbound ports)
│       │   │   ├── service/      # Application services
│       │   │   └── handler/      # Event handlers (policies)
│       │   ├── infrastructure/
│       │   │   ├── persistence/  # JPA adapters
│       │   │   └── messaging/    # Event publishing adapters
│       │   └── api/
│       │       ├── rest/         # REST controllers
│       │       └── dto/          # Request/Response DTOs
│       └── test/java/com/coffeeshop/ordering/
│           ├── domain/           # Unit tests
│           ├── application/      # Integration tests
│           └── acceptance/       # BDD acceptance tests
├── preparation/                  # BC: Preparation
│   └── src/ ...                  # Same structure
└── payment/                      # BC: Payment
    └── src/ ...                  # Same structure
```

### Microservices

```
coffeeshop/
├── ordering-service/
│   ├── build.gradle.kts
│   ├── Dockerfile
│   └── src/
│       ├── main/java/com/coffeeshop/ordering/
│       │   ├── domain/           # Same Clean Architecture layers
│       │   ├── application/
│       │   ├── infrastructure/
│       │   └── api/
│       └── test/
├── preparation-service/
│   ├── build.gradle.kts
│   ├── Dockerfile
│   └── src/ ...
├── payment-service/
│   ├── build.gradle.kts
│   ├── Dockerfile
│   └── src/ ...
└── shared/
    └── events/                   # Shared event schemas (contract)
        └── src/main/java/com/coffeeshop/events/
            ├── OrderPlaced.java
            ├── PaymentCompleted.java
            └── OrderReady.java
```

> **Key difference**: In a modular monolith, events flow via Spring's `ApplicationEventPublisher`. In microservices, events flow via SNS/SQS (or Kafka), and the `shared/events` module defines the contract.

---

## Parallel Agent Protocol

When generating code for a multi-BC system, ACG uses a **parallel agent protocol** to maximize throughput while maintaining consistency.

### The Protocol

```
1. SCAFFOLD phase (sequential)
   └── Generate project structure, build files, shared modules

2. DOMAIN phase (parallel per BC)
   ├── Agent A: Ordering BC domain layer
   ├── Agent B: Preparation BC domain layer
   └── Agent C: Payment BC domain layer

3. APPLICATION phase (parallel per BC)
   ├── Agent A: Ordering BC application layer
   ├── Agent B: Preparation BC application layer
   └── Agent C: Payment BC application layer

4. INFRASTRUCTURE phase (parallel per BC)
   ├── Agent A: Ordering BC infrastructure layer
   ├── Agent B: Preparation BC infrastructure layer
   └── Agent C: Payment BC infrastructure layer

5. INTEGRATION phase (sequential)
   └── Cross-BC event wiring, end-to-end acceptance tests

6. VERIFY phase (sequential)
   └── Run all tests, check compilation, verify constraints
```

### Why This Order?

- **Domain first**: Domain layer has zero external dependencies — it can be built in isolation per BC
- **Parallel per BC**: Bounded Contexts are autonomous by definition — their internals do not depend on each other
- **Sequential integration**: Cross-BC wiring must happen after all BCs are individually complete
- **Verify last**: Full test suite runs only when all code exists

### Agent Constraints

Each parallel agent receives:
- The **glossary** for its BC (class names)
- The **aggregate design** for its BC (invariants, entities, VOs)
- The **BDD scenarios** for its BC (acceptance criteria)
- The **API contracts** for its BC (endpoint shapes)
- The **event catalog** for its BC (events it publishes and consumes)

No agent receives design artifacts from another BC. This enforces the same boundary in code generation that exists in the architecture.

---

## Traceability Matrix

The ultimate verification for Phase 8: every line of code traces back to an architecture artifact.

| Code Element | Traces To |
|---|---|
| `Money.java` (record) | Glossary: "Money — a monetary amount with currency" |
| `Order.java` (entity) | Aggregate Design: "Order aggregate root" |
| `OrderPlaced.java` (event) | Event Storm: orange sticky "OrderPlaced" |
| `OrderType.java` (enum) | Glossary: "DINE_IN, TAKE_AWAY" |
| `OrderReadyForPreparation.java` (spec) | Business Rule: "order is ready when paid and has items" |
| `StandardPricingPolicy.java` (policy) | Event Storm: lilac sticky "Calculate price" |
| `PlaceOrderUseCase.java` (use case) | BDD: "When a customer places an order..." |
| `OrderController.java` (REST) | API Contract: `POST /api/orders` |
| `OrderJpaRepository.java` (adapter) | Tactical Design: "OrderRepository port" |
| `PlaceDineInOrderAcceptanceTest.java` | BDD Scenario: "Place a dine-in order" |

**If a class exists in code but has no entry in this matrix, it was invented — not designed. Delete it or trace it back to a missing design artifact.**

---

## Output

```
.arch/08-implementation/
├── technology-stack.md           # Assessment gate results
├── framework-constraints.md      # Stack-specific rules
├── traceability-matrix.md        # Code ↔ artifact mapping
└── agent-protocol.md             # Parallel generation plan

src/                              # The actual generated code
├── ordering/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── api/
├── preparation/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── api/
└── payment/
    ├── domain/
    ├── application/
    ├── infrastructure/
    └── api/
```

---

## Key Takeaways

1. **You do NOT invent — you translate.** Every class, method, and test traces back to an artifact from Phases 0-7.
2. **Technology stack choice constrains patterns.** JPA entities cannot be records. DynamoDB models do not use `@Entity`. Choose first, then apply the right pattern guide.
3. **Java 21 features map to DDD patterns.** Records for VOs and events, sealed interfaces for type hierarchies, pattern matching for dispatch, behavior-on-enum for domain knowledge.
4. **Specifications and Policies are first-class code.** They are not just design concepts — they become classes with clear traceability to business rules.
5. **Outside-In Double Loop TDD is the process.** Start from BDD acceptance tests (outer loop), build domain-application-infrastructure in inner loops, end when acceptance tests pass.
6. **Parallel generation follows BC boundaries.** The same autonomy that makes good architecture makes good parallelism.

---

[← Previous: Phase 7 — Documentation](./11-phase-7-documentation.md) | [Table of Contents](./README.md) | [Next: Quality Gates & Feedback Loops →](./13-quality-gates-and-feedback-loops.md)
