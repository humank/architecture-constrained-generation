# ADR-003: Transactional Outbox for Event Publishing

## Status

Accepted

## Date

2026-03-19

## Context

When a service updates its local database and publishes a domain event, two operations must succeed or fail together. Without coordination, the following failure scenarios arise:

1. **DB commits, SNS publish fails**: The local state is updated but downstream services never learn about it. The system is inconsistent.
2. **SNS publishes, DB commit fails**: Downstream services act on an event that has no corresponding local state. The system is inconsistent.

The dual-write problem is a fundamental challenge in distributed systems. We need a pattern that ensures local state changes and event publication are atomic.

## Decision

We will use the Transactional Outbox pattern. Instead of publishing events directly to SNS, services write event records to an `outbox` table within the same database transaction as the domain state change. A separate background poller reads unpublished outbox records and publishes them to SNS.

### Mechanism

1. Within a single database transaction:
   - Update domain tables (e.g., `preparations`)
   - Insert a row into the `outbox` table with the event payload
2. A background poller (scheduled every 500ms):
   - Queries: `SELECT * FROM outbox WHERE published = false ORDER BY created_at FOR UPDATE SKIP LOCKED`
   - Publishes each event to the corresponding SNS topic
   - Marks the outbox record as `published = true`
3. A cleanup job (daily):
   - Deletes outbox records where `published = true` and `created_at < NOW() - INTERVAL '24 hours'`

## Consequences

### Positive

- **Atomicity**: The domain state change and event record are in the same transaction. Either both persist or neither does.
- **Reliability**: Events are durably stored in the database. Even if SNS is temporarily unavailable, the poller will retry.
- **At-least-once delivery**: The poller may publish the same event more than once (e.g., if it crashes after publishing but before marking as published). This is safe because consumers are idempotent (see ADR for idempotency).
- **Simplicity**: The pattern is straightforward to implement with standard JDBC/JPA and a scheduled task.
- **Debuggability**: The outbox table provides an audit trail of all events produced by the service.

### Negative

- **Latency**: Events are not published immediately. There is a delay of up to 500ms (poller interval) plus SNS publish latency.
- **Database load**: The outbox table adds write amplification (one extra INSERT per event) and read load (poller queries).
- **Poller coordination**: When multiple pod replicas run the poller, `FOR UPDATE SKIP LOCKED` prevents duplicate work but adds complexity.
- **Cleanup overhead**: The outbox table must be periodically pruned to prevent unbounded growth.

### Mitigations

- The 500ms poller interval is acceptable for the coffeeshop domain where sub-second event latency is not critical.
- Database load from the outbox is minimal compared to the overall query volume.
- `SKIP LOCKED` is a well-understood PostgreSQL feature with predictable behavior.

## Alternatives Considered

### Change Data Capture (CDC) with Debezium

- **Pros**: No application-level poller needed. Events are captured directly from the PostgreSQL WAL. Lower latency.
- **Rejected because**: Debezium requires a Kafka Connect cluster or standalone connector, adding significant infrastructure. The team does not run Kafka (see ADR-002). The operational complexity of managing WAL-based CDC was deemed disproportionate to the benefit for our scale.

### Direct SNS Publish with Retry

- **Pros**: Simpler implementation. No outbox table.
- **Rejected because**: This is a dual write. If the SNS publish succeeds but the DB commit fails (or vice versa), the system is inconsistent. Retrying at the application level does not solve the atomicity problem.

### Saga Pattern (Choreography)

- **Pros**: Each step is an independent transaction with compensating actions.
- **Rejected because**: The outbox pattern is simpler for our use case. Sagas introduce compensating transactions and additional failure modes that are not necessary when the primary goal is reliable event publishing from a single service.
