# Domain Model -- Ordering Bounded Context

## Class Diagram

```mermaid
classDiagram
    class Order {
        <<AggregateRoot>>
        -UUID orderId
        -List~OrderItem~ items
        -OrderStatus status
        -Money totalAmount
        -Instant createdAt
        -Instant updatedAt
        +placeOrder(List~OrderItem~ items) Order
        +confirm()
        +pay(Money amount)
        +markReady()
        +deliver()
        +complete()
        +calculateTotal() Money
    }

    class OrderItem {
        <<Entity>>
        -UUID orderItemId
        -CoffeeType coffeeType
        -Size size
        -List~Customization~ customizations
        -int quantity
        -Money unitPrice
        +subtotal() Money
    }

    class Money {
        <<ValueObject>>
        -BigDecimal amount
        -String currency
        +add(Money other) Money
        +multiply(int quantity) Money
    }

    class OrderStatus {
        <<enumeration>>
        PLACED
        CONFIRMED
        PAID
        READY
        DELIVERED
        COMPLETED
    }

    class CoffeeType {
        <<enumeration>>
        ESPRESSO
        AMERICANO
        LATTE
        CAPPUCCINO
        MOCHA
        FLAT_WHITE
    }

    class Size {
        <<enumeration>>
        SMALL
        MEDIUM
        LARGE
    }

    class Customization {
        <<enumeration>>
        EXTRA_SHOT
        OAT_MILK
        SOY_MILK
        ALMOND_MILK
        VANILLA_SYRUP
        CARAMEL_SYRUP
        WHIPPED_CREAM
        DECAF
    }

    class MenuService {
        <<DomainService>>
        +resolvePrice(CoffeeType, Size, List~Customization~) Money
        +isAvailable(CoffeeType) boolean
    }

    Order "1" *-- "1..*" OrderItem : contains
    Order --> OrderStatus : has status
    Order --> Money : totalAmount
    OrderItem --> CoffeeType : specifies
    OrderItem --> Size : specifies
    OrderItem --> Customization : has 0..*
    OrderItem --> Money : unitPrice
    MenuService ..> Money : returns
    MenuService ..> CoffeeType : uses
```

## Invariants

- An Order must contain at least one OrderItem.
- State transitions follow the strict sequence: Placed -> Confirmed -> Paid -> Ready -> Delivered -> Completed.
- `totalAmount` must equal the sum of all `OrderItem.subtotal()` values.
- Payment amount must match `totalAmount` exactly.
