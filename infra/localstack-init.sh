#!/bin/bash
# Initialize SNS topics and SQS queues in LocalStack
# Mirrors the messaging-stack.ts CDK definition

REGION=ap-east-2

echo "Creating SNS topics..."
awslocal sns create-topic --name ordering-events --region $REGION
awslocal sns create-topic --name preparation-events --region $REGION
awslocal sns create-topic --name inventory-events --region $REGION

echo "Creating SQS queues (with DLQs)..."
# DLQs
awslocal sqs create-queue --queue-name preparation-from-ordering-dlq --region $REGION
awslocal sqs create-queue --queue-name ordering-from-preparation-dlq --region $REGION
awslocal sqs create-queue --queue-name inventory-from-preparation-dlq --region $REGION
awslocal sqs create-queue --queue-name reporting-from-ordering-dlq --region $REGION
awslocal sqs create-queue --queue-name reporting-from-inventory-dlq --region $REGION

# Main queues with DLQ redrive policy
for QUEUE in preparation-from-ordering ordering-from-preparation inventory-from-preparation reporting-from-ordering reporting-from-inventory; do
  DLQ_ARN=$(awslocal sqs get-queue-attributes --queue-url http://localhost:4566/000000000000/${QUEUE}-dlq --attribute-names QueueArn --region $REGION --query 'Attributes.QueueArn' --output text)
  awslocal sqs create-queue \
    --queue-name $QUEUE \
    --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}" \
    --region $REGION
done

echo "Creating SNS subscriptions with filter policies..."

# Ordering events → Preparation (OrderSubmittedToBarista only)
PREP_QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url http://localhost:4566/000000000000/preparation-from-ordering --attribute-names QueueArn --region $REGION --query 'Attributes.QueueArn' --output text)
awslocal sns subscribe \
  --topic-arn arn:aws:sns:${REGION}:000000000000:ordering-events \
  --protocol sqs \
  --notification-endpoint $PREP_QUEUE_ARN \
  --attributes '{"FilterPolicy":"{\"eventType\":[\"OrderSubmittedToBarista\"]}"}' \
  --region $REGION

# Preparation events → Ordering (OrderReadyForDelivery only)
ORD_QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url http://localhost:4566/000000000000/ordering-from-preparation --attribute-names QueueArn --region $REGION --query 'Attributes.QueueArn' --output text)
awslocal sns subscribe \
  --topic-arn arn:aws:sns:${REGION}:000000000000:preparation-events \
  --protocol sqs \
  --notification-endpoint $ORD_QUEUE_ARN \
  --attributes '{"FilterPolicy":"{\"eventType\":[\"OrderReadyForDelivery\"]}"}' \
  --region $REGION

# Preparation events → Inventory (PreparationStarted ONLY — CRITICAL filter)
INV_QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url http://localhost:4566/000000000000/inventory-from-preparation --attribute-names QueueArn --region $REGION --query 'Attributes.QueueArn' --output text)
awslocal sns subscribe \
  --topic-arn arn:aws:sns:${REGION}:000000000000:preparation-events \
  --protocol sqs \
  --notification-endpoint $INV_QUEUE_ARN \
  --attributes '{"FilterPolicy":"{\"eventType\":[\"PreparationStarted\"]}"}' \
  --region $REGION

# Ordering events → Reporting (OrderCompleted only)
REP_ORD_ARN=$(awslocal sqs get-queue-attributes --queue-url http://localhost:4566/000000000000/reporting-from-ordering --attribute-names QueueArn --region $REGION --query 'Attributes.QueueArn' --output text)
awslocal sns subscribe \
  --topic-arn arn:aws:sns:${REGION}:000000000000:ordering-events \
  --protocol sqs \
  --notification-endpoint $REP_ORD_ARN \
  --attributes '{"FilterPolicy":"{\"eventType\":[\"OrderCompleted\"]}"}' \
  --region $REGION

# Inventory events → Reporting (IngredientDeducted only)
REP_INV_ARN=$(awslocal sqs get-queue-attributes --queue-url http://localhost:4566/000000000000/reporting-from-inventory --attribute-names QueueArn --region $REGION --query 'Attributes.QueueArn' --output text)
awslocal sns subscribe \
  --topic-arn arn:aws:sns:${REGION}:000000000000:inventory-events \
  --protocol sqs \
  --notification-endpoint $REP_INV_ARN \
  --attributes '{"FilterPolicy":"{\"eventType\":[\"IngredientDeducted\"]}"}' \
  --region $REGION

echo "LocalStack initialization complete!"
echo "Topics: ordering-events, preparation-events, inventory-events"
echo "Queues: 5 main + 5 DLQs with filter policies"
