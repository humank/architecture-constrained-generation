# API Design Principles: Complete Reference

## 1. API-First Design

Design the API **before** writing implementation code. The API specification is the contract and
the source of truth — not the code, not the documentation generated after the fact.

### Principles

- **Contract-first**: Write OpenAPI/Protobuf/GraphQL schema before any implementation
- **Design reviews**: API design is reviewed like architecture, not an afterthought
- **Mock-driven development**: Consumers can develop against mocks generated from the spec
- **Parallel workstreams**: Frontend and backend teams work simultaneously against the contract
- **Machine-readable specs**: Enable codegen for clients, servers, tests, docs

### API Design Lifecycle

```
Define Spec → Review → Mock → Implement → Contract Test → Deploy → Evolve
```

The spec drives everything downstream. Breaking changes require versioning strategy (see below).

---

## 2. REST API Design

### Richardson Maturity Model

| Level | Name | Description |
|---|---|---|
| **0** | The Swamp of POX | Single URI, single HTTP method (usually POST). RPC-over-HTTP. SOAP-style |
| **1** | Resources | Multiple URIs (one per resource), but single HTTP method. Resources are addressable |
| **2** | HTTP Verbs | Proper use of GET, POST, PUT, DELETE with correct status codes. **Most production APIs stop here** |
| **3** | Hypermedia (HATEOAS) | Responses include links to related actions/resources. Self-discoverable API |

Level 2 is the pragmatic target for most APIs. Level 3 adds value for long-lived public APIs
with many independent consumers.

### Resource Naming Conventions

- **Nouns, not verbs**: `/orders` not `/getOrders`
- **Plural**: `/users`, `/products`, `/invoices`
- **Hierarchical for containment**: `/users/{id}/orders/{orderId}`
- **Kebab-case**: `/line-items` not `/lineItems` (URIs are case-insensitive by convention)
- **Max 2-3 levels of nesting** — deeper nesting implies missing resources
- **Actions as sub-resources** when no clean noun exists: `POST /orders/{id}/cancel`

```
GET    /products                    # list
GET    /products/{id}               # detail
POST   /products                    # create
PUT    /products/{id}               # full replace
PATCH  /products/{id}               # partial update
DELETE /products/{id}               # remove

GET    /users/{id}/orders           # nested collection
POST   /users/{id}/orders           # create within parent
```

### HTTP Method Semantics

| Method | Semantics | Safe | Idempotent | Request Body | Typical Status |
|---|---|---|---|---|---|
| **GET** | Retrieve resource(s) | Yes | Yes | No | 200 |
| **POST** | Create resource / trigger action | No | **No** | Yes | 201, 202 |
| **PUT** | Full replacement of resource | No | Yes | Yes | 200, 204 |
| **PATCH** | Partial update | No | **No*** | Yes | 200, 204 |
| **DELETE** | Remove resource | No | Yes | No | 204, 200 |
| **HEAD** | GET without body (metadata) | Yes | Yes | No | 200 |
| **OPTIONS** | Describe available methods | Yes | Yes | No | 204 |

*PATCH can be made idempotent with JSON Merge Patch (RFC 7396) but is not by default.

**Idempotency** means repeating the same request produces the same effect. Critical for retry
logic in distributed systems. Use `Idempotency-Key` headers for non-idempotent operations (POST).

### Status Codes

**2xx — Success**

| Code | When to Use |
|---|---|
| **200 OK** | Successful GET, PUT, PATCH with response body |
| **201 Created** | Successful POST that created a resource. Include `Location` header |
| **202 Accepted** | Request accepted for async processing. Return a job/status URI |
| **204 No Content** | Successful DELETE or PUT/PATCH with no response body |

**3xx — Redirection**

| Code | When to Use |
|---|---|
| **301 Moved Permanently** | Resource URI has changed permanently. Clients should update |
| **304 Not Modified** | Conditional GET — resource unchanged (ETag/If-Modified-Since) |

**4xx — Client Error**

| Code | When to Use |
|---|---|
| **400 Bad Request** | Malformed syntax, invalid request body, validation failure |
| **401 Unauthorized** | Missing or invalid authentication credentials |
| **403 Forbidden** | Authenticated but not authorized for this resource/action |
| **404 Not Found** | Resource does not exist (or caller not allowed to know it exists) |
| **405 Method Not Allowed** | HTTP method not supported on this resource |
| **409 Conflict** | State conflict (duplicate creation, optimistic lock failure) |
| **410 Gone** | Resource existed but has been permanently deleted |
| **415 Unsupported Media Type** | Content-Type not supported |
| **422 Unprocessable Entity** | Well-formed but semantically invalid (business rule violation) |
| **429 Too Many Requests** | Rate limited. Include `Retry-After` header |

**5xx — Server Error**

| Code | When to Use |
|---|---|
| **500 Internal Server Error** | Unexpected server failure. Never expose stack traces |
| **502 Bad Gateway** | Upstream service returned invalid response |
| **503 Service Unavailable** | Temporarily overloaded or in maintenance. Include `Retry-After` |
| **504 Gateway Timeout** | Upstream service timed out |

### Error Response Format (RFC 7807 Problem Details)

Standardize all error responses with RFC 7807:

```json
{
  "type": "https://api.example.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 422,
  "detail": "Account 12345 has balance of $10.00 but withdrawal requires $50.00",
  "instance": "/transfers/abc-123",
  "balance": 1000,
  "required": 5000
}
```

| Field | Required | Description |
|---|---|---|
| `type` | Yes | URI identifying the error type (dereferenceable documentation) |
| `title` | Yes | Short human-readable summary (stable across occurrences) |
| `status` | Yes | HTTP status code |
| `detail` | No | Human-readable explanation specific to this occurrence |
| `instance` | No | URI identifying the specific occurrence |
| *extensions* | No | Additional machine-readable fields specific to the error type |

Content-Type: `application/problem+json`

### Pagination

**Cursor-based** (recommended for large/dynamic datasets):

```
GET /orders?cursor=eyJpZCI6MTAwfQ&limit=25

{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTI1fQ",
    "has_more": true
  }
}
```

- Stable under insertions/deletions
- No "skip N rows" performance problem
- Cannot jump to arbitrary page

**Offset-based** (simpler, good for small/static datasets):

```
GET /products?offset=50&limit=25

{
  "data": [...],
  "pagination": {
    "total": 230,
    "offset": 50,
    "limit": 25
  }
}
```

- Allows jump to arbitrary page
- Inconsistent under concurrent writes (items skipped or duplicated)
- Performance degrades at large offsets (`OFFSET 100000`)

**Link Headers** (RFC 8288): Machine-parseable navigation.

```
Link: <https://api.example.com/orders?cursor=abc>; rel="next",
      <https://api.example.com/orders?cursor=xyz>; rel="prev"
```

### Filtering, Sorting, Field Selection

```
# Filtering
GET /products?category=electronics&price_min=100&price_max=500
GET /orders?status=shipped&created_after=2024-01-01

# Sorting
GET /products?sort=price,-created_at     # ascending price, descending created_at

# Field selection (sparse fieldsets)
GET /users/123?fields=name,email,avatar

# Combined
GET /products?category=electronics&sort=-rating&fields=name,price&limit=10
```

For complex filtering, consider a query language (e.g., RSQL, OData `$filter`, or custom DSL).

### HATEOAS and Hypermedia

Responses include links to available actions and related resources:

```json
{
  "id": "order-123",
  "status": "pending",
  "_links": {
    "self": { "href": "/orders/order-123" },
    "cancel": { "href": "/orders/order-123/cancel", "method": "POST" },
    "payment": { "href": "/orders/order-123/payment" },
    "customer": { "href": "/customers/cust-456" }
  }
}
```

**When HATEOAS is worth the complexity**:

- Public APIs with many independent consumers who need discoverability
- Long-lived APIs where URI structure may evolve
- Workflow-driven APIs where available actions depend on state

**When to skip it**: Internal microservice APIs, mobile backends with known clients, simple CRUD.

### Versioning Strategies

| Strategy | Example | Pros | Cons |
|---|---|---|---|
| **URI path** | `/v1/users` | Explicit, easy to route, cacheable | Proliferates URIs, not RESTful |
| **Query param** | `/users?version=1` | Easy to implement | Breaks caching, easy to forget |
| **Custom header** | `X-API-Version: 1` | Clean URIs | Hidden, harder to test in browser |
| **Content negotiation** | `Accept: application/vnd.api+json;version=1` | Most RESTful, media type evolution | Complex, tooling support varies |

**Pragmatic recommendation**: URI path versioning (`/v1/`, `/v2/`) for public APIs. Header or
content negotiation for internal APIs. Regardless of strategy: avoid breaking changes. Prefer
additive, backwards-compatible evolution. Deprecate with `Sunset` header (RFC 8594).

---

## 3. GraphQL

### Schema-First Design

Define the schema (types, queries, mutations) before implementation. The schema is the contract.

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  orders(first: Int, after: String): OrderConnection!
}

type Order {
  id: ID!
  total: Money!
  status: OrderStatus!
  items: [OrderItem!]!
}

enum OrderStatus {
  PENDING
  SHIPPED
  DELIVERED
  CANCELLED
}

input CreateOrderInput {
  userId: ID!
  items: [OrderItemInput!]!
}
```

### Queries, Mutations, Subscriptions

| Operation | Purpose | Analogy |
|---|---|---|
| **Query** | Read data (declarative, client specifies shape) | GET |
| **Mutation** | Write data (create, update, delete) | POST/PUT/DELETE |
| **Subscription** | Real-time updates via WebSocket | Server-Sent Events |

```graphql
# Query — client gets exactly what it needs
query {
  user(id: "123") {
    name
    orders(first: 5) {
      edges {
        node { id, total, status }
      }
    }
  }
}

# Mutation — explicit input/output types
mutation {
  createOrder(input: { userId: "123", items: [...] }) {
    order { id, status }
    errors { field, message }
  }
}

# Subscription
subscription {
  orderStatusChanged(orderId: "456") {
    status
    updatedAt
  }
}
```

### Type System

- **Scalar types**: `Int`, `Float`, `String`, `Boolean`, `ID`, plus custom scalars (`DateTime`, `Money`)
- **Object types**: Named fields with types
- **Input types**: Separate types for mutation arguments (cannot reuse output types)
- **Enums**: Finite set of allowed values
- **Interfaces / Unions**: Polymorphism (`SearchResult = User | Product | Order`)
- **Non-null**: `!` suffix means field is guaranteed non-null

### N+1 Problem and DataLoader

GraphQL resolvers execute per-field. Nested queries cause N+1 database calls:

```
query { users { orders { items } } }
# 1 query for users + N queries for orders + M queries for items
```

**DataLoader** solves this by batching and caching within a single request:

1. Collect all IDs requested in a single tick of the event loop
2. Make one batched query (`SELECT * FROM orders WHERE user_id IN (...)`)
3. Cache results for the duration of the request

DataLoader is per-request (not a global cache). It is essential infrastructure for any
production GraphQL server.

### When to Use GraphQL vs REST

| Use GraphQL When | Use REST When |
|---|---|
| Multiple clients need different data shapes | Single client or uniform data needs |
| Deep, nested data with variable depth | Flat resources, simple CRUD |
| Frontend-driven query requirements | Server-driven, well-defined operations |
| Aggregating data from multiple backend services | Single data source per endpoint |
| Rapid UI iteration requiring flexible queries | Stable, cacheable resources (HTTP caching) |
| Mobile apps needing bandwidth optimization | Public APIs needing broad tooling support |

**GraphQL trade-offs**: No HTTP caching (everything is POST), complexity budget for query
analysis, requires rate limiting by query cost not request count, harder to secure
(field-level authorization).

---

## 4. gRPC

### Protocol Buffers (Protobuf)

Binary serialization format. Schema defines messages and services:

```protobuf
syntax = "proto3";
package orders;

message Order {
  string id = 1;
  string customer_id = 2;
  repeated OrderItem items = 3;
  OrderStatus status = 4;
  google.protobuf.Timestamp created_at = 5;
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_SHIPPED = 2;
  ORDER_STATUS_DELIVERED = 3;
}

message OrderItem {
  string product_id = 1;
  int32 quantity = 2;
  int64 price_cents = 3;
}
```

Field numbers are the wire format identity — never reuse or change them. Add new fields freely
(forward/backward compatible). Mark removed fields as `reserved`.

### Service Definition and RPC Types

```protobuf
service OrderService {
  // Unary: one request, one response
  rpc GetOrder(GetOrderRequest) returns (Order);

  // Server streaming: one request, stream of responses
  rpc ListOrders(ListOrdersRequest) returns (stream Order);

  // Client streaming: stream of requests, one response
  rpc UploadOrderBatch(stream Order) returns (BatchResult);

  // Bidirectional streaming: both sides stream
  rpc OrderChat(stream OrderMessage) returns (stream OrderMessage);
}
```

| RPC Type | Pattern | Use Case |
|---|---|---|
| **Unary** | Request → Response | Standard request/response (most common) |
| **Server streaming** | Request → Stream of responses | Large result sets, real-time feeds |
| **Client streaming** | Stream of requests → Response | Bulk uploads, telemetry |
| **Bidirectional** | Stream ↔ Stream | Chat, collaborative editing, multiplexed I/O |

### When to Use gRPC

- **Internal service-to-service** communication (not browser-facing without gRPC-Web)
- **High performance**: Binary protocol, HTTP/2 multiplexing, ~10x smaller than JSON
- **Streaming**: Native bidirectional streaming support
- **Strong contracts**: Protobuf schema with codegen for type-safe clients/servers
- **Polyglot**: First-class codegen for 10+ languages
- **Deadlines/timeouts**: Built-in propagation across service boundaries

**Not suitable for**: Browser clients (without proxy/gRPC-Web), human-debuggable APIs,
public APIs with diverse consumer tooling.

---

## 5. Backend for Frontend (BFF)

### Pattern

One dedicated backend per frontend type. Each BFF aggregates, transforms, and optimizes
API responses for its specific client.

```
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Web SPA  │   │ Mobile   │   │ 3rd Party│
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │
┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐
│ Web BFF  │  │Mobile BFF│  │Public API│
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │              │              │
     └──────────┬───┘──────────────┘
                │
    ┌───────────▼───────────┐
    │   Domain Services      │
    │  (Orders, Users, etc.) │
    └───────────────────────┘
```

### BFF Responsibilities

- **Aggregation**: Combine data from multiple domain services into one response
- **Transformation**: Reshape data for client needs (flatten nested structures for mobile)
- **Optimization**: Field selection, payload compression, image resizing for mobile
- **Authentication**: Handle client-specific auth flows (OAuth for web, device tokens for mobile)
- **Client-specific logic**: Web needs different pagination than mobile infinite scroll

### BFF as Anti-Corruption Layer (DDD Connection)

The BFF acts as an **ACL** between the frontend bounded context and domain service contexts:

- Translates domain model concepts into UI-friendly representations
- Shields frontend from domain model changes
- Prevents domain concepts from leaking into UI layer
- Owned by the frontend team (not the domain service team)

---

## 6. API Gateway Patterns

### Core Capabilities

| Capability | Description |
|---|---|
| **Routing** | Route requests to appropriate backend services based on path, headers, method |
| **Rate limiting** | Throttle requests per client/API key/IP. Token bucket or sliding window |
| **Authentication** | Validate JWT, API keys, OAuth tokens before forwarding to services |
| **Authorization** | Coarse-grained access control (fine-grained belongs in services) |
| **Circuit breaking** | Stop forwarding to failing services, return fallback responses |
| **Load balancing** | Distribute requests across service instances |
| **Request/response transformation** | Header injection, body transformation, protocol translation |
| **Caching** | Cache GET responses at the edge |
| **Observability** | Centralized logging, metrics, distributed tracing injection |
| **TLS termination** | Handle HTTPS at the gateway, forward HTTP internally |

### API Gateway vs BFF

The gateway handles **cross-cutting concerns** (auth, rate limiting, TLS). The BFF handles
**client-specific logic** (aggregation, transformation). They are complementary:

```
Client → API Gateway (auth, rate limit) → BFF (aggregate, transform) → Domain Services
```

### AWS API Gateway / AppSync

| Service | Protocol | Use Case |
|---|---|---|
| **API Gateway (REST)** | REST/HTTP | RESTful APIs with Lambda/ECS/HTTP backends |
| **API Gateway (HTTP API)** | HTTP | Lower-cost, lower-latency HTTP proxy |
| **API Gateway (WebSocket)** | WebSocket | Real-time bidirectional communication |
| **AppSync** | GraphQL | Managed GraphQL with real-time subscriptions, DynamoDB/Lambda resolvers |

API Gateway features: Usage plans, API keys, custom authorizers (Lambda), request validation,
WAF integration, canary deployments, stage variables.

AppSync features: Schema-first GraphQL, resolver mapping templates (VTL or JS), pipeline
resolvers, built-in caching, conflict detection for offline clients, Cognito/IAM/OIDC auth.

---

## 7. Connection to DDD and Other Methodologies

### DDD Strategic Patterns → API Concepts

| DDD Pattern | API Manifestation |
|---|---|
| **Published Language** | API specification (OpenAPI, Protobuf, GraphQL schema) |
| **Open Host Service** | Public API — a well-defined protocol for external consumers |
| **Anticorruption Layer** | API translation layer (BFF, adapter service, gateway transform) |
| **Bounded Context** | API boundary — one API per BC, own data, own deployment |
| **Customer-Supplier** | Consumer-driven contract testing relationship |
| **Conformist** | Client that conforms to provider's API without translation |
| **Context Map** | API dependency map across the system |

### One API per Bounded Context

Each bounded context exposes its own API. This API is the **only** way to interact with that
context's data and behavior. No shared databases, no backdoor access.

```
┌─────────────────┐    API    ┌─────────────────┐
│  Order Context   │◄────────►│ Payment Context  │
│  /orders/*       │          │ /payments/*      │
│  (owns order DB) │          │ (owns payment DB)│
└─────────────────┘           └─────────────────┘
```

### Contract Testing Validates API Contracts

Consumer-driven contract testing (Pact) validates that:

- **Consumers** get the responses they expect (consumer tests generate contracts)
- **Providers** satisfy all consumer contracts (provider verification)
- **Breaking changes** are caught before deployment (broker-based CI/CD gating)

This is the testing mechanism for Published Language / Open Host Service boundaries.

### Event Modeling → API Endpoints

Event Modeling's four patterns map directly to HTTP operations:

| Event Modeling Pattern | HTTP Mapping | Description |
|---|---|---|
| **Command** (blue) | `POST /aggregate/{id}/action` | State-changing intention, returns events or errors |
| **Read Model / View** (green) | `GET /views/view-name` | Query a projection, no side effects |
| **Automation** (lilac) | Internal (no API) | Triggered by events, emits commands — system-internal |
| **Translation** (pink) | Webhook / integration endpoint | Receives external events, translates to internal commands |

Commands map to POST endpoints. Views map to GET endpoints. This creates a natural CQRS-over-HTTP pattern.

### AsyncAPI for Event-Driven APIs

AsyncAPI is the OpenAPI equivalent for event-driven architectures:

```yaml
asyncapi: '2.6.0'
info:
  title: Order Events
  version: '1.0.0'
channels:
  orders/created:
    publish:
      message:
        payload:
          type: object
          properties:
            orderId: { type: string }
            customerId: { type: string }
            total: { type: number }
```

- Describes message brokers, channels, message formats
- Supports Kafka, AMQP, MQTT, WebSocket, SNS/SQS
- Enables codegen for producers and consumers
- Complements OpenAPI: synchronous APIs use OpenAPI, asynchronous events use AsyncAPI
- **Connection to EDA**: Every domain event published to a message broker should be documented
  in an AsyncAPI spec — this is the Published Language for event-driven bounded context integration

---

## Quick Decision Matrix

```
┌─────────────────────────────────────────────────────────┐
│                  Which API Style?                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Public API, broad tooling?          → REST (Level 2)   │
│  Multiple UI clients, varying needs? → GraphQL + BFF    │
│  Internal service-to-service?        → gRPC             │
│  High-perf, low-latency internal?    → gRPC             │
│  Event-driven integration?           → AsyncAPI + Broker│
│  Real-time bidirectional?            → gRPC streaming    │
│                                      or WebSocket       │
│                                                         │
│  Mix and match: gRPC internally,                        │
│  REST/GraphQL at the edge, AsyncAPI for events          │
└─────────────────────────────────────────────────────────┘
```
