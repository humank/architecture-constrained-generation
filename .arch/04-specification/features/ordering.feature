Feature: Order Management
  As a cashier
  I want to place, confirm, and process payment for customer orders
  So that customers can purchase coffee drinks at their table

  Background:
    Given the coffeeshop has 5 tables numbered 1 through 5
    And the menu contains the following coffee types:
      | coffee_type  | sizes                          |
      | Espresso     | Single, Double                 |
      | Americano    | Short, Tall, Grande, Venti     |
      | Latte        | Short, Tall, Grande, Venti     |
      | Cappuccino   | Short, Tall, Grande, Venti     |
    And the pricing is as follows:
      | coffee_type  | Short | Tall | Grande | Venti |
      | Americano    | $80   | $100 | $120   | $140  |
      | Latte        | $100  | $120 | $140   | $160  |
      | Cappuccino   | $100  | $120 | $140   | $160  |
    And Espresso pricing is:
      | size   | price |
      | Single | $60   |
      | Double | $80   |
    And whipped cream is available for Cappuccino only at +$20

  Scenario: Place order with valid items
    When the cashier places an order for Table 3 with the following items:
      | coffee_type  | size   | options        |
      | Latte        | Tall   |                |
      | Cappuccino   | Grande | whipped cream  |
    Then the order should be created with status "Placed"
    And the order total should be $280
    And the order should be assigned to Table 3

  Scenario: Reject order with invalid table number zero
    When the cashier places an order for Table 0 with the following items:
      | coffee_type | size  | options |
      | Latte       | Tall  |         |
    Then the order should be rejected with message "Invalid table number"

  Scenario: Reject order with invalid table number exceeding capacity
    When the cashier places an order for Table 6 with the following items:
      | coffee_type | size  | options |
      | Latte       | Tall  |         |
    Then the order should be rejected with message "Invalid table number"

  Scenario: Reject invalid size for Espresso
    When the cashier places an order for Table 1 with the following items:
      | coffee_type | size | options |
      | Espresso    | Tall |         |
    Then the order should be rejected with message "Invalid size for Espresso"

  Scenario: Confirm order changes status from Placed to Confirmed
    Given an order exists for Table 2 with status "Placed" containing:
      | coffee_type | size   | options |
      | Americano   | Grande |         |
    When the cashier confirms the order
    Then the order status should change to "Confirmed"

  Scenario: Process payment with exact cash
    Given a confirmed order for Table 3 with total $280
    When the cashier processes payment with $280 in cash
    Then the payment should be accepted
    And the change should be $0
    And the order status should change to "Paid"

  Scenario: Process payment with change
    Given a confirmed order for Table 3 with total $280
    When the cashier processes payment with $300 in cash
    Then the payment should be accepted
    And the change should be $20
    And the order status should change to "Paid"

  Scenario: Reject insufficient payment
    Given a confirmed order for Table 3 with total $280
    When the cashier processes payment with $200 in cash
    Then the payment should be rejected with message "Insufficient payment"
    And the order status should remain "Confirmed"

  Scenario: Deliver and complete order
    Given a paid order for Table 4 with status "Ready"
    When the server delivers the order to Table 4
    Then the order status should change to "Completed"

  Scenario: Service unavailable returns error message
    Given the ordering service is unavailable
    When the cashier places an order for Table 1 with the following items:
      | coffee_type | size  | options |
      | Latte       | Short |         |
    Then the system should return an error message "Service unavailable"
