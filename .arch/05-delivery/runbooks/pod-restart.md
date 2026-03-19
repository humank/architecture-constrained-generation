# Runbook: Pod Restart Loop

## Trigger
Pod restart count > 3 in 10 minutes

## Severity
**WARNING** — Frequent restarts indicate instability; may escalate to outage.

## Steps

1. **Identify the pod**: `kubectl get pods -n <namespace> --sort-by='.status.containerStatuses[0].restartCount'`
2. **Check pod events**: `kubectl describe pod <pod> -n <namespace>` — look at Events section
3. **Check termination reason**:
   - **OOMKilled**: Container exceeded memory limit. Increase `resources.limits.memory` in Helm values.
   - **CrashLoopBackOff**: Application crashes on startup. Check logs (step 4).
   - **Liveness probe failed**: App is unresponsive. Check health endpoint, tune probe thresholds.
4. **Check logs**: `kubectl logs <pod> -n <namespace> --previous` (use `--previous` to see logs from crashed container)
5. **Check recent deployments**: `kubectl rollout history deployment/<service> -n <namespace>`
6. **If bad deployment**: Rollback: `kubectl rollout undo deployment/<service> -n <namespace>`
7. **Check resource limits**: `kubectl top pod <pod> -n <namespace>` — compare with limits
8. **Check node pressure**: `kubectl describe node <node>` — look for memory/disk pressure conditions

## Prevention
- Set appropriate resource requests and limits based on load testing
- Configure liveness/readiness probes with adequate initial delay
- Run integration tests in pipeline before deploy
