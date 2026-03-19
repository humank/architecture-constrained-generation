# Microservice Data Patterns

## Database per Service

Each microservice owns its data store exclusively. No other service may access it directly.

### Why

- **Loose coupling** — services evolve independently without coordinating schema changes
- **Independent deployability** — database migrations are local decisions
- **Polyglot persistence** — each service picks the storage engine that fits its access patterns

### Implementation

- Service owns its schema; no shared tables, no shared database instances
- Data access only through the service's API (REST, gRPC, events)
- Schema migrations are part of the service's deployment pipeline
- Each service has its own connection pool and credentials

### Challenges

| Challenge | Mitigation |
|---|---|
| Cross-service queries | API Composition, CQRS read models |
| Distributed transactions | Saga pattern (choreography or orchestration) |
| Data duplication | Event-driven sync, eventual consistency |
| Referential integrity | Domain-level validation, compensating actions |

---

## CQRS Implementation

Separate the write model (commands, domain logic) from the read model (queries, projections).

### Write Side

```
Client → Command → Command Handler → Aggregate → Domain Events → Event Store
```

- **Command Handlers** validate input, load aggregate, invoke behavior
- **Aggregates** enforce invariants, emit events (DDD Aggregate = write model unit)
- **Repository** abstracts persistence (DDD Repository = data access abstraction)
- Strong consistency within aggregate boundary

### Read Side

```
Event Store → Event Handlers → Projection → Query-Optimized Store → Query API
```

- **Event Handlers** subscribe to domain events, update denormalized views
- **Projections** are disposable — rebuild from events at any time
- Multiple projections for different query needs (list views, search, reports)
- Eventually consistent with write side

### Separate Databases

| Write Store | Read Store | Use Case |
|---|---|---|
| DynamoDB | Elasticsearch/OpenSearch | Full-text search over domain data |
| PostgreSQL | Redis | Low-latency lookup by various keys |
| EventStoreDB | DynamoDB | Key-value read models from event streams |
| DynamoDB | Aurora PostgreSQL | Complex relational queries over event data |

### Connection to Event Modeling

- **Command pattern** (blue) = write side: Given prior events, When command, Then new events
- **View pattern** (green) = read side: Given events, Then projection displays state
- Event Modeling blueprint directly maps to CQRS+ES implementation slices

---

## Event Sourcing Implementation

Persist all state changes as an append-only sequence of domain events. Events are the source
of truth — current state is derived by replaying them.

### Event Store Design

- **Append-only** — events are immutable once written; no updates, no deletes
- **Stream per aggregate** — `Order-{orderId}` contains all events for that order
- **Optimistic concurrency** — expected version on write prevents conflicting appends
- **Event schema**: `{ streamId, version, eventType, data, metadata, timestamp }`
- **Global ordering** — a global sequence number enables cross-stream projections

### Snapshotting

- Replay optimization: periodically store aggregate state at a known version
- **Frequency**: every N events (e.g., 100) or time-based
- **Snapshot store**: separate table/collection keyed by `(streamId, snapshotVersion)`
- Rebuild: load latest snapshot, replay only events after snapshot version
- Snapshots are disposable — delete and rebuild from events

### Projection Rebuilding

1. Delete existing projection data
2. Replay all events from stream(s) through event handler
3. Projection catches up to current state
4. Resume live subscription

Use cases: fix projection bugs, add new read models, schema migration of read store.

### Event Store Technologies

| Technology | Characteristics |
|---|---|
| **EventStoreDB** | Purpose-built, subscriptions, projections, stream-native |
| **DynamoDB** | Partition key = streamId, sort key = version, conditional writes for concurrency |
| **PostgreSQL** | Append-only table, `NOTIFY`/`LISTEN` for subscriptions, JSONB for event data |
| **Kafka** | Log-based, high throughput, but not ideal for stream-per-aggregate reads |

### AWS Implementation

- **DynamoDB as event store**: partition key = `streamId`, sort key = `version`
- **DynamoDB Streams** → Lambda → project into read stores (DynamoDB, OpenSearch, Aurora)
- **Kinesis Data Streams** for fan-out to multiple consumers
- **EventBridge** for cross-service event routing

---

## API Composition

### Problem

A query requires data owned by multiple services. No single service has the full picture.

### Solution

An **API Composer** service issues parallel requests to data-owning services and joins
the results in memory.

```
Client → API Composer → Service A (order data)
                      → Service B (customer data)
                      → Service C (product data)
       ← Merged response
```

### Connection to BFF Pattern

- **Backend for Frontend (BFF)** is a specialized API Composer tailored to a specific client
- Mobile BFF composes differently than Web BFF
- Each BFF owns its aggregation logic, reducing chattiness for its client

### Challenges

| Challenge | Mitigation |
|---|---|
| Latency (sequential calls) | Parallel requests, circuit breakers, timeouts |
| Availability (any service down = query fails) | Fallbacks, cached responses, graceful degradation |
| Data consistency (services at different points in time) | Accept eventual consistency, version stamps |
| Complex joins | Consider CQRS read model instead of runtime composition |

**Rule of thumb**: if the same composition is needed frequently with low latency, build a
CQRS projection. If it is ad-hoc or infrequent, use API Composition.

---

## Change Data Capture (CDC)

Capture row-level database changes and publish them as events — without modifying application code.

### How It Works

```
Service DB → CDC Connector → Event Stream → Consumers
             (log-based)     (Kafka, Kinesis)
```

- Reads the database transaction log (WAL, binlog, DynamoDB Streams)
- Emits insert/update/delete events with before/after state
- Guarantees ordering per primary key

### Technologies

| Technology | Source | Sink |
|---|---|---|
| **Debezium** (Kafka Connect) | PostgreSQL, MySQL, MongoDB, SQL Server | Kafka topics |
| **DynamoDB Streams** | DynamoDB tables | Lambda, Kinesis |
| **AWS DMS** | Any RDBMS | Kinesis, S3, Kafka |
| **RDS Event Notifications** | Aurora/RDS | SNS → Lambda |

### Use Cases

- **Sync read models** — feed CQRS projections without dual-write risk
- **Feed event bus** — turn legacy database writes into domain events
- **Legacy integration** — extract data from monolith without modifying it
- **Cache invalidation** — update ElastiCache when source data changes
- **Data lake ingestion** — stream operational data to S3/Redshift for analytics

### CDC vs. Application Events

| Aspect | CDC | Application Events |
|---|---|---|
| Coupling | Infrastructure-level, schema-coupled | Domain-level, intent-coupled |
| Reliability | Guaranteed (from DB log) | Requires outbox pattern or dual-write |
| Granularity | Row-level changes | Business-meaningful events |
| Best for | Legacy systems, sync, data pipelines | New services, domain-driven design |

---

## Polyglot Persistence

Choose the database per service based on its specific access patterns.

| Data Store | AWS Service | Access Pattern | Example Use Case |
|---|---|---|---|
| **Relational** | RDS / Aurora | Complex queries, joins, transactions | Order management, accounting |
| **Document** | DynamoDB / DocumentDB | Key-value, flexible schema, high scale | User profiles, product catalog |
| **Graph** | Neptune | Traversal, relationship-heavy queries | Social networks, fraud detection |
| **Search** | OpenSearch | Full-text search, faceted navigation | Product search, log analytics |
| **Time-series** | Timestream | Time-ordered metrics, aggregations | IoT telemetry, application metrics |
| **Cache** | ElastiCache (Redis) | Sub-millisecond reads, hot data | Session store, leaderboards |
| **Object** | S3 | Binary blobs, archival | Media files, event store archives |
| **Wide-column** | Keyspaces (Cassandra) | High write throughput, time-series | Activity feeds, messaging |

### Selection Criteria

- **Read/write ratio** — read-heavy → cache or search index; write-heavy → append-optimized store
- **Query complexity** — joins and aggregations → relational; single-key lookup → key-value
- **Consistency needs** — strong → relational; eventual acceptable → DynamoDB, caches
- **Scale requirements** — unbounded → DynamoDB, Cassandra; bounded → RDS
- **Data structure** — highly connected → graph; hierarchical → document; tabular → relational

---

## Data Migration in Microservices

### Expand-Contract Pattern (per Service)

Applied within each service's independent database:

1. **Expand** — Add new column/table alongside old. Write to both. Deploy new code that reads
   from both.
2. **Migrate** — Backfill data. Switch reads to new structure. Verify.
3. **Contract** — Drop old column/table. Deploy code that only uses new structure.

### Blue-Green Database Migrations

- Provision new database with target schema
- Replicate data from old to new (CDC or batch copy)
- Switch service to new database (update connection config)
- Keep old database for rollback window
- Decommission old database after validation

### Key Principles

- **Backward-compatible changes only** — additive during deployment, never destructive
- **Decouple schema change from code change** — schema first, then code, then cleanup
- **Version your schemas** — migration scripts in version control alongside service code
- **Test migrations** — run against production-size data in staging
- **Automate** — Flyway, Liquibase, or framework-native migrations in CI/CD pipeline

### Connection to Continuous Delivery

- Schema migrations are part of the deployment pipeline
- Rollback plan for every migration (backward-compatible = safe rollback)
- Zero-downtime deployments require expand-contract discipline

---

## Methodology Connections

| Pattern | Methodology Connection |
|---|---|
| Database per Service | DDD Bounded Context = service boundary = data boundary |
| CQRS Write Side | DDD Aggregate = consistency boundary; Repository = data access abstraction |
| CQRS Read Side | Event Modeling View pattern; projections are disposable |
| Event Sourcing | Event Modeling Command pattern maps directly to aggregate event streams |
| API Composition | BFF pattern; C4 Container diagram shows composition relationships |
| Polyglot Persistence | Clean Architecture: database is Frameworks & Drivers (outermost circle) |
| Data Migration | CD Expand-Contract; zero-downtime requires backward-compatible schemas |

### R&W Information Viewpoint

The Rozanski & Woods **Information Viewpoint** covers data architecture decisions:
- Data ownership and flow between services
- Consistency and integrity constraints
- Data lifecycle (creation, archival, deletion)
- Information quality attributes (timeliness, accuracy, completeness)

### AWS Well-Architected: Reliability Pillar

Per-data-store resilience planning:

| Concern | Practice |
|---|---|
| **Multi-AZ** | Enable for all production data stores (RDS Multi-AZ, DynamoDB global tables) |
| **Backup** | Automated backups with tested restore procedures |
| **RPO** | Recovery Point Objective per data store — how much data loss is acceptable |
| **RTO** | Recovery Time Objective per data store — how fast must recovery complete |
| **Replication** | Cross-region for disaster recovery (Aurora Global Database, DynamoDB Global Tables) |
| **Data integrity** | Checksums, write verification, point-in-time recovery |
