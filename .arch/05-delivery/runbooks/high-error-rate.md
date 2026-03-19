# Runbook: High Error Rate

## Trigger
SLO burn rate > 14.4x over 1h (2% of monthly error budget consumed in 1 hour)

## Severity
**CRITICAL** — Page on-call immediately.

## Steps

1. **Check which service**: Look at CloudWatch dashboard → Error Rate per Service
2. **Check recent deployments**: `kubectl rollout history deployment/<service> -n <namespace>`
3. **If canary deployment active**: Auto-rollback should trigger. Verify: `kubectl rollout status`
4. **Check logs**: `kubectl logs -l app=<service> -n <namespace> --tail=100`
5. **Check traces**: AWS X-Ray → filter by service + error status
6. **Common causes**:
   - **DB connection pool exhausted**: Check RDS connections metric. Increase pool size or scale pods.
   - **SQS consumer error**: Check DLQ for failed messages.
   - **OOM Kill**: Check pod events: `kubectl describe pod <pod> -n <namespace>`. Increase memory limit.
   - **Bad deployment**: Rollback: `kubectl rollout undo deployment/<service> -n <namespace>`
7. **Mitigate**: If root cause unclear, rollback to last known good version
8. **Resolve**: Fix root cause, deploy fix through pipeline

## Escalation
If not resolved within 30 minutes → escalate to team lead.
