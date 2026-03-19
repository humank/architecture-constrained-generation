import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import { KubectlV31Layer } from '@aws-cdk/lambda-layer-kubectl-v31';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/types';

interface ComputeStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  vpc: ec2.Vpc;
}

export class ComputeStack extends cdk.Stack {
  public readonly cluster: eks.Cluster;
  public readonly appNamespace: eks.KubernetesManifest;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const { config, vpc } = props;
    const prefix = `coffeeshop-${config.environment}`;

    // EKS Cluster (from assessment-2 Q5: Option A — EKS)
    this.cluster = new eks.Cluster(this, 'CoffeeshopCluster', {
      clusterName: `${prefix}-cluster`,
      vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      defaultCapacity: 0, // We'll add managed node groups explicitly
      version: eks.KubernetesVersion.V1_31,
      kubectlLayer: new KubectlV31Layer(this, 'KubectlLayer'),
      endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
      clusterLogging: [
        eks.ClusterLoggingTypes.API,
        eks.ClusterLoggingTypes.AUDIT,
        eks.ClusterLoggingTypes.AUTHENTICATOR,
        eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
        eks.ClusterLoggingTypes.SCHEDULER,
      ],
    });

    // Managed Node Group — application workloads
    this.cluster.addNodegroupCapacity('AppNodeGroup', {
      nodegroupName: `${prefix}-app-nodes`,
      instanceTypes: [new ec2.InstanceType(config.eks.nodeInstanceType)],
      minSize: config.eks.minNodes,
      maxSize: config.eks.maxNodes,
      desiredSize: config.eks.desiredNodes,
      diskSize: 50,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      labels: {
        'workload-type': 'application',
      },
    });

    // Install AWS Load Balancer Controller for ALB Ingress
    const albServiceAccount = this.cluster.addServiceAccount('AwsLoadBalancerController', {
      name: 'aws-load-balancer-controller',
      namespace: 'kube-system',
    });

    albServiceAccount.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('ElasticLoadBalancingFullAccess')
    );

    // Install ALB Controller via Helm
    this.cluster.addHelmChart('AwsLoadBalancerController', {
      chart: 'aws-load-balancer-controller',
      repository: 'https://aws.github.io/eks-charts',
      namespace: 'kube-system',
      values: {
        clusterName: this.cluster.clusterName,
        serviceAccount: {
          create: false,
          name: 'aws-load-balancer-controller',
        },
        region: config.region,
        vpcId: vpc.vpcId,
      },
    });

    // Install Cluster Autoscaler
    const autoscalerSa = this.cluster.addServiceAccount('ClusterAutoscaler', {
      name: 'cluster-autoscaler',
      namespace: 'kube-system',
    });

    autoscalerSa.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AutoScalingFullAccess')
    );

    this.cluster.addHelmChart('ClusterAutoscaler', {
      chart: 'cluster-autoscaler',
      repository: 'https://kubernetes.github.io/autoscaler',
      namespace: 'kube-system',
      values: {
        autoDiscovery: {
          clusterName: this.cluster.clusterName,
        },
        awsRegion: config.region,
        rbac: {
          serviceAccount: {
            create: false,
            name: 'cluster-autoscaler',
          },
        },
      },
    });

    // Create namespaces — exported so dependent stacks can add dependency
    this.appNamespace = this.cluster.addManifest('AppNamespace', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: config.environment },
    });

    // Outputs
    new cdk.CfnOutput(this, 'ClusterName', { value: this.cluster.clusterName });
    new cdk.CfnOutput(this, 'ClusterEndpoint', { value: this.cluster.clusterEndpoint });
    new cdk.CfnOutput(this, 'ClusterArn', { value: this.cluster.clusterArn });
  }
}
