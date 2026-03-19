# Development Viewpoint

## Overview

The Coffeeshop Management System is organized as a mono-repo. Backend services are built with Java/Spring Boot using Gradle. The frontend SPA is built with TypeScript/React using Vite.

## Repository Structure

```mermaid
graph TD
    root["coffeeshop-system/"]
    root --> services["services/"]
    root --> frontend["frontend/"]
    root --> infra["infra/"]
    root --> buildSrc["buildSrc/"]
    root --> gradle["settings.gradle.kts"]
    root --> ci[".github/workflows/"]

    services --> ordering["ordering-service/"]
    services --> preparation["preparation-service/"]
    services --> inventory["inventory-service/"]
    services --> reporting["reporting-service/"]

    ordering --> ordSrc["src/main/java/"]
    ordering --> ordTest["src/test/java/"]
    ordering --> ordMigration["src/main/resources/db/migration/"]

    frontend --> spa["spa/"]
    spa --> spaSrc["src/"]
    spa --> spaPublic["public/"]
    spa --> viteConfig["vite.config.ts"]

    infra --> terraform["terraform/"]
    infra --> k8s["k8s/"]
    terraform --> modules["modules/"]
    k8s --> base["base/"]
    k8s --> overlays["overlays/"]
```

## Build Tools

| Component | Tool | Version | Purpose |
|-----------|------|---------|---------|
| Backend services | Gradle (Kotlin DSL) | 8.x | Build, test, dependency management |
| Frontend SPA | Vite | 5.x | Dev server, bundling, HMR |
| Infrastructure | Terraform | 1.7+ | AWS resource provisioning |
| Kubernetes manifests | Kustomize | 5.x | Environment-specific overlays |
| Container images | Docker | 24+ | Service containerization |

## Module Dependencies

```mermaid
graph LR
    subgraph "Gradle Modules"
        buildSrc["buildSrc<br/>(shared conventions)"]
        ordering["ordering-service"]
        preparation["preparation-service"]
        inventory["inventory-service"]
        reporting["reporting-service"]
    end

    buildSrc --> ordering
    buildSrc --> preparation
    buildSrc --> inventory
    buildSrc --> reporting

    subgraph "Shared Libraries (via buildSrc)"
        events["common-events<br/>(event envelope, DTOs)"]
        messaging["common-messaging<br/>(SNS/SQS config)"]
        observability["common-observability<br/>(tracing, metrics)"]
    end

    events --> ordering
    events --> preparation
    events --> inventory
    events --> reporting
    messaging --> ordering
    messaging --> preparation
    messaging --> inventory
    messaging --> reporting
    observability --> ordering
    observability --> preparation
    observability --> inventory
    observability --> reporting
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Language (Backend) | Java 21 |
| Framework | Spring Boot 3.3 |
| Language (Frontend) | TypeScript 5.x |
| UI Framework | React 18 |
| Database migrations | Flyway |
| Messaging | AWS SNS + SQS (via Spring Cloud AWS) |
| ORM | Spring Data JPA / Hibernate |
| Testing | JUnit 5, Testcontainers, Vitest |
| API documentation | SpringDoc OpenAPI |

## Coding Standards

### Backend (Java)

- **Package structure**: `com.coffeeshop.{bc}.{layer}` (e.g., `com.coffeeshop.ordering.domain`, `com.coffeeshop.ordering.application`, `com.coffeeshop.ordering.infrastructure`)
- **Architecture**: Hexagonal (ports and adapters) within each service
- **Naming**: Domain objects use ubiquitous language from the bounded context
- **Error handling**: Domain exceptions translated to HTTP problem details (RFC 7807)
- **Testing**: Unit tests for domain logic, integration tests with Testcontainers for repository and messaging
- **Code style**: Google Java Format, enforced via Spotless Gradle plugin
- **Static analysis**: SpotBugs + Error Prone

### Frontend (TypeScript/React)

- **Structure**: Feature-based folder organization (`features/ordering/`, `features/preparation/`)
- **State management**: React Query for server state, Zustand for client state
- **Component style**: Functional components with hooks
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint + Prettier

## CI/CD Pipeline

| Stage | Tool | Trigger |
|-------|------|---------|
| Lint + format check | GitHub Actions | Every push |
| Unit tests | GitHub Actions | Every push |
| Integration tests | GitHub Actions | PR to main |
| Container build | GitHub Actions + Docker | Merge to main |
| Image push | Amazon ECR | Post-build |
| Deploy (staging) | ArgoCD | Image tag update |
| Deploy (production) | ArgoCD | Manual promotion |

## Branching Strategy

- **Main branch**: `main` -- always deployable
- **Feature branches**: `feature/{ticket-id}-short-description`
- **Release**: Continuous delivery from `main` to staging; manual promotion to production
- **Hotfix**: `hotfix/{ticket-id}-description`, merged to `main`
