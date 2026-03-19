Feature: Reporting
  As a shop manager
  I want to view sales and inventory reports
  So that I can make informed business decisions

  Scenario: Sales report aggregates completed orders
    Given the following completed orders exist:
      | order_id | table | items                                    | total |
      | ORD-001  | 3     | Tall Latte, Grande Cappuccino w/ whipped cream | $280  |
      | ORD-002  | 1     | Single Espresso                          | $60   |
      | ORD-003  | 5     | Venti Americano, Short Latte             | $240  |
    When the manager requests a sales report
    Then the report should show 3 completed orders
    And the total revenue should be $580
    And each order should include order_id, table, items, and total

  Scenario: Inventory report shows current levels
    Given the current inventory levels are:
      | material     | current   | max_capacity   | percentage |
      | coffee_beans | 70000g    | 100000g        | 70%        |
      | milk         | 45000ml   | 100000ml       | 45%        |
      | soy_milk     | 30000ml   | 40000ml        | 75%        |
      | filter_paper | 5000 sheets | 20000 sheets | 25%        |
    When the manager requests an inventory report
    Then the report should list all 4 materials with current level, max capacity, and percentage
    And filter_paper should be flagged as below the 30% threshold

  Scenario: Empty state when no completed orders exist
    Given no completed orders exist
    When the manager requests a sales report
    Then the report should show 0 completed orders
    And the total revenue should be $0

  Scenario: Reporting service unavailable returns error
    Given the reporting service is unavailable
    When the manager requests a sales report
    Then the system should return an error message "Reporting service unavailable"
