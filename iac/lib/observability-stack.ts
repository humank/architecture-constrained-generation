import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface ObservabilityStackProps extends cdk.StackProps {
  config: any;
  cluster: eks.Cluster;
  queues: Record<string, sqs.Queue>;
  dlqs: Record<string, sqs.Queue>;
}

export class ObservabilityStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    const { config, cluster, queues, dlqs } = props;
    const prefix = `coffeeshop-${config.environment}`;

    // === ADOT Collector (DaemonSet) ===
    const adotSa = cluster.addServiceAccount('AdotCollector', {
      name: 'adot-collector',
      namespace: 'opentelemetry',
    });

    adotSa.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
    );
    (adotSa.role as iam.Role).addToPolicy(new iam.PolicyStatement({
      actions: [
        'xray:PutTraceSegments',
        'xray:PutTelemetryRecords',
        'xray:GetSamplingRules',
        'xray:GetSamplingTargets',
        'logs:PutLogEvents',
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
      ],
      resources: ['*'],
    }));

    // Create ADOT namespace
    cluster.addManifest('OtelNamespace', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'opentelemetry' },
    });

    // Install ADOT via Helm
    cluster.addHelmChart('AdotCollector', {
      chart: 'adot-exporter-for-eks-on-ec2',
      repository: 'https://aws-observability.github.io/aws-otel-helm-charts',
      namespace: 'opentelemetry',
      values: {
        serviceAccount: {
          create: false,
          name: 'adot-collector',
        },
        awsRegion: config.region,
      },
    });

    // === CloudWatch Alarms ===

    // SNS topic for alarm notifications
    const alarmTopic = new sns.Topic(this, 'AlarmNotifications', {
      topicName: `${prefix}-alarm-notifications`,
      displayName: 'Coffeeshop Alarm Notifications',
    });

    // DLQ alarms — CRITICAL: any message in DLQ means failed event processing
    Object.entries(dlqs).forEach(([name, dlq]) => {
      new cloudwatch.Alarm(this, `DlqAlarm-${name}`, {
        alarmName: `${prefix}-dlq-${name}`,
        alarmDescription: `Messages in DLQ: ${name}. Investigate failed event processing immediately.`,
        metric: dlq.metricApproximateNumberOfMessagesVisible({
          period: cdk.Duration.minutes(1),
        }),
        threshold: 0,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }).addAlarmAction({
        bind: () => ({ alarmActionArn: alarmTopic.topicArn }),
      });
    });

    // Queue depth alarms — WARNING: backlog building up
    Object.entries(queues).forEach(([name, queue]) => {
      new cloudwatch.Alarm(this, `QueueDepth-${name}`, {
        alarmName: `${prefix}-queue-depth-${name}`,
        alarmDescription: `Queue ${name} depth > 100. Check consumer health.`,
        metric: queue.metricApproximateNumberOfMessagesVisible({
          period: cdk.Duration.minutes(5),
        }),
        threshold: 100,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 1,
      });
    });

    // === CloudWatch Dashboard ===
    const dashboard = new cloudwatch.Dashboard(this, 'ServiceHealthDashboard', {
      dashboardName: `${prefix}-service-health`,
    });

    // SQS metrics row
    const queueWidgets = Object.entries(queues).map(([name, queue]) =>
      new cloudwatch.GraphWidget({
        title: `Queue: ${name}`,
        left: [
          queue.metricApproximateNumberOfMessagesVisible(),
          queue.metricNumberOfMessagesReceived(),
        ],
        width: 6,
      })
    );

    dashboard.addWidgets(...queueWidgets);

    // DLQ metrics row
    const dlqWidgets = Object.entries(dlqs).map(([name, dlq]) =>
      new cloudwatch.GraphWidget({
        title: `DLQ: ${name}`,
        left: [dlq.metricApproximateNumberOfMessagesVisible()],
        width: 6,
      })
    );

    dashboard.addWidgets(...dlqWidgets);

    // Outputs
    new cdk.CfnOutput(this, 'AlarmTopicArn', { value: alarmTopic.topicArn });
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${config.region}.console.aws.amazon.com/cloudwatch/home?region=${config.region}#dashboards:name=${prefix}-service-health`,
    });
  }
}
