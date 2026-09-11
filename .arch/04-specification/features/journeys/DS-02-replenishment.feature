# Journey layer. Story: DS-02 Inventory Alert and Replenishment.
# Actors: Barista, Counter Staff, System, Supplier (external).

@journey @DS-02 @mvp
Feature: DS-02 Inventory Alert and Replenishment
  As the coffeeshop
  I want a low material to travel from alert to restocked shelf
  So that preparation never silently fails for want of milk

  Background:
    Given the coffeeshop has 5 tables numbered 1 through 5

  @smoke
  Scenario: Milk runs low, is reordered, and is restored to full
    # DS-02.1 — Barista views Inventory
    Given the barista can see the inventory levels for all materials
    And "milk" is stocked at 35% of its 100000 ml capacity
    # DS-02.2 — System triggers Low-Stock Alert below 30%
    When preparation deducts enough "milk" to drop it below 30% of capacity
    Then a low-stock alert should be triggered for "milk"
    # DS-02.3 — Counter Staff receives Low-Stock Alert
    And the counter staff should see the alert as active
    # DS-02.4, DS-02.5 — Barista requests Replenishment, handing it to Counter Staff
    When the barista requests replenishment for "milk"
    Then the replenishment status should be "Requested"
    And the request should appear in the counter staff's pending replenishments
    # DS-02.6 — Counter Staff creates Purchase Order
    When the counter staff records a purchase order for "milk"
    Then the replenishment status should change to "PurchaseOrdered"
    # DS-02.7 — Supplier delivers Material: external, 3-day SLA, not a domain command
    # DS-02.8 — Barista confirms Replenishment, restoring stock
    When the barista confirms the replenishment delivery for "milk"
    Then the replenishment status should change to "Delivered"
    And the "milk" level should be restored to 100000 ml
    And the low-stock alert for "milk" should no longer be active

  Scenario: The supplier is outside the boundary — no command represents their delivery
    # Guards DS-02.7 system_visible: false
    Given a replenishment for "milk" with status "PurchaseOrdered"
    When the supplier delivers the material physically
    Then the replenishment status should still be "PurchaseOrdered"
    And only the barista's confirmation should move it to "Delivered"

  @resilience
  Scenario: The barista sees a real error when inventory is unavailable
    Given the inventory service is unavailable
    When the barista opens the inventory dashboard
    Then the view should show the error state "Unable to load inventory. Tap to retry."
    And the view should not show every material at zero as if the shop were empty
