# DDD Architecture Patterns (Vernon IDDD Ch.4)

## Hexagonal Architecture / Ports and Adapters

Vernon's strongly advocated foundation for DDD implementations.

> "The hexagonal architecture forms the strong foundation for supporting any and all those
> additional architectural options."

### Core Concepts

- **Ports** — Interfaces defining how the application interacts with the outside world
  - **Driving Ports (Primary)** — How the outside world drives the application (e.g., REST API,
    CLI, message consumer)
  - **Driven Ports (Secondary)** — How the application drives external systems (e.g., database,
    message publisher, email service)
- **Adapters** — Implementations of ports for specific technologies
  - **Driving Adapters** — Translate external input to application calls
  - **Driven Adapters** — Translate application calls to external system interactions

### Relationship to Layered Architecture

```
┌──────────────────────────────────────────┐
│            Driving Adapters              │
│  (REST, gRPC, CLI, Message Consumer)     │
│         ┌────────────────────┐           │
│         │   Application      │           │
│         │   ┌────────────┐   │           │
│         │   │   Domain   │   │           │
│         │   └────────────┘   │           │
│         └────────────────────┘           │
│            Driven Adapters               │
│  (DB, Message Publisher, External APIs)  │
└──────────────────────────────────────────┘
```

- **Dependency Inversion Principle (DIP)** — Higher-level modules (domain) should not depend on
  lower-level modules (infrastructure). Both depend on abstractions (ports).

---

## CQRS (Command-Query Responsibility Segregation)

Separate models for reading and writing.

| Aspect | Command Model | Query Model (Read Model) |
|---|---|---|
| Purpose | Handles writes, enforces invariants | Optimized for queries |
| Structure | Rich domain model with behavior | Denormalized, flat views |
| Consistency | Strongly consistent | Eventually consistent (typically) |
| Storage | Normalized domain store | Optimized read store(s) |

- Can be used independently of Event Sourcing
- Enables independent scaling of read and write sides
- Different query models can serve different use cases

---

## Event Sourcing

Persisting all changes as a sequence of events rather than current state.

### Core Concepts

- **Event Store** — The source of truth; append-only log of all domain events
- **Rebuilding State** — Replay events from the beginning to reconstruct current state
- **Snapshots** — Periodic state snapshots for replay performance optimization
- **Read Model Projections** — Building query-optimized views from events
- **Event Serialization and Immutability** — Events are immutable once persisted
- **Concurrency Control** — Optimistic concurrency with event stream versions
- **Structural Freedom** — Event sourcing liberates from ORM constraints

### Relationship to CQRS

Event Sourcing is often combined with CQRS:

```
Command → Aggregate → Domain Events → Event Store
                                    ↓
                              Projections → Read Model(s)
```

---

## Long-Running Processes / Sagas

### Process Manager

Orchestrates multi-step business processes across aggregates/bounded contexts.

- **State Machines** — Tracking process state through well-defined transitions
- **Time-out Trackers** — Handling timeouts in distributed processes
- **Compensating Actions** — Undoing partial transactions on failure

### Saga Patterns

| Pattern | Description |
|---|---|
| **Choreography-Based** | Event-driven, no central orchestrator. Services listen to events autonomously |
| **Orchestration-Based** | Central orchestrator manages the flow and coordination |

---

## Event-Driven Architecture

- **Pipes and Filters** — Event processing pipelines
- **Autonomous Services** — Services decoupled through events
- **Latency Tolerances** — Designing for eventual consistency delays

---

## Anti-Patterns

- **Anemic Domain Model** — Domain objects are mere data containers with no behavior. All logic
  lives in services. Violates the core principle of rich domain models.
- **DDD-Lite** — Applying only tactical patterns without strategic design. Missing the most
  valuable parts of DDD (bounded contexts, context mapping, distillation).
