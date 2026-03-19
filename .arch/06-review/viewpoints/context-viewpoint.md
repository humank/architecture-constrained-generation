# Context Viewpoint

## System Scope

The Coffeeshop Management System handles the end-to-end lifecycle of coffee orders: from placement by customers or staff, through preparation by baristas, to delivery and completion. It also manages ingredient inventory with automated low-stock alerts and provides operational reporting for business insights.

The system is deployed to AWS (ap-east-2, Taipei) and serves a single-location coffeeshop with potential for multi-location expansion.

## Context Diagram

```mermaid
C4Context
    title Coffeeshop Management System - System Context

    Person(customer, "Customer", "Places orders via kiosk or mobile")
    Person(waiter, "Waiter", "Takes orders tableside, delivers drinks")
    Person(counterStaff, "Counter Staff", "Manages walk-in orders, handles payments")
    Person(barista, "Barista", "Prepares drinks, manages preparation queue")

    System_Boundary(coffeeshop, "Coffeeshop Management System") {
        System(ordering, "Ordering Service", "Core: order placement, payment processing, order lifecycle")
        System(preparation, "Preparation Service", "Core: drink preparation queue, recipe management")
        System(inventory, "Inventory Service", "Supporting: stock tracking, low-stock alerts, replenishment")
        System(reporting, "Reporting Service", "Generic: event-sourced projections, sales and inventory reports")
    }

    System_Ext(emailSms, "Email / SMS Gateway", "Sends low-stock alerts and operational notifications")

    Rel(customer, ordering, "Places orders")
    Rel(waiter, ordering, "Submits orders on behalf of customers")
    Rel(counterStaff, ordering, "Processes walk-in orders and payments")
    Rel(barista, preparation, "Views and updates preparation queue")
    Rel(inventory, emailSms, "Sends low-stock alerts")
    Rel(reporting, emailSms, "Sends daily summary reports")
```

## Actors

| Actor | Role | Primary Interactions |
|-------|------|---------------------|
| Customer | End consumer | Places orders via kiosk SPA or mobile browser |
| Waiter | Floor staff | Takes tableside orders, marks orders as delivered |
| Counter Staff | Front-of-house | Manages walk-in orders, processes payments |
| Barista | Preparation staff | Works through preparation queue, marks items ready |

## External Systems

| System | Purpose | Integration |
|--------|---------|-------------|
| Email / SMS Gateway | Operational alerts | Inventory low-stock warnings, daily report summaries |
