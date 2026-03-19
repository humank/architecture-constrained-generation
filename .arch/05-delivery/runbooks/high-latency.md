# Runbook: High Latency

## Trigger
P99 latency > 2000ms over 5 minutes (ordering-service)

## Severity
**CRITICAL** — NFR requires order processing < 2 seconds.

## Steps

1. **Check X-Ray traces**: Filter by duration > 2s. Identify slowest span.
2. **Common bottlenecks**:
   - **DB queries**: Check RDS CPU + slow query log. Add indexes or optimize query.
   - **SQS publish**: Check SNS publish latency. Usually transient.
   - **Cold start**: Check if pods just scaled up. Wait for warm-up.
   - **GC pressure**: Check JVM heap usage. Tune GC or increase memory.
3. **Scale horizontally**: `kubectl scale deployment/<service> --replicas=<N> -n <namespace>`
4. **Check HPA**: Is it already at max? Increase max if needed.
5. **Check node resources**: `kubectl top nodes`. If CPU/memory saturated, Cluster Autoscaler should add nodes.

## Prevention
- Performance test in pipeline (k6 stage)
- HPA configured with appropriate thresholds
- Connection pooling for RDS (HikariCP)
