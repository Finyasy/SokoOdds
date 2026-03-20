# SokoOdds Monitoring Reference

## Purpose

This document defines the minimum monitoring, alerting, and evidence expectations for SokoOdds.

For a money-moving platform, monitoring is part of the control system, not just a convenience.

## Monitoring Principles

- PostgreSQL-backed financial truth is the reference point for investigation
- health checks should distinguish `ready` from merely `running`
- alerting should focus on user harm and money risk before generic noise
- every alert should map to an owner and a runbook

## Current Local Baseline

The checked-in compose stack currently starts:

- `postgres`
- `redis`
- `migrate`
- `api`
- `worker`
- `market-engine`
- `web`

Local command examples:

```bash
docker compose -f infra/compose/compose.yaml up -d postgres redis
docker compose -f infra/compose/compose.yaml run --rm migrate
docker compose -f infra/compose/compose.yaml up -d api worker market-engine web
docker compose -f infra/compose/compose.yaml ps
docker compose -f infra/compose/compose.yaml logs -f postgres
docker compose -f infra/compose/compose.yaml logs -f api
docker compose -f infra/compose/compose.yaml logs -f market-engine
```

## Target Service Topology

The intended monitored service set for SokoOdds is:

- `web`
- `api`
- `worker`
- `market-engine`
- `ws-gateway`
- `postgres`
- `redis`
- payments provider callbacks

## Minimum Dashboards

### Platform Overview

Show:

- release SHA by service
- service readiness
- request volume
- error rate
- background job backlog
- current incident banner if active

### Financial Safety

Show:

- negative balance count
- unreconciled ledger count
- pending deposits older than threshold
- pending withdrawals older than threshold
- duplicate callback detection count
- settlement jobs in progress

### Trading Health

Show:

- engine readiness
- books loaded
- last stream offset age
- orders accepted per minute
- orders rejected per minute
- order-to-outbox lag
- websocket disconnect rate

### Payments

Show:

- deposit initiation success rate
- callback success rate
- callback verification failures
- withdrawal approval count
- B2C payout success and failure counts
- stuck pending payments

## Minimum Alerts

### Critical Alerts

- negative balance anomaly detected
- unreconciled ledger count greater than `0` for more than `10` minutes
- confirmed payment without matching wallet and ledger effect for more than `5` minutes
- duplicate payout or duplicate credit suspected
- engine not `ready` while order intake is enabled

### High Alerts

- payment callback verification failures spike
- order intake idempotency conflict rate spikes unexpectedly
- stream offset stops advancing while order traffic exists
- websocket stale-state recovery rate spikes
- settlement job runs longer than expected threshold

### Medium Alerts

- elevated API `5xx` rate
- worker queue lag above threshold
- Redis memory pressure
- Postgres connection saturation

## Alert Ownership

| Alert Class | Primary Owner | Secondary Owner | Runbook |
| --- | --- | --- | --- |
| Financial drift | Finance/Reconciliation Owner | API Owner | `reconciliation.md` |
| Order intake / engine | Market Engine Owner | API Owner | `rollback.md` |
| Payments | Payments Owner | Finance/Reconciliation Owner | `rollback.md` |
| Release / deploy | Launch Commander | Relevant service owner | `launch.md` |

## Health Endpoints

Expected health checks:

- `GET /api/v1/health` on API
- `GET /api/v1/health/order-intake` on API
- `GET /internal/health` on market engine

Readiness interpretation:

- `running` means process is alive
- `ready` means the service can safely participate in money or trade flows

## Suggested Evidence To Preserve During Incidents

- current release SHA
- feature-flag state
- health endpoint output
- recent provider callback IDs
- recent order IDs and outbox event IDs
- relevant dashboard screenshots

## Local Investigation Commands

Current local stack:

```bash
docker compose -f infra/compose/compose.yaml ps
docker compose -f infra/compose/compose.yaml logs --tail=200 postgres
docker compose -f infra/compose/compose.yaml logs --tail=200 api
docker compose -f infra/compose/compose.yaml logs --tail=200 worker
docker compose -f infra/compose/compose.yaml logs --tail=200 market-engine
docker compose -f infra/compose/compose.yaml logs --tail=200 redis
curl -fsS http://localhost:8000/api/v1/health
curl -fsS http://localhost:8000/api/v1/health/order-intake
curl -fsS http://localhost:9000/internal/health
```

## Review Cadence

- review alert thresholds before each new launch stage
- review dashboards after every production incident
- review missing signals during every Sprint 8 and Sprint 9 readiness pass
