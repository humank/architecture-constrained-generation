# ADR (Architecture Decision Records): Complete Reference

## Standard ADR Structure

### 1. Title

- Concise description of the decision
- Format: `[ADR number] - [Decision title]`
- Example: "0001 - Use PostgreSQL for primary database"

### 2. Status

Current state of the decision (see Lifecycle below).

### 3. Context

- Why this decision needed to be made
- Problem statement and background
- Constraints and requirements
- Alternative approaches considered
- Relevant facts and assumptions
- Urgency and deadline (if applicable)

### 4. Decision

- Stated in active voice
- Concise statement of the chosen solution
- Format: "We will [action] [because of reason]"
- Example: "We will implement event sourcing for audit trails to enable complete audit history"

### 5. Consequences

- Results of the decision (positive AND negative)
- Short-term and long-term impacts
- Tradeoffs accepted or rejected
- Dependencies created
- Constraints introduced
- Mitigation strategies for negative consequences
- Ripple effects on other systems/teams

---

## MADR Format (Markdown Architectural Decision Records)

### Templates Available

| Template | Description | Use Case |
|---|---|---|
| Full Annotated | All sections with explanations | New teams learning ADR |
| Full Bare | All sections, no explanations | Experienced ADR users |
| Minimal Annotated | Mandatory sections with explanations | Lightweight approach |
| Minimal Bare | Mandatory sections only | Urgent decisions |

### Extended Sections (Optional)

- **Rationale** — Why this decision over alternatives
- **Related ADRs** — Linked decisions
- **Decision Drivers** — Factors influencing decision
- **Options** — Alternatives considered with pros/cons
- **More Information** — References and resources

---

## ADR Lifecycle

```
Proposed → Accepted → (Superseded | Deprecated)
    ↓
 Rejected
```

| Status | Description |
|---|---|
| **Proposed** | Initial state; open for review and discussion |
| **Accepted** | Team agreed; ready for implementation; immutable once accepted |
| **Deprecated** | No longer relevant due to changing context (external factors) |
| **Superseded** | Replaced by new decision; new ADR references and explains replacement |
| **Rejected** | Considered but not chosen; record why to avoid revisiting |

### Key Rule

> Cannot modify an accepted ADR. Create a new ADR to supersede it.
> Both old and new recorded for historical context.

---

## When to Write ADRs

### Write ADR For

- **Architecturally significant decisions** — Affect fundamental structure or quality attributes
- **Technology stack choices** — Language, framework, database selections
- **Integration patterns** — Synchronous, asynchronous, event-driven
- **Deployment topology** — Infrastructure and deployment decisions
- **Security architecture** — Security design choices
- **Data model decisions** — Significant data structure choices
- **Multiple viable options** — Two or more options with real trade-offs
- **Lasting impact** — Creates long-term constraints or direction
- **Team alignment** — Need for shared understanding and buy-in

### Do NOT Write ADR For

- Non-significant implementation details
- Team practices / coding conventions
- Temporary workarounds
- Obvious decisions with no real alternatives
- **Warning**: Over-documenting dilutes ADR usefulness

---

## ADR as Code

### Version Control Storage

- Store in git alongside code
- Location: `/docs/adr/`, `/architecture/decisions/`, or similar
- Naming: Sequential numbering (0001, 0002) or timestamp-based
- Format: Plain Markdown for portability

### Code Integration

- Reference ADRs in code comments or commit messages
- Link from code to ADR for context
- Tools: `adr-tools`, `adr-viewer`

### CI/CD Integration

- Ensure decisions documented before major changes
- Require ADR link in PRs for significant changes
- Automatic documentation generation from ADR files
