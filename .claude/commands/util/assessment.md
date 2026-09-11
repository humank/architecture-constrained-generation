---
description: "Assessment Gate — Generate requirements clarification questionnaire when inputs are ambiguous"
---

# Assessment Gate

You are a requirements analyst who identifies ambiguities, gaps, and assumptions in the current phase's inputs. When requirements lack clarity, you generate a structured **assessment file** that the user can fill in before the pipeline continues.

## When to Trigger

This assessment is invoked **automatically** by the orchestrator at these checkpoints:

| Checkpoint | Trigger Condition | Assessment Content |
|---|---|---|
| Pre-Phase 1 | Requirements doc has < 3 functional requirements OR open questions flagged | Requirements clarification |
| **Pre-Phase 2** | **ALWAYS triggered** — architecture style and infrastructure decisions required | **Architecture Decisions Assessment** (see template below) |
| Pre-Phase 3 | Bounded contexts have unresolved shared concepts across BCs | Domain clarification |
| Pre-Phase 4 | Aggregates have unresolved invariants or ambiguous business rules | Business rule clarification |
| **Pre-Phase 8** | **ALWAYS triggered** — technology stack must be confirmed before code generation | **Technology Stack Assessment** (see template below) |

It can also be invoked manually at any point: `/assessment`

## Process

### Step 1: Analyze Current State

Read all existing `.arch/` artifacts. For each phase that has been completed, identify:

1. **Explicit Gaps**: Requirements that are referenced but never defined
2. **Implicit Assumptions**: Decisions made without stated requirements (mark with `[ASSUMED]`)
3. **Contradictions**: Requirements that conflict with each other
4. **Ambiguities**: Statements that can be interpreted multiple ways
5. **Missing Scope**: Areas the requirements don't address but the system likely needs

### Step 2: Categorize Questions

Organize findings into categories:

| Category | Description | Example |
|---|---|---|
| **BUSINESS_RULE** | Business logic that needs clarification | "Is soy milk substitution free or +$20?" |
| **SCOPE** | What's in/out of the system | "Do we support online ordering or in-store only?" |
| **ACTOR** | Who does what and when | "Does the barista or the system auto-assign orders?" |
| **DATA** | Data formats, sources, boundaries | "What's the maximum number of items per order?" |
| **INTEGRATION** | External system interactions | "How should low-stock alerts be delivered (email/SMS/push)?" |
| **QUALITY** | NFR clarification | "What's the acceptable response time for placing an order?" |
| **TECHNOLOGY** | Tech stack preferences/constraints | "Do you have an existing database preference?" |
| **DEPLOYMENT** | Infrastructure and deployment | "On-premises, cloud, or hybrid? Which cloud provider?" |

### Step 3: Priority Assessment

For each question, assess:

- **BLOCKER**: Cannot proceed without this answer. Pipeline pauses.
- **IMPORTANT**: Strongly impacts design decisions. Default assumption noted.
- **NICE_TO_HAVE**: Would improve design. Safe to assume default.

### Step 4: Generate Assessment File

Architecture and stack assessments are **engine locks**, not a Markdown status line.

- Write structured answers to `.arch/assessment-2.yaml` / `.arch/assessment-8.yaml`
  (schemas: `artifact-schemas/assessment-2.schema.json`,
  `artifact-schemas/assessment-8.schema.json`).
- The human fills answers (`status: draft` or `awaiting`).
- Lock with `bun engine/src/acg.ts assess-lock --id assessment-2`.
  Only the engine may set `status: locked`, `locked_at` and `fingerprint`.
- Do not treat `**Status**: COMPLETED` in the Markdown questionnaire as source of truth.
  The Markdown stays as the human-readable rendering; the engine reads only the YAML.
- The lock refuses to close while a required answer is empty. `assessment-2` requires
  `architecture_style, region, deployment_target, communication, database`;
  `assessment-8` requires
  `backend_language, backend_framework_requested, orm, frontend_framework, test_stack, iac`.

**Record what was asked, not what is buildable.** If the human picks a framework
version that the build cannot use, keep their answer in
`backend_framework_requested` and leave `backend_framework_resolved` empty. The
`framework-version-matrix` sensor then reports the conflict instead of the questionnaire
quietly agreeing with the build file. Filling `_resolved` is a human decision.

**The fingerprint is the tamper check.** `acg.ts next` and `acg.ts doctor` recompute
the fingerprint from the answers. Editing a locked answer by hand makes every phase
that consumes the lock `blocked` with "answers changed after lock". The fix is:

```bash
bun engine/src/acg.ts redo --phase 02-strategic   # or the first phase consuming it
bun engine/src/acg.ts assess-lock --id assessment-2
```

`redo` cascades to every later phase, because a decision that moved invalidates
everything downstream of it. `redo --only` limits it to the one phase, for the rare
case where nothing downstream depended on the change.

**Never restate a locked answer as a literal in infrastructure.** Read it:

```bash
bun engine/src/acg.ts locked-answer --id assessment-2 --key region
```

`locked-answer` refuses to answer while the assessment is unlocked or tampered with,
which is exactly what `scripts/deploy.sh` relies on.

## Output

Write to `.arch/assessment-{phase}.md`:

```markdown
# Assessment: Phase {N} — {Phase Name}

> **Generated**: {date}
> **Status**: AWAITING_INPUT
> **Blocking Phase**: {next phase number}
>
> Please fill in your answers in the `Answer` sections below.
> When complete, change Status to `COMPLETED` and re-run the pipeline.

## Summary

- Total questions: {N}
- Blockers: {B} (must answer before proceeding)
- Important: {I} (have default assumptions, please verify)
- Nice-to-have: {H} (can skip, defaults will be used)

---

## BLOCKER Questions

### Q1: {question title}
**Category**: BUSINESS_RULE
**Context**: {why this matters, what phase/artifact it affects}
**Current assumption**: {what we assumed, if anything}
**Options** (if applicable):
- A) {option 1} → {implication}
- B) {option 2} → {implication}
- C) {option 3} → {implication}

**Answer**: <!-- YOUR ANSWER HERE -->

---

## IMPORTANT Questions

### Q{N}: {question title}
**Category**: {category}
**Context**: {context}
**Default assumption**: {what will be used if no answer}
**Impact if default is wrong**: {what would need to change}

**Answer**: <!-- YOUR ANSWER HERE, or leave blank to accept default -->

---

## NICE_TO_HAVE Questions

### Q{N}: {question title}
**Category**: {category}
**Default**: {default value}

**Answer**: <!-- OPTIONAL -->

---

## Assumptions Log

The following assumptions have been made based on available information.
Mark any that are incorrect:

| # | Assumption | Based On | Correct? |
|---|---|---|---|
| A1 | {assumption} | {source} | ✅ / ❌ |
| A2 | {assumption} | {source} | ✅ / ❌ |
```

## Post-Assessment

When the user returns the completed assessment:

1. Read `.arch/assessment-{phase}.md`
2. Verify `Status: COMPLETED`
3. Extract all answers
4. **Update existing artifacts** with the new information:
   - Update `glossary.yaml` with any new terms
   - Update `parsed-requirements.yaml` with clarified requirements
   - Update relevant phase artifacts
5. Log resolved assumptions in `.arch/assessment-{phase}.md` (append resolution notes)
6. Resume pipeline from the blocked phase

## Integration with Orchestrator

The orchestrator checks for pending assessments before each phase:

```
if .arch/assessment-{next_phase}.md exists AND status == AWAITING_INPUT:
    → PAUSE: "Assessment pending. Please fill in .arch/assessment-{next_phase}.md"
if .arch/assessment-{next_phase}.md exists AND status == COMPLETED:
    → Process answers, update artifacts, then continue
```

## Pre-Phase 2: Architecture Decisions Assessment Template

This assessment is **ALWAYS generated** after Phase 1 completes. It uses Phase 1 outputs (event storm, BC candidates, cross-BC event count) to provide informed recommendations.

```markdown
# Assessment: Pre-Phase 2 — Architecture Decisions

> **Generated**: {date}
> **Status**: AWAITING_INPUT
> **Blocking Phase**: 2 (Strategic Design)
>
> Phase 1 (Discovery) identified **{N} domain events**, **{M} commands**, and **{K} bounded context candidates** with **{X} cross-BC events**.
> The following decisions are needed before designing BC boundaries and integration patterns.
> Please fill in your answers and change Status to `COMPLETED`.

## Summary

- Total questions: {N}
- Blockers: {B}
- Important: {I}
- Nice-to-have: {H}

---

## BLOCKER Questions

### Q1: Architecture Style
**Category**: ARCHITECTURE
**Context**: This decision affects how BCs communicate, deploy, and scale. Based on Phase 1 discovery: {K} BC candidates with {X} cross-BC events.
**AI Recommendation**: {recommendation based on complexity — e.g., "Given the small scale (3 BCs, 5 cross-BC events), modular monolith is recommended. You can evolve to microservices later."}

**Options**:
- A) **Modular Monolith** → All BCs in one deployable unit, in-process events (Spring Modulith / NestJS modules). Best for: small teams, MVP, low operational complexity. Can evolve to microservices later.
- B) **Microservices** → Each BC is an independent service with its own database and deployment. Best for: multiple teams, independent scaling needs, different tech stacks per BC.
- C) **Start Monolith, Evolve to Microservices** → Begin as modular monolith with strict BC boundaries. Extract to microservices when scaling/team needs arise. Best for: pragmatic teams, uncertain scale.

**Answer**: <!-- A, B, or C -->

---

### Q2: Team Topology
**Category**: ARCHITECTURE
**Context**: Conway's Law — system architecture mirrors team structure. This affects BC ownership and communication patterns.

**Options**:
- A) **Single team** → One team owns all BCs. Modular monolith is natural fit.
- B) **Multiple teams, shared codebase** → Teams own specific BCs but deploy together. Modular monolith with strong module boundaries.
- C) **Multiple teams, independent deployment** → Each team deploys independently. Microservices required.
- D) **Not decided yet** → AI will assume single team for now.

**Answer**: <!-- A, B, C, or D -->

---

## IMPORTANT Questions (if Microservices selected)

> Skip these if you chose Modular Monolith (A or C) above.

### Q3: Repository Strategy
**Category**: DEPLOYMENT
**Context**: Affects CI/CD pipeline design, code sharing, and dependency management.
**Default assumption**: Mono-repo (simpler for < 5 services)

**Options**:
- A) **Mono-repo** → All services in one repository. Shared tooling, atomic refactors, simpler CI. Best for: < 5 services, single team.
- B) **Multi-repo** → One repository per service. Independent versioning, separate CI. Best for: > 5 services, multiple teams with different release cadences.
- C) **Mono-repo with service-specific pipelines** → One repo but each service has its own CI/CD. Compromise approach.

**Answer**: <!-- A, B, or C (default: A) -->

### Q4: Service Communication Infrastructure
**Category**: INTEGRATION
**Context**: How services discover and communicate with each other.
**Default assumption**: REST + message broker

**Options**:
- A) **REST + Message Broker** (e.g., RabbitMQ, SQS/SNS) → Simple, widely supported. Best for: most cases.
- B) **gRPC + Message Broker** → High-performance inter-service calls + async events. Best for: high-throughput, polyglot.
- C) **Service Mesh** (Istio/Linkerd) + Message Broker → Advanced routing, mTLS, observability built-in. Best for: large-scale, security-critical.
- D) **Event-Driven Only** (no sync calls between services) → Pure choreography. Best for: highly decoupled, event-sourced systems.

**Answer**: <!-- A, B, C, or D (default: A) -->

### Q5: Service Discovery
**Category**: INFRASTRUCTURE
**Context**: How services find each other at runtime.
**Default assumption**: Based on deployment target

**Options**:
- A) **Kubernetes DNS** → If deploying to K8s. Built-in, no extra setup.
- B) **AWS ECS Service Discovery / Cloud Map** → If deploying to AWS ECS.
- C) **Consul** → Platform-agnostic. Good for hybrid/multi-cloud.
- D) **Environment Variables / Config** → Simple, no infrastructure dependency. Best for: small deployments.
- E) **Not applicable** (modular monolith) → Skip.

**Answer**: <!-- A, B, C, D, or E (default: based on deployment target) -->

---

## AWS-Specific Questions (if Q1 Deployment Target involves AWS)

> Skip this section entirely if deployment target is NOT AWS (on-prem, non-AWS cloud).

### Q5a: AWS Region
**Category**: DEPLOYMENT
**Context**: Affects latency to end users, service availability, data residency compliance, and cost. Some AWS services are not available in all regions. Newer regions may lack certain services.
**AI Recommendation**: {recommendation based on user location and requirements}

**Common options**:
- A) **us-east-1 (N. Virginia)** → Cheapest, all services available first, but high latency from Asia.
- B) **ap-east-2 (Taipei)** → Lowest latency for Taiwan users. Newer region — verify all required services are available.
- C) **ap-northeast-1 (Tokyo)** → Low latency from Taiwan/Japan/Korea. Mature region, broad service coverage.
- D) **ap-southeast-1 (Singapore)** → Low latency from SE Asia/Taiwan. Broad service availability.
- E) **eu-west-1 (Ireland)** → Good for EU data residency. All services available.
- F) **Other** → Specify region code: ________________

**Answer**: <!-- A-F -->

### Q5b: AWS Account Strategy
**Category**: DEPLOYMENT
**Context**: Affects blast radius, billing separation, and IAM boundary.

**Options**:
- A) **Single account** → Simplest. All environments (dev/staging/prod) in one account with resource tagging. Best for: small teams, cost-sensitive.
- B) **Multi-account (AWS Organizations)** → Separate accounts for dev, staging, prod. Best for: security-critical, compliance requirements.

**Answer**: <!-- A-B (default: A for small projects) -->

### Q5c: Networking (VPC Design)
**Category**: DEPLOYMENT
**Context**: Affects service isolation, database accessibility, and security posture.

**Options**:
- A) **Single VPC, public + private subnets** → ALB in public subnet, services + RDS in private subnets. Standard pattern for most projects.
- B) **Single VPC, private subnets only + NAT Gateway** → All resources private, NAT for outbound. More secure, higher cost (NAT Gateway).
- C) **Multiple VPCs** → One per environment or per BC. Maximum isolation. Best for: large-scale, multi-team.

**Answer**: <!-- A-C (default: A) -->

### Q5d: AWS Infrastructure Components
**Category**: DEPLOYMENT
**Context**: Based on your architecture style and bounded contexts, below is a **recommended component set**. Review each category, adjust selections, and add any additional components you need. This directly drives CDK stack generation in Phase 5.

**AI will pre-fill recommendations** based on assessment-2 answers (architecture style, BC count, event channels). You review and adjust.

#### Compute
- [ ] **EKS (Kubernetes)** — Container orchestration. Best for: microservices at scale. (Recommended if Q1=microservices + Q5=EKS)
- [ ] **ECS Fargate** — Serverless containers without managing nodes. Simpler than EKS.
- [ ] **Lambda** — Serverless functions for event handlers, cron jobs, lightweight endpoints.
- [ ] **App Runner** — Simplest container deployment, auto-scaling. Good for small services.
- [ ] Other: ________________

#### Database & Storage
- [ ] **RDS PostgreSQL** — Relational DB, schema-per-service on shared instance. (Recommended)
- [ ] **RDS Aurora** — MySQL/PostgreSQL compatible, auto-scaling, multi-AZ. Higher cost.
- [ ] **DynamoDB** — Serverless NoSQL, single-table design. Best for: event store, high-throughput key-value.
- [ ] **ElastiCache (Redis)** — In-memory cache for read model caching, session store, rate limiting.
- [ ] **S3** — Object storage for assets, backups, data lake.
- [ ] Other: ________________

#### Messaging & Integration
- [ ] **SNS + SQS** — Pub/sub fan-out + queues per consumer. Standard async pattern. (Recommended for microservices)
- [ ] **EventBridge** — Event routing with rules, schema registry. Best for: event-driven architectures.
- [ ] **MSK (Managed Kafka)** — High-throughput event streaming, replay capability. Higher cost.
- [ ] **SES** — Email sending (transactional emails, notifications).
- [ ] **Step Functions** — Orchestrated workflows / saga coordination.
- [ ] Other: ________________

#### Networking & Traffic
- [ ] **ALB (Application Load Balancer)** — HTTP/HTTPS load balancing, path-based routing. (Recommended)
- [ ] **API Gateway** — Managed REST/WebSocket API with auth, throttling, caching.
- [ ] **CloudFront** — CDN for frontend static assets + optional API caching. (Recommended if frontend exists)
- [ ] **Route 53** — DNS management, health checks, failover routing.
- [ ] **WAF** — Web application firewall for OWASP protection.
- [ ] Other: ________________

#### Security & Identity
- [ ] **Secrets Manager** — DB credentials, API keys, JWT signing keys. (Recommended)
- [ ] **KMS** — Encryption key management for RDS, S3, SQS at-rest encryption.
- [ ] **Cognito** — User authentication, JWT tokens, social login.
- [ ] **IAM Roles (IRSA for EKS / Task Role for ECS)** — Per-service least-privilege. (Recommended)
- [ ] **ACM (Certificate Manager)** — Free TLS certificates for ALB/CloudFront.
- [ ] Other: ________________

#### Observability
- [ ] **CloudWatch Logs + Metrics** — Standard logging and metrics. (Recommended)
- [ ] **X-Ray / ADOT** — Distributed tracing via OpenTelemetry. (Recommended for microservices)
- [ ] **Managed Grafana** — Dashboards if team prefers Grafana over CloudWatch dashboards.
- [ ] **Managed Prometheus** — Metrics if team prefers Prometheus + Grafana stack.
- [ ] Other: ________________

#### CI/CD
- [ ] **ECR** — Container image registry. (Recommended if containers)
- [ ] **CodePipeline + CodeBuild** — AWS-native CI/CD.
- [ ] **GitHub Actions** → CI/CD with OIDC federation to AWS (no long-lived keys). (Recommended if GitHub repo)
- [ ] Other: ________________

#### Additional Components (free-form)
List any AWS services not covered above that you want in your infrastructure:
```
(e.g., "Elastic File System for shared model weights", "Bedrock for AI features", "IoT Core for device telemetry")
```

**Answer**: <!-- Check the boxes above, add notes, then confirm -->

---

### Q5e: Infrastructure Review Checkpoint
**Category**: DEPLOYMENT
**Context**: Before Phase 5 generates CDK code, the orchestrator will present a **resource summary table** derived from your Q5d selections + architecture artifacts. You confirm or adjust before any code is generated.

> This is not a question — it is a commitment that the pipeline will pause for your review.
> The summary will show: Stack name → AWS resources → Estimated monthly cost range → Source artifact.
> You may add, remove, or change any resource at that point.

### Q6: API Gateway
**Category**: INFRASTRUCTURE
**Context**: Single entry point for external clients. Handles routing, auth, rate limiting.
**Default assumption**: No gateway for MVP

**Options**:
- A) **No API Gateway** → Clients call services directly. Simplest. Best for: internal-only, MVP.
- B) **Kong / AWS API Gateway** → Managed gateway with auth, rate limiting, monitoring. Best for: production with external clients.
- C) **BFF (Backend for Frontend) pattern** → One lightweight gateway per frontend type (web, mobile). Best for: multiple client types.
- D) **Service Mesh ingress** → If using Istio/Linkerd, use mesh ingress. Best for: K8s deployments.

**Answer**: <!-- A, B, C, or D (default: A) -->

---

## NICE_TO_HAVE Questions

### Q7: Schema Registry
**Category**: INTEGRATION
**Context**: Manages event/message schemas for cross-service compatibility. Prevents breaking changes.
**Default**: No registry for MVP; JSON Schema in code.

**Options**:
- A) **No registry** → Schemas defined in code/contracts. Manual compatibility checks. Best for: < 5 services.
- B) **Confluent Schema Registry** → If using Kafka. Avro/Protobuf/JSON Schema support.
- C) **AWS Glue Schema Registry** → If on AWS. EventBridge/MSK integration.
- D) **Custom schema validation in CI** → Schema files in repo, validated during build.

**Answer**: <!-- A, B, C, or D (default: A) -->

---

## Assumptions Log

| # | Assumption | Based On | Correct? |
|---|---|---|---|
| A1 | {assumption from Phase 0-1} | {source} | ✅ / ❌ |
```

---

## Pre-Phase 8: Technology Stack Assessment Template

This assessment is **ALWAYS generated** before Phase 8. It collects technology choices needed for code generation.

```markdown
# Assessment: Pre-Phase 8 — Technology Stack

> **Generated**: {date}
> **Status**: AWAITING_INPUT
> **Blocking Phase**: 8 (Implementation)
>
> Architecture style: **{modulith|microservices}** (from assessment-2)
> All design artifacts (Phases 0-7) are complete. The following technology decisions are needed before generating code.

## BLOCKER Questions

### Q1: Programming Language & Version
**Category**: TECHNOLOGY
**Context**: Determines language features, toolchain, and ecosystem. Phase 3 has annotated Java 21 type design candidates (records, sealed interfaces) — these require Java 17+.

**Options**:
- A) **Java 21 (LTS)** → Records, sealed interfaces, pattern matching. Best for: enterprise, Spring ecosystem, strong DDD support.
- B) **Java 17 (LTS)** → Records, sealed interfaces (no record patterns). If Java 21 not available.
- C) **Kotlin** → Data classes, sealed classes, coroutines. Best for: concise code, Android + backend.
- D) **TypeScript (Node.js)** → If frontend team also does backend. Best for: full-stack JS teams.
- E) **C# (.NET 8)** → Records, pattern matching, strong enterprise support. Best for: Microsoft ecosystem.
- F) **Other** → Specify: ________________

**Answer**: <!-- A, B, C, D, E, or F -->

### Q2: Application Framework & Version
**Category**: TECHNOLOGY
**Context**: Determines project structure, DI, lifecycle management, and event handling.

**Options (Java)**:
- A) **Spring Boot 3.4.x + Spring Modulith** → Modular monolith with module boundaries, async events, event publication tracking. Best for: modulith architecture.
- B) **Spring Boot 3.4.x + Spring Cloud** → Microservices with service discovery, config server, circuit breaker. Best for: microservices architecture.
- C) **Quarkus** → Cloud-native, fast startup, GraalVM native. Best for: serverless, containers.
- D) **Micronaut** → Compile-time DI, low memory footprint. Best for: microservices, serverless.

**Options (TypeScript)**:
- E) **NestJS** → Modular, DDD-friendly, built-in CQRS. Best for: Node.js enterprise.
- F) **Fastify** → Lightweight, plugin-based. Best for: simple services.

**Options (C#)**:
- G) **.NET 8 Minimal API** → Lightweight, fast. Best for: microservices.
- H) **ASP.NET Core MVC** → Full-featured. Best for: modulith, enterprise.

**Answer**: <!-- A-H -->

### Q3: Build Tool
**Category**: TECHNOLOGY
**Default assumption**: Based on language choice

**Options (Java)**:
- A) **Gradle (Kotlin DSL)** → Flexible, fast incremental builds. Recommended for Spring Boot 3.x.
- B) **Maven** → Convention-over-configuration, widely supported. Stable but slower.

**Options (TypeScript)**:
- C) **npm** / D) **pnpm** / E) **yarn**

**Answer**: <!-- A-E (default: A for Java, C for TypeScript) -->

### Q4: Database
**Category**: TECHNOLOGY
**Context**: Affects DDL dialect, reserved words, type mappings, and migration tooling.

**Options**:
- A) **PostgreSQL** → Full-featured, JSON support, excellent for DDD. Production-ready.
- B) **H2 (dev) + PostgreSQL (prod)** → Fast tests with H2, production on PostgreSQL. Common Spring Boot setup.
- C) **MySQL / MariaDB** → Widely available, simpler. Check enum and JSON support.
- D) **DynamoDB** → If AWS serverless. Single-table design, different modeling approach.
- E) **MongoDB** → Document model, flexible schema. Good for event-sourced aggregates.

**Answer**: <!-- A-E (default: B for modulith, A for microservices) -->

### Q5: Event / Messaging Mechanism
**Category**: TECHNOLOGY
**Context**: Architecture style is **{modulith|microservices}**. This affects cross-BC event delivery.

**Options (Modular Monolith)**:
- A) **Spring Modulith (in-process async events)** → `@ApplicationModuleListener`, event publication table. Simplest, no external infrastructure.
- B) **Spring ApplicationEvent + @Async** → Basic Spring events without Modulith tracking.

**Options (Microservices)**:
- C) **RabbitMQ** → Flexible routing, easy setup. Best for: moderate throughput.
- D) **Apache Kafka** → High throughput, event log, replay. Best for: event sourcing, high volume.
- E) **AWS SQS/SNS** → Managed, serverless. Best for: AWS deployments.
- F) **AWS EventBridge** → Event routing rules, schema registry. Best for: event-driven AWS.

**Answer**: <!-- A-F (default: A for modulith, C for microservices) -->

### Q6: Deployment Target
**Category**: DEPLOYMENT
**Context**: Affects Dockerfile generation, IaC templates, and CI/CD pipeline design.

**Options**:
- A) **Local development only (for now)** → H2 database, embedded everything. No Docker needed.
- B) **Docker Compose** → Local multi-container setup. Good for development and small deployments.
- C) **Kubernetes (EKS/GKE/AKS)** → Container orchestration. Best for: microservices at scale.
- D) **AWS ECS/Fargate** → Managed containers without K8s complexity. Best for: AWS teams.
- E) **AWS Lambda** → Serverless. Best for: event-driven, low-traffic.
- F) **Bare VM / on-premises** → Traditional deployment. Minimal cloud dependency.

**Answer**: <!-- A-F (default: A) -->

### Q6a: Infrastructure as Code Tool (if deploying to cloud)
**Category**: DEPLOYMENT
**Context**: Determines how cloud resources (VPC, EKS/ECS, RDS, SNS/SQS, S3, CloudFront, IAM) are provisioned and managed. Affects Phase 5 IaC code generation.

> Skip if Q6 = A (local only) or F (bare VM).

**Options**:
- A) **AWS CDK (TypeScript)** → Programmatic, type-safe, full AWS construct library. Best for: TypeScript teams, complex infra. *Recommended if frontend is TypeScript.*
- B) **AWS CDK (Python)** → Same CDK constructs, Python syntax. Best for: data/ML teams.
- C) **AWS CDK (Java)** → Same CDK constructs, Java syntax. Best for: Java-only teams who want one language.
- D) **Terraform (HCL)** → Cloud-agnostic, declarative, huge module ecosystem. Best for: multi-cloud, teams with Terraform experience.
- E) **AWS CloudFormation (YAML/JSON)** → Native AWS, no additional tooling. Verbose but well-documented. Best for: simple deployments.
- F) **Pulumi (TypeScript)** → Like CDK but multi-cloud. Best for: multi-cloud with TypeScript.

**Answer**: <!-- A-F (default: A if TypeScript frontend, D if multi-cloud) -->

---

## IMPORTANT Questions

### Q7: Test Framework
**Category**: TECHNOLOGY
**Default assumption**: Based on language/framework choice

**Options (Java + Spring Boot)**:
- A) **JUnit 5 + Mockito + Spring Boot Test** → Standard stack. AssertJ for fluent assertions.
- B) **JUnit 5 + Mockito + Testcontainers** → Real DB in tests (PostgreSQL container). Better integration coverage.
- C) **Spock (Groovy)** → BDD-style tests, data-driven testing. Good for specification-like tests.

**Options (TypeScript)**:
- D) **Jest** / E) **Vitest**

**Answer**: <!-- A-E (default: A for Java) -->

### Q8: Authentication Mechanism
**Category**: TECHNOLOGY
**Default assumption**: None for MVP (physical device separation provides access control)

**Options**:
- A) **None (MVP)** → Role-based URL convention, no auth middleware. Best for: internal, trusted network.
- B) **Spring Security + JWT** → Stateless auth, role-based access. Best for: API with external clients.
- C) **OAuth 2.0 (Cognito/Keycloak)** → Full identity management. Best for: multi-tenant, SSO.
- D) **API Key per role** → Simple, per-device keys. Best for: internal services with some access control.

**Answer**: <!-- A-D (default: A) -->

---

### Q9: Frontend Framework
**Category**: TECHNOLOGY
**Context**: Phase 3 designed actor-specific views and component architecture. This choice determines how they are implemented. If "No frontend" is selected, Testing Trophy and E2E tests will be backend-only.

**Options**:
- A) **React 18+ (TypeScript) + Vite** → Component-based, large ecosystem, TanStack Query + Zustand. Best for: most projects.
- B) **Next.js (TypeScript)** → React + SSR/SSG, file-based routing, API routes. Best for: SEO, full-stack.
- C) **Vue 3 (TypeScript) + Vite** → Composition API, simpler learning curve. Best for: smaller teams.
- D) **Angular** → Full framework with DI, RxJS, strong typing. Best for: enterprise, large teams.
- E) **No frontend (API only)** → Backend REST API only. Frontend handled separately or by another team. Skip all frontend generation.

**Answer**: <!-- A-E (default: A) -->

### Q10: Frontend Testing Tools
**Category**: TECHNOLOGY
**Context**: Phase 4 designed Testing Trophy shape for UI-heavy BCs. These tools implement the thickest layer (integration ~50%).
**Default assumption**: Based on frontend framework choice

**Options (React/Next.js/Vue)**:
- A) **Testing Library + MSW + Playwright** → Integration-heavy (Testing Trophy). Testing Library for component tests, MSW for API mocking, Playwright for E2E. Recommended.
- B) **Testing Library + MSW + Cypress** → Same as A but Cypress for E2E. Better debugging UI.
- C) **Vitest + MSW + Playwright** → Lighter unit/integration runner. Good with Vite.

**Options (Angular)**:
- D) **Angular Testing + MSW + Playwright** → Built-in TestBed + external tools.

**Options (No frontend)**:
- E) **Skip** → No frontend tests.

**Answer**: <!-- A-E (default: A for React) -->

### Q11: Component Documentation
**Category**: TECHNOLOGY
**Context**: Living documentation for the design system and actor-specific components.
**Default**: Storybook

**Options**:
- A) **Storybook** → Interactive component explorer, visual regression testing. Industry standard.
- B) **Ladle** → Lightweight Storybook alternative for Vite projects.
- C) **None** → Skip component documentation.

**Answer**: <!-- A-C (default: A) -->

### Q12: CSS Framework
**Category**: TECHNOLOGY
**Context**: Determines how design tokens from Phase 3c (UX Design) translate to code. Must be compatible with Q9 (Frontend Framework). Used by the ui-ux-pro-max design system generator.

**Why Tailwind is the default**: Tailwind's utility-first approach maps 1:1 to design tokens — the design system's color/spacing/typography values become `tailwind.config.ts` entries directly. shadcn/ui, Next.js/Vercel ecosystem, and ui-ux-pro-max all assume Tailwind. Other approaches are viable but require more manual bridging.

**Options**:
- A) **Tailwind CSS** → Utility-first, design tokens map directly to config. Industry default for React (2024+). shadcn/ui + ui-ux-pro-max 完整支援.
- B) **CSS Modules** → Scoped CSS, no utility classes. No built-in token system — you must manually create variables. Choose only if team has strong CSS-first preference.
- C) **styled-components / Emotion** → CSS-in-JS with runtime cost. **Being phased out** — React Server Components (Next.js App Router) does not support runtime CSS-in-JS. Only for legacy projects.
- D) **Vanilla Extract** → Zero-runtime CSS-in-TypeScript. Good technology but small ecosystem — shadcn/ui does not support it.

**Answer**: <!-- A-D (default: A) -->

### Q13: Component Library
**Category**: TECHNOLOGY
**Context**: Pre-built accessible UI components. Must be compatible with Q9 and Q12. Phase 3c generates design tokens that map to this library's theming system.

**Why shadcn/ui is the default**: Unlike npm packages (MUI, Ant Design), shadcn/ui copies components into your codebase — you own the code and can modify anything. Built on Radix UI (best accessibility primitives) + Tailwind. The design system from Phase 3c maps directly to shadcn/ui's CSS variable theming. Next.js v0.dev, Vercel, and the broader React ecosystem have converged on this stack.

**Options (React + Tailwind)**:
- A) **shadcn/ui** → Copy-paste into your codebase (Radix UI + Tailwind). Full ownership, full customization, best a11y. Industry default (2024+).
- B) **Radix UI (unstyled)** → Same accessibility primitives as shadcn/ui, but you style everything from scratch. Choose only if your design system is radically different from any existing pattern.
- C) **Headless UI** → By Tailwind Labs. Fewer components than Radix but tighter Tailwind integration. Good for very simple projects.

**Options (React, NOT using Tailwind)**:
- D) **MUI (Material UI)** → Complete component suite with Material Design theming. Mature, well-documented. Best for: enterprise/admin panels where Material Design is acceptable. Comes with its own styling engine (Emotion).
- E) **Ant Design** → Enterprise-focused, rich data components (tables, tree views, cascaders). Best for: data-heavy admin panels. Heavy bundle size. Popular in Chinese ecosystem.
- F) **Chakra UI** → Simple, accessible, modular. Nice DX but smaller ecosystem than MUI. Best for: quick prototyping.

**Options (Vue)**:
- G) **Vuetify** → Material Design for Vue. Full component suite.
- H) **Naive UI** → TypeScript-first Vue components. Clean API.

**Answer**: <!-- A-H (default: A for React+Tailwind) -->

### Q14: Visual Style Direction
**Category**: DESIGN
**Context**: Guides the ui-ux-pro-max design system generation in Phase 3c. The reasoning engine may refine this based on product type and industry.

**Options**:
- A) **Let ui-ux-pro-max recommend** → Best match for your product type and industry. Recommended.
- B) **Minimalism** → Clean, content-first, generous whitespace.
- C) **Glassmorphism** → Frosted glass, blur, transparency, modern feel.
- D) **Soft UI / Neumorphism** → Subtle shadows, soft depth, premium feel.
- E) **Brutalism** → Bold, raw, unconventional. Best for: creative/agency.
- F) **Dark Mode First** → Dark surfaces, vibrant accents.
- G) **Bento Grid** → Grid-based dashboard layouts with cards.
- H) **Custom** → Specify style keywords in the answer field.

**Answer**: <!-- A-H (default: A) -->

---

## Assumptions Log

| # | Assumption | Based On | Correct? |
|---|---|---|---|
| A1 | Architecture style: {from assessment-2} | assessment-2.md | ✅ / ❌ |
```

$ARGUMENTS
