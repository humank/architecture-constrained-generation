# Rich Domain Model Design Principles

A constellation of principles from OO design literature that collectively define what makes a domain model "rich" vs "anemic." These principles reinforce each other and should be applied together during DDD tactical design and implementation.

---

## Core Behavioral Principles

### 1. Tell, Don't Ask

**Source:** Andy Hunt & Dave Thomas (The Pragmatic Programmers); Alec Sharp, *Smalltalk by Example* (1997); Martin Fowler (bliki, 2013)

**Principle:** Tell an object what to do — don't ask for its state and make decisions externally.

**Anti-pattern:**
```java
// BAD: asking, then deciding externally
if (order.getStatus() == CONFIRMED && order.getCashPaid() >= order.getTotal()) {
    order.setStatus(PAID);
    order.publishEvent(new PaymentReceived(...));
}
```

**Correct:**
```java
// GOOD: telling the object
order.recordPayment(cashAmount);  // Order decides internally if transition is valid
```

**DDD significance:** This is the single most important principle for rich Aggregates. If you follow it, business logic naturally migrates from Application Services into Entities and Value Objects.

---

### 2. Information Expert (GRASP)

**Source:** Craig Larman, *Applying UML and Patterns* (1997, 3rd ed. 2004)

**Principle:** Assign a responsibility to the class that has the information necessary to fulfill it.

**Application:** If `Order` holds `lineItems`, then `calculateTotal()` belongs on `Order`, not on an `OrderService`. If `Coffee` knows its recipe and ingredients, then `getIngredientsConsumed()` belongs on `Coffee`.

**DDD significance:** Information Expert is the diagnostic tool for discovering where behavior belongs. Every time you write logic in a Service that reads from an Entity, ask: "Does the Entity have the data to do this itself?"

---

### 3. Command-Query Separation (CQS)

**Source:** Bertrand Meyer, *Object-Oriented Software Construction* (1988, 2nd ed. 1997)

**Principle:** Every method should either be a **command** (changes state, returns void) or a **query** (returns data, no side effects) — never both. "Asking a question should not change the answer."

**Application:**
```java
// Command (mutates state)
public void confirm() { ... }

// Query (no side effects)
public Money getTotal() { ... }
public boolean canConfirm() { ... }
```

**DDD significance:** CQS keeps Aggregate interfaces clean. At the architectural level, it scales into CQRS (Command Query Responsibility Segregation). Within an Aggregate, it means mutation methods are commands and inspection methods are queries — never mixed.

---

### 4. Law of Demeter (Principle of Least Knowledge)

**Source:** Karl Lieberherr et al., Northeastern University (1987); also in Hunt & Thomas, *The Pragmatic Programmer* (1999)

**Principle:** A method should only talk to its immediate friends: its own object, its parameters, objects it creates, and its direct component objects. Don't chain through intermediaries.

**Anti-pattern:**
```java
// BAD: reaching through Aggregate internals
order.getItems().get(0).getUnitPrice().multiply(order.getItems().get(0).getQuantity());
```

**Correct:**
```java
// GOOD: ask the Aggregate Root
order.getLineTotal(itemId);
```

**DDD significance:** Enforces Aggregate boundaries. The Aggregate Root is the sole entry point; external code should never reach through the root to manipulate internal entities or value objects.

---

## Object Identity Principles

### 5. Objects Are Not Data Structures

**Source:** Robert C. Martin, *Clean Code* (2008), Ch.6; William Cook, "On Understanding Data Abstraction, Revisited" (OOPSLA 2009); David Parnas, "On the Criteria to Be Used in Decomposing Systems into Modules" (1972)

**Principle:** Objects hide data and expose behavior. Data structures expose data and have no meaningful behavior. These are **opposites**. An anemic domain model is a data structure masquerading as an object.

**Diagnostic question:** Does your Entity have more getters/setters than domain methods? If yes, it's a data structure, not an object.

**DDD significance:** This is the precise technical definition of the **Anemic Domain Model anti-pattern** that Evans warns against.

---

### 6. Alan Kay's Message-Passing Vision

**Source:** Alan Kay, Smalltalk (Xerox PARC, 1970s); Kay's email to Stefan Ram (2003): "The big idea is messaging."

**Principle:** OOP is fundamentally about autonomous objects communicating by sending messages — not data structures with attached procedures. Objects are like biological cells: they have hidden internal state, they respond to messages, and they can refuse or interpret messages however they choose.

**DDD significance:** Domain Events are literally messages between Aggregates. An Aggregate responding to a command is an object receiving a message and deciding how to handle it. The anti-pattern of exposing getters/setters and manipulating state externally is a direct violation of this vision.

---

### 7. Responsibility-Driven Design (RDD)

**Source:** Rebecca Wirfs-Brock & Brian Wilkerson (OOPSLA 1989); Wirfs-Brock, Wilkerson & Wiener, *Designing Object-Oriented Software* (1990); Wirfs-Brock & McKean, *Object Design: Roles, Responsibilities, and Collaborations* (2003)

**Principle:** Design objects by identifying their **roles** (what stereotype they play), **responsibilities** (what they know and what they do), and **collaborations** (how they work with others). Objects are autonomous agents with clearly assigned duties, not data containers.

**Roles (stereotypes):** Information Holder, Coordinator, Service Provider, Structurer, Controller, Interfacer.

**DDD significance:** Evans cites Wirfs-Brock in *Domain-Driven Design*. RDD is arguably the design philosophy most aligned with DDD tactical patterns. Thinking in responsibilities naturally produces rich Entities and Value Objects. The "object neighborhoods" concept prefigures Bounded Contexts.

---

### 8. CRC Cards (Class-Responsibility-Collaboration)

**Source:** Kent Beck & Ward Cunningham, "A Laboratory for Teaching Object-Oriented Thinking" (OOPSLA 1989)

**Principle:** A collaborative design technique using index cards with three sections: **Class name**, **Responsibilities** (what it knows and does), **Collaborators** (who it works with). Teams role-play scenarios by passing cards.

**DDD significance:** CRC sessions complement Event Storming for discovering Aggregates. The format forces thinking about behavior (responsibilities) over data (attributes), naturally producing rich domain models. "Collaborators" maps to how Aggregates interact via Domain Events or Domain Services.

---

## Anti-Getter Stance

### 9. "You Should Never Use Get and Set"

**Source:** Allen Holub, "Why Getter and Setter Methods Are Evil" (JavaWorld, 2003); *Holub on Patterns* (2004)

**Principle:** Getters and setters break encapsulation, turning objects into data structures. If you need a getter, the behavior that uses that data probably belongs on the object itself.

**Application:**
```java
// BAD: getter + external logic
int temp = order.getOrderType().equals("dine_in") ? 70 : 90;
coffee.setServingTemperature(temp);

// GOOD: behavior on the object
int temp = order.getOrderType().getServingTemperatureCelsius();  // behavior-on-enum
coffee.startPreparation(orderType);  // Coffee decides temperature internally
```

**DDD significance:** A more aggressive formulation of Tell Don't Ask. The principle holds strongly for the write/command side. Read models and API responses legitimately need data access — but the domain model's command side should minimize getters.

---

## Code Smells That Signal Anemic Models

### 10. Feature Envy

**Source:** Martin Fowler & Kent Beck, *Refactoring: Improving the Design of Existing Code* (1999, 2nd ed. 2018)

**Principle:** A method that seems more interested in another class's data than its own — it accesses getters of another object extensively to perform logic that belongs on that object.

**Refactoring:** Move Method — move the logic to the class whose data it uses.

**DDD significance:** Feature Envy in an Application Service or Domain Service is the diagnostic smell that reveals an anemic domain model. If the service reads data from an Entity, makes decisions, and writes data back, the behavior belongs on the Entity.

---

### 11. Primitive Obsession

**Source:** Martin Fowler, *Refactoring* (1999/2018)

**Principle:** Using primitive types (String, int, boolean) to represent domain concepts instead of creating proper types.

**Anti-pattern:**
```java
String foamLevel = "more_foam";   // raw String
String milkType = "soy";          // raw String
int amount = 120;                  // is this dollars? cents? yen?
```

**Correct:**
```java
FoamLevel foamLevel = FoamLevel.MORE_FOAM;  // type-safe enum
MilkType milkType = MilkType.SOY;            // type-safe enum
Money amount = new Money(120);                // Value Object
```

**DDD significance:** Resolved by introducing **Value Objects** and **domain concept enums** — DDD's most fundamental tactical patterns. Value Objects encapsulate validation, behavior, and type safety.

---

### 12. Data Clumps

**Source:** Martin Fowler, *Refactoring* (1999/2018)

**Principle:** Groups of data that frequently appear together (e.g., street, city, zip; or orderId, tableNo, orderType) should be extracted into their own object.

**DDD significance:** Data Clumps are Value Objects waiting to be discovered. Extracting them enriches the domain model and reveals concepts that were previously implicit.

---

## Encapsulation and Variation

### 13. Encapsulate What Varies

**Source:** Gang of Four, *Design Patterns* (1994); Freeman & Robson, *Head First Design Patterns* (2004)

**Principle:** Identify the aspects of your application that vary and separate them from what stays the same. Encapsulate the varying behavior behind stable interfaces.

**DDD significance:** Domain rules that vary (pricing strategies, validation rules, recipe calculations) should be encapsulated within domain objects — as Strategy patterns via Value Objects, Specifications, or Policies. This prevents business rule changes from rippling through services and infrastructure.

---

### 14. Specification Pattern

**Source:** Eric Evans & Martin Fowler, joint paper "Specifications" (1997); Evans, *Domain-Driven Design* (2003), Ch.9

**Principle:** Encapsulate a business rule as a first-class object that answers whether a candidate satisfies the rule. Specifications compose with AND, OR, NOT.

```java
Specification<Order> largeOrder = new OrderTotalExceeds(new Money(500));
Specification<Order> paidOrder = new OrderInStatus(OrderStatus.PAID);
Specification<Order> target = largeOrder.and(paidOrder);

if (target.isSatisfiedBy(order)) { ... }
```

**DDD significance:** Keeps complex business predicates inside the domain layer. A direct application of both Information Expert and Encapsulate What Varies.

---

### 15. Open-Closed Principle (Polymorphic Sense)

**Source:** Bertrand Meyer, *Object-Oriented Software Construction* (1988); Robert C. Martin, *Agile Software Development* (2002)

**Principle:** Open for extension, closed for modification — add new behavior via polymorphism, not by changing existing code.

**DDD significance:** Domain models that use polymorphic Value Objects or Strategy patterns (e.g., different pricing policies) follow OCP. New business rules become new classes. Sealed interfaces in Java 21 provide a **controlled** form of OCP — closed to external extension but exhaustive within the BC.

---

## Supple Design Principles (Eric Evans)

### 16. Intention-Revealing Interfaces

**Source:** Eric Evans, *Domain-Driven Design* (2003), Ch.10

**Principle:** Name classes and methods to express what they do in domain terms, not how they do it.

```java
// BAD
checker.check(loan, today, 30);

// GOOD
policy.isOverdue(loan);
```

**DDD significance:** How Ubiquitous Language manifests in code. Combined with Tell Don't Ask, produces APIs like `order.recordPayment(cash)` that are self-documenting.

---

### 17. Side-Effect-Free Functions

**Source:** Eric Evans, *Domain-Driven Design* (2003), Ch.10

**Principle:** Operations that return results should not produce side effects. Value Objects, being immutable, naturally support this.

```java
Money total = price.multiply(quantity).add(surcharge);  // no mutation, new Money each time
```

**DDD significance:** Immutable Value Objects with side-effect-free functions are the computational backbone of a rich domain model. Complex calculations belong on Value Objects precisely because their predictability makes them composable and testable.

---

## Summary: The Constellation

| Concern | Principles | Diagnostic Question |
|---|---|---|
| **Where does behavior go?** | Tell Don't Ask, Information Expert, Feature Envy | "Am I asking for data then deciding, or telling the object to act?" |
| **How do objects communicate?** | Law of Demeter, Message Passing, Domain Events | "Am I reaching through objects or talking to my immediate neighbor?" |
| **What do objects expose?** | CQS, Anti-Getter, Intention-Revealing Interfaces | "Does my method name express a domain concept?" |
| **How do I model values?** | Primitive Obsession, Data Clumps, Side-Effect-Free Functions | "Am I using String/int where a Value Object belongs?" |
| **How do I handle varying rules?** | Encapsulate What Varies, Specification, OCP | "Is this business rule a first-class object or scattered in if-else?" |
| **What is an object?** | Objects ≠ Data Structures, RDD, Kay's Vision | "Does this class have more getters than domain methods?" |

**The anemic domain model violates nearly all of these simultaneously. A rich domain model is what you get when you follow them.**

---

## Java 21 Alignment

These principles map naturally to Java 21 language features:

| Principle | Java 21 Feature |
|---|---|
| Side-Effect-Free Functions + Primitive Obsession → Value Objects | **Records** (immutable, structural equality) |
| Domain Events are immutable facts | **Records implementing DomainEvent interface** |
| Closed type hierarchies within a BC | **Sealed interfaces** |
| Tell Don't Ask + Encapsulate What Varies | **Behavior-on-enum** (domain knowledge inside the type) |
| Information Expert + reduce Feature Envy | **Pattern matching switch** (dispatch logic stays close to data) |
| Objects ≠ Data Structures | **Records for immutable concepts, classes for mutable Entities** — clear separation |
