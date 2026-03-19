# Continuous Delivery: Core Principles and Pipeline

## Definition

> "The ability to get changes of all types — features, configuration, bug fixes, experiments —
> into production safely, quickly, and sustainably."

---

## Seven Principles

1. **Every change is a release candidate** — By deployment day, RC has passed all tests
2. **Automate almost everything** — Except exploratory testing and customer demos
3. **Keep everything in version control** — Code, tests, deployment scripts, infrastructure, config
4. **If it hurts, do it more frequently** — More frequent releases = lower risk per release
5. **Build quality in** — Testing is not a phase; catch defects at earliest stage
6. **Done means released** — No "80% complete"; stories are finished or not
7. **Everyone is responsible** — Dev, ops, testing, DBA, infrastructure collaborate from start

### Key Mantras

- "Bring the pain forward"
- "You can't cheat shipping"
- "Never go home on a broken build"
- "Stop the line" — entire team pauses when pipeline fails
- Mary Poppendieck's Question: "How long to deploy a single-line change reliably?"

---

## Deployment Pipeline

The key pattern enabling CD — provides visibility into production readiness.

### Commit Stage (~10 min max)

- Compile code
- Run unit tests and component tests
- Static code analysis (duplication, complexity, coupling, style)
- Produce deployable artifacts
- **Rule**: Fix broken builds immediately; revert within 10 min if unfixable

### Acceptance Test Stage

- Automated acceptance tests against production-like environment
- Tests business value, not implementation details
- Written **before** development begins
- Prefer API-level tests over brittle UI tests

### Manual Test Stage

- Exploratory testing by experienced testers
- UAT (User Acceptance Testing)
- Validates usability

### Capacity / Non-Functional Test Stage

- Load testing, stress testing, soak testing
- Security testing
- Present facts; humans make go/no-go decisions

### Production Deployment Stage

- Deploy to production or identical staging
- Smoke testing post-deployment
- Release warm-up before accepting traffic

### Pipeline Rules

- Every commit triggers automatically
- **Binaries built once and promoted** (never rebuilt)
- Any build failing a stage is rejected
