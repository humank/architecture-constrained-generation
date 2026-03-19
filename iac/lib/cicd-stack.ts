import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface CiCdStackProps extends cdk.StackProps {
  config: any;
  cluster: eks.Cluster;
}

export class CiCdStack extends cdk.Stack {
  public readonly ecrRepos: Record<string, ecr.Repository>;

  constructor(scope: Construct, id: string, props: CiCdStackProps) {
    super(scope, id, props);

    const { config } = props;
    const prefix = `coffeeshop-${config.environment}`;

    this.ecrRepos = {};

    // ECR Repositories — one per service (from bounded-contexts.yaml)
    const services = ['ordering-service', 'preparation-service', 'inventory-service', 'reporting-service'];

    services.forEach((service) => {
      this.ecrRepos[service] = new ecr.Repository(this, `Ecr-${service}`, {
        repositoryName: `${prefix}/${service}`,
        lifecycleRules: [
          {
            description: 'Keep last 10 images',
            maxImageCount: 10,
            rulePriority: 1,
          },
        ],
        imageScanOnPush: true,
        encryption: ecr.RepositoryEncryption.AES_256,
        removalPolicy: config.environment === 'production'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      });
    });

    // CodeBuild project for building and testing services
    const buildProject = new codebuild.Project(this, 'ServiceBuild', {
      projectName: `${prefix}-service-build`,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.MEDIUM,
        privileged: true, // Required for Docker builds
      },
      environmentVariables: {
        AWS_ACCOUNT_ID: { value: cdk.Aws.ACCOUNT_ID },
        AWS_REGION: { value: config.region },
        ENVIRONMENT: { value: config.environment },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo Logging in to Amazon ECR...',
              'aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com',
            ],
          },
          build: {
            commands: [
              'echo Building $SERVICE_NAME...',
              'cd services/$SERVICE_NAME',
              './gradlew clean build test',
              'docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ENVIRONMENT/$SERVICE_NAME:$CODEBUILD_RESOLVED_SOURCE_VERSION .',
            ],
          },
          post_build: {
            commands: [
              'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ENVIRONMENT/$SERVICE_NAME:$CODEBUILD_RESOLVED_SOURCE_VERSION',
              'echo Build completed on `date`',
            ],
          },
        },
      }),
    });

    // Grant ECR push permissions
    services.forEach((service) => {
      this.ecrRepos[service].grantPullPush(buildProject);
    });

    // CodeBuild project for frontend
    const frontendBuild = new codebuild.Project(this, 'FrontendBuild', {
      projectName: `${prefix}-frontend-build`,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': { nodejs: '20' },
            commands: ['cd frontend', 'npm ci'],
          },
          build: {
            commands: [
              'npx tsc --noEmit',
              'npm run lint',
              'npm run test -- --run',
              'npm run build',
            ],
          },
        },
        artifacts: {
          'base-directory': 'frontend/dist',
          files: ['**/*'],
        },
      }),
    });

    // Outputs
    services.forEach((service) => {
      new cdk.CfnOutput(this, `EcrUri-${service}`, {
        value: this.ecrRepos[service].repositoryUri,
      });
    });
  }
}
