# Sequence Diagram -- Order Lifecycle

## Full Order Flow Across Services

```mermaid
sequenceDiagram
    actor Waiter
    actor CounterStaff as Counter Staff
    actor Barista

    participant OS as Ordering Service<br/>:8081
    participant SNS_O as SNS<br/>order-events
    participant SQS_P as SQS<br/>preparation-queue
    participant PS as Preparation Service<br/>:8082
    participant SNS_P as SNS<br/>preparation-events
    participant SQS_I as SQS<br/>inventory-queue
    participant IS as Inventory Service<br/>:8083
    participant SQS_O as SQS<br/>ordering-queue

    Note over Waiter, IS: Phase 1 -- Order Placement and Payment

    Waiter->>OS: POST /api/orders (PlaceOrder)
    OS-->>Waiter: 201 Created (orderId, status=PLACED)
    OS->>SNS_O: OrderPlaced event

    CounterStaff->>OS: PUT /api/orders/{id}/confirm
    OS-->>CounterStaff: 200 OK (status=CONFIRMED)
    OS->>SNS_O: OrderConfirmed event

    CounterStaff->>OS: PUT /api/orders/{id}/pay
    OS-->>CounterStaff: 200 OK (status=PAID)
    OS->>SNS_O: OrderPaid event

    Note over Waiter, IS: Phase 2 -- Preparation

    SNS_O->>SQS_P: OrderPaid event (fan-out)
    SQS_P->>PS: Consume OrderPaid
    PS->>PS: Create Preparation (resolve recipes)

    Barista->>PS: PUT /api/preparations/{id}/start
    PS-->>Barista: 200 OK (status=IN_PROGRESS)
    PS->>SNS_P: PreparationStarted event

    Barista->>PS: PUT /api/preparations/{id}/complete
    PS-->>Barista: 200 OK (status=READY)
    PS->>SNS_P: PreparationCompleted event

    Note over Waiter, IS: Phase 3 -- Inventory Deduction

    SNS_P->>SQS_I: PreparationCompleted event (fan-out)
    SQS_I->>IS: Consume PreparationCompleted
    IS->>IS: Deduct ingredients from stock

    Note over Waiter, IS: Phase 4 -- Order Completion

    SNS_P->>SQS_O: PreparationCompleted event (fan-out)
    SQS_O->>OS: Consume PreparationCompleted
    OS->>OS: Mark order READY

    Waiter->>OS: PUT /api/orders/{id}/deliver
    OS-->>Waiter: 200 OK (status=DELIVERED)

    Waiter->>OS: PUT /api/orders/{id}/complete
    OS-->>Waiter: 200 OK (status=COMPLETED)
    OS->>SNS_O: OrderCompleted event
```

## Phase Summary

| Phase | Trigger | Services Involved | Events Published |
|-------|---------|-------------------|-----------------|
| 1. Placement and Payment | Waiter, Counter Staff | Ordering | OrderPlaced, OrderConfirmed, OrderPaid |
| 2. Preparation | Barista | Preparation | PreparationStarted, PreparationCompleted |
| 3. Inventory Deduction | System (event-driven) | Inventory | InventoryDeducted, (InventoryLow) |
| 4. Order Completion | Waiter | Ordering | OrderCompleted |
