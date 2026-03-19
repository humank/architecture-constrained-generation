# Event Schema Evolution: Complete Reference

## The Problem

Events are **immutable facts** stored indefinitely. But business requirements change — new fields
appear, old fields become irrelevant, types need refinement. Schema evolution is the discipline of
changing event schemas **without breaking existing producers or consumers**.

Core tension: **write once, read forever**. An event written today must remain readable by consumers
deployed months or years later. Conversely, consumers deployed today must handle events written
under older schemas.

Failure modes:
- Consumer crashes on unknown field
- Consumer silently drops data from missing field
- Deserialization error on type mismatch
- Event replay fails during system rebuild (Event Sourcing)

---

## Compatibility Modes

### Backward Compatible

**New schema can read old data.** The most common requirement.

Rules:
- **Add fields** only if they have **default values**
- **Remove fields** freely (new reader never looks for them)
- New consumers handle absence of new fields gracefully

Example: Adding `loyalty_tier` (default `"STANDARD"`) to `OrderPlaced` — new consumers read old
events and apply the default.

### Forward Compatible

**Old schema can read new data.** Old consumers tolerate unknown fields.

Rules:
- **Add fields** freely (old reader ignores them)
- **Do not remove** fields old readers depend on
- Old consumers must be coded to **ignore unknown fields** (critical for JSON)

Example: Producer adds `expedited_shipping` to `OrderPlaced` — old consumers skip the field.

### Full Compatible

**Both directions.** New reads old AND old reads new.

Rules (intersection of backward + forward):
- Add fields **with defaults** only
- Do not remove fields still in use
- Most restrictive but safest for systems with mixed-version deployments

### Breaking Changes (Avoid)

| Change | Why It Breaks |
|---|---|
| Rename field | Old name unrecognized; new name absent in old data |
| Change field type (`string` → `int`) | Deserialization failure |
| Remove required field | Reader expects it, gets null/missing |
| Change enum meaning | Semantic corruption |
| Reorder fields (binary formats) | Positional decoding fails |

Mitigation for unavoidable breaks: **new event type** (`OrderPlacedV2`) with parallel publication
during transition, then deprecate old type.

---

## Schema Registry

A **centralized service** that stores versioned schemas and enforces compatibility rules at
write time.

### Confluent Schema Registry (Kafka)

- Stores Avro, Protobuf, JSON Schema
- Assigns **schema ID** to each version (embedded in message header)
- Enforces compatibility checks on schema registration
- Integrates with Kafka producers/consumers via serializers/deserializers
- REST API: `POST /subjects/{subject}/versions`, `GET /schemas/ids/{id}`

### AWS Glue Schema Registry

- Supports Avro, JSON Schema, Protobuf
- Integrated with Kinesis, MSK, Lambda, Glue ETL
- Compatibility enforcement at registry level
- Schema versioning with auto-assigned version numbers

### Subject Naming Strategies

| Strategy | Subject Name | Use Case |
|---|---|---|
| **TopicNameStrategy** | `{topic}-value` | One schema per topic (default) |
| **RecordNameStrategy** | `{namespace}.{record}` | Multiple event types per topic |
| **TopicRecordNameStrategy** | `{topic}-{namespace}.{record}` | Multiple types, topic-scoped |

`RecordNameStrategy` aligns with DDD: one subject per domain event type, regardless of transport
topic.

### Registry Workflow

```
Producer                     Registry                    Consumer
   |                            |                            |
   |-- Register schema -------->|                            |
   |<- Schema ID (or reject) ---|                            |
   |                            |                            |
   |-- Send [ID + payload] -----|----------- msg ----------->|
   |                            |                            |
   |                            |<--- Fetch schema by ID ----|
   |                            |--- Schema definition ----->|
   |                            |                            |
   |                            |    Deserialize with        |
   |                            |    reader + writer schema  |
```

---

## Avro

### Why Avro Dominates Event Streaming

- **Compact binary** encoding (no field names in payload, only schema ID)
- **Schema evolution built-in** via reader/writer schema resolution
- **Schema required for both read and write** — no ambiguity
- First-class support in Confluent ecosystem

### Schema Definition

```json
{
  "type": "record",
  "name": "OrderPlaced",
  "namespace": "com.example.orders",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "amount", "type": {"type": "bytes", "logicalType": "decimal", "precision": 10, "scale": 2}},
    {"name": "placedAt", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "loyaltyTier", "type": "string", "default": "STANDARD"},
    {"name": "notes", "type": ["null", "string"], "default": null}
  ]
}
```

Key types:
- **Records**: Named structured types with fields
- **Enums**: Fixed set of symbols (`{"type": "enum", "symbols": ["GOLD","SILVER","BRONZE"]}`)
- **Unions**: `["null", "string"]` — nullable fields, polymorphic types
- **Logical types**: `decimal`, `date`, `timestamp-millis`, `uuid` — semantic meaning over primitives

### Schema Resolution Rules

Avro uses **two schemas** during deserialization:

- **Writer schema**: The schema used when the event was serialized
- **Reader schema**: The schema the consumer expects

Resolution:
1. Fields in **both** schemas — read normally
2. Field in **writer only** (reader removed it) — skip/ignore
3. Field in **reader only** (writer didn't have it) — use **default value** (required!)
4. Field in reader only, **no default** — **error** (this is why defaults matter)

### Backward/Forward Compatibility in Avro

| Change | Backward? | Forward? |
|---|---|---|
| Add field with default | Yes | Yes |
| Add field without default | No | Yes |
| Remove field with default | Yes | No |
| Remove field without default | Yes | No |

Rule of thumb: **always provide defaults** for full compatibility.

---

## Protobuf Evolution

### Field Numbers Are Permanent

Every field has a unique **numeric tag** that identifies it in the binary encoding. The field
**name** is for human readability only — the wire format uses **numbers**.

```protobuf
message OrderPlaced {
  string order_id = 1;
  string customer_id = 2;
  int64 amount_cents = 3;
  google.protobuf.Timestamp placed_at = 4;
  // Added later:
  string loyalty_tier = 5;
}
```

### Safe Evolution Rules

| Operation | Safe? | Notes |
|---|---|---|
| Add new field | Yes | Old readers skip unknown tags |
| Remove field | Yes | New readers get default for missing tag |
| Rename field | Yes | Only number matters on wire |
| Change field number | **No** | Existing data becomes unreadable |
| Change field type | **No** | Unless compatible (e.g., `int32` ↔ `int64`) |
| Change `repeated` ↔ scalar | **No** | Wire encoding differs |

### Reserved Fields and Numbers

When removing a field, **reserve** its number and name to prevent accidental reuse:

```protobuf
message OrderPlaced {
  reserved 3, 8;
  reserved "amount_cents", "legacy_status";
  string order_id = 1;
  string customer_id = 2;
}
```

Without `reserved`, a future developer could reuse field number 3 with a different type, silently
corrupting deserialization of old data.

### Backward/Forward Compatible by Design

Protobuf's wire format inherently supports:
- **Forward compatibility**: Old code ignores unknown field numbers
- **Backward compatibility**: Missing fields get language-specific defaults (`""`, `0`, `false`)

No schema registry required for compatibility (though registries add governance). The trade-off:
defaults are **implicit** (zero-values), not **explicit** like Avro — harder to distinguish
"field absent" from "field intentionally set to zero."

Use `optional` keyword (proto3) or wrapper types (`google.protobuf.StringValue`) for presence
detection.

---

## JSON Schema Evolution

### Less Formal Than Avro/Protobuf

JSON has no built-in schema resolution. Consumers must be **defensively coded**. No binary
compactness. But ubiquitous, human-readable, and zero-tooling to produce/consume.

### Strategies

**Additive-only changes**:
- Add new fields as optional (no `required` constraint)
- Never remove fields from the schema
- Never change field types

**Deprecation headers**:
- Mark fields as deprecated in schema description
- Add `x-deprecated` or `deprecated: true` annotations
- Remove after all consumers migrate (tracked via consumer registry or contract tests)

**Unknown field tolerance**:
- `"additionalProperties": true` (default) — consumers ignore extra fields (forward compatible)
- `"additionalProperties": false` — strict mode, breaks forward compatibility

### Versioned Schemas

Use `$id` with version:

```json
{
  "$id": "https://schema.example.com/orders/order-placed/v2",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "orderId": {"type": "string"},
    "loyaltyTier": {"type": "string", "default": "STANDARD"}
  },
  "required": ["orderId"]
}
```

Version in `$id` enables consumers to validate against the exact version they support while the
registry tracks which versions are active.

### JSON Schema in Schema Registry

Confluent Schema Registry supports JSON Schema with compatibility checks. Register schemas per
subject, enforce backward/forward/full compatibility — same workflow as Avro.

---

## Event Upcasting

### Concept

Transform old event formats to new format **at read time**. Instead of migrating stored data,
apply transformation functions when events are deserialized.

```
Stored event (v1 format)
    ↓
Upcaster v1→v2
    ↓
Upcaster v2→v3
    ↓
Application receives v3 format
```

### Upcaster Chain

Each upcaster transforms exactly one version to the next:

```
v1 → v2: Split "fullName" into "firstName" + "lastName"
v2 → v3: Rename "amount" to "totalAmount", add "currency" default "USD"
v3 → v4: Change "address" from string to structured object
```

Upcasters are **composable** — chain them: `v1 → v2 → v3 → v4`. The application code only
handles the **latest version**.

### Lazy vs Eager Migration

| Approach | Description | Trade-off |
|---|---|---|
| **Lazy (upcasting)** | Transform on read | No migration downtime; read cost per event; old data untouched |
| **Eager (migration)** | Rewrite all stored events to latest format | One-time cost; faster reads; risky for large event stores |
| **Hybrid** | Upcast on read + background migration | Best of both; complex to implement |

### Connection to Event Sourcing

Event Sourcing stores **all events forever** — schema evolution is not optional, it is inevitable.

- **Aggregate rebuild**: Replays events through upcasters to reconstruct current state
- **Projection rebuild**: Re-reads event store to rebuild read models — upcasters ensure
  old events conform to current projection logic
- **Snapshot + upcasting**: Snapshots avoid replaying full history; snapshots themselves
  may need upcasting

Frameworks with built-in upcasting: Axon Framework, Marten (.NET), EventStoreDB (via
client-side transformations).

---

## Best Practices

### Schema Design Rules

1. **Always add, never remove** — or enforce a deprecation period before removal
2. **Use optional/nullable fields** for all new additions
3. **Provide explicit defaults** — distinguish "absent" from "intentionally empty"
4. **Use union types / oneof** for fields that might change shape in the future
5. **Never reuse field names or numbers** after removal

### Metadata and Versioning

6. **Include schema version in event metadata** — enables routing to correct deserializer
7. **Include event type** in metadata — decouples type from topic/channel
8. **Include correlation/causation IDs** — unrelated to schema but essential for tracing

Example metadata envelope:

```json
{
  "eventType": "OrderPlaced",
  "schemaVersion": 3,
  "timestamp": "2024-01-15T10:30:00Z",
  "correlationId": "abc-123",
  "payload": { ... }
}
```

### CI/CD Integration

9. **Test schema compatibility in CI pipeline** — fail build on incompatible changes
10. **Automate schema registration** in CD pipeline — register before deploying producer

```
CI Pipeline:
  ┌─────────┐    ┌──────────────────┐    ┌────────────────┐
  │  Build   │───>│ Schema Compat    │───>│ Register Schema│───> Deploy
  │          │    │ Check (registry) │    │ (if new)       │
  └─────────┘    └──────────────────┘    └────────────────┘
                   ↓ fail = block merge
```

Tools: `confluent schema-registry test-compatibility`, `aws glue check-schema-version-validity`,
custom CI scripts against registry API.

### Consumer Resilience

11. **Consumers must tolerate unknown fields** — never fail on extra data
12. **Consumers should handle missing optional fields** — use sensible defaults
13. **Deploy consumers before producers** when adding required consumption of new fields

---

## Connection to Methodologies

### Event Sourcing (DDD Architecture Patterns)

- Upcasting is the **primary mechanism** for schema evolution in event-sourced systems
- Aggregates reconstruct state by replaying events — every historical schema must be handled
- Schema evolution strategy must be decided early — it is an **architectural decision** (ADR)

### Contract Testing

- Schema compatibility **is** a contract between producer and consumer
- Consumer-driven contracts (Pact) can verify event schemas: consumer defines expected event
  structure, producer verifies it produces conformant events
- Bi-directional contract testing: compare producer's registered schema against consumer's
  expectations
- Schema registry compatibility checks complement contract tests (registry = provider-driven,
  Pact = consumer-driven)

### Continuous Delivery

- Schema compatibility check is a **pipeline stage** — same as unit tests or linting
- Breaking schema change = failed build = blocked deployment
- Schema registration is part of the **deployment pipeline**, not a manual step
- Enables independent deployability of producer and consumer services

### AsyncAPI

- AsyncAPI specifications **reference** Avro, Protobuf, or JSON Schema for message payloads
- Channel (topic) definitions include schema references with version
- AsyncAPI + Schema Registry = complete async API documentation and governance
- Code generation from AsyncAPI specs includes schema evolution support

### Event Modeling

- Event schemas are part of the **blueprint** — every orange (event) sticky has a defined payload
- Schema evolution must be planned during the modeling phase
- Given-When-Then specifications on commands implicitly define event schemas
- Information completeness validation catches schema gaps before implementation
