# Event Storming: Building Blocks

## Sticky Note Types (Color-Coded)

| Element | Color | Description |
|---|---|---|
| **Domain Events** | Orange | Past-tense business occurrences (e.g., "Invoice Paid", "Order Placed") |
| **Commands** | Light Blue | Actions that trigger events, imperative form (e.g., "Pay Invoice") |
| **Aggregates** | Pale Yellow | Domain concepts/objects representing business entities with invariants |
| **Read Models** | Light Green | UI views or data presentations needed for decision-making |
| **External Systems** | Pink | Third-party systems that trigger commands or events |
| **Policies / Business Rules** | Lilac/Purple | "WHEN event THEN command" patterns representing automated reactions |
| **Hot Spots / Questions** | Red / Neon Pink | Unresolved conflicts, inconsistencies, frictions, or questions |
| **Opportunities** | Green | Identified improvements or solutions |
| **Actors / Personas** | Dark Yellow | The persona concerned by a command |
| **Comments** | White | Clarification attached to other artifacts |

## Three Event Trigger Sources

1. **Actor** — A human user initiates a command
2. **External System** — An external system sends an event or triggers a command
3. **Timer / Scheduling** — Events triggered by elapsed time completion

## Arrows

Show event flow direction between bounded contexts and indicate causality chains.
