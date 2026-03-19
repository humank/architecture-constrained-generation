# ADR-005: Flyway for Seed Data over data.sql

## Status

Accepted

## Date

2026-03-19

## Context

In an event-driven microservices system, some bounded contexts require seed data (reference data) to be present before they can correctly process incoming events. For example:

- The **Preparation Service** needs recipe data (ingredients, quantities, preparation times) to exist before it can process `OrderConfirmed` events. Without recipe data, the service cannot create preparation items with the correct ingredients.
- The **Inventory Service** needs initial ingredient records with quantity-on-hand and reorder thresholds before it can deduct stock.

The application lifecycle is:

1. Flyway migrations run (schema DDL + data DML)
2. Spring context initializes (beans, connection pools)
3. SQS consumers start polling

If seed data is not loaded before step 3, the following irrecoverable scenario occurs:

1. `OrderConfirmed` event arrives
2. Preparation Service tries to look up recipe for "Latte"
3. Recipe does not exist (seed data not yet loaded)
4. Event processing fails
5. After 3 retries, message goes to DLQ
6. Even after seed data loads, the DLQ message requires manual intervention to redrive

This is not a transient failure (like a network timeout) that resolves on retry. It is a permanent failure caused by missing reference data, and the DLQ message will fail again unless manually redriven after the data is present.

## Decision

We will use Flyway versioned migrations to load seed data. Seed data will be embedded in SQL migration files (e.g., `V2__seed_recipes.sql`) alongside schema DDL migrations.

### Implementation

- Seed data migrations are idempotent using `INSERT ... ON CONFLICT DO NOTHING` or `INSERT ... ON CONFLICT DO UPDATE`.
- Flyway runs at application startup, before the Spring context finishes initializing and before SQS consumers begin polling.
- Seed data files are versioned and tracked by Flyway's `flyway_schema_history` table, ensuring they run exactly once.

### Example

```sql
-- V2__seed_recipes.sql (preparation schema)
INSERT INTO recipes (id, product_name, ingredients, estimated_seconds)
VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Latte',
     '{"milk": {"amount": 200, "unit": "ml"}, "espresso": {"amount": 30, "unit": "ml"}}', 180),
    ('550e8400-e29b-41d4-a716-446655440002', 'Americano',
     '{"water": {"amount": 200, "unit": "ml"}, "espresso": {"amount": 60, "unit": "ml"}}', 120)
ON CONFLICT (id) DO NOTHING;
```

## Consequences

### Positive

- **Guaranteed ordering**: Flyway migrations run before SQS consumers start. Seed data is always present when events arrive.
- **Prevents irrecoverable state**: No DLQ messages caused by missing reference data.
- **Version controlled**: Seed data changes are tracked in Git alongside schema changes. The team can review changes in pull requests.
- **Idempotent**: `ON CONFLICT DO NOTHING` ensures re-running is safe (e.g., during local development with `flyway repair`).
- **Environment parity**: The same seed data runs in local, staging, and production environments.

### Negative

- **Seed data in migrations**: Mixing DDL and DML in migration files blurs the line between schema and data. Some teams prefer a clear separation.
- **Immutable history**: Once a Flyway migration is applied, it should not be modified. Seed data corrections require a new migration file.
- **Environment-specific data**: If different environments need different seed data (e.g., test products in staging), additional migration files or Flyway profiles are needed.

### Mitigations

- Convention: Schema DDL migrations use even version numbers (`V1`, `V3`, `V5`), seed data migrations use odd version numbers (`V2`, `V4`, `V6`). This provides visual separation while maintaining execution order.
- Environment-specific data is handled via Flyway's `locations` configuration, allowing additional migration directories per environment.

## Alternatives Considered

### Spring Boot `data.sql`

- **Pros**: Simple, built-in Spring Boot feature. Clearly separated from schema DDL (`schema.sql`).
- **Rejected because**: `data.sql` execution timing depends on Spring Boot configuration (`spring.sql.init.mode`) and does not guarantee execution before SQS consumers start. In practice, `data.sql` runs during `DataSource` initialization, but SQS consumer beans may be created concurrently during context startup. This race condition makes `data.sql` unreliable for seed data in event-driven systems.

### Application-Level Seed Data (CommandLineRunner / ApplicationRunner)

- **Pros**: Full programmatic control. Can include conditional logic.
- **Rejected because**: `CommandLineRunner` runs after the Spring context is fully initialized, which means SQS consumers are already polling. This creates the same race condition as `data.sql`. Moving consumer initialization to after the runner adds coupling between unrelated concerns.

### Manual Seed Data (Separate Script / Terraform)

- **Pros**: Complete separation from application code. Can be run independently.
- **Rejected because**: Introduces a deployment ordering dependency (run seed script before deploying the service). This is error-prone in CI/CD pipelines and requires coordination that the team wants to avoid. It also does not work for local development without additional tooling.
