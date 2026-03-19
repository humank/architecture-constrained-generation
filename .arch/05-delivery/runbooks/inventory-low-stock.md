# Runbook: Inventory Low Stock Alert

## Trigger
LowStockAlertTriggered event — material stock below 30% threshold

## Severity
**WARNING** — Business alert; does not indicate system failure but requires operational response.

## Steps

1. **Verify alert accuracy**: Query inventory-service API to confirm current stock level
   - `GET /api/inventory/materials/<materialId>` — check `currentQuantity` vs `reorderThreshold`
2. **Check recent deductions**: Review recent InventoryDeducted events to understand consumption rate
   - CloudWatch Logs Insights: `fields @timestamp, eventType, materialId, quantity | filter eventType = "InventoryDeducted" and materialId = "<id>" | sort @timestamp desc | limit 20`
3. **Check for anomalous deductions**: Large or unexpected quantity drops may indicate a bug in ordering or preparation
4. **Notify procurement/counter staff**: Ensure SNS notification was delivered (email/SMS)
   - AWS Console → SNS → check delivery status
5. **If stock is critically low (< 10%)**:
   - Consider temporarily disabling menu items that require the material
   - Escalate to manager for emergency procurement
6. **If alert is false positive**: Check inventory-service logs for reconciliation errors

## Prevention
- Tune reorder thresholds based on historical consumption patterns
- Implement automated reorder suggestions based on consumption velocity
- Regular inventory reconciliation between system and physical count
