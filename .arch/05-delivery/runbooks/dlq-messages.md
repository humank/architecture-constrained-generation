# Runbook: DLQ Messages Detected

## Trigger
CloudWatch alarm: DLQ `ApproximateNumberOfMessages > 0`

## Severity
**CRITICAL** — Failed event processing means data inconsistency (e.g., inventory not deducted, reporting stale).

## Steps

1. **Identify the DLQ**: Check which DLQ has messages (alarm name tells you)
2. **Read DLQ messages**: `aws sqs receive-message --queue-url <DLQ_URL> --max-number-of-messages 10`
3. **Inspect message body**: Look at `eventType`, `orderId`, error details
4. **Common causes**:
   - `inventory-from-preparation-dlq`: Usually "Inventory item not found" → seed data missing. Fix: run Flyway migration, then replay DLQ messages.
   - `preparation-from-ordering-dlq`: Preparation service crashed during processing. Fix: check logs, fix bug, replay.
   - `reporting-from-*-dlq`: Projection failed. Usually safe to replay after fix.
5. **Replay messages**: Move DLQ messages back to source queue
   ```
   aws sqs start-message-move-task \
     --source-arn <DLQ_ARN> \
     --destination-arn <SOURCE_QUEUE_ARN>
   ```
6. **Monitor**: Watch the source queue depth decrease and DLQ stays at 0
7. **Verify data**: Spot-check affected aggregates via API

## Prevention
- Ensure Flyway seed data runs before SQS consumers start
- Idempotent consumers (deduplication by eventId)
- Comprehensive integration tests with LocalStack
