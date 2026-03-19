# Cross-Phase Consistency Verification

## Thread 1: Language Consistency
Every term in `glossary.yaml` must be used consistently across all artifacts.

| Term | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Status |
|------|---------|---------|---------|---------|---------|--------|
| Order | ✅ | ✅ | ✅ | ✅ | ✅ | CONSISTENT |
| OrderStatus | ✅ | ✅ | ✅ | ✅ | ✅ | CONSISTENT |
| Preparation | ✅ | ✅ | ✅ | ✅ | ✅ | CONSISTENT |
| InventoryItem | ✅ | ✅ | ✅ | ✅ | ✅ | CONSISTENT |
| Replenishment | ✅ | ✅ | ✅ | ✅ | ✅ | CONSISTENT |
| Money (TWD, int) | ✅ | ✅ | ✅ | ✅ | ✅ | CONSISTENT |

## Thread 2: Event Consistency
Every event in `event-storm.yaml` must appear in aggregates, BDD, and contracts.

| Event | Event Storm | Aggregate | BDD | Contract | Status |
|-------|------------|-----------|-----|----------|--------|
| OrderPlaced | ✅ | ✅ ordering.yaml | ✅ ordering.feature | ✅ ordering-preparation | CONSISTENT |
| OrderConfirmed | ✅ | ✅ | ✅ | N/A (internal) | CONSISTENT |
| PaymentProcessed | ✅ | ✅ | ✅ | N/A (internal) | CONSISTENT |
| OrderSubmittedToBarista | ✅ | ✅ | ✅ | ✅ ordering-preparation | CONSISTENT |
| PreparationStarted | ✅ | ✅ preparation.yaml | ✅ preparation.feature | ✅ preparation-inventory | CONSISTENT |
| CoffeePrepared | ✅ | ✅ | ✅ | N/A (internal) | CONSISTENT |
| OrderReadyForDelivery | ✅ | ✅ | ✅ | ✅ preparation→ordering | CONSISTENT |
| OrderDelivered | ✅ | ✅ | ✅ | N/A (internal) | CONSISTENT |
| OrderCompleted | ✅ | ✅ | ✅ | ✅ ordering-reporting | CONSISTENT |
| IngredientDeducted | ✅ | ✅ inventory.yaml | ✅ inventory.feature | ✅ inventory-reporting | CONSISTENT |
| LowStockAlertTriggered | ✅ | ✅ | ✅ | N/A (notification) | CONSISTENT |
| ReplenishmentRequested | ✅ | ✅ | ✅ | N/A (internal) | CONSISTENT |
| PurchaseOrderCreated | ✅ | ✅ | ✅ | N/A (internal) | CONSISTENT |
| ReplenishmentConfirmed | ✅ | ✅ | ✅ | N/A (internal) | CONSISTENT |

## Thread 3: Invariant Consistency
Every business rule in requirements must appear in aggregate invariants and BDD scenarios.

| Business Rule | Requirements | Aggregate Invariant | BDD Scenario | Status |
|--------------|-------------|-------------------|--------------|--------|
| Table 1-5 | ✅ | ✅ ordering.yaml | ✅ ordering.feature | CONSISTENT |
| Espresso: Single/Double only | ✅ | ✅ | ✅ | CONSISTENT |
| Cash ≥ total | ✅ | ✅ | ✅ | CONSISTENT |
| Low-stock at 30% | ✅ | ✅ inventory.yaml | ✅ inventory.feature | CONSISTENT |
| Replenishment SLA 3 days | ✅ | ✅ | ✅ | CONSISTENT |
| Whipped cream +$20 for Cappuccino | ✅ | ✅ | ✅ ordering.feature | CONSISTENT |

## Thread 4: State Machine Consistency
Every aggregate state diagram is complete, reachable, and includes saga-triggered transitions.

| Aggregate | States | All Reachable? | Trigger Documented? | Status |
|-----------|--------|---------------|-------------------|--------|
| Order | Placed→Confirmed→Paid→Ready→Delivered→Completed | ✅ | ✅ (actor + system for Ready) | CONSISTENT |
| Preparation | Pending→InProgress→Ready | ✅ | ✅ (Barista for all) | CONSISTENT |
| InventoryItem | (continuous level tracking) | ✅ | ✅ (system-triggered deduction) | CONSISTENT |
| Replenishment | Requested→PurchaseOrdered→Delivered | ✅ | ✅ (Barista + Counter Staff) | CONSISTENT |

**Note**: Order `Paid→Ready` is triggered by system consuming `OrderReadyForDelivery` event from Preparation BC — this is correctly documented.

## Thread 5: Integration Consistency
Every context-map relationship has a matching contract definition.

| Relationship | Context Map | Contract File | Events Covered | Status |
|-------------|------------|--------------|---------------|--------|
| Ordering → Preparation | ✅ | ✅ ordering-preparation.yaml | OrderSubmittedToBarista | CONSISTENT |
| Preparation → Ordering | ✅ | ✅ (in ordering-preparation.yaml) | OrderReadyForDelivery | CONSISTENT |
| Preparation → Inventory | ✅ | ✅ preparation-inventory.yaml | PreparationStarted | CONSISTENT |
| Ordering → Reporting | ✅ | ✅ ordering-reporting.yaml | OrderCompleted | CONSISTENT |
| Inventory → Reporting | ✅ | ✅ inventory-reporting.yaml | IngredientDeducted | CONSISTENT |

## Thread 6: Cross-Layer Type Consistency (CRITICAL)

### 6a: Enum Consistency

| Enum | aggregates/*.yaml | shared_enums (frontend-arch) | Java Code | TypeScript | StatusBadge | Status |
|------|------------------|------------------------------|-----------|------------|-------------|--------|
| OrderStatus | Placed, Confirmed, Paid, Preparing, Ready, Delivered, Completed | ✅ same | ✅ same | ✅ union type | ✅ all mapped | **VERIFY in Phase 8** |
| PreparationStatus | Pending, InProgress, Ready | ✅ same | ✅ same | ✅ union type | ✅ all mapped | **VERIFY in Phase 8** |
| ItemPreparationStatus | Pending, InProgress, Done | ✅ same | ✅ same | ✅ union type | ✅ all mapped | **VERIFY in Phase 8** |
| CoffeeType | Espresso, Americano, Latte, Cappuccino | ✅ same | ✅ same | ✅ union type | N/A | **VERIFY in Phase 8** |
| CoffeeSize | Single, Double, Short, Tall, Grande, Venti | ✅ same | ✅ same | ✅ union type | N/A | **VERIFY in Phase 8** |
| Customization | NoFoam, WithFoam, MoreFoam, DryFoam, WetFoam, WhippedCream, SoyMilk | ✅ same | ✅ same | ✅ union type | N/A | **VERIFY in Phase 8** |
| ReplenishmentStatus | Requested, PurchaseOrdered, Delivered | ✅ same | ✅ same | ✅ union type | ✅ all mapped | **VERIFY in Phase 8** |

### 6b: Query Parameter Consistency

| Frontend Endpoint | Query Param | Type | In api_contract? | BDD Scenario? | Controller Branch? | Status |
|-------------------|------------|------|-----------------|--------------|-------------------|--------|
| GET /api/orders?status=active | status=active | semantic_filter | ✅ | ✅ query-endpoints.feature | ✅ if("active".equalsIgnoreCase) | **VERIFY in Phase 8** |
| GET /api/orders?status=Ready | status=Ready | enum_literal | ✅ | ✅ query-endpoints.feature | ✅ Enum.valueOf("READY") | **VERIFY in Phase 8** |
| GET /api/orders?status=Placed | status=Placed | enum_literal | ✅ | ✅ query-endpoints.feature | ✅ Enum.valueOf("PLACED") | **VERIFY in Phase 8** |
| GET /api/orders?status=Confirmed | status=Confirmed | enum_literal | ✅ | ✅ query-endpoints.feature | ✅ Enum.valueOf("CONFIRMED") | **VERIFY in Phase 8** |
| GET /api/preparations?status=Pending,InProgress | status=Pending,InProgress | semantic_filter | ✅ | ✅ query-endpoints.feature | ✅ split + findByStatusIn | **VERIFY in Phase 8** |

### 6c: DTO Field Name Consistency

| Endpoint | JSON Field | Java DTO Field | TypeScript Field | Jackson Note | Status |
|----------|-----------|---------------|-----------------|-------------|--------|
| GET /api/orders | orderId | orderId | orderId | record → same | **VERIFY** |
| GET /api/orders | tableNumber | tableNumber | tableNumber | record → same | **VERIFY** |
| GET /api/orders | totalAmount | totalAmount | totalAmount | record → same | **VERIFY** |
| GET /api/orders | placedAt | placedAt | placedAt | @JsonFormat(STRING) required | **VERIFY** |
| GET /api/inventory | alertTriggered | alertTriggered | alertTriggered | NOT isAlertTriggered | **VERIFY** |
| GET /api/reporting/sales | totalOrders | totalOrders | totalOrders | record → same | **VERIFY** |
| GET /api/reporting/sales | totalRevenue | totalRevenue | totalRevenue | record → same | **VERIFY** |
| GET /api/reporting/sales | ordersByHour | ordersByHour | ordersByHour | record → same | **VERIFY** |

### 6d: Money/Quantity Consistency

| Field | Requirements Value | API Response | Frontend Display | Unit | Status |
|-------|-------------------|-------------|-----------------|------|--------|
| Espresso Single price | 60 | 60 | "60 THB" | TWD whole number | **VERIFY** |
| Latte Tall price | 120 | 120 | "120 THB" | TWD whole number | **VERIFY** |
| Whipped cream surcharge | 20 | +20 to total | "+20 THB" | TWD whole number | **VERIFY** |
| Order totalAmount | sum of line items | int (e.g., 280) | "280 THB" | TWD whole number | **VERIFY** |
| changeGiven | cash - total | int (e.g., 20) | "20 THB" | TWD whole number | **VERIFY** |

### 6e: Null/Empty Collection Contract

| Field | When Empty | Backend Returns | Frontend Expects | Status |
|-------|-----------|----------------|-----------------|--------|
| Order.items | no items (edge) | [] (empty array) | .map() safe | **VERIFY** |
| SalesReport.ordersByHour | no sales | [] (empty array) | .map() safe | **VERIFY** |
| Inventory list | always 4 items | [4 items] | .map() safe | **VERIFY** |
| Preparation.items | always ≥1 | [items] | .map() safe | **VERIFY** |

### 6f: Error Response Shape

| Error Type | HTTP Status | Response Shape | Frontend Handler | Status |
|-----------|------------|---------------|-----------------|--------|
| Validation error | 400 | { timestamp, status, error, message, path } | error interceptor | **VERIFY** |
| Not found | 404 | { timestamp, status, error, message, path } | error interceptor | **VERIFY** |
| State conflict | 409 | { timestamp, status, error, message, path } | onError callback | **VERIFY** |
| Server error | 500 | { timestamp, status, error, message, path } | error interceptor | **VERIFY** |
| Service down | 502/503 | non-JSON possible | content-type check | **VERIFY** |

---

## Verification Notes

All items marked **VERIFY in Phase 8** must be confirmed during Phase 8 Step 13.2 (Cross-Layer Contract Alignment) by:
1. Curling the actual endpoint with exact frontend parameters
2. Comparing JSON response field names with `types.ts`
3. Checking semantic filter controller branches exist
4. Running DTO serialization roundtrip tests

All items must also be re-verified in Phase 9 (Step 13.6) against DEPLOYED URLs (CloudFront/ALB), not localhost.
