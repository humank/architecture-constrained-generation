# Event Storming: Workshop Formats

## Big Picture Event Storming

**Purpose**: Maximize learning and create shared understanding across departments.

- Explores complex business domains collaboratively
- Identifies major domains/subdomains
- Establishes high-level system overview
- Discovers initial bounded contexts
- Surfaces critical problems and opportunities

**Participants**: Cross-functional teams (business, IT, stakeholders)
**Duration**: 2-4 hours

**Output**:
- High-level event timeline
- Identified bounded contexts
- Major integration points
- Critical hotspots and opportunities
- Shared domain vocabulary

### Typical Agenda

1. Kickoff & Scope Setting (15 min)
2. Chaotic Exploration (20-30 min)
3. Enforce Timeline (30-45 min)
4. Identify Pivotal Events (15 min)
5. Draw Swimlanes/Roles (20 min)
6. Discover Bounded Contexts (20 min)
7. Hotspots & Opportunities (15-30 min)
8. Review & Consensus (15 min)

---

## Process Level Event Storming

**Purpose**: Detail the flow of specific business processes within contexts.

- Focuses on a specific business workflow from start to finish
- Sequences of events and actions that drive system behavior
- Identifies command-event chains

**Participants**: Subject matter experts, developers
**Duration**: 4-8 hours

**Output**:
- Detailed event sequence within bounded context
- Command-event pairs
- Integration requirements
- Data needs for each transition
- Identified aggregates

---

## Design Level Event Storming

**Purpose**: Bridge business processes to implementable software design.

- Technical deep-dive into architecture
- 1:1 mapping to code-level implementation
- Aggregate boundary refinement
- Service decomposition planning

**Participants**: Primarily developers and architects
**Duration**: 4-6 hours

**Output**:
- Software architecture decisions
- Service/microservice boundaries
- Event handler implementations
- Saga/choreography patterns
- Repository and aggregate root designs

### Typical Agenda

1. Context Recap (15 min)
2. Add Commands to Events (30-45 min)
3. Identify Read Models (30 min)
4. Define Aggregates (45-60 min)
5. Map Policies (30-45 min)
6. Identify External Systems (20 min)
7. Define Integration Points (20 min)
8. Architecture Validation (30 min)
