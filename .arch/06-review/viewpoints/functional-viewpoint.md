# Functional Viewpoint

## Overview

The system's functionality is organized around three primary flows that span the four bounded contexts. Communication between bounded contexts is asynchronous via SNS/SQS, ensuring loose coupling and independent deployability.

## Order Lifecycle Flow

```mermaid
flowchart TD
    A[Customer / Staff places order] --> B[Order Created]
    B --> C{Payment required?}
    C -->|Yes| D[Process Payment]
    C -->|Pre-paid| E[Order Confirmed]
    D -->|Success| E
    D -->|Failure| F[Order Cancelled]
    E -->|OrderConfirmed event via SNS| G[Preparation Queue]
    G --> H[Barista picks up order]
    H --> I[Preparing]
    I --> J[All items ready]
    J --> K[Ready for Pickup / Delivery]
    K --> L[Waiter delivers or customer picks up]
    L --> M[Order Completed]
    M -->|OrderCompleted event via SNS| N[Reporting projects sale]
```

## Inventory Flow

```mermaid
flowchart TD
    A[OrderConfirmed event received] --> B[Deduct ingredients per recipe]
    B --> C{Stock below threshold?}
    C -->|Yes| D[Publish LowStockAlert]
    C -->|No| E[Done]
    D --> F[Send Email/SMS notification]
    D --> G[Create Replenishment Request]
    G --> H[Staff reviews and approves]
    H --> I[Purchase Order created]
    I --> J[Goods received]
    J --> K[Inventory restocked]
    K --> L[Publish InventoryReplenished event]
```

## Reporting Flow

```mermaid
flowchart TD
    A[Domain Events via SQS] --> B[Reporting Service consumer]
    B --> C{Event type?}
    C -->|OrderCompleted| D[Update sales_projections]
    C -->|InventoryDeducted| E[Update inventory_projections]
    C -->|LowStockAlert| F[Update alert history]
    C -->|PaymentProcessed| G[Update revenue projections]
    D --> H[Queryable read models]
    E --> H
    F --> H
    G --> H
```

## Bounded Context Responsibilities

| Bounded Context | Classification | Key Capabilities |
|----------------|---------------|-----------------|
| Ordering | Core | Order CRUD, payment processing, order state machine |
| Preparation | Core | Preparation queue, recipe lookup, item readiness tracking |
| Inventory | Supporting | Stock level management, threshold alerts, replenishment workflow |
| Reporting | Generic | Event consumption, read-model projection, dashboard queries |
