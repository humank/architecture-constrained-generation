# Event-Driven Architecture: Messaging Patterns

## 1. Core Concepts

### Event Categories (Martin Fowler's Distinction)

| Category | Description | Payload | Consumer Coupling |
|---|---|---|---|
| **Event Notification** | Signal that something happened. Minimal data. Consumer calls back for details | Minimal (ID + type) | Consumer must query source for full data |
| **Event-Carried State Transfer** | Event contains all data consumers need. No callbacks required | Full state snapshot or delta | Consumers self-sufficient but coupled to schema |
| **Event Sourcing** | Events are the system of record. Current state derived by replaying events | Domain facts (deltas) | Complete audit trail; state is a projection |

Event Notification keeps events small but creates runtime coupling (callbacks). Event-Carried State
Transfer removes runtime coupling but increases schema coupling. Event Sourcing changes the
fundamental storage model — events are not notifications, they are the data.

### Commands vs Events vs Queries

| Aspect | Command | Event | Query |
|---|---|---|---|
| **Intent** | "Do this" | "This happened" | "Tell me this" |
| **Tense** | Imperative: `PlaceOrder` | Past tense: `OrderPlaced` | Interrogative: `GetOrderStatus` |
| **Cardinality** | One sender → one handler | One emitter → many consumers | One requester → one responder |
| **Failure** | Can be rejected | Already happened (immutable fact) | Can return empty/error |
| **Coupling** | Sender knows the handler | Producer does not know consumers | Requester knows the responder |

Commands express **intent**. Events express **fact**. This distinction is load-bearing: commands can
fail, events cannot be un-happened.

### Channel Primitives

| Primitive | Semantics | Example |
|---|---|---|
| **Queue** | Point-to-point. Message consumed by exactly one consumer. Messages removed after processing | SQS, RabbitMQ queue |
| **Topic** | Publish-subscribe. Message delivered to all subscribers. Fan-out semantics | SNS, Kafka topic |
| **Exchange** | Router that binds to queues based on rules (direct, fanout, topic, headers) | RabbitMQ exchange |
| **Stream** | Ordered, append-only log. Consumers track position (offset). Replayable | Kafka topic, Kinesis stream |
| **Event Bus** | Central hub with routing rules. Matches events to targets based on content | EventBridge |

---

## 2. Messaging Patterns

### Point-to-Point

```
Producer ──→ [Queue] ──→ Consumer
```

One producer, one consumer. Queue guarantees each message processed once. Use when a message
represents a **task** that must be handled by exactly one worker.

### Publish-Subscribe

```
Producer ──→ [Topic] ──┬──→ Consumer A
                       ├──→ Consumer B
                       └──→ Consumer C
```

One producer, many consumers. Each subscriber gets a copy. Use for **event notification** — multiple
systems react independently to the same event. Decouples producer from consumers entirely.

### Competing Consumers

```
Producer ──→ [Queue] ──┬──→ Consumer 1
                       ├──→ Consumer 2
                       └──→ Consumer 3
```

Multiple consumers on the same queue. Broker delivers each message to exactly one consumer.
Provides **horizontal scaling** and load balancing. Consumers compete for messages. Ordering
guarantees are weakened (messages processed in parallel).

### Fan-Out + Competing Consumers (Combined)

```
Producer ──→ [Topic] ──┬──→ [Queue A] ──→ Consumer A1, A2 (competing)
                       └──→ [Queue B] ──→ Consumer B1, B2 (competing)
```

SNS → SQS pattern. Each subscriber queue gets all messages. Within each queue, consumers compete.
Combines broadcast with per-subscriber scalability.

### Message Router

Routes messages to different destinations based on content or headers. Decouples producers from
knowledge of which consumer handles which message type.

- **Content-Based Router**: inspects message body to determine destination
- **Header-Based Router**: uses metadata/attributes for routing decisions
- **EventBridge Rules**: match on event pattern, route to targets

### Message Filter

Consumer-side pattern. Consumer receives all messages but processes only those matching criteria.
Simpler than routing but wastes bandwidth. Prefer broker-side filtering (SQS filter policies,
EventBridge rules) when available.

### Splitter / Aggregator

**Splitter**: decomposes a composite message into individual parts, each processed independently.

```
[BatchOrder] ──→ Splitter ──→ [OrderItem 1]
                           ──→ [OrderItem 2]
                           ──→ [OrderItem 3]
```

**Aggregator**: collects related messages and combines into a single message when complete.
Requires correlation ID and completion condition (count, timeout, sentinel).

```
[Result 1] ──┐
[Result 2] ──┼──→ Aggregator ──→ [Combined Result]
[Result 3] ──┘
```

Stateful — aggregator must track partial results. Consider Step Functions for orchestrated
aggregation.

### Dead Letter Queue (DLQ)

Messages that cannot be processed after N retries are moved to a DLQ. Prevents poison messages
from blocking the queue.

```
[Queue] ──→ Consumer (fails) ──→ retry N times ──→ [DLQ]
```

DLQ requirements:
- Same message type as source queue (for reprocessing)
- Monitoring/alerting on DLQ depth
- Manual or automated reprocessing workflow
- Retention period longer than source queue

SQS: configure `maxReceiveCount` on redrive policy. After N receives without deletion, message
moves to DLQ.

### Request-Reply (Async)

Synchronous semantics over asynchronous infrastructure. Requester sends message with:
- **Correlation ID**: unique identifier to match reply to request
- **Reply-To**: queue/topic where response should be sent

```
Requester ──→ [Request Queue] ──→ Responder
Requester ←── [Reply Queue]   ←──
         (matched by correlation ID)
```

Use when caller needs a response but wants async decoupling. Common in saga orchestration.

---

## 3. Delivery Guarantees

### The Three Semantics

| Guarantee | Behavior | Risk | Implementation |
|---|---|---|---|
| **At-Most-Once** | Fire and forget. No retry | Message loss | Send without ack. Fastest |
| **At-Least-Once** | Retry until acknowledged. May duplicate | Duplicate processing | Ack after processing. Most common |
| **Exactly-Once** | Each message processed exactly once | Extremely hard to achieve | Requires idempotent consumers or transactional dedup |

### Why Exactly-Once Is Hard

The **Two Generals Problem**: no protocol over an unreliable channel can guarantee both parties
reach agreement. Applied to messaging:

1. Producer sends message to broker. Network fails. Did broker receive it? Producer retries →
   possible duplicate.
2. Consumer processes message, sends ack. Network fails. Did broker receive ack? Broker re-delivers
   → possible duplicate processing.

Between "process message" and "acknowledge message" there is always a gap where failure can cause
either loss or duplication. You must choose which failure mode to tolerate.

### Practical Exactly-Once

Exactly-once **processing** (not delivery) is achievable:

**At-least-once delivery + idempotent consumer = effectively exactly-once**

Idempotency strategies:
- **Natural idempotency**: operation is inherently idempotent (e.g., SET, not INCREMENT)
- **Deduplication table**: store processed message IDs, skip duplicates
- **Idempotency key**: consumer-generated key from message content (hash of business fields)
- **Conditional writes**: use version/ETag — only apply if current version matches expected
- **Transactional dedup**: check + process in same DB transaction

Kafka achieves exactly-once within its ecosystem via idempotent producers + transactional
consumers + read-committed isolation. This does NOT extend outside Kafka boundaries.

---

## 4. Ordering Guarantees

### Ordering Levels

| Level | How | Throughput | Use When |
|---|---|---|---|
| **Global ordering** | Single partition/shard. All messages in one sequence | Lowest (single writer bottleneck) | Total ordering required (rare). Financial ledger |
| **Partition ordering** | Messages with same key go to same partition. Ordered within partition | High (parallelism across partitions) | Per-entity ordering. Most common choice |
| **No ordering** | Messages processed in any order | Highest | Operations are commutative or idempotent. Notifications |

### Partition Ordering (Most Common)

Choose partition key = entity ID (e.g., order ID, customer ID). All events for that entity are
ordered. Events for different entities are processed in parallel.

```
Key: order-123 → Partition 0 → [Created, Paid, Shipped] (ordered)
Key: order-456 → Partition 2 → [Created, Cancelled]     (ordered)
```

Cross-partition ordering is NOT guaranteed. If you need ordering across entities, you need global
ordering or application-level sequencing.

### Trade-offs

- **Ordering vs Throughput**: strict ordering limits parallelism. Partition ordering is the sweet spot.
- **Ordering vs Availability**: ordered systems cannot failover partitions without risking reordering.
- **SQS FIFO**: 300 msg/s per queue (3000 with batching). Message Group ID = partition key.
  Standard SQS: nearly unlimited throughput, best-effort ordering.

---

## 5. Transactional Outbox Pattern

### The Dual-Write Problem

Service must both update its database AND publish an event. Two separate systems, no shared
transaction. Possible failure modes:

1. DB commits, message publish fails → state changed, no event (lost event)
2. Message publishes, DB commit fails → event published, no state change (phantom event)
3. Both succeed but not atomically → inconsistency window

Two-phase commit (2PC) across DB and broker is fragile, slow, and most brokers don't support it.

### Solution: Transactional Outbox

Write the event to an **outbox table** in the same database transaction as the business data change.
A separate process reads the outbox and publishes to the broker.

```
┌─────────────────────────────────────────┐
│ Database Transaction                     │
│  1. UPDATE orders SET status = 'paid'   │
│  2. INSERT INTO outbox (event_type,     │
│     payload, created_at, published)      │
│     VALUES ('OrderPaid', '{...}', ...)   │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Outbox Relay (poll or CDC)  │
│  SELECT * FROM outbox       │
│  WHERE published = false    │
│  → publish to broker        │
│  → mark as published        │
└─────────────────────────────┘
```

Outbox table schema (minimal):

```sql
CREATE TABLE outbox (
  id            UUID PRIMARY KEY,
  aggregate_type VARCHAR NOT NULL,
  aggregate_id   VARCHAR NOT NULL,
  event_type    VARCHAR NOT NULL,
  payload       JSONB NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  published     BOOLEAN NOT NULL DEFAULT FALSE
);
```

### Relay Strategies

**Polling Publisher**: periodically queries outbox for unpublished events. Simple but introduces
latency and DB load. Must handle ordering (ORDER BY created_at).

**Change Data Capture (CDC)**: read the database transaction log directly. No polling, near
real-time. Debezium is the standard open-source CDC platform.

Debezium setup:
- Reads DB transaction log (WAL for Postgres, binlog for MySQL)
- Publishes changes to Kafka topics
- Supports outbox-specific SMT (Single Message Transform) that unwraps outbox rows into clean events
- Guarantees ordering matching DB commit order

**Transaction Log Tailing**: similar to CDC but custom implementation reading the DB's WAL/binlog
directly. Prefer Debezium over custom implementations.

### DynamoDB Streams as Outbox

DynamoDB Streams captures item-level changes. Write business data + event to same table (or use
single-table design), stream triggers Lambda to publish to EventBridge/SNS/SQS.

---

## 6. AWS Implementation

### Service Selection

| Service | Model | Ordering | Replay | Throughput | Use Case |
|---|---|---|---|---|---|
| **SQS Standard** | Queue | Best-effort | No | Nearly unlimited | Task queues, decoupling |
| **SQS FIFO** | Queue | Per Message Group ID | No | 300-3000 msg/s | Ordered task processing |
| **SNS Standard** | Pub/Sub (topic) | No | No | Nearly unlimited | Fan-out notifications |
| **SNS FIFO** | Pub/Sub (topic) | Per Message Group ID | No | 300 msg/s | Ordered fan-out to FIFO queues |
| **EventBridge** | Event bus + rules | No | Via archive/replay | Soft limits, scalable | Event routing, cross-account, SaaS integration |
| **Kinesis Data Streams** | Stream (log) | Per shard | Yes (retention 1-365 days) | Per-shard: 1 MB/s in, 2 MB/s out | High-throughput streaming, analytics, replay |
| **DynamoDB Streams** | Change stream | Per item | Yes (24h retention) | Tied to table throughput | Reacting to data changes, event sourcing |
| **Step Functions** | Orchestration | Sequential within workflow | Via execution history | 1000+ state transitions/s (Express) | Complex workflows, saga orchestration |

### Common Patterns

**SNS → SQS (Fan-Out + Competing Consumers)**:
SNS topic fans out to multiple SQS queues. Each queue has its own consumer group. Filter policies
on subscriptions for content-based routing. Most common EDA pattern on AWS.

**EventBridge → Targets (Content-Based Routing)**:
Rules match event patterns (source, detail-type, detail fields). Route to Lambda, SQS, SNS, Step
Functions, API destinations. Schema registry for event discovery. Cross-account event bus for
organizational patterns.

**Kinesis → Lambda (Stream Processing)**:
Lambda polls Kinesis shards. Batch size and parallelization factor configurable. Bisect-on-error
for poison message handling. Enhanced fan-out for dedicated throughput per consumer.

**DynamoDB Streams → Lambda → EventBridge**:
Table changes trigger Lambda, which transforms and publishes domain events to EventBridge. Serves
as transactional outbox without separate outbox table.

**Step Functions (Saga Orchestration)**:
Standard Workflows for long-running processes (up to 1 year). Express Workflows for high-volume,
short-duration (up to 5 min). Built-in retry, catch, compensation. Map state for parallel processing.

### SQS FIFO Specifics

- **Message Group ID**: partition key for ordering. Messages within same group processed in order.
- **Deduplication ID**: exactly-once delivery within 5-minute window (content-based or explicit).
- **Receive Request Attempt ID**: for exactly-once processing with visibility timeout.
- Limitation: 300 msg/s per queue, 3000 with high-throughput mode and batching.

---

## 7. Connection to Methodologies

### Event Modeling

**Automation Pattern → Message Consumer**: the "todo list" view in Event Modeling maps directly to a
message consumer reading from a queue. The view is the queue state. The processor reads items,
executes commands, marks complete. Idempotency built into the pattern — reprocessing a todo item
that is already done is a no-op.

**Translation Pattern → Message Consumer as ACL**: external events arrive via message consumer that
translates them into internal commands. The consumer is the Anti-Corruption Layer. External schema
mapped to internal ubiquitous language. The view in the Translation pattern corresponds to the
message queue being read.

### DDD Domain Events

Domain Events (defined within a Bounded Context) become messages published to a broker when they
need to cross context boundaries. Internal domain events may be in-process (mediator pattern).
External domain events are serialized and published.

Mapping:
- Internal domain event → in-process handler (MediatR, Spring Events)
- Integration event → message broker (SNS, EventBridge, Kafka)
- Integration events should be versioned and schema-managed separately from internal domain events

### Context Mapping → Messaging Patterns

| Context Map Relationship | Messaging Approach |
|---|---|
| **Partnership** | Shared topic, co-evolved schema. Both teams own the contract |
| **Customer-Supplier** | Upstream publishes events. Downstream subscribes. AsyncAPI contract negotiated |
| **Conformist** | Downstream subscribes and adopts upstream's event schema as-is |
| **ACL** | Downstream subscribes via translation consumer that maps external events to internal model |
| **Open Host Service** | Upstream publishes well-documented events to a public topic. Published Language defines schema |
| **Separate Ways** | No messaging integration. Independent data stores |

### Contract Testing for Messages

**AsyncAPI** is the OpenAPI equivalent for event-driven APIs. Defines:
- Channels (topics/queues)
- Message schemas (payload structure, headers)
- Protocol bindings (Kafka, AMQP, SQS, etc.)

Contract testing for messages follows the same consumer-driven pattern:
1. Consumer defines expected message schema
2. Producer verifies it can produce conforming messages
3. Schema registry enforces compatibility (backward, forward, full)

Pact supports message-based contract testing — consumer defines expected message content,
provider verifies message generation logic. No real broker needed during testing.

Schema evolution strategies:
- **Backward compatible**: new schema can read old data (add optional fields only)
- **Forward compatible**: old schema can read new data (ignore unknown fields)
- **Full compatible**: both directions. Safest for async systems where producer and consumer deploy independently
