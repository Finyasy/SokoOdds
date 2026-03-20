# ADR-002 Worker Runtime Ownership

- Status: Accepted
- Owner: SokoOdds Backend Platform
- Last updated: 2026-03-19

## Inputs

- settlement, reconciliation, notifications, and payment follow-ups should not run in API request handlers
- background jobs need retries, scheduling, and independent health behavior
- v1 should stay operationally simple and avoid unnecessary image sprawl

## Final Decision

`apps/worker` is a separate runtime service with explicit ownership over retryable and scheduled background tasks.

Worker-owned responsibilities:

- engine-result consumption
- settlement jobs
- reconciliation jobs
- payment follow-up checks
- notifications

V1 deployment shape:

- same codebase as `apps/api`
- same Docker image as `apps/api`
- different runtime command
- separate health and runtime behavior

That means the API and worker may share models and services, but they are not the same runtime process.

## Rejected Alternatives

### Put settlement and reconciliation in API request handlers

Rejected because these jobs are slow, retry-sensitive, and operationally different from interactive request handling.

### Create a completely separate codebase for the worker in v1

Rejected because it adds duplication and coordination cost too early. Shared code with separate runtime boundaries is the better launch tradeoff.

### Treat Celery or background tasks as "inside the API"

Rejected because it blurs ownership and encourages logic to leak into request handlers instead of worker entrypoints.

## Implementation Notes

- unknown worker modes must fail loudly
- worker runtime modes should be explicit in code and env configuration
- reconciliation and settlement must remain worker-owned even if the API exposes admin controls that trigger them
- logs and metrics should distinguish API-originated events from worker-originated execution
