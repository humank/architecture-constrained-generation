# Sequence Diagram -- Replenishment Flow

## Low-Stock Detection Through Delivery

```mermaid
sequenceDiagram
    actor Barista
    actor CounterStaff as Counter Staff

    participant IS as Inventory Service<br/>:8083
    participant SNS_I as SNS<br/>inventory-events
    participant SQS_R as SQS<br/>reporting-queue
    participant RS as Reporting Service<br/>:8084
    participant Notify as Email / SMS Service

    Note over Barista, Notify: Phase 1 -- Low-Stock Detection

    IS->>IS: Deduct ingredients (post-preparation)
    IS->>IS: Check isBelowThreshold()
    IS->>SNS_I: InventoryLow event (ingredientName, currentStock, threshold)

    SNS_I->>SQS_R: InventoryLow event (fan-out)
    SQS_R->>RS: Consume InventoryLow
    RS->>Notify: Send low-stock alert to staff

    Note over Barista, Notify: Phase 2 -- Replenishment Request

    Barista->>IS: POST /api/inventory/replenishments (Request replenishment)
    IS-->>Barista: 201 Created (replenishmentId, status=REQUESTED)

    Note over Barista, Notify: Phase 3 -- Purchase Order

    CounterStaff->>IS: PUT /api/inventory/replenishments/{id}/purchase-order
    IS-->>CounterStaff: 200 OK (status=PURCHASE_ORDERED)
    IS->>SNS_I: ReplenishmentOrdered event

    Note over Barista, Notify: Phase 4 -- Delivery Confirmation

    Barista->>IS: PUT /api/inventory/replenishments/{id}/deliver
    IS->>IS: Restock inventory (actualQuantity)
    IS-->>Barista: 200 OK (status=DELIVERED)
    IS->>SNS_I: ReplenishmentDelivered event
    IS->>SNS_I: InventoryRestocked event
```

## Phase Summary

| Phase | Actor | Action | Resulting State |
|-------|-------|--------|----------------|
| 1. Detection | System | Deduction triggers threshold check | InventoryLow event emitted |
| 2. Request | Barista | Requests replenishment | Replenishment = REQUESTED |
| 3. Purchase Order | Counter Staff | Creates purchase order | Replenishment = PURCHASE_ORDERED |
| 4. Delivery | Barista | Confirms physical delivery | Replenishment = DELIVERED, stock restored |
