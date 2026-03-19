# Event Storming: Facilitation Concepts & Techniques

## Chaotic Exploration Phase

- Divergent thinking without structure
- Team identifies as many events as possible
- Participants place orange stickies freely
- Intentionally feels chaotic — warn participants this is expected and healthy
- Duration: 5-15 minutes
- Success indicator: speed of new events dramatically slows down

## Enforce Timeline

- Arrange events in chronological order
- Remove duplicate stickies
- Ensure flow consistency from beginning to end
- Identify and fill gaps
- Prevent discussions from derailing timeline work
- Create hotspots for unresolved concerns

## Reverse Narrative

Walk through timeline **backward** (end to start) to discover missing events and validate
dependencies.

- Reveals "magical gaps" in event flow
- Example: "Invoice must be sent before it can be paid"
- Enforces system consistency

## Pivotal Events

The few most significant events in the flow.

- Events with highest number of stakeholders interested
- Indicate transitions between major business phases
- Often mark **bounded context boundaries**
- Creates visible structure on the board
- Example: "Order Placed", "Payment Received", "Order Shipped"

## Swimlanes

Separate roles, departments, or parallel processes.

| Type | Description |
|---|---|
| Role-based | Customer, Sales, Fulfillment |
| Department | Sales, Accounting, Shipping |
| Process | Parallel flows that converge |

## Bounded Context Boundary Discovery

### Recognition Patterns

1. **Linguistic Boundaries** — Different departments use different language for similar concepts
2. **Time Boundaries** — Pivotal events indicate shifts between contexts
3. **Subject Boundaries** — Multiple simultaneous event series that converge later
4. **Organizational Boundaries** — Handoffs between departments or units
5. **Geographical/Legal Boundaries** — Location or regulatory differences

Visual markers: Vertical lines separating event streams (blue painter's tape).

## Opportunity & Risk Identification

### Opportunities (Green stickies)
- Dedicated phase after initial modeling complete
- Surfaces innovations and efficiencies
- Automation candidates, process consolidation, new revenue streams

### Risks / Frictions (Red/Hot Spots)
- Inconsistencies (language, logic, data)
- Frictions (bottlenecks, unclear ownership)
- Questions (missing information, unclear rules)
- Dissent (disagreement on process)
- Procrastinated decisions (deferred deep dives)

## Saga & Choreography Discovery

### Choreography-Based Sagas
- Event-driven, no central orchestrator
- Services listen to events autonomously
- Loosely coupled through event exchange

### Orchestration-Based Sagas
- Central orchestrator manages flow
- Identified when one process must control multiple steps
- Explicit coordination required

### What Event Storming Reveals About Sagas
- Which events trigger which commands across services
- Compensation events for failure scenarios
- Service boundaries in saga execution

## Connection to DDD

| Event Storming Element | DDD Concept |
|---|---|
| Orange stickies | Domain Events |
| Yellow stickies | Aggregates |
| Blue stickies | Commands → Command Handlers |
| Lilac stickies | Policies → Domain Services / Saga |
| Green stickies | Read Models → CQRS Query Side |
| Pink stickies | External Systems → ACL / OHS |
| Bounded Context discovery | Strategic Design |
| Swimlanes | Bounded Context candidates |

## Variations

- **Value-Driven Event Storming** — Maps value chain, identifies value-adding vs. non-value activities
- **UX-Driven Event Storming** — Focuses on user journey, Read Model emphasis
- **Event Storming as Retrospective** — Chain of events used to seek improvements
- **Remote/Distributed Event Storming** — Digital tools, structured turn-taking
