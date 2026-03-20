# SokoOdds Launch Runbook

## Purpose

This runbook defines the minimum operational checklist for launching SokoOdds into a controlled environment or public stage.

It is intentionally conservative because SokoOdds handles:

- wallet balances
- reserved funds
- trade execution
- payment callbacks
- market resolution
- payouts

## Scope

Use this runbook for:

- closed beta launch
- public beta launch
- real-money launch stage changes
- major trading or payments feature releases

## Launch Roles

Required named owners before launch:

- Launch Commander
- API Owner
- Worker Owner
- Market Engine Owner
- Frontend Owner
- Payments Owner
- Finance/Reconciliation Owner
- Support/Communications Owner

## Pre-Launch Inputs

Before the launch meeting starts, these must exist:

- release candidate version or commit SHA
- deployment plan
- rollback plan
- reconciliation owner
- support escalation path
- on-call contact list
- feature flag plan

## Non-Negotiable Gates

Launch must not proceed unless all are true:

- durable idempotency is active for all money-sensitive POSTs
- worker-owned settlement and reconciliation paths are in place
- engine readiness gating is active before Rust owns matching
- WebSocket sequence logic is implemented on producer and client sides if realtime trading is live
- wallet, ledger, order, and payout effects reconcile in automated tests
- audit logs exist for admin resolution and payout-triggering actions
- release and rollback owners are named

## Release Checklist

### Product and UX

- launch stage is clearly defined: internal, closed beta, public beta, or real-money stage
- feature flags are reviewed and defaulted correctly
- trust surfaces are visible on launch pages
- payment and wallet copy reflects actual live behavior

### Engineering Readiness

- database migrations have been reviewed and are reversible where practical
- API, worker, and engine images are built from the intended release commit
- health endpoints return expected values
- startup ordering is verified in the target environment
- engine health returns `ready` before live order intake is enabled

### Money Safety

- order intake integration tests pass
- idempotency replay tests pass
- callback duplicate-handling tests pass
- settlement idempotency tests pass
- latest reconciliation dry run shows no unexplained drift

### Payments

- payment credentials and callbacks are pointed at the correct environment
- M-Pesa deposit flow has a verified happy path
- withdrawal flow is disabled unless B2C and review rules are ready
- finance owner confirms deposit and withdrawal limits for the stage

### Operations

- dashboards are available for API, worker, engine, payments, and reconciliation
- alerts are enabled for negative balances, callback failures, engine readiness, and unreconciled ledger count
- support team has prepared launch messaging and known-issues guidance

## Closed Beta Default Controls

Default Stage 2 limits:

- invited users capped at `250`
- single deposit capped at `KES 2,500`
- daily deposit capped at `KES 10,000`
- daily withdrawal capped at `KES 5,000`
- withdrawals above `KES 2,500` require manual review
- open markets capped at `25`

## Launch Procedure

### Step 1: Final Go/No-Go Review

- confirm all owners are present or reachable
- confirm all checklist items above are green
- confirm rollback decision owner is named
- start an incident record using `docs/runbooks/incident-template.md` for the release window

### Step 2: Freeze Non-Essential Changes

- pause unrelated production changes
- stop non-urgent schema or infrastructure updates

### Step 3: Apply Migrations

- run migrations
- verify migration success
- verify new schema version matches the release

### Step 4: Deploy Services In Order

Deploy in this order:

1. database migrations
2. API
3. worker
4. market engine
5. frontend

After deployment:

- verify API health
- verify worker startup
- verify engine transitions from `hydrating` to `ready`
- verify frontend points to the correct API environment

### Step 5: Enable Feature Flags Gradually

- enable read-only product surfaces first
- enable wallet funding second
- enable order intake only after engine readiness is confirmed
- enable withdrawals only after payments owner approval

### Step 6: Run Post-Deploy Smoke Checks

- homepage and market pages load
- wallet balance endpoint responds
- order submission works once
- order replay returns the original response
- payment initiation enters `pending`
- health dashboards are receiving data

## Command Reference

### Current Local Baseline

The checked-in compose file includes `postgres`, `redis`, `migrate`, `api`, `worker`, `market-engine`, and `web`.

```bash
cp .env.example .env
make up
make ps
make health
make smoke
```

### Migration And Readiness Checklist

```bash
docker compose -f infra/compose/compose.yaml run --rm migrate
uv run pytest apps/api/tests/test_order_intake_service.py
uv run pyright
pnpm --filter web lint
```

Treat these as release-gate examples. The exact commands can evolve, but the gate itself should not.

## Abort Conditions

Stop launch or roll back if any of the following occur:

- negative wallet balance appears
- unreconciled ledger count is non-zero beyond alert threshold
- engine does not become `ready`
- duplicate payment credit is detected
- idempotency replay fails on a money-sensitive endpoint
- market data appears stale or out of sequence in a way that affects user decisions

## Sign-Off Record

Capture:

- date and time
- release SHA
- environment
- named approvers
- explicit go/no-go decision
- issues accepted for follow-up

## Post-Launch Review

Within 24 hours:

- run the reconciliation runbook
- review alerts and support tickets
- confirm no unexplained financial drift
- record lessons learned and required fixes
- attach the incident or release record to the final launch notes
