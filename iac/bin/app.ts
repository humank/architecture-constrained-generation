#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { DataStack } from '../lib/data-stack';
import { MessagingStack } from '../lib/messaging-stack';
import { ComputeStack } from '../lib/compute-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { ObservabilityStack } from '../lib/observability-stack';
import { IamStack } from '../lib/iam-stack';
import { CiCdStack } from '../lib/cicd-stack';
import { stagingConfig } from '../config/staging';
import { productionConfig } from '../config/production';

const app = new cdk.App();

const environment = app.node.tryGetContext('environment') || 'staging';
const config = environment === 'production' ? productionConfig : stagingConfig;

const env: cdk.Environment = {
  region: config.region,
  account: process.env.CDK_DEFAULT_ACCOUNT,
};

const prefix = `coffeeshop-${config.environment}`;

// Network — VPC, subnets, NAT Gateway
const networkStack = new NetworkStack(app, `${prefix}-network`, {
  env,
  config,
});

// Data — RDS PostgreSQL, Secrets Manager
const dataStack = new DataStack(app, `${prefix}-data`, {
  env,
  config,
  vpc: networkStack.vpc,
  dbSecurityGroup: networkStack.dbSecurityGroup,
});

// Messaging — SNS topics, SQS queues, DLQs, subscription filters
const messagingStack = new MessagingStack(app, `${prefix}-messaging`, {
  env,
  config,
});

// Compute — EKS cluster, managed node groups, ALB
const computeStack = new ComputeStack(app, `${prefix}-compute`, {
  env,
  config,
  vpc: networkStack.vpc,
});

// IAM — IRSA roles for each service
const iamStack = new IamStack(app, `${prefix}-iam`, {
  env,
  config,
  cluster: computeStack.cluster,
  topics: messagingStack.topics,
  queues: messagingStack.queues,
  dbSecret: dataStack.dbSecret,
});

// Frontend — S3, CloudFront, WAF
const frontendStack = new FrontendStack(app, `${prefix}-frontend`, {
  env,
  config,
});

// Observability — ADOT, CloudWatch dashboards, X-Ray, alarms
const observabilityStack = new ObservabilityStack(app, `${prefix}-observability`, {
  env,
  config,
  cluster: computeStack.cluster,
  queues: messagingStack.queues,
  dlqs: messagingStack.dlqs,
});

// CI/CD — ECR repos, CodePipeline, CodeBuild
const cicdStack = new CiCdStack(app, `${prefix}-cicd`, {
  env,
  config,
  cluster: computeStack.cluster,
});

// Tag all resources
cdk.Tags.of(app).add('Project', 'coffeeshop');
cdk.Tags.of(app).add('Environment', config.environment);
cdk.Tags.of(app).add('ManagedBy', 'CDK');

app.synth();
