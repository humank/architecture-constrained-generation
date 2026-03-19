# Architecture Constrained Generation: The Complete Guide

> *From requirements to running code — a methodology that fuses 20+ years of software architecture wisdom into a single AI-orchestrated workflow.*

---

## Who This Guide Is For

This guide is for **software architects, tech leads, and senior engineers** who have felt the gap between architecture blueprints and actual working code. You've drawn C4 diagrams that no one reads, written ADRs that drift from reality, and watched Event Storming sticky notes gather dust.

**Architecture Constrained Generation (ACG)** closes that gap. It is a Claude Code skill (`/architect`) that takes your business requirements and systematically transforms them into a fully implemented system — with every line of code traceable back to an architecture decision.

This isn't code generation that ignores design. It's **design that generates code**.

---

## Table of Contents

### Part I: The Vision

| Chapter | Title | What You'll Learn |
|---------|-------|-------------------|
| [01](./01-why-architecture-constrained-generation.md) | **Why Architecture Constrained Generation** | The problem ACG solves: the gap between architecture and code. Why existing approaches fail. The core thesis. |
| [02](./02-the-methodology-map.md) | **The Methodology Map** | How 20+ methodologies (DDD, Event Storming, BDD, TDD, Clean Architecture, XP, ...) are woven into a single coherent pipeline. |

### Part II: The Nine Phases

| Chapter | Title | What You'll Learn |
|---------|-------|-------------------|
| [03](./03-phase-0-requirements.md) | **Phase 0: Requirements** | Impact Mapping, User Story Mapping, and seeding the Ubiquitous Language. |
| [04](./04-phase-1-discovery.md) | **Phase 1: Discovery** | Domain Storytelling, Event Storming (Big Picture → Process → Design Level), and Event Modeling. |
| [05](./05-phase-2-strategic-design.md) | **Phase 2: Strategic Design** | Bounded Contexts, Context Maps, Subdomain Classification, and the modulith-vs-microservices decision. |
| [06](./06-phase-3-tactical-design.md) | **Phase 3: Tactical Design** | Aggregate Design (Vernon's Four Rules), Supple Design, Clean Architecture, API Contracts, and Frontend Architecture. |
| [07](./07-phase-3c-ux-design.md) | **Phase 3c: UX Design** | Domain-driven visual design: design tokens, actor-scoped pages, status-to-color mapping, accessibility. |
| [08](./08-phase-4-specification.md) | **Phase 4: Specification** | BDD scenarios, Test Strategy Shapes, Threat Modeling (STRIDE), Contract Testing, and the Outside-In Double Loop. |
| [09](./09-phase-5-delivery.md) | **Phase 5: Delivery** | CI/CD Pipelines, IaC (CDK/Terraform), Observability (Three Pillars), SLI/SLO, and Runbooks. |
| [10](./10-phase-6-review.md) | **Phase 6: Architecture Review** | Rozanski & Woods 7 Viewpoints, 10 Perspectives, Anti-Pattern Detection, ADRs, and Cross-Phase Consistency. |
| [11](./11-phase-7-documentation.md) | **Phase 7: Documentation** | C4 Diagrams in Mermaid, Domain Models, Sequence Diagrams, State Machines — all living documentation. |
| [12](./12-phase-8-implementation.md) | **Phase 8: Implementation** | Architecture-constrained code generation. Java 21 DDD patterns. How every line traces back to an artifact. |

### Part III: The Engine Room

| Chapter | Title | What You'll Learn |
|---------|-------|-------------------|
| [13](./13-quality-gates-and-feedback-loops.md) | **Quality Gates & Feedback Loops** | 27 anti-pattern guards, 6 consistency threads, 29 feedback loops — the self-correcting mechanism. |
| [14](./14-the-knowledge-base.md) | **The Knowledge Base** | 50+ reference documents spanning 20+ methodologies. How domain knowledge powers constrained generation. |
| [15](./15-assessment-gates.md) | **Assessment Gates** | The human-in-the-loop mechanism: architecture decisions and technology stack questionnaires. |

### Part IV: Putting It All Together

| Chapter | Title | What You'll Learn |
|---------|-------|-------------------|
| [16](./16-walkthrough-coffeeshop.md) | **Walkthrough: The Coffeeshop** | A complete end-to-end example — from a one-page requirements doc to running microservices on AWS. |
| [17](./17-getting-started.md) | **Getting Started** | Installation, first run, customization, and extending the knowledge base. |

---

## How to Read This Guide

**If you're evaluating ACG**: Start with [Chapter 1](./01-why-architecture-constrained-generation.md) and [Chapter 2](./02-the-methodology-map.md) to understand the vision, then jump to [Chapter 16](./16-walkthrough-coffeeshop.md) for a concrete example.

**If you're learning the methodology**: Read Part II sequentially. Each chapter builds on the previous phase's output.

**If you want to understand the engineering**: Read Part III to see how quality gates, feedback loops, and the knowledge base create a self-correcting system.

**If you want to run it now**: Jump to [Chapter 17](./17-getting-started.md).

---

## The Core Insight

> Traditional code generation asks: *"What code should I write?"*
>
> Architecture Constrained Generation asks: *"Given these business requirements, these bounded contexts, these aggregate invariants, these BDD scenarios, these API contracts, these deployment targets — what is the **only** correct code?"*

The difference is the constraint chain. When you constrain generation with architecture, the code doesn't just work — it **provably** implements the design.

---

*This tutorial accompanies the [Architecture Constrained Generation](https://github.com/anthropics/architecture-constrained-generation) project.*
