from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.core.idempotency import IdempotencyConflictError, IdempotentResponse
from app.core.config import settings
from app.main import app
from app.models import User, UserSession, Wallet
from app.schemas.account import CommentThreadFollowSyncRequest, FeedInteractionSyncRequest
from app.services.account_access import (
    AuthenticatedAccount,
    get_account_access_service,
    get_authenticated_account,
)
from fastapi.testclient import TestClient


@dataclass
class FakeAccountService:
    callback_payloads: list[dict[str, object]] = field(default_factory=lambda: [])
    idempotency_records: dict[
        tuple[str, str, str],
        tuple[dict[str, object], IdempotentResponse],
    ] = field(default_factory=dict)

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

    async def submit_wallet_deposit(
        self,
        *,
        user_id: str,
        route: str,
        idempotency_key: str,
        amount: Decimal,
    ) -> IdempotentResponse:
        payload = {"amountKes": f"{amount:.2f}"}
        return await self._submit_idempotent(
            user_id=user_id,
            route=route,
            idempotency_key=idempotency_key,
            payload=payload,
            response_factory=lambda: self._build_deposit_idempotent_response(user_id, amount),
        )

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

    async def submit_wallet_withdrawal(
        self,
        *,
        user_id: str,
        route: str,
        idempotency_key: str,
        amount: Decimal,
    ) -> IdempotentResponse:
        payload = {"amountKes": f"{amount:.2f}"}
        return await self._submit_idempotent(
            user_id=user_id,
            route=route,
            idempotency_key=idempotency_key,
            payload=payload,
            response_factory=lambda: self._build_withdrawal_idempotent_response(user_id, amount),
        )

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

    async def get_portfolio_orders(self, *, user_id: str):
        assert user_id == "user-1"
        return type(
            "PortfolioOrders",
            (),
            {
                "account": build_withdrawn_authenticated_account()
                .to_snapshot()
                .to_response_model(),
                "exposure": {
                    "openOrderCount": 1,
                    "reservedOrderValueKes": "4.96",
                },
                "items": [
                    {
                        "id": "order-1",
                        "marketId": "demo-market-kenya-election",
                        "marketSlug": "nairobi-governor-bill-sign-before-june",
                        "marketLabel": "Nairobi mobility bill",
                        "marketQuestion": (
                            "Will Nairobi county sign the urban mobility bill before June 30, 2026?"
                        ),
                        "side": "YES",
                        "direction": "BUY",
                        "price": "0.62",
                        "quantity": "8.00",
                        "reservedAmountKes": "4.96",
                        "status": "submitted",
                        "createdAt": datetime.now(UTC).isoformat(),
                    }
                ],
                "positions": [
                    {
                        "marketId": "demo-market-kenya-election",
                        "marketSlug": "nairobi-governor-bill-sign-before-june",
                        "marketLabel": "Nairobi mobility bill",
                        "marketQuestion": (
                            "Will Nairobi county sign the urban mobility bill before June 30, 2026?"
                        ),
                        "side": "YES",
                        "shares": "12.00",
                        "averageEntryPriceKes": "0.58",
                        "markPriceKes": "0.62",
                        "costBasisKes": "6.96",
                        "marketValueKes": "7.44",
                        "unrealizedPnlKes": "0.48",
                        "realizedPnlKes": "1.20",
                        "updatedAt": datetime.now(UTC).isoformat(),
                    }
                ],
                "fills": [
                    {
                        "tradeId": "trade-1",
                        "marketId": "demo-market-kenya-election",
                        "marketSlug": "nairobi-governor-bill-sign-before-june",
                        "marketLabel": "Nairobi mobility bill",
                        "side": "YES",
                        "direction": "BUY",
                        "priceKes": "0.61",
                        "shares": "5.00",
                        "notionalKes": "3.05",
                        "executedAt": datetime.now(UTC).isoformat(),
                    }
                ],
                "markets": [
                    {
                        "marketId": "demo-market-kenya-election",
                        "marketSlug": "nairobi-governor-bill-sign-before-june",
                        "marketLabel": "Nairobi mobility bill",
                        "marketQuestion": (
                            "Will Nairobi county sign the urban mobility bill before June 30, 2026?"
                        ),
                        "activeOrderCount": 1,
                        "reservedAmountKes": "4.96",
                        "totalQuantity": "8.00",
                        "averageEntryPriceKes": "0.62",
                        "latestYesPriceKes": "0.62",
                        "latestNoPriceKes": "0.38",
                    }
                ],
                "recentPrints": [
                    {
                        "marketId": "demo-market-kenya-election",
                        "marketSlug": "nairobi-governor-bill-sign-before-june",
                        "marketLabel": "Nairobi mobility bill",
                        "side": "YES",
                        "priceKes": "0.62",
                        "shares": "120",
                        "timeLabel": "14:05",
                    }
                ],
            },
        )()

    async def get_feed_interactions(self, *, user_id: str):
        assert user_id == "user-1"
        return type(
            "FeedInteractions",
            (),
            {
                "items": [
                    {
                        "marketSlug": "cbk-cut-rate-before-september-end",
                        "viewedCount": 2,
                        "pausedCount": 1,
                        "openedCount": 1,
                        "lastInteractedAt": datetime.now(UTC).isoformat(),
                    }
                ]
            },
        )()

    async def record_feed_interaction(self, *, user_id: str, market_slug: str, event_type: str):
        assert user_id == "user-1"
        return type(
            "FeedInteractionItem",
            (),
            {
                "marketSlug": market_slug,
                "viewedCount": 1 if event_type == "view" else 0,
                "pausedCount": 1 if event_type == "pause" else 0,
                "openedCount": 1 if event_type == "open" else 0,
                "lastInteractedAt": datetime.now(UTC).isoformat(),
            },
        )()

    async def sync_feed_interactions(
        self, *, user_id: str, payload: FeedInteractionSyncRequest
    ):
        assert user_id == "user-1"
        return type(
            "FeedInteractions",
            (),
            {
                "items": [
                    {
                        "marketSlug": payload.items[0].marketSlug,
                        "viewedCount": payload.items[0].viewedCount,
                        "pausedCount": payload.items[0].pausedCount,
                        "openedCount": payload.items[0].openedCount,
                        "lastInteractedAt": payload.items[0].lastInteractedAt,
                    }
                ]
            },
        )()

    async def get_comment_thread_follows(self, *, user_id: str):
        assert user_id == "user-1"
        return type(
            "CommentThreadFollows",
            (),
            {
                "items": [
                    {
                        "marketSlug": "cbk-cut-rate-before-september-end",
                        "commentId": "comment-1",
                        "lastSeenReplyCount": 2,
                        "autoFollowed": True,
                    }
                ]
            },
        )()

    async def get_comment_thread_notifications(self, *, user_id: str):
        assert user_id == "user-1"
        return type(
            "CommentThreadNotifications",
            (),
            {
                "items": [
                    {
                        "marketSlug": "cbk-cut-rate-before-september-end",
                        "marketQuestion": "Will CBK cut rates before September ends?",
                        "commentId": "comment-1",
                        "commentAuthor": "Amina",
                        "commentBody": "Watching the next MPC signal closely.",
                        "unreadReplyCount": 2,
                        "totalReplyCount": 3,
                        "autoFollowed": True,
                        "latestReplyCommentId": "reply-9",
                        "latestReplyAuthor": "Brian",
                        "latestReplyBody": "Treasury pressure looks stronger this week.",
                        "latestReplyAt": datetime.now(UTC).isoformat(),
                    }
                ]
            },
        )()

    async def upsert_comment_thread_follow(
        self,
        *,
        user_id: str,
        market_slug: str,
        comment_id: str,
        last_seen_reply_count: int,
        auto_followed: bool,
    ):
        assert user_id == "user-1"
        return type(
            "CommentThreadFollowItem",
            (),
            {
                "marketSlug": market_slug,
                "commentId": comment_id,
                "lastSeenReplyCount": last_seen_reply_count,
                "autoFollowed": auto_followed,
            },
        )()

    async def sync_comment_thread_follows(
        self, *, user_id: str, payload: CommentThreadFollowSyncRequest
    ):
        assert user_id == "user-1"
        return type(
            "CommentThreadFollows",
            (),
            {
                "items": [
                    {
                        "marketSlug": payload.items[0].marketSlug,
                        "commentId": payload.items[0].commentId,
                        "lastSeenReplyCount": payload.items[0].lastSeenReplyCount,
                        "autoFollowed": payload.items[0].autoFollowed,
                    }
                ]
            },
        )()

    async def delete_comment_thread_follow(
        self, *, user_id: str, market_slug: str, comment_id: str
    ):
        assert user_id == "user-1"
        assert market_slug == "cbk-cut-rate-before-september-end"
        assert comment_id == "comment-1"
        return None

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
                        "isAdmin": False,
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

    async def list_admin_wallet_activity(
        self,
        *,
        admin_user_id: str,
        status_filter: str | None,
        kind_filter: str | None,
        limit: int,
    ):
        assert admin_user_id == "user-1"
        assert status_filter == "review_required"
        assert kind_filter == "withdrawal"
        assert limit == 10
        return type(
            "AdminWalletSupport",
            (),
            {
                "items": [
                    {
                        "id": "withdraw-1",
                        "userId": "user-2",
                        "firstName": "Amina",
                        "phone": "0796000000",
                        "kind": "withdrawal",
                        "status": "review_required",
                        "title": "M-Pesa withdrawal",
                        "subtitle": "Funds are reserved while this payout waits for manual review.",
                        "amountKes": "2600.00",
                        "createdAt": datetime.now(UTC).isoformat(),
                        "updatedAt": datetime.now(UTC).isoformat(),
                    }
                ]
            },
        )()

    async def review_withdrawal(
        self,
        *,
        admin_user_id: str,
        withdrawal_id: str,
        decision: str,
        note: str | None,
    ):
        assert admin_user_id == "user-1"
        assert withdrawal_id == "withdraw-1"
        assert decision == "approved"
        assert note is None
        return {
            "id": "withdraw-1",
            "userId": "user-2",
            "firstName": "Amina",
            "phone": "0796000000",
            "kind": "withdrawal",
            "status": "completed",
            "title": "M-Pesa withdrawal",
            "subtitle": "Payout completed to 0796000000.",
            "amountKes": "2600.00",
            "createdAt": datetime.now(UTC).isoformat(),
            "updatedAt": datetime.now(UTC).isoformat(),
            "reviewedAt": datetime.now(UTC).isoformat(),
            "reviewedByName": "Admin",
            "reviewDecision": "approved",
        }

    async def retry_payment_dispatch(
        self,
        *,
        admin_user_id: str,
        activity_id: str,
    ):
        assert admin_user_id == "user-1"
        assert activity_id == "withdraw-1"
        return {
            "id": "withdraw-1",
            "userId": "user-2",
            "firstName": "Amina",
            "phone": "0796000000",
            "kind": "withdrawal",
            "status": "review_required",
            "title": "M-Pesa withdrawal",
            "subtitle": "Payout approved and waiting for worker dispatch.",
            "amountKes": "2600.00",
            "createdAt": datetime.now(UTC).isoformat(),
            "updatedAt": datetime.now(UTC).isoformat(),
            "reviewedAt": datetime.now(UTC).isoformat(),
            "reviewedByName": "Admin",
            "reviewDecision": "approved",
            "dispatchAttempts": 1,
            "dispatchError": None,
            "canRetryDispatch": False,
        }

    async def submit_withdrawal_review(
        self,
        *,
        admin_user_id: str,
        route: str,
        idempotency_key: str,
        withdrawal_id: str,
        decision: str,
        note: str | None,
    ) -> IdempotentResponse:
        payload = {"decision": decision, "note": note}
        return await self._submit_idempotent(
            user_id=admin_user_id,
            route=route,
            idempotency_key=idempotency_key,
            payload=payload,
            response_factory=lambda: self._build_review_idempotent_response(
                admin_user_id,
                withdrawal_id,
                decision,
                note,
            ),
        )

    async def _submit_idempotent(
        self,
        *,
        user_id: str,
        route: str,
        idempotency_key: str,
        payload: dict[str, object],
        response_factory,
    ) -> IdempotentResponse:
        scope = (user_id, route, idempotency_key)
        existing = self.idempotency_records.get(scope)
        if existing is not None:
            existing_payload, existing_response = existing
            if existing_payload != payload:
                raise IdempotencyConflictError(
                    "This idempotency key was already used with a different payload."
                )
            return IdempotentResponse(
                status_code=existing_response.status_code,
                response_body=existing_response.response_body,
                idempotency_status="replayed",
            )

        response = response_factory()
        self.idempotency_records[scope] = (payload, response)
        return response

    def _build_deposit_idempotent_response(
        self,
        user_id: str,
        amount: Decimal,
    ) -> IdempotentResponse:
        return IdempotentResponse(
            status_code=200,
            response_body={
                "status": "completed",
                "depositReference": "mpesa-topup-1",
                "requestedAmountKes": f"{amount:.2f}",
                "checkoutRequestId": "ws_CO_123",
                "customerMessage": "M-Pesa prompt sent.",
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
                )
                .to_snapshot()
                .to_response_model()
                .model_dump(mode="json"),
            },
            idempotency_status="created",
        )

    def _build_withdrawal_idempotent_response(
        self,
        user_id: str,
        amount: Decimal,
    ) -> IdempotentResponse:
        return IdempotentResponse(
            status_code=200,
            response_body={
                "status": "completed",
                "withdrawalReference": "mpesa-withdraw-1",
                "requestedAmountKes": f"{amount:.2f}",
                "reviewRequired": False,
                "customerMessage": "M-Pesa withdrawal initiated.",
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
                )
                .to_snapshot()
                .to_response_model()
                .model_dump(mode="json"),
            },
            idempotency_status="created",
        )

    def _build_review_idempotent_response(
        self,
        _admin_user_id: str,
        _withdrawal_id: str,
        _decision: str,
        _note: str | None,
    ) -> IdempotentResponse:
        return IdempotentResponse(
            status_code=200,
            response_body={
                "id": "withdraw-1",
                "userId": "user-2",
                "firstName": "Amina",
                "phone": "0796000000",
                "kind": "withdrawal",
                "status": "completed",
                "title": "M-Pesa withdrawal",
                "subtitle": "Payout completed to 0796000000.",
                "amountKes": "2600.00",
                "createdAt": datetime.now(UTC).isoformat(),
                "updatedAt": datetime.now(UTC).isoformat(),
                "reviewedAt": datetime.now(UTC).isoformat(),
                "reviewedByName": "Admin",
                "reviewDecision": "approved",
            },
            idempotency_status="created",
        )

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
    fake_service = FakeAccountService()
    app.dependency_overrides.clear()
    app.dependency_overrides[get_account_access_service] = lambda: fake_service
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


def test_portfolio_orders_returns_reserved_exposure_feed() -> None:
    client = build_client()

    response = client.get("/api/v1/portfolio/orders")

    assert response.status_code == 200
    payload = response.json()
    assert payload["account"]["wallet"]["availableBalanceKes"] == "305.00"
    assert payload["exposure"]["openOrderCount"] == 1
    assert payload["exposure"]["reservedOrderValueKes"] == "4.96"
    assert payload["items"][0]["marketLabel"] == "Nairobi mobility bill"


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


def test_admin_wallet_support_returns_review_queue() -> None:
    client = build_client()

    response = client.get(
        "/api/v1/admin/wallet/activity?status=review_required&kind=withdrawal&limit=10"
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"][0]["kind"] == "withdrawal"
    assert payload["items"][0]["status"] == "review_required"
    assert payload["items"][0]["amountKes"] == "2600.00"


def test_admin_wallet_support_can_release_review_required_withdrawal() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/admin/wallet/activity/withdraw-1/review",
        json={"decision": "approved"},
        headers={"Idempotency-Key": "withdraw-review-1"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "withdraw-1"
    assert payload["status"] == "completed"
    assert payload["kind"] == "withdrawal"
    assert payload["reviewedByName"] == "Admin"
    assert payload["reviewDecision"] == "approved"
    assert response.headers["X-Idempotency-Status"] == "created"


def test_admin_wallet_review_replays_same_response_for_same_idempotency_key() -> None:
    client = build_client()

    first = client.post(
        "/api/v1/admin/wallet/activity/withdraw-1/review",
        json={"decision": "approved"},
        headers={"Idempotency-Key": "withdraw-review-2"},
    )
    second = client.post(
        "/api/v1/admin/wallet/activity/withdraw-1/review",
        json={"decision": "approved"},
        headers={"Idempotency-Key": "withdraw-review-2"},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    assert second.headers["X-Idempotency-Status"] == "replayed"


def test_admin_wallet_review_rejects_same_key_with_different_payload() -> None:
    client = build_client()

    first = client.post(
        "/api/v1/admin/wallet/activity/withdraw-1/review",
        json={"decision": "approved"},
        headers={"Idempotency-Key": "withdraw-review-3"},
    )
    second = client.post(
        "/api/v1/admin/wallet/activity/withdraw-1/review",
        json={"decision": "rejected", "note": "duplicate"},
        headers={"Idempotency-Key": "withdraw-review-3"},
    )

    assert first.status_code == 200
    assert second.status_code == 409
    assert "different payload" in second.json()["detail"]


def test_admin_wallet_support_can_retry_failed_dispatch() -> None:
    client = build_client()

    response = client.post("/api/v1/admin/wallet/activity/withdraw-1/retry")

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "withdraw-1"
    assert payload["dispatchAttempts"] == 1
    assert payload["canRetryDispatch"] is False


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
        headers={"Idempotency-Key": "deposit-1"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["requestedAmountKes"] == "500.00"
    assert payload["checkoutRequestId"] == "ws_CO_123"
    assert payload["account"]["wallet"]["availableBalanceKes"] == "505.00"
    assert response.headers["X-Idempotency-Status"] == "created"


def test_wallet_deposit_replays_same_response_for_same_idempotency_key() -> None:
    client = build_client()

    first = client.post(
        "/api/v1/wallet/deposit",
        json={"amountKes": "500.00"},
        headers={"Idempotency-Key": "deposit-2"},
    )
    second = client.post(
        "/api/v1/wallet/deposit",
        json={"amountKes": "500.00"},
        headers={"Idempotency-Key": "deposit-2"},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    assert second.headers["X-Idempotency-Status"] == "replayed"


def test_wallet_deposit_rejects_same_key_with_different_payload() -> None:
    client = build_client()

    first = client.post(
        "/api/v1/wallet/deposit",
        json={"amountKes": "500.00"},
        headers={"Idempotency-Key": "deposit-3"},
    )
    second = client.post(
        "/api/v1/wallet/deposit",
        json={"amountKes": "250.00"},
        headers={"Idempotency-Key": "deposit-3"},
    )

    assert first.status_code == 200
    assert second.status_code == 409
    assert "different payload" in second.json()["detail"]


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
        headers={"Idempotency-Key": "withdraw-1"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["requestedAmountKes"] == "200.00"
    assert payload["reviewRequired"] is False
    assert payload["account"]["wallet"]["availableBalanceKes"] == "305.00"
    assert response.headers["X-Idempotency-Status"] == "created"


def test_wallet_withdrawal_replays_same_response_for_same_idempotency_key() -> None:
    client = build_client()

    first = client.post(
        "/api/v1/wallet/withdraw",
        json={"amountKes": "200.00"},
        headers={"Idempotency-Key": "withdraw-2"},
    )
    second = client.post(
        "/api/v1/wallet/withdraw",
        json={"amountKes": "200.00"},
        headers={"Idempotency-Key": "withdraw-2"},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    assert second.headers["X-Idempotency-Status"] == "replayed"


def test_wallet_withdrawal_rejects_same_key_with_different_payload() -> None:
    client = build_client()

    first = client.post(
        "/api/v1/wallet/withdraw",
        json={"amountKes": "200.00"},
        headers={"Idempotency-Key": "withdraw-3"},
    )
    second = client.post(
        "/api/v1/wallet/withdraw",
        json={"amountKes": "150.00"},
        headers={"Idempotency-Key": "withdraw-3"},
    )

    assert first.status_code == 200
    assert second.status_code == 409
    assert "different payload" in second.json()["detail"]


def test_wallet_withdrawal_status_returns_current_shape() -> None:
    client = build_client()

    response = client.get("/api/v1/wallet/withdraw/mpesa-withdraw-1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["releasedAmountKes"] == "200.00"
    assert payload["account"]["wallet"]["availableBalanceKes"] == "305.00"


def test_feed_interactions_returns_current_shape() -> None:
    client = build_client()

    response = client.get("/api/v1/feed/interactions")

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"][0]["marketSlug"] == "cbk-cut-rate-before-september-end"
    assert payload["items"][0]["openedCount"] == 1


def test_record_feed_interaction_returns_current_shape() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/feed/interactions",
        json={"marketSlug": "cbk-cut-rate-before-september-end", "eventType": "open"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["marketSlug"] == "cbk-cut-rate-before-september-end"
    assert payload["openedCount"] == 1


def test_sync_feed_interactions_returns_current_shape() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/feed/interactions/sync",
        json={
            "items": [
                {
                    "marketSlug": "cbk-cut-rate-before-september-end",
                    "viewedCount": 3,
                    "pausedCount": 2,
                    "openedCount": 1,
                    "lastInteractedAt": datetime.now(UTC).isoformat(),
                }
            ]
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"][0]["marketSlug"] == "cbk-cut-rate-before-september-end"
    assert payload["items"][0]["viewedCount"] == 3


def test_comment_thread_follows_returns_current_shape() -> None:
    client = build_client()

    response = client.get("/api/v1/comment-threads/follows")

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"][0]["marketSlug"] == "cbk-cut-rate-before-september-end"
    assert payload["items"][0]["commentId"] == "comment-1"
    assert payload["items"][0]["lastSeenReplyCount"] == 2
    assert payload["items"][0]["autoFollowed"] is True


def test_comment_thread_notifications_returns_current_shape() -> None:
    client = build_client()

    response = client.get("/api/v1/comment-threads/notifications")

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"][0]["marketSlug"] == "cbk-cut-rate-before-september-end"
    assert payload["items"][0]["unreadReplyCount"] == 2
    assert payload["items"][0]["latestReplyCommentId"] == "reply-9"
    assert payload["items"][0]["latestReplyAuthor"] == "Brian"


def test_upsert_comment_thread_follow_returns_current_shape() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/comment-threads/follows",
        json={
            "marketSlug": "cbk-cut-rate-before-september-end",
            "commentId": "comment-1",
            "lastSeenReplyCount": 4,
            "autoFollowed": False,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["marketSlug"] == "cbk-cut-rate-before-september-end"
    assert payload["commentId"] == "comment-1"
    assert payload["lastSeenReplyCount"] == 4
    assert payload["autoFollowed"] is False


def test_sync_comment_thread_follows_returns_current_shape() -> None:
    client = build_client()

    response = client.post(
        "/api/v1/comment-threads/follows/sync",
        json={
            "items": [
                {
                    "marketSlug": "cbk-cut-rate-before-september-end",
                    "commentId": "comment-1",
                    "lastSeenReplyCount": 5,
                    "autoFollowed": True,
                }
            ]
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"][0]["marketSlug"] == "cbk-cut-rate-before-september-end"
    assert payload["items"][0]["commentId"] == "comment-1"
    assert payload["items"][0]["lastSeenReplyCount"] == 5
    assert payload["items"][0]["autoFollowed"] is True


def test_delete_comment_thread_follow_returns_no_content() -> None:
    client = build_client()

    response = client.delete(
        "/api/v1/comment-threads/follows"
        "?marketSlug=cbk-cut-rate-before-september-end&commentId=comment-1"
    )

    assert response.status_code == 204


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
