# Runbook: RDS Connections High

## Trigger
RDS connections > 80% of max_connections

## Severity
**WARNING** — Exhausting connections causes application errors and potential outage.

## Steps

1. **Check current connections**: `SELECT count(*) FROM pg_stat_activity;`
2. **Check connections by state**: `SELECT state, count(*) FROM pg_stat_activity GROUP BY state;`
3. **Check connections by application**: `SELECT application_name, count(*) FROM pg_stat_activity GROUP BY application_name;`
4. **Identify idle connections**: `SELECT pid, usename, application_name, state, now() - state_change AS idle_duration FROM pg_stat_activity WHERE state = 'idle' ORDER BY idle_duration DESC;`
5. **Check HikariCP pool settings** (per service):
   - `spring.datasource.hikari.maximum-pool-size` — default 10, should be tuned per service
   - Formula: `max_connections = (pod_count × pool_size_per_pod) + headroom`
6. **Check for connection leaks**: Look for steadily increasing idle connections from one service. Fix: ensure `@Transactional` or try-with-resources on connections.
7. **Short-term mitigation**:
   - Kill idle connections: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '10 minutes';`
   - Reduce HikariCP pool size and restart pods
8. **Long-term fixes**:
   - Right-size HikariCP pool per service based on actual usage
   - Consider PgBouncer as connection pooler in front of RDS
   - Scale up RDS instance class (higher max_connections)

## Prevention
- HikariCP leak detection: `spring.datasource.hikari.leak-detection-threshold=30000`
- Monitor connection count per service in CloudWatch dashboard
