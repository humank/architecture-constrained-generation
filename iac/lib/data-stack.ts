import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/types';

interface DataStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  vpc: ec2.Vpc;
  dbSecurityGroup: ec2.SecurityGroup;
}

export class DataStack extends cdk.Stack {
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly dbSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const { config, vpc, dbSecurityGroup } = props;

    // Database credentials in Secrets Manager
    const dbCredentials = new secretsmanager.Secret(this, 'DbCredentials', {
      secretName: `coffeeshop/${config.environment}/db-credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'coffeeshop_admin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    this.dbSecret = dbCredentials;

    // RDS PostgreSQL — single instance, schema-per-BC (from assessment-2 Q4: Option A)
    this.dbInstance = new rds.DatabaseInstance(this, 'CoffeeshopDb', {
      instanceIdentifier: `coffeeshop-${config.environment}-db`,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_6,
      }),
      // config.rds.instanceType is a plain EC2 type (e.g. 't3.medium') — no 'db.' prefix
      instanceType: new ec2.InstanceType(config.rds.instanceType),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(dbCredentials),
      databaseName: 'coffeeshop',
      allocatedStorage: config.rds.allocatedStorage,
      maxAllocatedStorage: config.rds.allocatedStorage * 2,
      multiAz: config.rds.multiAz,
      backupRetention: cdk.Duration.days(config.rds.backupRetention),
      deletionProtection: config.environment === 'production',
      removalPolicy: config.environment === 'production'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,

      // Encryption at rest
      storageEncrypted: true,

      // Performance Insights
      enablePerformanceInsights: true,

      // Monitoring
      monitoringInterval: cdk.Duration.seconds(60),
    });

    // Outputs
    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: this.dbInstance.dbInstanceEndpointAddress,
    });
    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: dbCredentials.secretArn,
    });

    // Note: Schema creation (ordering, preparation, inventory, reporting)
    // is handled by Flyway migrations in each service at startup.
    // V1__create_schema.sql: CREATE SCHEMA IF NOT EXISTS ordering;
    // V1__create_schema.sql: CREATE SCHEMA IF NOT EXISTS preparation;
    // V1__create_schema.sql: CREATE SCHEMA IF NOT EXISTS inventory;
    // V1__create_schema.sql: CREATE SCHEMA IF NOT EXISTS reporting;
  }
}
