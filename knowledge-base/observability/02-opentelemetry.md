# OpenTelemetry (OTel)

A **CNCF** (Cloud Native Computing Foundation) project providing a vendor-neutral observability framework. Born from the merger of **OpenTracing** (tracing API standard) and **OpenCensus** (Google's instrumentation library). Now the second most active CNCF project after Kubernetes.

**Goal**: standardize collection of the three pillars of observability -- **traces, metrics, and logs** -- through a single set of APIs, SDKs, and tooling.

**Provides**: APIs, SDKs, the Collector, auto-instrumentation agents, and the OTLP wire protocol.

---

## 1. Architecture

### API Layer

Vendor-neutral **interfaces** for instrumentation. Application code depends only on the API -- no implementation details leak in. The API alone is a no-op; it produces no telemetry without an SDK.

- `TracerProvider` / `MeterProvider` / `LoggerProvider` -- entry points
- Safe to call in library code (libraries depend on API, not SDK)
- Follows the **dependency inversion principle**: application code programs against abstractions

### SDK Layer

**Implementation** of the API. Configured by the application operator (not the library author).

Key configurable components:

| Component | Role |
|---|---|
| **Exporters** | Send telemetry to a backend (OTLP, Jaeger, Prometheus, X-Ray, console) |
| **Processors** | Transform or batch telemetry before export (BatchSpanProcessor, SimpleSpanProcessor) |
| **Samplers** | Decide which traces to record (always-on, probability, rate-limiting, parent-based) |
| **Resource** | Identifies the source (service name, version, host, cloud provider metadata) |

### Collector

Standalone binary that **receives, processes, and exports** telemetry data. Decouples instrumentation from backend choice.

### OTLP (OpenTelemetry Protocol)

The **standard wire protocol** for transmitting telemetry data. Supports gRPC and HTTP/protobuf transports. All OTel components speak OTLP natively. Prefer OTLP over legacy protocols (Jaeger Thrift, Zipkin JSON) for new deployments.

---

## 2. Traces

### Core Concepts

| Concept | Description |
|---|---|
| **TracerProvider** | Factory for Tracers. Configured with exporters, processors, samplers, and resource |
| **Tracer** | Creates Spans. Obtained from TracerProvider, scoped to an instrumentation library |
| **Span** | Unit of work with name, start/end time, parent reference, attributes, events, status, links |
| **SpanContext** | Immutable portion of a Span that propagates across process boundaries (trace ID, span ID, trace flags) |

### Span Anatomy

- **Attributes**: key-value pairs describing the span (`http.method`, `http.status_code`, `db.system`)
- **Events**: timestamped annotations within a span (e.g., exception events with stack traces)
- **Status**: `Unset`, `Ok`, or `Error` -- set `Error` on failures
- **Links**: references to spans in other traces (e.g., batch processing linking to individual request traces)
- **Kind**: `CLIENT`, `SERVER`, `PRODUCER`, `CONSUMER`, `INTERNAL`

### Context Propagation

Carries trace context across process boundaries (HTTP headers, message headers).

| Format | Description |
|---|---|
| **W3C TraceContext** | Standard. `traceparent` and `tracestate` headers. Default in OTel |
| **B3** | Zipkin-originated. `X-B3-TraceId`, `X-B3-SpanId`, `X-B3-Sampled` headers |
| **AWS X-Ray** | `X-Amzn-Trace-Id` header. ADOT propagator supports this |

OTel supports **composite propagators** -- inject/extract multiple formats simultaneously for migration scenarios.

### Span Processors

- **SimpleSpanProcessor**: exports each span immediately. Use for development/debugging only
- **BatchSpanProcessor**: buffers spans and exports in batches. Use for production. Configurable: `maxQueueSize`, `maxExportBatchSize`, `scheduledDelayMillis`

### Trace Exporters

| Exporter | Use Case |
|---|---|
| **OTLP** | Universal. Send to Collector, Jaeger, Tempo, or any OTLP-compatible backend |
| **AWS X-Ray** | ADOT exporter converts OTel spans to X-Ray segments |
| **Jaeger** | Direct export to Jaeger (prefer OTLP -- Jaeger natively supports it since v1.35) |
| **Zipkin** | Direct export to Zipkin |
| **Console** | Prints to stdout. Development only |

---

## 3. Metrics

### Core Concepts

| Concept | Description |
|---|---|
| **MeterProvider** | Factory for Meters. Configured with exporters, views, and resource |
| **Meter** | Creates Instruments. Scoped to an instrumentation library |
| **Instrument** | Records measurements (counters, histograms, gauges) |

### Instrument Types

| Instrument | Behavior | Example |
|---|---|---|
| **Counter** | Monotonically increasing sum | Request count, bytes sent |
| **UpDownCounter** | Sum that can increase or decrease | Active connections, queue depth |
| **Histogram** | Distribution of values | Request latency, payload size |
| **Gauge** | Point-in-time value (synchronous) | CPU temperature, memory usage |
| **ObservableCounter** | Async counter, reported via callback | System CPU time |
| **ObservableUpDownCounter** | Async up-down counter | Process memory usage |
| **ObservableGauge** | Async gauge, reported via callback | Room temperature from sensor |

Synchronous instruments record at call site. Observable (async) instruments register callbacks invoked at collection time.

### Views

Customize aggregation per instrument without changing instrumentation code:

- Change aggregation type (e.g., histogram to last-value)
- Drop unwanted attributes to reduce cardinality
- Rename instruments
- Set histogram bucket boundaries

### Metric Exporters

| Exporter | Use Case |
|---|---|
| **OTLP** | Send to Collector or OTLP-compatible backend |
| **Prometheus** | Expose metrics at `/metrics` endpoint for Prometheus scraping |
| **CloudWatch** | ADOT exporter sends metrics to CloudWatch (via Collector) |
| **Console** | Development only |

---

## 4. Logs

### Core Concepts

| Concept | Description |
|---|---|
| **LoggerProvider** | Factory for Loggers. Configured with exporters, processors, and resource |
| **Logger** | Emits LogRecords |
| **LogRecord** | Timestamp, severity, body, attributes, trace context (trace ID, span ID) |

### Bridge API

OTel does **not** replace existing logging libraries. Instead, the **Bridge API** connects existing loggers (Log4j, SLF4J, Python logging, Winston, Pino) to the OTel pipeline.

Pattern: application uses its existing logger -> bridge appender/handler captures log records -> OTel SDK processes and exports them.

### Log-Trace Correlation

The key value of OTel logs: automatic injection of **trace ID and span ID** into log records when a span is active. This enables:

- Clicking from a trace to its correlated logs in the backend
- Filtering logs by trace ID to see everything that happened during a request
- Unified view across traces, metrics, and logs

### Log Exporters

| Exporter | Use Case |
|---|---|
| **OTLP** | Send to Collector or OTLP-compatible backend (Loki, Elasticsearch) |
| **CloudWatch Logs** | ADOT exporter sends logs to CloudWatch Logs |
| **Console** | Development only |

---

## 5. Auto-Instrumentation

Zero-code instrumentation for common frameworks and libraries. Automatically creates spans for HTTP requests, database calls, message queue operations, gRPC calls.

### Language Support

| Language | Package | Mechanism |
|---|---|---|
| **Java** | OpenTelemetry Java Agent (`-javaagent:opentelemetry-javaagent.jar`) | Bytecode manipulation at class load time |
| **Node.js** | `@opentelemetry/auto-instrumentations-node` | Monkey-patching `require`/`import` |
| **Python** | `opentelemetry-instrumentation` + `opentelemetry-instrument` CLI | Monkey-patching at import time |
| **.NET** | `OpenTelemetry.AutoInstrumentation` | CLR profiler API |

### What Gets Instrumented

- **HTTP clients/servers**: Express, Fastify, Spring, Flask, Django, Koa, Nest
- **Database clients**: pg, mysql2, mongoose, JDBC, SQLAlchemy, Prisma
- **Message queues**: Kafka, RabbitMQ, SQS, SNS
- **gRPC**: client and server calls
- **AWS SDK**: DynamoDB, S3, Lambda invocations
- **Redis, Memcached**: cache operations

### Manual vs Auto

- **Auto-instrumentation**: fast to set up, covers framework-level operations, no code changes
- **Manual instrumentation**: required for business logic spans (e.g., "process payment", "validate order"), custom attributes, custom metrics
- **Best practice**: use auto-instrumentation as baseline, add manual spans for domain-significant operations

---

## 6. Collector

### Pipeline Architecture

```
Receivers → Processors → Exporters
```

Each pipeline handles one signal type (traces, metrics, or logs). A single Collector instance runs multiple pipelines.

### Receivers

Accept telemetry data from various sources:

| Receiver | Source |
|---|---|
| **OTLP** | OTel SDKs, other Collectors |
| **Jaeger** | Jaeger clients (Thrift/gRPC) |
| **Prometheus** | Scrape Prometheus endpoints |
| **AWS X-Ray** | X-Ray daemon protocol |
| **Kafka** | Read from Kafka topics |
| **Filelog** | Tail log files |

### Processors

Transform telemetry data in the pipeline:

| Processor | Function |
|---|---|
| **batch** | Buffer and send in batches (reduces export overhead). **Always use in production** |
| **filter** | Drop telemetry matching conditions (reduce noise/cost) |
| **attributes** | Add, update, delete, or hash attributes |
| **resource** | Add or modify resource attributes |
| **tail_sampling** | Sample based on completed trace data (errors, latency, attributes) |
| **transform** | OTTL-based transformations |
| **memory_limiter** | Prevent OOM by dropping data when memory threshold exceeded |

### Exporters

Send telemetry to backends:

| Exporter | Destination |
|---|---|
| **OTLP/gRPC, OTLP/HTTP** | Any OTLP-compatible backend |
| **AWS X-Ray** | AWS X-Ray service |
| **AWS CloudWatch** | CloudWatch Metrics and Logs |
| **Datadog** | Datadog platform |
| **Prometheus Remote Write** | Prometheus-compatible TSDB |
| **Logging** | Collector's own log output (debugging) |

### Deployment Modes

**Agent mode (sidecar)**:
- Collector runs alongside each application instance (sidecar container in ECS/EKS, DaemonSet in K8s)
- Low latency, local buffering, minimal network hops
- Handles resource attribution and basic processing
- Forwards to a gateway or directly to backends

**Gateway mode (centralized)**:
- Standalone Collector cluster receiving from multiple agents or applications
- Centralized processing: tail-based sampling, advanced routing, aggregation
- Single point for backend configuration changes
- Scale horizontally behind a load balancer

**Common pattern**: agent (sidecar) → gateway (centralized) → backends. Agent handles buffering and basic processing; gateway handles tail sampling and routing.

### ADOT (AWS Distro for OpenTelemetry)

AWS-supported distribution of the OTel Collector and SDKs. Includes AWS-specific receivers, processors, and exporters pre-configured for X-Ray, CloudWatch, and Amazon Managed Prometheus.

- **Production-ready**: AWS tests and patches the distribution
- **Lambda layer**: pre-built layer for auto-instrumentation in Lambda functions
- **ECS/EKS integration**: Helm charts, CloudFormation templates, CDK constructs
- **Same configuration format** as upstream OTel Collector -- no vendor lock-in

---

## 7. Sampling Strategies

### Head-Based Sampling

Decision made **at trace start** (before any spans are recorded).

| Strategy | Description | Use Case |
|---|---|---|
| **AlwaysOn** | Record every trace | Development, low-traffic services |
| **AlwaysOff** | Record nothing | Disable tracing |
| **TraceIdRatioBased** | Record a percentage of traces (e.g., 10%) | Production, consistent sampling across services |
| **RateLimiting** | Record N traces per second | Predictable cost control |

**Limitation**: cannot make decisions based on trace outcome (errors, latency) -- that information is not available yet.

### Tail-Based Sampling

Decision made **at trace end**, after all spans are collected. Requires the **Collector** (tail_sampling processor) because the Collector must buffer complete traces before deciding.

| Policy | Description |
|---|---|
| **status_code** | Always sample traces with ERROR status |
| **latency** | Sample traces exceeding a latency threshold |
| **string_attribute** | Sample based on attribute values (e.g., `http.route = /checkout`) |
| **probabilistic** | Random percentage of remaining traces |
| **composite** | Combine multiple policies with rate limits |

**Tradeoff**: requires more memory and processing in the Collector, but captures the traces that matter most (errors, slow requests, specific routes).

### Parent-Based Sampling

**Inherit the parent's sampling decision**. If the parent span was sampled, all child spans are sampled. Ensures complete traces -- no orphan spans.

Default behavior in most OTel SDKs: `ParentBased(root=TraceIdRatioBased(0.1))` -- use parent's decision if available, otherwise sample 10% of root spans.

### Production Recommendation

Combine strategies:

1. **Head-based** with `ParentBased(TraceIdRatioBased)` in SDKs -- sample a baseline percentage
2. **Tail-based** in Collector gateway -- always capture errors, high-latency traces, and specific routes regardless of head sampling decision
3. Result: controlled cost with no blind spots on failures

---

## 8. AWS Integration

### Architecture: OTel + AWS

```
Application (OTel SDK)
  → ADOT Collector (sidecar/agent)
    → AWS X-Ray (traces)
    → CloudWatch Metrics (metrics)
    → CloudWatch Logs (logs)
    → Amazon Managed Prometheus (metrics, optional)
    → Amazon Managed Grafana (visualization, optional)
```

### X-Ray as Trace Backend

- ADOT Collector includes the **AWS X-Ray exporter** -- converts OTel spans to X-Ray segments/subsegments
- Supports X-Ray trace ID format propagation via the `awsxray` propagator
- X-Ray groups and filter expressions work on OTel-exported data
- Service Map automatically built from trace data

### CloudWatch as Metrics/Logs Backend

- **CloudWatch Metrics**: ADOT exporter maps OTel metrics to CloudWatch metrics (dimensions from attributes)
- **CloudWatch Logs**: ADOT exporter sends OTel log records to CloudWatch Logs
- **Embedded Metric Format (EMF)**: high-cardinality metrics via structured log entries -- ADOT supports EMF export

### Lambda Instrumentation

- **ADOT Lambda Layer**: pre-built layer containing the OTel SDK and Collector
- Auto-instruments the Lambda handler (HTTP calls, AWS SDK calls)
- Collector runs as a Lambda extension (separate process, shares the execution environment)
- Exports traces/metrics during the invocation or at `SHUTDOWN` event
- Cold start overhead: ~200-500ms additional init time (mitigate with provisioned concurrency)

### ECS/EKS Deployment

- **ECS sidecar**: ADOT Collector as a sidecar container in the task definition. Share the network namespace with the application container
- **EKS DaemonSet**: ADOT Collector runs one pod per node. Applications send telemetry to the node-local Collector via `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317`
- **EKS sidecar**: inject ADOT Collector as a sidecar via admission webhook (more isolation per pod)

### AWS X-Ray SDK vs OTel SDK

| Aspect | X-Ray SDK | OTel SDK |
|---|---|---|
| **Vendor lock-in** | AWS-only | Vendor-neutral, export anywhere |
| **Community** | AWS-maintained | CNCF, broad ecosystem |
| **Signals** | Traces only | Traces, metrics, logs |
| **Auto-instrumentation** | Limited | Extensive (dozens of libraries) |
| **Recommendation** | Legacy, maintenance mode | **Preferred for new projects** |

AWS officially recommends migrating from X-Ray SDK to OTel SDK with ADOT.

---

## 9. Connection to Methodologies

### Clean Architecture

- OTel SDK configuration and Collector setup live in the **Frameworks & Drivers** layer (outermost ring)
- Use Cases and Entities never import OTel directly -- pass telemetry concerns through interface adapters
- Pattern: define a `Telemetry` port in the Use Case layer; implement it with OTel in the adapter layer
- Auto-instrumentation naturally fits the outermost layer (HTTP framework, database driver)

### DDD

- Create **custom spans** for aggregate command handling: `orderAggregate.placeOrder` span wrapping the command execution
- Instrument **domain event processing**: one span per event handler, linked to the originating command span
- Add **domain-specific attributes**: `order.id`, `customer.tier`, `payment.method` -- makes traces searchable by business concepts
- Bounded context = service = independent TracerProvider configuration

### Microservices

- **Trace propagation across service boundaries**: context propagation headers (W3C TraceContext) flow through HTTP/gRPC calls
- Distributed trace = one trace spanning multiple services, stitched by trace ID
- Service mesh sidecars (Envoy, Linkerd) automatically propagate trace context at the infrastructure level
- Each service configures its own OTel SDK independently -- loose coupling preserved

### Event-Driven Architecture

- **Trace ID in message headers**: producer injects trace context into message attributes (SQS message attributes, Kafka headers, EventBridge detail)
- Consumer extracts context and creates a child span -- links async operations into one distributed trace
- For fan-out (one event, many consumers): use **span links** instead of parent-child (each consumer creates its own trace root, linked to the producer span)
- Message queue auto-instrumentation handles context injection/extraction for Kafka, RabbitMQ, SQS

### Continuous Delivery

- Collector deployed as **infrastructure-as-code**: CDK construct, CloudFormation template, Helm chart
- Collector configuration versioned alongside application code
- Pipeline stages: deploy Collector config → deploy application → verify telemetry flows (smoke test)
- Feature flags + trace attributes: tag spans with feature flag state for A/B test observability

### Rozanski & Woods Operational Viewpoint

- OTel directly implements the **monitoring** and **alerting** concerns of the Operational Viewpoint
- Trace data feeds **error detection** (error spans → alerts)
- Metrics feed **capacity monitoring** (request rates, latency percentiles, resource utilization)
- Logs feed **audit** and **troubleshooting** concerns
- Collector pipeline = operational infrastructure that must itself be monitored (meta-monitoring)

### AWS Well-Architected: Operational Excellence

- **OPS 4 -- How do you implement observability?**: OTel + ADOT is the recommended implementation path
- **OPS 8 -- How do you understand the health of your operations?**: distributed traces reveal service dependencies and failure modes
- Metrics with CloudWatch alarms fulfill the **respond to events** design principle
- Log-trace correlation enables the **learn, share, improve** feedback loop -- traces point to the exact log entries for root cause analysis
