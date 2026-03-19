# Chapter 9: Phase 5 — Delivery

> *"You build it, you run it."* — Werner Vogels
>
> Phase 5 ensures you can run it well — with pipelines, infrastructure, observability, and SLOs.

---

## From Design to Operations

Phase 5 produces the operational backbone:

1. **CI/CD Pipeline** — 7-stage deployment pipeline per BC
2. **Deployment Strategy** — Canary, Blue-Green, or Rolling per BC risk level
3. **Infrastructure as Code** — Executable CDK/Terraform (not stubs!)
4. **Observability** — Structured logging, RED metrics, distributed tracing
5. **SLI/SLO** — Error budgets, multi-burn-rate alerting
6. **Runbooks** — Playbooks for common operational scenarios

---

## The 7-Stage Pipeline

```
┌─────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐
│ Commit   │→│Integration│→│ Acceptance │→│ Visual   │→│ Contract │→│ Perf     │→│ Production│
│ (~10min) │  │  Tests   │  │   Tests   │  │Regression│  │  Tests  │  │  Tests   │  │  Deploy   │
│          │  │          │  │           │  │          │  │         │  │          │  │           │
│ compile  │  │ Testing  │  │ BDD/      │  │ Chromatic│  │ Pact    │  │Lighthouse│  │ Canary /  │
│ unit     │  │ Library  │  │ Gherkin   │  │ screen-  │  │ verify  │  │ CI + k6  │  │ Blue-Green│
│ lint     │  │ + MSW    │  │ Playwright│  │ shots    │  │ schema  │  │ load     │  │ Rolling   │
│ SAST/SCA │  │          │  │ CUJs only │  │          │  │ compat  │  │          │  │           │
│ a11y     │  │          │  │           │  │          │  │         │  │          │  │           │
└─────────┘  └──────────┘  └───────────┘  └─────────┘  └──────────┘  └──────────┘  └───────────┘
```

### Deployment Strategy per BC Risk Level

| BC Classification | Strategy | Rationale |
|---|---|---|
| **Core** | Canary deployment | Gradual traffic shift, auto-rollback on SLO violation |
| **Supporting** | Blue-Green | Fast rollback, lower risk tolerance needed |
| **Generic** | Rolling update | Simplest, acceptable for non-critical |

---

## Infrastructure as Code: Not Stubs, Real Code

Phase 5 generates a **complete, deployable** CDK project at `iac/` in the project root.

### Resource Mapping from Architecture Artifacts

Every IaC resource traces back to an architecture artifact:

| Architecture Artifact | IaC Resource |
|---|---|
| `bounded-contexts.yaml` → each BC | ECR repo + EKS Deployment + Service |
| `context-map.yaml` → event channels | SNS Topic per publishing BC |
| `context-map.yaml` → consumer relationships | SQS Queue per (topic × consumer) + DLQ |
| `bounded-contexts.yaml` → data store | RDS schema per BC |
| `frontend-architecture.yaml` | S3 bucket + CloudFront distribution |
| `threat-model.yaml` → encryption | KMS keys, S3/RDS/SQS encryption |
| `sli-slo.yaml` → alerting | CloudWatch alarms per SLO |

### CDK Project Structure

```
iac/
├── bin/app.ts                    # CDK app entry — region from assessment-2 Q5a
├── lib/
│   ├── network-stack.ts          # VPC, subnets, NAT (from assessment-2 Q5c)
│   ├── data-stack.ts             # RDS PostgreSQL, schema-per-BC
│   ├── messaging-stack.ts        # SNS topics + SQS queues (from context-map)
│   ├── compute-stack.ts          # EKS cluster (from assessment-2 Q5)
│   ├── frontend-stack.ts         # S3 + CloudFront + OAC
│   ├── observability-stack.ts    # ADOT, CloudWatch, X-Ray
│   └── iam-stack.ts              # Per-service least-privilege roles
├── config/
│   ├── staging.ts
│   └── production.ts
├── cdk.json
├── package.json
└── tsconfig.json
```

### Mandatory Pre-Generation Review 🔑

Before any IaC code is written, the orchestrator presents a resource summary:

```
| Stack            | AWS Resources                    | Est. Monthly Cost |
|------------------|----------------------------------|-------------------|
| NetworkStack     | VPC (3 AZ), NAT, ALB            | ~$35-70           |
| DataStack        | RDS PostgreSQL, 3 schemas        | ~$30-60           |
| MessagingStack   | 3 SNS topics, 6 SQS + 6 DLQs   | ~$5-10            |
| ComputeStack     | EKS cluster, 2 node groups       | ~$75-150          |
| FrontendStack    | S3 + CloudFront                  | ~$5-15            |
| ObservabilityStack| ADOT, CloudWatch, X-Ray         | ~$10-30           |
```

The user confirms before CDK code is generated.

---

## Observability: The Three Pillars

### Logs (Structured JSON)

```json
{
  "event": "OrderPlaced",
  "orderId": "ORD-001",
  "tableNumber": 3,
  "totalAmount": 240,
  "traceId": "4bf92f...736",
  "service": "ordering-service",
  "level": "INFO"
}
```

Domain events become business-meaningful log entries using Ubiquitous Language.

### Metrics (RED Method)

For every service: **R**ate, **E**rror rate, **D**uration. Plus business metrics derived from domain events (`orders_placed_per_minute`, `failed_payments_total`).

### Traces (Distributed)

```
Trace: abc-123
├── [Span] OrderController: POST /api/waiter/orders (50ms)
│   ├── [Span] OrderService: placeOrder (30ms)
│   │   └── [Span] OrderRepository: save (15ms)
│   └── [Span] EventPublisher: OrderPlaced (5ms)
│       └── [Span] PreparationService: onOrderSubmitted (200ms)
```

W3C Trace Context headers propagated across all service boundaries and message queues.

---

## SLI/SLO Definition

| Service | SLI | SLO Target | Error Budget |
|---|---|---|---|
| Ordering | Successful requests / total | 99.9% | 43.2 min/month |
| Ordering | P99 latency | < 2s | — |
| Preparation | Order completion rate | 99.5% | 3.6 hours/month |
| Inventory | Stock accuracy | 99.0% | 7.2 hours/month |

Multi-burn-rate alerting: fast burn (2%) triggers page, slow burn (5%) triggers ticket.

---

## Output Artifacts

```
.arch/05-delivery/
├── pipeline.yaml
├── deployment-strategy.yaml
├── observability/
│   ├── otel-config.yaml
│   ├── sli-slo.yaml
│   ├── dashboards.yaml
│   └── alerting.yaml
└── runbooks/
    ├── high-error-rate.md
    ├── high-latency.md
    └── dlq-messages.md

iac/                    # Executable CDK project (project root)
k8s/                    # Kubernetes manifests (if EKS)
```

---

[← Previous: Phase 4 — Specification](./08-phase-4-specification.md) | [Table of Contents](./README.md) | [Next: Phase 6 — Architecture Review →](./10-phase-6-review.md)
