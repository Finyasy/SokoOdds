from __future__ import annotations

import os
from datetime import UTC, datetime
from pathlib import Path
from time import sleep

from app.jobs.notifications import run_notification_loop
from app.jobs.payment_followups import run_payment_followup_loop
from app.jobs.reconciliation import run_reconciliation_loop
from app.jobs.settlement import run_settlement_loop
from app.jobs.trade_results import run_trade_result_consumer
from app.runtime import select_worker_tasks

WORKER_HANDLERS = {
    "trade-results": run_trade_result_consumer,
    "settlement": run_settlement_loop,
    "reconciliation": run_reconciliation_loop,
    "payment-followups": run_payment_followup_loop,
    "notifications": run_notification_loop,
}


def write_heartbeat(path: Path) -> None:
    path.write_text(datetime.now(UTC).isoformat())


def main() -> None:
    mode = os.getenv("WORKER_MODE", "all")
    tick_seconds = float(os.getenv("WORKER_TICK_SECONDS", "15"))
    heartbeat_path = Path(
        os.getenv("WORKER_HEARTBEAT_FILE", "/tmp/sokoodds-worker.heartbeat")
    )
    tasks = select_worker_tasks(mode)
    print(f"worker runtime mode: {mode}")
    print(f"worker heartbeat file: {heartbeat_path}")

    while True:
        for task in tasks:
            print(f"running task: {task.name}")
            WORKER_HANDLERS[task.name]()

        write_heartbeat(heartbeat_path)
        sleep(tick_seconds)


if __name__ == "__main__":
    main()
