import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CiCdStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  cluster: eks.Cluster;
  /** S3 bucket that hosts the frontend SPA (from FrontendStack) */
  frontendBucket: s3.IBucket;
  /** CloudFront distribution to invalidate after frontend deploy */
  distribution: cloudfront.IDistribution;
}

// ---------------------------------------------------------------------------
// Helper – backend service descriptor
// ---------------------------------------------------------------------------

interface ServiceDescriptor {
  /** Short name used in resource IDs (e.g. "ordering") */
  short: string;
  /** Full service name matching directory / ECR repo (e.g. "ordering-service") */
  full: string;
  /** Whether this service has a dedicated acceptance-test stage */
  hasAcceptanceTests: boolean;
  /** Whether this service has a dedicated contract-test stage */
  hasContractTests: boolean;
  /** Whether this service has a dedicated performance-test stage */
  hasPerformanceTests: boolean;
}

const BACKEND_SERVICES: ServiceDescriptor[] = [
  {
    short: 'ordering',
    full: 'ordering-service',
    hasAcceptanceTests: true,
    hasContractTests: true,
    hasPerformanceTests: true,
  },
  {
    short: 'preparation',
    full: 'preparation-service',
    hasAcceptanceTests: true,
    hasContractTests: true,
    hasPerformanceTests: false,
  },
  {
    short: 'inventory',
    full: 'inventory-service',
    hasAcceptanceTests: true,
    hasContractTests: true,
    hasPerformanceTests: false,
  },
  {
    short: 'reporting',
    full: 'reporting-service',
    hasAcceptanceTests: false,
    hasContractTests: false,
    hasPerformanceTests: false,
  },
];

// ===========================================================================
// Stack
// ===========================================================================

export class CiCdStack extends cdk.Stack {
  public readonly ecrRepos: Record<string, ecr.Repository>;

  constructor(scope: Construct, id: string, props: CiCdStackProps) {
    super(scope, id, props);

    const { config, cluster, frontendBucket, distribution } = props;
    const prefix = `coffeeshop-${config.environment}`;

    // -----------------------------------------------------------------------
    // Configuration – parameterised via CDK context / config
    // -----------------------------------------------------------------------

    const githubOwner = this.node.tryGetContext('githubOwner') ?? 'your-org';
    const githubRepo = this.node.tryGetContext('githubRepo') ?? 'coffeeshop';
    const githubBranch = this.node.tryGetContext('githubBranch') ?? 'main';

    // CodeStar connection ARN – must be created once in the console / CLI
    const codestarConnectionArn =
      this.node.tryGetContext('codestarConnectionArn') ??
      `arn:aws:codestar-connections:${config.region}:${cdk.Aws.ACCOUNT_ID}:connection/PLACEHOLDER`;

    // -----------------------------------------------------------------------
    // 1. ECR Repositories — one per backend service
    // -----------------------------------------------------------------------

    this.ecrRepos = {};
    const serviceNames = BACKEND_SERVICES.map((s) => s.full);

    serviceNames.forEach((service) => {
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
        removalPolicy:
          config.environment === 'production'
            ? cdk.RemovalPolicy.RETAIN
            : cdk.RemovalPolicy.DESTROY,
      });
    });

    // -----------------------------------------------------------------------
    // 2. Shared artifact bucket for all pipelines
    // -----------------------------------------------------------------------

    // Let CDK auto-generate the bucket name to avoid cross-account/region collisions
    const artifactBucket = new s3.Bucket(this, 'PipelineArtifacts', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy:
        config.environment === 'production'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.environment !== 'production',
      lifecycleRules: [{ expiration: cdk.Duration.days(30) }],
    });

    // -----------------------------------------------------------------------
    // 3. CodeBuild helper factories
    // -----------------------------------------------------------------------

    const commonEnvVars: Record<string, codebuild.BuildEnvironmentVariable> = {
      AWS_ACCOUNT_ID: { value: cdk.Aws.ACCOUNT_ID },
      AWS_DEFAULT_REGION: { value: config.region },
      ENVIRONMENT: { value: config.environment },
      EKS_CLUSTER_NAME: { value: cluster.clusterName },
    };

    const dockerEnv: codebuild.BuildEnvironment = {
      buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      computeType: codebuild.ComputeType.MEDIUM,
      privileged: true, // required for Docker builds
    };

    const standardEnv: codebuild.BuildEnvironment = {
      buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      computeType: codebuild.ComputeType.MEDIUM,
      privileged: false,
    };

    /** Create a CodeBuild project scoped to a service + stage. */
    const makeProject = (
      idSuffix: string,
      projectName: string,
      environment: codebuild.BuildEnvironment,
      buildSpec: codebuild.BuildSpec,
      extraEnv?: Record<string, codebuild.BuildEnvironmentVariable>,
      timeoutMinutes = 15,
    ): codebuild.Project => {
      return new codebuild.Project(this, idSuffix, {
        projectName,
        environment,
        timeout: cdk.Duration.minutes(timeoutMinutes),
        environmentVariables: { ...commonEnvVars, ...extraEnv },
        buildSpec,
      });
    };

    // -----------------------------------------------------------------------
    // 4. Backend service pipelines (one per service)
    // -----------------------------------------------------------------------

    BACKEND_SERVICES.forEach((svc) => {
      const svcEnvVars: Record<string, codebuild.BuildEnvironmentVariable> = {
        SERVICE_NAME: { value: svc.full },
        ECR_REPO_URI: { value: this.ecrRepos[svc.full].repositoryUri },
      };

      // -- Source artifact & output ------------------------------------------

      const sourceOutput = new codepipeline.Artifact('SourceOutput');
      const buildOutput = new codepipeline.Artifact('BuildOutput');

      // -- Source action (CodeStar → GitHub) ---------------------------------

      const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
        actionName: 'GitHub_Source',
        connectionArn: codestarConnectionArn,
        owner: githubOwner,
        repo: githubRepo,
        branch: githubBranch,
        output: sourceOutput,
        triggerOnPush: true,
      });

      // -- Stage 1: Commit (~10 min) -----------------------------------------

      const commitProject = makeProject(
        `Commit-${svc.short}`,
        `${prefix}-${svc.short}-commit`,
        dockerEnv,
        codebuild.BuildSpec.fromObject({
          version: '0.2',
          phases: {
            pre_build: {
              commands: [
                'echo Logging in to Amazon ECR...',
                'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com',
              ],
            },
            build: {
              commands: [
                'echo "=== Commit stage: compile, unit tests, lint, SAST, SCA ==="',
                'cd services/$SERVICE_NAME',
                './gradlew clean build test',
                './gradlew checkstyleMain spotbugsMain',
                './gradlew dependencyCheckAnalyze || true',
                'echo "=== Building Docker image ==="',
                'export IMAGE_TAG=$CODEBUILD_RESOLVED_SOURCE_VERSION',
                'docker build -t $ECR_REPO_URI:$IMAGE_TAG .',
              ],
            },
            post_build: {
              commands: [
                'docker push $ECR_REPO_URI:$IMAGE_TAG',
                'echo "IMAGE_TAG=$IMAGE_TAG" > build_info.env',
                'echo Build completed on `date`',
              ],
            },
          },
          artifacts: {
            files: ['services/$SERVICE_NAME/build/**/*', 'build_info.env'],
            'discard-paths': 'no',
          },
        }),
        svcEnvVars,
        10,
      );

      this.ecrRepos[svc.full].grantPullPush(commitProject);

      // -- Stage 2: Integration Test -----------------------------------------

      const integrationProject = makeProject(
        `IntegrationTest-${svc.short}`,
        `${prefix}-${svc.short}-integration`,
        dockerEnv,
        codebuild.BuildSpec.fromObject({
          version: '0.2',
          phases: {
            build: {
              commands: [
                'echo "=== Integration tests (Testcontainers + LocalStack) ==="',
                'cd services/$SERVICE_NAME',
                './gradlew integrationTest',
              ],
            },
          },
          reports: {
            IntegrationTests: {
              files: ['**/TEST-*.xml'],
              'base-directory': 'services/$SERVICE_NAME/build/test-results/integrationTest',
              'file-format': 'JUNITXML',
            },
          },
        }),
        svcEnvVars,
        15,
      );

      // -- Stage 3: Acceptance Test (BDD / Gherkin) --------------------------

      let acceptanceProject: codebuild.Project | undefined;
      if (svc.hasAcceptanceTests) {
        acceptanceProject = makeProject(
          `AcceptanceTest-${svc.short}`,
          `${prefix}-${svc.short}-acceptance`,
          dockerEnv,
          codebuild.BuildSpec.fromObject({
            version: '0.2',
            phases: {
              build: {
                commands: [
                  'echo "=== BDD acceptance tests (Cucumber) ==="',
                  'cd services/$SERVICE_NAME',
                  './gradlew acceptanceTest',
                ],
              },
            },
            reports: {
              AcceptanceTests: {
                files: ['**/*.json'],
                'base-directory': 'services/$SERVICE_NAME/build/reports/cucumber',
                'file-format': 'CUCUMBERJSON',
              },
            },
          }),
          svcEnvVars,
          10,
        );
      }

      // -- Stage 4: Contract Test (Pact) -------------------------------------

      let contractProject: codebuild.Project | undefined;
      if (svc.hasContractTests) {
        contractProject = makeProject(
          `ContractTest-${svc.short}`,
          `${prefix}-${svc.short}-contract`,
          standardEnv,
          codebuild.BuildSpec.fromObject({
            version: '0.2',
            phases: {
              build: {
                commands: [
                  'echo "=== Pact contract verification ==="',
                  'cd services/$SERVICE_NAME',
                  './gradlew pactVerify',
                ],
              },
            },
          }),
          svcEnvVars,
          5,
        );
      }

      // -- Stage 5: Performance Test (k6) ------------------------------------

      let performanceProject: codebuild.Project | undefined;
      if (svc.hasPerformanceTests) {
        performanceProject = makeProject(
          `PerformanceTest-${svc.short}`,
          `${prefix}-${svc.short}-performance`,
          standardEnv,
          codebuild.BuildSpec.fromObject({
            version: '0.2',
            phases: {
              install: {
                commands: [
                  'curl -sL https://github.com/grafana/k6/releases/download/v0.49.0/k6-v0.49.0-linux-amd64.tar.gz | tar xz',
                  'mv k6-v0.49.0-linux-amd64/k6 /usr/local/bin/',
                ],
              },
              build: {
                commands: [
                  'echo "=== k6 performance tests ==="',
                  'cd services/$SERVICE_NAME/k6',
                  'k6 run --out json=results.json load-test.js',
                ],
              },
            },
          }),
          svcEnvVars,
          10,
        );
      }

      // -- Stage 6+7: Deploy (staging health-check, then production) ---------

      const deployProject = makeProject(
        `Deploy-${svc.short}`,
        `${prefix}-${svc.short}-deploy`,
        standardEnv,
        codebuild.BuildSpec.fromObject({
          version: '0.2',
          phases: {
            install: {
              commands: [
                'curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"',
                'chmod +x kubectl && mv kubectl /usr/local/bin/',
                'aws eks update-kubeconfig --name $EKS_CLUSTER_NAME --region $AWS_DEFAULT_REGION',
              ],
            },
            build: {
              commands: [
                'echo "=== Deploying $SERVICE_NAME to EKS ==="',
                'export IMAGE_TAG=$(cat build_info.env | grep IMAGE_TAG | cut -d= -f2)',
                'cd k8s/overlays/$ENVIRONMENT',
                'kustomize edit set image $ECR_REPO_URI:$IMAGE_TAG',
                'kubectl apply -k .',
                'kubectl rollout status deployment/$SERVICE_NAME -n coffeeshop --timeout=300s',
                'echo "=== Health check ==="',
                'kubectl exec deploy/$SERVICE_NAME -n coffeeshop -- curl -sf http://localhost:8080/actuator/health',
              ],
            },
          },
        }),
        svcEnvVars,
        15,
      );

      // Grant the deploy project access to the EKS cluster via kubectl config
      // Note: The deploy role must be mapped in the EKS aws-auth ConfigMap.
      // This is done via `eksctl create iamidentitymapping` or by adding the
      // role ARN to the compute-stack's awsAuth during initial cluster setup.
      deployProject.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['eks:DescribeCluster'],
          resources: [cluster.clusterArn],
        }),
      );

      // -- Assemble the pipeline ---------------------------------------------

      const stages: codepipeline.StageProps[] = [
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
        {
          stageName: 'Commit',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Commit_Build_Test',
              project: commitProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
        {
          stageName: 'IntegrationTest',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Integration_Tests',
              project: integrationProject,
              input: sourceOutput,
            }),
          ],
        },
      ];

      if (acceptanceProject) {
        stages.push({
          stageName: 'AcceptanceTest',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'BDD_Acceptance_Tests',
              project: acceptanceProject,
              input: sourceOutput,
            }),
          ],
        });
      }

      if (contractProject) {
        stages.push({
          stageName: 'ContractTest',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Pact_Contract_Tests',
              project: contractProject,
              input: sourceOutput,
            }),
          ],
        });
      }

      if (performanceProject) {
        stages.push({
          stageName: 'PerformanceTest',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'K6_Performance_Tests',
              project: performanceProject,
              input: sourceOutput,
            }),
          ],
        });
      }

      // Manual approval gate before production
      stages.push({
        stageName: 'Approval',
        actions: [
          new codepipeline_actions.ManualApprovalAction({
            actionName: 'Production_Approval',
            additionalInformation: `Approve deployment of ${svc.full} to production?`,
          }),
        ],
      });

      stages.push({
        stageName: 'ProductionDeploy',
        actions: [
          new codepipeline_actions.CodeBuildAction({
            actionName: 'Deploy_To_EKS',
            project: deployProject,
            input: buildOutput,
          }),
        ],
      });

      new codepipeline.Pipeline(this, `Pipeline-${svc.short}`, {
        pipelineName: `${prefix}-${svc.short}`,
        pipelineType: codepipeline.PipelineType.V2,
        artifactBucket,
        restartExecutionOnUpdate: false,
        stages,
      });
    }); // end BACKEND_SERVICES.forEach

    // -----------------------------------------------------------------------
    // 5. Frontend pipeline
    // -----------------------------------------------------------------------

    const feSourceOutput = new codepipeline.Artifact('FE_SourceOutput');
    const feBuildOutput = new codepipeline.Artifact('FE_BuildOutput');

    const feSourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName: 'GitHub_Source',
      connectionArn: codestarConnectionArn,
      owner: githubOwner,
      repo: githubRepo,
      branch: githubBranch,
      output: feSourceOutput,
      triggerOnPush: true,
    });

    // -- FE Commit stage (tsc, lint, unit tests, build) ----------------------

    const feCommitProject = makeProject(
      'FE-Commit',
      `${prefix}-frontend-commit`,
      {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': { nodejs: '20' },
            commands: ['cd frontend', 'npm ci'],
          },
          build: {
            commands: [
              'echo "=== FE commit: tsc, lint, unit tests, build ==="',
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
      {},
      10,
    );

    // -- FE Integration / Component tests ------------------------------------

    const feIntegrationProject = makeProject(
      'FE-IntegrationTest',
      `${prefix}-frontend-integration`,
      {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': { nodejs: '20' },
            commands: ['cd frontend', 'npm ci'],
          },
          build: {
            commands: [
              'echo "=== FE component tests (Testing Library + MSW) ==="',
              'npm run test:component -- --run',
            ],
          },
        },
      }),
      {},
      10,
    );

    // -- FE E2E tests (Playwright + Lighthouse) ------------------------------

    const feE2eProject = makeProject(
      'FE-E2ETest',
      `${prefix}-frontend-e2e`,
      {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.MEDIUM,
      },
      codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': { nodejs: '20' },
            commands: [
              'cd frontend',
              'npm ci',
              'npx playwright install --with-deps chromium',
            ],
          },
          build: {
            commands: [
              'echo "=== E2E (Playwright) + Lighthouse CI ==="',
              'npx playwright test',
              'npx lhci autorun || true',
            ],
          },
        },
        reports: {
          E2ETests: {
            files: ['**/results.xml'],
            'base-directory': 'frontend/test-results',
            'file-format': 'JUNITXML',
          },
        },
      }),
      {},
      15,
    );

    // -- FE Deploy (S3 + CloudFront invalidation) ----------------------------

    const feDeployProject = makeProject(
      'FE-Deploy',
      `${prefix}-frontend-deploy`,
      {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'echo "=== Deploying frontend to S3 ==="',
              `aws s3 sync . s3://${frontendBucket.bucketName}/ --delete`,
              'echo "=== Invalidating CloudFront ==="',
              `aws cloudfront create-invalidation --distribution-id ${distribution.distributionId} --paths "/*"`,
            ],
          },
        },
      }),
      {},
      10,
    );

    frontendBucket.grantReadWrite(feDeployProject);
    feDeployProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cloudfront:CreateInvalidation'],
        resources: [
          `arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${distribution.distributionId}`,
        ],
      }),
    );

    // -- Assemble frontend pipeline ------------------------------------------

    new codepipeline.Pipeline(this, 'Pipeline-frontend', {
      pipelineName: `${prefix}-frontend`,
      pipelineType: codepipeline.PipelineType.V2,
      artifactBucket,
      restartExecutionOnUpdate: false,
      stages: [
        {
          stageName: 'Source',
          actions: [feSourceAction],
        },
        {
          stageName: 'Commit',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'FE_Commit_Build_Test',
              project: feCommitProject,
              input: feSourceOutput,
              outputs: [feBuildOutput],
            }),
          ],
        },
        {
          stageName: 'IntegrationTest',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'FE_Component_Tests',
              project: feIntegrationProject,
              input: feSourceOutput,
            }),
          ],
        },
        {
          stageName: 'E2ETest',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Playwright_Lighthouse',
              project: feE2eProject,
              input: feSourceOutput,
            }),
          ],
        },
        {
          stageName: 'Approval',
          actions: [
            new codepipeline_actions.ManualApprovalAction({
              actionName: 'Production_Approval',
              additionalInformation: 'Approve frontend deployment to production?',
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'S3_CloudFront_Deploy',
              project: feDeployProject,
              input: feBuildOutput,
            }),
          ],
        },
      ],
    });

    // -----------------------------------------------------------------------
    // 6. Outputs
    // -----------------------------------------------------------------------

    serviceNames.forEach((service) => {
      new cdk.CfnOutput(this, `EcrUri-${service}`, {
        value: this.ecrRepos[service].repositoryUri,
      });
    });

    new cdk.CfnOutput(this, 'ArtifactBucket', {
      value: artifactBucket.bucketName,
    });
  }
}
