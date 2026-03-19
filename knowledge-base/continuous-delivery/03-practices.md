# Continuous Delivery: Practices

## Configuration Management

### Configuration as Code

- Externalize ALL configuration from compiled binaries
- Version control all configuration alongside application code
- Apply 12-factor app principles
- Identical setup across dev/staging/production

### Infrastructure as Code

- Specify desired state through version-controlled configuration
- Automate provisioning and management
- Cheaper to create new environments than patch existing
- Prohibit manual server modifications

### Secrets Management

- Store in managed vaults (KMS, HashiCorp Vault)
- Never store secrets in version control
- Rotate credentials automatically
- Audit secret access

---

## Database Migration / Evolution

### Expand-Contract Pattern (Parallel Change)

1. **Expand**: Introduce new schema without removing old. Both coexist. Write to both.
2. **Migrate**: Update code to use new structures. Backfill historical data.
3. **Contract**: Remove obsolete structures once no longer in use.

### Key Principles

- Only **additive** changes during deployment (never destructive)
- Backward-compatible changes allow rollback without data loss
- Test backup/recovery regularly
- Deploy DB changes as part of regular releases

---

## Trunk-Based Development

### Core

- Single branch called "trunk" (main)
- Resist creating long-lived branches
- Short-lived feature branches: merged within hours to a day

### Feature Flags for Incomplete Features

- Wrap changes in inactive code path; activate later
- Separates **deployment** from **release**

### Branch by Abstraction

For complex refactors:

1. Create abstraction layer (not a Git branch)
2. Implement new solution behind it
3. Switch consumers from old to new
4. Remove old implementation and abstraction

### CI Practices

- Build/test on every commit
- Commit to mainline multiple times daily
- Stop work immediately on broken builds
- Never comment out failing tests

---

## Testing Strategy

### Test Pyramid (Mike Cohn)

```
         ┌───────────┐
         │   E2E     │  ← Fewest (high-value journeys only)
        ┌┴───────────┴┐
        │  Acceptance  │
       ┌┴─────────────┴┐
       │  Contract      │
      ┌┴───────────────┴┐
      │  Integration     │
     ┌┴─────────────────┴┐
     │    Unit Tests      │  ← Most (fast, isolated)
     └───────────────────┘
```

**Anti-pattern**: Test ice-cream cone (excessive high-level tests).

**Two rules**:
1. If a higher-level test catches an error no lower-level test caught → write a lower-level test
2. Push tests as far down the pyramid as possible

### Shift-Left Testing

Move testing earlier. Invest more in unit/integration.

### Testing in Production

Canary releases, chaos engineering, A/B testing.

### Chaos Engineering

Deliberately introduce controlled disruptions.
Integrate chaos experiments into CI/CD pipeline.

### Smoke Tests

Lightweight critical tests immediately after deployment.
Validate core functionality and configuration.

---

## Monitoring and Observability

### Three Pillars

| Pillar | Purpose |
|---|---|
| **Logs** | Detailed records of what happened, where, when, how |
| **Metrics** | Numerical measurements (CPU, response time, error rate) |
| **Traces** | Path of individual requests through the system |

Metrics alert → Traces show path → Logs provide resolution context.

### Rollback Triggers

- HTTP error rate spikes
- Latency beyond thresholds
- Crash loops
- Health check failures
- Canary statistical deviation

---

## Release Management

### Semantic Versioning

`MAJOR.MINOR.PATCH`
- MAJOR: Breaking changes
- MINOR: Backward-compatible features
- PATCH: Bug fixes

### Maturity Model (6 Levels)

| Level | Name | Key Characteristic |
|---|---|---|
| -1 | Regressive | Manual, poorly controlled |
| 0 | Repeatable | Regular automated builds |
| 1 | Consistent | Automated build/test on every commit |
| 2 | Qualitatively Managed | Metrics gathered and acted on |
| 3 | Optimizing | All environments fully managed, rollbacks rare |

---

## Lean Foundations

### Theory of Constraints

1. Identify pipeline bottleneck
2. Maximize its throughput
3. Subordinate other processes
4. Elevate the constraint
5. Repeat

### Key Metrics

- **Cycle time** (most important)
- Automated test coverage
- Defect count
- Commits/builds per day
- Build failure rate
- Build duration
