# ADR-004: Schema-per-Bounded-Context on Shared RDS

## Status

Accepted

## Date

2026-03-19

## Context

Each bounded context needs its own data store to maintain autonomy and prevent tight coupling through shared tables. We need to decide between:

1. A separate RDS instance per bounded context (database-per-service)
2. A single RDS instance with a separate PostgreSQL schema per bounded context (schema-per-BC)
3. A single schema with naming conventions (table prefixes)

The team has four bounded contexts (Ordering, Preparation, Inventory, Reporting) and a small team of 4-6 engineers.

## Decision

We will use a single RDS PostgreSQL instance with a dedicated schema per bounded context: `ordering`, `preparation`, `inventory`, and `reporting`. Each service connects with a database user that has privileges limited to its own schema.

### Implementation

- **Schema creation**: Terraform creates the schemas and database users during infrastructure provisioning.
- **Access control**: Each service's database user has `USAGE` and full DML/DDL privileges on its own schema only. Cross-schema `SELECT` is not granted.
- **Migrations**: Each service runs Flyway migrations against its own schema at application startup.
- **Connection string**: Each service's connection string includes `?currentSchema=<bc_name>` to set the default search path.

## Consequences

### Positive

- **Logical isolation**: Each bounded context owns its schema. No accidental cross-context queries.
- **Lower cost**: One RDS instance (db.r6g.large) costs significantly less than four separate instances. Multi-AZ is paid once, not four times.
- **Simpler operations**: One instance to monitor, back up, patch, and scale.
- **Shared resources**: Connection limits, IOPS, and compute are shared efficiently. The coffeeshop workload does not require dedicated resources per BC.
- **Flyway compatibility**: Flyway natively supports schema-scoped migrations.

### Negative

- **Blast radius**: A runaway query or connection leak in one service can affect all services sharing the instance.
- **Scaling ceiling**: All four BCs share CPU, memory, and IOPS. If one BC has disproportionate load, it cannot be independently scaled.
- **Noisy neighbor**: A heavy Reporting query could impact Ordering latency.
- **Migration coordination**: While schemas are independent, PostgreSQL-level changes (e.g., `pg_hba.conf`, extensions) affect all services.

### Mitigations

- **Connection pool limits**: Each service's HikariCP pool is capped at 10 connections, preventing any single service from exhausting the connection limit.
- **Statement timeout**: Each database user has a `statement_timeout` set (Ordering: 5s, Reporting: 30s) to prevent runaway queries.
- **Read replica option**: If Reporting becomes a noisy neighbor, it can be migrated to a read replica without changing the architecture.
- **RDS Performance Insights**: Enabled for identifying slow queries and resource contention per-schema.

## Alternatives Considered

### Database-per-Service (Separate RDS Instances)

- **Pros**: Complete isolation. Independent scaling. No noisy neighbor risk. Strongest data boundary.
- **Rejected because**: Four RDS Multi-AZ instances cost approximately 4x a single instance. For a coffeeshop workload with modest data volumes and query rates, this is over-provisioned. The operational overhead of managing four instances (patching, backups, monitoring) is disproportionate for a small team. The isolation benefits do not justify the cost at our current scale.

### Single Schema with Table Prefixes

- **Pros**: Simplest setup. Single Flyway migration stream. Easy cross-context joins.
- **Rejected because**: Table prefixes are a naming convention, not an isolation boundary. Nothing prevents a developer from joining `ordering_orders` with `inventory_items` directly. This undermines bounded context autonomy and creates hidden coupling that is difficult to detect and break later.

## Migration Path

If the system outgrows the shared instance:

1. Add a read replica and point the Reporting Service to it.
2. If further isolation is needed, use `pg_dump` / `pg_restore` to migrate a specific schema to its own RDS instance with minimal downtime (update connection string, restart service).
