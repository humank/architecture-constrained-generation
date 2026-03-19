# ADR-001: Microservices over Modular Monolith

## Status

Accepted

## Date

2026-03-19

## Context

The Coffeeshop Management System has four identified bounded contexts (Ordering, Preparation, Inventory, Reporting) with distinct domain responsibilities. The development team consists of 4-6 engineers. We need to decide on the high-level architectural style: microservices vs. modular monolith.

Key factors:

- Each bounded context has a different rate of change. Ordering and Preparation (Core) evolve frequently; Reporting (Generic) is relatively stable.
- The team wants independent deployment of bounded contexts to reduce release coordination overhead.
- Communication between bounded contexts is inherently event-driven (e.g., an order confirmation triggers preparation and inventory deduction).
- The team has prior experience with Spring Boot microservices and Kubernetes.

## Decision

We will implement the system as four microservices, one per bounded context, deployed independently on AWS EKS.

## Consequences

### Positive

- **Independent deployability**: Each service can be deployed, scaled, and rolled back without affecting others.
- **Technology isolation**: Each service owns its schema and can evolve its data model independently.
- **Team autonomy**: Engineers can work on different services in parallel with minimal merge conflicts.
- **Fault isolation**: A failure in Reporting does not prevent order placement or preparation.

### Negative

- **Operational complexity**: Four services to monitor, deploy, and maintain instead of one.
- **Distributed system challenges**: Network failures, message ordering, idempotency, and eventual consistency must be explicitly handled.
- **Development overhead**: Shared concerns (logging, tracing, event schemas) require common libraries and conventions.
- **Testing complexity**: End-to-end flows span multiple services, requiring integration test infrastructure.

### Mitigations

- Mono-repo structure keeps all services together, simplifying dependency management and cross-service refactoring.
- Shared `buildSrc` conventions reduce boilerplate for common concerns.
- ADOT + X-Ray provide distributed tracing across service boundaries.
- Testcontainers enable local integration testing with real dependencies.

## Alternatives Considered

### Modular Monolith

A single deployable unit with module boundaries enforced by package structure and ArchUnit tests.

- **Pros**: Simpler deployment, no network-related failure modes, easier local development.
- **Rejected because**: The team specifically wanted independent deployment capability, and the event-driven nature of the domain makes service boundaries natural. The risk of module boundary erosion in a monolith was also a concern.

### Serverless (Lambda per function)

Each API endpoint as a Lambda function with API Gateway.

- **Pros**: No infrastructure to manage, pay-per-invocation pricing.
- **Rejected because**: Cold start latency is problematic for a real-time ordering flow. The team's expertise is in Spring Boot, not serverless frameworks. JVM cold starts in Lambda are particularly slow without provisioned concurrency, which negates the cost advantage.
