# DDD Part V: Distillation

## Purpose

Reduce the model to its most essential elements, separating the Core Domain from everything else.

---

## Subdomain Classification

| Type | Description | Strategy |
|---|---|---|
| **Core Domain** | The most critical, differentiating part of the system. The unique selling point of the business. | Deserves best developers and maximum design effort |
| **Supporting Subdomain** | Needed to support the core but not the competitive advantage. Not available off-the-shelf | Custom development, but less investment than core |
| **Generic Subdomain** | Not distinctive to the business. Necessary but not differentiating (e.g., time-zone, money calculations) | Use off-the-shelf solutions or outsource |

---

## Distillation Techniques

### Domain Vision Statement

A short document (about one page) describing the core domain and the value it will bring. Guides
resource allocation and modeling choices. Not a technical document but a vision alignment tool.

### Highlighted Core

Two complementary techniques:

- **Distillation Document** — Brief documentation (3-7 pages) describing Core Domain and core
  element interactions. Focuses on abstractions and stable concepts. Not exhaustive, but a guide.
- **Flagged Core** — Marking elements of the Core Domain within the primary repository of the model
  (e.g., tagging classes, packages, or modules as "core").

### Cohesive Mechanisms

Separate libraries encapsulating complex algorithms with intention-revealing names.

- Keep domain objects smaller and more focused
- **Distinct from Generic Subdomains** — Mechanisms solve generic computational problems (e.g., a
  graph traversal library), while Generic Subdomains remain part of the domain (e.g., accounting)
- Think of mechanisms as the "how" that supports the domain's "what"

### Segregated Core

Refactoring to physically separate the Core Domain into its own module(s), even if initially
tightly coupled to supporting elements.

- Move non-Core elements out of Core packages
- Reduce dependencies flowing into Core
- Make the Core's structure visible and protected

### Abstract Core

A special Core Module containing the essential abstract classes and interfaces describing the Core.

- Implementation-specific objects may live in separate modules
- Gives a succinct view of main concepts and interactions
- Particularly useful for large, complex Core Domains

---

## Key Insight

> Distillation and refactoring toward deeper insight reinforce each other. As you distill, you
> gain deeper insight. As you gain deeper insight, you can distill further.
