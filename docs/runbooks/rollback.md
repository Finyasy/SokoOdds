# SokoOdds Rollback Runbook

## Purpose

This runbook describes how to safely roll back SokoOdds after a faulty deployment or live incident.

Because SokoOdds moves money, rollback is not only about code. It is also about:

- containing user impact
- preserving ledger truth
- avoiding duplicate side effects
- keeping reconciliation possible

## When To Use This Runbook

Use rollback procedures when:

- order intake is accepting bad requests
- payments are duplicating or failing unsafely
- settlement is mis-crediting users
- engine readiness or matching behavior is broken
- frontend realtime is misleading users in a way that impacts trades

## Immediate Priorities

1. stop further harm
2. preserve durable evidence
3. contain money-moving features
4. communicate clearly
5. reconcile after rollback

## Incident Ownership

Required responders:

- Incident Commander
- API Owner
- Worker Owner
- Engine Owner
- Payments Owner
- Finance/Reconciliation Owner

## First 10 Minutes

### Step 1: Classify Severity

Decide whether the incident affects:

- read-only UX only
- order intake
- matching
- wallet balances
- payment credits or withdrawals
- settlement and payouts

### Step 2: Contain Exposure

Use feature flags or operational controls to:

- disable new order intake if engine or order logic is compromised
- disable deposits if payment handling is unsafe
- disable withdrawals if B2C or review controls are unsafe
- pause affected markets if resolution or pricing is compromised

### Step 3: Preserve Evidence

Before changing state:

- capture current release SHA
- capture service health snapshots
- preserve relevant logs
- preserve recent payment and ledger event IDs
- open or update `docs/runbooks/incident-template.md`

## Rollback Strategy By Layer

### Frontend Rollback

Use when:

- issue is isolated to rendering, UI routing, or non-authoritative presentation

Steps:

- redeploy previous frontend version
- verify API target is unchanged
- verify stale UI state is cleared or refreshed

Example commands:

```bash
docker compose -f infra/compose/compose.yaml logs --tail=100 web
make restart-web
```

### API Rollback

Use when:

- issue is isolated to request handling, auth, wallet orchestration, or admin actions

Steps:

- disable affected feature flags first
- deploy prior stable API build
- verify health endpoints
- verify idempotency behavior still works against existing durable records

Example commands:

```bash
docker compose -f infra/compose/compose.yaml logs --tail=200 api
make restart-api
make health
```

### Worker Rollback

Use when:

- issue affects settlement, reconciliation, payment follow-up, notifications, or engine-result consumers

Steps:

- stop the faulty worker runtime
- deploy prior stable worker build
- verify queued jobs are safe to replay
- verify consumers remain idempotent before restarting

Example commands:

```bash
docker compose -f infra/compose/compose.yaml logs --tail=200 worker
make restart-worker
```

### Engine Rollback

Use when:

- issue affects matching, sequencing, hydration, or engine readiness

Steps:

- disable order intake first
- stop the faulty engine
- deploy prior stable engine build
- wait for hydration and readiness
- verify offset recovery before re-enabling intake

Example commands:

```bash
docker compose -f infra/compose/compose.yaml logs --tail=200 market-engine
make restart-engine
make health
```

### Payments Rollback

Use when:

- issue affects deposit confirmation, callbacks, or withdrawals

Steps:

- disable new payment initiation
- pause automated withdrawal execution if needed
- preserve callback evidence
- verify no duplicate credits were created

Example actions:

```text
- set deposit initiation feature flag to disabled
- set withdrawal execution feature flag to disabled
- preserve payment provider reference IDs for the incident window
```

## Migration Rollback Rules

### Safe Default

Do not automatically reverse schema changes in production unless the reverse path is verified safe.

Preferred order:

1. roll back application code first
2. leave schema in place if backward-compatible
3. perform data repair before attempting destructive schema reversal

### Hard Stop

Do not run destructive rollback steps if:

- new ledger rows were written under the new release
- payment events were received under the new release
- settlement ran under the new release

In those cases, contain the feature, repair data, and use reconciliation before any schema reversal decision.

## Verification After Rollback

These checks must pass before reopening affected features:

- API health is green
- worker runtime is healthy
- engine reports `ready` if matching is live
- idempotent replay still returns original responses
- wallet and ledger counts reconcile for affected flows
- no new negative balance anomalies are present

## Operational Command Reference

### Current Local Baseline

The checked-in compose file includes the full core stack plus a one-shot `migrate` service.

```bash
make ps
make logs
docker compose -f infra/compose/compose.yaml stop api worker market-engine web
make up
```

If only one layer is affected, prefer rolling back the smallest safe surface first.

## Communication Template

Communicate:

- what was disabled
- what remains available
- whether any money-moving action may be delayed
- when the next update will be posted

Do not claim balances are unaffected until reconciliation confirms that is true.

## Handoff To Reconciliation

After containment and rollback:

- run the reconciliation runbook
- record all affected time windows
- record the exact release SHA and rollback SHA
- document any manual repairs made
- link the completed incident template and any SQL evidence used during repair

## Closure Criteria

The incident should not be marked resolved until:

- the faulty release is no longer serving the affected behavior
- affected features are either safe or intentionally disabled
- reconciliation owner confirms no unexplained financial drift remains
- follow-up remediation tickets are created
