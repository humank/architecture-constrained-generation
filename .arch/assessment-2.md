# Assessment — Phase 2: Architecture Decisions

**Status**: COMPLETED
**Generated**: 2026-03-19

---

Please answer each question below. Change status to `COMPLETED` when done.

---

## Q1: Architecture Style

What architecture style best fits this system?

- [ ] **A) Modular Monolith** — Single deployable unit with well-defined module boundaries per BC. Best for small teams (1-3 devs), simpler ops, lower cost. Recommended for a single coffee shop.
- [ ] **B) Microservices** — Independent deployable services per BC. Best for larger teams (4+), independent scaling, polyglot. Higher operational complexity.
- [ ] **C) Serverless** — Lambda/Functions per command. Best for sporadic traffic, pay-per-use. Cold start latency concern.

**Recommendation for this system**: A (Modular Monolith) — single shop, small team, low traffic volume.

**Your choice**: ___ B

---

## Q2: Team Topology

How is your development team structured?

- [ ] **A) Single team (1-3 devs)** — One team owns everything. Stream-aligned.
- [ ] **B) Small team (4-6 devs)** — Can split frontend/backend or by BC.
- [ ] **C) Multiple teams (7+)** — Each team owns 1-2 BCs independently.

**Your choice**: ___B

---

## Q3: Communication Patterns Between BCs

How should bounded contexts communicate?

- [ ] **A) In-process method calls** — Direct function calls within monolith modules. Simplest, lowest latency. Only works with Modular Monolith.
- [ ] **B) Async messaging (SNS/SQS)** — Event-driven, loosely coupled. Works with both monolith and microservices. Recommended for eventual consistency.
- [ ] **C) Sync HTTP/gRPC** — Request-response between services. Tighter coupling, simpler to reason about.
- [ ] **D) Hybrid** — In-process for same-deployment modules + async messaging for cross-service. Describe: ___

**Your choice**: ___B

---

## Q4: Database Strategy

- [ ] **A) Single shared database, schema-per-BC** — One RDS instance, separate schemas (e.g., ordering.*, preparation.*, inventory.*). Lower cost, simpler ops.
- [ ] **B) Database per service** — Independent database per BC. Full isolation, more expensive.
- [ ] **C) Single shared database, single schema** — Simplest but least isolated.

**Recommendation**: A — for a single coffee shop, schema-per-BC gives logical isolation at low cost.

**Your choice**: ___A

---

## Q5: Deployment Target

Where will this system run?

- [ ] **A) AWS EKS (Kubernetes)** — Container orchestration, good for microservices or multi-container monolith.
- [ ] **B) AWS ECS (Fargate)** — Serverless containers, simpler than EKS, good for small teams.
- [ ] **C) AWS Lambda** — Serverless functions, pay-per-invocation.
- [ ] **D) AWS EC2** — Traditional VMs, full control.
- [ ] **E) Other** — Describe: ___

**Your choice**: ___A

---

## Q5a: AWS Region

Which AWS region? (Select one or specify)

- [ ] **ap-east-2** — Asia Pacific (Taipei) 🇹🇼
- [ ] **ap-northeast-1** — Asia Pacific (Tokyo)
- [ ] **ap-southeast-1** — Asia Pacific (Singapore)
- [ ] **us-east-1** — US East (N. Virginia)
- [ ] Other: ___

**Your choice**: ___A

---

## Q5b: AWS Account Strategy

- [ ] **A) Single account** — Dev/staging/prod all in one account with resource tagging. Simplest.
- [ ] **B) Multi-account** — Separate accounts for dev/staging/prod via AWS Organizations. Better isolation.

**Recommendation**: A for a single coffee shop system.

**Your choice**: ___A

---

## Q5c: VPC Design

- [ ] **A) Public + Private subnets** — ALB in public, services + DB in private, NAT Gateway for outbound. Standard secure setup.
- [ ] **B) Private-only subnets** — All resources in private subnets, VPC endpoints for AWS services. Maximum security, higher cost.
- [ ] **C) Default VPC** — Use AWS default VPC. Simplest, less secure.

**Your choice**: ___A

---

## Q5d: AWS Infrastructure Components

Check all components you want included. Add custom ones in the free-form section.

### Compute
- [V] EKS (Kubernetes cluster + node groups)
- [ ] ECS Fargate (serverless containers)
- [ ] Lambda (serverless functions)
- [ ] EC2 (traditional VMs)

### Database & Storage
- [V] RDS PostgreSQL
- [ ] RDS MySQL
- [ ] DynamoDB
- [ ] Aurora Serverless
- [ ] ElastiCache (Redis)
- [ ] S3 (object storage)

### Messaging & Integration
- [V] SNS (pub/sub topics)
- [V] SQS (message queues)
- [ ] EventBridge
- [ ] MSK (Kafka)

### Networking & CDN
- [V] VPC (custom)
- [V] ALB (Application Load Balancer)
- [V] CloudFront (CDN)
- [ ] Route 53 (DNS)
- [ ] API Gateway

### Observability
- [V] CloudWatch (logs, metrics, dashboards)
- [V] X-Ray (distributed tracing)
- [V] ADOT (OpenTelemetry collector)

### Security & IAM
- [ ] Secrets Manager
- [ ] KMS (encryption keys)
- [V] WAF (web application firewall)
- [V] IAM roles (least privilege per service)
- [ ] Certificate Manager (ACM)

### CI/CD
- [V] ECR (container registry)
- [V] CodePipeline
- [V] CodeBuild
- [ ] GitHub Actions (external)

### Additional Components (free-form)
<!-- Add any AWS services not listed above that you want included -->

```
我需要你想一下針對我這系統的整體組合在 eks 下的最佳實踐. 特別是針對queue, database 方面的配置要留意，還有 ingress controller, cdn waf 等組件
```

---

## Q5e: Infrastructure Review Checkpoint

> After I generate the Infrastructure Resource Plan (stacks, resources, estimated costs), I will present it for your review **before** writing any IaC code. You will be able to add, remove, or adjust resources at that point.

- [V] **Acknowledged** — I understand I'll get a review checkpoint before CDK code is generated.

---

## Reminder

After filling in all answers, change the status at the top to:

```
**Status**: COMPLETED
```
