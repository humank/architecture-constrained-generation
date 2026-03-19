# DDD Part VI: Large-Scale Structure

## Purpose

Provide organization to a large model without overly constraining the detailed design. A large-scale
structure gives an overall narrative to the system.

---

## Evolving Order

Let large-scale structure evolve organically with the application.

- Do NOT over-constrain with an up-front architecture
- The structure should help, not strait-jacket
- Start with the simplest structure that works
- Evolve as understanding deepens

---

## System Metaphor

A concrete, broad-stroke analogy from outside the domain that increases consistency and directs
development usefully.

- The metaphor must aid communication
- Dangerous if taken too literally or if it doesn't fit
- Example: "A firewall" as metaphor for a security system

---

## Responsibility Layers

Organize domain objects into layers by **domain responsibility** (NOT technical layers).

### Key Principles

- Lower layers remain decoupled from upper layers
- Lower layers can communicate upward via domain events
- **Relaxed Layered System** — Accessing any lower layer (not just immediately below) is preferable
  to strict hierarchies

### Domain-Level Layer Examples

```
┌─────────────────────────┐
│   Decision Support      │  ← Analysis, reporting
├─────────────────────────┤
│   Policy                │  ← Business constraints, rules
├─────────────────────────┤
│   Commitment            │  ← Ongoing goals, contracts
├─────────────────────────┤
│   Operations            │  ← Activities, triggers, processes
├─────────────────────────┤
│   Potential             │  ← Capabilities, resources
└─────────────────────────┘
```

- Layers should tell a story of the high-level purpose and design
- Different change rates per layer (Conceptual Contours at the large scale)

---

## Knowledge Level

A group of objects that describes how another group of objects should behave.

- Meta-model allowing configuration-driven behavior
- A particular case of the Reflection pattern
- Supports varying organizational structures (hierarchical, matrix, etc.) while maintaining SRP
- Allows the system to be self-aware and adaptable to changing needs

### Example

A "Role" knowledge-level object defines what permissions and behaviors a "User" operations-level
object can have. Changing the Role definition changes User behavior without modifying User code.

---

## Pluggable Component Framework

The most rigid pattern of strategic design.

- Components decoupled via interfaces, replaceable at runtime
- **Abstract Core Approach** — Central hub of interfaces defining component responsibilities
- Requires mature domain understanding; contradicts early iterative approaches
- Can emerge by defining interfaces at boundaries of Responsibility Layers

### Warning

> This is the most demanding of the large-scale structure patterns. Only attempt when the domain
> is well understood and the team has significant DDD experience.

---

## Refactoring Toward a Fitting Structure

Iteratively adjusting large-scale structure as understanding grows. The structure should follow
the domain's shape, not impose an arbitrary organization.

---

## Bringing the Strategy Together (Ch.17)

### Six Essentials for Strategic Design Decision Making

1. **Decisions must reach the entire team** — Everyone needs to understand and follow
2. **The decision process must absorb feedback** — Adapt as reality unfolds
3. **The plan must allow for evolution** — No frozen architectures
4. **Architecture teams must not siphon off the best developers** — Core domain needs the best
5. **Strategic design requires minimalism and humility** — Less is more
6. **Objects are specialists; developers are generalists** — Don't over-specialize team structure

### Assessment First

Evaluate the current state before imposing structure. Understand what exists before redesigning.

### Who Sets the Strategy

Discussion of organizational dynamics in strategic design decision-making.
