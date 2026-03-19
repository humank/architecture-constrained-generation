# The Three Pillars of Observability

## Observability vs Monitoring

| Aspect | Monitoring | Observability |
|---|---|---|
| **Questions** | Predefined: "Is the server up?" "Is CPU > 80%?" | Open-ended: "Why is this user's request slow?" |
| **Approach** | Dashboards for **known** failure modes | Explore **unknown** failure modes from external outputs |
| **When it breaks** | Alerts fire for conditions you anticipated | You can investigate conditions you never anticipated |
| **Analogy** | Check engine light | Full diagnostic port |

**Observability** = the ability to understand a system's internal state by examining its external
outputs (logs, metrics, traces). Monitoring is a **subset** of observability — it answers the
questions you already know to ask. Observability lets you ask **new** questions without deploying
new code.

A system is observable when you can explain **any** anomalous behavior without SSH-ing into
a production box or adding new instrumentation after the fact.

---

## Pillar 1: Structured Logging

### Structured vs Unstructured

| Format | Example | Machine-Parseable | Filterable |
|---|---|---|---|
| **Unstructured** | `2024-01-15 ERROR Failed to process order 123` | No — regex required | Fragile |
| **Structured (JSON)** | `{"timestamp":"2024-01-15T10:30:00Z","level":"ERROR","message":"Failed to process order","orderId":"123","traceId":"abc"}` | Yes — native JSON parsing | Precise field queries |

**Always use structured logging.** Unstructured logs become unparseable at scale. Structured logs
enable `orderId = "123" AND level = "ERROR"` queries across millions of entries.

### Log Levels

| Level | When to Use | Example |
|---|---|---|
| **DEBUG** | Developer diagnostics. **Off in production** unless temporarily enabled | `Parsed request body in 2ms` |
| **INFO** | Business events, lifecycle milestones. Normal operations | `Order 123 placed by user 456` |
| **WARN** | Recoverable issues. Approaching limits. Deprecated usage | `Circuit breaker half-open for payment service` |
| **ERROR** | Operation failed. Requires attention. User impact likely | `Payment processing failed for order 123` |
| **FATAL** | System cannot continue. Process will exit | `Database connection pool exhausted — shutting down` |

**Rule of thumb**: if someone is paged, it should be ERROR or FATAL. If no action is needed, it is
INFO. If action might be needed soon, it is WARN.

### Contextual Fields

Every log entry should carry **correlation context** — fields that tie it to the broader request flow:

| Field | Purpose | Example |
|---|---|---|
| **requestId** | Unique ID for this HTTP request | `req-a1b2c3` |
| **correlationId** | Links related operations across async boundaries | `corr-x7y8z9` |
| **traceId** | Links to distributed trace | `4bf92f3577b34da6a3ce929d0e0e4736` |
| **spanId** | Links to specific span within trace | `00f067aa0ba902b7` |
| **userId** | Who initiated the action | `user-456` |
| **sessionId** | Browser/client session | `sess-m3n4` |
| **service** | Emitting service name | `order-service` |
| **environment** | Deployment environment | `production` |

### What to Log

- **Business events**: order placed, payment processed, user signed up (domain events)
- **Errors and exceptions**: with full stack trace, input context, and correlation IDs
- **Security events**: login attempts, authorization failures, privilege escalation
- **Performance milestones**: external call durations, queue depths, cache hit/miss
- **Configuration changes**: feature flag toggles, config reloads

### What NOT to Log

- **PII**: names, emails, addresses, phone numbers, SSNs — mask or omit
- **Secrets**: passwords, API keys, tokens, connection strings — never log
- **High-cardinality debug data in production**: full request/response bodies, SQL results
- **High-frequency repetitive entries**: per-item loop iterations, per-packet data

### Log Aggregation Tools

| Tool | Strengths | Model |
|---|---|---|
| **CloudWatch Logs** | Native AWS integration, Logs Insights query language | Managed, pay per ingestion/storage |
| **ELK Stack** (Elasticsearch + Logstash + Kibana) | Full-text search, flexible, open source | Self-hosted or Elastic Cloud |
| **Datadog Logs** | Unified with metrics/traces, pattern detection | SaaS, per-GB ingestion pricing |
| **Grafana Loki** | Log aggregation designed for Grafana, label-indexed | Open source, cost-efficient |

### Structured Logging Libraries

| Language | Library | Key Feature |
|---|---|---|
| **Node.js** | Winston, Pino | JSON transport, child loggers with bound context |
| **Java** | Logback + SLF4J, Log4j2 | MDC (Mapped Diagnostic Context) for thread-local fields |
| **Python** | structlog, python-json-logger | Processor pipelines, automatic context binding |
| **Go** | zerolog, zap | Zero-allocation JSON logging |
| **.NET** | Serilog | Structured properties, enrichment pipeline |

### Connection to DDD

Log **domain events** as business-meaningful entries using **Ubiquitous Language**:

```
// Bad — technical, meaningless to domain experts
{"message": "Row inserted into orders table", "table": "orders"}

// Good — domain event in Ubiquitous Language
{"event": "OrderPlaced", "orderId": "123", "customerId": "456", "totalAmount": 99.50}
```

Domain events become first-class log entries. This makes logs readable by product owners, useful
for business analytics, and aligned with Event Storming discoveries.

---

## Pillar 2: Metrics

### Metric Types

| Type | Behavior | Example | Use Case |
|---|---|---|---|
| **Counter** | Monotonically increasing cumulative value. Only goes up (resets on restart) | `http_requests_total` | Request count, error count, bytes sent |
| **Gauge** | Point-in-time value. Goes up and down | `queue_depth`, `active_connections` | Temperature, memory usage, in-flight requests |
| **Histogram** | Samples observations into configurable buckets. Enables percentile calculation | `http_request_duration_seconds` | Latency distribution (p50, p95, p99) |
| **Summary** | Similar to histogram but calculates quantiles client-side | `go_gc_duration_seconds` | Pre-computed percentiles (less flexible than histogram) |

**Prefer histograms over summaries** — histograms are aggregatable across instances, summaries
are not.

### RED Method (Request-Driven Services)

For every service that handles requests:

| Signal | Metric | Alert Example |
|---|---|---|
| **Rate** | Requests per second | Traffic dropped 50% in 5 min |
| **Errors** | Failed requests per second (or error %) | Error rate > 1% for 5 min |
| **Duration** | Latency distribution (p50, p95, p99) | p99 latency > 2s for 5 min |

RED answers: "Are my users happy?" Apply to **every** microservice endpoint.

### USE Method (Resource-Oriented)

For every resource (CPU, memory, disk, network, queue):

| Signal | Question | Metric Example |
|---|---|---|
| **Utilization** | What proportion of capacity is in use? | CPU at 75%, disk at 90% |
| **Saturation** | How much work is waiting? | CPU run queue length, swap usage |
| **Errors** | Are there resource-level errors? | Disk I/O errors, network packet drops |

USE answers: "Is any resource the bottleneck?" Apply to **infrastructure** components.

### The Four Golden Signals (Google SRE)

| Signal | Maps To |
|---|---|
| **Latency** | RED Duration — distribution of response times. Track **success latency** separately from **error latency** |
| **Traffic** | RED Rate — demand on the system (requests/sec, transactions/min) |
| **Errors** | RED Errors + USE Errors — explicit (HTTP 5xx), implicit (wrong content), policy (slow responses) |
| **Saturation** | USE Saturation — how "full" the service is. Most services degrade **before** 100% utilization |

If you can only measure four things, measure these.

### Custom Business Metrics

Technical metrics tell you **what** is broken. Business metrics tell you **why it matters**:

- `orders_placed_per_minute` — revenue velocity
- `failed_payments_total` — direct revenue loss
- `signup_conversion_rate` — growth health
- `cart_abandonment_rate` — UX friction indicator
- `search_results_empty_total` — catalog/relevance gap

Derive business metrics from **domain events**. Every `OrderPlaced` event increments
`orders_placed_per_minute`. This links observability directly to business value.

### Dimensions and Labels

Metrics without dimensions are nearly useless. Slice by:

| Dimension | Purpose | Example Values |
|---|---|---|
| **service** | Which service emitted it | `order-service`, `payment-service` |
| **endpoint** | Which API path | `/api/orders`, `/api/payments` |
| **status_code** | HTTP response code | `200`, `500`, `429` |
| **region** | Deployment region | `us-east-1`, `eu-west-1` |
| **version** | Service version (for canary) | `v1.2.3`, `v1.2.4` |
| **customer_tier** | Business segmentation | `free`, `premium`, `enterprise` |

**Warning**: high-cardinality labels (user ID, request ID) explode metric storage. Use logs and
traces for high-cardinality data, not metric labels.

### Metrics Tools

| Tool | Strengths | Model |
|---|---|---|
| **CloudWatch Metrics** | Native AWS, auto-collects AWS resource metrics | Managed, per-metric pricing |
| **Prometheus + Grafana** | Pull-based, PromQL, open ecosystem, de facto standard | Open source, self-hosted or managed |
| **Datadog Metrics** | Unified platform, anomaly detection, SLO tracking | SaaS, per-host + per-metric |
| **OpenTelemetry** | Vendor-neutral collection, exports to any backend | Open source SDK/collector |

### Connection to BDD

Express expected business metrics as **acceptance criteria** in scenarios:

```gherkin
Scenario: Successful order placement updates business metrics
  Given the order service is running
  When a customer places an order for $99.50
  Then the "orders_placed_total" counter should increment by 1
  And the "order_value_dollars" histogram should record 99.50
```

Business stakeholders define which metrics matter during **Three Amigos** sessions.

---

## Pillar 3: Distributed Tracing

### Core Concepts

| Concept | Definition |
|---|---|
| **Trace** | The end-to-end journey of a single request across all services. One trace = one user action |
| **Span** | One unit of work within a trace. Has name, start time, duration, status, and attributes |
| **Root span** | The first span in a trace — typically the API gateway or edge service |
| **Child span** | A span caused by another span (parent-child relationship) |
| **Span context** | The trace ID + span ID propagated between services |

### Trace Structure

```
Trace: abc-123
├── [Span 1] API Gateway: POST /orders (120ms)
│   ├── [Span 2] Order Service: validateOrder (15ms)
│   ├── [Span 3] Order Service: processPayment (80ms)
│   │   ├── [Span 4] Payment Service: chargeCard (60ms)
│   │   │   └── [Span 5] Stripe API: POST /charges (45ms)
│   │   └── [Span 6] Payment Service: recordTransaction (10ms)
│   └── [Span 7] Order Service: sendConfirmation (20ms)
│       └── [Span 8] Notification Service: sendEmail (18ms)
```

Visualized as a **waterfall/Gantt chart** — immediately reveals which span is the bottleneck.

### Context Propagation

Trace context must be **propagated** across service boundaries so all spans share the same trace ID.

**W3C Trace Context** (standard):

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
              version-trace_id-parent_span_id-trace_flags
```

Propagation mechanisms:

| Boundary | Mechanism |
|---|---|
| **HTTP** | `traceparent` / `tracestate` headers (W3C), or `X-B3-TraceId` (Zipkin B3) |
| **gRPC** | Metadata headers |
| **Message queue** | Message attributes/headers (correlation ID + trace context) |
| **Lambda/async** | Event payload or environment variables |

**Critical**: if any service in the chain fails to propagate context, the trace is **broken** — you
lose visibility across that boundary.

### Sampling Strategies

At high traffic, tracing every request is cost-prohibitive. Sampling reduces volume:

| Strategy | Decision Point | Pros | Cons |
|---|---|---|---|
| **Head-based** | At trace start (edge service) | Simple, consistent — all spans in a trace are sampled or not | May miss interesting traces (errors, slow requests) |
| **Tail-based** | After trace completes, based on outcome | Captures all errors and outliers | Requires buffering complete traces before decision; higher infrastructure cost |
| **Adaptive** | Dynamically adjusts rate based on traffic | Maintains consistent sample count | More complex to configure |
| **Always-on** (low traffic) | Sample 100% | Complete visibility | Only viable for low-traffic services |

**Best practice**: use **tail-based sampling** for production — always capture errors and high-latency
traces, probabilistically sample normal traces.

### Tracing Tools

| Tool | Strengths | Model |
|---|---|---|
| **AWS X-Ray** | Native AWS integration, Lambda/ECS/EKS support | Managed, per-trace pricing |
| **Jaeger** | CNCF graduated, Cassandra/Elasticsearch storage | Open source, self-hosted |
| **Zipkin** | Mature, simple, wide library support | Open source, self-hosted |
| **Datadog APM** | Unified with logs/metrics, service map, error tracking | SaaS, per-host pricing |
| **Grafana Tempo** | Designed for Grafana, cost-efficient object storage | Open source |
| **OpenTelemetry** | Vendor-neutral SDK, auto-instrumentation for major frameworks | Collection layer — exports to any backend |

### Connection to Microservices

Distributed tracing is **essential** for microservice architectures:

- A trace **crosses Bounded Context boundaries** — reveals inter-service dependencies
- Identifies **latency bottlenecks** — which service in the chain is slow?
- Exposes **fan-out problems** — one request triggering N downstream calls
- Validates **service-level objectives** — is each service meeting its latency budget?

### Connection to Event-Driven Architecture

Tracing async flows requires explicit **correlation**:

```
Command: PlaceOrder (traceId: abc-123, spanId: span-1)
  → Message published to order-events topic (traceId: abc-123 in message headers)
    → Consumer: OrderFulfillment (creates child span with traceId: abc-123)
      → Consumer: NotificationService (creates child span with traceId: abc-123)
```

Embed `traceId` and `spanId` in **message headers/attributes**. Consumers extract context and
create child spans, preserving the trace across async boundaries.

---

## Correlation: Connecting the Three Pillars

The three pillars are most powerful when **linked** through shared identifiers.

### Shared Identifiers

| ID | Present In | Purpose |
|---|---|---|
| **traceId** | Logs, traces, metric exemplars | Links all data for one request |
| **spanId** | Logs, traces | Links log entry to specific operation within a trace |
| **requestId** | Logs, traces | Application-level correlation (may differ from traceId) |
| **correlationId** | Logs, messages, traces | Links across async boundaries |

### Exemplars: Metrics to Traces

An **exemplar** is a specific trace ID attached to a metric data point. When a metric spikes, the
exemplar links to the **exact trace** that contributed to the spike.

```
http_request_duration_seconds{service="order-service",endpoint="/api/orders"} 2.5
  # exemplar: {traceId="abc-123"}
```

Prometheus and Grafana support exemplars natively. Click the data point, jump to the trace.

### Debugging Flow

The standard investigation path:

```
Dashboard (metric anomaly detected)
  → Alert fires: "p99 latency > 2s for order-service"
    → Click metric → see exemplar trace ID
      → Open trace → waterfall shows Payment Service span took 1.8s
        → Click span → view correlated logs for that span
          → Log entry: "Stripe API timeout after 1500ms, retry succeeded in 300ms"
            → Root cause: Stripe degradation
```

**Metric** tells you something is wrong. **Trace** tells you where. **Log** tells you why.

---

## Dashboards

### Service Dashboard (per service)

Every service gets a RED dashboard:

- **Request rate** — traffic over time (line chart)
- **Error rate** — percentage and absolute count (line chart with threshold line)
- **Latency percentiles** — p50, p95, p99 (line chart, stacked or overlaid)
- **Active instances** — gauge
- **Recent errors** — log panel showing latest ERROR entries
- **Dependency health** — circuit breaker states for downstream services

### Business Dashboard

Derived from domain events, owned by product team:

- **Orders per minute** — revenue velocity
- **Payment success rate** — conversion health
- **Signup funnel** — step-by-step conversion rates
- **Active users** — gauge
- **Key SLI/SLO status** — are we meeting commitments?

### Infrastructure Dashboard

USE metrics for underlying resources:

- **CPU utilization and saturation** — per instance/container
- **Memory usage** — heap, RSS, available
- **Disk I/O** — read/write throughput, queue depth
- **Network** — bytes in/out, packet errors, connection count
- **Container/pod health** — restarts, OOMKills, pending pods

### On-Call Dashboard

Single pane for incident responders:

- **Active alerts** — sorted by severity
- **Recent deployments** — what changed recently (correlation with incidents)
- **SLO burn rate** — are we burning through error budget?
- **Runbook links** — for each alert, link to remediation steps
- **Service dependency map** — what depends on what

---

## Connection to Methodologies

### DDD Domain Events

Domain Events are the **source** of both business metrics and meaningful log entries:

- `OrderPlaced` → increment `orders_placed_total`, log business event
- `PaymentFailed` → increment `failed_payments_total`, log with error context
- `InventoryReserved` → record reservation duration in histogram

Use **Ubiquitous Language** in metric names, log messages, and span names. When the domain
model and observability share vocabulary, debugging becomes a **business conversation**.

### Event Modeling

A trace naturally follows the Event Modeling flow:

```
Command (span: "PlaceOrder")
  → Domain Event (span: "OrderPlaced published")
    → Read Model Update (span: "OrderSummary projection updated")
```

Each **slice** in an Event Model maps to an observable trace. Instrumenting at slice boundaries
gives end-to-end visibility of every business workflow.

### Clean Architecture

Observability instrumentation belongs in the **Frameworks & Drivers layer** (outermost ring):

- **Use Cases** emit domain events (no logging framework dependency)
- **Interface Adapters** translate domain events to log entries and metrics
- **Frameworks & Drivers** configure logging libraries, metric exporters, trace SDKs

The **Dependency Rule** is preserved — domain logic never depends on observability infrastructure.

### AWS Well-Architected: Operational Excellence

Observability maps directly to the **Operational Excellence** pillar:

- **OPS 4**: How do you implement observability? → Three pillars
- **OPS 8**: How do you understand workload health? → Dashboards, metrics, alerts
- **OPS 9**: How do you understand operations health? → Aggregate metrics across services
- **OPS 10**: How do you manage events? → Alert → trace → log investigation flow

### Rozanski & Woods: Operational Viewpoint

The **Operational Viewpoint** addresses monitoring, alerting, and operational procedures:

- **Monitoring model** → metrics + dashboards
- **Alerting model** → thresholds on RED/USE metrics, SLO burn rates
- **Error handling model** → structured logging + trace-based debugging
- **Migration planning** → canary metrics for safe rollouts

### Continuous Delivery

Observability enables **safe deployments** through feedback loops:

| Practice | Observability Role |
|---|---|
| **Canary deployment** | Compare RED metrics between canary and baseline. Auto-rollback on regression |
| **Blue-green deployment** | Monitor new environment health before switching traffic |
| **Feature flags** | Measure business metrics per flag variant (A/B testing) |
| **Rollback triggers** | Automated rollback when error rate or latency exceeds threshold |
| **Post-deployment verification** | Smoke test results + metric comparison against pre-deployment baseline |

Without observability, deployment is a **hope-based strategy**. With it, deployment is a
**measured experiment**.
