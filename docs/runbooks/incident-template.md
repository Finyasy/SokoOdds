# SokoOdds Incident Template

## Purpose

Use this template whenever SokoOdds has a production issue that could affect:

- balances
- reserves
- deposits
- withdrawals
- order intake
- matching
- settlement
- market integrity

Create one incident record per event window. If the issue later turns out to be low severity, keep the record anyway.

## Incident Header

- Incident ID:
- Title:
- Severity:
- Status:
- Start time:
- Detected time:
- Declared time:
- Resolved time:
- Incident Commander:
- Finance/Reconciliation Owner:
- API Owner:
- Worker Owner:
- Engine Owner:
- Payments Owner:

## Impact Summary

- Affected environment:
- Affected services:
- User-visible impact:
- Money-moving impact:
- Markets affected:
- Estimated affected users:
- Whether order intake was disabled:
- Whether deposits were disabled:
- Whether withdrawals were disabled:

## Current State

- Current release SHA:
- Previous stable SHA:
- Current feature-flag state:
- Engine readiness state:
- Latest reconciliation status:
- Known data drift:

## Detection

- Detection source:
- First alert or report:
- Metric, alert, or log trigger:
- Links to dashboards:
- Links to logs:

## Timeline

Use Nairobi time and keep entries short.

| Time | Actor | Action |
| --- | --- | --- |
|  |  |  |
|  |  |  |
|  |  |  |

## Evidence Captured

- Health snapshots saved:
- Logs preserved:
- Payment references captured:
- Ledger or order IDs captured:
- Screenshots captured:
- Incident channel or notes link:

## Containment Actions

- Feature flags changed:
- Markets paused:
- Services rolled back:
- Services restarted:
- Payment flows paused:
- Customer communications posted:

## Financial Safety Checks

- Negative balances present:
- Duplicate credits suspected:
- Duplicate withdrawals suspected:
- Unreconciled ledger count:
- Settlement impact:
- Manual repairs performed:

## Root Cause Working Theory

- Suspected root cause:
- Why the issue happened:
- Why it was not caught earlier:

## Rollback And Recovery

- Rollback executed:
- Rollback SHA:
- Recovery steps completed:
- Remaining disabled features:

## Reconciliation Follow-Up

- Reconciliation runbook executed by:
- Time window reviewed:
- Drift found:
- Drift repaired:
- Remaining financial questions:

## Customer And Internal Communication

- Internal update sent at:
- Customer-facing update sent at:
- Next promised update time:
- Final closure message sent at:

## Closure Checklist

- Faulty behavior no longer live
- Affected features safe or intentionally disabled
- Finance owner confirms no unexplained drift remains
- Follow-up tickets created
- Post-incident review scheduled

## Follow-Up Tickets

| Ticket | Owner | Due date | Notes |
| --- | --- | --- | --- |
|  |  |  |  |
|  |  |  |  |
