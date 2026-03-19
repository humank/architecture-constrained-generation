# Continuous Delivery: Deployment Strategies

## Blue-Green Deployment

Two identical environments (blue/green). Blue = current production; green = new version.
Switch traffic when green validated. Instant rollback by switching back.
**Zero-downtime** releases.

## Canary Release

Deploy to small subset first (2% → 25% → 75% → 100%).
Measure error rates, response times, resource usage.
Lowest risk strategy. Easy rollback.

## Rolling Deployment

Instances updated incrementally, one at a time or in batches.
Mix of old/new versions temporarily running.

## Feature Flags / Feature Toggles

Code deployed but controlled via flags. Four categories:

| Category | Purpose | Longevity |
|---|---|---|
| **Release Toggles** | Ship incomplete code dormant | Short (1-2 weeks) |
| **Experiment Toggles** | A/B testing | Medium (until statistical significance) |
| **Ops Toggles** | Kill switches for unclear performance | Variable |
| **Permissioning Toggles** | Gate by user type (premium, beta) | Long-lived |

### Best Practices

- Treat toggles as inventory with carrying cost
- Implement expiration dates and time-bomb tests
- Remove release toggles immediately post-release
- Use Strategy pattern for long-lived toggles, not scattered conditionals

## Dark Launching

Release to small internal group before public release.
Users don't know they're testing new features.

## A/B Testing

Different versions run simultaneously as experiments.
Users assigned to cohorts. Compare against business metrics.

## Immutable Infrastructure

Servers never modified after deployment — replaced entirely.
Rollback = redeploy last known-good image.
Eliminates configuration drift and "snowflake" servers.

## Deployment Rings

Phase rollouts: internal → beta → region → global.
