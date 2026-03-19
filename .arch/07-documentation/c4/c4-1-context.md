# C4 Level 1 -- System Context Diagram

## Coffeeshop Management System

The context diagram shows the Coffeeshop Management System as a single box, its four human actors, and the external notification system it depends on.

```mermaid
C4Context
    title Coffeeshop Management System -- System Context (Level 1)

    Person(customer, "Customer", "Places orders at the counter or via a waiter and picks up drinks.")
    Person(waiter, "Waiter", "Takes orders from customers, delivers completed drinks.")
    Person(counterStaff, "Counter Staff", "Confirms orders, processes payments, manages purchase orders.")
    Person(barista, "Barista", "Prepares drinks, confirms ingredient deliveries.")

    System(coffeeshop, "Coffeeshop Management System", "Manages the full lifecycle of coffee orders, drink preparation, inventory tracking, and operational reporting.")

    System_Ext(notifications, "Email / SMS Notification Service", "Sends order-status updates and low-stock alerts to staff.")

    Rel(customer, coffeeshop, "Places and receives orders")
    Rel(waiter, coffeeshop, "Submits orders, delivers drinks")
    Rel(counterStaff, coffeeshop, "Confirms orders, processes payments, manages replenishment")
    Rel(barista, coffeeshop, "Prepares drinks, confirms deliveries")
    Rel(coffeeshop, notifications, "Sends notifications via", "HTTPS / API")
```

## Actor Responsibilities

| Actor | Primary Actions |
|-------|----------------|
| Customer | Place order, receive drink |
| Waiter | Submit order, deliver completed drink, mark order complete |
| Counter Staff | Confirm order, process payment, create purchase orders |
| Barista | Start preparation, complete preparation, confirm ingredient delivery |
