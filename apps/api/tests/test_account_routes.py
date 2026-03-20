from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi.testclient import TestClient

from app.main import app
from app.models import User, UserSession, Wallet
from app.services.account_access import (
    AuthenticatedAccount,
    get_account_access_service,
    get_authenticated_account,
)


@dataclass
class FakeAccountService:
    async def onboard_account(self, *, first_name: str, phone: str):
        return type(
            "OnboardResult",
            (),
            {
                "session_token": "session-token-1",
                "account": AuthenticatedAccount(
                    user=User(
                        id="user-1",
                        first_name=first_name,
                        phone=phone,
                        mpesa_phone=None,
                        mpesa_verified_at=None,
                    ),
                    wallet=Wallet(
                        user_id="user-1",
                        currency="KES",
                        available_balance=Decimal("0.00"),
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
                ).to_snapshot(),
            },
        )()

    async def verify_mpesa(self, *, user_id: str, phone: str):
        return type(
            "VerifyResult",
            (),
            {
                "status": "verified",
                "verification_credit_amount": Decimal("5.00"),
                "account": AuthenticatedAccount(
                    user=User(
                        id=user_id,
                        first_name="Bryan",
                        phone=phone,
                        mpesa_phone=phone,
                        mpesa_verified_at=datetime.now(UTC),
                    ),
                    wallet=Wallet(
                        user_id=user_id,
                        currency="KES",
                        available_balance=Decimal("5.00"),
                        reserved_balance=Decimal("0.00"),
                    ),
                    session=UserSession(
                        id="session-1",
                        user_id=user_id,
                        token_hash="hash",
                        expires_at=datetime.now(UTC) + timedelta(days=30),
                        last_seen_at=datetime.now(UTC),
                        revoked_at=None,
                    ),
                ).to_snapshot(),
            },
        )()


def build_authenticated_account() -> AuthenticatedAccount:
    return AuthenticatedAccount(
        user=User(
            id="user-1",
            first_name="Bryan",
            phone="0796851024",
            mpesa_phone="0796851024",
            mpesa_verified_at=datetime.now(UTC),
        ),
        wallet=Wallet(
            user_id="user-1",
            currency="KES",
            available_balance=Decimal("5.00"),
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


def build_client() -> TestClient:
    app.dependency_overrides.clear()
    app.dependency_overrides[get_account_access_service] = lambda: FakeAccountService()
    app.dependency_overrides[get_authenticated_account] = build_authenticated_account
    return TestClient(app)


def test_onboard_returns_session_and_wallet_shape() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/auth/onboard",
        json={"firstName": "Bryan", "phone": "0796851024"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["sessionToken"] == "session-token-1"
    assert payload["account"]["wallet"]["availableBalanceKes"] == "0.00"


def test_verify_mpesa_returns_wallet_credit_shape() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/wallet/verify-mpesa",
        json={"phone": "0796851024"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "verified"
    assert payload["verificationCreditKes"] == "5.00"


def test_me_returns_authenticated_account_snapshot() -> None:
    client = build_client()

    response = client.get("/api/v1/me")

    assert response.status_code == 200
    payload = response.json()
    assert payload["account"]["user"]["phone"] == "0796851024"
