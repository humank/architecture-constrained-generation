# Coffeeshop Management System — Business Requirements

## Overview

A system to manage a small coffee shop's daily operations: ordering, payment, coffee preparation, and inventory management. The shop has 5 tables (10 seats), serves 4 types of coffee with various sizes and customizations, accepts cash only, and needs automated inventory monitoring with replenishment alerts.

## Business Goals

1. **Streamline the order-to-serve workflow** — Every order is accurately tracked from placement to delivery with correct pricing
2. **Prevent raw material stockouts** — Automated alerts at 30% threshold; zero stockout incidents per month
3. **Provide business visibility** — Dashboard showing real-time inventory, monthly and weekly sales

## Actors

- **Customer**: Walks in, views menu, orders at table, pays cash, receives coffee
- **Waiter**: Goes to table, takes order with table number, delivers coffee
- **Counter Staff (Cashier)**: Confirms order, processes cash payment, submits to barista, handles purchasing
- **Barista**: Receives orders, prepares coffee per recipe, takes ingredients from warehouse, confirms replenishment

## Menu & Pricing

| Product     | Single | Double | Short | Tall | Grande | Venti |
|-------------|--------|--------|-------|------|--------|-------|
| Espresso    | $60    | $80    | —     | —    | —      | —     |
| Americano   | —      | —      | $80   | $100 | $120   | $140  |
| Latte       | —      | —      | $100  | $120 | $140   | $160  |
| Cappuccino  | —      | —      | $100  | $120 | $140   | $160  |

## Coffee Recipes

- 1 shot = 20g coffee beans = 30ml espresso
- Each size/type has a specific recipe (shots, milk, foam, water, filter paper)
- Dine-in serving temperature: 70°C
- Take-away serving temperature: 90°C

## Customizations

- **Latte foam level**: no foam / with foam / more foam
- **Cappuccino style**: dry foam (1:2 milk-to-foam ratio) or wet foam (2:1 milk-to-foam ratio)
- **Whipped cream** (Cappuccino only): +$20 surcharge, 20ml whipped cream added
- **Soy milk substitution** (Latte & Cappuccino only): replaces regular milk with soy milk in recipe

## Order Workflow

1. Waiter takes order at table (table number 1–5, coffee type, size, quantity, customizations)
2. Counter Staff confirms order, system auto-calculates total (including customization surcharges)
3. Counter Staff processes cash payment (cash only)
4. Order is submitted to Barista after payment
5. Barista prepares coffee following exact recipe
6. Waiter delivers coffee to table
7. Waiter marks order as complete

## Inventory Management

### Material Capacities

| Material     | Max Capacity           |
|--------------|------------------------|
| Coffee beans | 100 bags × 1kg        |
| Milk         | 50 bottles × 2L       |
| Soy milk     | 20 bottles × 2L       |
| Filter paper | 200 packs × 100 sheets|

### Rules

- Ingredients are deducted from inventory when Barista starts preparation
- **Low-stock alert**: Automatic notification (text or email) when any material drops below 30%
- **Replenishment**: Barista requests replenishment → Counter Staff purchases → Barista confirms delivery → Stock restored to 100%
- **Replenishment SLA**: Must complete within 3 days

## Constraints

- Cash only — no digital or card payment
- 5 tables, 10 seats total
- Single physical coffee shop location
- Waiter takes order at the table verbally, not via self-service kiosk
- No online ordering or delivery — dine-in and take-away at counter only
- Brewing temperature (88–98°C) is equipment concern, not software

## Non-Functional Requirements

- **Usability**: Staff can place an order within 30 seconds
- **Reliability**: Zero lost orders
- **Performance**: Order processing < 2 seconds
