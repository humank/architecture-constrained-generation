# C4 Level 3 -- Component Diagram: Preparation Service

## Preparation Service (port 8082)

Internal component breakdown of the Preparation bounded context.

```mermaid
C4Component
    title Preparation Service -- Component Diagram (Level 3)

    Container_Boundary(preparation, "Preparation Service :8082") {

        Component(prepController, "PreparationController", "Spring REST Controller", "Exposes HTTP endpoints for preparation status and barista actions.")
        Component(prepService, "PreparationService", "Domain Service", "Orchestrates preparation lifecycle: create, start, complete items, complete preparation.")
        Component(recipeService, "RecipeResolutionService", "Domain Service", "Resolves coffee type + size + customizations into a concrete Recipe with ingredient quantities.")
        Component(sqsConsumer, "SQS Consumer", "Spring Cloud AWS", "Listens on preparation-inbound-queue for OrderPaid events and triggers preparation creation.")
        Component(outboxPoller, "OutboxPoller", "Scheduled Task", "Polls the outbox table and publishes pending domain events to SNS, ensuring at-least-once delivery.")
        Component(eventPublisher, "EventPublisher", "Spring / AWS SDK", "Publishes domain events (PreparationStarted, PreparationCompleted) to SNS via the outbox pattern.")
    }

    ContainerDb(db, "Preparation DB", "RDS PostgreSQL", "preparations, preparation_items, recipes, outbox")
    Container(sns, "SNS", "AWS SNS", "preparation-events topic")
    Container(sqs, "SQS", "AWS SQS", "preparation-inbound-queue")
    Container(alb, "API Gateway / ALB", "AWS ALB", "Incoming HTTP")

    Rel(alb, prepController, "HTTP requests", "JSON / REST")
    Rel(prepController, prepService, "Delegates commands")
    Rel(prepService, recipeService, "Resolves recipe for each order item")
    Rel(prepService, eventPublisher, "Records domain events to outbox")
    Rel(sqsConsumer, prepService, "Triggers preparation creation on OrderPaid")
    Rel(sqs, sqsConsumer, "Delivers OrderPaid events", "SQS poll")
    Rel(outboxPoller, db, "Reads pending outbox entries", "JDBC")
    Rel(outboxPoller, sns, "Publishes to preparation-events topic", "AWS SDK")
    Rel(eventPublisher, db, "Writes to outbox table", "JDBC")
    Rel(prepService, db, "Loads / saves aggregates", "JDBC")
```

## Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| PreparationController | HTTP API surface for barista interactions |
| PreparationService | Core domain logic; manages Preparation aggregate state transitions |
| RecipeResolutionService | Maps (CoffeeType, Size, Customizations) to a Recipe with precise Ingredient quantities |
| SQS Consumer | Receives OrderPaid events from the ordering-events SNS topic via SQS subscription |
| OutboxPoller | Guarantees at-least-once event publishing by polling the transactional outbox table |
| EventPublisher | Writes domain events into the outbox table within the same DB transaction as the aggregate change |
