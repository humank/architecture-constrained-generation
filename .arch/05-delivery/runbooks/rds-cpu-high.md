# Runbook: RDS CPU High

## Trigger
RDS CPU utilization > 80% over 10 minutes

## Severity
**WARNING** — Sustained high CPU degrades query performance and can cause connection timeouts.

## Steps

1. **Check Performance Insights**: AWS Console → RDS → Performance Insights → Top SQL
2. **Identify slow queries**: Enable slow query log if not already on. Look for full table scans.
3. **Check connection count**: `SELECT count(*) FROM pg_stat_activity;` — excessive connections cause CPU overhead
4. **Check for missing indexes**: `SELECT * FROM pg_stat_user_tables WHERE seq_scan > idx_scan;`
5. **Check for long-running transactions**: `SELECT pid, now() - xact_start AS duration, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC;`
6. **Check for vacuum/analyze running**: `SELECT * FROM pg_stat_progress_vacuum;` — autovacuum can spike CPU
7. **Short-term mitigation**:
   - Kill long-running queries: `SELECT pg_terminate_backend(<pid>);`
   - Scale up RDS instance class if sustained
8. **Long-term fixes**:
   - Add missing indexes (coordinate with Flyway migration)
   - Optimize N+1 queries in service code
   - Consider read replicas for reporting-service queries

## Prevention
- Performance test with realistic data volumes
- Monitor slow query log in CI pipeline
- Flyway migrations include index creation for new query patterns
