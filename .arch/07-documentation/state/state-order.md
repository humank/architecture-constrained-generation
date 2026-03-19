# State Machine -- Order

## Order Status Transitions

```mermaid
stateDiagram-v2
    [*] --> Placed : Waiter places order

    Placed --> Confirmed : Counter Staff confirms order
    Confirmed --> Paid : Counter Staff processes payment
    Paid --> Ready : System (PreparationCompleted event)
    Ready --> Delivered : Waiter delivers drink to customer
    Delivered --> Completed : Waiter marks order complete

    Placed --> Cancelled : Counter Staff cancels order
    Confirmed --> Cancelled : Counter Staff cancels order

    Completed --> [*]
    Cancelled --> [*]
```

## Transition Detail

| From | To | Triggered By | Command / Event | Preconditions |
|------|----|-------------|-----------------|---------------|
| -- | Placed | Waiter | PlaceOrder command | At least one item, valid menu items |
| Placed | Confirmed | Counter Staff | ConfirmOrder command | Order exists in Placed state |
| Confirmed | Paid | Counter Staff | PayOrder command | Payment amount matches total |
| Paid | Ready | System | PreparationCompleted event (via SQS) | All preparation items completed |
| Ready | Delivered | Waiter | DeliverOrder command | Drink handed to customer |
| Delivered | Completed | Waiter | CompleteOrder command | Customer acknowledged |
| Placed | Cancelled | Counter Staff | CancelOrder command | Order not yet paid |
| Confirmed | Cancelled | Counter Staff | CancelOrder command | Order not yet paid |
