Feature: Cross-Layer Data Integrity
  As a system integrator
  I want data types to survive every boundary crossing (backend → API → frontend)
  So that the frontend renders correct data without silent failures

  # === CL-2: Enum round-trip ===

  Scenario: OrderStatus enum values survive backend → JSON → frontend round-trip
    Given an order with status "Placed" exists
    When the frontend calls "GET /api/orders?status=Placed"
    Then the JSON field "status" should be exactly "Placed" (case-sensitive)
    And the frontend StatusBadge component should have a color mapping for "Placed"

  Scenario: Every OrderStatus value has a frontend StatusBadge mapping
    Then the frontend StatusBadge component should have mappings for ALL of:
      | status    | expected_color |
      | Placed    | defined        |
      | Confirmed | defined        |
      | Paid      | defined        |
      | Preparing | defined        |
      | Ready     | defined        |
      | Delivered | defined        |
      | Completed | defined        |
    And there should be NO "unknown" or "default" fallback hiding a missing case

  Scenario: PreparationStatus enum values survive round-trip
    Given a preparation with status "Pending" exists
    When the frontend calls "GET /api/preparations?status=Pending,InProgress"
    Then each item's "status" field should be one of: "Pending", "InProgress", "Ready"

  # === CL-3: Money consistency ===

  Scenario: Order total in API matches pricing table (whole TWD, not cents)
    Given an order with 1x Latte Tall ($120) and 1x Cappuccino Grande with whipped cream ($140 + $20)
    When the frontend calls "GET /api/orders?status=active"
    Then the "totalAmount" field should be 280
    And the "totalAmount" should NOT be 28000

  Scenario: Payment change calculation uses whole TWD
    Given a confirmed order with total $280
    When the cashier pays with $300
    Then the response "changeGiven" should be 20
    And the response "changeGiven" should NOT be 2000

  # === CL-4: DateTime format ===

  Scenario: Order placedAt is ISO-8601 string (not Jackson array default)
    When the frontend calls "GET /api/orders?status=active"
    Then the "placedAt" field should match ISO-8601 pattern "yyyy-MM-ddTHH:mm:ss"
    And the "placedAt" field should NOT be a JSON array like [2024,3,15,10,30]

  # === CL-5: Null vs empty collection ===

  Scenario: Order with no items returns empty array (not null)
    Given an order exists with zero items (edge case)
    When the frontend calls "GET /api/orders?status=active"
    Then the "items" field should be an empty JSON array []
    And the "items" field should NOT be null

  Scenario: Sales report ordersByHour returns empty array when no sales
    Given no orders have been completed today
    When the frontend calls "GET /api/reporting/sales"
    Then the "ordersByHour" field should be an empty JSON array []
    And the "ordersByHour" field should NOT be null

  # === CL-6: Boolean field naming (Jackson) ===

  Scenario: Inventory alertTriggered boolean serializes correctly
    Given inventory item "coffee_beans" has alertTriggered = true
    When the frontend calls "GET /api/inventory"
    Then the JSON field name should be "alertTriggered" (not "isAlertTriggered")
    And the value should be boolean true (not string "true")

  # === CL-8: Error response shape ===

  Scenario: Backend 400 error returns JSON (not HTML)
    When the frontend calls "POST /api/orders" with invalid body {}
    Then the response status should be 400
    And the response Content-Type should be "application/json"
    And the response should have fields: timestamp, status, error, message

  Scenario: Backend 404 error returns JSON (not HTML)
    When the frontend calls "PATCH /api/orders/nonexistent-uuid/confirm"
    Then the response status should be 404
    And the response Content-Type should be "application/json"
    And the response should NOT be an HTML page

  Scenario: Backend 409 conflict returns JSON with domain error
    Given an order with status "Placed" exists
    When the frontend calls "POST /api/orders/{orderId}/pay" with cashReceived 100
    Then the response status should be 409
    And the response "message" should describe the state transition error
