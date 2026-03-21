from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.core.config import settings
from app.main import app
from app.models import User, UserSession, Wallet
from app.services.account_access import (
    AuthenticatedAccount,
    get_account_access_service,
    get_authenticated_account,
)
from fastapi.testclient import TestClient


@dataclass
class FakeAccountService:
    callback_payloads: list[dict[str, object]] = field(default_factory=lambda: [])

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
                        kyc_status="not_started",
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
                        kyc_status="not_started",
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

    async def initiate_wallet_deposit(self, *, user_id: str, amount: Decimal):
        return type(
            "DepositResult",
            (),
            {
                "status": "completed",
                "deposit_reference": "mpesa-topup-1",
                "requested_amount": amount,
                "credited_amount": amount,
                "checkout_request_id": "ws_CO_123",
                "customer_message": "M-Pesa prompt sent.",
                "account": AuthenticatedAccount(
                    user=User(
                        id=user_id,
                        first_name="Bryan",
                        phone="0796851024",
                        mpesa_phone="0796851024",
                        kyc_status="approved",
                        mpesa_verified_at=datetime.now(UTC),
                    ),
                    wallet=Wallet(
                        user_id=user_id,
                        currency="KES",
                        available_balance=Decimal("505.00"),
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

    async def get_deposit_status(self, *, user_id: str, deposit_reference: str):
        assert user_id == "user-1"
        assert deposit_reference == "mpesa-topup-1"
        return type(
            "DepositStatus",
            (),
            {
                "status": "completed",
                "depositReference": deposit_reference,
                "requestedAmountKes": "500.00",
                "creditedAmountKes": "500.00",
                "account": build_funded_authenticated_account().to_snapshot().to_response_model(),
            },
        )()

    async def initiate_wallet_withdrawal(self, *, user_id: str, amount: Decimal):
        return type(
            "WithdrawalResult",
            (),
            {
                "status": "completed",
                "withdrawal_reference": "mpesa-withdraw-1",
                "requested_amount": amount,
                "released_amount": amount,
                "review_required": False,
                "customer_message": "M-Pesa withdrawal initiated.",
                "account": AuthenticatedAccount(
                    user=User(
                        id=user_id,
                        first_name="Bryan",
                        phone="0796851024",
                        mpesa_phone="0796851024",
                        kyc_status="approved",
                        mpesa_verified_at=datetime.now(UTC),
                    ),
                    wallet=Wallet(
                        user_id=user_id,
                        currency="KES",
                        available_balance=Decimal("305.00"),
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

    async def get_withdrawal_status(self, *, user_id: str, withdrawal_reference: str):
        assert user_id == "user-1"
        assert withdrawal_reference == "mpesa-withdraw-1"
        return type(
            "WithdrawalStatus",
            (),
            {
                "status": "completed",
                "withdrawalReference": withdrawal_reference,
                "requestedAmountKes": "200.00",
                "releasedAmountKes": "200.00",
                "reviewRequired": False,
                "account": build_withdrawn_authenticated_account()
                .to_snapshot()
                .to_response_model(),
            },
        )()

    async def get_wallet_transactions(self, *, user_id: str):
        assert user_id == "user-1"
        return type(
            "WalletTransactions",
            (),
            {
                "account": build_withdrawn_authenticated_account()
                .to_snapshot()
                .to_response_model(),
                "items": [
                    {
                        "id": "withdraw-1",
                        "kind": "withdrawal",
                        "status": "completed",
                        "title": "M-Pesa withdrawal",
                        "subtitle": "Payout completed to your verified M-Pesa number.",
                        "amountKes": "200.00",
                        "createdAt": datetime.now(UTC).isoformat(),
                    },
                    {
                        "id": "deposit-1",
                        "kind": "deposit",
                        "status": "completed",
                        "title": "M-Pesa wallet top-up",
                        "subtitle": "Top-up confirmed and added to your available balance.",
                        "amountKes": "500.00",
                        "createdAt": datetime.now(UTC).isoformat(),
                    },
                ],
            },
        )()

    async def get_kyc_profile(self, *, user_id: str):
        assert user_id == "user-1"
        return None

    async def submit_kyc_profile(
        self,
        *,
        user_id: str,
        legal_name: str,
        national_id_number: str,
        date_of_birth: str,
        document_reference: str,
    ):
        assert user_id == "user-1"
        assert national_id_number == "12345678"
        return type(
            "KycSubmission",
            (),
            {
                "status": "pending",
                "account": build_pending_kyc_authenticated_account()
                .to_snapshot()
                .to_response_model(),
                "profile": {
                    "status": "pending",
                    "legalName": legal_name,
                    "nationalIdNumberMasked": "****5678",
                    "dateOfBirth": date_of_birth,
                    "documentType": "national_id",
                    "documentReference": document_reference,
                    "submittedAt": datetime.now(UTC).isoformat(),
                    "reviewedAt": None,
                    "rejectionReason": None,
                },
            },
        )()

    async def list_kyc_queue(self, *, admin_user_id: str, status_filter: str | None):
        assert admin_user_id == "user-1"
        assert status_filter == "pending"
        return type(
            "KycQueue",
            (),
            {
                "items": [
                    {
                        "userId": "user-2",
                        "phone": "0796000000",
                        "status": "pending",
                        "legalName": "Amina Wanjiru",
                        "nationalIdNumberMasked": "****1234",
                        "documentType": "national_id",
                        "submittedAt": datetime.now(UTC).isoformat(),
                        "rejectionReason": None,
                    }
                ]
            },
        )()

    async def review_kyc_profile(
        self,
        *,
        admin_user_id: str,
        target_user_id: str,
        decision: str,
        rejection_reason: str | None,
    ):
        assert admin_user_id == "user-1"
        assert target_user_id == "user-2"
        assert decision == "approved"
        assert rejection_reason is None
        return type(
            "KycReview",
            (),
            {
                "status": "approved",
                "account": {
                    "user": {
                        "id": "user-2",
                        "firstName": "Amina",
                        "phone": "0796000000",
                        "mpesaPhone": "0796000000",
                        "mpesaVerified": True,
                        "kycStatus": "approved",
                    },
                    "wallet": {
                        "currency": "KES",
                        "availableBalanceKes": "100.00",
                        "reservedBalanceKes": "0.00",
                    },
                },
                "profile": {
                    "status": "approved",
                    "legalName": "Amina Wanjiru",
                    "nationalIdNumberMasked": "****1234",
                    "dateOfBirth": "1996-08-14",
                    "documentType": "national_id",
                    "documentReference": "https://example.com/id.pdf",
                    "submittedAt": datetime.now(UTC).isoformat(),
                    "reviewedAt": datetime.now(UTC).isoformat(),
                    "rejectionReason": None,
                },
            },
        )()

    async def process_stk_callback(self, *, callback_payload: dict[str, object]) -> None:
        self.callback_payloads.append(callback_payload)


def build_authenticated_account() -> AuthenticatedAccount:
    return AuthenticatedAccount(
        user=User(
            id="user-1",
            first_name="Bryan",
            phone="0796851024",
            mpesa_phone="0796851024",
            kyc_status="approved",
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


def build_funded_authenticated_account() -> AuthenticatedAccount:
    return AuthenticatedAccount(
        user=User(
            id="user-1",
            first_name="Bryan",
            phone="0796851024",
            mpesa_phone="0796851024",
            kyc_status="approved",
            mpesa_verified_at=datetime.now(UTC),
        ),
        wallet=Wallet(
            user_id="user-1",
            currency="KES",
            available_balance=Decimal("505.00"),
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


def build_withdrawn_authenticated_account() -> AuthenticatedAccount:
    return AuthenticatedAccount(
        user=User(
            id="user-1",
            first_name="Bryan",
            phone="0796851024",
            mpesa_phone="0796851024",
            kyc_status="approved",
            mpesa_verified_at=datetime.now(UTC),
        ),
        wallet=Wallet(
            user_id="user-1",
            currency="KES",
            available_balance=Decimal("305.00"),
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


def build_pending_kyc_authenticated_account() -> AuthenticatedAccount:
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
            available_balance=Decimal("305.00"),
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


def build_callback_payload() -> dict[str, object]:
    return {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": "merchant-1",
                "CheckoutRequestID": "checkout-1",
                "ResultCode": 0,
                "ResultDesc": "Accepted",
            }
        }
    }


def build_signature(secret: str, payload: dict[str, object]) -> str:
    raw_body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


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


def test_wallet_transactions_returns_activity_feed() -> None:
    client = build_client()

    response = client.get("/api/v1/wallet/transactions")

    assert response.status_code == 200
    payload = response.json()
    assert payload["account"]["wallet"]["availableBalanceKes"] == "305.00"
    assert payload["items"][0]["kind"] == "withdrawal"
    assert payload["items"][1]["kind"] == "deposit"


def test_submit_kyc_returns_pending_profile_shape() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/kyc/submit",
        json={
            "legalName": "Bryan Bosire",
            "nationalIdNumber": "12345678",
            "dateOfBirth": "1998-04-13",
            "documentReference": "https://example.com/id.pdf",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "pending"
    assert payload["account"]["user"]["kycStatus"] == "pending"
    assert payload["profile"]["nationalIdNumberMasked"] == "****5678"


def test_admin_kyc_queue_returns_pending_profiles() -> None:
    client = build_client()

    response = client.get("/api/v1/admin/kyc/profiles?status=pending")

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"][0]["status"] == "pending"
    assert payload["items"][0]["nationalIdNumberMasked"] == "****1234"


def test_admin_kyc_review_approves_profile() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/admin/kyc/profiles/user-2/review",
        json={"decision": "approved"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "approved"
    assert payload["account"]["user"]["kycStatus"] == "approved"


def test_me_returns_authenticated_account_snapshot() -> None:
    client = build_client()

    response = client.get("/api/v1/me")

    assert response.status_code == 200
    payload = response.json()
    assert payload["account"]["user"]["phone"] == "0796851024"


def test_wallet_deposit_returns_credit_shape() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/wallet/deposit",
        json={"amountKes": "500.00"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["requestedAmountKes"] == "500.00"
    assert payload["checkoutRequestId"] == "ws_CO_123"
    assert payload["account"]["wallet"]["availableBalanceKes"] == "505.00"


def test_wallet_deposit_status_returns_current_shape() -> None:
    client = build_client()

    response = client.get("/api/v1/wallet/deposit/mpesa-topup-1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["creditedAmountKes"] == "500.00"
    assert payload["account"]["wallet"]["availableBalanceKes"] == "505.00"


def test_wallet_withdrawal_returns_current_shape() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/wallet/withdraw",
        json={"amountKes": "200.00"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["requestedAmountKes"] == "200.00"
    assert payload["reviewRequired"] is False
    assert payload["account"]["wallet"]["availableBalanceKes"] == "305.00"


def test_wallet_withdrawal_status_returns_current_shape() -> None:
    client = build_client()

    response = client.get("/api/v1/wallet/withdraw/mpesa-withdraw-1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["releasedAmountKes"] == "200.00"
    assert payload["account"]["wallet"]["availableBalanceKes"] == "305.00"


def test_wallet_deposit_callback_rejects_invalid_token() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/wallet/deposit/callback?token=wrong-token",
        json=build_callback_payload(),
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid callback token."


def test_wallet_deposit_callback_accepts_valid_signature_from_allowlisted_forwarded_ip() -> None:
    service = FakeAccountService()
    client = build_client()
    app.dependency_overrides[get_account_access_service] = lambda: service

    original_allowed_ips = settings.daraja_callback_allowed_ips
    original_trusted_proxies = settings.daraja_callback_trusted_proxy_ips
    original_signature_secret = settings.daraja_callback_signature_secret
    original_callback_token = settings.daraja_callback_token
    payload = build_callback_payload()

    try:
        settings.daraja_callback_allowed_ips = "196.201.214.200"
        settings.daraja_callback_trusted_proxy_ips = "testclient"
        settings.daraja_callback_signature_secret = "shared-secret"
        settings.daraja_callback_token = "signed-token"

        response = client.post(
            "/api/v1/wallet/deposit/callback?token=signed-token",
            json=payload,
            headers={
                "X-Forwarded-For": "196.201.214.200, 127.0.0.1",
                "X-SokoOdds-Callback-Signature": build_signature("shared-secret", payload),
            },
        )
    finally:
        settings.daraja_callback_allowed_ips = original_allowed_ips
        settings.daraja_callback_trusted_proxy_ips = original_trusted_proxies
        settings.daraja_callback_signature_secret = original_signature_secret
        settings.daraja_callback_token = original_callback_token

    assert response.status_code == 200
    assert response.json() == {"ResultCode": "0", "ResultDesc": "Accepted"}
    assert service.callback_payloads == [payload]


def test_wallet_deposit_callback_rejects_non_allowlisted_ip() -> None:
    client = build_client()
    original_allowed_ips = settings.daraja_callback_allowed_ips
    original_trusted_proxies = settings.daraja_callback_trusted_proxy_ips
    original_callback_token = settings.daraja_callback_token

    try:
        settings.daraja_callback_allowed_ips = "196.201.214.200"
        settings.daraja_callback_trusted_proxy_ips = "testclient"
        settings.daraja_callback_token = "allowlisted-token"

        response = client.post(
            "/api/v1/wallet/deposit/callback?token=allowlisted-token",
            json=build_callback_payload(),
            headers={"X-Forwarded-For": "10.10.10.10, 127.0.0.1"},
        )
    finally:
        settings.daraja_callback_allowed_ips = original_allowed_ips
        settings.daraja_callback_trusted_proxy_ips = original_trusted_proxies
        settings.daraja_callback_token = original_callback_token

    assert response.status_code == 403
    assert response.json()["detail"] == "Callback origin is not allowlisted."
