# Runbook: RDS Storage Low

## Trigger
RDS free storage < 5GB

## Severity
**CRITICAL** — Running out of storage causes database to become read-only; immediate action required.

## Steps

1. **Check current usage**: AWS Console → RDS → Monitoring → Free Storage Space
2. **Identify largest tables**: `SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size FROM pg_tables ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC LIMIT 20;`
3. **Check for bloat (dead tuples)**: `SELECT schemaname, relname, n_dead_tup, last_autovacuum FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;`
4. **Run vacuum**: `VACUUM FULL <table>;` — reclaims space but locks table; schedule during low traffic
5. **Check WAL/log files**: Excessive WAL retention can consume storage
6. **Clean up old data**:
   - Archive or delete old reporting projections if applicable
   - Purge completed saga/outbox records older than retention period
7. **Increase storage**: AWS Console → RDS → Modify → increase Allocated Storage (no downtime)
8. **Enable storage auto-scaling**: Set maximum storage threshold to prevent recurrence

## Prevention
- Enable RDS storage auto-scaling with a sensible maximum
- Implement data retention policies (e.g., archive orders older than 2 years)
- Schedule regular VACUUM ANALYZE via pg_cron or maintenance window
- Monitor storage growth trend in CloudWatch dashboard
