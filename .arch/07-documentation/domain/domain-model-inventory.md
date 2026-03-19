# Domain Model -- Inventory Bounded Context

## Class Diagram

```mermaid
classDiagram
    class InventoryItem {
        <<AggregateRoot>>
        -UUID inventoryItemId
        -String ingredientName
        -BigDecimal currentStock
        -String unit
        -BigDecimal reorderThreshold
        -BigDecimal reorderQuantity
        +deduct(BigDecimal quantity)
        +restock(BigDecimal quantity)
        +isBelowThreshold() boolean
    }

    class Replenishment {
        <<AggregateRoot>>
        -UUID replenishmentId
        -UUID inventoryItemId
        -BigDecimal requestedQuantity
        -ReplenishmentStatus status
        -Instant requestedAt
        -Instant deliveredAt
        +createPurchaseOrder()
        +confirmDelivery(BigDecimal actualQuantity)
    }

    class ReplenishmentStatus {
        <<enumeration>>
        REQUESTED
        PURCHASE_ORDERED
        DELIVERED
    }

    class DeductInventoryService {
        <<DomainService>>
        +deductForPreparation(UUID preparationId, List~IngredientQuantity~ ingredients)
        +checkAvailability(List~IngredientQuantity~ ingredients) boolean
    }

    class IngredientQuantity {
        <<ValueObject>>
        -String ingredientName
        -BigDecimal quantity
        -String unit
    }

    Replenishment --> ReplenishmentStatus : has status
    Replenishment --> InventoryItem : replenishes
    DeductInventoryService ..> InventoryItem : deducts from
    DeductInventoryService ..> IngredientQuantity : consumes
```

## Invariants

- `currentStock` must never go below zero; a deduction that would cause negative stock must be rejected.
- A Replenishment can only transition Requested -> PurchaseOrdered -> Delivered.
- `confirmDelivery` restocks the linked InventoryItem by the actual delivered quantity.
- When `isBelowThreshold()` returns true after a deduction, an `InventoryLow` domain event is raised.
