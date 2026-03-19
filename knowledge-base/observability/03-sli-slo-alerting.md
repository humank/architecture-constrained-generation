# SLI, SLO, SLA, and Alerting Strategies

## Definitions

**SLI (Service Level Indicator)** — Quantitative measure of service behavior from the user's perspective.
Examples: request latency P99, error rate, throughput, availability ratio.

**SLO (Service Level Objective)** — Target value or range for an SLI over a time window.
Example: "P99 latency < 200ms for 99.9% of requests measured over 28 days."

**SLA (Service Level Agreement)** — Business contract with consequences when SLOs are missed.
Consequences: refunds, credits, contract termination. SLAs are **looser** than internal SLOs — always keep a buffer.

**Error Budget** — The amount of unreliability your SLO permits: `100% - SLO`.

| SLO | Error Budget | Downtime/year | Downtime/month |
|---|---|---|---|
| 99% | 1% | 3.65 days | 7.3 hours |
| 99.9% | 0.1% | 8.76 hours | 43.8 min |
| 99.95% | 0.05% | 4.38 hours | 21.9 min |
| 99.99% | 0.01% | 52.6 min | 4.38 min |
| 99.999% | 0.001% | 5.26 min | 26.3 sec |

---

## Choosing SLIs

### By Service Type

| Service Type | Key SLIs |
|---|---|
| **User-facing request** | Availability, latency (P50/P95/P99), throughput, error rate |
| **Storage system** | Durability, throughput, time-to-first-byte latency |
| **Data pipeline** | Freshness (age of newest processed record), correctness, coverage (% of input processed) |
| **Batch/scheduled job** | Completion rate, runtime duration, data quality |

### By Framework

- **RED** (request-driven): **R**ate, **E**rrors, **D**uration — for microservices
- **USE** (resource): **U**tilization, **S**aturation, **E**rrors — for infrastructure
- **Business/domain-specific**: Checkout completion rate, search relevance score, payment success rate

### Good SLI Properties

1. **Directly measures user experience** — latency at the load balancer, not at the app server
2. **Simple to understand** — one number, clear meaning
3. **Aggregatable** — can combine across instances/regions
4. **Sensitive to meaningful changes** — moves when users are affected, stable when they aren't
5. **Measurable at the edge** — prefer client-side or load balancer metrics over server-side

### SLI Specification vs. Implementation

- **Specification**: "The proportion of valid requests served successfully" (what you measure)
- **Implementation**: "Count of HTTP 200-299 responses / count of all HTTP responses at the ALB" (how you measure it)

---

## Setting SLOs

### Process

1. **Measure first** — Collect 2-4 weeks of baseline data before setting targets
2. **Start with current performance** — Set SLO slightly below observed performance
3. **Consider user expectations** — What latency makes users abandon? What error rate causes complaints?
4. **Align with business requirements** — Revenue impact, competitive landscape, user tier
5. **Differentiate by segment** — Different SLOs for paid vs. free, API vs. UI, critical vs. non-critical paths
6. **Review quarterly** — Tighten as reliability improves, relax if over-investing

### SLO Anatomy

```
[SLI metric] [comparison] [threshold] for [target %] of [requests/time]
measured over [window]

Example:
  P99 latency < 500ms for 99.9% of login requests
  measured over a rolling 28-day window
```

### Common Mistakes

- **Too many SLOs** — 1-3 per service; focus on what users care about
- **100% target** — Impossible and counterproductive; leaves zero room for change
- **Server-side only** — Misses network latency, DNS, CDN issues
- **No error budget policy** — SLO without consequences is just a dashboard
- **Set and forget** — Requirements change; review regularly

---

## Error Budgets

### How It Works

Error budget = allowed unreliability over the SLO window.
99.9% SLO over 28 days = 0.1% error budget = **40.3 minutes** of total downtime equivalent.

### Error Budget Policy

Agreed-upon actions based on remaining budget:

| Budget Remaining | Actions |
|---|---|
| **> 50%** | Deploy freely, experiment, take risks, run chaos experiments |
| **25-50%** | Normal development pace, monitor closely |
| **5-25%** | Slow down deployments, increase testing rigor |
| **< 5%** | Feature freeze; all engineering effort on reliability |
| **Exhausted** | Full stop on features; postmortem required; remediation only |

### Why Error Budgets Work

- **Shared incentive** — Product and engineering agree on the policy upfront
- **Data-driven decisions** — "Should we ship this risky feature?" Check the budget.
- **Healthy tension** — Product wants features (spend budget), SRE wants reliability (save budget)
- **Connection to XP**: Error budget status informs the **Planning Game** — when budget is low, reliability stories get priority over feature stories

---

## Alerting Strategies

### Symptom-Based vs. Cause-Based

| Type | Example | When to Use |
|---|---|---|
| **Symptom-based** (preferred) | Error rate > 1%, P99 latency > 2s | Primary alerts — what users experience |
| **Cause-based** (secondary) | CPU > 90%, disk > 85%, certificate expiring | Leading indicators — predict symptoms |

**Rule**: Page on symptoms. Create tickets for causes. Never page on causes unless they will certainly become symptoms soon (disk filling up).

### Multi-Window, Multi-Burn-Rate Alerting

The Google SRE approach to SLO-based alerting. Avoids both alert fatigue and missed incidents.

**Burn rate** = rate of error budget consumption relative to the SLO window.
A burn rate of 1 means you will exactly exhaust your budget at the window end.
A burn rate of 10 means you will exhaust your budget in 1/10th of the window.

| Severity | Burn Rate | Long Window | Short Window | Action |
|---|---|---|---|---|
| **Page (SEV1/2)** | 14.4x | 1 hour | 5 min | Page on-call immediately |
| **Page (SEV1/2)** | 6x | 6 hours | 30 min | Page on-call |
| **Ticket (SEV3)** | 3x | 1 day | 2 hours | Create ticket, fix in business hours |
| **Ticket (SEV4)** | 1x | 3 days | 6 hours | Low priority ticket |

**Why two windows?** The long window detects sustained issues. The short window confirms the issue is still happening (auto-resolves if it was a brief spike).

### Alert Hygiene

- **Every alert must be actionable** — if the receiver can't do anything, delete the alert
- **Alert fatigue kills** — too many alerts = all alerts ignored. Ruthlessly prune.
- **Measure alert quality** — track: pages per week, false positive rate, time-to-acknowledge, time-to-resolve
- **Target**: < 2 pages per on-call shift that wake someone up
- **Review monthly** — delete alerts nobody acted on; tune thresholds that fire too often

---

## Incident Response

### Severity Levels

| Level | Criteria | Response Time | Example |
|---|---|---|---|
| **SEV1** | Service down, data loss, security breach | 15 min | Complete outage, data corruption |
| **SEV2** | Major degradation, significant user impact | 30 min | 50% error rate, core feature broken |
| **SEV3** | Minor degradation, workaround exists | 4 hours | Slow responses, non-critical feature down |
| **SEV4** | Cosmetic, minimal impact | Next business day | Dashboard broken, minor UI glitch |

### Roles During Incident

- **Incident Commander (IC)** — Owns the incident. Coordinates response, makes decisions, delegates.
- **Communications Lead** — Updates status page, stakeholders, customers. Uses templates.
- **Operations Lead** — Hands on keyboard. Executes diagnostic and remediation steps.
- **Subject Matter Experts** — Called in by IC as needed.

### Incident Lifecycle

```
Detection → Triage (assign severity) → Assemble team → Investigate →
Mitigate (restore service) → Resolve (fix root cause) → Post-mortem
```

**Priority order**: Mitigate first, diagnose second. Restore service before understanding why it broke.

### Communication Template

```
[Status: Investigating | Identified | Monitoring | Resolved]
Impact: [What users experience]
Current status: [What we know, what we're doing]
Next update: [Time]
```

### Blameless Post-Mortem

Every SEV1/SEV2 gets a post-mortem within 5 business days.

**Structure**:

1. **Summary** — What happened, duration, impact (users affected, revenue lost)
2. **Timeline** — Minute-by-minute: detection, actions, resolution
3. **Contributing factors** — NOT "root cause" (complex systems have multiple contributing factors)
4. **What went well** — Detection speed, team response, tooling that helped
5. **What could be improved** — Gaps in monitoring, slow escalation, missing runbooks
6. **Action items** — Each item has an owner and due date. Track to completion.

**Rules**: No blame. Focus on systems and processes, not people. "How did the system allow this?" not "Who did this?"

**Connection to AWS WAF Operational Excellence**: Anticipate failure, learn from all operational events, refine procedures.

---

## Runbooks and Playbooks

### Runbook

Step-by-step procedure for **routine operations**. Prescriptive — follow exactly.

```
Runbook: Restart Payment Service
1. Verify health check status: GET /health → expect 503
2. Check recent deployments: list deploys in last 2 hours
3. Check dependent services: database connectivity, message queue
4. Restart service: aws ecs update-service --force-new-deployment
5. Monitor: watch health check for 5 min, verify error rate < 0.1%
6. If still unhealthy: escalate to SEV2, page payment team lead
```

### Playbook

Diagnostic guide for **investigating alerts**. Decision-tree structure.

```
Playbook: High Latency Alert (P99 > 2s)
├── Check: Is it all endpoints or specific ones?
│   ├── All endpoints → Check database (query latency, connections)
│   │   ├── DB slow → Check slow query log, connection pool exhaustion
│   │   └── DB fine → Check downstream services (circuit breaker state)
│   └── Specific endpoint → Check recent deployments to that service
│       ├── Recent deploy → Canary metrics, consider rollback
│       └── No deploy → Check input patterns (traffic spike? large payloads?)
└── Escalate if unresolved after 30 min
```

### Best Practices

- **Link alerts to runbooks/playbooks** — Every alert includes a URL to the relevant doc
- **Keep them updated** — Stale runbooks are worse than no runbooks (false confidence)
- **Automate progressively** — Manual runbook first, then script steps, then full automation
- **Test during game days** — Validate that runbooks actually work under pressure
- **AWS Systems Manager Automation** — Convert runbooks to SSM Automation documents for one-click execution

---

## AWS Implementation

### Monitoring and SLO Tracking

| Service | Purpose |
|---|---|
| **CloudWatch Metrics** | Collect SLI data (latency, errors, request count) |
| **CloudWatch Alarms** | Threshold-based alerting on metrics |
| **CloudWatch Composite Alarms** | Combine multiple alarms with AND/OR logic (reduce noise) |
| **CloudWatch Application Signals** | SLO monitoring with burn-rate alerting (auto-discovers services) |
| **CloudWatch Synthetics** | Canary scripts that probe endpoints on a schedule |
| **CloudWatch RUM** | Real user monitoring — client-side SLI collection |
| **X-Ray / CloudWatch ServiceLens** | Distributed tracing for latency SLI decomposition |

### Alert Routing

```
CloudWatch Alarm → SNS Topic → Lambda (enrichment/routing)
                             → PagerDuty/Opsgenie (paging)
                             → Slack/Teams (notification)
                             → SQS (audit trail)

EventBridge Rule → Step Functions (automated remediation)
                → Lambda (custom routing logic)
```

### Chaos Engineering

- **AWS Fault Injection Service (FIS)** — Inject faults: stop instances, throttle APIs, inject latency, AZ outage simulation
- **Game days** — Scheduled chaos experiments to validate runbooks, SLOs, and alerting
- **Steady state hypothesis**: Define expected SLI values, inject fault, verify SLOs hold

### CloudWatch Alarm Configuration (SLO-Based)

```json
{
  "MetricName": "5XXError",
  "Namespace": "AWS/ApplicationELB",
  "Statistic": "Average",
  "Period": 300,
  "EvaluationPeriods": 3,
  "Threshold": 0.001,
  "ComparisonOperator": "GreaterThanThreshold",
  "TreatMissingData": "notBreaching"
}
```

**Composite alarm** for multi-signal alerting:

```
ALARM("HighErrorRate") AND ALARM("HighLatency")
→ Triggers only when both conditions are true (reduces false positives)
```

---

## Connection to Methodologies

### R&W Software Systems Architecture

- **Availability & Resilience Perspective** — SLOs quantify availability requirements as measurable quality attribute scenarios
- **Performance Perspective** — Latency SLIs formalize performance requirements; P99 targets become architecture constraints

### AWS Well-Architected Framework

- **Operational Excellence** — Runbooks, playbooks, game days, learn-from-events are direct WAF practices
- **Reliability** — Recovery objectives (RTO/RPO) connect to availability SLOs; error budgets quantify acceptable risk

### BDD

- SLOs become **non-functional acceptance criteria**: `Given the system is under normal load, When 1000 concurrent users hit /checkout, Then P99 latency should be < 500ms`
- SLO violations generate scenarios for the next iteration

### Continuous Delivery

- SLO monitoring enables **safe canary deployments** — promote canary only if SLIs stay within SLO
- Error budget status gates deployment: budget exhausted = deployment pipeline blocks
- **Auto-rollback**: if canary violates SLO thresholds, roll back automatically

### XP

- Error budget informs **Planning Game** priorities: low budget = reliability stories first
- **Sustainable pace** for on-call: alert quality metrics track team health

### DDD / Domain Events

- Business SLIs derived from **domain event rates**: OrderPlaced/hour, PaymentProcessed success rate
- Domain events in Event Storming surface what to measure

### Event Modeling

- Expected system behavior **timelines** inform SLI selection — each command/read model has expected latency
- Slice-level SLOs: each vertical slice gets its own performance target

### Architecture Review

- SLOs are **quality attribute scenarios**: stimulus (user request), response measure (latency < 200ms), environment (normal load)
- SLO targets constrain architecture decisions: 99.99% availability may require multi-region active-active
