# Domain Model -- Preparation Bounded Context

## Class Diagram

```mermaid
classDiagram
    class Preparation {
        <<AggregateRoot>>
        -UUID preparationId
        -UUID orderId
        -List~PreparationItem~ items
        -PreparationStatus status
        -Instant startedAt
        -Instant completedAt
        +start()
        +completeItem(UUID itemId)
        +complete()
        +allItemsDone() boolean
    }

    class PreparationItem {
        <<Entity>>
        -UUID preparationItemId
        -UUID orderItemId
        -Recipe recipe
        -PreparationItemStatus status
        +start()
        +complete()
    }

    class Recipe {
        <<ValueObject>>
        -String name
        -List~Ingredient~ ingredients
        -String instructions
        -Duration estimatedTime
    }

    class Ingredient {
        <<ValueObject>>
        -String name
        -BigDecimal quantity
        -String unit
    }

    class PreparationStatus {
        <<enumeration>>
        PENDING
        IN_PROGRESS
        READY
    }

    class PreparationItemStatus {
        <<enumeration>>
        PENDING
        IN_PROGRESS
        DONE
    }

    class RecipeResolutionService {
        <<DomainService>>
        +resolve(String coffeeType, String size, List~String~ customizations) Recipe
    }

    Preparation "1" *-- "1..*" PreparationItem : contains
    Preparation --> PreparationStatus : has status
    PreparationItem --> PreparationItemStatus : has status
    PreparationItem --> Recipe : follows
    Recipe "1" *-- "1..*" Ingredient : requires
    RecipeResolutionService ..> Recipe : produces
```

## Invariants

- A Preparation can only move to READY when `allItemsDone()` returns true.
- A Preparation cannot be started if it is already IN_PROGRESS or READY.
- Each PreparationItem must have a resolved Recipe before preparation begins.
- The `orderId` links back to the Ordering BC but is treated as an opaque identifier (no direct coupling).
