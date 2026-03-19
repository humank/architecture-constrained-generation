# OOAD (Object-Oriented Analysis and Design): Complete Reference

## OO Fundamental Principles

| Principle | Description |
|---|---|
| **Encapsulation** | Hide internal state and require interaction through well-defined interfaces |
| **Inheritance** | Derive new types from existing types, inheriting structure and behavior |
| **Polymorphism** | Objects of different types respond to the same message in different ways |
| **Abstraction** | Model essential characteristics while hiding unnecessary details |

---

## SOLID Principles

| Principle | Full Name | Description |
|---|---|---|
| **S** | Single Responsibility | A class should have one, and only one, reason to change |
| **O** | Open-Closed | Open for extension, closed for modification |
| **L** | Liskov Substitution | Subtypes must be substitutable for their base types |
| **I** | Interface Segregation | Clients should not depend on interfaces they don't use |
| **D** | Dependency Inversion | Depend on abstractions, not concretions |

---

## GRASP Patterns (Craig Larman)

General Responsibility Assignment Software Patterns — nine principles for assigning
responsibilities to classes.

| Pattern | Description |
|---|---|
| **Information Expert** | Assign responsibility to the class that has the information needed |
| **Creator** | Assign creation responsibility to the class that has the initializing data |
| **Controller** | Assign handling of system events to a non-UI class representing the use case |
| **Low Coupling** | Minimize dependencies between classes |
| **High Cohesion** | Keep classes focused on a single, well-defined purpose |
| **Polymorphism** | Handle type-based alternatives through polymorphism, not conditionals |
| **Pure Fabrication** | Create a class that doesn't represent a domain concept to achieve low coupling / high cohesion |
| **Indirection** | Assign responsibility to an intermediate object to decouple two components |
| **Protected Variations** | Wrap instability points behind stable interfaces |

---

## GoF Design Patterns (Gang of Four)

### Creational Patterns (5)

| Pattern | Purpose |
|---|---|
| **Abstract Factory** | Create families of related objects without specifying concrete classes |
| **Builder** | Construct complex objects step by step |
| **Factory Method** | Define interface for creating objects; let subclasses decide which class to instantiate |
| **Prototype** | Create objects by copying an existing object |
| **Singleton** | Ensure a class has only one instance with a global access point |

### Structural Patterns (7)

| Pattern | Purpose |
|---|---|
| **Adapter** | Convert interface of a class into another interface clients expect |
| **Bridge** | Decouple abstraction from implementation so both can vary independently |
| **Composite** | Compose objects into tree structures; treat individual and composite uniformly |
| **Decorator** | Attach additional responsibilities dynamically |
| **Facade** | Provide simplified interface to a subsystem |
| **Flyweight** | Share fine-grained objects efficiently |
| **Proxy** | Provide a surrogate to control access to an object |

### Behavioral Patterns (11)

| Pattern | Purpose |
|---|---|
| **Chain of Responsibility** | Pass request along a chain until one handles it |
| **Command** | Encapsulate a request as an object |
| **Interpreter** | Define a grammar and an interpreter for a language |
| **Iterator** | Access elements of a collection without exposing internals |
| **Mediator** | Define an object that encapsulates how objects interact |
| **Memento** | Capture and restore an object's internal state |
| **Observer** | When one object changes state, notify all dependents |
| **State** | Allow object behavior to change when internal state changes |
| **Strategy** | Define a family of algorithms, encapsulate each, and make them interchangeable |
| **Template Method** | Define algorithm skeleton; let subclasses override specific steps |
| **Visitor** | Define new operation on elements without changing their classes |

---

## Analysis Patterns (Martin Fowler)

High-level, domain-independent patterns frequently encountered in business domains.

| Pattern | Description |
|---|---|
| **Party** | Abstraction for Person and Organization |
| **Accountability** | Relationships of responsibility between parties |
| **Observation** | Recording measurements and observations |
| **Measurement** | Quantity with unit |
| **Range** | Effective date ranges for temporal data |
| **Money** | Amount with currency |

---

## CRC Cards (Class-Responsibility-Collaboration)

A workshop technique for discovering classes and their relationships.

| Section | Description |
|---|---|
| **Class Name** | Top of card — the candidate class |
| **Responsibilities** | Left side — what the class knows and does |
| **Collaborators** | Right side — other classes it works with |

### Process

1. Identify candidate classes from domain vocabulary
2. Write CRC cards for each
3. Walk through scenarios, assigning responsibilities
4. Discover missing classes and collaborations
5. Refine until design is satisfactory

---

## Responsibility-Driven Design (Rebecca Wirfs-Brock)

### Core Concepts

- **Objects as Responsible Agents** — Objects have roles and responsibilities, not just data
- **Roles** — A set of related responsibilities
- **Responsibilities** — Things an object knows (knowledge) or does (behavior)
- **Collaborations** — How objects work together to fulfill responsibilities

### Object Stereotypes

| Stereotype | Description |
|---|---|
| **Information Holder** | Knows things and provides information |
| **Structurer** | Maintains relationships between objects |
| **Service Provider** | Performs work and offers computing services |
| **Coordinator** | Delegates work to other objects |
| **Controller** | Makes decisions and directs others |
| **Interfacer** | Transforms information between system parts |

---

## Use Case-Driven Design

### Process

1. **Identify Actors** — Who interacts with the system?
2. **Identify Use Cases** — What does each actor want to accomplish?
3. **Write Use Case Descriptions** — Main flow, alternate flows, exceptions
4. **Identify Classes** — Extract nouns as candidate classes
5. **Assign Responsibilities** — Use GRASP patterns to assign behavior
6. **Design Interactions** — Sequence diagrams for use case realization
7. **Refine** — Iterate until design is satisfactory
