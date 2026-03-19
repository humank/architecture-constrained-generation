# Resilience Patterns for Distributed Systems

## Why Resilience Matters

In distributed systems, partial failure is **normal**, not exceptional. Networks partition, services
crash, dependencies slow down, disks fill up. Design **for** failure, not against it.

Key mindset shifts:

- **Everything fails, all the time** (Werner Vogels) — assume every call can fail
- **Graceful degradation over perfect uptime** — serve stale data rather than no data
- **Blast radius minimization** — contain failures so they don't cascade
- **Recovery-oriented computing** — optimize MTTR (Mean Time to Recovery), not just MTBF (Mean Time Between Failures)

A system without resilience patterns will experience **cascading failure**: one slow dependency
blocks threads, which blocks callers, which brings down the entire system.

---

## Circuit Breaker

Prevents repeated calls to a failing dependency. Lets the dependency recover instead of
overwhelming it with doomed requests.

### State Machine

```
CLOSED ──(failure threshold reached)──→ OPEN
  ↑                                       │
  │                              (timeout expires)
  │                                       ↓
  └──(trial calls succeed)──── HALF-OPEN
                                  │
                          (trial calls fail)
                                  │
                                  └──→ OPEN
```

### Configuration Thresholds

| Parameter | Description | Typical Value |
|---|---|---|
| **Failure count/rate** | Trips the breaker | 5 failures or 50% failure rate in 60s window |
| **Open duration** | Time before trying again | 30–60 seconds |
| **Half-open trial count** | Requests allowed to test recovery | 1–3 requests |
| **Sliding window type** | Count-based or time-based | Time-based (60s) for most services |
| **Slow call threshold** | Calls exceeding duration count as failures | 2–5 seconds |

### What to Do When Open

1. **Fallback response** — cached data, default value, empty collection
2. **Degraded service** — serve partial results, disable non-essential features
3. **Fail fast** — return error immediately (HTTP 503) with `Retry-After` header
4. **Queue for later** — write to dead letter queue for async retry
5. **Redirect** — route to alternative service instance or region

### Implementation

- **Resilience4j** (Java) — lightweight, functional, designed for Java 8+/lambdas
- **Polly** (.NET) — policy-based, composable with retry/timeout/bulkhead
- **Hystrix** (Java) — Netflix, now in maintenance mode; migrate to Resilience4j
- **cockatiel** (Node.js) — Polly-inspired for TypeScript/JavaScript
- **Custom** — state machine with atomic counters; useful when libraries add unwanted overhead

### AWS Context

No built-in circuit breaker service. Options:

- **Application-level**: Resilience4j/Polly in your service code
- **App Mesh**: Envoy sidecar with outlier detection (ejects unhealthy endpoints)
- **Lambda**: Circuit breaker state in DynamoDB or ElastiCache (shared across invocations)
- **Step Functions**: Choice state checking health before calling downstream

---

## Bulkhead

Isolates failures by partitioning resources. Named after ship bulkheads that prevent a single
hull breach from sinking the entire vessel.

### Isolation Strategies

**Thread Pool Isolation**
- Separate thread pool per dependency
- Failure in one pool cannot consume threads from another
- Overhead: thread context switching; use for I/O-heavy calls
- Resilience4j `ThreadPoolBulkhead`, Hystrix thread pool

**Semaphore Isolation**
- Limit concurrent calls using a semaphore (counter)
- Lighter weight than thread pools — no thread switching overhead
- Use for fast, in-process calls or when thread pool overhead is unacceptable
- Resilience4j `Bulkhead` (semaphore-based by default)

**Connection Pool Isolation**
- Separate database/HTTP connection pools per dependency
- Prevents one slow dependency from exhausting shared connections
- HikariCP per-datasource pools, Apache HttpClient per-target pools

### AWS Implementation

- **Lambda**: Separate functions per dependency, each with its own concurrency limit
- **ECS**: Task-level isolation — separate task definitions per service, resource limits per container
- **API Gateway**: Usage plans with per-client throttling
- **VPC subnets**: Network-level isolation per tier (public, private, data)

### Connection to DDD

Bulkhead boundaries align with **Bounded Contexts**. Each context owns its resources:
- Own database (Database per Service)
- Own connection pools
- Own thread pools / concurrency limits
- ACL at the boundary includes bulkhead configuration

---

## Retry with Backoff

Handles transient failures by repeating the request. Without backoff, retries can amplify
failures and create **retry storms**.

### Backoff Strategies

| Strategy | Formula | Use When |
|---|---|---|
| **Fixed delay** | `wait = constant` | Simple cases, known recovery time |
| **Exponential backoff** | `wait = base * 2^attempt` | Default choice for most services |
| **Exponential + jitter** | `wait = random(0, base * 2^attempt)` | **Best practice** — decorrelates retries across clients |
| **Decorrelated jitter** | `wait = random(base, prev_wait * 3)` | AWS SDK default; better spread than full jitter |

### Configuration

- **Max retries**: 2–4 for synchronous calls; more for async/batch
- **Retry budget**: Cap retries at % of total calls (e.g., 20%) — prevents retry storms
- **Max backoff**: Cap wait time (e.g., 30s) to avoid unbounded delays
- **Retryable errors**: 429, 500, 502, 503, 504, connection timeout, socket reset
- **Non-retryable**: 400, 401, 403, 404, 409 (client errors won't succeed on retry)

### Idempotency Requirement

**Only retry idempotent operations** — or make non-idempotent operations safe with:

- **Idempotency keys**: Client-generated UUID sent with each request; server deduplicates
- **Conditional requests**: `If-Match` / `If-None-Match` with ETags
- **At-least-once + deduplication**: Accept duplicates, deduplicate on consumer side

```
POST /payments
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

Server stores result keyed by idempotency key. Replay returns stored result.

### AWS Implementation

- **SQS**: Visibility timeout acts as retry delay; configure `maxReceiveCount` then route to DLQ
- **Step Functions**: `Retry` field with `IntervalSeconds`, `BackoffRate`, `MaxAttempts`
- **SDK built-in**: All AWS SDKs retry with exponential backoff + jitter by default
- **EventBridge**: Retry policy on targets (max age, max attempts)
- **Lambda destinations**: On-failure destination for async invocations

---

## Timeout

Prevents indefinite waiting. Without timeouts, slow dependencies consume resources and cascade
failures upstream.

### Timeout Types

| Type | What It Controls | Typical Value |
|---|---|---|
| **Connection timeout** | Time to establish TCP connection | 1–5 seconds |
| **Read/socket timeout** | Time waiting for response data | 5–30 seconds |
| **Request timeout** | Total time for entire request (connect + send + receive) | 10–60 seconds |

### Cascading Timeout Budget

Each service in a call chain must have a **shorter** timeout than its caller.

```
Client (10s) → API Gateway (9s) → Service A (7s) → Service B (5s) → Database (3s)
```

**Rule**: Caller timeout > callee timeout + processing overhead. Otherwise, the caller times out
while the callee is still working (wasting resources).

Pass remaining budget via header: `X-Request-Timeout-Ms: 7000`

### AWS Limits

| Service | Timeout | Configurable? |
|---|---|---|
| **API Gateway (REST)** | 29 seconds max | Yes (50ms–29s) |
| **API Gateway (HTTP)** | 30 seconds max | Yes |
| **API Gateway (WebSocket)** | 10 minutes idle | Yes |
| **Lambda** | 15 minutes max | Yes (1s–15m) |
| **ALB** | 60 seconds default | Yes (1–4000s) |
| **NLB** | 350 seconds idle | Yes |
| **Step Functions** | 1 year per execution | Yes |
| **SQS visibility timeout** | 12 hours max | Yes |

**Design implication**: If your workflow exceeds 29s, you cannot use synchronous API Gateway.
Use async patterns: Step Functions, SQS, or WebSocket with callback.

---

## Fallback

Provides alternative behavior when the primary path fails. The goal is **something useful**
rather than an error.

### Fallback Strategies

| Strategy | Example | Trade-off |
|---|---|---|
| **Cached data** | Return last-known product catalog | Stale data risk |
| **Default values** | Return default recommendations | Generic experience |
| **Degraded functionality** | Show page without personalization | Reduced value |
| **Static response** | Pre-generated error page from CDN | No dynamic content |
| **Alternative service** | Route to backup provider | Higher cost |

### Graceful Degradation vs Hard Failure

**Graceful degradation**: System continues operating with reduced functionality.
- Recommendation engine down → show popular items
- Search service down → show category browsing
- Payment service down → accept order, process payment later (if business allows)

**Hard failure**: System returns error, user cannot proceed.
- Reserve hard failure for core functionality that cannot be approximated
- Always provide clear error messages and retry guidance

### Feature Flags for Load Shedding

Disable non-essential features under load:

```
if (featureFlags.isEnabled("personalization") && !systemUnderPressure()) {
    return personalizedResults();
}
return defaultResults();  // fallback
```

Categories:
- **Essential**: Authentication, core transaction, data integrity — never shed
- **Important**: Search, notifications — shed under extreme load
- **Nice-to-have**: Personalization, analytics, recommendations — shed first

---

## Rate Limiting / Throttling

Controls request flow to protect services from overload. Applied at both client and server side.

### Algorithms

| Algorithm | How It Works | Pros | Cons |
|---|---|---|---|
| **Token bucket** | Tokens added at fixed rate; each request consumes one | Allows bursts up to bucket size | Burst can still overwhelm |
| **Sliding window** | Count requests in rolling time window | Smooth, no boundary spikes | More memory (per-timestamp tracking) |
| **Fixed window** | Count requests in fixed intervals | Simple, low memory | Boundary spike (2x at window edge) |
| **Leaky bucket** | Requests queued, processed at fixed rate | Smooth output rate | Latency for queued requests |

### Client-Side vs Server-Side

**Server-side** (protect the service):
- Return `429 Too Many Requests` with `Retry-After` header
- Apply per-client, per-API key, per-IP, or global limits
- Use for protecting shared resources

**Client-side** (be a good citizen):
- Respect `Retry-After` headers
- Implement local rate limiter to avoid hammering dependencies
- Back off on 429s with exponential delay

### AWS Implementation

- **API Gateway**: Throttling per stage, per method, per usage plan, per API key
  - Default: 10,000 RPS account-level, 5,000 RPS per-route
- **WAF rate rules**: Rate-based rules (100–2B requests per 5-min window) per IP
- **Lambda concurrency**: Reserved concurrency per function (bulkhead); provisioned concurrency for consistent performance
- **CloudFront**: Origin request limits, origin shield
- **AppSync**: Default and per-resolver throttling

---

## Health Checks

Enable load balancers and orchestrators to route traffic only to healthy instances.

### Check Types

| Type | Question | Example |
|---|---|---|
| **Liveness** | Is the process running? | HTTP 200 from `/health/live` |
| **Readiness** | Can it handle traffic? | `/health/ready` checks DB connection, cache warm |
| **Startup** | Has it finished initializing? | `/health/startup` — prevents premature traffic |

### Shallow vs Deep

**Shallow** (liveness): Process responds to HTTP. Fast, no dependency checks.
```
GET /health → 200 OK
```

**Deep** (readiness): Checks downstream dependencies. Slower, can cascade.
```
GET /health/ready → {
  "status": "UP",
  "database": "UP",
  "cache": "UP",
  "messageQueue": "DOWN"  → overall status: DEGRADED
}
```

**Rule**: Liveness checks should be shallow. If a deep check fails, the orchestrator restarts the
container — but the container is fine; the dependency is down. Use readiness checks for dependency health.

### AWS Implementation

- **ALB/NLB**: Health check path, interval (5–300s), threshold (2–10), timeout
- **Route 53**: HTTP, HTTPS, TCP health checks; failover routing based on health
- **ECS**: Container health check command, task health integrated with ALB
- **EKS**: Kubernetes liveness/readiness/startup probes → container lifecycle
- **Auto Scaling**: Replace unhealthy instances; ELB health check integration

---

## Chaos Engineering

Proactively inject failures to build confidence in system resilience. Fix weaknesses **before**
they cause outages.

### Principles

1. **Define steady state** — Establish measurable baseline (latency, error rate, throughput)
2. **Hypothesize** — "If X fails, the system will gracefully degrade to Y"
3. **Vary real-world events** — Simulate realistic failures (not contrived scenarios)
4. **Run in production** — Staging environments lack real traffic patterns and data
5. **Automate continuously** — Chaos tests in CI/CD, not just ad-hoc
6. **Minimize blast radius** — Start small, expand scope as confidence grows

### Experiment Types

- **Resource exhaustion**: CPU, memory, disk, file descriptors
- **Network**: Latency injection, packet loss, DNS failure, partition
- **Dependency**: Kill downstream services, slow responses, error responses
- **State**: Corrupt data, clock skew, certificate expiration
- **Infrastructure**: AZ failure, instance termination, scaling events

### AWS Fault Injection Service (FIS)

- Managed chaos engineering service
- Pre-built actions: stop EC2, throttle API, inject latency, failover RDS, disrupt AZ
- Experiment templates: define targets, actions, stop conditions
- Safety: stop conditions auto-halt experiments when guardrails are breached
- Integrations: EC2, ECS, EKS, RDS, SSM

### Game Days

Scheduled exercises simulating real failure scenarios. Connection to **AWS WAF Operational Excellence**:
- Test runbooks and playbooks under simulated pressure
- Validate monitoring and alerting
- Practice incident response procedures
- Document lessons learned → feed back into architecture

### Tools

- **AWS FIS**: Native AWS, managed, integrated with AWS services
- **Chaos Monkey** (Netflix): Random instance termination
- **Litmus** (CNCF): Kubernetes-native chaos engineering
- **Gremlin**: SaaS chaos platform, wide attack surface
- **Toxiproxy** (Shopify): Network-level fault injection for testing

---

## Methodology Connections

### DDD: Anti-Corruption Layer (ACL)

The ACL is the natural location for resilience patterns:

```
Your Bounded Context
  └─ ACL
       ├─ Circuit Breaker (protect from upstream failure)
       ├─ Fallback (return cached/default when upstream is down)
       ├─ Retry + Backoff (handle transient failures)
       ├─ Timeout (prevent indefinite blocking)
       └─ Translation (map external model to internal model)
```

Every integration with an external system or another bounded context should pass through an ACL
with resilience built in. The ACL prevents both model corruption **and** failure propagation.

### Event Modeling: Translation Pattern

The Translation pattern in Event Modeling handles external system integration:
- External system calls include circuit breaker + retry
- Failed translations produce error events (not exceptions)
- Compensating actions triggered by failure events
- Async by default — resilience is inherent in the decoupled design

### AWS Well-Architected Framework: Reliability Pillar

- **Fault isolation**: Cell-based architecture, shuffle sharding, bulkheads
- **Auto-recovery**: Health checks → Auto Scaling replacement; multi-AZ failover
- **Disaster recovery**: Backup & restore, pilot light, warm standby, multi-site active-active
- **Dependency management**: Identify and classify all dependencies; apply resilience per dependency

### Rozanski & Woods: Availability and Resilience Perspective

- **Availability scenarios**: Define target (e.g., 99.95%) per component
- **Failure modes**: Enumerate and document failure modes for each component
- **Recovery mechanisms**: Specify how system recovers from each failure mode
- **Resilience models**: Active-passive, active-active, N+1 redundancy
- **Perspective applies across viewpoints**: Functional (fallbacks), Deployment (multi-AZ), Operational (monitoring)

### Architecture Review

Resilience scenarios as **quality attribute tests**:

```
Scenario: Database becomes unreachable
  Given: Normal operation with 1000 RPS
  When: Primary database fails
  Then: System fails over to replica within 30s
  And: No requests return 500 during failover
  And: Read traffic continues from replica
  And: Write traffic queues and replays after recovery
```

Include resilience scenarios in Architecture Decision Records (ADRs) as decision drivers.

### Continuous Delivery

Chaos tests belong in the deployment pipeline:

- **Commit stage**: Unit tests with failure injection (mock timeouts, errors)
- **Acceptance stage**: Integration tests with Toxiproxy/WireMock fault injection
- **Capacity stage**: Load tests combined with chaos (kill instances under load)
- **Production**: Continuous chaos experiments (FIS, Chaos Monkey) in canary deployments

### BDD: Failure Scenarios as Acceptance Criteria

Every user-facing feature should have failure scenarios:

```gherkin
Feature: Product Search

  Scenario: Search returns results
    Given the search service is healthy
    When I search for "laptop"
    Then I see matching products

  Scenario: Search service is unavailable
    Given the search service is down
    When I search for "laptop"
    Then I see popular products as fallback
    And I see a message "Showing popular products — search is temporarily unavailable"

  Scenario: Search service is slow
    Given the search service response time exceeds 3 seconds
    When I search for "laptop"
    Then the request times out after 3 seconds
    And I see cached search results
```

Failure scenarios are **first-class acceptance criteria**, not edge cases handled later.

---

## Pattern Composition

Resilience patterns are most effective when **composed**:

```
Request
  → Rate Limiter (reject excess traffic)
    → Timeout (bound wait time)
      → Circuit Breaker (fail fast if dependency is down)
        → Retry + Backoff (handle transient errors)
          → Bulkhead (isolate resources)
            → Actual Call
              → Fallback (if all else fails)
```

**Order matters**: Rate limiting is outermost (cheapest rejection), retry is inside circuit breaker
(don't retry when circuit is open), bulkhead is innermost (protect resources for the actual call).

### Resilience4j Decoration Order

```java
Supplier<Response> decorated = Decorators.ofSupplier(supplier)
    .withRateLimiter(rateLimiter)
    .withTimeLimiter(timeLimiter)
    .withCircuitBreaker(circuitBreaker)
    .withRetry(retry)
    .withBulkhead(bulkhead)
    .withFallback(fallbackFunction)
    .decorate();
```

### Polly Policy Wrap (innermost applied first)

```csharp
var resilience = Policy.WrapAsync(
    fallbackPolicy,
    circuitBreakerPolicy,
    retryPolicy,
    timeoutPolicy,
    bulkheadPolicy
);
```
