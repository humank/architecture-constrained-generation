# Knowledge Base Index

## Discovery

- [01-impact-mapping.md](discovery/01-impact-mapping.md) — Goal→Actor→Impact→Deliverable, prioritization, MVP, measurement
- [02-user-story-mapping.md](discovery/02-user-story-mapping.md) — Map structure, Walking Skeleton, Story Splitting, Workshop format

## Domain Storytelling

- [01-core-elements.md](domain-storytelling/01-core-elements.md) — Actors, Work Objects, Activities, Annotations
- [02-story-types-and-rules.md](domain-storytelling/02-story-types-and-rules.md) — Three dimensions, modeling rules, DDD connection

## Event Storming

- [01-building-blocks.md](event-storming/01-building-blocks.md) — Sticky note types, event triggers
- [02-workshop-formats.md](event-storming/02-workshop-formats.md) — Big Picture, Process Level, Design Level
- [03-facilitation-techniques.md](event-storming/03-facilitation-techniques.md) — Chaotic Exploration, Pivotal Events, Swimlanes, Saga discovery

## Event Modeling

- [01-event-modeling-complete.md](event-modeling/01-event-modeling-complete.md) — Blueprint, Four Patterns, Seven Steps, Slices, CQRS/ES mapping

## DDD (Domain-Driven Design)

- [01-knowledge-crunching.md](ddd/01-knowledge-crunching.md) — Part I: Ubiquitous Language, Knowledge Crunching, Model-Driven Design
- [02-building-blocks.md](ddd/02-building-blocks.md) — Part II: Entities, VOs, Services, Modules, Aggregates, Factories, Repositories, Domain Events
- [03-refactoring-deeper-insight.md](ddd/03-refactoring-deeper-insight.md) — Part III: Specification, Supple Design, Making Implicit Explicit
- [04-strategic-design.md](ddd/04-strategic-design.md) — Part IV: Bounded Context, Context Map, all relationship patterns
- [05-distillation.md](ddd/05-distillation.md) — Part V: Core Domain, Subdomains, Distillation techniques
- [06-large-scale-structure.md](ddd/06-large-scale-structure.md) — Part VI: Responsibility Layers, Knowledge Level, Evolving Order
- [07-architecture-patterns.md](ddd/07-architecture-patterns.md) — Hexagonal, CQRS, Event Sourcing, Sagas (Vernon IDDD)

## BDD

- [01-bdd-complete.md](bdd/01-bdd-complete.md) — Three Pillars, Three Amigos, Example Mapping, Gherkin, Outside-In

## TDD

- [01-tdd-complete.md](tdd/01-tdd-complete.md) — Red-Green-Refactor, Three Laws, Schools, Test Doubles

## XP

- [01-xp-complete.md](xp/01-xp-complete.md) — Values, Principles, Primary/Corollary Practices, Planning Game

## OOAD

- [01-ooad-complete.md](ooad/01-ooad-complete.md) — SOLID, GRASP, GoF Patterns, CRC Cards, RDD
- [02-rich-domain-model-principles.md](ooad/02-rich-domain-model-principles.md) — Tell Don't Ask, Information Expert, CQS, Law of Demeter, Feature Envy, Primitive Obsession, Specification Pattern, Behavior-on-Enum, Java 21 alignment

## Refactoring

- [01-code-smells.md](refactoring/01-code-smells.md) — 27 Code Smells (Bloaters, Couplers, Dispensables, etc.)
- [02-refactoring-catalog.md](refactoring/02-refactoring-catalog.md) — 66 Refactoring techniques (Extract, Move, Simplify, etc.)
- [03-principles-and-practices.md](refactoring/03-principles-and-practices.md) — Two Hats, Six Workflows, Strangler Fig, DDD connection

## Clean Architecture

- [01-clean-architecture-complete.md](clean-architecture/01-clean-architecture-complete.md) — Dependency Rule, Layers, Humble Objects, Component Principles, SOLID at arch level

## API Design

- [01-api-design-principles.md](api-design/01-api-design-principles.md) — API-First, REST (Richardson Model), GraphQL, gRPC, BFF, API Gateway
- [02-api-specifications.md](api-design/02-api-specifications.md) — OpenAPI 3.1, AsyncAPI, Protobuf, JSON Schema, versioning strategies

## Event-Driven Architecture

- [01-messaging-patterns.md](event-driven-architecture/01-messaging-patterns.md) — Pub/Sub, Competing Consumers, DLQ, Outbox, delivery/ordering guarantees
- [02-schema-evolution.md](event-driven-architecture/02-schema-evolution.md) — Compatibility modes, Schema Registry, Avro/Protobuf, upcasting
- [03-consistency-patterns.md](event-driven-architecture/03-consistency-patterns.md) — Saga, idempotency, eventual consistency, CQRS consistency

## Microservice Patterns

- [01-decomposition-and-communication.md](microservice-patterns/01-decomposition-and-communication.md) — By subdomain, sync/async, Service Mesh, API Gateway, Conway's Law
- [02-data-patterns.md](microservice-patterns/02-data-patterns.md) — Database per Service, CQRS impl, Event Sourcing impl, CDC, polyglot persistence
- [03-resilience-patterns.md](microservice-patterns/03-resilience-patterns.md) — Circuit Breaker, Bulkhead, Retry/Backoff, Timeout, Fallback, Chaos Engineering

## Frontend Architecture

- [01-component-architecture.md](frontend-architecture/01-component-architecture.md) — Atomic Design, Feature-Sliced Design, Design System, Design Tokens
- [02-state-and-data.md](frontend-architecture/02-state-and-data.md) — Server state, client state, TanStack Query, Zustand, XState, real-time data
- [03-micro-frontends.md](frontend-architecture/03-micro-frontends.md) — Module Federation, single-spa, Shell app, composition approaches

## Security

- [01-threat-modeling.md](security/01-threat-modeling.md) — STRIDE, DREAD, attack trees, trust boundaries, DFD for security
- [02-auth-patterns.md](security/02-auth-patterns.md) — OAuth 2.0, OIDC, JWT, RBAC/ABAC/ReBAC, microservice auth
- [03-secure-coding.md](security/03-secure-coding.md) — OWASP Top 10, input validation, output encoding, CSP, SAST/DAST

## Observability

- [01-three-pillars.md](observability/01-three-pillars.md) — Structured logging, metrics (RED/USE), distributed tracing, correlation
- [02-opentelemetry.md](observability/02-opentelemetry.md) — OTel API/SDK/Collector, OTLP, auto-instrumentation, ADOT (AWS)
- [03-sli-slo-alerting.md](observability/03-sli-slo-alerting.md) — SLI/SLO/SLA, error budgets, multi-burn-rate alerting, incident response

## Web Testing

- [01-test-strategy-shapes.md](web-testing/01-test-strategy-shapes.md) — Test Pyramid, Testing Trophy, Honeycomb, Diamond, choosing the right shape
- [02-e2e-testing.md](web-testing/02-e2e-testing.md) — E2E philosophy, CUJs, Playwright, Cypress, test patterns, BDD integration
- [03-web-integration-testing.md](web-testing/03-web-integration-testing.md) — Testing Library, Component Testing, Storybook, MSW, Pact-to-MSW
- [04-visual-regression-testing.md](web-testing/04-visual-regression-testing.md) — Screenshot comparison, Percy, Chromatic, baseline management
- [05-accessibility-testing.md](web-testing/05-accessibility-testing.md) — axe-core, WCAG 2.1/2.2, POUR, keyboard/screen reader testing
- [06-web-performance-testing.md](web-testing/06-web-performance-testing.md) — Core Web Vitals, Lighthouse CI, RUM, k6 load testing, performance budgets

## Contract Testing

- [01-contract-testing-complete.md](contract-testing/01-contract-testing-complete.md) — CDC, Pact, REST/GraphQL/gRPC/Event patterns, DDD context mapping

## Continuous Delivery

- [01-core-principles.md](continuous-delivery/01-core-principles.md) — Seven Principles, Deployment Pipeline
- [02-deployment-strategies.md](continuous-delivery/02-deployment-strategies.md) — Blue-Green, Canary, Feature Flags, Immutable Infrastructure
- [03-practices.md](continuous-delivery/03-practices.md) — Trunk-Based Dev, Config as Code, DB Migration, Test Pyramid, Observability

## Architecture

- [01-rozanski-woods.md](architecture/01-rozanski-woods.md) — 7 Viewpoints, 10 Perspectives, Stakeholder Analysis
- [02-c4-model.md](architecture/02-c4-model.md) — 4 Levels, Supplementary Diagrams, Structurizr DSL
- [03-uml.md](architecture/03-uml.md) — 7 Structure + 7 Behavior diagrams, DDD mapping
- [04-continuous-architecture.md](architecture/04-continuous-architecture.md) — 6 Principles, 4 Essential Activities
- [05-adr.md](architecture/05-adr.md) — Structure, MADR, Lifecycle, ADR as Code

## AWS Well-Architected

- [01-six-pillars.md](aws-well-architected/01-six-pillars.md) — Operational Excellence, Security, Reliability, Performance, Cost, Sustainability
- [02-review-process-and-lenses.md](aws-well-architected/02-review-process-and-lenses.md) — Review Process, 16+ Lenses, R&W mapping
