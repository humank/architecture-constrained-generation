# Journey layer, not rule layer. One Feature per to-be domain story (plan §2 Phase 4).
# Every step cites the DST step it replays. Rules and invariants live in
# ../ordering.feature, ../preparation.feature and ../inventory.feature.
#
# Story:  DS-01 Order to Serve
# Actors: Customer, Waiter, Counter Staff, Barista, System
# Smoke:  this is the journey pipeline Stage 8 replays against the deployed URL.

@journey @DS-01 @mvp
Feature: DS-01 Order to Serve
  As the coffeeshop
  I want one order to travel from a spoken request at the table to a delivered coffee
  So that the whole collaboration works end to end, not only each service in isolation

  Background:
    Given the coffeeshop has 5 tables numbered 1 through 5
    And all materials are stocked at 100% capacity

  @smoke
  Scenario: A table orders, pays in cash, and is served
    # DS-01.1, DS-01.2 — collaboration, no system step: the customer speaks, nothing is recorded
    Given a customer is seated at Table 3 and has asked for a Tall Latte and a Grande Cappuccino with whipped cream
    # DS-01.5, DS-01.6 — Waiter enters Order; System calculates TotalPrice
    When the waiter places an order for Table 3 with the following items:
      | coffee_type | size   | options       |
      | Latte       | Tall   |               |
      | Cappuccino  | Grande | whipped cream |
    Then the order should be created with status "Placed"
    And the order total should be $280
    # DS-01.7 — Counter Staff confirms Order
    When the counter staff confirms the order
    Then the order status should change to "Confirmed"
    # DS-01.8, DS-01.9 — Customer tenders Cash (not a system step); Counter Staff processes CashPayment
    When the counter staff processes payment with $300 cash received
    Then the change given should be $20
    And the order status should change to "Paid"
    # DS-01.10 — System hands over Order from Counter Staff to Barista
    Then the order should appear in the barista queue with resolved recipes
    And the order should NOT have appeared in the barista queue before payment
    # DS-01.11, DS-01.12 — Barista views BaristaQueue, starts Preparation
    When the barista starts preparation of every item in the order
    Then the preparation status should be "InProgress"
    # DS-01.13 — System deducts Inventory by recipe
    And the inventory level of "coffee_beans" should have decreased by the resolved recipe quantity
    # DS-01.14 — Barista completes Coffee
    When the barista completes every item in the order
    # DS-01.15 — System marks ready, handing Order from Barista to Waiter
    Then the order status should change to "Ready"
    # DS-01.16, DS-01.17 — Waiter views ReadyOrders, delivers Order
    And the order should appear in the waiter's ready orders for Table 3
    When the waiter marks the order delivered
    Then the order status should change to "Delivered"
    # DS-01.18 — Waiter completes Order
    When the waiter marks the order complete
    Then the order status should change to "Completed"
    And the completed order should appear in the sales report for today

  Scenario: The journey stops at payment — an unpaid order never reaches the Barista
    # Guards DS-01.10: the handoff is the only route into preparation
    Given an order for Table 2 with status "Confirmed"
    When the barista views the queue
    Then the order should not be listed
    And no inventory should have been deducted for that order

  @resilience
  Scenario: The waiter sees a real error when preparation is unavailable
    # Plan §2 Phase 9 error resilience, replayed per DST actor
    Given the preparation service is unavailable
    When the waiter opens the ready orders view
    Then the view should show the error state "Unable to load orders. Tap to retry."
    And the view should not show an empty list as if there were no orders
