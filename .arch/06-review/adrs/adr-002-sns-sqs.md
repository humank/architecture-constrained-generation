# ADR-002: SNS/SQS over EventBridge and Kafka

## Status

Accepted

## Date

2026-03-19

## Context

The microservices architecture requires an asynchronous messaging backbone for inter-service communication. Domain events (e.g., `OrderConfirmed`, `PreparationCompleted`, `LowStockAlert`) need to be published by one service and consumed by one or more others.

Requirements:

- **Fan-out**: A single event may need to reach multiple consumers (e.g., `OrderConfirmed` goes to Preparation, Inventory, and Reporting).
- **Durability**: Messages must not be lost. Failed processing must be retried.
- **Simplicity**: The team of 4-6 engineers needs a solution with low operational overhead.
- **AWS-native**: The system is fully deployed on AWS; a managed service is preferred.
- **Filtering**: Some consumers only care about specific event subtypes.

## Decision

We will use Amazon SNS for event publishing (fan-out) and Amazon SQS for event consumption (per-consumer queues), with SNS subscription filter policies for message routing.

## Consequences

### Positive

- **Native fan-out**: SNS topics natively support multiple SQS subscriptions, enabling one-to-many delivery without application-level routing.
- **Per-consumer queues**: Each consumer has its own SQS queue, allowing independent processing rates, retry policies, and dead-letter queues.
- **Subscription filtering**: SNS message filtering attributes allow consumers to receive only relevant events, reducing unnecessary processing.
- **Fully managed**: No brokers to provision, patch, or scale. Both SNS and SQS scale automatically.
- **Low cost**: For the expected message volume (hundreds to low thousands per day), SNS/SQS costs are negligible.
- **DLQ support**: Native SQS dead-letter queue integration with configurable `maxReceiveCount`.

### Negative

- **No replay**: Unlike Kafka or EventBridge Archive, SQS messages are deleted after successful processing. Event replay requires a separate mechanism (e.g., re-publishing from the outbox table).
- **No strict ordering**: Standard SQS queues do not guarantee message ordering. (Mitigated by state machine validation in consumers.)
- **No schema registry**: SNS/SQS does not enforce message schemas. Schema validation is the producer's and consumer's responsibility.

## Alternatives Considered

### Amazon EventBridge

- **Pros**: Built-in schema registry, content-based filtering, event archive and replay, native CloudWatch integration.
- **Rejected because**: EventBridge has a 256 KB event size limit (vs. SQS 256 KB, but EventBridge's filtering on nested JSON is more restrictive). The subscription filtering in SNS is sufficient for our use case. EventBridge adds complexity for a simple pub/sub pattern, and the team found SNS/SQS more intuitive.

### Apache Kafka (Amazon MSK)

- **Pros**: Event log retention, replay capability, strict partition ordering, high throughput.
- **Rejected because**: MSK requires cluster management (broker sizing, partition count, replication factor), which is significant operational overhead for a small team. The message volume does not justify Kafka's throughput capabilities. The cost of a minimum MSK cluster far exceeds SNS/SQS for our scale. Kafka's consumer group model is more complex than SQS for our fan-out pattern.

### Amazon Kinesis Data Streams

- **Pros**: Ordered within shard, replay capability, real-time processing.
- **Rejected because**: Shard management adds operational complexity. The fan-out pattern is less natural than SNS/SQS. Cost is higher for low-throughput workloads.
