# Contract Testing -- Complete Reference

## 1. Core Concepts

### What Is a Contract?

A **contract** defines how two systems communicate. It captures:

- **API shape**: endpoints, methods, paths, query parameters
- **Request format**: headers, body structure, required/optional fields
- **Response format**: status codes, body structure, data types
- **Behavior guarantees**: what response a given request produces under specific conditions
- **Error scenarios**: expected error codes, error body formats

A contract is NOT just a schema. Schemas are abstract (they describe data structure); contracts are concrete (they describe actual interactions with examples). A schema says "this field is a string"; a contract says "when consumer sends GET /users/123, provider responds with status 200 and body { name: 'Alice' }."

Key distinction (PactFlow): "Schemas are abstract, contracts are concrete." Schemas cannot standardly express HTTP-level semantics (verb, path, status code, headers). Systems can appear "compatible" with schemas without fully implementing specifications.

### Provider (Upstream) vs Consumer (Downstream)

- **Provider** (upstream): the application that provides functionality or data via an API. It receives requests and sends responses.
- **Consumer** (downstream): the application that makes use of the provider's functionality. It sends requests and processes responses.

A single service can be both a consumer (of services it calls) and a provider (of its own API).

### Consumer-Driven Contracts (CDC)

In CDC, the **consumer defines expectations** of the provider:

1. Consumer writes tests describing the requests it will make and the responses it expects
2. These tests generate a **contract file** (the "pact")
3. The provider verifies its implementation satisfies all consumer contracts
4. Contracts are stored centrally (broker) for sharing and tracking

The consumer *drives* the contract because it defines what it actually needs, not what the provider thinks it should need. This inverts the traditional provider-first approach.

**Key benefit**: The provider only needs to satisfy what consumers actually use, not its entire API surface. This enables safe evolution -- unused endpoints can change freely.

**Workflow**:
- Consumer publishes contract -> Provider verifies -> Results published -> Deployment gated by verification status

### Provider-Driven Contracts

In provider-driven testing, the **provider publishes its schema** (e.g., OpenAPI spec, Protobuf definition), and consumers validate their usage against it:

- Provider maintains an authoritative specification
- Consumers run tests confirming their requests conform to the spec
- Changes to the spec are validated against consumer expectations

**When to use**: Public APIs, third-party integrations where consumers cannot drive contracts, APIs with many unknown consumers.

### Bi-Directional Contract Testing (BDCT)

BDCT compares **two independently published contracts**:

- **Consumer contract**: generated from consumer tests (using any mocking tool -- Wiremock, MSW, Cypress, Mountebank)
- **Provider contract**: generated from provider's OpenAPI spec verified against real implementation (using RestAssured, Dredd, Postman)

A central broker performs **schema comparison** to verify the consumer contract is a valid subset of the provider contract.

**Key differences from CDC**:
- No direct dependency between consumer and provider test execution
- Broader team participation (QAs, SDETs, testers can author tests)
- Reuses existing test infrastructure and API documentation
- No provider states needed
- Currently supported by PactFlow

**Supported contract types**: Pact, OpenAPI Specification, with planned support for SOAP/XSD, Protobuf, GraphQL, Postman Collections.

---

## 2. Pact Framework (Reference Implementation)

### Overview

Pact is a **code-first consumer-driven contract testing tool**. The contract is generated during execution of automated consumer tests. Pact is the industry standard with multi-language support (JVM, JavaScript, Ruby, Go, Python, .NET, Rust).

### Consumer Test: Defining Interactions

Consumer tests follow a fluent DSL with the BDD-style pattern:

```
Given [provider state]
Upon Receiving [request description]
With Request [method, path, headers, body]
Will Respond With [status, headers, body]
```

Concrete DSL example:
```
.addInteraction()
  .given("user 123 exists")              // Provider state
  .uponReceiving("a request for user 123") // Human-readable description
  .withRequest("GET", "/users/123")        // Method + path
  .willRespondWith(200, responseBuilder)   // Expected response
  .executeTest(async (mockserver) => {
    // Call REAL consumer code against mockserver URL
    const user = await apiClient.getUser(123);
    expect(user.name).to.equal("Alice");
  })
```

**Critical rules for consumer tests**:
1. Always exercise **real consumer code** (import actual API client classes), never make raw HTTP calls in tests
2. Use **one interaction per test** for clarity
3. Only include scenarios where omitting them would miss a bug in the consumer
4. For requests: **exact matching** is most appropriate (same person writes expectation and actual request)
5. For responses: **loose/type-based matching** is recommended (provider may include extra fields)
6. Pact acts as a **mock** (calls are verified), not a stub (calls are not verified)
7. Do not test UI layers with Pact; test isolated, unit-level API client code
8. Never include sensitive data; use matchers or fake data

### Pact File: The Contract Artifact

When consumer tests pass, Pact generates a **pact file** (JSON):
- Contains all defined interactions (request/response pairs)
- Includes metadata (consumer name, provider name, specification version)
- Includes matching rules and generators
- Deterministic -- avoid dynamic data without fixed examples

The pact file is the serialized contract that gets shared with the provider.

### Provider Verification

Provider verification replays consumer expectations against the real provider:

1. Pact framework reads the pact file
2. For each interaction:
   a. Sets up the **provider state** (e.g., "user 123 exists")
   b. Sends the request from the pact to the real provider
   c. Compares actual response with the **minimal expected response**
3. Verification passes if actual response contains **at least** the data described in the expected response (extra fields are OK)
4. Results are published to the Pact Broker

### Provider States

Provider states describe preconditions needed on the provider side:

- Declared in consumer tests via `given("state description")`
- Provider implements a state setup handler (e.g., POST /test/setup or programmatic hooks)
- Examples: "user 123 exists", "no products exist", "user is authenticated"
- States should use **business language**, not technical details
- Each interaction can have its own provider state

**Purpose**: Enable the provider to set up the right test data before replaying the interaction. This is the "Given" in the Given/When/Then pattern.

### Pact Broker

The **Pact Broker** is a central service for sharing contracts and verification results:

**Core features**:
- RESTful API for publishing and retrieving pacts
- Automatic contract versioning
- Autogenerated HTML documentation for each pact
- Diff viewing between pact versions
- Provider verification result storage and display
- **Compatibility matrix**: grid showing which consumer/provider version pairs have been tested
- Dynamically generated **network diagrams** for microservice relationships
- Tags and branches for version management
- Webhook support
- HAL API browser

**Deployment models**: Self-hosted open source, PactFlow (managed SaaS), Docker, Kubernetes.

### Can-I-Deploy

The `can-i-deploy` CLI tool is the **deployment safety gate**:

**How it works**:
1. Query: "Can application A version X deploy to environment Y?"
2. Broker checks the matrix for verification results between version X and ALL currently deployed versions of integrated applications in that environment
3. Returns success (exit 0) only if all integrations have passing verifications
4. Returns failure (exit 1) if any integration lacks successful verification

**Usage**:
```bash
# Check before deploying to production
pact-broker can-i-deploy \
  --pacticipant Foo --version 23 \
  --to-environment production

# After successful deployment, record it
pact-broker record-deployment \
  --pacticipant Foo --version 23 \
  --environment production
```

**Advanced features**:
- **Polling**: waits for pending verification results from triggered provider builds
- **Ignoring integrations**: excludes newly added providers lacking verification
- **Dry-run mode**: tests pipeline without blocking
- **Multiple explicit versions**: check compatibility between specific versions

### Pending Pacts

**Problem**: Without pending pacts, any failing contract (even new, unimplemented features) breaks the provider's build, blocking deployment even when existing integrations work.

**Solution**: Pending pacts dynamically mark contract versions as "pending" until first successful verification.

**How it works**:
- A pact is **pending** for all branches of a provider until the first successful verification is published
- **Pending pact failures** do NOT cause build failure (build continues)
- **Non-pending pact failures** DO cause build failure (backward compatibility protected)
- Failed verifications still report to Broker as failures (blocking consumer deployment via can-i-deploy)

**State transitions**:
- Once a provider branch publishes a successful verification, that pact becomes non-pending for that branch
- It becomes non-pending for all future new provider branches
- It remains pending for pre-existing branches that haven't verified it

**Configuration**: Set `enablePending: true` in provider verification configuration.

### WIP (Work In Progress) Pacts

WIP pacts ensure **new contracts are automatically verified** in the provider's main pipeline without requiring configuration updates.

**Definition**: A WIP pact is the latest for its branch that lacks a successful verification result from the current provider branch and wasn't explicitly specified in consumer version selectors.

**Key differences from pending pacts**:

| Aspect | WIP Pacts | Pending Pacts |
|--------|-----------|---------------|
| Purpose | Auto-include new consumer contracts in provider verification | Prevent new expectations from blocking provider builds |
| Scope | Collection of unverified pacts | Status of individual pacts |
| Pending flag | Always true | Dynamically calculated |

**Configuration**: Set `includeWipPactsSince: "2024-01-01"` (date from which changed pacts should be verified). Recommended window: 30 days to 3 months.

**Selection logic**:
1. Identify head pacts (latest per branch)
2. Remove pacts already in explicit consumer version selectors
3. Apply date filter (exclude pacts before includeWipPactsSince)
4. Filter out pacts with successful verifications

### Webhooks

Webhooks trigger HTTP requests on contract testing events:

**Event types**:
1. **contract_requiring_verification_published** (recommended): triggers once for each provider version missing verification for the newly published pact -- covers main branch and deployed versions
2. **contract_content_changed**: triggers when pact content differs from previous version (superseded by above)
3. **contract_published**: fires every time a pact is published
4. **provider_verification_published**: triggers when verification results are published
5. **provider_verification_succeeded / failed**: distinct events for targeted notifications

**Template parameters**: Dynamic variables like `${pactbroker.pactUrl}`, `${pactbroker.providerVersionNumber}`, `${pactbroker.providerVersionBranch}` pass metadata to CI systems.

**Typical workflow**: Consumer publishes pact -> webhook triggers provider verification build -> results published -> can-i-deploy gates deployment.

### Pact Nirvana (CI/CD Maturity Levels)

The Pact Nirvana guide defines maturity levels for CI/CD integration:

1. **Get Prepared**: Learn Pact fundamentals
2. **Talk**: Team alignment on strategy
3. **Bronze**: Get a single test working manually
4. **Silver**: Manual integration with Pact Broker (publish pacts, verify, publish results)
5. **Gold**: Integrate with PR pipelines (automated verification on pull requests)
6. **Platinum**: Add can-i-deploy with branch to PR pipelines (deployment readiness checks)
7. **Diamond**: Add Pact to deploy pipelines (full production deployment gates based on verified contracts)

---

## 3. Contract Testing Patterns

### REST API Contracts

The most common and well-supported pattern:
- Contract captures HTTP method, path, query parameters, headers, request body, response status, response headers, response body
- Matching rules support exact, type-based, regex, and array-like matching
- Provider states set up test data for specific scenarios
- Each consumer interaction tests one specific API call

### Message/Event Contracts (Async)

For queue-based systems (Kafka, RabbitMQ, SNS, SQS, ActiveMQ, Kinesis):

**Key principle**: Pact abstracts away the specific messaging technology. It does NOT replace the message broker at runtime. Instead, it "takes the place of the intermediary and confirms whether or not the consumer is able to handle a given event, or that the provider will be able to produce the correct message."

**Recommended architecture** -- Ports and Adapters (Hexagonal):
- **Adapter**: Protocol-specific code (e.g., AWS Lambda handler, Kafka consumer wrapper)
- **Port**: Domain logic unaware of queue implementation

**Consumer side**: Test the port that handles incoming messages -- verify the consumer can deserialize and process the message format correctly.

**Producer side**: Test the port that produces messages -- verify the producer creates correctly structured events.

**Message pact file**: Contains the expected message structure (not HTTP request/response pairs).

### GraphQL Contracts

GraphQL is an abstraction over HTTP, so contract testing works similarly to REST with specific considerations:

- Pact provides `addGraphQLInteraction()` with a fluent builder for queries/mutations
- Handles query/mutation body structure, operation naming, and variables automatically
- Response body is wrapped in the `data` sub-property, namespaced by the operation
- **Critical**: Queries and mutations must be formatted identically (including whitespace) in contract and actual code, or use "minified" GraphQL queries
- Tests query-specific response shapes rather than the full schema

### gRPC Contracts

Pact supports gRPC via the **pact-protobuf-plugin**:

- Matches and verifies Protobuf messages and gRPC service calls
- Starts a gRPC mock server based on the proto file for consumer testing
- **Why contract testing matters for Protobuf**: In Protobuf v3 all fields are optional, so introducing a new field on the provider means outdated clients/servers can still communicate at the wire level, but the common understanding or business logic may be broken
- Contract testing captures the **semantic contract** beyond wire compatibility

### Schema-Based Validation

Schema registries and schema formats used for contract-adjacent validation:

**OpenAPI (Swagger)**:
- Describes REST API structure, endpoints, request/response shapes
- Used in bi-directional contract testing as the provider contract
- Limitation: abstract -- doesn't capture specific interaction examples

**JSON Schema**:
- Vocabulary for annotating and validating JSON documents
- Readable, human-friendly, widely used in web APIs
- Not a serialization format itself

**Avro**:
- Binary serialization with strong schema evolution support
- Best-in-class backward/forward compatibility
- Ideal for event streaming (Kafka ecosystem)
- Schema Registry enforces compatibility rules at publish time

**Protobuf**:
- Smallest messages (20-30% smaller than Avro), fastest serialization
- Ideal for high-performance RPC (gRPC)
- Schema evolution via field numbering

**Key insight**: Schema-based contract tests sacrifice guarantees for simpler developer experience. Code-based contract tests provide stronger guarantees but cost more to maintain. The trade-off: schemas validate structure; contracts validate behavior.

---

## 4. Contract Testing vs Other Testing

### vs Integration Testing

| Aspect | Contract Testing | Integration Testing |
|--------|-----------------|---------------------|
| **Scope** | Single API interaction (1 consumer + 1 provider) | Multiple components working together |
| **Isolation** | Each side tested in isolation | Tests connected modules together |
| **Environment** | No shared environment needed | Requires test environment with running services |
| **Speed** | Fast (milliseconds) | Slower (requires service startup, network) |
| **Debugging** | Easy -- isolated, specific failures | Harder -- multiple components, unclear root cause |
| **Side effects** | Does not check side effects | Considers broader system behavior |
| **Scaling** | Tests scale linearly with integrations | Tests scale exponentially with services |
| **Feedback** | Fast, reliable, easy to debug | Broader but slower |

**When to use contract testing**: Fast feedback on API integrations pre-commit, independent service deployment, reducing test environment maintenance.

**When to use integration testing**: Validating multiple modules work together, ensuring requirements alignment, functional verification of feature interactions.

### vs End-to-End (E2E) Testing

| Aspect | Contract Testing | E2E Testing |
|--------|-----------------|-------------|
| **Scope** | Two specific services | Complete user workflow, start to finish |
| **Brittleness** | Low -- isolated, specific | High -- many moving parts, flaky |
| **Speed** | Fast | Slow |
| **Maintenance** | Low | High |
| **Confidence** | API compatibility confidence | Full workflow confidence |
| **Environment** | None needed | Full production-like environment required |

Contract testing does NOT replace E2E testing entirely. Some E2E tests remain essential for production environment validation of complete workflows.

### vs Mock Testing

| Aspect | Contract Testing | Mock Testing |
|--------|-----------------|-------------|
| **Verification** | Mocks are verified against real provider | Mocks are NOT verified |
| **Drift** | Contracts prevent drift (provider must satisfy contract) | Mocks can drift from reality silently |
| **Confidence** | High -- both sides tested | Low -- only consumer side tested |
| **Maintenance** | Contract is shared artifact | Mocks are local to consumer |

**Key insight**: "Contracts are verified, mocks are not." In regular mock testing, if the provider changes, your mocks still pass even though the real integration is broken. In contract testing, the provider verification step catches this.

### Relationship to Test Pyramid

**Original pyramid**: Unit -> Integration -> E2E (top-heavy pyramids are slow and brittle).

**Rebalanced pyramid with contract testing**:
- **Base**: Unit tests (fast, many)
- **Middle**: Contract tests (fast, focused on API boundaries)
- **Upper-middle**: Integration tests (moderate speed, component boundaries)
- **Top**: E2E tests (slow, few, critical workflows only)

Contract testing fills the gap between unit and integration tests. It "bridges the gap" by providing integration-level confidence at near-unit-test speed. Adding contract tests allows you to significantly reduce the number of E2E tests needed.

---

## 5. Contract Testing in Microservices/DDD Context

### Mapping to Bounded Context Integration

In DDD, **bounded contexts** are autonomous units with their own ubiquitous language and domain model. There will always be touchpoints between bounded contexts -- these touchpoints are **contracts**.

Contract testing directly maps to the DDD concept of defining and verifying the boundaries between bounded contexts:

- Each bounded context that exposes an API is a **provider**
- Each bounded context that consumes another's API is a **consumer**
- The contract captures the agreed-upon interaction format between contexts
- Changes to one context's internal model should not break other contexts, and contract tests verify this

### Published Language as Contract

**Published Language** in DDD is a well-documented, shared data format used for information exchange between bounded contexts. It IS the contract format.

Examples of Published Language: XML, JSON, iCal, vCard, **Avro**, **Protobuf**, **JSON Schema**.

In contract testing terms:
- The Published Language defines the message format
- The contract test verifies that both sides correctly produce/consume messages in that format
- Pact files, OpenAPI specs, Protobuf definitions all serve as Published Language artifacts

### Open Host Service Contracts

An **Open Host Service** is a bounded context that provides a well-defined, documented API for other contexts to access:

- The host provides an interface (API) for clients
- The API is well-documented and "pleasing to use"
- The interface is the contract

**Mapping to contract testing**:
- The Open Host Service IS the provider
- Its published API IS the provider contract
- Consumer-driven contract testing verifies that the Open Host Service satisfies what consumers actually need
- Provider-driven testing verifies that the Open Host Service's spec is correctly implemented

### Anti-Corruption Layer (ACL) Verification

An **ACL** is a translation layer between bounded contexts that prevents one context's model from corrupting another's:

- Downstream team creates facades and adapters
- Translates upstream model into downstream's ubiquitous language
- Enforces boundaries between contexts

**Contract testing the ACL**:
- The ACL adapter can be tested with Pact -- verify it correctly translates between the upstream contract and the downstream domain model
- Consumer tests verify the ACL correctly processes upstream messages
- Provider tests verify the upstream service produces messages the ACL expects
- In event-driven systems: each service publishes events in its own ubiquitous language; the ACL translates these into the consumer's language

### Event-Driven Contract Testing (Message Pacts)

In DDD event-driven architectures:

- **Domain events** cross bounded context boundaries
- Events represent the **Published Language** between contexts
- Each service's event taxonomy serves as the shared contract

**Pattern**:
1. Producer context publishes domain events (e.g., `OrderPlaced`, `PaymentReceived`)
2. Consumer context's ACL receives and translates events
3. Message pacts verify the event structure contract

**Implementation with Pact**:
- Producer test: verify the event creation port produces correctly structured events
- Consumer test: verify the event handler port can deserialize and process events
- Adapter layers (Kafka consumer, SNS handler) are NOT tested by Pact -- they are infrastructure
- Pact tests the domain-level message format, not the transport mechanism

### Consumer-Driven Contracts and Context Map Relationships

DDD Context Map patterns map directly to contract testing strategies:

| Context Map Pattern | Contract Testing Approach |
|-------------------|--------------------------|
| **Customer-Supplier** | CDC -- customer (consumer) drives the contract, supplier (provider) satisfies it. Negotiated priorities. |
| **Open Host Service + Published Language** | Provider publishes spec (OpenAPI/Protobuf); consumers validate against it. Bi-directional testing fits well. |
| **Conformist** | Consumer accepts provider's contract as-is. Provider-driven testing -- consumer validates against provider schema. |
| **Anti-Corruption Layer** | CDC with the ACL as the consumer-side code under test. Verify ACL correctly handles upstream events/responses. |
| **Partnership** | Both teams collaborate on contract. Either CDC or BDCT works. Shared ownership of contract evolution. |
| **Shared Kernel** | Contract tests verify the shared model is used consistently by both contexts. |
| **Separate Ways** | No contract testing needed -- contexts are independent. |

---

## 6. Advanced Concepts

### Contract Evolution and Versioning

Contracts evolve as APIs change. Key versioning strategies:

**Strict Strategy**: Any change requires a new version. Safe but causes version explosion.

**Flexible Strategy**: Non-breaking changes produce point versions; breaking changes require major versions. Implements backward compatibility.

**Loose Strategy**: Both backward and forward compatible contracts. Only breaking changes require major versions.

**Recommended**: Flexible/Strict hybrid -- classify changes as safe (point versions) or unsafe (minor+ versions).

### Backward Compatibility Verification

Contract testing is a natural mechanism for verifying backward compatibility:

- When a provider changes, re-run all existing consumer contracts
- If all pass, the change is backward compatible
- If any fail, the change breaks backward compatibility

**Non-breaking changes** (backward compatible):
- Adding new optional fields to responses
- Adding new endpoints
- Adding new optional request parameters
- Adding new HTTP methods for existing resources

**Breaking changes** (not backward compatible):
- Removing endpoints or fields
- Changing HTTP methods
- Altering URL path structures
- Converting optional fields to required
- Changing field types or removing values from enums
- Applying stricter validation rules

### Breaking Change Detection

Contract testing provides **automated breaking change detection**:

1. Consumer publishes contract defining expected behavior
2. Provider changes implementation
3. Provider verification runs consumer contracts against new implementation
4. If verification fails, the change is a breaking change
5. `can-i-deploy` prevents deployment of breaking changes

This is superior to manual API review because:
- It tests against actual consumer usage, not theoretical API surface
- It catches semantic breaks (not just structural)
- It is automated and runs in CI

### Contract Testing in CI/CD Pipeline

**Complete pipeline workflow**:

1. **Consumer PR build**:
   - Run consumer tests (generates pact file)
   - Publish pact to Broker with branch info
   - Run `can-i-deploy` to check compatibility with deployed provider versions
   - Gate merge on verification status

2. **Provider PR build**:
   - Fetch consumer pacts from Broker
   - Run provider verification against all consumer contracts
   - Publish verification results to Broker
   - WIP pacts automatically included
   - Pending pacts don't block the build

3. **Webhook-triggered provider build** (on pact change):
   - Pact Broker triggers provider build via webhook
   - Provider verifies only the changed pact
   - Results published to Broker

4. **Deployment**:
   - Run `can-i-deploy --to-environment production`
   - If safe (exit 0), deploy
   - After deployment: `record-deployment --environment production`

### Provider States for Test Data Setup

Provider states are the mechanism for setting up test data before replaying interactions:

**Consumer side**: Declares required state in the interaction
```
.given("user 123 exists")
.given("user 123 has 3 orders")
.given("no products exist")
```

**Provider side**: Implements state handlers that create the required data
```
// Provider state handler
stateHandlers: {
  "user 123 exists": () => {
    database.insert({ id: 123, name: "Alice" });
  },
  "no products exist": () => {
    database.deleteAll("products");
  }
}
```

**Best practices**:
- Use business language for state descriptions (not "insert row into users table")
- Keep states minimal -- just enough data for the interaction
- States should be idempotent (safe to run multiple times)
- Provider state setup runs BEFORE each interaction replay
- States can include parameters for flexibility (e.g., `given("user exists", { id: 123 })`)

---

## Sources

- [Pact Documentation -- How Pact Works](https://docs.pact.io/getting_started/how_pact_works)
- [Pact Documentation -- Writing Consumer Tests](https://docs.pact.io/consumer)
- [Pact Documentation -- Pact Broker](https://docs.pact.io/pact_broker)
- [Pact Documentation -- Can-I-Deploy](https://docs.pact.io/pact_broker/can_i_deploy)
- [Pact Documentation -- Pending Pacts](https://docs.pact.io/pact_broker/advanced_topics/pending_pacts)
- [Pact Documentation -- WIP Pacts](https://docs.pact.io/pact_broker/advanced_topics/wip_pacts)
- [Pact Documentation -- Webhooks](https://docs.pact.io/pact_broker/webhooks)
- [Pact Documentation -- CI/CD Setup Guide (Pact Nirvana)](https://docs.pact.io/pact_nirvana)
- [Pact Documentation -- GraphQL API](https://docs.pact.io/implementation_guides/javascript/docs/graphql)
- [PactFlow -- Contract Testing vs Integration Testing](https://pactflow.io/blog/contract-testing-vs-integration-testing/)
- [PactFlow -- Bi-Directional Contract Testing](https://pactflow.io/bi-directional-contract-testing/)
- [PactFlow -- Schemas Are Not Contracts](https://pactflow.io/blog/schemas-are-not-contracts/)
- [PactFlow -- Contract Testing vs Schema Testing](https://pactflow.io/blog/contract-testing-using-json-schemas-and-open-api-part-1/)
- [PactFlow -- What Is Consumer-Driven Contract Testing](https://pactflow.io/what-is-consumer-driven-contract-testing/)
- [PactFlow -- gRPC and Protobufs Contract Testing](https://pactflow.io/blog/contract-testing-for-grpc-and-protobufs/)
- [PactFlow -- The Case for Contract Testing Protobufs, gRPC, Avro](https://pactflow.io/blog/the-case-for-contract-testing-protobufs-grpc-avro/)
- [Microsoft Engineering Playbook -- CDC Testing](https://microsoft.github.io/code-with-engineering-playbook/automated-testing/cdc-testing/)
- [InfoQ -- Contract Versioning, Compatibility and Composability](https://www.infoq.com/articles/contract-versioning-comp2/)
- [DevIQ -- Context Mapping](https://deviq.com/domain-driven-design/context-mapping/)
- [DDD Practitioners Guide -- Open Host Service](https://ddd-practitioners.com/home/glossary/bounded-context/bounded-context-relationship/open-host-service/)
- [DDD Practitioners Guide -- Anti-Corruption Layer](https://ddd-practitioners.com/home/glossary/bounded-context/bounded-context-relationship/anticorruption-layer/)
- [ThoughtWorks Radar -- Consumer-Driven Contract Testing](https://www.thoughtworks.com/radar/techniques/consumer-driven-contract-testing)
- [Matt Fellows -- Beyond REST: Contract Testing in the Age of gRPC, Kafka and GraphQL](https://gitnation.com/contents/beyond-rest-contract-testing-in-the-age-of-grpc-kafka-and-graphql)
