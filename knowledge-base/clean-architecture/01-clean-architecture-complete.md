# Clean Architecture (Robert C. Martin): Complete Reference

## Core Principles

### The Dependency Rule

**Source code dependencies can only point inward.** Nothing in an inner circle can know anything
about something in an outer circle — no names, functions, classes, variables, or data formats.

### Screaming Architecture

Top-level directory structure should **scream the use cases** of the application, not the
framework. You should see "Health Care System," not "Rails" or "Spring."

### The Concentric Circles

```
┌──────────────────────────────────────────────────┐
│  Frameworks & Drivers (Web, DB, UI, Devices)     │
│  ┌──────────────────────────────────────────┐    │
│  │  Interface Adapters                       │    │
│  │  (Controllers, Presenters, Gateways)      │    │
│  │  ┌──────────────────────────────────┐     │    │
│  │  │  Use Cases                        │     │    │
│  │  │  (Application Business Rules)     │     │    │
│  │  │  ┌──────────────────────────┐     │     │    │
│  │  │  │  Entities                 │     │     │    │
│  │  │  │  (Enterprise Biz Rules)   │     │     │    │
│  │  │  └──────────────────────────┘     │     │    │
│  │  └──────────────────────────────────┘     │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

Four circles are not mandatory — you may need more. The constant rule: **dependencies always
point inward, abstraction increases toward the center**.

### Independence

Systems are:
- **Independent of Frameworks** — Frameworks are tools, not constraints
- **Independent of the UI** — UI can change without changing business rules
- **Independent of the Database** — Swap Oracle for MongoDB without touching rules
- **Independent of any External Agency** — Business rules don't know about outside world

### Testability

Business rules can be tested **without UI, database, web server, or any external element**.

---

## The Layers in Detail

### Entities (Enterprise Business Rules) — Innermost

- Encapsulate enterprise-wide business rules
- Least likely to change when something external changes
- Could be used by many different applications
- **DDD mapping**: Entities, Value Objects, Aggregates, Domain Events

### Use Cases (Application Business Rules)

- Contain application-specific business logic
- Orchestrate data flow to/from entities
- Define **Input Ports** (interfaces controllers call) and **Output Ports** (interfaces presenters implement)
- Expect and produce **simple request/response data structures** (not Entity objects)

### Interface Adapters

- Convert data between use-case/entity format and external agency format
- Contains the MVC architecture: Controllers, Presenters, Views
- **Controllers**: Receive input, repackage into request model, pass to use case
- **Presenters**: Take output, format into ViewModel, pass to View
- **Gateways**: Convert between entity format and database format
- All SQL and database-specific code lives here

### Frameworks & Drivers (Outermost)

- Frameworks, tools, databases, web servers
- Very little code — mostly glue communicating inward
- "All the details go here": web is a detail, database is a detail
- These are **plugins** to the business rules

---

## Key Concepts

### Humble Objects Pattern

Split behavior into two modules:

| Boundary | Humble (Hard to Test) | Testable (Easy to Test) |
|----------|----------------------|------------------------|
| View/Presenter | View (renders ViewModel) | Presenter (formats data) |
| Database | Gateway implementation (SQL) | Use Case Interactors |
| ORM | ORM mapping code | Entity business logic |

Appears at **every architectural boundary**.

### Boundary Crossing and Data Transfer

- Control flow may oppose source code dependency (via DIP + polymorphism)
- Data crossing boundaries must be **simple data structures** (DTOs, structs)
- Never pass Entity objects or database rows across boundaries

### Input/Output Ports

- **Input Port (Driving)**: Interface in Use Case layer that Controller calls
- **Output Port (Driven)**: Interface in Use Case layer that Presenter implements
- Use Case layer has zero knowledge of Controllers or Presenters

### Presenters and View Models

- Presenter formats data into **ViewModel** with pre-formatted strings, flags
- View is humble: simply moves ViewModel data into display, zero logic
- ViewModel has fields for **every single thing** the View needs

### The Main Component (Ch.26)

- The ultimate detail — lowest-level policy
- Creates Factories, Strategies, wires dependency injection
- **Main is a plugin**: you can have multiple (Dev, Test, Production)
- Dependency injection frameworks inject into Main only

### Plugin Architecture

The entire Clean Architecture is a **plugin architecture**: business rules are the core,
everything else (DB, UI, web) are swappable plugins.

---

## SOLID at Architectural Level

| Class Level | Architecture Level |
|---|---|
| **SRP** | **Common Closure Principle (CCP)** — Gather classes that change for same reasons |
| **OCP** | Organize components hierarchically; high-level protected from low-level changes |
| **LSP** | Any adapter implementing a port can be swapped without inner layers knowing |
| **ISP** | Define narrow, role-specific interfaces (ports) |
| **DIP** | Inner circles define interfaces; outer circles provide implementations |

---

## Component Principles

### Cohesion (Tension Triangle — can only satisfy two)

| Principle | Description | Effect |
|---|---|---|
| **REP** (Reuse/Release Equivalence) | Granule of reuse = granule of release | Makes components larger |
| **CCP** (Common Closure) | Gather classes that change for same reasons | Makes components larger |
| **CRP** (Common Reuse) | Don't force users to depend on things they don't need | Makes components smaller |

Early: CCP + REP dominate (developability). Mature: CRP + REP (reusability).

### Coupling

| Principle | Description |
|---|---|
| **ADP** (Acyclic Dependencies) | No cycles in component dependency graph |
| **SDP** (Stable Dependencies) | Depend in the direction of stability. I = Fan-out / (Fan-in + Fan-out) |
| **SAP** (Stable Abstractions) | A component should be as abstract as it is stable. A + I ≈ 1 |

**The Main Sequence**: `D = |A + I - 1|` measures deviation.
- Near (0,0): **Zone of Pain** — stable but concrete
- Near (1,1): **Zone of Uselessness** — abstract but unstable

---

## Relationship to Hexagonal and Onion Architecture

| Clean Architecture | Hexagonal | Onion |
|---|---|---|
| Entities | Core (domain) | Domain Model |
| Use Cases | Core (application) | Application Services |
| Interface Adapters | Adapters | Infrastructure (inner) |
| Frameworks & Drivers | Adapters + External | Infrastructure (outer) |

### Key Differences

- **Hexagonal** doesn't prescribe internal layering (just inside/outside)
- **Onion** is structurally closest but uses different terminology
- **Clean Architecture** is most prescriptive about layers, includes Humble Objects and component principles

---

## Relationship to DDD

| Clean Architecture | DDD |
|---|---|
| Entities layer | Domain Layer (Entities, VOs, Aggregates, Events) |
| Use Cases layer | Application Layer (Application Services, Command/Query Handlers) |
| Interface Adapters | Infrastructure (Repository impl, Controllers, Presenters) |
| Frameworks & Drivers | Infrastructure (Frameworks, DB drivers, APIs) |

- Clean Architecture's "Entity" layer encompasses the **entire DDD Domain Model**
- DDD Application Services map to Clean Architecture **Use Case Interactors**
- DDD Repository interfaces in domain; implementations in Interface Adapters
- **Bounded Contexts** map to component organization (each BC has its own concentric circles)
