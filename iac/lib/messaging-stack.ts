import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

interface MessagingStackProps extends cdk.StackProps {
  config: any;
}

export class MessagingStack extends cdk.Stack {
  public readonly topics: Record<string, sns.Topic>;
  public readonly queues: Record<string, sqs.Queue>;
  public readonly dlqs: Record<string, sqs.Queue>;

  constructor(scope: Construct, id: string, props: MessagingStackProps) {
    super(scope, id, props);

    const { config } = props;
    const prefix = `coffeeshop-${config.environment}`;

    this.topics = {};
    this.queues = {};
    this.dlqs = {};

    // === SNS Topics (from context-map.yaml) ===
    // 3 topics: one per publishing BC

    this.topics['ordering-events'] = new sns.Topic(this, 'OrderingEventsTopic', {
      topicName: `${prefix}-ordering-events`,
      displayName: 'Ordering BC Events (OrderSubmittedToBarista, OrderCompleted)',
    });

    this.topics['preparation-events'] = new sns.Topic(this, 'PreparationEventsTopic', {
      topicName: `${prefix}-preparation-events`,
      displayName: 'Preparation BC Events (PreparationStarted, CoffeePrepared, OrderReadyForDelivery)',
    });

    this.topics['inventory-events'] = new sns.Topic(this, 'InventoryEventsTopic', {
      topicName: `${prefix}-inventory-events`,
      displayName: 'Inventory BC Events (IngredientDeducted, LowStockAlertTriggered)',
    });

    // === SQS Queues + DLQs (from context-map.yaml) ===

    // 1. Preparation consumes from Ordering
    this.createQueueWithDlq('preparation-from-ordering', prefix);
    this.topics['ordering-events'].addSubscription(
      new subscriptions.SqsSubscription(this.queues['preparation-from-ordering'], {
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: ['OrderSubmittedToBarista'],
          }),
        },
      })
    );

    // 2. Ordering consumes from Preparation (OrderReadyForDelivery only)
    this.createQueueWithDlq('ordering-from-preparation', prefix);
    this.topics['preparation-events'].addSubscription(
      new subscriptions.SqsSubscription(this.queues['ordering-from-preparation'], {
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: ['OrderReadyForDelivery'],
          }),
        },
      })
    );

    // 3. Inventory consumes from Preparation (PreparationStarted ONLY)
    // CRITICAL: Filter out CoffeePrepared and OrderReadyForDelivery
    this.createQueueWithDlq('inventory-from-preparation', prefix);
    this.topics['preparation-events'].addSubscription(
      new subscriptions.SqsSubscription(this.queues['inventory-from-preparation'], {
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: ['PreparationStarted'],
          }),
        },
      })
    );

    // 4. Reporting consumes from Ordering (OrderCompleted only)
    this.createQueueWithDlq('reporting-from-ordering', prefix);
    this.topics['ordering-events'].addSubscription(
      new subscriptions.SqsSubscription(this.queues['reporting-from-ordering'], {
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: ['OrderCompleted'],
          }),
        },
      })
    );

    // 5. Reporting consumes from Inventory (IngredientDeducted only)
    this.createQueueWithDlq('reporting-from-inventory', prefix);
    this.topics['inventory-events'].addSubscription(
      new subscriptions.SqsSubscription(this.queues['reporting-from-inventory'], {
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: ['IngredientDeducted'],
          }),
        },
      })
    );

    // Outputs
    Object.entries(this.topics).forEach(([name, topic]) => {
      new cdk.CfnOutput(this, `Topic-${name}`, { value: topic.topicArn });
    });
  }

  private createQueueWithDlq(name: string, prefix: string): void {
    // DLQ
    const dlq = new sqs.Queue(this, `${name}-dlq`, {
      queueName: `${prefix}-${name}-dlq`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });
    this.dlqs[name] = dlq;

    // Main queue
    const queue = new sqs.Queue(this, name, {
      queueName: `${prefix}-${name}`,
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(7),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
    });
    this.queues[name] = queue;
  }
}
