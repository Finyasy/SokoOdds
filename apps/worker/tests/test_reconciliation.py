from app.jobs.reconciliation import run_reconciliation_loop
from app.runtime import select_worker_tasks


def test_reconciliation_placeholder(capsys) -> None:
    run_reconciliation_loop()
    captured = capsys.readouterr()
    assert "reconciliation loop" in captured.out


def test_worker_modes_include_reconciliation() -> None:
    tasks = select_worker_tasks("reconciliation,payment-followups")

    assert [task.name for task in tasks] == ["reconciliation", "payment-followups"]
