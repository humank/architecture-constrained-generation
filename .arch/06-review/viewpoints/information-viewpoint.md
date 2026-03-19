# Information Viewpoint

## Overview

Each bounded context owns a dedicated PostgreSQL schema within a shared RDS instance. Cross-schema access is prohibited at the application level; all data sharing occurs through domain events published via SNS/SQS.

## Data Model

```mermaid
erDiagram
    %% ── Ordering Schema ──
    ordering_orders {
        uuid id PK
        varchar status
        uuid customer_id
        decimal total_amount
        varchar currency
        timestamp created_at
        timestamp updated_at
    }
    ordering_order_items {
        uuid id PK
        uuid order_id FK
        varchar product_name
        int quantity
        decimal unit_price
        decimal subtotal
    }
    ordering_payments {
        uuid id PK
        uuid order_id FK
        varchar payment_method
        varchar status
        decimal amount
        varchar transaction_ref
        timestamp paid_at
    }
    ordering_orders ||--o{ ordering_order_items : contains
    ordering_orders ||--o| ordering_payments : "paid via"

    %% ── Preparation Schema ──
    preparation_preparations {
        uuid id PK
        uuid order_id
        varchar status
        timestamp started_at
        timestamp completed_at
    }
    preparation_preparation_items {
        uuid id PK
        uuid preparation_id FK
        varchar product_name
        varchar status
        uuid recipe_id FK
        timestamp completed_at
    }
    preparation_recipes {
        uuid id PK
        varchar product_name
        jsonb ingredients
        int estimated_seconds
    }
    preparation_outbox {
        bigint id PK
        varchar aggregate_type
        uuid aggregate_id
        varchar event_type
        jsonb payload
        timestamp created_at
        boolean published
    }
    preparation_preparations ||--o{ preparation_preparation_items : contains
    preparation_preparation_items }o--|| preparation_recipes : "follows"

    %% ── Inventory Schema ──
    inventory_inventory_items {
        uuid id PK
        varchar ingredient_name
        decimal quantity_on_hand
        varchar unit
        decimal reorder_threshold
        timestamp last_updated
    }
    inventory_replenishments {
        uuid id PK
        uuid inventory_item_id FK
        decimal requested_quantity
        varchar status
        timestamp requested_at
    }
    inventory_purchase_orders {
        uuid id PK
        uuid replenishment_id FK
        varchar supplier
        varchar status
        decimal total_cost
        timestamp ordered_at
        timestamp received_at
    }
    inventory_inventory_items ||--o{ inventory_replenishments : triggers
    inventory_replenishments ||--o| inventory_purchase_orders : "fulfilled by"

    %% ── Reporting Schema ──
    reporting_sales_projections {
        uuid id PK
        date report_date
        varchar product_name
        int total_quantity
        decimal total_revenue
        timestamp last_updated
    }
    reporting_inventory_projections {
        uuid id PK
        date report_date
        varchar ingredient_name
        decimal quantity_consumed
        int low_stock_alert_count
        timestamp last_updated
    }
```

## Schema Ownership

| Schema | Owner Service | Access Pattern |
|--------|--------------|----------------|
| `ordering` | Ordering Service | Read/Write |
| `preparation` | Preparation Service | Read/Write |
| `inventory` | Inventory Service | Read/Write |
| `reporting` | Reporting Service | Read/Write (projections only) |

## Data Flow Between Contexts

Data crosses bounded context boundaries exclusively through domain events:

- **Ordering -> Preparation**: `OrderConfirmed` event carries order items and product names
- **Ordering -> Inventory**: `OrderConfirmed` event triggers ingredient deduction
- **Ordering -> Reporting**: `OrderCompleted`, `PaymentProcessed` events feed sales projections
- **Inventory -> Reporting**: `InventoryDeducted`, `LowStockAlert` events feed inventory projections
- **Preparation -> Ordering**: `PreparationCompleted` event updates order status

## Data Retention

| Data Category | Retention | Strategy |
|---------------|-----------|----------|
| Orders and payments | 7 years | Regulatory requirement |
| Preparation records | 90 days | Operational relevance |
| Inventory transactions | 1 year | Audit trail |
| Reporting projections | Indefinite | Aggregated, low volume |
