from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class WorkerTask:
    name: str
    description: str


WORKER_TASKS: tuple[WorkerTask, ...] = (
    WorkerTask("trade-results", "Consume trade results and trigger follow-up notifications."),
    WorkerTask("settlement", "Run settlement jobs after market resolution."),
    WorkerTask("reconciliation", "Compare wallet balances against append-only ledger totals."),
    WorkerTask("payment-followups", "Check and recover stuck or pending payment states."),
    WorkerTask("notifications", "Dispatch user-facing operational and trading notifications."),
)


def get_worker_tasks() -> tuple[WorkerTask, ...]:
    return WORKER_TASKS


def select_worker_tasks(mode: str) -> tuple[WorkerTask, ...]:
    if mode == "all":
        return WORKER_TASKS

    requested_names = {name.strip() for name in mode.split(",") if name.strip()}
    selected = tuple(task for task in WORKER_TASKS if task.name in requested_names)

    if len(selected) != len(requested_names):
        unknown = requested_names.difference({task.name for task in WORKER_TASKS})
        raise ValueError(f"Unknown worker mode(s): {', '.join(sorted(unknown))}")

    return selected
