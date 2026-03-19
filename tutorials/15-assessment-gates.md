# Chapter 15: Assessment Gates

![Shield and security — gatekeeping critical architecture decisions](https://images.unsplash.com/photo-1733317239304-a6bf462a2596?w=1200&h=400&fit=crop&q=80)

*Photo by [Unsplash](https://unsplash.com) — Free to use under [Unsplash License](https://unsplash.com/license)*

> *"The best architectures emerge from self-organizing teams — but self-organizing doesn't mean self-deciding on infrastructure."* — Adapted from the Agile Manifesto
>
> Assessment gates are where the human exercises **architectural authority**. The AI proposes. The human disposes.

---

## Why Assessment Gates?

AI-generated code is only as good as the constraints it operates under. Some constraints — like Aggregate invariants or API naming conventions — can be derived mechanically from upstream artifacts. But others cannot:

- **Modular Monolith vs. Microservices** — this shapes every artifact downstream
- **AWS Region** — affects latency, data residency, service availability, cost
- **Technology Stack** — Java 21 or Kotlin? Spring Boot or Quarkus? PostgreSQL or DynamoDB?
- **Team Topology** — one team or four? Mono-repo or multi-repo?

These are decisions with **massive downstream impact**. Getting them wrong doesn't mean a bad variable name; it means rebuilding the entire delivery pipeline. No AI should make these choices autonomously.

Assessment gates solve this by **pausing the pipeline** and presenting structured questionnaires to the human architect. The pipeline does not resume until the human has answered.

```
Pipeline Flow with Assessment Gates:

  Phase 0 ──→ Phase 1 ──→ ⛔ GATE ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ...
  (Requirements) (Discovery)  │         (Strategic)
                              │
                    ┌─────────▼──────────┐
                    │ assessment-2.md    │
                    │                    │
                    │ Q1: Architecture?  │
                    │ Q2: Team topology? │
                    │ Q3: Repo strategy? │
                    │ Q4: Communication? │
                    │ ...                │
                    │                    │
                    │ Status: PENDING    │
                    └────────────────────┘
                              │
                    Human fills answers,
                    sets Status: COMPLETED
                              │
                    Pipeline resumes ──→
```

---

## When Gates Trigger

Not every gate fires on every run. Some are **mandatory** (they always fire), while others are **conditional** (they fire only when the AI detects ambiguity).

| Checkpoint | Trigger | Content |
|---|---|---|
| **Pre-Phase 1** | Requirements incomplete | Requirements clarification — missing personas, unclear scope, ambiguous domain |
| **Pre-Phase 2** | **ALWAYS** | Architecture Decisions — the most critical assessment (**MANDATORY**) |
| **Pre-Phase 3** | Unresolved shared concepts | Domain clarification — terms used across BCs with different meanings |
| **Pre-Phase 4** | Ambiguous business rules | Business rule clarification — edge cases, validation rules, state transitions |
| **Pre-Phase 8** | **ALWAYS** | Technology Stack — language, framework, database, deployment (**MANDATORY**) |

The two mandatory gates — Pre-Phase 2 and Pre-Phase 8 — are the load-bearing decisions. Everything else can often be inferred, but architecture style and technology stack **must** be confirmed by a human.

---

## Question Priority Levels

Every question in an assessment carries a priority:

| Priority | Meaning | Pipeline Behavior |
|---|---|---|
| **BLOCKER** | Pipeline pauses until answered | Cannot proceed without an answer |
| **IMPORTANT** | Has a default assumption, please verify | Pipeline can proceed with the default, but the human should confirm |
| **NICE_TO_HAVE** | Safe to skip | Pipeline uses a sensible default; answer only if you have a preference |

The priority system means you don't have to answer every question to unblock the pipeline. Answer the BLOCKERs, review the IMPORTANTs, skip the NICE_TO_HAVEs if you're in a hurry.

---

## Pre-Phase 2: Architecture Decisions Assessment

This is the most critical assessment in the entire pipeline. The answers here cascade through every subsequent phase — from how Bounded Contexts communicate, to how the infrastructure is provisioned, to what the CI/CD pipeline looks like.

### Q1: Architecture Style (BLOCKER)

```markdown
### Q1: Architecture Style
**Priority:** BLOCKER
**Context:** Your system has [N] bounded contexts, [M] domain events,
and [complexity] domain complexity.

**AI Recommendation:** [Modular Monolith / Microservices] because [reasoning]

**Options:**
- **A) Modular Monolith** — Single deployable, in-process communication,
  schema-per-BC isolation. Best for: small teams, early-stage products,
  moderate complexity. Lower operational overhead.
- **B) Microservices** — Independent deployables, message broker communication,
  database-per-service. Best for: multiple teams, independent deployment
  requirements, high scale. Higher operational complexity.
- **C) Start Monolith, Evolve** — Begin as modular monolith with explicit
  module boundaries. Extract to microservices when team/scale demands it.
  Best for: uncertain scale, single team today but growing.

**Default assumption:** [A/B/C based on analysis]
**Your answer:** ___
```

### Q2: Team Topology (IMPORTANT)

```markdown
### Q2: Team Topology
**Priority:** IMPORTANT
**Context:** Team topology affects BC ownership, repository strategy,
and deployment boundaries.

**AI Recommendation:** [recommendation] because [reasoning]

**Options:**
- **A) Single team** — One team owns all BCs. Simplifies coordination.
  Natural fit for modular monolith.
- **B) Multiple teams** — Each team owns 1-2 BCs. Requires clear contracts.
  Natural fit for microservices.
- **C) Independent deployment teams** — Each BC has its own team and
  deployment pipeline. Maximum autonomy, maximum coordination cost.

**Default assumption:** A (Single team)
**Your answer:** ___
```

### Q3: Repository Strategy (IMPORTANT)

```markdown
### Q3: Repository Strategy
**Priority:** IMPORTANT

**Options:**
- **A) Mono-repo** — Single repository, all BCs. Atomic refactoring,
  shared tooling, simpler CI. Best with single team.
- **B) Multi-repo** — One repo per BC/service. Independent versioning,
  independent pipelines. Best with multiple teams.

**Default assumption:** A (Mono-repo)
**Your answer:** ___
```

### Q4: Service Communication (BLOCKER for Microservices)

```markdown
### Q4: Service Communication
**Priority:** BLOCKER (if microservices) / NICE_TO_HAVE (if modulith)
**Context:** Determines how bounded contexts exchange data and events.

**Options:**
- **A) REST + Message Broker** — Synchronous queries via REST,
  asynchronous commands/events via message broker (SNS/SQS).
  Most common hybrid approach.
- **B) gRPC** — High-performance binary protocol. Best for
  low-latency inter-service calls. Requires proto schema management.
- **C) Service Mesh** — Istio/Linkerd handles communication concerns
  (retries, circuit breaking, mTLS). Higher infrastructure complexity.
- **D) Event-Driven Only** — All communication via events. Maximum
  decoupling, eventual consistency everywhere. Requires mature
  event modeling.

**Default assumption:** A (REST + Message Broker)
**Your answer:** ___
```

### Q5: Service Discovery (IMPORTANT for Microservices)

```markdown
### Q5: Service Discovery
**Priority:** IMPORTANT (if microservices) / N/A (if modulith)

**Options:**
- **A) Kubernetes DNS** — Native K8s service discovery. Simple, no
  extra infrastructure.
- **B) AWS ECS Service Connect / Cloud Map** — Native AWS service
  discovery for ECS workloads.
- **C) Consul** — HashiCorp service mesh and discovery. Multi-cloud,
  feature-rich. Additional operational burden.
- **D) Environment variables** — Simple, static. Works for small
  deployments with stable endpoints.

**Default assumption:** A (Kubernetes DNS) or B (ECS) depending on deployment target
**Your answer:** ___
```

### AWS-Specific Questions (Q5a-Q5e)

These questions activate when AWS is the deployment target:

```markdown
### Q5a: AWS Region (BLOCKER)
**Priority:** BLOCKER
**Context:** Affects latency, data residency, service availability, and cost.

**Options:**
- **A) us-east-1** — Most services, largest capacity, lowest cost.
  Data residency: US.
- **B) us-west-2** — Second-largest region. Good US west coast latency.
- **C) eu-west-1** — Ireland. GDPR-friendly. Good European latency.
- **D) eu-central-1** — Frankfurt. Strictest EU data residency.
- **E) ap-southeast-1** — Singapore. APAC coverage.
- **F) Other** — Specify: ___

**Default assumption:** us-east-1
**Your answer:** ___
```

```markdown
### Q5b: AWS Account Strategy (IMPORTANT)
**Priority:** IMPORTANT

**Options:**
- **A) Single account** — Simple. All environments in one account
  with IAM isolation.
- **B) Multi-account** — Separate accounts for dev/staging/prod.
  AWS Organizations. Stronger blast radius isolation.

**Default assumption:** A (Single account) for simplicity
**Your answer:** ___
```

```markdown
### Q5c: VPC Design (IMPORTANT)
**Priority:** IMPORTANT

**Options:**
- **A) Public + Private subnets** — ALB in public, services in private,
  NAT Gateway for outbound. Standard production pattern.
- **B) Private only** — All resources in private subnets. Access via
  VPN/PrivateLink. Maximum security, higher complexity.

**Default assumption:** A (Public + Private subnets)
**Your answer:** ___
```

```markdown
### Q5d: Infrastructure Components (BLOCKER)
**Priority:** BLOCKER
**Context:** Select the AWS services for each infrastructure concern.

| Concern | Options | Default |
|---|---|---|
| **Compute** | EKS / ECS Fargate / Lambda / EC2 | ECS Fargate |
| **Database** | RDS PostgreSQL / Aurora / DynamoDB | RDS PostgreSQL |
| **Messaging** | SNS+SQS / EventBridge / MSK (Kafka) | SNS+SQS |
| **Networking** | ALB / API Gateway + ALB / CloudFront + ALB | ALB |
| **Security** | Cognito / Auth0 / Keycloak on ECS | Cognito |
| **Observability** | CloudWatch / Datadog / Grafana Stack | CloudWatch |
| **CI/CD** | GitHub Actions / CodePipeline / GitLab CI | GitHub Actions |

**Your selections:**
- Compute: ___
- Database: ___
- Messaging: ___
- Networking: ___
- Security: ___
- Observability: ___
- CI/CD: ___
```

```markdown
### Q5e: Infrastructure Review Checkpoint (NICE_TO_HAVE)
**Priority:** NICE_TO_HAVE
**Context:** Would you like the pipeline to generate a preliminary
infrastructure diagram (C4 Deployment View) for review before
proceeding to code generation?

**Options:**
- **A) Yes** — Generate diagram, pause for review
- **B) No** — Proceed directly

**Default assumption:** B (No)
**Your answer:** ___
```

### Q6: API Gateway (NICE_TO_HAVE)

```markdown
### Q6: API Gateway
**Priority:** NICE_TO_HAVE
**Context:** Central entry point for all client traffic.

**Options:**
- **A) AWS API Gateway** — Managed, pay-per-request. Native AWS integration.
- **B) Kong** — Open source, plugin ecosystem. Self-hosted on ECS/EKS.
- **C) Spring Cloud Gateway** — Java-native. Good for Spring Boot ecosystems.
- **D) None** — ALB routes directly to services.

**Default assumption:** D (None — ALB direct) for modulith, A (AWS API Gateway) for microservices
**Your answer:** ___
```

### Q7: Schema Registry (NICE_TO_HAVE)

```markdown
### Q7: Schema Registry
**Priority:** NICE_TO_HAVE
**Context:** Governs event schema evolution across bounded contexts.

**Options:**
- **A) AWS Glue Schema Registry** — Managed, integrates with MSK/EventBridge.
- **B) Confluent Schema Registry** — Industry standard for Kafka ecosystems.
- **C) None** — Rely on contract tests and event versioning conventions.

**Default assumption:** C (None — contract tests)
**Your answer:** ___
```

---

![Checklist being marked — structured technology decisions](https://images.unsplash.com/photo-1754548930574-6a995e5eb5a7?w=1200&h=400&fit=crop&q=80)

## Pre-Phase 8: Technology Stack Assessment

The second mandatory gate. By this point, the architecture is designed, BCs are defined, Aggregates have invariants, and BDD scenarios are written. Now we choose the tools to implement it all.

### Q1: Programming Language & Version (BLOCKER)

```markdown
### Q1: Programming Language & Version
**Priority:** BLOCKER
**Context:** All bounded contexts will use this language unless overridden per-BC.

**Options:**
- **A) Java 21** — LTS, virtual threads (Project Loom), pattern matching,
  record types. Largest Spring Boot ecosystem.
- **B) Kotlin** — Concise syntax, coroutines, null safety. Full Spring Boot
  compatibility. Smaller talent pool.
- **C) TypeScript** — Full-stack option with NestJS. Best when frontend
  team owns backend. Weaker DDD ecosystem.
- **D) C#** — .NET 8. Strong DDD support, good performance.
  Best for Microsoft-ecosystem teams.

**Default assumption:** A (Java 21)
**Your answer:** ___
```

### Q2: Application Framework (BLOCKER)

```markdown
### Q2: Application Framework
**Priority:** BLOCKER

**Options:**
- **A) Spring Boot 3 + Spring Modulith** — Module boundaries enforced
  at framework level. In-process events with @ApplicationModuleListener.
  Best for modular monolith.
- **B) Spring Boot 3 + Spring Cloud** — Service discovery, config server,
  circuit breakers. Best for microservices.
- **C) Quarkus** — GraalVM native compilation, fast startup. Best for
  serverless/Lambda deployments.
- **D) NestJS** — TypeScript framework with DDD-friendly module system.
  Best for TypeScript teams.

**Default assumption:** A (Spring Boot 3 + Spring Modulith) for modulith,
B (Spring Boot 3 + Spring Cloud) for microservices
**Your answer:** ___
```

### Q3: Build Tool (IMPORTANT)

```markdown
### Q3: Build Tool
**Priority:** IMPORTANT

**Options:**
- **A) Gradle (Kotlin DSL)** — Flexible, fast incremental builds.
  Better multi-module support.
- **B) Maven** — Convention over configuration. Simpler for new teams.
  Larger plugin ecosystem.

**Default assumption:** A (Gradle Kotlin DSL)
**Your answer:** ___
```

### Q4: Database (BLOCKER)

```markdown
### Q4: Database
**Priority:** BLOCKER

**Options:**
- **A) PostgreSQL (RDS)** — Reliable, full SQL, JSONB support.
  Best general-purpose choice.
- **B) Aurora PostgreSQL** — Managed PostgreSQL with auto-scaling
  storage. Higher cost, less operational burden.
- **C) DynamoDB** — NoSQL, single-digit millisecond latency.
  Requires careful access pattern modeling. Best for event stores.
- **D) Mixed** — PostgreSQL for command side, DynamoDB for read models.
  CQRS-optimized.

**Default assumption:** A (PostgreSQL on RDS)
**Your answer:** ___
```

### Q5: Event/Messaging (BLOCKER for Microservices)

```markdown
### Q5: Event/Messaging
**Priority:** BLOCKER (if microservices) / IMPORTANT (if modulith)

**Options:**
- **A) SNS + SQS** — AWS-native pub/sub + queue. Simple, reliable,
  no servers to manage. Best for most AWS deployments.
- **B) EventBridge** — Schema registry, content-based filtering,
  archive/replay. Best for complex event routing.
- **C) MSK (Managed Kafka)** — High throughput, event sourcing friendly,
  log-based. Higher cost and complexity.
- **D) Spring Application Events** — In-process only. Zero infrastructure.
  Modulith only.

**Default assumption:** D (Spring Application Events) for modulith,
A (SNS + SQS) for microservices
**Your answer:** ___
```

### Q6: Deployment Target (BLOCKER)

```markdown
### Q6: Deployment Target
**Priority:** BLOCKER

**Options:**
- **A) ECS Fargate** — Serverless containers. No EC2 management.
  Good balance of control and simplicity.
- **B) EKS** — Full Kubernetes. Maximum portability, highest
  operational complexity.
- **C) Lambda** — Serverless functions. Best for event-driven,
  low-traffic workloads. Cold start considerations.
- **D) EC2** — Full control. Best for specific compliance requirements.

**Default assumption:** A (ECS Fargate)
**Your answer:** ___
```

```markdown
### Q6a: Infrastructure as Code Tool (BLOCKER)
**Priority:** BLOCKER

**Options:**
- **A) AWS CDK (TypeScript)** — Programmatic, type-safe, AWS-native.
  Best for teams comfortable with TypeScript.
- **B) Terraform** — Multi-cloud, declarative, large community.
  HCL syntax. Best for multi-cloud or existing Terraform teams.
- **C) CloudFormation** — AWS-native YAML/JSON. No additional tooling.
  Verbose but well-documented.
- **D) Pulumi** — Programmatic IaC in your application language.
  Best for teams wanting one language everywhere.

**Default assumption:** A (AWS CDK TypeScript)
**Your answer:** ___
```

### Q7: Test Framework (IMPORTANT)

```markdown
### Q7: Test Framework
**Priority:** IMPORTANT

**Options:**
- **A) JUnit 5 + AssertJ + Mockito** — Industry standard Java testing.
  Best documentation, most examples.
- **B) JUnit 5 + Kotest assertions** — Kotlin-friendly assertions
  with JUnit 5 runner.
- **C) Jest + Supertest** — TypeScript/NestJS testing. Best for
  TypeScript stacks.

**Default assumption:** A (JUnit 5 + AssertJ + Mockito)
**Your answer:** ___
```

### Q8: Authentication (IMPORTANT)

```markdown
### Q8: Authentication
**Priority:** IMPORTANT

**Options:**
- **A) AWS Cognito** — Managed user pools, JWT tokens. Cheapest
  AWS-native option. Limited customization.
- **B) Auth0** — Feature-rich, excellent DX. Higher cost at scale.
- **C) Keycloak** — Open source, self-hosted. Maximum control,
  highest operational burden.
- **D) None (for now)** — Defer authentication. Use mock auth
  in development.

**Default assumption:** A (AWS Cognito)
**Your answer:** ___
```

### Q9-Q14: Frontend Questions (NICE_TO_HAVE)

These questions are relevant when the system includes a frontend:

```markdown
### Q9: Frontend Framework
**Priority:** NICE_TO_HAVE
**Options:** A) React + Next.js | B) Vue + Nuxt | C) Angular | D) None (API only)
**Default assumption:** D (None — API only)

### Q10: Frontend Testing
**Priority:** NICE_TO_HAVE
**Options:** A) Vitest + Testing Library + Playwright | B) Jest + Cypress | C) Jest + Testing Library
**Default assumption:** A (Vitest + Testing Library + Playwright)

### Q11: Component Documentation
**Priority:** NICE_TO_HAVE
**Options:** A) Storybook | B) None
**Default assumption:** B (None)

### Q12: CSS Strategy
**Priority:** NICE_TO_HAVE
**Options:** A) Tailwind CSS | B) CSS Modules | C) Styled Components | D) Vanilla CSS
**Default assumption:** A (Tailwind CSS)

### Q13: Component Library
**Priority:** NICE_TO_HAVE
**Options:** A) shadcn/ui | B) MUI | C) Ant Design | D) Custom
**Default assumption:** A (shadcn/ui)

### Q14: Visual Style
**Priority:** NICE_TO_HAVE
**Options:** A) Minimal/Modern | B) Corporate | C) Playful | D) Custom (provide reference)
**Default assumption:** A (Minimal/Modern)
```

---

## The Assessment File Format

Every assessment is a Markdown file stored in the knowledge base at `knowledge-base/assessments/`. The file follows a strict template so the orchestrator can parse answers programmatically.

```markdown
# Assessment: [Phase Name]

## Status: PENDING | IN_PROGRESS | COMPLETED

## Summary
[Auto-generated summary of what this assessment covers and why it matters]

## Context
- Bounded Contexts identified: [N]
- Domain Events discovered: [M]
- Aggregates defined: [K]
- Estimated complexity: [LOW | MEDIUM | HIGH]

---

## Questions

### Q1: [Question Title]
**Priority:** BLOCKER | IMPORTANT | NICE_TO_HAVE
**Context:** [Why this question matters, informed by upstream artifacts]

**AI Recommendation:** [Option X] because [reasoning from Phase 1 outputs]

**Options:**
- **A) [Option]** — [Description and implications]
- **B) [Option]** — [Description and implications]
- **C) [Option]** — [Description and implications]

**Default assumption:** [X]
**Your answer:** ___

[... repeat for each question ...]

---

## Assumptions Log

| # | Assumption | Source | Overridden? | New Value |
|---|---|---|---|---|
| 1 | [assumption text] | [AI analysis / default] | [ ] | |
| 2 | [assumption text] | [AI analysis / default] | [ ] | |

---

## Notes
[Free-form space for the human to add context, constraints, or reasoning]
```

### Key Structural Elements

- **Status field**: The orchestrator checks this field. `PENDING` means the gate is active. `COMPLETED` means the human has finished. The pipeline will not resume until the status changes.
- **AI Recommendation**: Every question includes the AI's recommendation with reasoning derived from Phase 1 outputs (event count, BC count, complexity signals). This is not a guess — it is informed analysis.
- **Default assumption**: If the human doesn't answer an IMPORTANT or NICE_TO_HAVE question, the pipeline uses this value and logs it in the Assumptions Log.
- **Assumptions Log**: A permanent record of what was assumed vs. what was explicitly decided. This is essential for future audits ("Why did we choose PostgreSQL?" — "It was the default assumption, never overridden. See assessment-8.md, Q4.").

---

## Post-Assessment Flow

Once the human fills in answers and sets `Status: COMPLETED`, the pipeline executes a three-step resume:

```
1. Parse Answers
   ┌──────────────────────────────┐
   │ Orchestrator reads the       │
   │ assessment file, extracts    │
   │ answers, validates BLOCKERs  │
   │ are all answered.            │
   └──────────────┬───────────────┘
                  │
2. Update Artifacts
   ┌──────────────▼───────────────┐
   │ Decision answers flow into:  │
   │ - architecture-decisions.md  │
   │ - infrastructure-config.md   │
   │ - tech-stack.md              │
   │ - ADRs (one per major        │
   │   decision)                  │
   └──────────────┬───────────────┘
                  │
3. Resume Pipeline
   ┌──────────────▼───────────────┐
   │ Next phase begins with full  │
   │ knowledge of human decisions │
   │ baked into its constraints.  │
   └──────────────────────────────┘
```

If any BLOCKER question is left unanswered, the orchestrator rejects the assessment and sets the status back to `PENDING` with a message indicating which questions need answers.

---

## Design Philosophy

### Assessments as Permanent Record

Assessment files are not throwaway forms. They are **permanent artifacts** that live alongside the code in the knowledge base. Six months from now, when someone asks "Why are we on ECS Fargate instead of EKS?", the answer is in `assessment-2.md`, Q5d, with the AI's recommendation, the human's choice, and the reasoning.

This is a significant advantage over verbal decisions or Slack messages that get buried. Every architecture decision has a traceable origin.

### AI Recommendations Are Informed, Not Random

The AI doesn't just present options — it recommends one. The recommendation is based on upstream Phase 1 outputs:

- **Event count**: Systems with 50+ events and 5+ BCs tend toward microservices
- **BC count**: 2-3 BCs naturally fit a modular monolith; 6+ BCs push toward microservices
- **Complexity signals**: Complex domain logic (many invariants, state machines) suggests starting simple with a modulith
- **Team size**: Single team almost always means modular monolith

The recommendation is clearly labeled as such. The human can override it without friction. But having an informed starting point dramatically reduces decision fatigue.

### Options Include Trade-Off Analysis

Every option comes with implications, not just a label. "Microservices" is not just a bullet point — it includes "independent deployables, message broker communication, database-per-service, higher operational complexity." This ensures the human makes an informed choice, even if they are not deeply familiar with every option.

### Defaults Are Safe Defaults

Default assumptions are chosen conservatively:

- **Modular Monolith** over Microservices (simpler to start)
- **Single team** over Multiple teams (lower coordination cost)
- **Mono-repo** over Multi-repo (atomic refactoring)
- **PostgreSQL** over DynamoDB (general-purpose, well-understood)
- **ECS Fargate** over EKS (managed, no node management)

The philosophy is: if you skip a question, you get the boring, proven, low-risk choice. You can always change it later; you can't easily un-choose a premature microservices architecture.

---

## Summary

Assessment gates are the mechanism that keeps humans in control of architecture decisions while letting AI handle the mechanical work. They follow three principles:

1. **Pause, don't guess** — When the decision matters, stop and ask
2. **Inform, don't dictate** — Present recommendations with reasoning and trade-offs
3. **Record, don't forget** — Every answer becomes a permanent, traceable artifact

The result is a pipeline where AI does the heavy lifting of analysis and code generation, but humans retain authority over the decisions that shape the system's future.

---

[← Previous: The Knowledge Base](./14-the-knowledge-base.md) | [Table of Contents](./README.md) | [Next: Walkthrough — The Coffeeshop →](./16-walkthrough-coffeeshop.md)
