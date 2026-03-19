# Microservice Decomposition and Communication Patterns

Based on Chris Richardson (*Microservices Patterns*) and Sam Newman (*Building Microservices*, *Monolith to Microservices*).

---

## 1. Decomposition Strategies

### By Business Capability

Align each service with a **business function** -- what the organization does. Business capabilities are stable (they change slowly compared to org structure). This maps directly to DDD **bounded contexts**: one bounded context = one service boundary.

- Identify capabilities from organizational analysis: Order Management, Inventory, Billing, Shipping
- Each capability owns its data, rules, and processes
- Services map to nouns (entities) or verbs (operations) of the business, not technical layers

### By Subdomain

DDD distinguishes three subdomain types. Each demands a different investment strategy:

| Subdomain Type | Description | Service Strategy |
|---|---|---|
| **Core** | Competitive advantage, what differentiates the business | Build custom, invest heavily, best engineers, sophisticated modeling |
| **Supporting** | Necessary but not differentiating | Build or buy, adequate quality, consider outsourcing |
| **Generic** | Solved problems (auth, email, payments) | Buy off-the-shelf, use SaaS, do not build custom |

Decomposition insight: core subdomains deserve fine-grained, well-modeled services. Generic subdomains should be a single service wrapping a third-party integration.

### Strangler Fig Pattern

Incrementally replace monolith functionality without a big-bang rewrite:

1. **Identify** a seam in the monolith (a module with clear inputs/outputs)
2. **Intercept** calls to that module at the edge (via proxy, API gateway, or routing layer)
3. **Implement** the replacement as a new service
4. **Redirect** traffic from monolith to new service
5. **Remove** the old code once the new service is proven

Key principles:
- Never modify the monolith's internal code if avoidable -- wrap it
- Use an **anticorruption layer** between new service and monolith
- Start with the easiest, lowest-risk module to build confidence
- Asset capture pattern (Newman): copy data out of the monolith via events before cutting over

### Service Granularity

**Too fine (nanoservices)**: overhead of deployment, monitoring, and inter-service communication exceeds the value of decomposition. Symptoms: services that always deploy together, chatty communication, distributed transactions for simple operations.

**Too coarse (distributed monolith)**: large services that couple multiple business capabilities. Symptoms: multiple teams working in the same service, deployments blocked by unrelated changes, shared data models.

**Right-sizing heuristics**:
- Can this service be **independently deployed** without coordinating with other services?
- Can a **single team own** this service end-to-end (two-pizza team)?
- Does this service own its **data exclusively** (no shared database)?
- Does this service represent a **single business capability** or bounded context?
- Can you describe what this service does in **one sentence** without using "and"?

If you answer "no" to any of these, reconsider the boundary.

---

## 2. Communication Patterns

### Synchronous Communication

**Protocols**:

| Protocol | Strengths | Best For |
|---|---|---|
| **REST (HTTP/JSON)** | Simple, ubiquitous, human-readable, mature tooling | CRUD operations, public APIs, broad interoperability |
| **gRPC (HTTP/2 + Protobuf)** | High performance, streaming, strict contracts, code generation | Internal service-to-service, low latency, polyglot systems |
| **GraphQL** | Client-driven queries, reduces over-fetching, single endpoint | BFF layer, mobile clients with varying data needs |

**When to use synchronous**:
- Query operations where caller needs data immediately
- Low-latency requirements (< 100ms response expected)
- Simple request-response interactions
- Operations where the caller cannot proceed without the response

**Risks**:
- **Temporal coupling**: caller blocks until responder replies. If responder is slow or down, caller is impacted
- **Cascade failures**: failure in one downstream service propagates up through the call chain
- **Reduced availability**: system availability = product of all services' availability in the call chain (e.g., three services at 99.5% = 98.5% combined)

**Mitigation**: Circuit breakers, timeouts, retries with exponential backoff, bulkheads, fallback responses.

### Asynchronous Communication

**Mechanisms**:

| Mechanism | Description | AWS Service |
|---|---|---|
| **Point-to-point messaging** | One producer, one consumer per message | SQS |
| **Publish-subscribe** | One producer, many consumers per message | SNS (fan-out to SQS) |
| **Event bus** | Central routing of events with filtering rules | EventBridge |
| **Event streaming** | Ordered, replayable, partitioned log | Kafka (MSK), Kinesis |

**When to use asynchronous**:
- **Fire-and-forget**: command accepted, processing happens later (order placement, email sending)
- **Event notification**: something happened, interested parties react independently
- **Long-running processes**: workflows spanning minutes/hours (sagas, choreography)
- **Decoupling**: producer does not need to know about consumers

**Benefits**:
- **Loose coupling**: producer and consumer are independent in time and deployment
- **Resilience**: if consumer is down, messages queue up and are processed on recovery
- **Scalability**: consumers scale independently based on queue depth
- **Extensibility**: add new consumers without modifying the producer

**Tradeoffs**:
- Eventual consistency (not immediate)
- Harder to debug (no single request trace without distributed tracing)
- Message ordering, deduplication, and idempotency must be handled explicitly
- Additional infrastructure (broker) to operate

### Hybrid: Sync for Queries, Async for Commands/Events

Aligns with **CQRS** (Command Query Responsibility Segregation):

- **Queries** (reads): synchronous, because the caller needs data now. Use REST/gRPC to read from a read-optimized store
- **Commands** (writes): asynchronous, because the caller only needs acknowledgment. Publish a command/event to a message broker
- **Events** (notifications): asynchronous. Domain events propagate state changes across services

This hybrid approach maximizes both responsiveness (sync reads) and resilience (async writes).

---

## 3. Service Mesh

### Sidecar Pattern

A **sidecar proxy** runs alongside each service instance, intercepting all inbound and outbound network traffic. The service communicates with localhost; the sidecar handles everything else.

**Implementations**: Envoy (most common data plane), Linkerd (simpler, Rust-based), Istio (Envoy-based control plane).

### Capabilities

| Capability | What It Does |
|---|---|
| **Traffic management** | Load balancing, retries, timeouts, circuit breaking, canary routing, traffic splitting |
| **Observability** | Distributed tracing, metrics (latency, error rates, throughput), access logs -- all without application code changes |
| **Security** | Mutual TLS (mTLS) between all services, certificate rotation, authorization policies |
| **Resilience** | Fault injection for chaos testing, rate limiting, outlier detection |

### AWS App Mesh

AWS-managed service mesh using Envoy proxies. Integrates with ECS, EKS, and EC2. Provides:
- Virtual services, virtual nodes, virtual routers for traffic management
- CloudWatch and X-Ray integration for observability
- mTLS with ACM Private CA

### When Needed vs Overkill

**Needed when**:
- 10+ services with complex inter-service communication
- You need consistent observability, security, and traffic policies across all services
- Multiple teams deploy independently and you need platform-level guarantees
- You are doing canary deployments or traffic shifting at the infrastructure level

**Overkill when**:
- Fewer than ~5 services
- A simple load balancer with health checks suffices
- Team can implement retries/circuit breakers in application code (e.g., via a shared library)
- The operational complexity of running the mesh exceeds the benefits

---

## 4. API Gateway

### Edge Gateway vs Internal Gateway

- **Edge gateway**: internet-facing, handles external client requests. Focuses on authentication, rate limiting, TLS termination, request validation
- **Internal gateway**: handles service-to-service routing within the cluster. Focuses on routing, load balancing, observability

### Core Responsibilities

| Responsibility | Description |
|---|---|
| **Routing** | Route requests to the correct backend service based on path, headers, or method |
| **Authentication/Authorization** | Validate tokens (JWT, OAuth2), enforce access policies before requests reach services |
| **Rate limiting** | Protect backend services from overload (per-client, per-endpoint throttling) |
| **Circuit breaking** | Stop forwarding requests to failing backends, return fast errors |
| **Request/Response transformation** | Aggregate, reshape, or filter payloads |
| **Caching** | Cache responses for read-heavy endpoints |
| **Observability** | Centralized logging, metrics, tracing of all API traffic |

### AWS Options

| Service | Use Case |
|---|---|
| **API Gateway (REST/HTTP)** | Full-featured edge gateway: auth, throttling, usage plans, request validation, Lambda integration |
| **API Gateway (WebSocket)** | Real-time bidirectional communication |
| **ALB (Application Load Balancer)** | Layer 7 routing, path-based routing, simpler than API Gateway, lower cost at high throughput |
| **CloudFront** | CDN + edge functions (Lambda@Edge, CloudFront Functions) for global caching and edge logic |

### BFF (Backend for Frontend) Pattern

Each frontend type (web, mobile, IoT) gets its own **dedicated API gateway or service** that:
- Aggregates calls to multiple backend services
- Shapes responses specifically for that client's needs (e.g., smaller payloads for mobile)
- Handles client-specific authentication flows
- Owned by the frontend team, not the backend team

Implementation: one API Gateway stage/route per BFF, or dedicated Lambda/container per BFF.

---

## 5. Service Discovery

### Client-Side vs Server-Side Discovery

| Approach | How It Works | Tradeoffs |
|---|---|---|
| **Client-side** | Client queries a service registry, gets a list of instances, load-balances itself | Client is more complex, but no single point of failure in the load balancer. Example: Netflix Eureka + Ribbon |
| **Server-side** | Client sends request to a load balancer/router, which queries the registry and forwards | Client is simple, infrastructure handles discovery. Example: AWS ELB, Kubernetes Services |

### AWS Service Discovery Options

| Service | Mechanism |
|---|---|
| **Elastic Load Balancing (ALB/NLB)** | Server-side discovery. Register targets (instances, IPs, Lambdas) in target groups. Health checks built in |
| **AWS Cloud Map** | Service registry for dynamic resources. Services register instances; consumers query via DNS or API. Integrates with ECS service discovery |
| **Route 53** | DNS-based discovery. Services register as DNS records. Supports health checks and failover routing. Coarser-grained than Cloud Map |
| **ECS Service Connect** | Built-in service mesh for ECS. Automatic registration and DNS-based discovery between ECS services |

---

## 6. Data Ownership

### Database per Service (Critical Principle)

Each service **exclusively owns its data store**. No other service reads from or writes to that store directly. This is the single most important principle for achieving independent deployability.

- Each service chooses the storage technology best suited to its needs (polyglot persistence)
- Schema changes are internal to the service -- no cross-service migration coordination
- Data is accessed only through the service's API

### Shared Database Anti-pattern

Multiple services read from and write to the same database.

**Why it's an anti-pattern**:
- Schema changes require coordinating all services -- kills independent deployability
- Implicit coupling through shared tables, views, or stored procedures
- No clear data ownership -- who is responsible for data integrity?
- Performance coupling -- one service's heavy queries affect all others

**When it's acceptable** (pragmatic exceptions):
- During migration from monolith (temporary shared database with a clear timeline to separate)
- Read-only access to a reporting/analytics replica
- Truly shared reference data (country codes, currency codes) that never changes -- even then, prefer a small reference data service

### Data Replication via Events

When services need data owned by another service:

1. **Source service** publishes domain events when its data changes (e.g., `OrderPlaced`, `CustomerAddressUpdated`)
2. **Consuming service** subscribes to relevant events and maintains a **local read-only copy** of the data it needs
3. The local copy is eventually consistent -- there is a propagation delay

This gives the consuming service **autonomy** (it does not call the source service at query time) at the cost of **eventual consistency**.

### API Composition for Cross-Service Queries

When a query needs data from multiple services:

- An **API composer** (often the API gateway or a dedicated service) calls each service, gathers partial results, and joins them in memory
- Works for simple joins and aggregations
- Does not work for complex queries with filtering/sorting across datasets -- for those, consider CQRS with a denormalized read model built from events

---

## 7. Distributed Monolith Anti-pattern

A distributed monolith has the **complexity of microservices** with **none of the benefits**. It is a networked monolith.

### Symptoms

- Services **cannot deploy independently** -- deploying one service requires deploying others simultaneously
- **Shared database** -- multiple services read/write the same tables
- **Synchronous call chains** -- service A calls B calls C calls D, creating tight temporal coupling
- **Shared libraries with domain logic** -- changes to the library force redeployment of all services
- **Lock-step releases** -- all services must be released together on a fixed schedule
- **Distributed transactions** -- two-phase commit or manual coordination across services for basic operations
- **Shared domain model** -- the same data classes are used across service boundaries

### How to Detect

- Map the dependency graph. If it looks like a web rather than a set of loosely connected clusters, you have a distributed monolith
- Track deployment frequency per service. If services always deploy together, they are effectively one unit
- Measure blast radius of a change. If a change in service A breaks services B, C, and D, coupling is too high
- Check if any service has its own database. If the answer is "no" for most services, data ownership is missing

### How to Fix

1. **Identify true bounded contexts** using event storming or domain storytelling
2. **Introduce asynchronous communication** to replace synchronous chains
3. **Split shared databases** -- give each service its own schema, replicate data via events
4. **Eliminate shared domain libraries** -- duplicate code is better than coupling (Newman)
5. **Apply the strangler fig** to extract one service at a time into a properly independent service
6. Accept that some services should be **merged back** into fewer, properly bounded services

---

## 8. Conway's Law

> "Any organization that designs a system will produce a design whose structure is a copy of the organization's communication structure." -- Melvin Conway

### Implications

- If three teams work on a compiler, you get a three-pass compiler
- If the frontend team and backend team are separate, you get a frontend service and a backend service -- regardless of whether that boundary makes domain sense
- Cross-team communication overhead shows up as integration complexity between services

### Inverse Conway Maneuver

**Design the team structure to match the desired architecture**, not the other way around.

- Want independent microservices? Create autonomous, cross-functional teams aligned to bounded contexts
- Want a monolith? Keep all developers in one team
- If the org chart and the desired architecture conflict, the org chart wins (Conway's Law is descriptive, not prescriptive) -- so change the org chart

### Connection to DDD

- **One team per bounded context** -- the team owns the service, its data, its pipeline, its uptime
- **Context map = team interaction map** -- relationship patterns (partnership, customer-supplier, conformist) describe how teams interact, not just how systems interact
- Team topologies (Skelton & Pais) formalize this: stream-aligned teams (one per bounded context), platform teams, enabling teams, complicated-subsystem teams

---

## 9. Connection to Methodologies

### DDD

- **Bounded Context = service boundary**. The most reliable heuristic for where to draw service lines
- **Context Map = inter-service communication map**. Each relationship pattern implies a communication and coupling strategy
- **Aggregates** define transactional boundaries within a service. One service may contain multiple aggregates
- **Domain Events** are the primary mechanism for inter-service data propagation

### Event Storming

- **Swimlanes** in process-level event storming = service candidates. Each swimlane represents a bounded context
- **Pivotal events** (events where the process changes direction) often indicate service boundaries
- **Aggregates** discovered during detailed event storming become entities within services
- **External systems** and **policies** (yellow stickies) reveal integration points between services

### Event Modeling

- **Swimlanes** = service boundaries. Each horizontal lane represents an independent service or bounded context
- **Commands and events** flowing between swimlanes = inter-service communication contracts
- The blueprint directly maps to service APIs and event schemas

### Clean Architecture

Each microservice has its own **internal Clean Architecture**:
- **Entities**: domain model, business rules
- **Use Cases**: application-specific business rules
- **Interface Adapters**: controllers, gateways, presenters
- **Frameworks & Drivers**: database, web framework, messaging client

The dependency rule applies within each service. Services communicate only through their outer layers (interface adapters), never by sharing inner layers.

### Continuous Delivery

- Each service has its **own deployment pipeline**: build, test, deploy independently
- **Independent deployability** is both the goal of decomposition and the prerequisite for continuous delivery
- Feature flags enable trunk-based development within each service
- Pipeline includes: unit tests, integration tests (contract tests), deployment, smoke tests, monitoring

### Contract Testing

- **One contract per service-to-service integration**. Consumer defines what it needs from the provider
- Consumer-driven contracts ensure the provider does not break its consumers when evolving
- Contract tests replace expensive end-to-end integration tests
- **Pact** or **BDCT** (bi-directional contract testing) for REST; **Protobuf compatibility checks** for gRPC; **schema registry** for async events (Avro, JSON Schema)
- Contract tests run in each service's pipeline -- the consumer pipeline publishes contracts, the provider pipeline verifies them
