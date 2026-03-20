# SokoOdds Reconciliation Runbook

## Purpose

This runbook defines how to verify financial consistency across wallets, ledger entries, payments, trades, and payouts.

For SokoOdds, reconciliation is not optional. It is the control that tells us whether the platform’s money-moving behavior still matches durable truth.

## Reconciliation Principles

- PostgreSQL is the source of truth
- ledger history is append-only
- wallet balances must reconcile from ledger effects
- payment records must reconcile to wallet and ledger effects
- any unexplained drift is treated as an incident until resolved

## Required Owners

- Finance/Reconciliation Owner
- API Owner
- Worker Owner
- Payments Owner

## Standard Schedule

- wallet-to-ledger reconciliation every 15 minutes
- payment reconciliation every 5 minutes
- full financial reconciliation report once daily

## Alert Thresholds

- alert if unreconciled ledger count is greater than `0` for more than 10 minutes
- alert immediately on any negative balance anomaly
- alert if any confirmed payment lacks matching wallet and ledger effects for more than 5 minutes

## Inputs For A Reconciliation Run

Collect:

- time window under review
- release SHA active during the period
- affected feature flags
- relevant payment provider references
- recent incident notes, if any

## Command Reference

### Current Local Baseline

The checked-in compose file includes `postgres`, `redis`, `api`, `worker`, `market-engine`, and `web`.

```bash
make ps
docker compose -f infra/compose/compose.yaml logs --tail=100 postgres
docker compose -f infra/compose/compose.yaml logs --tail=100 api
docker compose -f infra/compose/compose.yaml logs --tail=100 worker
docker compose -f infra/compose/compose.yaml exec postgres psql -U postgres -d sokoodds
```

### Service-Aware Examples

```bash
curl -fsS http://localhost:8000/api/v1/health/order-intake
curl -fsS http://localhost:9000/internal/health
```

## Wallet-To-Ledger Reconciliation

Goal:

- confirm each wallet’s current available and reserved balance can be explained by ledger history

Check:

- wallet row exists for each active trading user
- wallet balance totals match ledger-derived totals
- no wallet shows negative available or reserved balance

Investigate immediately if:

- wallet row has no supporting ledger history
- ledger-derived balance differs from stored wallet balance
- reserved balance remains stuck after cancellation, fill, or settlement

Example SQL:

```sql
select user_id, available_balance, reserved_balance
from wallets
where available_balance < 0 or reserved_balance < 0;
```

## Payment Reconciliation

Goal:

- confirm all confirmed payments have matching wallet and ledger effects exactly once

Check:

- every confirmed deposit has one wallet credit effect
- every confirmed deposit has one matching ledger entry
- duplicate callbacks did not create duplicate credits
- every approved withdrawal has one payout execution path and one ledger effect

Investigate immediately if:

- payment is confirmed but wallet was not credited
- wallet was credited without a confirmed payment
- withdrawal payout was attempted more than once

Example SQL:

```sql
select reference_id, count(*)
from ledger_entries
where reference_type in ('deposit', 'withdrawal')
group by reference_id
having count(*) > 1;
```

## Order And Reserve Reconciliation

Goal:

- confirm order submission, reserve movement, and outbox emission remain aligned

Check:

- every accepted order has one reserve ledger entry
- every accepted order has one outbox event
- replayed order submissions did not create duplicate reserve effects

Investigate immediately if:

- an order row exists without a reserve ledger entry
- an outbox event exists without a matching order
- repeated idempotent submissions changed money state

Example SQL:

```sql
select o.id
from orders o
left join ledger_entries l on l.reference_id = o.id and l.entry_type = 'order_reserve'
where l.id is null;
```

## Settlement Reconciliation

Goal:

- confirm market resolution and payouts were applied exactly once

Check:

- open orders were cancelled or settled according to market rules
- reserves were released correctly
- winners were paid once
- losers were not paid
- settlement reruns did not create duplicate credits

Investigate immediately if:

- payout amounts differ from market resolution logic
- losing positions received funds
- duplicate payout ledger entries exist

Example SQL:

```sql
select reference_id, user_id, count(*)
from ledger_entries
where entry_type = 'settlement_payout'
group by reference_id, user_id
having count(*) > 1;
```

## Manual Investigation Workflow

When drift is detected:

1. freeze or limit the affected feature if live user harm is possible
2. isolate the affected time window
3. identify impacted users, orders, payments, or markets
4. compare durable rows across wallet, ledger, order, payment, and outbox tables
5. determine whether the issue is:
   - missing write
   - duplicate write
   - stale retry
   - callback mismatch
   - settlement replay issue
6. document proposed repair steps before executing them

## Repair Rules

- never delete ledger rows as a normal repair path
- prefer compensating ledger entries over mutation
- record all manual repairs with operator identity, timestamp, and reason
- rerun reconciliation after every repair batch

## Output Of Each Reconciliation Run

Record:

- run timestamp
- owner
- time window covered
- number of discrepancies found
- severity of discrepancies
- actions taken
- whether unresolved drift remains

Store the completed output with the incident record when the run is incident-driven.

## Exit Criteria

A reconciliation run is complete when:

- all critical discrepancies are resolved or escalated
- unresolved drift has an owner and next action
- updated incident or repair notes are recorded

## Escalate Immediately If

- negative balances exist
- duplicate credits or payouts are confirmed
- unresolved ledger drift persists beyond alert thresholds
- reconciliation cannot determine the authoritative outcome from durable records
