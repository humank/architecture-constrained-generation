# Runbook: Zero Orders During Business Hours

## Trigger
No OrderPlaced events in 2 hours during business hours (8am-8pm)

## Severity
**WARNING** — May indicate a system outage preventing customers from placing orders.

## Steps

1. **Check ordering-service health**: `kubectl get pods -l app=ordering-service -n <namespace>` — are pods running and ready?
2. **Check ordering-service logs**: `kubectl logs -l app=ordering-service -n <namespace> --tail=100`
3. **Check API Gateway / ALB**: AWS Console → verify target group health checks are passing
4. **Check frontend reachability**: Manually test the ordering flow end-to-end
5. **Check payment gateway**: If payment integration is down, orders cannot complete
   - Check external payment service status page
   - Review ordering-service logs for payment-related errors
6. **Check database connectivity**: `kubectl exec -it <ordering-pod> -n <namespace> -- curl localhost:8080/actuator/health` — verify DB health indicator
7. **Check DNS resolution**: Verify Route53 records point to correct ALB
8. **Check for recent deployments**: `kubectl rollout history deployment/ordering-service -n <namespace>`
9. **If system is healthy**: This may be a genuine low-traffic period (holiday, weather, etc.). Verify with business team.
10. **If outage confirmed**: Follow incident response process, rollback if caused by recent deployment

## Prevention
- Synthetic monitoring (canary orders) to detect outages before customers do
- Health check endpoints that verify full dependency chain (DB, SQS, payment)
- Business hours calendar integration to reduce false positives
