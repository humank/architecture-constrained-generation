Feature: Query Endpoints with Semantic Filters and Enum Literals
  As a frontend developer
  I want query endpoints to correctly handle both semantic filters and enum literal params
  So that the frontend receives correctly filtered data without runtime crashes

  Background:
    Given the following orders exist in the system:
      | orderId  | tableNumber | status    | totalAmount |
      | order-1  | 1           | Placed    | 120         |
      | order-2  | 2           | Confirmed | 280         |
      | order-3  | 3           | Paid      | 160         |
      | order-4  | 4           | Ready     | 200         |
      | order-5  | 5           | Completed | 340         |

  # === CL-1: Semantic Filter vs enum literal: ?status=active ===
  # 'active' is NOT an OrderStatus enum value — it means "all non-COMPLETED orders"

  Scenario: Query active orders returns all non-completed orders (semantic filter)
    When the frontend calls "GET /api/orders?status=active"
    Then the response status should be 200
    And the response Content-Type should be "application/json"
    And the response should contain 4 orders
    And the response should NOT contain order with status "Completed"
    And the response should contain orders with statuses "Placed, Confirmed, Paid, Ready"

  Scenario: Query active orders is case-insensitive (semantic filter)
    When the frontend calls "GET /api/orders?status=Active"
    Then the response status should be 200
    And the response should contain 4 orders

  Scenario: Query active orders returns empty list when all completed
    Given all orders have status "Completed"
    When the frontend calls "GET /api/orders?status=active"
    Then the response status should be 200
    And the response should be an empty JSON array "[]"
    And the response should NOT be null

  # === CL-1: Enum Literal: ?status=Placed ===
  # 'Placed' IS an OrderStatus enum value — backend uses Enum.valueOf()

  Scenario: Query orders by exact enum status Placed (enum literal)
    When the frontend calls "GET /api/orders?status=Placed"
    Then the response status should be 200
    And the response should contain 1 order
    And every order in the response should have status "Placed"

  Scenario: Query orders by exact enum status Confirmed (enum literal)
    When the frontend calls "GET /api/orders?status=Confirmed"
    Then the response status should be 200
    And the response should contain 1 order
    And every order in the response should have status "Confirmed"

  Scenario: Query orders by exact enum status Ready (enum literal)
    When the frontend calls "GET /api/orders?status=Ready"
    Then the response status should be 200
    And the response should contain 1 order
    And every order in the response should have status "Ready"

  # === Invalid values ===

  Scenario: Query orders with invalid status returns 400 (not 500)
    When the frontend calls "GET /api/orders?status=INVALID"
    Then the response status should be 400
    And the response should contain an error message
    And the response should NOT return status 500

  Scenario: Query orders with no status parameter returns empty list
    When the frontend calls "GET /api/orders"
    Then the response status should be 200
    And the response should be an empty JSON array "[]"

  # === Preparation semantic filter ===

  Scenario: Query preparation queue with comma-separated statuses (semantic filter)
    Given the following preparations exist:
      | preparationId | orderId  | status     |
      | prep-1        | order-3  | Pending    |
      | prep-2        | order-4  | InProgress |
      | prep-3        | order-5  | Ready      |
    When the frontend calls "GET /api/preparations?status=Pending,InProgress"
    Then the response status should be 200
    And the response should contain 2 preparations
    And the response should NOT contain preparation with status "Ready"

  # === Response shape verification ===

  Scenario: Order response DTO fields match frontend types.ts
    When the frontend calls "GET /api/orders?status=active"
    Then the response status should be 200
    And each order in the response should have these fields:
      | field       | type   | example              |
      | orderId     | string | UUID format          |
      | tableNumber | int    | 1-5                  |
      | status      | string | OrderStatus enum     |
      | totalAmount | int    | whole TWD, NOT cents |
      | items       | array  | [] not null          |
      | placedAt    | string | ISO-8601 format      |

  Scenario: Inventory response DTO includes alertTriggered as boolean (not isLowStock)
    When the frontend calls "GET /api/inventory"
    Then the response status should be 200
    And each item in the response should have field "alertTriggered" as boolean
    And the response should NOT have field "isAlertTriggered"
    And the response should NOT have field "isLowStock"

  Scenario: Sales report returns aggregated object (not raw order list)
    When the frontend calls "GET /api/reporting/sales"
    Then the response status should be 200
    And the response should be a JSON object (not array)
    And the response should have fields: totalOrders, totalRevenue, averageOrderValue, ordersByHour
    And "totalRevenue" should be whole TWD (not cents)
