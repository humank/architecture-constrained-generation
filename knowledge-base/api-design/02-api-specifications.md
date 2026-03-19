# API Specifications and Patterns

## 1. OpenAPI Specification (OAS 3.1)

### What It Is

Machine-readable description of an HTTP API. OAS 3.1 aligns fully with JSON Schema (draft 2020-12), eliminating prior divergences. The spec file (YAML or JSON) is the single source of truth for API shape, behavior, and documentation.

### Structure

```yaml
openapi: "3.1.0"
info:                    # API metadata: title, version, description, contact, license
servers:                 # Base URLs (production, staging, sandbox)
paths:                   # Endpoints: path + HTTP method -> operation
  /users/{id}:
    get:
      summary: Get user by ID
      parameters: [...]
      responses:
        '200':
          content:
            application/json:
              schema: { $ref: '#/components/schemas/User' }
components:
  schemas:               # Reusable data models (JSON Schema)
  parameters:            # Reusable path/query/header parameters
  responses:             # Reusable response definitions
  requestBodies:         # Reusable request bodies
  securitySchemes:       # Auth definitions (OAuth2, API key, Bearer, OpenID Connect)
  headers:               # Reusable headers
security:                # Global security requirements
tags:                    # Grouping for documentation
```

### Schema Definition with JSON Schema

OAS 3.1 schemas ARE JSON Schema (draft 2020-12). Key capabilities:
- `type`, `properties`, `required`, `additionalProperties`
- Composition: `allOf` (merge), `oneOf` (exactly one), `anyOf` (at least one)
- `$ref` for reuse: `$ref: '#/components/schemas/Address'`
- `discriminator` for polymorphism (maps a property value to a schema)
- `format` keywords: `date-time`, `email`, `uri`, `uuid`
- `nullable` removed in 3.1 — use `type: ["string", "null"]` instead

### Code Generation

**Server stubs**: Generate route handlers, request/response types, validation middleware from spec.
- Tools: openapi-generator, oapi-codegen (Go), NSwag (.NET), OpenAPI Generator (40+ languages)
- Output: typed request/response models, route registration, serialization

**Client SDKs**: Generate typed HTTP clients from spec.
- Tools: openapi-generator, Kiota (Microsoft), orval (TypeScript)
- Output: typed methods per operation, request builders, response deserialization

**Best practice**: Regenerate on spec change. Never hand-edit generated code — customize via templates or extension points.

### Documentation Generation

- **Swagger UI**: Interactive explorer with "Try it out" button. Reads spec at runtime.
- **Redoc**: Clean three-panel layout. Better for public documentation.
- **Stoplight Elements**: Embeddable, customizable.
- All render from the same spec file — documentation is always current.

### Validation

Request/response validation middleware reads the spec and enforces it at runtime:
- **express-openapi-validator** (Node.js): validates incoming requests and outgoing responses against spec
- **connexion** (Python/Flask): routes and validates automatically from spec
- **committee** (Ruby): request/response validation rack middleware

Validation catches: missing required fields, wrong types, unknown parameters, invalid enum values, pattern mismatches.

### Design-First vs Code-First

| Aspect | Design-First | Code-First |
|--------|-------------|-----------|
| **Flow** | Write spec → generate code | Write code → generate spec |
| **When** | Multi-team APIs, public APIs, contract-first | Internal APIs, rapid prototyping |
| **Pros** | Parallel frontend/backend dev, early review, consistent | Fast iteration, spec always matches code |
| **Cons** | Spec maintenance overhead | Spec is afterthought, often incomplete |
| **Tools** | Stoplight Studio, Swagger Editor | springdoc (Java), tsoa (TS), FastAPI (Python) |

**Recommendation**: Design-first for inter-team and public APIs. Code-first acceptable for internal APIs within a single team, but always generate and publish the spec.

---

## 2. AsyncAPI

### What It Is

The OpenAPI equivalent for event-driven and message-driven APIs. Describes asynchronous communication — who publishes what messages on which channels, using which protocols.

### Structure

```yaml
asyncapi: "3.0.0"
info:                    # API metadata (same concept as OpenAPI)
servers:                 # Broker URLs with protocol (kafka, amqp, ws, sns, sqs)
channels:                # Named communication channels (topics, queues, exchanges)
  user/signedup:
    address: user/signedup
    messages:
      UserSignedUp:
        $ref: '#/components/messages/UserSignedUp'
operations:              # Publish/subscribe operations bound to channels
  onUserSignedUp:
    action: receive
    channel: { $ref: '#/channels/user~1signedup' }
components:
  messages:              # Reusable message definitions
    UserSignedUp:
      payload:
        $ref: '#/components/schemas/UserSignedUpPayload'
  schemas:               # JSON Schema (same as OpenAPI)
  securitySchemes:       # Auth for brokers
```

### Protocol Bindings

Bindings add protocol-specific configuration to channels, operations, and messages:

| Protocol | Binding Examples |
|----------|-----------------|
| **Kafka** | `groupId`, `clientId`, partition key, topic config |
| **AMQP** | Exchange type, queue durability, routing key, prefetch |
| **SNS/SQS** | Topic ARN, queue URL, filter policy, dead letter queue |
| **WebSocket** | Headers, query params for connection |
| **EventBridge** | Event bus name, detail-type, source |

Bindings are optional — the core spec is protocol-agnostic.

### Code Generation

- **AsyncAPI Generator**: Templates for Node.js, Java, Python, Go
- Produces: message models, publisher/subscriber scaffolding, channel handlers
- Template ecosystem: `@asyncapi/nodejs-template`, `@asyncapi/java-spring-template`
- **Modelina**: Schema-to-model code generator (TypeScript, Java, Go, Python, C#)

### Relationship to OpenAPI

Same philosophy: machine-readable spec → code generation, documentation, validation, contract testing. OpenAPI describes request-response; AsyncAPI describes publish-subscribe. Both use JSON Schema for data models. Both feed the same downstream toolchain pattern.

### Connection to Event Modeling

Event Modeling identifies domain events in swimlanes. These events become AsyncAPI messages:
- Each **swimlane** maps to an AsyncAPI **channel**
- Each **event** in Event Modeling maps to an AsyncAPI **message**
- Command handlers (blue stickies) map to **publish operations**
- Read model updaters (green stickies) map to **subscribe operations**
- The Event Model is the design artifact; AsyncAPI is the machine-readable specification

### Connection to Contract Testing

AsyncAPI specs serve as the **provider contract** for event-driven services:
- **Pact message contracts** verify producer/consumer compatibility at the code level
- **AsyncAPI spec** defines the canonical event schema (Published Language)
- **Bi-directional contract testing**: compare consumer Pact files against AsyncAPI spec
- Schema registries (Confluent, AWS Glue) enforce AsyncAPI-derived schemas at the broker level

---

## 3. Protocol Buffers (Protobuf)

### Proto3 Syntax

```protobuf
syntax = "proto3";
package order.v1;

import "google/protobuf/timestamp.proto";

message Order {
  string id = 1;                           // Field number (never reuse)
  Customer customer = 2;                   // Nested message
  repeated LineItem items = 3;             // List
  OrderStatus status = 4;                  // Enum
  google.protobuf.Timestamp created_at = 5;
  oneof payment {                          // Exactly one of
    CreditCard credit_card = 6;
    BankTransfer bank_transfer = 7;
  }
  optional string note = 8;               // Explicit presence tracking
  map<string, string> metadata = 9;       // Key-value map
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;            // Always have 0 = unspecified
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_CONFIRMED = 2;
  ORDER_STATUS_SHIPPED = 3;
}

message LineItem {
  string product_id = 1;
  int32 quantity = 2;
  int64 price_cents = 3;                   // Use int64 for money (cents)
}
```

### Service Definitions for gRPC

```protobuf
service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc ListOrders(ListOrdersRequest) returns (stream Order);       // Server streaming
  rpc UploadOrders(stream Order) returns (UploadResponse);        // Client streaming
  rpc OrderChat(stream OrderMessage) returns (stream OrderMessage); // Bidirectional
}
```

Four RPC types: unary, server streaming, client streaming, bidirectional streaming.

### Backward/Forward Compatibility Rules

**Safe changes** (backward + forward compatible):
- Add new fields (with new field numbers)
- Add new enum values
- Add new `oneof` members
- Add new RPC methods to a service
- Remove fields (but `reserve` the number)
- Rename fields (wire format uses numbers, not names)

**Breaking changes**:
- Change a field number
- Change a field type (e.g., `int32` → `string`)
- Remove or reuse a field number without `reserved`
- Change `repeated` to scalar or vice versa
- Rename a service or RPC method (affects generated code)

### Schema Evolution

```protobuf
message Order {
  string id = 1;
  string customer_id = 2;
  reserved 3, 4;                  // Prevent reuse of removed field numbers
  reserved "old_field_name";      // Prevent reuse of removed field names
  string new_field = 5;           // Safe addition
}
```

**Rules for evolution**:
1. Never change field numbers
2. Never reuse field numbers — use `reserved`
3. New fields should have sensible zero-value defaults (proto3 default)
4. Use `optional` for fields where absence vs zero-value matters
5. Prefix enum values with enum name (`ORDER_STATUS_PENDING`, not `PENDING`)
6. Always include `UNSPECIFIED = 0` enum value

---

## 4. JSON Schema

### Type System

Seven primitive types: `string`, `number`, `integer`, `boolean`, `null`, `array`, `object`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/user",
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "email": { "type": "string", "format": "email" },
    "age": { "type": "integer", "minimum": 0, "maximum": 150 },
    "roles": {
      "type": "array",
      "items": { "type": "string", "enum": ["admin", "user", "editor"] },
      "minItems": 1,
      "uniqueItems": true
    },
    "address": { "$ref": "#/$defs/Address" }
  },
  "required": ["id", "email"],
  "additionalProperties": false,
  "$defs": {
    "Address": {
      "type": "object",
      "properties": {
        "street": { "type": "string" },
        "city": { "type": "string" }
      }
    }
  }
}
```

### Key Validation Keywords

| Category | Keywords |
|----------|----------|
| **String** | `minLength`, `maxLength`, `pattern` (regex), `format` |
| **Number** | `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf` |
| **Array** | `items`, `minItems`, `maxItems`, `uniqueItems`, `contains`, `prefixItems` |
| **Object** | `properties`, `required`, `additionalProperties`, `minProperties`, `maxProperties`, `patternProperties` |
| **Conditional** | `if`/`then`/`else`, `dependentRequired`, `dependentSchemas` |

### Composition Keywords

- **`allOf`**: Must match ALL schemas. Use for inheritance/extension (base + additions).
- **`oneOf`**: Must match EXACTLY ONE schema. Use for discriminated unions.
- **`anyOf`**: Must match AT LEAST ONE schema. Use for loose union types.
- **`not`**: Must NOT match the schema.

**`$ref`**: Reference another schema by URI or JSON pointer. Enables reuse and modularity.

### Where JSON Schema Is Used

- **OpenAPI 3.1**: Schema objects ARE JSON Schema (draft 2020-12)
- **AsyncAPI**: Schema objects ARE JSON Schema
- **JSON Schema Validation**: Standalone validation (ajv, jsonschema, everit)
- **JSON:API**: Resource schema validation
- **IDE support**: VS Code, IntelliJ use JSON Schema for autocomplete in JSON/YAML files

---

## 5. API Versioning Strategies

### Strategies Compared

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| **URI path** | `/v1/users` | Explicit, cacheable, simple routing | URL pollution, client must update URLs |
| **Query parameter** | `/users?version=1` | Easy to add, optional | Easy to forget, cache key complexity |
| **Custom header** | `X-API-Version: 1` | Clean URLs, flexible | Hidden, not visible in browser, harder to test |
| **Content negotiation** | `Accept: application/vnd.api.v1+json` | RESTful, granular per resource | Complex, poor tooling support, hard to debug |

### Recommendations by Context

- **Public API (many unknown consumers)**: URI path versioning. Most discoverable, easiest to document, simplest for consumers.
- **Internal microservices**: Content negotiation or custom header. Clean URLs, version only when breaking changes occur.
- **gRPC**: Package versioning (`order.v1.OrderService`). Built into proto package naming.
- **GraphQL**: No versioning — evolve schema additively. Deprecate fields with `@deprecated`.
- **Event-driven**: Schema registry compatibility modes (backward, forward, full). Embed schema version in message metadata.

### Expand-Contract Pattern (Non-Breaking Changes)

The expand-contract pattern enables **zero-downtime API evolution** without version bumps:

1. **Expand**: Add new field/endpoint alongside existing one. Both work. No consumers break.
2. **Migrate**: Consumers switch to new field/endpoint at their own pace. Monitor usage of old field.
3. **Contract**: Remove old field/endpoint once all consumers have migrated. Verify via analytics or contract tests.

**Connection to CD database migration pattern**: Same principle as parallel change (expand-contract) for database schemas:
- Add new column (expand) → backfill data → update application → drop old column (contract)
- API expand-contract and DB expand-contract often happen together in the same deployment sequence

**Connection to contract testing**: `can-i-deploy` confirms all consumers have migrated before the "contract" phase. Consumer-driven contracts show exactly which consumers still depend on the old field.

---

## 6. API Documentation Best Practices

### Living Documentation

Documentation generated from the spec file is always current. Manual documentation drifts.

**Implementation**:
- Serve Swagger UI / Redoc from the spec file in CI/CD
- Regenerate docs on every merge to main
- Embed spec in API gateway (AWS API Gateway imports OpenAPI)
- Version docs alongside code (spec file lives in the repo)

### Examples for Every Endpoint

Every operation should include:
- **Request example**: complete, realistic payload (not `"string"`)
- **Response example**: complete body for each status code
- **Parameter examples**: realistic values for path/query params
- Use OpenAPI `example` / `examples` fields — they render in Swagger UI and Redoc
- Multiple examples per operation: success case, error cases, edge cases

### Error Catalog

Define a **standard error format** and document all known errors:

```yaml
ErrorResponse:
  type: object
  properties:
    code:    { type: string, example: "VALIDATION_ERROR" }
    message: { type: string, example: "Email is required" }
    details: { type: array, items: { $ref: '#/components/schemas/ErrorDetail' } }
    traceId: { type: string, format: uuid }
```

- Enumerate error codes in a dedicated section
- Map HTTP status codes to business error codes
- Include resolution guidance for each error

### Authentication Guide

- Document auth flows with sequence diagrams
- Provide copy-pasteable examples for token acquisition
- Show header format: `Authorization: Bearer <token>`
- Document token refresh, expiration, scopes
- Include a "Getting Started" section with auth as step 1

### Rate Limiting Documentation

- Document limits per endpoint or tier (e.g., 100 req/min for free, 1000 for paid)
- Document response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Document 429 response format and `Retry-After` header
- Provide guidance on backoff strategies

---

## 7. Connection to Architecture

### OpenAPI/AsyncAPI as Published Language (DDD)

In DDD, **Published Language** is a well-documented shared format for inter-context communication. OpenAPI and AsyncAPI specs ARE Published Language artifacts:
- OpenAPI spec = Published Language for synchronous (request-response) integration
- AsyncAPI spec = Published Language for asynchronous (event-driven) integration
- Both define the shared vocabulary at the boundary between bounded contexts
- The spec file is the **machine-readable** form of the Published Language

### Spec Files Feed Contract Testing

OpenAPI and AsyncAPI specs are inputs to contract testing:
- **Pact bi-directional**: Provider publishes OpenAPI spec; broker compares against consumer pacts
- **Dredd / Schemathesis**: Validate provider implementation against its own OpenAPI spec
- **AsyncAPI + Schema Registry**: Enforce message schemas at the broker level
- **Protovalidate / buf**: Lint and break-detect for Protobuf schemas

**Flow**: Spec file → contract test → CI gate → safe deployment.

### API Specs as C4 Level 3 Documentation

C4 Model Level 3 (Component diagram) shows internal components of a container. API specs enrich L3:
- Each API endpoint maps to a component or component interaction
- OpenAPI operations document the **interface** of components exposed over HTTP
- AsyncAPI channels document the **events** components publish/consume
- Link from C4 component to its API spec for drill-down detail
- Structurizr DSL can reference external spec URLs in component descriptions

### API Versioning and Continuous Delivery

API versioning directly supports CD's backward compatibility requirement:
- **Expand-contract** enables deploy-at-any-time without coordinated releases
- **Semantic versioning** of APIs signals breaking vs non-breaking changes to consumers
- **Contract tests in the deployment pipeline** gate releases on API compatibility
- **Feature flags** can control API version rollout (expose v2 to percentage of traffic)
- CD principle: "Every change is a release candidate" — API changes must be independently deployable

### AsyncAPI Channels Map to Event Modeling Swimlanes

Event Modeling organizes events into horizontal swimlanes by aggregate/stream. AsyncAPI channels capture the same structure:

| Event Modeling | AsyncAPI |
|---------------|----------|
| Swimlane (aggregate stream) | Channel |
| Domain event (orange sticky) | Message |
| Command (blue sticky) | Publish operation |
| Read model update (green sticky) | Subscribe operation |
| Slice (vertical cut) | Subset of operations + messages |

The Event Model is the whiteboard design; the AsyncAPI spec is its machine-readable implementation contract.

---

## Sources

- [OpenAPI Specification 3.1.0](https://spec.openapis.org/oas/v3.1.0)
- [AsyncAPI Specification 3.0.0](https://www.asyncapi.com/docs/reference/specification/v3.0.0)
- [Protocol Buffers Language Guide (proto3)](https://protobuf.dev/programming-guides/proto3/)
- [JSON Schema Specification (2020-12)](https://json-schema.org/specification)
- [gRPC Documentation](https://grpc.io/docs/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Redoc](https://redocly.com/redoc/)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [AsyncAPI Generator](https://www.asyncapi.com/tools/generator)
- [Pact Documentation — Bi-Directional Contract Testing](https://docs.pact.io/pact_broker/advanced_topics/provider_verification_results)
- [PactFlow — Bi-Directional Contract Testing](https://pactflow.io/bi-directional-contract-testing/)
- [Buf — Protobuf Linting and Breaking Change Detection](https://buf.build/)
