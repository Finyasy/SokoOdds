from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

from app.main import app
from app.models import User, UserSession, Wallet
from app.services.account_access import AuthenticatedAccount, get_optional_authenticated_account
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


def build_pending_kyc_account() -> AuthenticatedAccount:
    return AuthenticatedAccount(
        user=User(
            id="user-1",
            first_name="Bryan",
            phone="0796851024",
            mpesa_phone="0796851024",
            kyc_status="pending",
            mpesa_verified_at=datetime.now(UTC),
        ),
        wallet=Wallet(
            user_id="user-1",
            currency="KES",
            available_balance=Decimal("250.00"),
            reserved_balance=Decimal("0.00"),
        ),
        session=UserSession(
            id="session-1",
            user_id="user-1",
            token_hash="hash",
            expires_at=datetime.now(UTC) + timedelta(days=30),
            last_seen_at=datetime.now(UTC),
            revoked_at=None,
        ),
    )


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


def test_order_submission_rejects_pending_kyc_when_gate_enabled() -> None:
    from app.core.config import settings

    client = build_client()
    app.dependency_overrides[get_optional_authenticated_account] = build_pending_kyc_account
    original_setting = settings.require_approved_kyc_for_orders
    settings.require_approved_kyc_for_orders = True

    try:
        response = client.post(
            "/api/v1/orders",
            json={
                "market_id": "market-123",
                "side": "YES",
                "direction": "BUY",
                "price": "0.65",
                "quantity": "100",
            },
            headers={"Idempotency-Key": "order-kyc"},
        )
    finally:
        settings.require_approved_kyc_for_orders = original_setting
        app.dependency_overrides.pop(get_optional_authenticated_account, None)

    assert response.status_code == 409
    assert response.json()["detail"] == "Approved KYC is required before placing an order."
