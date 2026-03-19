# C4 Model (Simon Brown): Complete Reference

## Overview

A lightweight standard for visualizing software architecture through four hierarchical levels
of abstraction.

---

## Four Hierarchical Levels

### Level 1: System Context Diagram

- **Scope**: Entire system and its external environment
- **Elements**: The system (single box), external systems, external actors/users
- **Purpose**: Shows system boundaries and high-level dependencies
- **Audience**: Non-technical stakeholders, executives, business analysts
- **Key Question**: What does the system do and why?

### Level 2: Container Diagram

- **Scope**: Decomposition into high-level technology choices
- **Elements**: Containers (deployable units), external systems, users, communication protocols
- **Definition of Container**: A bundle of code, libraries, configuration, and data required to
  execute an application (web app, API, database, message queue, file system, etc.)
- **Purpose**: Shows overall structure and technology landscape
- **Audience**: Technical stakeholders, architects, new developers
- **Key Question**: How is the system decomposed into containers?

### Level 3: Component Diagram

- **Scope**: Decomposition of containers into components
- **Elements**: Components (logical groupings), relationships, external dependencies
- **Purpose**: Shows internal structure and responsibilities
- **Audience**: Developers, technical leads
- **Key Question**: What are the key responsibilities and dependencies?

### Level 4: Code Diagram

- **Scope**: Implementation details within a component
- **Elements**: Classes, interfaces, functions, database tables
- **Purpose**: Shows lowest-level design details
- **Audience**: Individual developers
- **Note**: Often generated from code rather than manually drawn

---

## Supplementary Diagrams

### System Landscape Diagram

- Shows all software systems within an enterprise
- Understanding system-to-system dependencies
- Impact analysis, integration points

### Dynamic Diagrams

- Shows how components/containers interact for specific features
- Sequence/interaction with messages over time
- Clarifies runtime behavior

### Deployment Diagrams

- Physical/infrastructure deployment of containers
- Deployment nodes: servers, CDNs, load balancers, cloud resources
- Container placement on nodes

---

## Notation Rules

### Boxes and Shapes

- Simple nested rectangles (no overly complex shapes)
- Color coding used consistently; consider accessibility
- Common convention: Blue for internal, gray for external

### Relationships and Arrows

- **Every arrow/relationship MUST have an explicit label**
- Label includes verb + communication mechanism
- Examples: "Sends customer data via REST/JSON", "Publishes events to"
- Solid lines: synchronous communication
- Dashed lines: asynchronous communication
- No unlabeled arrows allowed

### Labels and Descriptions

- Box labels include name AND type: `"Fraud API [Spring Boot Application]"`
- Every diagram must have a descriptive title
- Legends/keys explaining shape meanings, colors, line styles

---

## Structurizr DSL

Domain-Specific Language for modeling C4 as code.

### Key Elements

- **Workspace Definition** — Root container
- **People** — External users/actors
- **Software Systems** — Top-level systems
- **Containers** — Deployable components with technology spec
- **Components** — Logical groupings with responsibilities
- **Relationships** — Labeled connections with protocol
- **Views** — Context, container, component, dynamic, deployment views
- **Styling** — Colors, icons, shapes, themes

### Advantages

- Architecture stored as code in version control
- Generate diagrams from single source of truth
- Export to Mermaid, PlantUML, Structurizr cloud
- All diagrams stay synchronized
- IDE and CI/CD integration

---

## C4 and DDD Mapping

| C4 Level | DDD Concept |
|---|---|
| **System Context (L1)** | System landscape, domain boundaries |
| **Container (L2)** | Bounded Contexts |
| **Component (L3)** | Aggregates, Domain Services, Modules |
| **Code (L4)** | Entities, Value Objects, Repositories, Factories |

### Integration Patterns in C4

- **Context Maps** — Visualized in System Landscape or L2
- **Anti-Corruption Layers** — Shown as components within containers
- **Ubiquitous Language** — Expressed through consistent naming in diagrams
