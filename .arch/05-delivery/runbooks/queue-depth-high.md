# Runbook: Queue Depth High

## Trigger
SQS queue depth > 1000 messages (ApproximateNumberOfMessagesVisible) over 5 minutes

## Severity
**WARNING** — Messages are accumulating faster than consumers can process; may indicate consumer failure or traffic spike.

## Steps

1. **Identify the queue**: Check alarm name for queue identifier
2. **Check consumer service health**: `kubectl get pods -l app=<consumer-service> -n <namespace>` — are pods running and ready?
3. **Check consumer logs**: `kubectl logs -l app=<consumer-service> -n <namespace> --tail=100` — look for processing errors
4. **Check DLQ**: `aws sqs get-queue-attributes --queue-url <DLQ_URL> --attribute-names ApproximateNumberOfMessages` — if DLQ is growing, consumers are failing (see [dlq-messages.md](dlq-messages.md))
5. **Check consumer processing rate**: CloudWatch → SQS → NumberOfMessagesDeleted — should be non-zero and steady
6. **Check for poison messages**: A single bad message can block FIFO queue processing
7. **Scale consumers**:
   - Increase pod replicas: `kubectl scale deployment/<consumer-service> --replicas=<N> -n <namespace>`
   - Or adjust HPA if configured
8. **If traffic spike**: Verify it is legitimate (e.g., batch import). Queue will drain naturally once spike passes.
9. **Monitor drain**: Watch queue depth decrease in CloudWatch. Ensure DLQ stays at 0.

## Prevention
- HPA on consumer services based on SQS queue depth (KEDA or custom metrics)
- Set visibility timeout > max processing time to avoid duplicate processing
- Idempotent consumers to handle retries safely
