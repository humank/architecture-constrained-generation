# DDD Part IV: Strategic Design — Maintaining Model Integrity

## Bounded Context (Ch.14)

An explicit boundary within which a domain model is defined and applicable. A single ubiquitous
language applies within each context. The same term may mean different things in different contexts.

### Continuous Integration (within a BC)

Within a single Bounded Context, frequent merging of all code and artifacts with automated tests
to catch fragmentation of the model.

---

## Context Map

A global view of all bounded contexts in the project and the relationships between them.

- Names each context
- Defines relationships and interfaces
- Makes integration points explicit
- Identifies upstream and downstream relationships

### Context Map Relationship Patterns

| Pattern | Description |
|---|---|
| **Partnership** | Two teams in two contexts succeed or fail together. Coordinated planning and joint management of integration. Mutual dependency |
| **Shared Kernel** | An explicit, small subset of the domain model that two teams agree to share. Changes require consultation with both teams. High communication/commitment required |
| **Customer-Supplier** | Upstream (supplier) and downstream (customer) relationship. Customer's needs influence upstream planning. Negotiated deliverables |
| **Conformist** | Downstream team conforms entirely to the upstream model. Eliminates complexity of translation. Appropriate when upstream has no motivation to serve downstream |
| **Anticorruption Layer (ACL)** | An isolating layer that translates between two models. Communicates with the other system in its language and translates internally. Essential for legacy integration. Implemented with Facades, Adapters, and Translators |
| **Open Host Service (OHS)** | Define a protocol that gives access to your subsystem as a set of services. Open the protocol so all who need integration can use it. Augment with specialized one-off protocols as needed |
| **Published Language** | A well-documented, shared language (often based on an industry standard) for expressing domain information. Common medium of communication between BCs. Evolution of OHS |
| **Separate Ways** | Declare BCs to have no connection at all. Allows independent development when integration cost exceeds benefit |
| **Big Ball of Mud** | Draw a boundary around an existing mess. Do not try to apply sophisticated modeling within this context. Be alert to the tendency for such systems to sprawl into other contexts |

### Transformations

Evans discusses patterns for changing relationships between contexts over time:

- Merging contexts
- Splitting contexts
- Evolving relationship types (e.g., Conformist → ACL as downstream team gains capability)

---

## Integrating Bounded Contexts (Vernon Ch.13)

### Integration Mechanisms

| Mechanism | Description |
|---|---|
| **RESTful Resources** | HTTP-based integration between contexts |
| **Messaging** | Asynchronous message-based integration |
| **Long-Running Processes** | Sagas and process managers in integration |

### Resilience Patterns

- Process State Machines and Time-out Trackers — Managing distributed process state
- When Messaging or System Is Unavailable — Handling failure scenarios
- Compensating Actions — Undoing partial transactions
