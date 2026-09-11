# AWS CDK Best Practices for Architecture Constrained Generation

## 1. Resource Naming -- Never Hardcode Global Resource Names

**Problem**: S3 bucket names are globally unique. Hardcoding names like `coffeeshop-staging-frontend-assets` causes:
- Name collisions across accounts/regions
- "Conflicting conditional operation" errors when re-creating after deletion (AWS takes time to release bucket names)
- Orphan resources blocking redeployment

**Best Practice**: Let CDK auto-generate names with hash suffixes. Only set explicit names when external references require it (e.g., well-known DNS endpoints).

```typescript
// Anti-pattern: hardcoded bucket name
new s3.Bucket(this, 'FrontendBucket', {
  bucketName: `${prefix}-frontend-assets`,  // Global collision risk
});

// Best practice: let CDK auto-generate
new s3.Bucket(this, 'FrontendBucket', {
  // No bucketName -- CDK appends stack-unique hash
});

// If you MUST name it, add account+region for uniqueness
new s3.Bucket(this, 'FrontendBucket', {
  bucketName: `${prefix}-frontend-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
});
```

Same applies to: CloudWatch Dashboard names, CodePipeline names, CloudFront OAC names.

---

## 2. RDS Instance Types -- Use CDK Native API, Not Strings

**Problem**: Config string `db.t3.medium` combined with `ec2.InstanceType()` produces `db.db.t3.medium`.

**Best Practice**: Use `ec2.InstanceType.of()` which produces the correct prefix:

```typescript
// Anti-pattern: string in config
config.rds.instanceType = 'db.t3.medium';
new ec2.InstanceType(config.rds.instanceType); // produces db.db.t3.medium

// Best practice: use InstanceClass + InstanceSize in config
config.rds.instanceClass = ec2.InstanceClass.T3;
config.rds.instanceSize = ec2.InstanceSize.MEDIUM;
ec2.InstanceType.of(config.rds.instanceClass, config.rds.instanceSize);

// Alternative: use string without "db." prefix
config.rds.instanceType = 't3.medium';  // ec2.InstanceType adds prefix
```

---

## 3. Engine Versions -- Don't Hardcode Minor Versions

**Problem**: `rds.PostgresEngineVersion.VER_16_4` doesn't exist in all regions. New regions may only have newer minor versions.

**Best Practice**: Use the CDK's version constants and prefer the latest stable, or make it configurable:

```typescript
// Anti-pattern: hardcoded specific minor version
engine: rds.DatabaseInstanceEngine.postgres({
  version: rds.PostgresEngineVersion.VER_16_4,  // May not exist in target region
});

// Best practice: use a widely available version or make configurable
engine: rds.DatabaseInstanceEngine.postgres({
  version: rds.PostgresEngineVersion.VER_16_6,  // Or latest stable
});

// Best: parameterize in config
config.rds.engineVersion = rds.PostgresEngineVersion.VER_16_6;
```

**Pre-flight check**: Before generating CDK code, verify engine version availability:

```bash
aws rds describe-db-engine-versions --engine postgres --region $REGION \
  --query "DBEngineVersions[?starts_with(EngineVersion,'16')].EngineVersion"
```

---

## 4. Region Service Availability -- Design for Partial Regions

**Problem**: Not all AWS services are available in all regions. CodePipeline, CodeBuild, and other services may not be available in newer or opt-in regions (e.g., ap-east-2 Taipei).

**Best Practice**:
- CI/CD stacks should be deployable to a separate region from workload stacks
- Or use GitHub Actions / GitLab CI instead of AWS-native CI/CD for portability
- Check service availability before selecting a region

```typescript
// Best practice: CI/CD stack in a "full service" region
const cicdEnv = { region: 'us-east-1', account: process.env.CDK_DEFAULT_ACCOUNT };
const workloadEnv = { region: config.region, account: process.env.CDK_DEFAULT_ACCOUNT };

new ComputeStack(app, 'compute', { env: workloadEnv });
new CiCdStack(app, 'cicd', { env: cicdEnv });  // Always us-east-1
```

**Regions with full service coverage**: us-east-1, us-west-2, eu-west-1, ap-northeast-1.

**Pre-flight check**: Before selecting a region, verify critical services:

```bash
aws ec2 describe-regions --region-names $REGION  # Does it exist?
aws codepipeline list-pipelines --region $REGION  # Is CodePipeline available?
aws eks list-clusters --region $REGION  # Is EKS available?
```

---

## 5. Pre-flight Validation -- Check Quotas Before Deploying

**Problem**: Deployment fails midway due to quota limits (e.g., NAT Gateway limit of 5), leaving partially created stacks that require manual cleanup.

**Best Practice**: Run quota checks before `cdk deploy`:

```bash
# Check NAT Gateway quota
CURRENT=$(aws ec2 describe-nat-gateways --filter "Name=state,Values=available" \
  --query "length(NatGateways)" --output text --region $REGION)
QUOTA=$(aws service-quotas get-service-quota --service-code vpc \
  --quota-code L-FE5A380F --query "Quota.Value" --output text --region $REGION)
NEEDED=1  # From CDK config: natGateways count
echo "NAT Gateways: $CURRENT used / $QUOTA quota / $NEEDED needed"

# Check VPC quota
# Check EIP quota
# Check RDS instance quota
```

**CDK-level**: Consider adding a custom CDK aspect that validates quotas:

```typescript
class QuotaValidationAspect implements cdk.IAspect {
  public visit(node: IConstruct): void {
    // Add warnings for resources that commonly hit quota limits
  }
}
```

---

## 6. Global Resources -- CloudFront, WAF, S3

**Problem**: CloudFront distributions, WAF WebACLs (CLOUDFRONT scope), and S3 buckets are global or require us-east-1. Destroying a stack in one region may leave orphan global resources.

**Best Practice**:
- CloudFront + WAF CLOUDFRONT scope: Always deployed from us-east-1 stack or use cross-region references
- S3: Don't reuse deleted bucket names immediately (AWS needs time to propagate deletion)
- Use `removalPolicy: DESTROY` + `autoDeleteObjects: true` for staging, but be aware of cleanup timing

```typescript
// Best practice: let CDK manage lifecycle
// For staging: auto-cleanup
removalPolicy: cdk.RemovalPolicy.DESTROY,
autoDeleteObjects: true,

// For production: retain and document cleanup procedure
removalPolicy: cdk.RemovalPolicy.RETAIN,
// Document: "To decommission, manually empty and delete bucket"
```

---

## 7. Stack Dependencies -- Avoid Circular References

**Problem**: `cluster.awsAuth.addMastersRole(deployProject.role!)` creates cross-stack circular dependency when EKS is in compute-stack and the role is in cicd-stack.

**Best Practice**:
- Don't mutate resources owned by other stacks
- Pass IAM role ARNs as parameters, configure aws-auth separately
- Use `eks.Cluster.fromClusterAttributes()` for cross-stack references

```typescript
// Anti-pattern: mutating compute stack's auth from cicd stack
cluster.awsAuth.addMastersRole(deployProject.role!);

// Best practice: grant describe permission, map role via kubectl/eksctl separately
deployProject.addToRolePolicy(new iam.PolicyStatement({
  actions: ['eks:DescribeCluster'],
  resources: [cluster.clusterArn],
}));
// Then: eksctl create iamidentitymapping --cluster ... --arn <role-arn> --group system:masters
```

---

## 8. Environment Config -- Type Safety

**Problem**: Loose `config: any` types allow mismatched values to slip through (e.g., `db.t3.medium` vs `t3.medium`).

**Best Practice**: Define a typed config interface:

```typescript
interface EnvironmentConfig {
  environment: 'staging' | 'production';
  region: string;
  vpc: {
    maxAzs: number;
    natGateways: number;
  };
  rds: {
    instanceClass: ec2.InstanceClass;
    instanceSize: ec2.InstanceSize;
    engineVersion: rds.PostgresEngineVersion;
    multiAz: boolean;
    allocatedStorage: number;
    backupRetention: number;
  };
  eks: {
    nodeInstanceType: string;
    minNodes: number;
    maxNodes: number;
    desiredNodes: number;
  };
  // ...
}
```

---

## 9. Idempotent Deployments -- Design for Re-run

**Problem**: Failed deployments leave stacks in ROLLBACK_COMPLETE state requiring manual deletion before retry.

**Best Practice**:
- Avoid named resources where possible (CDK auto-naming is idempotent)
- Add retry logic or document manual cleanup steps
- Use `cdk destroy` before re-creating if stack is in ROLLBACK_COMPLETE

```bash
# Pre-deploy cleanup script
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK \
  --query "Stacks[0].StackStatus" --output text 2>/dev/null || echo "DOES_NOT_EXIST")
if [ "$STACK_STATUS" = "ROLLBACK_COMPLETE" ]; then
  echo "Cleaning up failed stack $STACK..."
  aws cloudformation delete-stack --stack-name $STACK
  aws cloudformation wait stack-delete-complete --stack-name $STACK
fi
```

---

## 10. CloudFront Multi-Origin — SPA + API Proxy

**Problem**: SPA deployed to S3+CloudFront calls `/api/*` endpoints. CloudFront has only an S3 origin, so `/api/*` returns `index.html` with HTTP 200. The frontend receives HTML instead of JSON, causing runtime crashes (`(data ?? []).filter is not a function`).

**Root cause**: CloudFront's SPA error response config (404 → index.html) applies to ALL paths, including `/api/*`. The frontend's `axios` sees a 200 response (HTML) and doesn't trigger error handling.

**Best Practice**: Configure CloudFront with dual origins — S3 for static assets, ALB for API paths:

```typescript
// frontend-stack.ts — requires ALB from compute-stack
this.distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
  },
  additionalBehaviors: {
    '/api/*': {
      origin: new origins.HttpOrigin(albDnsName, { protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY }),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
    },
  },
  errorResponses: [
    { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(0) },
    { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(0) },
  ],
});
```

**Defense in depth — Frontend API resilience**:
Even with proper routing, the frontend MUST handle backend unavailability gracefully:

```typescript
// api.ts — response interceptor validates content-type
api.interceptors.response.use(
  (response) => {
    const ct = response.headers['content-type'] || '';
    if (!ct.includes('application/json')) {
      return Promise.reject(new Error('Backend service is unavailable'));
    }
    return response;
  },
  (error) => { /* ... */ }
);
```

**Key principle**: SPA error responses (404→index.html) MUST NOT apply to `/api/*` paths. API paths need their own origin or must return proper HTTP errors, never HTML.

---

## Summary Checklist for Phase 5 Code Generation

Before generating CDK code, verify:

- [ ] No hardcoded S3 bucket names (use auto-generated or account+region suffix)
- [ ] No hardcoded CloudWatch dashboard names
- [ ] RDS instance type uses `ec2.InstanceType.of()`, NOT string with `db.` prefix
- [ ] RDS engine version verified available in target region
- [ ] CI/CD services available in target region (or split to separate region)
- [ ] NAT Gateway / EIP / VPC quota sufficient
- [ ] No cross-stack circular dependencies (especially EKS awsAuth)
- [ ] Config interface is typed, not `any`
- [ ] Staging uses `RemovalPolicy.DESTROY` with auto-cleanup
- [ ] Global resources (CloudFront, S3, WAF) handled correctly
- [ ] CloudFront has ALB origin for `/api/*` paths (SPA + API dual origin)
- [ ] Frontend API layer validates response content-type before parsing
