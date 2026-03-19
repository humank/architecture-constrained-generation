# C4 Level 3 -- Component Diagram: Ordering Service

## Ordering Service (port 8081)

Internal component breakdown of the Ordering bounded context.

```mermaid
C4Component
    title Ordering Service -- Component Diagram (Level 3)

    Container_Boundary(ordering, "Ordering Service :8081") {

        Component(orderController, "OrderController", "Spring REST Controller", "Exposes HTTP endpoints for order CRUD and lifecycle transitions.")
        Component(orderService, "OrderService", "Domain Service", "Orchestrates order lifecycle: place, confirm, pay, ready, deliver, complete.")
        Component(paymentService, "PaymentService", "Domain Service", "Validates and records payment against an order.")
        Component(orderRepository, "OrderRepository", "Spring Data JPA", "Persists and retrieves Order aggregates from PostgreSQL.")
        Component(eventPublisher, "EventPublisher", "Spring / AWS SDK", "Publishes domain events (OrderPlaced, OrderPaid, OrderCompleted) to SNS.")
    }

    ContainerDb(db, "Ordering DB", "RDS PostgreSQL", "orders, order_items, payments")
    Container(sns, "SNS", "AWS SNS", "order-events topic")
    Container(sqs, "SQS", "AWS SQS", "ordering-inbound-queue")
    Container(alb, "API Gateway / ALB", "AWS ALB", "Incoming HTTP")

    Rel(alb, orderController, "HTTP requests", "JSON / REST")
    Rel(orderController, orderService, "Delegates commands")
    Rel(orderService, paymentService, "Processes payment")
    Rel(orderService, orderRepository, "Loads / saves aggregates")
    Rel(orderService, eventPublisher, "Publishes domain events")
    Rel(orderRepository, db, "JDBC")
    Rel(eventPublisher, sns, "Publishes to order-events topic", "AWS SDK")
    Rel(sqs, orderService, "Consumes events (e.g., PreparationCompleted)", "SQS poll")
```

## Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| OrderController | HTTP API surface; input validation and response mapping |
| OrderService | Core domain logic; enforces state-machine transitions on Order aggregate |
| PaymentService | Payment validation, idempotency checks, records payment |
| OrderRepository | Persistence of Order aggregate root and child entities |
| EventPublisher | Translates domain events to SNS messages; handles serialization and retry |
