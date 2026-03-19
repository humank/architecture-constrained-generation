# Operational Viewpoint

## Overview

This viewpoint covers the operational concerns of running the Coffeeshop Management System in production: monitoring, alerting, incident response, backup, and scaling strategies.

## Monitoring

### Telemetry Stack

| Concern | Tool | Purpose |
|---------|------|---------|
| Metrics | CloudWatch Metrics | Service-level and infrastructure metrics |
| Logs | CloudWatch Logs | Centralized structured logging (JSON) |
| Traces | AWS X-Ray (via ADOT) | Distributed request tracing across services |
| Dashboards | CloudWatch Dashboards | Operational visibility |

### ADOT (AWS Distro for OpenTelemetry)

The ADOT Collector runs as a DaemonSet on every EKS node. Each service exports traces and metrics via the OpenTelemetry SDK. The collector forwards data to X-Ray (traces) and CloudWatch (metrics).

### Key Metrics

| Metric | Source | Purpose |
|--------|--------|---------|
| Request latency (p50, p95, p99) | ALB + X-Ray | SLO tracking |
| HTTP error rate (4xx, 5xx) | ALB access logs | Error budget burn |
| SQS queue depth | CloudWatch SQS metrics | Consumer lag detection |
| DLQ message count | CloudWatch SQS metrics | Poison message detection |
| RDS CPU / connections / IOPS | CloudWatch RDS metrics | Database health |
| Pod restart count | Kubernetes metrics | Stability tracking |
| Order completion rate | Custom metric (Ordering) | Business health |

## Alerting Strategy

### SLO-Based Burn Rate Alerts

The system uses multi-window burn rate alerting per the Google SRE model.

| SLO | Target | Error Budget (30d) |
|-----|--------|--------------------|
| Availability (Ordering) | 99.9% | 43.2 min downtime |
| Latency p99 (Ordering) | < 500ms | 0.1% of requests may exceed |
| Availability (Preparation) | 99.5% | 3.6 hr downtime |
| DLQ depth | 0 messages | Any message in DLQ is an incident |

### Alert Windows

| Window | Burn Rate Threshold | Severity | Action |
|--------|---------------------|----------|--------|
| 5 min / 1 hr | 14.4x | Critical | Page on-call immediately |
| 30 min / 6 hr | 6x | Warning | Notify channel, investigate within 1 hr |
| 6 hr / 3 day | 1x | Info | Review in next business day |

### Alert Routing

- **Critical**: PagerDuty -> on-call engineer phone + Slack #incidents
- **Warning**: Slack #alerts channel
- **Info**: Slack #ops-info channel

## Incident Response

### Severity Levels

| Severity | Definition | Response Time | Example |
|----------|-----------|---------------|---------|
| SEV-1 | Service down, orders cannot be placed | 15 min | Ordering service crash loop |
| SEV-2 | Degraded, partial functionality lost | 1 hr | SQS consumer lag > 5 min |
| SEV-3 | Minor issue, workaround available | 4 hr | Reporting projections stale |
| SEV-4 | Cosmetic or non-urgent | Next business day | Dashboard rendering glitch |

### Runbooks

Each service maintains a runbook in the `infra/runbooks/` directory covering:

1. **Service not starting**: Check Flyway migration status, RDS connectivity, IAM role permissions.
2. **High SQS queue depth**: Check consumer logs for exceptions, verify RDS connection pool, check for poison messages.
3. **DLQ messages present**: Inspect message content, identify root cause, deploy fix, redrive DLQ.
4. **RDS high CPU**: Identify slow queries via Performance Insights, check for missing indexes, consider read replicas.
5. **Pod OOMKilled**: Review memory limits, check for memory leaks, analyze heap dumps.
6. **Outbox poller stalled**: Check `SELECT ... FOR UPDATE SKIP LOCKED` contention, verify poller health check.

## Backup Strategy

### RDS Backups

| Parameter | Value |
|-----------|-------|
| Automated backups | Enabled |
| Backup retention | 7 days |
| Backup window | Daily, 02:00-03:00 UTC+8 |
| Manual snapshots | Before major deployments |
| Cross-region backup | Not enabled (single-region deployment) |
| Point-in-time recovery | Enabled (5 min granularity) |

### Application State

- **SQS messages**: Transient by design; DLQ retains failed messages for 14 days.
- **S3 frontend assets**: Versioned bucket with lifecycle policy.
- **Container images**: ECR retains last 20 image tags per repository.

### Recovery Targets

| Metric | Target |
|--------|--------|
| RPO (Recovery Point Objective) | 5 minutes (RDS PITR) |
| RTO (Recovery Time Objective) | 30 minutes (restore from snapshot + redeploy) |

## Scaling

### Horizontal Pod Autoscaler (HPA)

| Service | Metric | Target | Min Replicas | Max Replicas |
|---------|--------|--------|--------------|--------------|
| Ordering | CPU utilization | 60% | 2 | 8 |
| Preparation | CPU utilization | 60% | 2 | 6 |
| Inventory | CPU utilization | 50% | 2 | 4 |
| Reporting | CPU utilization | 50% | 2 | 4 |

### Cluster Autoscaler

| Parameter | Value |
|-----------|-------|
| Min nodes | 2 |
| Max nodes | 6 |
| Scale-down delay | 10 min after underutilization |
| Scale-up trigger | Pending pods due to insufficient resources |

### Database Scaling

- **Vertical**: Instance class upgrade (db.r6g.large -> db.r6g.xlarge) with minimal downtime via Multi-AZ failover.
- **Read replicas**: Can be added for Reporting Service read-heavy queries if needed.
- **Connection pooling**: Each service uses HikariCP with max pool size of 10 per pod.

### SQS Scaling

SQS scales automatically. No manual intervention is required. Consumer concurrency is controlled by the number of polling threads per pod and the number of pod replicas.
