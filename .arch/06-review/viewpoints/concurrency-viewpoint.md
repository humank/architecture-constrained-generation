# Concurrency Viewpoint

## Overview

The Coffeeshop Management System relies on asynchronous message processing as the primary mechanism for inter-service communication. This viewpoint addresses the concurrency concerns that arise from SNS/SQS-based event-driven architecture, the transactional outbox pattern, and the idempotency requirements for reliable message processing.

## Async Message Processing (SNS -> SQS)

### Topology

Each domain event type is published to an SNS topic. Interested bounded contexts subscribe via dedicated SQS queues with message filtering.

```
OrderConfirmed (SNS Topic)
  ├── preparation-order-confirmed-queue (SQS)
  ├── inventory-order-confirmed-queue (SQS)
  └── reporting-order-confirmed-queue (SQS)

PreparationCompleted (SNS Topic)
  └── ordering-preparation-completed-queue (SQS)

LowStockAlert (SNS Topic)
  └── reporting-low-stock-queue (SQS)
```

### Consumer Concurrency

Each service runs a configurable number of SQS polling threads (default: 4 per pod). Messages within a single queue are processed concurrently, so consumers must be designed for parallel execution without shared mutable state.

## Outbox Poller

The Preparation Service uses the transactional outbox pattern to ensure atomicity between local state changes and event publishing.

### How It Works

1. Within a database transaction, the service writes both the domain state change and an outbox record to the `preparation.outbox` table.
2. A background poller (running every 500ms) queries for unpublished outbox records.
3. The poller publishes each record to SNS, then marks it as `published = true`.
4. A scheduled cleanup job removes published records older than 24 hours.

### Concurrency Safeguards

- The poller uses `SELECT ... FOR UPDATE SKIP LOCKED` to prevent duplicate processing when multiple pod replicas run the poller.
- Only one poller instance actively publishes at a time per outbox record.

## Idempotency Requirements

Since the system guarantees at-least-once delivery (not exactly-once), every consumer must be idempotent.

### Strategy

| Service | Idempotency Mechanism |
|---------|----------------------|
| Preparation | `processed_event_ids` table; deduplication by event UUID |
| Inventory | Optimistic locking on `inventory_items.version` column; deduct only if version matches |
| Reporting | Upsert projections keyed on `(report_date, product_name)`; reprocessing yields same result |
| Ordering | `processed_event_ids` table for `PreparationCompleted` events |

### Event Envelope

Every domain event carries:
- `event_id` (UUID) -- unique per event instance
- `aggregate_id` -- the entity that produced the event
- `event_type` -- discriminator for routing
- `occurred_at` -- timestamp for ordering
- `idempotency_key` -- consumer-facing deduplication key (usually same as `event_id`)

## SQS Visibility Timeout

| Queue | Visibility Timeout | Rationale |
|-------|--------------------|-----------|
| preparation-order-confirmed | 30s | Preparation record creation is fast |
| inventory-order-confirmed | 30s | Ingredient deduction is fast |
| reporting-* | 60s | Projection updates may involve aggregation queries |
| ordering-preparation-completed | 30s | Simple status update |

If a consumer fails to delete the message within the visibility timeout, SQS makes it visible again for redelivery. This is why idempotency is mandatory.

## Dead Letter Queue (DLQ) Retry Strategy

### Configuration

Every SQS queue has an associated DLQ with the following policy:

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `maxReceiveCount` | 3 | Allow 3 processing attempts before moving to DLQ |
| DLQ retention period | 14 days | Sufficient time for investigation and manual replay |

### Retry Flow

```
Message arrives in SQS queue
  → Consumer attempts processing
  → Failure (exception thrown, message not deleted)
  → SQS makes message visible again after visibility timeout
  → Retry attempt 2
  → Failure
  → Retry attempt 3
  → Failure
  → Message moved to DLQ
  → CloudWatch alarm fires (DLQ depth > 0)
  → Ops team investigates
  → Fix deployed
  → Manual redrive from DLQ back to source queue
```

### DLQ Monitoring

- A CloudWatch alarm triggers when any DLQ has `ApproximateNumberOfMessagesVisible > 0`.
- The alarm notifies the on-call channel via SNS -> Email/Slack.
- AWS Console SQS DLQ redrive feature is used for replay after fixes are deployed.

## Ordering Guarantees

- **Within a single aggregate**: Events are produced in order. The outbox poller publishes in insertion order.
- **Across aggregates**: No global ordering is guaranteed. Consumers must tolerate out-of-order delivery.
- **SQS FIFO vs Standard**: Standard queues are used for higher throughput. Ordering within a single order is maintained by the state machine (invalid transitions are rejected), not by message ordering.
