# Journey layer. Story: DS-03 Daily Reporting Review.
# Reads only: this journey asserts numbers, never state changes.

@journey @DS-03 @mvp
Feature: DS-03 Daily Reporting Review
  As Counter Staff
  I want the day's sales and current stock in one place
  So that I can order for tomorrow from what actually happened today

  Background:
    Given the following orders were completed today:
      | orderId | tableNumber | total |
      | ord-1   | 1           | 280   |
      | ord-2   | 3           | 160   |
      | ord-3   | 5           | 340   |

  @smoke
  Scenario: Counter Staff reviews the day's sales report
    # DS-03.1 — Counter Staff reviews SalesReport
    When the counter staff opens the sales report for today
    Then the report should show 3 completed orders
    And the report total revenue should be $780
    And the report should show revenue in whole TWD, not cents
    And the orders by hour should be a JSON array, never null

  Scenario: The report is a read model, not the record
    # Guards the reporting BC's read-only classification
    Given the sales report shows 3 completed orders
    When the counter staff opens the report again
    Then no domain event should have been emitted by opening it
    And the report figures should still come from OrderCompleted events

  Scenario: Counter Staff reviews current stock to decide purchasing
    # DS-03.2 — Counter Staff reviews Inventory.
    # DESIGN GAP recorded in DS-03: no Actor View page exists for this actor yet.
    When the counter staff opens the inventory levels
    Then every material should show its current level and percentage of capacity
    And materials below 30% should be marked as low stock

  @resilience
  Scenario: Counter Staff sees a real error when reporting is unavailable
    Given the reporting service is unavailable
    When the counter staff opens the sales report
    Then the view should show the error state "Unable to load report. Tap to retry."
    And the view should not show $0 revenue as if there had been no sales
