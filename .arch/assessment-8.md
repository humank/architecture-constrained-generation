# Assessment — Phase 8: Technology Stack

**Status**: COMPLETED
**Generated**: 2026-03-19

---

Please answer each question below. Change status to `COMPLETED` when done.

---

## Q1: Backend Language

- [ ] **A) Java 21** — Mature ecosystem, Spring Boot, strong typing. Recommended for enterprise DDD.
- [ ] **B) Kotlin** — Modern JVM language, Spring Boot compatible, less boilerplate.
- [ ] **C) TypeScript (Node.js)** — Same language as frontend, NestJS framework.
- [ ] **D) Go** — Fast, low memory, good for microservices.
- [ ] **E) Other**: ___

**Your choice**: ___A

---

## Q2: Backend Framework

- [ ] **A) Spring Boot 3.x** — De facto for Java/Kotlin microservices. Spring Data, Spring Cloud AWS.
- [ ] **B) Quarkus** — Cloud-native, fast startup, GraalVM native image.
- [ ] **C) NestJS** — TypeScript, modular, DDD-friendly.
- [ ] **D) Other**: ___

**Your choice**: ___ Spring Boot 4.x

---

## Q3: Database

(Already decided in assessment-2: RDS PostgreSQL, schema-per-BC)

- [x] **PostgreSQL 16** on RDS

---

## Q4: ORM / Data Access

- [ ] **A) Spring Data JPA (Hibernate)** — Standard JPA, auto-schema from entities.
- [ ] **B) jOOQ** — Type-safe SQL, better control, works with Flyway schemas.
- [ ] **C) Spring Data JDBC** — Simpler than JPA, DDD aggregate-friendly.
- [ ] **D) Prisma** — TypeScript ORM (if Node.js backend).
- [ ] **E) Other**: ___

**Your choice**: ___A

---

## Q5: Migration Tool

- [ ] **A) Flyway** — SQL-based migrations. Recommended for seed data reliability.
- [ ] **B) Liquibase** — XML/YAML/SQL migrations, rollback support.
- [ ] **C) JPA ddl-auto** — NOT recommended for production (seed data issues).

**Your choice**: ___A

---

## Q6: Frontend Framework

- [ ] **A) React + TypeScript** — Largest ecosystem, component libraries, testing tools.
- [ ] **B) Vue 3 + TypeScript** — Simpler API, good DX.
- [ ] **C) Svelte + TypeScript** — Compile-time, smallest bundle.
- [ ] **D) Angular** — Full framework, enterprise features built-in.
- [ ] **E) Other**: ___

**Your choice**: ___A

---

## Q6a: IaC Tool

(Already decided in assessment-2 CDK generation, confirming here)

- [x] **AWS CDK TypeScript** — Already generated at `iac/`

---

## Q7: Frontend Build Tool

- [ ] **A) Vite** — Fast HMR, ES modules, good plugin ecosystem.
- [ ] **B) Next.js** — SSR/SSG, file-based routing.
- [ ] **C) Create React App** — Deprecated, not recommended.

**Your choice**: ___A

---

## Q8: CSS Strategy

- [ ] **A) Tailwind CSS** — Utility-first, rapid prototyping, consistent design.
- [ ] **B) CSS Modules** — Scoped CSS, no runtime overhead.
- [ ] **C) Styled Components** — CSS-in-JS, dynamic styling.
- [ ] **D) Vanilla CSS** — Plain CSS, minimal tooling.
- [ ] **E) Other**: ___

**Your choice**: ___A

---

## Q9: Component Library

- [ ] **A) shadcn/ui** — Copy-paste components built on Radix UI + Tailwind. Full control.
- [ ] **B) Ant Design** — Comprehensive enterprise UI, opinionated.
- [ ] **C) MUI (Material UI)** — Material Design, large ecosystem.
- [ ] **D) Chakra UI** — Simple, accessible, themeable.
- [ ] **E) None** — Build from scratch with Tailwind.
- [ ] **F) Other**: ___

**Your choice**: ___A

---

## Q10: State Management

- [ ] **A) TanStack Query (React Query)** — Server state management, caching, auto-refetch.
- [ ] **B) Zustand** — Simple, minimal, good for client state.
- [ ] **C) Redux Toolkit** — Mature, predictable, large apps.
- [ ] **D) Jotai** — Atomic state, React-native.

**Your choice**: ___A

---

## Q11: API Client

- [ ] **A) Fetch API + custom wrapper** — Simple, no dependencies.
- [ ] **B) Axios** — Popular, interceptors, request/response transforms.
- [ ] **C) ky** — Tiny, modern fetch wrapper.

**Your choice**: ___B

---

## Q12: Testing

- [ ] **A) Vitest + Testing Library + Playwright** — Fast unit tests, component tests, E2E.
- [ ] **B) Jest + Testing Library + Cypress** — Established, widely used.
- [ ] **C) Other**: ___

**Your choice**: ___A

---

## Q13: Routing

- [ ] **A) React Router v7** — Standard for React SPAs.
- [ ] **B) TanStack Router** — Type-safe, search params.
- [ ] **C) Other**: ___

**Your choice**: ___A

---

## Q14: Monorepo Tool (if applicable)

- [ ] **A) Turborepo** — Fast, caching, good for mono-repo with multiple packages.
- [ ] **B) Nx** — Full-featured, plugins, affected analysis.
- [ ] **C) None** — Simple folder structure, no monorepo tooling.

**Your choice**: ___A

---

## Reminder

After filling in all answers, change the status at the top to:

```
**Status**: COMPLETED
```
