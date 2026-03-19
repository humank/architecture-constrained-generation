Feature: Order Preparation
  As a barista
  I want to receive paid orders, prepare drinks, and mark them ready
  So that customers receive their coffee in the correct order

  Background:
    Given the following recipe base:
      | ingredient    | unit   | notes                                  |
      | coffee_beans  | grams  | 1 shot = 20g; all drinks use 1 shot    |
      | filter_paper  | sheets | Espresso only; 1 sheet per drink       |
      | milk          | ml     | Short=150, Tall=200, Grande=250, Venti=300 |
    And the inventory has sufficient stock for preparation

  Scenario: Receive order from barista queue after payment
    Given a paid order exists for Table 2 containing:
      | coffee_type | size  | options |
      | Americano   | Tall  |         |
    When the order enters the barista queue
    Then the barista should receive the order with status "Paid"
    And the order should be visible in the preparation queue

  Scenario: Start preparation deducts ingredients for Tall Latte
    Given a paid order exists for Table 1 containing:
      | coffee_type | size | options |
      | Latte       | Tall |         |
    And the current inventory levels are:
      | material     | quantity |
      | coffee_beans | 50000g   |
      | milk         | 50000ml  |
    When the barista starts preparing the order
    Then the order status should change to "Preparing"
    And the following ingredients should be deducted:
      | material     | amount |
      | coffee_beans | 20g    |
      | milk         | 200ml  |
    And the inventory levels should be:
      | material     | quantity |
      | coffee_beans | 49980g   |
      | milk         | 49800ml  |

  Scenario: Start preparation deducts ingredients for Espresso Single
    Given a paid order exists for Table 5 containing:
      | coffee_type | size   | options |
      | Espresso    | Single |         |
    And the current inventory levels are:
      | material     | quantity     |
      | coffee_beans | 50000g       |
      | filter_paper | 10000 sheets |
    When the barista starts preparing the order
    Then the order status should change to "Preparing"
    And the following ingredients should be deducted:
      | material     | amount   |
      | coffee_beans | 20g      |
      | filter_paper | 1 sheet  |
    And the inventory levels should be:
      | material     | quantity     |
      | coffee_beans | 49980g       |
      | filter_paper | 9999 sheets  |

  Scenario: Complete all items marks order ready
    Given a preparing order for Table 3 with all items completed:
      | coffee_type  | size   | status    |
      | Latte        | Tall   | Completed |
      | Cappuccino   | Grande | Completed |
    When the barista marks all items as done
    Then the order status should change to "Ready"

  Scenario: Soy milk substitution replaces milk with soy_milk
    Given a paid order exists for Table 2 containing:
      | coffee_type | size  | options  |
      | Latte       | Tall  | soy milk |
    And the current inventory levels are:
      | material     | quantity |
      | coffee_beans | 50000g   |
      | milk         | 50000ml  |
      | soy_milk     | 20000ml  |
    When the barista starts preparing the order
    Then the following ingredients should be deducted:
      | material     | amount |
      | coffee_beans | 20g    |
      | soy_milk     | 200ml  |
    And the milk inventory should remain at 50000ml

  Scenario: Cappuccino dry foam recipe uses 1:2 milk-to-foam ratio
    Given a paid order exists for Table 4 containing:
      | coffee_type | size  | options |
      | Cappuccino  | Tall  |         |
    When the barista starts preparing the order
    Then the preparation instructions should specify:
      | component    | amount              |
      | coffee_beans | 20g                 |
      | milk         | 200ml total         |
      | milk_liquid  | 67ml (1/3 of 200ml) |
      | foam         | 133ml (2/3 of 200ml)|
    And the milk-to-foam ratio should be 1:2

  Scenario: Preparation start fails with error
    Given a paid order exists for Table 1 containing:
      | coffee_type | size | options |
      | Latte       | Tall |         |
    And the preparation service encounters an internal error
    When the barista starts preparing the order
    Then the system should return an error message "Preparation failed"
    And the order status should remain "Paid"
    And no ingredients should be deducted
