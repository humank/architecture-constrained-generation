# Runbook: EKS Node CPU High

## Trigger
Node CPU utilization > 85% over 15 minutes

## Severity
**WARNING** — High node CPU causes pod throttling and potential scheduling failures.

## Steps

1. **Identify the hot node**: `kubectl top nodes`
2. **Identify top CPU pods on that node**: `kubectl top pods -A --sort-by=cpu | head -20`
3. **Check pod placement**: `kubectl get pods -A -o wide --field-selector spec.nodeName=<node>`
4. **Check HPA status**: `kubectl get hpa -A` — verify HPAs are not already at max replicas
5. **Check Cluster Autoscaler**: `kubectl logs -l app=cluster-autoscaler -n kube-system --tail=50` — look for scaling events or errors
6. **Check for resource request mismatches**: Pods requesting far less CPU than they use cause bin-packing issues
   - `kubectl describe pod <pod> -n <namespace>` — compare requests vs actual usage
7. **Short-term mitigation**:
   - If HPA at max, increase `maxReplicas`
   - If Cluster Autoscaler stuck, check ASG limits in AWS Console
   - Cordon node to prevent new scheduling: `kubectl cordon <node>`
8. **Long-term fixes**:
   - Right-size CPU requests based on observed usage (use Vertical Pod Autoscaler recommendations)
   - Ensure HPA target CPU is set appropriately (typically 70%)
   - Increase ASG max size for Cluster Autoscaler headroom

## Prevention
- Set CPU requests to match actual P95 usage
- Configure HPA with appropriate scaling thresholds
- Ensure Cluster Autoscaler ASG max allows sufficient headroom
