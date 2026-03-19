# UML (Unified Modeling Language): Complete Reference

## Structure Diagrams (7 types)

### 1. Class Diagram (Primary for DDD)

- Classes (name, attributes, operations)
- Associations, inheritance/generalization
- Aggregation and composition
- Multiplicity, visibility (public/private/protected)
- **DDD Use**: Model aggregates, entities, VOs, domain models

### 2. Object Diagram

- Specific instances at a particular point in time
- Objects, attribute values, links
- **Use**: Illustrate concrete examples of class structures

### 3. Package Diagram

- Packages (namespaces), dependencies
- **DDD Use**: Represent bounded contexts and module dependencies

### 4. Component Diagram

- Components, provided/required interfaces, dependencies
- **Use**: System architecture, technology stack visualization

### 5. Composite Structure Diagram

- Parts, ports, connectors (internal structure of a class)
- **Use**: Detailed behavioral specification

### 6. Deployment Diagram

- Nodes, artifacts, communication paths
- **DDD Use**: Physical distribution of bounded contexts

### 7. Profile Diagram

- Stereotypes, tagged values, constraints
- **Use**: Domain-specific extensions of UML

---

## Behavior Diagrams (7 types)

### 1. Use Case Diagram

- Use cases, actors, relationships (include, extend, generalization)
- System boundary
- **DDD Use**: Document domain use cases

### 2. Activity Diagram

- Activities, transitions, decision/merge nodes
- Parallel regions, start/end nodes
- **DDD Use**: Model business processes, aggregate lifecycle

### 3. State Machine Diagram (Important for DDD)

- States, transitions (events, guards, actions)
- Entry/exit actions, composite states
- **DDD Use**: Model aggregate state machines, valid transitions, invariants

### 4. Sequence Diagram (Primary for DDD)

- Lifelines, messages, activation boxes
- Sequence numbering
- Fragments: alt, par, opt, loop
- **DDD Use**: Illustrate aggregate interactions, command handling, event sequences

### 5. Communication Diagram

- Objects, links, messages with sequence numbers
- **Advantage**: Better shows object relationships; more compact than sequence

### 6. Timing Diagram

- Lifelines with state/value changes over time
- Timing constraints and durations
- **Use**: Real-time systems, timing-critical interactions

### 7. Interaction Overview Diagram

- Interaction frames, control flow between interactions
- **Use**: Orchestrate complex interaction scenarios

---

## Most Useful UML Diagrams for DDD

| Priority | Diagram | DDD Application |
|---|---|---|
| **Primary** | Class Diagram | Domain model, aggregates, entities, VOs |
| **Primary** | Sequence Diagram | Use case flows, interaction patterns, aggregate boundaries |
| **Important** | State Machine | Aggregate lifecycle, business rules, invariants |
| **Supporting** | Package Diagram | Bounded contexts, module organization |
| **Supporting** | Activity Diagram | Business processes before decomposition |
| **Supporting** | Component Diagram | Architectural layers |
