Feature: Inventory Management
  As a shop manager
  I want to track ingredient stock levels and receive low-stock alerts
  So that the coffeeshop never runs out of materials during service

  Background:
    Given the inventory has the following maximum capacities:
      | material     | max_capacity   |
      | coffee_beans | 100000g        |
      | milk         | 100000ml       |
      | soy_milk     | 40000ml        |
      | filter_paper | 20000 sheets   |
    And the low-stock alert threshold is 30% of maximum capacity

  Scenario: Deduct ingredient reduces stock level
    Given the current inventory level for coffee_beans is 50000g
    When 20g of coffee_beans is deducted
    Then the inventory level for coffee_beans should be 49980g

  Scenario: Low-stock alert fires at 30% threshold
    Given the current inventory level for coffee_beans is 30020g
    And no low-stock alert has been raised for coffee_beans
    When 20g of coffee_beans is deducted
    Then the inventory level for coffee_beans should be 30000g
    And a low-stock alert should be raised for coffee_beans
    And the alert should indicate "coffee_beans at 30% capacity (30000g / 100000g)"

  Scenario: No duplicate alerts for same threshold crossing
    Given the current inventory level for coffee_beans is 29000g
    And a low-stock alert has already been raised for coffee_beans
    When 20g of coffee_beans is deducted
    Then the inventory level for coffee_beans should be 28980g
    And no additional low-stock alert should be raised for coffee_beans

  Scenario: Request replenishment flow
    Given a low-stock alert exists for coffee_beans at 25000g
    When the manager requests replenishment for coffee_beans
    Then a replenishment request should be created for coffee_beans
    And the replenishment request status should be "Pending"
    And the requested amount should be 75000g to restore to 100% capacity

  Scenario: Confirm replenishment restores inventory to 100%
    Given a pending replenishment request exists for coffee_beans with amount 75000g
    And the current inventory level for coffee_beans is 25000g
    When the manager confirms the replenishment for coffee_beans
    Then the inventory level for coffee_beans should be 100000g
    And the replenishment request status should change to "Fulfilled"
    And the low-stock alert for coffee_beans should be cleared

  Scenario: Deduct for unknown material returns error
    When 100g of "matcha_powder" is deducted
    Then the system should return an error message "Unknown material: matcha_powder"
    And no inventory levels should be changed
