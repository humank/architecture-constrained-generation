import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface IamStackProps extends cdk.StackProps {
  config: any;
  cluster: eks.Cluster;
  topics: Record<string, sns.Topic>;
  queues: Record<string, sqs.Queue>;
  dbSecret: secretsmanager.ISecret;
}

export class IamStack extends cdk.Stack {
  public readonly serviceAccounts: Record<string, eks.ServiceAccount>;

  constructor(scope: Construct, id: string, props: IamStackProps) {
    super(scope, id, props);

    const { config, cluster, topics, queues, dbSecret } = props;
    const ns = config.environment;

    this.serviceAccounts = {};

    // === Ordering Service IRSA ===
    // Needs: publish to ordering-events SNS, consume from ordering-from-preparation SQS,
    //        read DB secret, write CloudWatch logs
    const orderingSa = cluster.addServiceAccount('OrderingServiceAccount', {
      name: 'ordering-service',
      namespace: ns,
    });
    topics['ordering-events'].grantPublish(orderingSa);
    queues['ordering-from-preparation'].grantConsumeMessages(orderingSa);
    dbSecret.grantRead(orderingSa);
    orderingSa.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
    );
    (orderingSa.role as iam.Role).addToPolicy(new iam.PolicyStatement({
      actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
      resources: ['*'],
    }));
    this.serviceAccounts['ordering'] = orderingSa;

    // === Preparation Service IRSA ===
    // Needs: publish to preparation-events SNS, consume from preparation-from-ordering SQS,
    //        read DB secret, write CloudWatch logs
    const preparationSa = cluster.addServiceAccount('PreparationServiceAccount', {
      name: 'preparation-service',
      namespace: ns,
    });
    topics['preparation-events'].grantPublish(preparationSa);
    queues['preparation-from-ordering'].grantConsumeMessages(preparationSa);
    dbSecret.grantRead(preparationSa);
    preparationSa.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
    );
    (preparationSa.role as iam.Role).addToPolicy(new iam.PolicyStatement({
      actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
      resources: ['*'],
    }));
    this.serviceAccounts['preparation'] = preparationSa;

    // === Inventory Service IRSA ===
    // Needs: publish to inventory-events SNS, consume from inventory-from-preparation SQS,
    //        read DB secret, write CloudWatch logs
    const inventorySa = cluster.addServiceAccount('InventoryServiceAccount', {
      name: 'inventory-service',
      namespace: ns,
    });
    topics['inventory-events'].grantPublish(inventorySa);
    queues['inventory-from-preparation'].grantConsumeMessages(inventorySa);
    dbSecret.grantRead(inventorySa);
    inventorySa.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
    );
    (inventorySa.role as iam.Role).addToPolicy(new iam.PolicyStatement({
      actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
      resources: ['*'],
    }));
    this.serviceAccounts['inventory'] = inventorySa;

    // === Reporting Service IRSA ===
    // Needs: consume from reporting-from-ordering and reporting-from-inventory SQS,
    //        read DB secret, write CloudWatch logs
    const reportingSa = cluster.addServiceAccount('ReportingServiceAccount', {
      name: 'reporting-service',
      namespace: ns,
    });
    queues['reporting-from-ordering'].grantConsumeMessages(reportingSa);
    queues['reporting-from-inventory'].grantConsumeMessages(reportingSa);
    dbSecret.grantRead(reportingSa);
    reportingSa.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
    );
    (reportingSa.role as iam.Role).addToPolicy(new iam.PolicyStatement({
      actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
      resources: ['*'],
    }));
    this.serviceAccounts['reporting'] = reportingSa;
  }
}
