---
description: "Phase 5: Delivery — CD Pipeline, IaC, Observability, SLI/SLO"
id: 05-delivery
ordinal: 8
step: all
gate: human
requires_lock: assessment-2
consumes:
  - .arch/02-strategic/bounded-contexts.yaml
  - .arch/04-specification/features/
  - .arch/assessment-2.yaml
produces:
  - .arch/05-delivery/pipeline.yaml
  - .arch/05-delivery/deployment-strategy.yaml
  - .arch/05-delivery/observability/
  - .arch/05-delivery/runbooks/
  - iac/
  - k8s/
sensors: [files-exist, decision-not-restated, e2e-story-coverage, messaging-matches-context-map]
---

# Phase 5: Delivery Pipeline & Observability

You are a DevOps and SRE expert who designs deployment pipelines, infrastructure as code, and observability systems.

## Knowledge Base
Read: knowledge-base/continuous-delivery/01-core-principles.md, 02-deployment-strategies.md, 03-practices.md, knowledge-base/observability/01-three-pillars.md, 02-opentelemetry.md, 03-sli-slo-alerting.md, knowledge-base/security/03-secure-coding.md (for SAST/DAST pipeline stages), knowledge-base/aws-cdk/01-cdk-best-practices.md

## Input
Read: .arch/02-strategic/bounded-contexts.yaml, .arch/02-strategic/context-map.yaml, .arch/03-tactical/domain-model/*.yaml, .arch/03-tactical/frontend-architecture.yaml, .arch/04-specification/test-strategy.yaml, .arch/04-specification/threat-model.yaml, .arch/assessment-2.md (architecture style, deployment target, AWS region, VPC design), .arch/assessment-8.md (IaC tool choice), .arch/glossary.yaml

## Process

### Step 1: Deployment Pipeline Design

**If Modular Monolith** (from assessment-2): Design a single shared pipeline for the monolith.
**If Microservices** (from assessment-2): Design an independent pipeline per service/BC.

For each BC (or the monolith), design an 8-stage pipeline:
1. **Commit Stage** (~10 min): compile, unit tests, lint, SAST, SCA, a11y static check
2. **Integration Test Stage**: component tests (Testing Library + MSW), integration tests, controller integration tests (query params, DTO serialization)
3. **Acceptance Test Stage**: BDD tests (Gherkin + step definitions), selective E2E (Playwright CUJs)
4. **Visual Regression Stage**: Chromatic/Playwright screenshot comparison
5. **Contract Test Stage**: Pact verification + Pact-MSW sync check + schema compatibility
6. **Performance Test Stage**: Lighthouse CI (CWV budgets) + k6 load tests
7. **Deployment Stage**: deploy strategy execution (canary/blue-green/rolling)
8. **Post-Deployment Verification Stage (MANDATORY)**: smoke tests against the DEPLOYED environment — NOT localhost. This stage catches infrastructure-level integration failures (ALB routing, CloudFront proxy, K8s Ingress path mapping, DNS, TLS, IAM permissions) that local tests cannot detect.

   **Post-deployment checks:**
   - Health check: `curl` each service's `/actuator/health` (or equivalent) through the actual ingress/ALB URL
   - Cross-layer verification: Re-run the Phase 8 Step 13.2 curl checklist against the DEPLOYED URLs (CloudFront domain, ALB DNS, etc.) — not localhost
   - Frontend reachability: `curl` the CloudFront URL, verify HTML loads, verify `/api/*` proxied correctly
   - Full lifecycle smoke: Execute one complete actor journey (e.g., place order → confirm → pay → prepare → deliver → complete) against the deployed environment via API calls or Playwright
   - Error resilience spot-check: Verify frontend shows error state when one backend pod is scaled to 0
   - **If ANY check fails**: auto-rollback and BLOCK the deployment. Do NOT declare success.

   ```yaml
   post_deployment_verification:
     health_checks:
       - url: "https://{cloudfront-domain}/api/orders?status=active"
         expect: { status: 200, content_type: "application/json" }
       - url: "https://{cloudfront-domain}/api/preparations?status=Pending"
         expect: { status: 200, content_type: "application/json" }
       - url: "https://{cloudfront-domain}/api/inventory"
         expect: { status: 200, content_type: "application/json" }
       - url: "https://{cloudfront-domain}/api/reporting/sales"
         expect: { status: 200, content_type: "application/json" }
     smoke_test:
       type: "full-lifecycle"
       steps: ["place_order", "confirm", "pay", "prepare_all_items", "deliver", "complete"]
       timeout: 60s
     rollback_on_failure: true
   ```

### Step 2: Deployment Strategy Selection
Per BC based on risk profile:
- Core BC → Canary deployment (gradual traffic shift, auto-rollback on SLO violation)
- Supporting BC → Blue-Green deployment
- Generic BC → Rolling update
Feature flags for incomplete features (trunk-based development).

### Step 3: Infrastructure as Code (MUST generate executable code, not stubs)

**Read from assessments:**
- `assessment-2.md` Q5 → Deployment target (EKS/ECS/Lambda)
- `assessment-2.md` Q5a → AWS Region
- `assessment-2.md` Q5b → Account strategy (single/multi)
- `assessment-2.md` Q5c → VPC design (public+private / private-only)
- `assessment-8.md` Q6a → IaC tool (CDK TypeScript / CDK Python / Terraform / CloudFormation)

**Pre-generation review (MANDATORY — Q5e checkpoint):**

Before writing any IaC code, present a resource summary table to the user for confirmation:

```
## Infrastructure Resource Plan

| Stack | AWS Resources | Source Artifact | Est. Monthly Cost |
|-------|--------------|-----------------|-------------------|
| NetworkStack | VPC (3 AZ), 3 public + 3 private subnets, NAT Gateway, ALB | assessment-2 Q5c | ~$35-70 |
| DataStack | RDS PostgreSQL (db.t3.medium), 5 schemas, Secrets Manager | assessment-2 Q4, bounded-contexts.yaml | ~$30-60 |
| MessagingStack | 4 SNS topics, 8 SQS queues + 8 DLQs | context-map.yaml event channels | ~$5-10 |
| ComputeStack | EKS cluster, 2 node groups (t3.medium) | assessment-2 Q5, bounded-contexts.yaml | ~$75-150 |
| FrontendStack | S3 + CloudFront (OAC) + ALB API origin | frontend-architecture.yaml | ~$5-15 |
| ObservabilityStack | ADOT collector, CloudWatch dashboards, X-Ray | observability.yaml | ~$10-30 |
| IamStack | 5 IRSA roles (1 per service) | bounded-contexts.yaml | $0 |
```

🔑 **User confirms**: "Proceed with this plan" / "I want to adjust" (add/remove/change resources)

**If IaC tool is AWS CDK (default):**

Generate a complete CDK project at `iac/` in the project root (NOT `.arch/`). This is deployable code.

```
iac/
  bin/
    app.ts                    # CDK app entry point — env: { region, account }
  lib/
    network-stack.ts          # VPC, subnets, security groups, NAT Gateway
    data-stack.ts             # RDS (shared instance, schema-per-service), Secrets Manager
    messaging-stack.ts        # SNS topics + SQS queues per BC (from context-map.yaml)
    compute-stack.ts          # EKS cluster + node groups / ECS services + ALB (from assessment-2 Q5)
    frontend-stack.ts         # S3 bucket + CloudFront distribution + OAC
    observability-stack.ts    # ADOT collector, CloudWatch dashboards, X-Ray groups
    iam-stack.ts              # IAM roles per service (least privilege), IRSA for EKS
  config/
    staging.ts                # Environment-specific config (instance sizes, replicas)
    production.ts             # Production config (multi-AZ, larger instances)
  cdk.json
  package.json
  tsconfig.json
```

### CDK Anti-Pattern Guards (MANDATORY)

Before generating ANY CDK code, verify these constraints to prevent deployment failures:

**Resource naming:**
- NEVER hardcode S3 bucket names — let CDK auto-generate with hash suffix, or append `${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}` for uniqueness
- NEVER hardcode CloudWatch Dashboard names — use CDK auto-naming
- NEVER hardcode CodePipeline/CodeBuild project names with only prefix — add unique suffixes

**RDS configuration:**
- Use `ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM)` — NOT string `'db.t3.medium'`
- Verify engine version availability in target region before hardcoding: `aws rds describe-db-engine-versions --engine postgres --region $REGION`
- Config should use CDK native types, not raw strings

**Region service availability:**
- Before selecting CI/CD strategy, check if CodePipeline/CodeBuild are available in the target region
- If target region lacks CI/CD services: either deploy cicd-stack to us-east-1 (cross-region) or use GitHub Actions
- Full-service regions: us-east-1, us-west-2, eu-west-1, ap-northeast-1

**Pre-flight validation (include in deployment runbook):**
- Check NAT Gateway quota: `aws ec2 describe-nat-gateways --filter "Name=state,Values=available" --region $REGION`
- Check VPC quota, EIP quota
- Check for ROLLBACK_COMPLETE stacks from prior failed deployments

**Cross-stack dependencies:**
- NEVER use `cluster.awsAuth.addMastersRole()` from a different stack — causes circular dependency
- Pass IAM role ARNs and configure aws-auth via kubectl/eksctl separately

**Config type safety:**
- Define a typed `EnvironmentConfig` interface — NEVER use `config: any`
- RDS instance class/size, engine version should be CDK native types in config

**CloudFront SPA + API routing:**
- CloudFront MUST have dual origins: S3 (default) for static assets, ALB for `/api/*` paths
- SPA error responses (404→index.html) apply only to the default S3 behavior, NOT to `/api/*`
- `/api/*` behavior: cache disabled, all methods allowed, origin request policy forwarding all headers
- frontend-stack MUST accept ALB DNS name as a prop from compute-stack
- Without ALB origin, API calls from the SPA return HTML (index.html) with 200 status, causing runtime crashes

**Idempotent deployment:**
- Prefer CDK auto-generated resource names for idempotent re-deployment
- Include pre-deploy cleanup script for ROLLBACK_COMPLETE stacks in runbooks

**Each stack MUST:**
1. **Use the region from assessment-2 Q5a** — `env: { region: 'ap-northeast-1', account: process.env.CDK_DEFAULT_ACCOUNT }`
2. **Derive resources from architecture artifacts** — not invented:
   - SNS topics → one per BC that publishes events (from `context-map.yaml` event channels)
   - SQS queues → one per (topic × consumer BC) + DLQ each (from context-map integration patterns)
   - RDS schemas → one per BC (from `bounded-contexts.yaml`)
   - EKS services / ECS task definitions → one per BC service (from `bounded-contexts.yaml`)
   - S3 + CloudFront → from `frontend-architecture.yaml` (if MFE, include origin path per MFE) + ALB API proxy origin for `/api/*`
3. **Follow VPC design from assessment-2 Q5c** — ALB in public subnets, services + RDS in private subnets
4. **Include security best practices** — encryption at rest (RDS, SQS, S3), encryption in transit (TLS), IAM least privilege, no public DB access
5. **Include outputs** — export ARNs/URLs needed by CI/CD pipeline (ECR repo URIs, EKS cluster name, CloudFront domain, RDS endpoint)
6. **Be deployable** — `cdk synth` should produce valid CloudFormation without errors. Include all required dependencies in `package.json`.
7. **Use CDK auto-generated names** for S3 buckets, dashboards, and other named resources — do NOT hardcode names that could collide globally or block re-deployment

**If IaC tool is Terraform:**
Generate equivalent `.tf` files with modules under `iac/` following the same resource mapping above.

**Resource mapping from architecture artifacts:**

| Architecture Artifact | IaC Resource |
|---|---|
| `bounded-contexts.yaml` → each BC | ECR repo + EKS Deployment + Service (or ECS Task + Service) |
| `context-map.yaml` → event channels | SNS Topic per publishing BC |
| `context-map.yaml` → consumer relationships | SQS Queue per (topic × consumer) + DLQ |
| `bounded-contexts.yaml` → data store | RDS schema per BC (shared instance) |
| `frontend-architecture.yaml` → shell + MFEs | S3 bucket + CloudFront distribution |
| `threat-model.yaml` → encryption requirements | KMS keys, S3 encryption, RDS encryption |
| `sli-slo.yaml` → alerting | CloudWatch alarms per SLO |
| `deployment-strategy.yaml` → per BC | K8s rollout strategy / ECS deployment config |

### Step 4: Observability Setup
**OpenTelemetry instrumentation:**
- ADOT collector configuration (receivers, processors, exporters)
- Auto-instrumentation for each service
- Custom spans for domain operations (aggregate commands, event processing)
- Trace ID propagation across services and message queues

**If Microservices** (from assessment-2), additionally:
- **W3C Trace Context** headers MUST be used for all cross-service HTTP calls (`traceparent`, `tracestate`)
- **Message attribute propagation**: Embed trace context in message headers/attributes for async events
- **Baggage propagation**: Pass correlation IDs (orderId, userId) across service boundaries via W3C Baggage
- **Per-service instrumentation**: Each service must export traces independently to collector

**Three pillars:**
- Logs: Structured JSON logging with trace correlation → CloudWatch Logs
- Metrics: RED method per service, business metrics from domain events → CloudWatch Metrics
- Traces: Distributed tracing → X-Ray via OTel

**Dashboards:**
- Service dashboard (RED metrics per BC)
- Business dashboard (domain event rates, conversion funnels)
- Infrastructure dashboard (CPU, memory, connections)

### Step 5: SLI/SLO Definition
Per service/BC:
- Availability SLI: successful requests / total requests
- Latency SLI: P99 response time
- Business SLIs: domain-specific (e.g., check-in completion rate)
- SLO targets with error budgets
- Multi-burn-rate alerting configuration
- Error budget policy (freeze features when budget depleted)

**If Microservices** (from assessment-2), additionally:
- **Composite SLOs** for end-to-end user journeys (e.g., if Order Service = 99.9% and Preparation Service = 99.9%, end-to-end ≈ 99.8%)
- **Dependency-aware SLOs**: Each service's SLO cannot exceed the SLO of its critical dependencies
- **SLO-based deployment gates**: Do not deploy if remaining error budget is below threshold

### Step 6: Runbooks and Playbooks
- Runbook per common operation (deploy, rollback, scale, restart)
- Playbook per alert (high latency → check traces → identify bottleneck)
- Link alerts to relevant playbook

## Output

**Architecture artifacts** → write to `.arch/05-delivery/`:
- pipeline.yaml (pipeline stages per BC)
- deployment-strategy.yaml (strategy per BC)
- observability/otel-config.yaml
- observability/sli-slo.yaml
- observability/dashboards.yaml
- observability/alerting.yaml
- runbooks/*.md

**Executable IaC code** → write to `iac/` in project root (NOT `.arch/`):
- Complete CDK project (or Terraform modules) with all stacks
- `package.json` with CDK dependencies
- `cdk.json` with app entry point
- `tsconfig.json` for CDK TypeScript compilation
- **Verify**: `cd iac && npm install && npx cdk synth` must produce valid CloudFormation templates

**Kubernetes manifests** (if EKS) → write to `k8s/` in project root:
- Helm charts or plain manifests per service
- Namespace, Deployment, Service, Ingress, HPA, PDB per BC
- ConfigMap and ExternalSecret per service

## Completion
Present:
1. Pipeline stages per BC
2. Deployment strategies per BC
3. SLOs per BC
4. IaC resource summary (how many stacks, what resources, which region)
5. `cdk synth` verification result

Quality gate: check pipeline completeness, SLO coverage, IaC deployability.

$ARGUMENTS
