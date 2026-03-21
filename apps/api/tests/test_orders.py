from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.main import app
from app.services.order_intake import (
    IdempotencyConflictError,
    OrderSubmissionResult,
    get_order_intake_service,
)
from fastapi.testclient import TestClient


@dataclass
class FakeOrderService:
    records: dict[tuple[str, str, str], tuple[dict[str, Any], OrderSubmissionResult]]

    async def submit_order(
        self,
        *,
        user_id: str,
        route: str,
        idempotency_key: str,
        order_request: Any,
    ) -> OrderSubmissionResult:
        payload = order_request.model_dump(mode="json")
        scope = (user_id, route, idempotency_key)
        existing = self.records.get(scope)

        if existing:
            existing_payload, existing_result = existing
            if existing_payload != payload:
                raise IdempotencyConflictError(
                    "This idempotency key was already used with a different payload."
                )

            return OrderSubmissionResult(
                status_code=existing_result.status_code,
                response_body=existing_result.response_body,
                idempotency_status="replayed",
            )

        result = OrderSubmissionResult(
            status_code=202,
            response_body={
                "order_id": "order-123",
                "status": "submitted",
                "market_id": payload["market_id"],
                "reserved_amount": "65.00",
            },
            idempotency_status="created",
        )
        self.records[scope] = (payload, result)
        return result


def build_client() -> TestClient:
    fake_service = FakeOrderService(records={})
    app.dependency_overrides.clear()
    app.dependency_overrides[get_order_intake_service] = lambda: fake_service
    return TestClient(app)


def test_order_submission_replays_same_response_for_same_idempotency_key() -> None:
    client = build_client()
    headers = {"Idempotency-Key": "order-1"}
    payload = {
        "market_id": "market-123",
        "side": "YES",
        "direction": "BUY",
        "price": "0.65",
        "quantity": "100",
    }

    first = client.post("/api/v1/orders", json=payload, headers=headers)
    second = client.post("/api/v1/orders", json=payload, headers=headers)

    assert first.status_code == 202
    assert second.status_code == 202
    assert first.json() == second.json()
    assert first.headers["X-Idempotency-Status"] == "created"
    assert second.headers["X-Idempotency-Status"] == "replayed"


def test_order_submission_rejects_same_key_with_different_payload() -> None:
    client = build_client()
    headers = {"Idempotency-Key": "order-2"}
    first_payload = {
        "market_id": "market-123",
        "side": "YES",
        "direction": "BUY",
        "price": "0.65",
        "quantity": "100",
    }
    second_payload = {
        "market_id": "market-123",
        "side": "YES",
        "direction": "BUY",
        "price": "0.64",
        "quantity": "100",
    }

    first = client.post("/api/v1/orders", json=first_payload, headers=headers)
    second = client.post("/api/v1/orders", json=second_payload, headers=headers)

    assert first.status_code == 202
    assert second.status_code == 409
    assert "different payload" in second.json()["detail"]
