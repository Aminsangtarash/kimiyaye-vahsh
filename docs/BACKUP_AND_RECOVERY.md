# Backup and Recovery

## What to back up

| Data | Location | Notes |
|------|----------|-------|
| Match audits | `.data/matches/` or `KV_PERSIST_DIR` | JSON + NDJSON |
| Postgres | volume `kv_pg` / managed DB | matches, actions, rewards |
| Canonical content | `data/*.json`, `assets/` | Git is source of truth |
| Secrets | secret manager | Never in git |

## File store backup

```bash
tar -czf kv-matches-$(date +%F).tgz .data/matches
```

Retain according to policy; completed records should not contain raw seeds.

## Postgres backup

```bash
pg_dump "$DATABASE_URL" -Fc -f kv-pg.dump
# restore:
pg_restore -d "$DATABASE_URL" --clean --if-exists kv-pg.dump
```

## Disaster recovery

1. Restore DB / match files.  
2. Redeploy server + web from known git tag.  
3. Re-apply migrations if empty DB.  
4. Rotate `GAME_TICKET_SECRET` only if compromised (invalidates outstanding tickets).

## RPO/RTO (MVP assumption)

- In-memory active lobbies: **not durable** — acceptable for MVP; document for players.  
- Completed match audits on disk/DB: durable once flushed.

## Do not back up

- `node_modules`, `dist`, temporary generator assets under Cursor project caches  
- Log lines containing redacted secrets (already scrubbed)
