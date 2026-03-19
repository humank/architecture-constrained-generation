# Distributed Consistency Patterns

## 1. The Problem

Distributed systems must replicate or partition data across nodes. The **CAP theorem** (Brewer, 2000)
states that a distributed data store can guarantee at most two of three properties simultaneously:

| Property | Meaning |
|---|---|
| **Consistency** | Every read receives the most recent write |
| **Availability** | Every request receives a non-error response |
| **Partition Tolerance** | System continues operating despite network partitions |

Since network partitions are unavoidable, the real trade-off is **C vs A** during a partition. In
microservices, each service owns its data store, so cross-service consistency cannot rely on shared
transactions. Instead, the system must use patterns that embrace eventual consistency while providing
the guarantees the business actually needs.

**Key insight**: Strong consistency is a spectrum, not a binary. Choose the weakest consistency model
that satisfies business requirements -- stronger consistency costs availability and latency.

---

## 2. Saga Pattern

A saga is a sequence of local transactions across multiple services. Each local transaction updates
its own database and publishes an event or message to trigger the next step. If any step fails,
compensating transactions undo the preceding steps.

### Choreography

Each service publishes domain events; the next service in the chain reacts autonomously.

```
Order Service          Payment Service         Inventory Service
     │                       │                        │
     ├─ OrderCreated ───────►│                        │
     │                       ├─ PaymentCharged ──────►│
     │                       │                        ├─ InventoryReserved ──►
     │                       │                        │
```

- **Pros**: Simple to implement, no central coordinator, loose coupling, each service is independent
- **Cons**: Hard to track overall saga state, difficult to debug, risk of cyclic dependencies,
  business logic scattered across services
- **Best for**: Simple sagas with few steps (2-4 participants)

### Orchestration

A central **saga orchestrator** (sometimes called a process manager) sends commands to participants
and receives replies. The orchestrator owns the saga's state machine.

```
              Saga Orchestrator
             ┌───────────────────┐
             │ State: STARTED     │
             │                   │
             │ 1. CreateOrder ──►│──► Order Service
             │ 2. ChargePayment ►│──► Payment Service
             │ 3. ReserveStock ─►│──► Inventory Service
             │                   │
             │ State: COMPLETED  │
             └───────────────────┘
```

- **Pros**: Easy to understand flow, centralized debugging, avoids cyclic dependencies,
  orchestrator owns the "happy path" and compensation logic
- **Cons**: Risk of concentrating too much logic in orchestrator (anemic services),
  orchestrator is an additional component to deploy and manage
- **Best for**: Complex sagas with many steps, conditional branching, or business-critical flows

### Compensating Transactions

When a saga step fails, previous steps must be **semantically undone** -- this is not a database
rollback. Each step defines a compensating action that reverses its business effect.

| Step | Action | Compensation |
|---|---|---|
| 1. Create Order | `OrderCreated` | `OrderCancelled` |
| 2. Charge Payment | `PaymentCharged` | `PaymentRefunded` |
| 3. Reserve Inventory | `InventoryReserved` | `InventoryReleased` |

Compensations execute in **reverse order**. Some actions cannot be compensated (e.g., sending an
email) -- these are handled by the pivot transaction concept.

### Saga Execution Coordinator (SEC)

A persistent component that:

- Stores the current state of each saga instance (which step, which participants have responded)
- Handles retries for failed or timed-out steps
- Triggers compensations on failure
- Manages saga lifecycle (start, step transitions, completion, abortion)
- Typically backed by a durable store (database, event log)

Implementation: the SEC is often implemented as a state machine persisted in a database or event
store, with a message consumer driving transitions.

### Pivot Transaction

The **point of no return** in a saga -- the step after which the saga will always complete (never
compensate). Steps before the pivot are **compensatable**; steps after are **retriable** (must
eventually succeed).

```
Compensatable ──► Compensatable ──► PIVOT ──► Retriable ──► Retriable
     ◄── can undo ──┘                    └── must succeed ──►
```

Design rule: place the pivot at the most critical business decision (e.g., payment authorization).
Steps after the pivot must be designed as retriable (idempotent, with retries and timeouts).

### Design Considerations

**ACD properties** (no Isolation from ACID):

| Property | Saga Guarantee |
|---|---|
| **Atomicity** | Saga completes all steps or compensates all completed steps |
| **Consistency** | Business rules are satisfied at saga completion, but may be temporarily violated mid-saga |
| **Durability** | Each local transaction is durable in its own database |
| **Isolation** | **NOT guaranteed** -- other transactions can see intermediate states |

**Lack of isolation** countermeasures:

- **Semantic lock**: Set a flag indicating a resource is part of an in-progress saga (e.g., order
  status = `APPROVAL_PENDING`). Other operations check this flag before proceeding.
- **Commutative updates**: Design updates so order doesn't matter (e.g., credit/debit vs. set
  balance)
- **Pessimistic view**: Reorder saga steps to reduce business risk (place riskiest step first)
- **Reread value**: Re-read data before updating to detect concurrent changes (optimistic
  concurrency)
- **Version file**: Record operations in a log and reorder them to produce a correct outcome

### Connection to DDD

- A saga maps to the **Process Manager** pattern (Vernon) -- a long-running process that
  coordinates activities across aggregate boundaries
- In **Event Storming**, policy stickies (lilac/purple) between events often represent saga steps:
  "When PaymentReceived, then ReserveInventory"
- Saga boundaries should align with **aggregate boundaries** -- each saga step is a command to a
  single aggregate
- Sagas implement cross-aggregate eventual consistency (Vernon's Rule 4)

---

## 3. Idempotency Patterns

### Why Idempotency Matters

In distributed messaging, **at-least-once delivery** is the practical guarantee (exactly-once is
extremely hard to achieve end-to-end). This means consumers will receive duplicate messages.
Without idempotency, duplicates cause:

- Double charges, double shipments, duplicate records
- Incorrect counters or balances
- Violated business invariants

**Rule**: Every message handler in a distributed system must be idempotent.

### Idempotency Key

The client generates a **unique key** (typically UUID) for each logical operation and includes it
in every request/message. The server uses this key to detect and ignore duplicates.

```
POST /payments
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
{ amount: 100, currency: "USD" }
```

- First request: process and store result keyed by idempotency key
- Subsequent requests with same key: return stored result without re-processing
- Key expiration: expire stored results after a business-appropriate TTL

### Deduplication Table

Store processed message IDs in a dedicated table. Before processing, check if the message ID
exists.

```sql
-- Atomic check-and-process (within same transaction as business logic)
INSERT INTO processed_messages (message_id, processed_at)
VALUES ('msg-123', NOW())
ON CONFLICT (message_id) DO NOTHING;

-- If rows_affected = 0, message was already processed; skip
-- If rows_affected = 1, proceed with business logic
```

**Critical**: The deduplication check and business logic must be in the **same local transaction**.
Otherwise, a crash between the check and the business logic creates a gap.

### Natural Idempotency

Some operations are inherently idempotent and need no special handling:

| Idempotent | NOT Idempotent |
|---|---|
| `SET balance = 100` | `INCREMENT balance BY 10` |
| `DELETE WHERE id = X` | `INSERT INTO orders (...)` |
| `PUT /users/123 { name: "Alice" }` | `POST /orders { ... }` |
| Upsert operations | Append operations |

**Design tip**: Prefer idempotent operations where possible. Use "set to absolute value" instead of
"adjust by delta."

### Idempotent Consumer Pattern

Each consumer tracks which events it has processed, scoped to its consumer identity:

```
┌───────────────────────────────────┐
│ Consumer: inventory-projection     │
│ Last processed event ID: evt-456  │
│ Processed IDs: { evt-123, ... }   │
└───────────────────────────────────┘
```

For event-sourced systems, consumers can track their **position in the event stream** (offset/
sequence number) rather than individual message IDs -- simpler and more storage-efficient.

---

## 4. Eventual Consistency Patterns

When services embrace eventual consistency, different **consistency models** govern what a client
can observe.

### Read-Your-Writes Consistency (Session Consistency)

A client always sees its own writes, even if other clients see stale data. The client's view is
**causally consistent with its own actions**.

**Techniques**:
- Sticky sessions: route the user to the same replica that received their write
- Read from primary: after a write, read from the primary (not a replica) for a short window
- Write timestamp: client sends timestamp of its last write; server ensures the replica is at
  least that fresh

### Causal Consistency

If event A causally precedes event B, all nodes see A before B. Unrelated events may be observed
in any order.

**Techniques**:
- **Vector clocks**: Each node maintains a vector of logical timestamps; compare vectors to
  determine causal ordering
- **Lamport timestamps**: Single logical clock; weaker than vector clocks but simpler
- **Causal metadata in messages**: Attach causal context (parent event IDs) to events

### Monotonic Reads

Once a client reads a value at version N, it never subsequently reads a version older than N.
Prevents the "time travel" problem where refreshing a page shows older data.

**Techniques**:
- Sticky sessions (same as read-your-writes)
- Client-side version tracking: client sends last-seen version, server ensures response is
  at least that version
- Monotonic read token: server issues a token representing the read position

### Version Vectors

A vector of `(node, counter)` pairs used to detect concurrent writes and establish causal
ordering:

```
Node A: [A:3, B:2]  -- A has seen 3 of its own writes and 2 from B
Node B: [A:2, B:4]  -- B has seen 2 from A and 4 of its own writes

Compare: neither dominates the other → concurrent/conflicting writes
         one dominates → causal ordering established
```

Used in: Amazon DynamoDB (internally), Riak, CRDTs.

---

## 5. Two-Phase Commit (2PC)

### How It Works

A **coordinator** orchestrates a distributed transaction across multiple participants:

```
Phase 1: PREPARE
  Coordinator ──► "Can you commit?" ──► Participant A
  Coordinator ──► "Can you commit?" ──► Participant B
  Participant A ──► "Yes (VOTE_COMMIT)" ──► Coordinator
  Participant B ──► "Yes (VOTE_COMMIT)" ──► Coordinator

Phase 2: COMMIT (if all voted yes)
  Coordinator ──► "COMMIT" ──► Participant A
  Coordinator ──► "COMMIT" ──► Participant B

Phase 2: ABORT (if any voted no)
  Coordinator ──► "ABORT" ──► All Participants
```

Between PREPARE and COMMIT/ABORT, participants hold **locks** on the affected resources. This is
the critical vulnerability.

### Why It's Avoided in Microservices

| Problem | Impact |
|---|---|
| **Blocking** | Participants hold locks while waiting for coordinator's decision; if coordinator fails, locks are held indefinitely |
| **Coordinator is SPOF** | If coordinator crashes after PREPARE but before COMMIT, participants are stuck in an uncertain state |
| **Latency** | Two synchronous network round-trips minimum; locks held throughout |
| **Tight coupling** | All participants must implement the 2PC protocol; heterogeneous systems are difficult |
| **Doesn't scale** | Lock duration grows with number of participants and network latency |

### When It's Still Useful

- **Within a single database cluster**: Coordinating across shards or replicas of the same database
  (e.g., PostgreSQL prepared transactions, MySQL XA)
- **Homogeneous systems**: When all participants run the same database engine
- **Short-lived transactions**: When lock duration is bounded and brief
- **Strong consistency is non-negotiable**: Financial settlement, regulatory requirements where
  eventual consistency is unacceptable

---

## 6. Outbox Pattern (Consistency Focus)

### The Problem

A service must atomically update its database AND publish an event. Without atomicity, crashes
between the two operations cause data/event divergence:

```
1. UPDATE orders SET status = 'confirmed'  ← succeeds
2. PUBLISH OrderConfirmed event            ← service crashes before this
Result: DB is updated but event is never published → inconsistent
```

### The Solution

Write the event to an **outbox table** in the same local database transaction as the business
data change:

```sql
BEGIN;
  UPDATE orders SET status = 'confirmed' WHERE id = 123;
  INSERT INTO outbox (id, aggregate_type, aggregate_id, event_type, payload)
    VALUES (uuid(), 'Order', '123', 'OrderConfirmed', '{ ... }');
COMMIT;
```

A separate process reads the outbox and publishes events to the message broker.

### Delivery Mechanisms

| Mechanism | How | Trade-offs |
|---|---|---|
| **Polling Publisher** | Periodically queries outbox table for unpublished events | Simple; adds DB load; publishing latency = poll interval |
| **CDC (Change Data Capture)** | Tails the database transaction log (e.g., Debezium reading PostgreSQL WAL or MySQL binlog) | Near-real-time; no polling overhead; requires CDC infrastructure |

Both mechanisms must handle **at-least-once delivery** -- the consumer side needs idempotency
(see Section 3).

### Connection to DDD Aggregates

The outbox pattern aligns naturally with aggregate design:

- An aggregate command handler performs a state change and emits domain events
- Both the state change and the events are persisted in one local transaction
- The outbox holds the events until they are reliably published
- One aggregate = one transactional boundary = one outbox write

In event-sourced systems, the event store IS the outbox -- events are the primary storage, and
subscribers read directly from the event log.

---

## 7. CQRS Consistency

### Write Model vs Read Model

In CQRS, commands mutate the write model (source of truth), and events are projected into
optimized read models. The read model is **eventually consistent** with the write model.

```
Command ──► Write Model ──► Event ──► Projection ──► Read Model
                                         │
                                    (async, lag)
```

### Projection Lag

The time between a write and its visibility in the read model. Sources of lag:

- Message broker delivery latency
- Projection processing time
- Batching strategies in the projector
- Failures and retries

**Measuring lag**: Track the timestamp of the last projected event vs. the latest event in the
write store. Alert when lag exceeds business-acceptable thresholds.

### Dealing with Stale Reads

| UI Pattern | How It Works | When to Use |
|---|---|---|
| **Optimistic Updates** | UI immediately reflects the change before server confirms; roll back on failure | High-frequency interactions (e.g., toggle, like button) |
| **Polling** | Client periodically re-fetches the read model until it reflects the expected change | Simple; acceptable for non-real-time UIs |
| **WebSocket / SSE** | Server pushes updates to client when the read model is updated | Real-time dashboards, collaborative editing |
| **Read-from-write-store** | Immediately after a command, read from the write model (bypass read model) | Critical flows where stale reads are unacceptable |
| **Version-based** | Command returns a version number; client polls read model until version >= returned version | Precise consistency without over-reading |

**Design principle**: Accept eventual consistency as the default. Add stronger consistency
mechanisms only where the business or UX explicitly requires it.

---

## 8. Connection to Methodologies

### DDD

- **Aggregate boundary = consistency boundary**: Strong consistency within an aggregate,
  eventual consistency across aggregates (Vernon's Rule 4: "Update other aggregates using
  eventual consistency")
- Sagas coordinate cross-aggregate workflows; each saga step targets one aggregate
- The outbox pattern ensures reliable event publishing from aggregate command handling
- Bounded Context integration is inherently eventually consistent

### Event Modeling

- The **Automation pattern** (orange event → processor → blue command) implements saga steps
  and process managers
- Each automation slice is a single saga step: "Given these events, issue this command"
- The event model timeline naturally visualizes saga flows across swimlanes
- Information completeness ensures all saga steps have the data they need

### Event Storming

- **Policy stickies** (lilac/purple) placed between events represent reactive logic -- often
  saga steps: "When [Event], then [Command]"
- Chains of event → policy → command → event across bounded contexts reveal saga patterns
- Hotspots on policies often indicate consistency challenges worth deeper analysis
- Process Modeling level Event Storming explicitly maps out saga flows

### Contract Testing

- Saga participants communicate via messages (commands and events)
- **Consumer-driven contracts** ensure that event schemas remain compatible as producers evolve
- Each saga step is a consumer of the previous step's event and a producer of the next
- Schema evolution must be backward-compatible to avoid breaking in-flight sagas
- Pact or similar tools can verify message contracts between saga participants

### AWS

| Pattern | AWS Service | Notes |
|---|---|---|
| **Orchestrated Saga** | Step Functions | Express Workflows for short sagas (<5 min); Standard for long-running. Built-in retry, catch, compensation via `Catch`/`ResultPath` |
| **Choreographed Saga** | EventBridge + SQS/SNS | EventBridge rules route events to downstream services; SQS provides at-least-once delivery with visibility timeout |
| **Outbox + CDC** | DynamoDB Streams / Kinesis Data Streams | DynamoDB Streams provides CDC from DynamoDB tables; pipe to Lambda or Kinesis |
| **Local Consistency** | DynamoDB Transactions | `TransactWriteItems` for atomic writes across up to 100 items (25 per table); ACID within a single DynamoDB table/index |
| **Deduplication** | SQS FIFO (content-based dedup) | 5-minute deduplication window; use `MessageDeduplicationId` |
| **CQRS Read Model** | DynamoDB + Lambda projections | Stream events from write store → Lambda → denormalized DynamoDB read table |
| **2PC (rare)** | RDS (PostgreSQL/MySQL XA) | Only within a single RDS cluster; not across services |
