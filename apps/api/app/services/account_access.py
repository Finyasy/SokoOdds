from __future__ import annotations

from contextlib import asynccontextmanager
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from hashlib import sha256
from typing import Annotated, Any, cast
from uuid import uuid4

from app.core.auth import (
    create_session_token,
    extract_bearer_token,
    hash_session_token,
    normalize_phone,
)
from app.core.config import settings
from app.core.database import get_async_session
from app.core.idempotency import (
    IdempotencyConflictError,
    IdempotentResponse,
    build_idempotency_record,
    get_idempotency_record,
    make_request_hash,
    replay_idempotent_response,
)
from app.integrations.daraja import DarajaConfigurationError, daraja_client
from app.models import (
    Deposit,
    KycProfile,
    LedgerEntry,
    Market,
    MarketComment,
    Order,
    OutboxEvent,
    Position,
    Trade,
    User,
    UserCommentThreadFollow,
    UserFeedInteraction,
    UserSession,
    Wallet,
    Withdrawal,
)
from app.schemas.account import (
    AccountSnapshotResponse,
    AccountUserResponse,
    AdminKycQueueItemResponse,
    AdminKycQueueResponse,
    AdminWalletSupportItemResponse,
    AdminWalletSupportResponse,
    CommentThreadFollowsResponse,
    CommentThreadFollowItemResponse,
    CommentThreadNotificationItemResponse,
    CommentThreadNotificationsResponse,
    CommentThreadFollowSyncRequest,
    FeedInteractionItemResponse,
    FeedInteractionsResponse,
    FeedInteractionSyncRequest,
    KycProfileResponse,
    KycSubmissionResponse,
    PortfolioExposureResponse,
    PortfolioFillItemResponse,
    PortfolioMarketExposureItemResponse,
    PortfolioOrderItemResponse,
    PortfolioOrdersResponse,
    PortfolioPositionItemResponse,
    PortfolioRecentPrintResponse,
    WalletDepositStatusResponse,
    WalletResponse,
    WalletTransactionItemResponse,
    WalletTransactionsResponse,
    WalletWithdrawalStatusResponse,
)
from app.services.order_intake import quantize_money
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import desc, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

AsyncSessionDep = Annotated[AsyncSession, Depends(get_async_session)]
AuthorizationHeader = Annotated[str | None, Header(alias="Authorization")]
ACTIVE_ORDER_STATUSES = {
    "submitted",
    "accepted",
    "queued_for_matching",
    "open",
    "partial",
    "partially_filled",
}
FEED_INTERACTION_EVENT_TYPES = {"view", "pause", "open"}
PAYMENT_IDEMPOTENCY_TTL = timedelta(hours=72)
PAYMENT_DISPATCH_MAX_ATTEMPTS = 3
PAYMENT_DISPATCH_BACKOFF_MINUTES = 5


class AuthenticationError(Exception):
    pass


class WalletFundingError(Exception):
    pass


def _parse_feed_interaction_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None

    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed


@dataclass(frozen=True)
class StkCallback:
    checkout_request_id: str
    merchant_request_id: str
    result_code: int
    result_desc: str
    mpesa_receipt_number: str | None


@dataclass(frozen=True)
class B2CCallback:
    conversation_id: str
    originator_conversation_id: str
    result_code: int
    result_desc: str
    mpesa_receipt_number: str | None


@dataclass(frozen=True)
class CommentThreadNotificationItem:
    market_slug: str
    market_question: str
    comment_id: str
    comment_author: str
    comment_body: str
    unread_reply_count: int
    total_reply_count: int
    auto_followed: bool
    latest_reply_comment_id: str | None
    latest_reply_author: str | None
    latest_reply_body: str | None
    latest_reply_at: str | None

    def to_response_model(self) -> CommentThreadNotificationItemResponse:
        return CommentThreadNotificationItemResponse(
            marketSlug=self.market_slug,
            marketQuestion=self.market_question,
            commentId=self.comment_id,
            commentAuthor=self.comment_author,
            commentBody=self.comment_body,
            unreadReplyCount=self.unread_reply_count,
            totalReplyCount=self.total_reply_count,
            autoFollowed=self.auto_followed,
            latestReplyCommentId=self.latest_reply_comment_id,
            latestReplyAuthor=self.latest_reply_author,
            latestReplyBody=self.latest_reply_body,
            latestReplyAt=self.latest_reply_at,
        )


@dataclass(frozen=True)
class AccountSnapshot:
    user_id: str
    first_name: str
    phone: str
    mpesa_phone: str | None
    mpesa_verified: bool
    kyc_status: str
    is_admin: bool
    currency: str
    available_balance: Decimal
    reserved_balance: Decimal

    def to_response_model(self) -> AccountSnapshotResponse:
        return AccountSnapshotResponse(
            user=AccountUserResponse(
                id=self.user_id,
                firstName=self.first_name,
                phone=self.phone,
                mpesaPhone=self.mpesa_phone,
                mpesaVerified=self.mpesa_verified,
                kycStatus=self.kyc_status,
                isAdmin=self.is_admin,
            ),
            wallet=WalletResponse(
                currency=self.currency,
                availableBalanceKes=f"{self.available_balance:.2f}",
                reservedBalanceKes=f"{self.reserved_balance:.2f}",
            ),
        )


@dataclass(frozen=True)
class AuthenticatedAccount:
    user: User
    wallet: Wallet
    session: UserSession

    def to_snapshot(self) -> AccountSnapshot:
        return snapshot_from_models(self.user, self.wallet)


@dataclass(frozen=True)
class OnboardAccountResult:
    session_token: str
    account: AccountSnapshot


@dataclass(frozen=True)
class WalletVerificationResult:
    status: str
    account: AccountSnapshot
    verification_credit_amount: Decimal


@dataclass(frozen=True)
class WalletDepositResult:
    status: str
    deposit_reference: str
    requested_amount: Decimal
    credited_amount: Decimal
    checkout_request_id: str | None
    customer_message: str | None
    account: AccountSnapshot


@dataclass(frozen=True)
class WalletWithdrawalResult:
    status: str
    withdrawal_reference: str
    requested_amount: Decimal
    released_amount: Decimal
    review_required: bool
    customer_message: str | None
    account: AccountSnapshot


@dataclass(frozen=True)
class WalletTransactionItem:
    id: str
    kind: str
    status: str
    title: str
    subtitle: str
    amount: Decimal
    created_at: datetime

    def to_response_model(self) -> WalletTransactionItemResponse:
        return WalletTransactionItemResponse(
            id=self.id,
            kind=self.kind,
            status=self.status,
            title=self.title,
            subtitle=self.subtitle,
            amountKes=f"{self.amount:.2f}",
            createdAt=self.created_at.isoformat(),
        )


@dataclass(frozen=True)
class AdminWalletSupportItem:
    id: str
    user_id: str
    first_name: str
    phone: str
    kind: str
    status: str
    title: str
    subtitle: str
    amount: Decimal
    created_at: datetime
    updated_at: datetime
    reviewed_at: datetime | None = None
    reviewed_by_name: str | None = None
    review_decision: str | None = None
    dispatch_attempts: int | None = None
    dispatch_error: str | None = None
    can_retry_dispatch: bool = False

    def to_response_model(self) -> AdminWalletSupportItemResponse:
        return AdminWalletSupportItemResponse(
            id=self.id,
            userId=self.user_id,
            firstName=self.first_name,
            phone=self.phone,
            kind=self.kind,
            status=self.status,
            title=self.title,
            subtitle=self.subtitle,
            amountKes=f"{self.amount:.2f}",
            createdAt=self.created_at.isoformat(),
            updatedAt=self.updated_at.isoformat(),
            reviewedAt=self.reviewed_at.isoformat() if self.reviewed_at is not None else None,
            reviewedByName=self.reviewed_by_name,
            reviewDecision=self.review_decision,
            dispatchAttempts=self.dispatch_attempts,
            dispatchError=self.dispatch_error,
            canRetryDispatch=self.can_retry_dispatch,
        )


@dataclass(frozen=True)
class KycProfileSnapshot:
    status: str
    legal_name: str
    national_id_number_masked: str
    date_of_birth: str
    document_type: str
    document_reference: str
    submitted_at: datetime
    reviewed_at: datetime | None
    rejection_reason: str | None

    def to_response_model(self) -> KycProfileResponse:
        return KycProfileResponse(
            status=self.status,
            legalName=self.legal_name,
            nationalIdNumberMasked=self.national_id_number_masked,
            dateOfBirth=self.date_of_birth,
            documentType=self.document_type,
            documentReference=self.document_reference,
            submittedAt=self.submitted_at.isoformat(),
            reviewedAt=self.reviewed_at.isoformat() if self.reviewed_at is not None else None,
            rejectionReason=self.rejection_reason,
        )


@dataclass(frozen=True)
class PortfolioOrderItem:
    id: str
    market_id: str
    market_slug: str | None
    market_label: str
    market_question: str | None
    side: str
    direction: str
    price: Decimal
    quantity: Decimal
    reserved_amount: Decimal
    status: str
    created_at: datetime

    def to_response_model(self) -> PortfolioOrderItemResponse:
        return PortfolioOrderItemResponse(
            id=self.id,
            marketId=self.market_id,
            marketSlug=self.market_slug,
            marketLabel=self.market_label,
            marketQuestion=self.market_question,
            side=self.side,
            direction=self.direction,
            price=f"{self.price:.2f}",
            quantity=f"{self.quantity:.2f}",
            reservedAmountKes=f"{self.reserved_amount:.2f}",
            status=self.status,
            createdAt=self.created_at.isoformat(),
        )


@dataclass(frozen=True)
class PortfolioPositionItem:
    market_id: str
    market_slug: str | None
    market_label: str
    market_question: str | None
    side: str
    shares: Decimal
    average_entry_price: Decimal
    mark_price: Decimal
    cost_basis: Decimal
    market_value: Decimal
    unrealized_pnl: Decimal
    realized_pnl: Decimal
    updated_at: datetime

    def to_response_model(self) -> PortfolioPositionItemResponse:
        return PortfolioPositionItemResponse(
            marketId=self.market_id,
            marketSlug=self.market_slug,
            marketLabel=self.market_label,
            marketQuestion=self.market_question,
            side=self.side,
            shares=f"{self.shares:.2f}",
            averageEntryPriceKes=f"{self.average_entry_price:.2f}",
            markPriceKes=f"{self.mark_price:.2f}",
            costBasisKes=f"{self.cost_basis:.2f}",
            marketValueKes=f"{self.market_value:.2f}",
            unrealizedPnlKes=f"{self.unrealized_pnl:.2f}",
            realizedPnlKes=f"{self.realized_pnl:.2f}",
            updatedAt=self.updated_at.isoformat(),
        )


@dataclass(frozen=True)
class PortfolioFillItem:
    trade_id: str
    market_id: str
    market_slug: str | None
    market_label: str
    side: str
    direction: str
    price: Decimal
    shares: Decimal
    notional: Decimal
    executed_at: datetime

    def to_response_model(self) -> PortfolioFillItemResponse:
        return PortfolioFillItemResponse(
            tradeId=self.trade_id,
            marketId=self.market_id,
            marketSlug=self.market_slug,
            marketLabel=self.market_label,
            side=self.side,
            direction=self.direction,
            priceKes=f"{self.price:.2f}",
            shares=f"{self.shares:.2f}",
            notionalKes=f"{self.notional:.2f}",
            executedAt=self.executed_at.isoformat(),
        )


@dataclass(frozen=True)
class PortfolioMarketExposureItem:
    market_id: str
    market_slug: str | None
    market_label: str
    market_question: str | None
    active_order_count: int
    reserved_amount: Decimal
    total_quantity: Decimal
    average_entry_price: Decimal
    latest_yes_price: Decimal
    latest_no_price: Decimal

    def to_response_model(self) -> PortfolioMarketExposureItemResponse:
        return PortfolioMarketExposureItemResponse(
            marketId=self.market_id,
            marketSlug=self.market_slug,
            marketLabel=self.market_label,
            marketQuestion=self.market_question,
            activeOrderCount=self.active_order_count,
            reservedAmountKes=f"{self.reserved_amount:.2f}",
            totalQuantity=f"{self.total_quantity:.2f}",
            averageEntryPriceKes=f"{self.average_entry_price:.2f}",
            latestYesPriceKes=f"{self.latest_yes_price:.2f}",
            latestNoPriceKes=f"{self.latest_no_price:.2f}",
        )


@dataclass(frozen=True)
class PortfolioRecentPrint:
    market_id: str
    market_slug: str | None
    market_label: str
    side: str
    price: Decimal
    shares: Decimal
    time_label: str

    def to_response_model(self) -> PortfolioRecentPrintResponse:
        return PortfolioRecentPrintResponse(
            marketId=self.market_id,
            marketSlug=self.market_slug,
            marketLabel=self.market_label,
            side=self.side,
            priceKes=f"{self.price:.2f}",
            shares=f"{self.shares:.0f}",
            timeLabel=self.time_label,
        )


@dataclass(frozen=True)
class FeedInteractionItem:
    market_slug: str
    viewed_count: int
    paused_count: int
    opened_count: int
    last_interacted_at: datetime | None

    def to_response_model(self) -> FeedInteractionItemResponse:
        return FeedInteractionItemResponse(
            marketSlug=self.market_slug,
            viewedCount=self.viewed_count,
            pausedCount=self.paused_count,
            openedCount=self.opened_count,
            lastInteractedAt=(
                self.last_interacted_at.isoformat() if self.last_interacted_at is not None else None
            ),
        )


@dataclass(frozen=True)
class CommentThreadFollowItem:
    market_slug: str
    comment_id: str
    last_seen_reply_count: int
    auto_followed: bool

    def to_response_model(self) -> CommentThreadFollowItemResponse:
        return CommentThreadFollowItemResponse(
            marketSlug=self.market_slug,
            commentId=self.comment_id,
            lastSeenReplyCount=self.last_seen_reply_count,
            autoFollowed=self.auto_followed,
        )


def snapshot_from_models(user: User, wallet: Wallet) -> AccountSnapshot:
    return AccountSnapshot(
        user_id=user.id,
        first_name=user.first_name,
        phone=user.phone,
        mpesa_phone=user.mpesa_phone,
        mpesa_verified=user.mpesa_verified_at is not None,
        kyc_status=user.kyc_status,
        is_admin=normalize_phone(user.phone) in {
            normalize_phone(phone) for phone in settings.admin_phone_allowlist_values
        },
        currency=wallet.currency,
        available_balance=quantize_money(wallet.available_balance),
        reserved_balance=quantize_money(wallet.reserved_balance),
    )


class AccountAccessService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        session_ttl: timedelta,
        verification_credit_amount: Decimal,
    ) -> None:
        self.session = session
        self.session_ttl = session_ttl
        self.verification_credit_amount = quantize_money(verification_credit_amount)
        self.admin_phone_allowlist = {
            normalize_phone(phone) for phone in settings.admin_phone_allowlist_values
        }
        self.withdrawal_review_threshold = quantize_money(
            Decimal(settings.withdrawal_review_threshold_kes)
        )
        self.withdrawal_daily_limit = quantize_money(Decimal(settings.withdrawal_daily_limit_kes))

    async def onboard_account(self, *, first_name: str, phone: str) -> OnboardAccountResult:
        normalized_phone = normalize_phone(phone)
        session_token = create_session_token()
        session_token_hash = hash_session_token(session_token)

        async with self._transaction():
            user = await self._get_user_by_phone_for_update(normalized_phone)
            if user is None:
                user = User(
                    id=str(uuid4()),
                    first_name=first_name.strip(),
                    phone=normalized_phone,
                    mpesa_phone=None,
                    kyc_status="not_started",
                    mpesa_verified_at=None,
                )
                self.session.add(user)
                await self.session.flush()
            else:
                user.first_name = first_name.strip()

            wallet = await self._get_or_create_wallet_for_update(user.id)
            self.session.add(
                UserSession(
                    id=str(uuid4()),
                    user_id=user.id,
                    token_hash=session_token_hash,
                    expires_at=datetime.now(UTC) + self.session_ttl,
                    last_seen_at=datetime.now(UTC),
                    revoked_at=None,
                )
            )

        return OnboardAccountResult(
            session_token=session_token,
            account=snapshot_from_models(user, wallet),
        )

    async def get_authenticated_account(self, token: str) -> AuthenticatedAccount | None:
        token_hash = hash_session_token(token)
        now = datetime.now(UTC)

        result = await self.session.execute(
            select(UserSession, User)
            .join(User, User.id == UserSession.user_id)
            .where(
                UserSession.token_hash == token_hash,
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > now,
            )
        )
        row = result.one_or_none()
        if row is None:
            return None

        session_record, user = row

        wallet_result = await self.session.execute(select(Wallet).where(Wallet.user_id == user.id))
        wallet = wallet_result.scalar_one_or_none()
        if wallet is None:
            wallet = Wallet(
                user_id=user.id,
                currency="KES",
                available_balance=Decimal("0.00"),
                reserved_balance=Decimal("0.00"),
            )

        return AuthenticatedAccount(user=user, wallet=wallet, session=session_record)

    async def verify_mpesa(self, *, user_id: str, phone: str) -> WalletVerificationResult:
        normalized_phone = normalize_phone(phone)

        async with self._transaction():
            user = await self._get_user_for_update(user_id)
            if user is None:
                raise AuthenticationError("Authenticated user was not found.")

            wallet = await self._get_or_create_wallet_for_update(user.id)
            verification_status = "already_verified"

            user.mpesa_phone = normalized_phone
            if user.mpesa_verified_at is None:
                user.mpesa_verified_at = datetime.now(UTC)
                wallet.available_balance = quantize_money(
                    wallet.available_balance + self.verification_credit_amount
                )
                verification_status = "verified"

                self.session.add(
                    LedgerEntry(
                        id=str(uuid4()),
                        user_id=user.id,
                        entry_type="MPESA_VERIFICATION_CREDIT",
                        amount=self.verification_credit_amount,
                        currency=wallet.currency,
                        reference_type="wallet_verification",
                        reference_id=user.id,
                        available_balance_after=wallet.available_balance,
                        reserved_balance_after=wallet.reserved_balance,
                        note=f"M-Pesa verification credit for {normalized_phone}",
                    )
                )

        return WalletVerificationResult(
            status=verification_status,
            account=snapshot_from_models(user, wallet),
            verification_credit_amount=self.verification_credit_amount,
        )

    async def revoke_session(self, token: str) -> None:
        token_hash = hash_session_token(token)

        async with self._transaction():
            result = await self.session.execute(
                select(UserSession).where(
                    UserSession.token_hash == token_hash,
                    UserSession.revoked_at.is_(None),
                )
            )
            session_record = result.scalar_one_or_none()
            if session_record is None:
                return
            session_record.revoked_at = datetime.now(UTC)

    async def submit_wallet_deposit(
        self,
        *,
        user_id: str,
        route: str,
        idempotency_key: str,
        amount: Decimal,
    ) -> IdempotentResponse:
        request_payload = {"amountKes": f"{quantize_money(amount):.2f}"}
        request_hash = make_request_hash(request_payload)

        existing_record = await get_idempotency_record(
            self.session,
            user_id=user_id,
            route=route,
            idempotency_key=idempotency_key,
        )
        if existing_record is not None:
            return replay_idempotent_response(existing_record, request_hash=request_hash)

        result = await self.initiate_wallet_deposit(user_id=user_id, amount=amount)
        response_body = self._serialize_wallet_deposit_result(result)

        try:
            await self._store_idempotent_response(
                user_id=user_id,
                route=route,
                idempotency_key=idempotency_key,
                request_hash=request_hash,
                response_body=response_body,
                ttl=PAYMENT_IDEMPOTENCY_TTL,
            )
        except IntegrityError:
            await self.session.rollback()
            existing_record = await get_idempotency_record(
                self.session,
                user_id=user_id,
                route=route,
                idempotency_key=idempotency_key,
            )
            if existing_record is None:
                raise RuntimeError("Idempotency conflict occurred but no durable record was found.")
            return replay_idempotent_response(existing_record, request_hash=request_hash)

        return IdempotentResponse(
            status_code=status.HTTP_200_OK,
            response_body=response_body,
            idempotency_status="created",
        )

    async def submit_wallet_withdrawal(
        self,
        *,
        user_id: str,
        route: str,
        idempotency_key: str,
        amount: Decimal,
    ) -> IdempotentResponse:
        request_payload = {"amountKes": f"{quantize_money(amount):.2f}"}
        request_hash = make_request_hash(request_payload)

        existing_record = await get_idempotency_record(
            self.session,
            user_id=user_id,
            route=route,
            idempotency_key=idempotency_key,
        )
        if existing_record is not None:
            return replay_idempotent_response(existing_record, request_hash=request_hash)

        result = await self.initiate_wallet_withdrawal(user_id=user_id, amount=amount)
        response_body = self._serialize_wallet_withdrawal_result(result)

        try:
            await self._store_idempotent_response(
                user_id=user_id,
                route=route,
                idempotency_key=idempotency_key,
                request_hash=request_hash,
                response_body=response_body,
                ttl=PAYMENT_IDEMPOTENCY_TTL,
            )
        except IntegrityError:
            await self.session.rollback()
            existing_record = await get_idempotency_record(
                self.session,
                user_id=user_id,
                route=route,
                idempotency_key=idempotency_key,
            )
            if existing_record is None:
                raise RuntimeError("Idempotency conflict occurred but no durable record was found.")
            return replay_idempotent_response(existing_record, request_hash=request_hash)

        return IdempotentResponse(
            status_code=status.HTTP_200_OK,
            response_body=response_body,
            idempotency_status="created",
        )

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
        request_payload = {"decision": decision, "note": note}
        request_hash = make_request_hash(request_payload)

        existing_record = await get_idempotency_record(
            self.session,
            user_id=admin_user_id,
            route=route,
            idempotency_key=idempotency_key,
        )
        if existing_record is not None:
            return replay_idempotent_response(existing_record, request_hash=request_hash)

        response_model = await self.review_withdrawal(
            admin_user_id=admin_user_id,
            withdrawal_id=withdrawal_id,
            decision=decision,
            note=note,
        )
        response_body = response_model.model_dump(mode="json")

        try:
            await self._store_idempotent_response(
                user_id=admin_user_id,
                route=route,
                idempotency_key=idempotency_key,
                request_hash=request_hash,
                response_body=response_body,
                ttl=PAYMENT_IDEMPOTENCY_TTL,
            )
        except IntegrityError:
            await self.session.rollback()
            existing_record = await get_idempotency_record(
                self.session,
                user_id=admin_user_id,
                route=route,
                idempotency_key=idempotency_key,
            )
            if existing_record is None:
                raise RuntimeError("Idempotency conflict occurred but no durable record was found.")
            return replay_idempotent_response(existing_record, request_hash=request_hash)

        return IdempotentResponse(
            status_code=status.HTTP_200_OK,
            response_body=response_body,
            idempotency_status="created",
        )

    async def initiate_wallet_deposit(
        self,
        *,
        user_id: str,
        amount: Decimal,
    ) -> WalletDepositResult:
        requested_amount = quantize_money(amount)
        if requested_amount <= Decimal("0.00"):
            raise WalletFundingError("Deposit amount must be greater than zero.")

        async with self._transaction():
            user = await self._get_user_for_update(user_id)
            if user is None:
                raise AuthenticationError("Authenticated user was not found.")
            if user.mpesa_verified_at is None or user.mpesa_phone is None:
                raise WalletFundingError("Verify your M-Pesa wallet before topping up.")

            deposit_reference = f"mpesa-topup-{uuid4()}"
            self.session.add(
                Deposit(
                    id=deposit_reference,
                    user_id=user.id,
                    phone=user.mpesa_phone,
                    amount=requested_amount,
                    currency="KES",
                    provider="daraja",
                    status="created",
                    merchant_request_id=None,
                    checkout_request_id=None,
                    customer_message=None,
                    mpesa_receipt_number=None,
                    result_code=None,
                    result_desc=None,
                    callback_received_at=None,
                    credited_at=None,
                )
            )
            self.session.add(
                OutboxEvent(
                    id=str(uuid4()),
                    topic="wallet.deposit.dispatch_requested",
                    aggregate_type="deposit",
                    aggregate_id=deposit_reference,
                    payload={
                        "deposit_reference": deposit_reference,
                        "user_id": user.id,
                        "amount": f"{requested_amount:.2f}",
                        "phone": user.mpesa_phone,
                    },
                    status="pending",
                )
            )

        deposit = await self.get_deposit_by_reference(
            user_id=user_id,
            deposit_reference=deposit_reference,
        )
        account = await self._load_account_snapshot(user_id)
        if deposit is None or account is None:
            raise WalletFundingError("Could not refresh the wallet after deposit initiation.")

        return WalletDepositResult(
            status=deposit.status,
            deposit_reference=deposit_reference,
            requested_amount=requested_amount,
            credited_amount=requested_amount if deposit.status == "completed" else Decimal("0.00"),
            checkout_request_id=deposit.checkout_request_id,
            customer_message=deposit.customer_message,
            account=account,
        )

    async def initiate_wallet_withdrawal(
        self,
        *,
        user_id: str,
        amount: Decimal,
    ) -> WalletWithdrawalResult:
        requested_amount = quantize_money(amount)
        if requested_amount <= Decimal("0.00"):
            raise WalletFundingError("Withdrawal amount must be greater than zero.")

        async with self._transaction():
            user = await self._get_user_for_update(user_id)
            if user is None:
                raise AuthenticationError("Authenticated user was not found.")
            if user.mpesa_verified_at is None or user.mpesa_phone is None:
                raise WalletFundingError("Verify your M-Pesa wallet before withdrawing.")

            wallet = await self._get_or_create_wallet_for_update(user.id)
            if wallet.available_balance < requested_amount:
                raise WalletFundingError("Insufficient available balance for this withdrawal.")

            daily_total = await self._get_daily_withdrawal_total(user.id)
            if daily_total + requested_amount > self.withdrawal_daily_limit:
                raise WalletFundingError("Withdrawal would exceed the daily limit.")

            withdrawal_reference = f"mpesa-withdraw-{uuid4()}"
            requires_review = requested_amount > self.withdrawal_review_threshold
            wallet.available_balance = quantize_money(wallet.available_balance - requested_amount)
            wallet.reserved_balance = quantize_money(wallet.reserved_balance + requested_amount)
            customer_message = "Withdrawal queued for manual review."
            status = "review_required" if requires_review else "created"

            self.session.add(
                Withdrawal(
                    id=withdrawal_reference,
                    user_id=user.id,
                    phone=user.mpesa_phone,
                    amount=requested_amount,
                    currency="KES",
                    provider="daraja",
                    status=status,
                    requires_review=requires_review,
                    conversation_id=None,
                    originator_conversation_id=None,
                    result_code=None,
                    result_desc=None,
                    mpesa_receipt_number=None,
                    callback_received_at=None,
                    completed_at=None,
                    failed_at=None,
                )
            )
            self.session.add(
                LedgerEntry(
                    id=str(uuid4()),
                    user_id=user.id,
                    entry_type="MPESA_WITHDRAWAL_HOLD",
                    amount=-requested_amount,
                    currency=wallet.currency,
                    reference_type="withdrawal",
                    reference_id=withdrawal_reference,
                    available_balance_after=wallet.available_balance,
                    reserved_balance_after=wallet.reserved_balance,
                    note=f"M-Pesa withdrawal hold for {user.mpesa_phone}",
                    )
                )

            if not requires_review:
                self.session.add(
                    OutboxEvent(
                        id=str(uuid4()),
                        topic="wallet.withdrawal.dispatch_requested",
                        aggregate_type="withdrawal",
                        aggregate_id=withdrawal_reference,
                        payload={
                            "withdrawal_reference": withdrawal_reference,
                            "user_id": user.id,
                            "amount": f"{requested_amount:.2f}",
                            "phone": user.mpesa_phone,
                        },
                        status="pending",
                    )
                )

        if not requires_review:
            customer_message = "M-Pesa withdrawal queued for dispatch."

        withdrawal = await self.get_withdrawal_by_reference(
            user_id=user_id,
            withdrawal_reference=withdrawal_reference,
        )
        account = await self._load_account_snapshot(user_id)
        if withdrawal is None or account is None:
            raise WalletFundingError("Could not refresh the wallet after withdrawal initiation.")

        return WalletWithdrawalResult(
            status=withdrawal.status,
            withdrawal_reference=withdrawal_reference,
            requested_amount=requested_amount,
            released_amount=(
                requested_amount if withdrawal.status == "completed" else Decimal("0.00")
            ),
            review_required=withdrawal.requires_review,
            customer_message=customer_message,
            account=account,
        )

    def _serialize_wallet_deposit_result(self, result: WalletDepositResult) -> dict[str, str | None | dict]:
        return {
            "status": result.status,
            "depositReference": result.deposit_reference,
            "requestedAmountKes": f"{result.requested_amount:.2f}",
            "checkoutRequestId": result.checkout_request_id,
            "customerMessage": result.customer_message,
            "account": result.account.to_response_model().model_dump(mode="json"),
        }

    def _serialize_wallet_withdrawal_result(
        self,
        result: WalletWithdrawalResult,
    ) -> dict[str, str | bool | None | dict]:
        return {
            "status": result.status,
            "withdrawalReference": result.withdrawal_reference,
            "requestedAmountKes": f"{result.requested_amount:.2f}",
            "reviewRequired": result.review_required,
            "customerMessage": result.customer_message,
            "account": result.account.to_response_model().model_dump(mode="json"),
        }

    async def _store_idempotent_response(
        self,
        *,
        user_id: str,
        route: str,
        idempotency_key: str,
        request_hash: str,
        response_body: dict[str, object],
        ttl: timedelta,
    ) -> None:
        async with self._transaction():
            self.session.add(
                build_idempotency_record(
                    user_id=user_id,
                    route=route,
                    idempotency_key=idempotency_key,
                    request_hash=request_hash,
                    status_code=status.HTTP_200_OK,
                    response_body=cast(dict[str, Any], response_body),
                    ttl=ttl,
                )
            )

    async def _mark_deposit_request_dispatched(
        self,
        *,
        deposit_reference: str,
        merchant_request_id: str,
        checkout_request_id: str,
        customer_message: str | None,
    ) -> None:
        async with self._transaction():
            result = await self.session.execute(
                select(Deposit).where(Deposit.id == deposit_reference).with_for_update()
            )
            deposit = result.scalar_one_or_none()
            if deposit is None:
                raise WalletFundingError("Deposit intent was not found after creation.")

            deposit.status = "pending"
            deposit.merchant_request_id = merchant_request_id
            deposit.checkout_request_id = checkout_request_id
            deposit.customer_message = customer_message
            deposit.result_desc = customer_message

    async def _mark_deposit_request_failed(
        self,
        *,
        deposit_reference: str,
        error_message: str,
    ) -> None:
        async with self._transaction():
            result = await self.session.execute(
                select(Deposit).where(Deposit.id == deposit_reference).with_for_update()
            )
            deposit = result.scalar_one_or_none()
            if deposit is None:
                return

            deposit.status = "failed"
            deposit.result_desc = error_message

    async def _mark_withdrawal_request_dispatched(
        self,
        *,
        withdrawal_reference: str,
        conversation_id: str,
        originator_conversation_id: str,
        result_desc: str,
    ) -> None:
        async with self._transaction():
            result = await self.session.execute(
                select(Withdrawal).where(Withdrawal.id == withdrawal_reference).with_for_update()
            )
            withdrawal = result.scalar_one_or_none()
            if withdrawal is None:
                raise WalletFundingError("Withdrawal intent was not found after creation.")

            withdrawal.status = "pending"
            withdrawal.result_desc = result_desc
            withdrawal.conversation_id = conversation_id
            withdrawal.originator_conversation_id = originator_conversation_id

    async def _fail_withdrawal_dispatch(
        self,
        *,
        withdrawal_reference: str,
        error_message: str,
    ) -> None:
        async with self._transaction():
            result = await self.session.execute(
                select(Withdrawal).where(Withdrawal.id == withdrawal_reference).with_for_update()
            )
            withdrawal = result.scalar_one_or_none()
            if withdrawal is None:
                return

            wallet = await self._get_or_create_wallet_for_update(withdrawal.user_id)
            wallet.available_balance = quantize_money(wallet.available_balance + withdrawal.amount)
            wallet.reserved_balance = quantize_money(wallet.reserved_balance - withdrawal.amount)
            withdrawal.status = "failed"
            withdrawal.failed_at = datetime.now(UTC)
            withdrawal.result_desc = error_message
            self.session.add(
                LedgerEntry(
                    id=str(uuid4()),
                    user_id=withdrawal.user_id,
                    entry_type="MPESA_WITHDRAWAL_RELEASE",
                    amount=withdrawal.amount,
                    currency=wallet.currency,
                    reference_type="withdrawal",
                    reference_id=withdrawal.id,
                    available_balance_after=wallet.available_balance,
                    reserved_balance_after=wallet.reserved_balance,
                    note=(
                        f"Withdrawal dispatch failed and released held funds for {withdrawal.phone}"
                    ),
                )
            )

    async def _mark_reviewed_withdrawal_dispatched(
        self,
        *,
        withdrawal_id: str,
        conversation_id: str,
        originator_conversation_id: str,
        result_desc: str,
    ) -> None:
        async with self._transaction():
            result = await self.session.execute(
                select(Withdrawal).where(Withdrawal.id == withdrawal_id).with_for_update()
            )
            withdrawal = result.scalar_one_or_none()
            if withdrawal is None:
                raise WalletFundingError("Withdrawal review target was not found after approval.")

            withdrawal.status = "pending"
            withdrawal.result_desc = result_desc
            withdrawal.conversation_id = conversation_id
            withdrawal.originator_conversation_id = originator_conversation_id

    async def _mark_reviewed_withdrawal_dispatch_failed(
        self,
        *,
        withdrawal_id: str,
        error_message: str,
    ) -> None:
        async with self._transaction():
            result = await self.session.execute(
                select(Withdrawal).where(Withdrawal.id == withdrawal_id).with_for_update()
            )
            withdrawal = result.scalar_one_or_none()
            if withdrawal is None:
                return

            withdrawal.result_desc = error_message

    async def _load_payment_dispatch_state(self) -> dict[tuple[str, str], dict[str, Any]]:
        result = await self.session.execute(
            select(OutboxEvent).where(OutboxEvent.topic.in_((
                "wallet.deposit.dispatch_requested",
                "wallet.withdrawal.dispatch_requested",
            )))
        )
        states: dict[tuple[str, str], dict[str, Any]] = {}
        for event in result.scalars().all():
            key = (event.aggregate_type, event.aggregate_id)
            existing = states.get(key)
            if existing is None or existing["created_at"] < event.created_at:
                payload = dict(event.payload)
                states[key] = {
                    "status": event.status,
                    "attempts": int(payload.get("attempts", 0) or 0),
                    "error": payload.get("error"),
                    "created_at": event.created_at,
                }
        return states

    async def _load_payment_dispatch_state_for(
        self,
        *,
        aggregate_type: str,
        aggregate_id: str,
    ) -> dict[str, Any] | None:
        states = await self._load_payment_dispatch_state()
        return states.get((aggregate_type, aggregate_id))

    async def _requeue_payment_outbox_event(
        self,
        *,
        aggregate_type: str,
        aggregate_id: str,
    ) -> None:
        result = await self.session.execute(
            select(OutboxEvent)
            .where(
                OutboxEvent.aggregate_type == aggregate_type,
                OutboxEvent.aggregate_id == aggregate_id,
                OutboxEvent.topic.in_((
                    "wallet.deposit.dispatch_requested",
                    "wallet.withdrawal.dispatch_requested",
                )),
            )
            .order_by(OutboxEvent.created_at.desc())
            .limit(1)
            .with_for_update()
        )
        event = result.scalar_one_or_none()
        if event is None:
            raise WalletFundingError("Dispatch event was not found for this payment activity.")
        if event.status != "failed":
            raise WalletFundingError("Only failed dispatch events can be retried.")

        payload = dict(event.payload)
        attempts = int(payload.get("attempts", 0) or 0)
        if attempts >= PAYMENT_DISPATCH_MAX_ATTEMPTS:
            raise WalletFundingError("Dispatch retries are exhausted for this payment activity.")

        payload["error"] = None
        payload["nextAttemptAt"] = datetime.now(UTC).isoformat()
        payload["manualRetryRequestedAt"] = datetime.now(UTC).isoformat()
        event.payload = payload
        event.status = "pending"

    async def dispatch_deposit_request(self, *, deposit_reference: str) -> bool:
        result = await self.session.execute(select(Deposit).where(Deposit.id == deposit_reference))
        deposit = result.scalar_one_or_none()
        if deposit is None:
            raise WalletFundingError("Deposit intent was not found for dispatch.")
        if deposit.status not in {"created", "failed"}:
            return False
        if deposit.status == "failed" and deposit.checkout_request_id is not None:
            return False

        try:
            stk_result = await daraja_client.request_stk_push(
                phone=deposit.phone,
                amount=f"{deposit.amount:.2f}",
                account_reference=deposit.id,
            )
        except DarajaConfigurationError as exc:
            await self._mark_deposit_request_failed(
                deposit_reference=deposit.id,
                error_message=str(exc),
            )
            raise WalletFundingError(str(exc)) from exc
        except Exception as exc:  # pragma: no cover
            error_message = "Could not initiate the M-Pesa prompt."
            await self._mark_deposit_request_failed(
                deposit_reference=deposit.id,
                error_message=error_message,
            )
            raise WalletFundingError(error_message) from exc

        await self._mark_deposit_request_dispatched(
            deposit_reference=deposit.id,
            merchant_request_id=stk_result.merchant_request_id,
            checkout_request_id=stk_result.checkout_request_id,
            customer_message=stk_result.customer_message,
        )

        if settings.daraja_mode == "stub" and settings.daraja_stub_auto_complete:
            await self.process_stk_callback(
                callback_payload=build_stub_callback_payload(
                    merchant_request_id=stk_result.merchant_request_id,
                    checkout_request_id=stk_result.checkout_request_id,
                    amount=deposit.amount,
                    phone=deposit.phone,
                )
            )
        return True

    async def dispatch_withdrawal_request(self, *, withdrawal_reference: str) -> bool:
        result = await self.session.execute(
            select(Withdrawal).where(Withdrawal.id == withdrawal_reference)
        )
        withdrawal = result.scalar_one_or_none()
        if withdrawal is None:
            raise WalletFundingError("Withdrawal intent was not found for dispatch.")
        if withdrawal.status not in {"created", "review_required"}:
            return False

        try:
            payout_result = await daraja_client.request_b2c_payout(
                phone=withdrawal.phone,
                amount=f"{withdrawal.amount:.2f}",
            )
        except DarajaConfigurationError as exc:
            if withdrawal.status == "created":
                await self._fail_withdrawal_dispatch(
                    withdrawal_reference=withdrawal.id,
                    error_message=str(exc),
                )
            else:
                await self._mark_reviewed_withdrawal_dispatch_failed(
                    withdrawal_id=withdrawal.id,
                    error_message=str(exc),
                )
            raise WalletFundingError(str(exc)) from exc
        except Exception as exc:  # pragma: no cover
            error_message = "Could not initiate the M-Pesa withdrawal."
            if withdrawal.status == "created":
                await self._fail_withdrawal_dispatch(
                    withdrawal_reference=withdrawal.id,
                    error_message=error_message,
                )
            else:
                await self._mark_reviewed_withdrawal_dispatch_failed(
                    withdrawal_id=withdrawal.id,
                    error_message=error_message,
                )
            raise WalletFundingError(error_message) from exc

        if withdrawal.status == "created":
            await self._mark_withdrawal_request_dispatched(
                withdrawal_reference=withdrawal.id,
                conversation_id=payout_result.conversation_id,
                originator_conversation_id=payout_result.originator_conversation_id,
                result_desc=payout_result.response_description,
            )
        else:
            await self._mark_reviewed_withdrawal_dispatched(
                withdrawal_id=withdrawal.id,
                conversation_id=payout_result.conversation_id,
                originator_conversation_id=payout_result.originator_conversation_id,
                result_desc=withdrawal.result_desc or payout_result.response_description,
            )

        if settings.daraja_mode == "stub" and settings.daraja_stub_auto_complete:
            await self.process_b2c_callback(
                callback_payload=build_stub_b2c_callback_payload(
                    conversation_id=payout_result.conversation_id,
                    originator_conversation_id=payout_result.originator_conversation_id,
                    amount=withdrawal.amount,
                    phone=withdrawal.phone,
                )
            )
        return True

    @asynccontextmanager
    async def _transaction(self):
        if self.session.in_transaction():
            yield
            await self.session.commit()
            return

        async with self.session.begin():
            yield

    async def _get_user_by_phone_for_update(self, phone: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.phone == phone).with_for_update()
        )
        return result.scalar_one_or_none()

    async def _get_user_for_update(self, user_id: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.id == user_id).with_for_update()
        )
        return result.scalar_one_or_none()

    async def _get_or_create_wallet_for_update(self, user_id: str) -> Wallet:
        result = await self.session.execute(
            select(Wallet).where(Wallet.user_id == user_id).with_for_update()
        )
        wallet = result.scalar_one_or_none()
        if wallet is not None:
            return wallet

        wallet = Wallet(
            user_id=user_id,
            currency="KES",
            available_balance=Decimal("0.00"),
            reserved_balance=Decimal("0.00"),
        )
        self.session.add(wallet)
        await self.session.flush()
        return wallet

    async def _load_account_snapshot(self, user_id: str) -> AccountSnapshot | None:
        user_result = await self.session.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user is None:
            return None

        wallet_result = await self.session.execute(select(Wallet).where(Wallet.user_id == user.id))
        wallet = wallet_result.scalar_one_or_none()
        if wallet is None:
            wallet = Wallet(
                user_id=user.id,
                currency="KES",
                available_balance=Decimal("0.00"),
                reserved_balance=Decimal("0.00"),
            )
            self.session.add(wallet)
            await self.session.flush()

        return snapshot_from_models(user, wallet)

    async def _get_kyc_profile(self, user_id: str) -> KycProfile | None:
        result = await self.session.execute(select(KycProfile).where(KycProfile.user_id == user_id))
        return result.scalar_one_or_none()

    async def _get_kyc_profile_for_update(self, user_id: str) -> KycProfile | None:
        result = await self.session.execute(
            select(KycProfile).where(KycProfile.user_id == user_id).with_for_update()
        )
        return result.scalar_one_or_none()

    async def _assert_admin_user(self, user_id: str) -> None:
        result = await self.session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise AuthenticationError("Authenticated user was not found.")
        if normalize_phone(user.phone) not in self.admin_phone_allowlist:
            raise AuthenticationError("Admin access is required.")

    async def get_deposit_by_reference(
        self,
        *,
        user_id: str,
        deposit_reference: str,
    ) -> Deposit | None:
        result = await self.session.execute(
            select(Deposit).where(Deposit.id == deposit_reference, Deposit.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_withdrawal_by_reference(
        self,
        *,
        user_id: str,
        withdrawal_reference: str,
    ) -> Withdrawal | None:
        result = await self.session.execute(
            select(Withdrawal).where(
                Withdrawal.id == withdrawal_reference,
                Withdrawal.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_deposit_status(
        self,
        *,
        user_id: str,
        deposit_reference: str,
    ) -> WalletDepositStatusResponse:
        deposit = await self.get_deposit_by_reference(
            user_id=user_id,
            deposit_reference=deposit_reference,
        )
        if deposit is None:
            raise WalletFundingError("Deposit reference was not found.")

        account = await self._load_account_snapshot(user_id)
        if account is None:
            raise AuthenticationError("Authenticated user was not found.")

        return WalletDepositStatusResponse(
            status=deposit.status,
            depositReference=deposit.id,
            requestedAmountKes=f"{deposit.amount:.2f}",
            creditedAmountKes=(
                f"{deposit.amount if deposit.status == 'completed' else Decimal('0.00'):.2f}"
            ),
            account=account.to_response_model(),
        )

    async def get_withdrawal_status(
        self,
        *,
        user_id: str,
        withdrawal_reference: str,
    ) -> WalletWithdrawalStatusResponse:
        withdrawal = await self.get_withdrawal_by_reference(
            user_id=user_id,
            withdrawal_reference=withdrawal_reference,
        )
        if withdrawal is None:
            raise WalletFundingError("Withdrawal reference was not found.")

        account = await self._load_account_snapshot(user_id)
        if account is None:
            raise AuthenticationError("Authenticated user was not found.")

        return WalletWithdrawalStatusResponse(
            status=withdrawal.status,
            withdrawalReference=withdrawal.id,
            requestedAmountKes=f"{withdrawal.amount:.2f}",
            releasedAmountKes=(
                f"{withdrawal.amount if withdrawal.status == 'completed' else Decimal('0.00'):.2f}"
            ),
            reviewRequired=withdrawal.requires_review,
            account=account.to_response_model(),
        )

    async def get_wallet_transactions(self, *, user_id: str) -> WalletTransactionsResponse:
        account = await self._load_account_snapshot(user_id)
        if account is None:
            raise AuthenticationError("Authenticated user was not found.")

        verification_entries_result = await self.session.execute(
            select(LedgerEntry)
            .where(
                LedgerEntry.user_id == user_id,
                LedgerEntry.entry_type == "MPESA_VERIFICATION_CREDIT",
            )
            .order_by(desc(LedgerEntry.created_at))
        )
        verification_entries = verification_entries_result.scalars().all()

        deposits_result = await self.session.execute(
            select(Deposit).where(Deposit.user_id == user_id).order_by(desc(Deposit.created_at))
        )
        deposits = deposits_result.scalars().all()

        withdrawals_result = await self.session.execute(
            select(Withdrawal)
            .where(Withdrawal.user_id == user_id)
            .order_by(desc(Withdrawal.created_at))
        )
        withdrawals = withdrawals_result.scalars().all()

        items = [
            *[self._build_verification_activity(entry) for entry in verification_entries],
            *[self._build_deposit_activity(deposit) for deposit in deposits],
            *[self._build_withdrawal_activity(withdrawal) for withdrawal in withdrawals],
        ]
        items.sort(
            key=lambda item: (item.created_at, self._activity_priority(item.kind)),
            reverse=True,
        )

        return WalletTransactionsResponse(
            account=account.to_response_model(),
            items=[item.to_response_model() for item in items[:10]],
        )

    async def get_portfolio_orders(self, *, user_id: str) -> PortfolioOrdersResponse:
        account = await self._load_account_snapshot(user_id)
        if account is None:
            raise AuthenticationError("Authenticated user was not found.")

        recent_order_result = await self.session.execute(
            select(Order).where(Order.user_id == user_id).order_by(desc(Order.created_at)).limit(12)
        )
        recent_orders = recent_order_result.scalars().all()

        active_order_result = await self.session.execute(
            select(Order)
            .where(
                Order.user_id == user_id,
                Order.status.in_(tuple(ACTIVE_ORDER_STATUSES)),
            )
            .order_by(desc(Order.created_at))
        )
        active_orders = active_order_result.scalars().all()

        position_result = await self.session.execute(
            select(Position)
            .where(Position.user_id == user_id, Position.shares > Decimal("0.00"))
            .order_by(desc(Position.updated_at))
            .limit(12)
        )
        positions = position_result.scalars().all()

        fill_result = await self.session.execute(
            select(Trade)
            .where(or_(Trade.buyer_id == user_id, Trade.seller_id == user_id))
            .order_by(desc(Trade.executed_at))
            .limit(12)
        )
        fills = fill_result.scalars().all()

        market_ids = {
            *(order.market_id for order in recent_orders),
            *(order.market_id for order in active_orders),
            *(position.market_id for position in positions),
            *(trade.market_id for trade in fills),
        }
        markets_by_id: dict[str, Market] = {}
        if market_ids:
            market_result = await self.session.execute(
                select(Market).where(Market.id.in_(market_ids))
            )
            markets_by_id = {market.id: market for market in market_result.scalars().all()}

        reserved_total = Decimal("0.00")
        grouped_orders: dict[str, list[Order]] = {}
        for order in active_orders:
            reserved_total = quantize_money(reserved_total + order.reserved_amount)
            grouped_orders.setdefault(order.market_id, []).append(order)

        items: list[PortfolioOrderItemResponse] = []
        for order in recent_orders:
            market = markets_by_id.get(order.market_id)
            remaining_quantity = quantize_money(order.quantity - order.filled_quantity)
            items.append(
                PortfolioOrderItem(
                    id=order.id,
                    market_id=order.market_id,
                    market_slug=market.slug if market is not None else None,
                    market_label=(
                        market.short_label if market is not None else f"Market {order.market_id}"
                    ),
                    market_question=market.question if market is not None else None,
                    side=order.side,
                    direction=order.direction,
                    price=quantize_money(order.price),
                    quantity=remaining_quantity,
                    reserved_amount=quantize_money(order.reserved_amount),
                    status=order.status,
                    created_at=order.created_at,
                ).to_response_model()
            )

        position_items: list[PortfolioPositionItemResponse] = []
        for position in positions:
            market = markets_by_id.get(position.market_id)
            mark_price = Decimal("0.00")
            if market is not None:
                mark_price = quantize_money(
                    market.yes_price if position.side == "YES" else market.no_price
                )
            cost_basis = quantize_money(position.average_entry_price * position.shares)
            market_value = quantize_money(mark_price * position.shares)
            position_items.append(
                PortfolioPositionItem(
                    market_id=position.market_id,
                    market_slug=market.slug if market is not None else None,
                    market_label=(
                        market.short_label if market is not None else f"Market {position.market_id}"
                    ),
                    market_question=market.question if market is not None else None,
                    side=position.side,
                    shares=quantize_money(position.shares),
                    average_entry_price=quantize_money(position.average_entry_price),
                    mark_price=mark_price,
                    cost_basis=cost_basis,
                    market_value=market_value,
                    unrealized_pnl=quantize_money(market_value - cost_basis),
                    realized_pnl=quantize_money(position.realized_pnl),
                    updated_at=position.updated_at,
                ).to_response_model()
            )

        fill_items: list[PortfolioFillItemResponse] = []
        for trade in fills:
            market = markets_by_id.get(trade.market_id)
            direction = "BUY" if trade.buyer_id == user_id else "SELL"
            fill_items.append(
                PortfolioFillItem(
                    trade_id=trade.id,
                    market_id=trade.market_id,
                    market_slug=market.slug if market is not None else None,
                    market_label=(
                        market.short_label if market is not None else f"Market {trade.market_id}"
                    ),
                    side=trade.side,
                    direction=direction,
                    price=quantize_money(trade.price),
                    shares=quantize_money(trade.quantity),
                    notional=quantize_money(trade.notional_amount),
                    executed_at=trade.executed_at,
                ).to_response_model()
            )

        market_exposure_items: list[PortfolioMarketExposureItemResponse] = []
        for market_id, market_orders in grouped_orders.items():
            market = markets_by_id.get(market_id)
            reserved_amount = Decimal("0.00")
            total_quantity = Decimal("0.00")
            weighted_total = Decimal("0.00")

            for order in market_orders:
                reserved_amount = quantize_money(reserved_amount + order.reserved_amount)
                remaining_quantity = quantize_money(order.quantity - order.filled_quantity)
                total_quantity = quantize_money(total_quantity + remaining_quantity)
                weighted_total = quantize_money(weighted_total + (order.price * remaining_quantity))

            average_entry_price = (
                quantize_money(weighted_total / total_quantity)
                if total_quantity > Decimal("0.00")
                else Decimal("0.00")
            )

            market_exposure_items.append(
                PortfolioMarketExposureItem(
                    market_id=market_id,
                    market_slug=market.slug if market is not None else None,
                    market_label=(
                        market.short_label if market is not None else f"Market {market_id}"
                    ),
                    market_question=market.question if market is not None else None,
                    active_order_count=len(market_orders),
                    reserved_amount=reserved_amount,
                    total_quantity=total_quantity,
                    average_entry_price=average_entry_price,
                    latest_yes_price=(
                        quantize_money(market.yes_price) if market is not None else Decimal("0.00")
                    ),
                    latest_no_price=(
                        quantize_money(market.no_price) if market is not None else Decimal("0.00")
                    ),
                ).to_response_model()
            )

        recent_prints: list[PortfolioRecentPrintResponse] = []
        for market_id in grouped_orders:
            market = markets_by_id.get(market_id)
            if market is None:
                continue

            for trade in market.trades[:2]:
                recent_prints.append(
                    PortfolioRecentPrint(
                        market_id=market.id,
                        market_slug=market.slug,
                        market_label=market.short_label,
                        side=str(trade.get("side", "")),
                        price=quantize_money(Decimal(str(trade.get("price", "0")))),
                        shares=Decimal(str(trade.get("shares", "0"))),
                        time_label=str(trade.get("time", "")),
                    ).to_response_model()
                )

        return PortfolioOrdersResponse(
            account=account.to_response_model(),
            exposure=PortfolioExposureResponse(
                openOrderCount=len(active_orders),
                reservedOrderValueKes=f"{reserved_total:.2f}",
            ),
            items=items,
            positions=position_items,
            fills=fill_items,
            markets=market_exposure_items,
            recentPrints=recent_prints[:6],
        )

    async def get_feed_interactions(self, *, user_id: str) -> FeedInteractionsResponse:
        account = await self._load_account_snapshot(user_id)
        if account is None:
            raise AuthenticationError("Authenticated user was not found.")

        result = await self.session.execute(
            select(UserFeedInteraction)
            .where(UserFeedInteraction.user_id == user_id)
            .order_by(desc(UserFeedInteraction.updated_at))
        )
        interactions = result.scalars().all()

        return FeedInteractionsResponse(
            items=[
                FeedInteractionItem(
                    market_slug=interaction.market_slug,
                    viewed_count=interaction.viewed_count,
                    paused_count=interaction.paused_count,
                    opened_count=interaction.opened_count,
                    last_interacted_at=interaction.last_interacted_at,
                ).to_response_model()
                for interaction in interactions
            ]
        )

    async def record_feed_interaction(
        self,
        *,
        user_id: str,
        market_slug: str,
        event_type: str,
    ) -> FeedInteractionItemResponse:
        if event_type not in FEED_INTERACTION_EVENT_TYPES:
            raise WalletFundingError("Unsupported feed interaction event.")

        account = await self._load_account_snapshot(user_id)
        if account is None:
            raise AuthenticationError("Authenticated user was not found.")

        async with self._transaction():
            result = await self.session.execute(
                select(UserFeedInteraction).where(
                    UserFeedInteraction.user_id == user_id,
                    UserFeedInteraction.market_slug == market_slug,
                )
            )
            interaction = result.scalar_one_or_none()

            if interaction is None:
                interaction = UserFeedInteraction(
                    id=str(uuid4()),
                    user_id=user_id,
                    market_slug=market_slug,
                    viewed_count=0,
                    paused_count=0,
                    opened_count=0,
                )
                self.session.add(interaction)
                await self.session.flush()

            if event_type == "view":
                interaction.viewed_count += 1
            elif event_type == "pause":
                interaction.paused_count += 1
            else:
                interaction.opened_count += 1
            interaction.last_interacted_at = datetime.now(UTC)

        return FeedInteractionItem(
            market_slug=interaction.market_slug,
            viewed_count=interaction.viewed_count,
            paused_count=interaction.paused_count,
            opened_count=interaction.opened_count,
            last_interacted_at=interaction.last_interacted_at,
        ).to_response_model()

    async def sync_feed_interactions(
        self,
        *,
        user_id: str,
        payload: FeedInteractionSyncRequest,
    ) -> FeedInteractionsResponse:
        account = await self._load_account_snapshot(user_id)
        if account is None:
            raise AuthenticationError("Authenticated user was not found.")

        async with self._transaction():
            for item in payload.items:
                result = await self.session.execute(
                    select(UserFeedInteraction).where(
                        UserFeedInteraction.user_id == user_id,
                        UserFeedInteraction.market_slug == item.marketSlug,
                    )
                )
                interaction = result.scalar_one_or_none()

                if interaction is None:
                    interaction = UserFeedInteraction(
                        id=str(uuid4()),
                        user_id=user_id,
                        market_slug=item.marketSlug,
                        viewed_count=item.viewedCount,
                        paused_count=item.pausedCount,
                        opened_count=item.openedCount,
                        last_interacted_at=_parse_feed_interaction_timestamp(
                            item.lastInteractedAt
                        ),
                    )
                    self.session.add(interaction)
                    continue

                interaction.viewed_count = max(interaction.viewed_count, item.viewedCount)
                interaction.paused_count = max(interaction.paused_count, item.pausedCount)
                interaction.opened_count = max(interaction.opened_count, item.openedCount)
                if item.lastInteractedAt:
                    incoming_last_interacted_at = _parse_feed_interaction_timestamp(
                        item.lastInteractedAt
                    )
                    existing_last_interacted_at = (
                        interaction.last_interacted_at.replace(tzinfo=UTC)
                        if interaction.last_interacted_at is not None
                        and interaction.last_interacted_at.tzinfo is None
                        else interaction.last_interacted_at
                    )
                    if (
                        existing_last_interacted_at is None
                        or (
                            incoming_last_interacted_at is not None
                            and incoming_last_interacted_at > existing_last_interacted_at
                        )
                    ):
                        interaction.last_interacted_at = incoming_last_interacted_at

        return await self.get_feed_interactions(user_id=user_id)

    async def get_comment_thread_follows(
        self,
        *,
        user_id: str,
    ) -> CommentThreadFollowsResponse:
        account = await self._load_account_snapshot(user_id)
        if account is None:
            raise AuthenticationError("Authenticated user was not found.")

        result = await self.session.execute(
            select(UserCommentThreadFollow)
            .where(UserCommentThreadFollow.user_id == user_id)
            .order_by(desc(UserCommentThreadFollow.updated_at))
        )
        follows = result.scalars().all()

        return CommentThreadFollowsResponse(
            items=[
                CommentThreadFollowItem(
                    market_slug=follow.market_slug,
                    comment_id=follow.comment_id,
                    last_seen_reply_count=follow.last_seen_reply_count,
                    auto_followed=follow.auto_followed,
                ).to_response_model()
                for follow in follows
            ]
        )

    async def get_comment_thread_notifications(
        self,
        *,
        user_id: str,
    ) -> CommentThreadNotificationsResponse:
        account = await self._load_account_snapshot(user_id)
        if account is None:
            raise AuthenticationError("Authenticated user was not found.")

        follows_result = await self.session.execute(
            select(UserCommentThreadFollow)
            .where(UserCommentThreadFollow.user_id == user_id)
            .order_by(desc(UserCommentThreadFollow.updated_at))
        )
        follows = follows_result.scalars().all()
        if not follows:
            return CommentThreadNotificationsResponse(items=[])

        market_slugs = sorted({follow.market_slug for follow in follows})
        comment_ids = sorted({follow.comment_id for follow in follows})

        markets_result = await self.session.execute(
            select(Market).where(Market.slug.in_(market_slugs))
        )
        market_by_slug = {market.slug: market for market in markets_result.scalars().all()}

        parent_comments_result = await self.session.execute(
            select(MarketComment, User)
            .join(User, User.id == MarketComment.user_id)
            .where(
                MarketComment.id.in_(comment_ids),
                MarketComment.hidden_at.is_(None),
            )
        )
        parent_comments = {
            comment.id: (comment, user)
            for comment, user in parent_comments_result.all()
        }
        if not parent_comments:
            return CommentThreadNotificationsResponse(items=[])

        replies_result = await self.session.execute(
            select(MarketComment, User)
            .join(User, User.id == MarketComment.user_id)
            .where(
                MarketComment.parent_comment_id.in_(list(parent_comments.keys())),
                MarketComment.hidden_at.is_(None),
            )
            .order_by(MarketComment.created_at.asc())
        )
        replies_by_parent: dict[str, list[tuple[MarketComment, User]]] = defaultdict(list)
        for reply, user in replies_result.all():
            if reply.parent_comment_id is not None:
                replies_by_parent[reply.parent_comment_id].append((reply, user))

        items: list[CommentThreadNotificationItemResponse] = []
        for follow in follows:
            parent_row = parent_comments.get(follow.comment_id)
            market = market_by_slug.get(follow.market_slug)
            if parent_row is None or market is None:
                continue

            parent_comment, parent_author = parent_row
            replies = replies_by_parent.get(parent_comment.id, [])
            unread_reply_count = max(0, len(replies) - follow.last_seen_reply_count)
            if unread_reply_count <= 0:
                continue

            latest_reply, latest_reply_author = replies[-1]
            items.append(
                CommentThreadNotificationItem(
                    market_slug=follow.market_slug,
                    market_question=market.question,
                    comment_id=parent_comment.id,
                    comment_author=parent_author.first_name,
                    comment_body=parent_comment.body,
                    unread_reply_count=unread_reply_count,
                    total_reply_count=len(replies),
                    auto_followed=follow.auto_followed,
                    latest_reply_comment_id=latest_reply.id,
                    latest_reply_author=latest_reply_author.first_name,
                    latest_reply_body=latest_reply.body,
                    latest_reply_at=latest_reply.created_at.isoformat(),
                ).to_response_model()
            )

        items.sort(
            key=lambda item: (
                item.latestReplyAt or "",
                str(item.unreadReplyCount).zfill(6),
            ),
            reverse=True,
        )
        return CommentThreadNotificationsResponse(items=items)

    async def upsert_comment_thread_follow(
        self,
        *,
        user_id: str,
        market_slug: str,
        comment_id: str,
        last_seen_reply_count: int,
        auto_followed: bool,
    ) -> CommentThreadFollowItemResponse:
        account = await self._load_account_snapshot(user_id)
        if account is None:
            raise AuthenticationError("Authenticated user was not found.")

        async with self._transaction():
            result = await self.session.execute(
                select(UserCommentThreadFollow).where(
                    UserCommentThreadFollow.user_id == user_id,
                    UserCommentThreadFollow.market_slug == market_slug,
                    UserCommentThreadFollow.comment_id == comment_id,
                )
            )
            follow = result.scalar_one_or_none()

            if follow is None:
                follow = UserCommentThreadFollow(
                    id=str(uuid4()),
                    user_id=user_id,
                    market_slug=market_slug,
                    comment_id=comment_id,
                    last_seen_reply_count=last_seen_reply_count,
                    auto_followed=auto_followed,
                )
                self.session.add(follow)
            else:
                follow.last_seen_reply_count = max(
                    follow.last_seen_reply_count,
                    last_seen_reply_count,
                )
                follow.auto_followed = follow.auto_followed or auto_followed

        return CommentThreadFollowItem(
            market_slug=follow.market_slug,
            comment_id=follow.comment_id,
            last_seen_reply_count=follow.last_seen_reply_count,
            auto_followed=follow.auto_followed,
        ).to_response_model()

    async def sync_comment_thread_follows(
        self,
        *,
        user_id: str,
        payload: CommentThreadFollowSyncRequest,
    ) -> CommentThreadFollowsResponse:
        account = await self._load_account_snapshot(user_id)
        if account is None:
            raise AuthenticationError("Authenticated user was not found.")

        async with self._transaction():
            for item in payload.items:
                result = await self.session.execute(
                    select(UserCommentThreadFollow).where(
                        UserCommentThreadFollow.user_id == user_id,
                        UserCommentThreadFollow.market_slug == item.marketSlug,
                        UserCommentThreadFollow.comment_id == item.commentId,
                    )
                )
                follow = result.scalar_one_or_none()

                if follow is None:
                    self.session.add(
                        UserCommentThreadFollow(
                            id=str(uuid4()),
                            user_id=user_id,
                            market_slug=item.marketSlug,
                            comment_id=item.commentId,
                            last_seen_reply_count=item.lastSeenReplyCount,
                            auto_followed=item.autoFollowed,
                        )
                    )
                    continue

                follow.last_seen_reply_count = max(
                    follow.last_seen_reply_count,
                    item.lastSeenReplyCount,
                )
                follow.auto_followed = follow.auto_followed or item.autoFollowed

        return await self.get_comment_thread_follows(user_id=user_id)

    async def delete_comment_thread_follow(
        self,
        *,
        user_id: str,
        market_slug: str,
        comment_id: str,
    ) -> None:
        account = await self._load_account_snapshot(user_id)
        if account is None:
            raise AuthenticationError("Authenticated user was not found.")

        async with self._transaction():
            result = await self.session.execute(
                select(UserCommentThreadFollow).where(
                    UserCommentThreadFollow.user_id == user_id,
                    UserCommentThreadFollow.market_slug == market_slug,
                    UserCommentThreadFollow.comment_id == comment_id,
                )
            )
            follow = result.scalar_one_or_none()
            if follow is not None:
                await self.session.delete(follow)

    async def get_kyc_profile(self, *, user_id: str) -> KycSubmissionResponse | None:
        account = await self._load_account_snapshot(user_id)
        if account is None:
            raise AuthenticationError("Authenticated user was not found.")

        profile = await self._get_kyc_profile(user_id)
        if profile is None:
            return None

        return KycSubmissionResponse(
            status=profile.status,
            account=account.to_response_model(),
            profile=self._build_kyc_profile_snapshot(profile).to_response_model(),
        )

    async def submit_kyc_profile(
        self,
        *,
        user_id: str,
        legal_name: str,
        national_id_number: str,
        date_of_birth: str,
        document_reference: str,
    ) -> KycSubmissionResponse:
        async with self._transaction():
            user = await self._get_user_for_update(user_id)
            if user is None:
                raise AuthenticationError("Authenticated user was not found.")

            profile = await self._get_kyc_profile_for_update(user_id)
            normalized_id = national_id_number.strip().replace(" ", "")
            submitted_at = datetime.now(UTC)

            if profile is None:
                profile = KycProfile(
                    user_id=user.id,
                    status="pending",
                    legal_name=legal_name.strip(),
                    national_id_number=normalized_id,
                    date_of_birth=date_of_birth,
                    document_type="national_id",
                    document_reference=document_reference.strip(),
                    submitted_at=submitted_at,
                    reviewed_at=None,
                    reviewed_by_user_id=None,
                    rejection_reason=None,
                )
                self.session.add(profile)
            else:
                profile.status = "pending"
                profile.legal_name = legal_name.strip()
                profile.national_id_number = normalized_id
                profile.date_of_birth = date_of_birth
                profile.document_type = "national_id"
                profile.document_reference = document_reference.strip()
                profile.submitted_at = submitted_at
                profile.reviewed_at = None
                profile.reviewed_by_user_id = None
                profile.rejection_reason = None

            user.kyc_status = "pending"
            wallet = await self._get_or_create_wallet_for_update(user.id)

        refreshed_account = snapshot_from_models(user, wallet)
        return KycSubmissionResponse(
            status=profile.status,
            account=refreshed_account.to_response_model(),
            profile=self._build_kyc_profile_snapshot(profile).to_response_model(),
        )

    async def list_kyc_queue(
        self,
        *,
        admin_user_id: str,
        status_filter: str | None,
    ) -> AdminKycQueueResponse:
        await self._assert_admin_user(admin_user_id)

        query = select(KycProfile, User).join(User, User.id == KycProfile.user_id)
        if status_filter is not None:
            query = query.where(KycProfile.status == status_filter)
        query = query.order_by(desc(KycProfile.submitted_at))

        result = await self.session.execute(query)
        items = [
            AdminKycQueueItemResponse(
                userId=user.id,
                phone=user.phone,
                status=profile.status,
                legalName=profile.legal_name,
                nationalIdNumberMasked=mask_national_id(profile.national_id_number),
                documentType=profile.document_type,
                submittedAt=profile.submitted_at.isoformat(),
                rejectionReason=profile.rejection_reason,
            )
            for profile, user in result.all()
        ]
        return AdminKycQueueResponse(items=items)

    async def review_kyc_profile(
        self,
        *,
        admin_user_id: str,
        target_user_id: str,
        decision: str,
        rejection_reason: str | None,
    ) -> KycSubmissionResponse:
        await self._assert_admin_user(admin_user_id)
        if decision == "rejected" and not rejection_reason:
            raise WalletFundingError("Rejection reason is required when rejecting KYC.")

        async with self._transaction():
            admin_user = await self._get_user_for_update(admin_user_id)
            if admin_user is None:
                raise AuthenticationError("Authenticated user was not found.")

            user = await self._get_user_for_update(target_user_id)
            if user is None:
                raise WalletFundingError("KYC target user was not found.")

            profile = await self._get_kyc_profile_for_update(target_user_id)
            if profile is None:
                raise WalletFundingError("KYC profile was not found.")

            profile.status = decision
            profile.reviewed_at = datetime.now(UTC)
            profile.reviewed_by_user_id = admin_user.id
            profile.rejection_reason = rejection_reason.strip() if rejection_reason else None
            user.kyc_status = decision
            wallet = await self._get_or_create_wallet_for_update(user.id)

        return KycSubmissionResponse(
            status=profile.status,
            account=snapshot_from_models(user, wallet).to_response_model(),
            profile=self._build_kyc_profile_snapshot(profile).to_response_model(),
        )

    async def list_admin_wallet_activity(
        self,
        *,
        admin_user_id: str,
        status_filter: str | None,
        kind_filter: str | None,
        limit: int,
    ) -> AdminWalletSupportResponse:
        await self._assert_admin_user(admin_user_id)

        normalized_limit = max(1, min(limit, 50))
        items: list[AdminWalletSupportItem] = []
        reviewer_map: dict[str, User] = {}
        dispatch_state_by_ref = await self._load_payment_dispatch_state()

        if kind_filter in (None, "all", "withdrawal"):
            reviewer_ids_result = await self.session.execute(
                select(Withdrawal.reviewed_by_user_id).where(
                    Withdrawal.reviewed_by_user_id.is_not(None)
                )
            )
            reviewer_ids = {
                reviewer_id
                for reviewer_id in reviewer_ids_result.scalars().all()
                if reviewer_id is not None
            }
            if reviewer_ids:
                reviewers_result = await self.session.execute(
                    select(User).where(User.id.in_(reviewer_ids))
                )
                reviewer_map = {
                    reviewer.id: reviewer for reviewer in reviewers_result.scalars().all()
                }

        if kind_filter in (None, "all", "deposit"):
            deposit_query = select(Deposit, User).join(User, User.id == Deposit.user_id)
            if status_filter is not None and status_filter != "all":
                deposit_query = deposit_query.where(Deposit.status == status_filter)
            deposit_query = deposit_query.order_by(desc(Deposit.created_at)).limit(normalized_limit)
            deposits_result = await self.session.execute(deposit_query)
            items.extend(
                self._build_admin_deposit_support_item(
                    deposit,
                    user,
                    dispatch_state_by_ref.get(("deposit", deposit.id)),
                )
                for deposit, user in deposits_result.all()
            )

        if kind_filter in (None, "all", "withdrawal"):
            withdrawal_query = select(Withdrawal, User).join(User, User.id == Withdrawal.user_id)
            if status_filter is not None and status_filter != "all":
                withdrawal_query = withdrawal_query.where(Withdrawal.status == status_filter)
            withdrawal_query = withdrawal_query.order_by(desc(Withdrawal.created_at)).limit(
                normalized_limit
            )
            withdrawals_result = await self.session.execute(withdrawal_query)
            items.extend(
                self._build_admin_withdrawal_support_item(
                    withdrawal,
                    user,
                    reviewer_map.get(withdrawal.reviewed_by_user_id or ""),
                    dispatch_state_by_ref.get(("withdrawal", withdrawal.id)),
                )
                for withdrawal, user in withdrawals_result.all()
            )

        items.sort(
            key=lambda item: (
                item.created_at,
                self._activity_priority(item.kind),
            ),
            reverse=True,
        )

        return AdminWalletSupportResponse(
            items=[item.to_response_model() for item in items[:normalized_limit]]
        )

    async def retry_payment_dispatch(
        self,
        *,
        admin_user_id: str,
        activity_id: str,
    ) -> AdminWalletSupportItemResponse:
        await self._assert_admin_user(admin_user_id)

        async with self._transaction():
            deposit_result = await self.session.execute(
                select(Deposit, User).join(User, User.id == Deposit.user_id).where(Deposit.id == activity_id)
            )
            deposit_row = deposit_result.one_or_none()
            if deposit_row is not None:
                deposit, user = deposit_row
                await self._requeue_payment_outbox_event(
                    aggregate_type="deposit",
                    aggregate_id=deposit.id,
                )
                dispatch_state = await self._load_payment_dispatch_state_for(
                    aggregate_type="deposit",
                    aggregate_id=deposit.id,
                )
                return self._build_admin_deposit_support_item(
                    deposit,
                    user,
                    dispatch_state,
                ).to_response_model()

            withdrawal_result = await self.session.execute(
                select(Withdrawal, User)
                .join(User, User.id == Withdrawal.user_id)
                .where(Withdrawal.id == activity_id)
            )
            withdrawal_row = withdrawal_result.one_or_none()
            if withdrawal_row is None:
                raise WalletFundingError("Payment activity was not found.")

            withdrawal, user = withdrawal_row
            await self._requeue_payment_outbox_event(
                aggregate_type="withdrawal",
                aggregate_id=withdrawal.id,
            )
            reviewer: User | None = None
            if withdrawal.reviewed_by_user_id is not None:
                reviewer_result = await self.session.execute(
                    select(User).where(User.id == withdrawal.reviewed_by_user_id)
                )
                reviewer = reviewer_result.scalar_one_or_none()
            dispatch_state = await self._load_payment_dispatch_state_for(
                aggregate_type="withdrawal",
                aggregate_id=withdrawal.id,
            )
            return self._build_admin_withdrawal_support_item(
                withdrawal,
                user,
                reviewer,
                dispatch_state,
            ).to_response_model()

    async def review_withdrawal(
        self,
        *,
        admin_user_id: str,
        withdrawal_id: str,
        decision: str,
        note: str | None,
    ) -> AdminWalletSupportItemResponse:
        normalized_decision = decision.strip().lower()
        if normalized_decision not in {"approved", "rejected"}:
            raise WalletFundingError("Withdrawal decision must be approved or rejected.")

        approved_amount = Decimal("0.00")
        approved_phone = ""
        approval_note = note.strip() if note and note.strip() else None

        async with self._transaction():
            await self._assert_admin_user(admin_user_id)

            admin_result = await self.session.execute(select(User).where(User.id == admin_user_id))
            admin_user = admin_result.scalar_one_or_none()
            if admin_user is None:
                raise AuthenticationError("Authenticated user was not found.")

            result = await self.session.execute(
                select(Withdrawal, User)
                .join(User, User.id == Withdrawal.user_id)
                .where(Withdrawal.id == withdrawal_id)
                .with_for_update()
            )
            row = result.one_or_none()
            if row is None:
                raise WalletFundingError("Withdrawal review target was not found.")

            withdrawal, _user = row
            if withdrawal.status != "review_required":
                raise WalletFundingError("Only review-required withdrawals can be decided here.")

            wallet = await self._get_or_create_wallet_for_update(withdrawal.user_id)
            withdrawal.reviewed_at = datetime.now(UTC)
            withdrawal.reviewed_by_user_id = admin_user.id

            if normalized_decision == "rejected":
                wallet.available_balance = quantize_money(
                    wallet.available_balance + withdrawal.amount
                )
                wallet.reserved_balance = quantize_money(
                    wallet.reserved_balance - withdrawal.amount
                )
                withdrawal.status = "failed"
                withdrawal.failed_at = datetime.now(UTC)
                withdrawal.result_desc = note or "Rejected during manual payout review."
                self.session.add(
                    LedgerEntry(
                        id=str(uuid4()),
                        user_id=withdrawal.user_id,
                        entry_type="MPESA_WITHDRAWAL_RELEASE",
                        amount=withdrawal.amount,
                        currency=wallet.currency,
                        reference_type="withdrawal",
                        reference_id=withdrawal.id,
                        available_balance_after=wallet.available_balance,
                        reserved_balance_after=wallet.reserved_balance,
                        note=(
                            note.strip()
                            if note and note.strip()
                            else (
                                f"Manual withdrawal rejection released funds for {withdrawal.phone}"
                            )
                        ),
                    )
                )
            else:
                approved_amount = quantize_money(withdrawal.amount)
                approved_phone = withdrawal.phone
                withdrawal.result_desc = approval_note
                self.session.add(
                    OutboxEvent(
                        id=str(uuid4()),
                        topic="wallet.withdrawal.dispatch_requested",
                        aggregate_type="withdrawal",
                        aggregate_id=withdrawal.id,
                        payload={
                            "withdrawal_reference": withdrawal.id,
                            "user_id": withdrawal.user_id,
                            "amount": f"{approved_amount:.2f}",
                            "phone": approved_phone,
                            "source": "admin_review",
                        },
                        status="pending",
                    )
                )

        refreshed_result = await self.session.execute(
            select(Withdrawal, User)
            .join(User, User.id == Withdrawal.user_id)
            .where(Withdrawal.id == withdrawal_id)
        )
        refreshed_row = refreshed_result.one_or_none()
        if refreshed_row is None:
            raise WalletFundingError("Withdrawal review target was not found after update.")

        refreshed_withdrawal, refreshed_user = refreshed_row
        reviewer: User | None = None
        if refreshed_withdrawal.reviewed_by_user_id is not None:
            reviewer_result = await self.session.execute(
                select(User).where(User.id == refreshed_withdrawal.reviewed_by_user_id)
            )
            reviewer = reviewer_result.scalar_one_or_none()
        return self._build_admin_withdrawal_support_item(
            refreshed_withdrawal,
            refreshed_user,
            reviewer,
        ).to_response_model()

    async def process_stk_callback(self, *, callback_payload: dict[str, object]) -> None:
        callback = extract_stk_callback(callback_payload)
        if callback is None:
            raise WalletFundingError("Callback payload did not contain stk callback data.")

        async with self._transaction():
            result = await self.session.execute(
                select(Deposit)
                .where(Deposit.checkout_request_id == callback.checkout_request_id)
                .with_for_update()
            )
            deposit = result.scalar_one_or_none()
            if deposit is None:
                raise WalletFundingError("Deposit callback did not match an existing deposit.")

            deposit.callback_received_at = datetime.now(UTC)
            deposit.result_code = callback.result_code
            deposit.result_desc = callback.result_desc

            if callback.result_code != 0:
                deposit.status = "failed"
                return

            if deposit.credited_at is not None:
                deposit.status = "completed"
                return

            wallet = await self._get_or_create_wallet_for_update(deposit.user_id)
            wallet.available_balance = quantize_money(wallet.available_balance + deposit.amount)
            deposit.status = "completed"
            deposit.credited_at = datetime.now(UTC)
            deposit.mpesa_receipt_number = callback.mpesa_receipt_number

            self.session.add(
                LedgerEntry(
                    id=str(uuid4()),
                    user_id=deposit.user_id,
                    entry_type="MPESA_DEPOSIT",
                    amount=deposit.amount,
                    currency=wallet.currency,
                    reference_type="deposit",
                    reference_id=deposit.id,
                    available_balance_after=wallet.available_balance,
                    reserved_balance_after=wallet.reserved_balance,
                    note=f"M-Pesa deposit confirmed for {deposit.phone}",
                )
            )

    async def process_b2c_callback(self, *, callback_payload: dict[str, object]) -> None:
        callback = extract_b2c_callback(callback_payload)
        if callback is None:
            raise WalletFundingError("Callback payload did not contain b2c result data.")

        async with self._transaction():
            result = await self.session.execute(
                select(Withdrawal)
                .where(Withdrawal.conversation_id == callback.conversation_id)
                .with_for_update()
            )
            withdrawal = result.scalar_one_or_none()
            if withdrawal is None:
                raise WalletFundingError(
                    "Withdrawal callback did not match an existing withdrawal."
                )

            withdrawal.callback_received_at = datetime.now(UTC)
            withdrawal.result_code = callback.result_code
            withdrawal.result_desc = callback.result_desc
            withdrawal.mpesa_receipt_number = callback.mpesa_receipt_number

            if withdrawal.completed_at is not None:
                withdrawal.status = "completed"
                return
            if withdrawal.failed_at is not None:
                withdrawal.status = "failed"
                return

            wallet = await self._get_or_create_wallet_for_update(withdrawal.user_id)
            if callback.result_code != 0:
                wallet.available_balance = quantize_money(
                    wallet.available_balance + withdrawal.amount
                )
                wallet.reserved_balance = quantize_money(
                    wallet.reserved_balance - withdrawal.amount
                )
                withdrawal.status = "failed"
                withdrawal.failed_at = datetime.now(UTC)
                self.session.add(
                    LedgerEntry(
                        id=str(uuid4()),
                        user_id=withdrawal.user_id,
                        entry_type="MPESA_WITHDRAWAL_RELEASE",
                        amount=withdrawal.amount,
                        currency=wallet.currency,
                        reference_type="withdrawal",
                        reference_id=withdrawal.id,
                        available_balance_after=wallet.available_balance,
                        reserved_balance_after=wallet.reserved_balance,
                        note=f"M-Pesa withdrawal released back to wallet for {withdrawal.phone}",
                    )
                )
                return

            wallet.reserved_balance = quantize_money(wallet.reserved_balance - withdrawal.amount)
            withdrawal.status = "completed"
            withdrawal.completed_at = datetime.now(UTC)
            self.session.add(
                LedgerEntry(
                    id=str(uuid4()),
                    user_id=withdrawal.user_id,
                    entry_type="MPESA_WITHDRAWAL",
                    amount=Decimal("0.00"),
                    currency=wallet.currency,
                    reference_type="withdrawal",
                    reference_id=withdrawal.id,
                    available_balance_after=wallet.available_balance,
                    reserved_balance_after=wallet.reserved_balance,
                    note=f"M-Pesa withdrawal completed for {withdrawal.phone}",
                )
            )

    async def _get_daily_withdrawal_total(self, user_id: str) -> Decimal:
        day_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        result = await self.session.execute(
            select(Withdrawal.amount).where(
                Withdrawal.user_id == user_id,
                Withdrawal.created_at >= day_start,
                Withdrawal.status.in_(("created", "pending", "review_required", "completed")),
            )
        )
        amounts = result.scalars().all()
        total = sum((quantize_money(amount) for amount in amounts), Decimal("0.00"))
        return quantize_money(total)

    def _build_verification_activity(self, entry: LedgerEntry) -> WalletTransactionItem:
        return WalletTransactionItem(
            id=entry.id,
            kind="verification",
            status="completed",
            title="M-Pesa wallet verified",
            subtitle="KES 5 verification credit added back to your wallet.",
            amount=quantize_money(entry.amount),
            created_at=entry.created_at,
        )

    def _build_deposit_activity(self, deposit: Deposit) -> WalletTransactionItem:
        if deposit.status == "completed":
            subtitle = "Top-up confirmed and added to your available balance."
        elif deposit.status == "failed":
            subtitle = deposit.result_desc or "The M-Pesa prompt did not complete."
        elif deposit.status == "created":
            subtitle = "Top-up queued for dispatch to M-Pesa."
        else:
            subtitle = "M-Pesa prompt sent. Waiting for confirmation from Safaricom."

        return WalletTransactionItem(
            id=deposit.id,
            kind="deposit",
            status=deposit.status,
            title="M-Pesa wallet top-up",
            subtitle=subtitle,
            amount=quantize_money(deposit.amount),
            created_at=deposit.created_at,
        )

    def _build_withdrawal_activity(self, withdrawal: Withdrawal) -> WalletTransactionItem:
        if withdrawal.status == "completed":
            subtitle = "Payout completed to your verified M-Pesa number."
        elif withdrawal.status == "created":
            subtitle = "Funds are reserved while the M-Pesa payout is queued for dispatch."
        elif withdrawal.status == "review_required":
            subtitle = (
                "Payout approved and queued for dispatch."
                if withdrawal.reviewed_at is not None
                else "Funds are reserved while the payout waits for manual review."
            )
        elif withdrawal.status == "failed":
            subtitle = "Payout failed and the held amount was released back to your wallet."
        else:
            subtitle = "Funds are reserved while the M-Pesa payout is still processing."

        return WalletTransactionItem(
            id=withdrawal.id,
            kind="withdrawal",
            status=withdrawal.status,
            title="M-Pesa withdrawal",
            subtitle=subtitle,
            amount=quantize_money(withdrawal.amount),
            created_at=withdrawal.created_at,
        )

    def _build_kyc_profile_snapshot(self, profile: KycProfile) -> KycProfileSnapshot:
        return KycProfileSnapshot(
            status=profile.status,
            legal_name=profile.legal_name,
            national_id_number_masked=mask_national_id(profile.national_id_number),
            date_of_birth=profile.date_of_birth,
            document_type=profile.document_type,
            document_reference=profile.document_reference,
            submitted_at=profile.submitted_at,
            reviewed_at=profile.reviewed_at,
            rejection_reason=profile.rejection_reason,
        )

    def _build_admin_deposit_support_item(
        self,
        deposit: Deposit,
        user: User,
        dispatch_state: dict[str, Any] | None = None,
    ) -> AdminWalletSupportItem:
        if deposit.status == "completed":
            subtitle = f"Top-up confirmed for {deposit.phone}."
        elif deposit.status == "failed":
            subtitle = deposit.result_desc or "The M-Pesa prompt did not complete."
        elif deposit.status == "created":
            subtitle = f"Top-up intent created for {deposit.phone}. Waiting for worker dispatch."
        else:
            subtitle = (
                deposit.customer_message
                or f"M-Pesa prompt sent to {deposit.phone}. Waiting for callback confirmation."
            )

        updated_at = deposit.updated_at or deposit.created_at
        return AdminWalletSupportItem(
            id=deposit.id,
            user_id=user.id,
            first_name=user.first_name,
            phone=user.phone,
            kind="deposit",
            status=deposit.status,
            title="M-Pesa wallet top-up",
            subtitle=subtitle,
            amount=quantize_money(deposit.amount),
            created_at=deposit.created_at,
            updated_at=updated_at,
            dispatch_attempts=dispatch_state.get("attempts") if dispatch_state else None,
            dispatch_error=cast(str | None, dispatch_state.get("error")) if dispatch_state else None,
            can_retry_dispatch=bool(
                dispatch_state
                and dispatch_state.get("status") == "failed"
                and deposit.status == "failed"
                and dispatch_state.get("attempts", 0) < PAYMENT_DISPATCH_MAX_ATTEMPTS
            ),
        )

    def _build_admin_withdrawal_support_item(
        self,
        withdrawal: Withdrawal,
        user: User,
        reviewer: User | None = None,
        dispatch_state: dict[str, Any] | None = None,
    ) -> AdminWalletSupportItem:
        if withdrawal.status == "completed":
            subtitle = f"Payout completed to {withdrawal.phone}."
        elif withdrawal.status == "created":
            subtitle = "Payout approved and queued for worker dispatch."
        elif withdrawal.status == "review_required":
            subtitle = (
                "Payout approved and waiting for worker dispatch."
                if withdrawal.reviewed_at is not None
                else "Funds are reserved while this payout waits for manual review."
            )
        elif withdrawal.status == "failed":
            subtitle = "Payout failed and the held amount was released back to the wallet."
        else:
            subtitle = "Funds are reserved while the M-Pesa payout is still processing."

        updated_at = withdrawal.updated_at or withdrawal.created_at
        return AdminWalletSupportItem(
            id=withdrawal.id,
            user_id=user.id,
            first_name=user.first_name,
            phone=user.phone,
            kind="withdrawal",
            status=withdrawal.status,
            title="M-Pesa withdrawal",
            subtitle=subtitle,
            amount=quantize_money(withdrawal.amount),
            created_at=withdrawal.created_at,
            updated_at=updated_at,
            reviewed_at=withdrawal.reviewed_at,
            reviewed_by_name=reviewer.first_name if reviewer is not None else None,
            review_decision=(
                "approved"
                if (
                    withdrawal.reviewed_at is not None
                    and withdrawal.status in {"created", "review_required", "pending", "completed"}
                )
                else "rejected"
                if withdrawal.reviewed_at is not None and withdrawal.status == "failed"
                else None
            ),
            dispatch_attempts=dispatch_state.get("attempts") if dispatch_state else None,
            dispatch_error=cast(str | None, dispatch_state.get("error")) if dispatch_state else None,
            can_retry_dispatch=bool(
                dispatch_state
                and dispatch_state.get("status") == "failed"
                and withdrawal.reviewed_at is not None
                and withdrawal.status == "review_required"
                and dispatch_state.get("attempts", 0) < PAYMENT_DISPATCH_MAX_ATTEMPTS
            ),
        )

    def _activity_priority(self, kind: str) -> int:
        priorities = {
            "withdrawal": 3,
            "deposit": 2,
            "verification": 1,
        }
        return priorities.get(kind, 0)


def mask_national_id(value: str) -> str:
    if len(value) <= 4:
        return value
    return f"{'*' * max(len(value) - 4, 0)}{value[-4:]}"


async def get_account_access_service(
    session: AsyncSessionDep,
) -> AccountAccessService:
    return AccountAccessService(
        session=session,
        session_ttl=timedelta(hours=settings.auth_session_ttl_hours),
        verification_credit_amount=Decimal(settings.mpesa_verification_credit_amount),
    )


async def get_optional_authenticated_account(
    account_service: Annotated[AccountAccessService, Depends(get_account_access_service)],
    authorization: AuthorizationHeader = None,
) -> AuthenticatedAccount | None:
    token = extract_bearer_token(authorization)
    if token is None:
        return None

    return await account_service.get_authenticated_account(token)


async def get_authenticated_account(
    account: Annotated[AuthenticatedAccount | None, Depends(get_optional_authenticated_account)],
) -> AuthenticatedAccount:
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return account


def extract_stk_callback(payload: dict[str, object]) -> StkCallback | None:
    body = payload.get("Body")
    if not isinstance(body, dict):
        return None

    body_dict = cast(dict[str, object], body)
    callback = body_dict.get("stkCallback")
    if not isinstance(callback, dict):
        return None

    callback_dict = cast(dict[str, object], callback)
    metadata = callback_dict.get("CallbackMetadata")
    receipt_number: str | None = None
    if isinstance(metadata, dict):
        metadata_dict = cast(dict[str, object], metadata)
        items = metadata_dict.get("Item")
        if isinstance(items, list):
            items_list = cast(list[object], items)
            for item in items_list:
                if not isinstance(item, dict):
                    continue
                item_dict = cast(dict[str, object], item)
                item_name = item_dict.get("Name")
                item_value = item_dict.get("Value")
                if item_name == "MpesaReceiptNumber" and isinstance(item_value, str):
                    receipt_number = item_value

    checkout_request_id = callback_dict.get("CheckoutRequestID")
    merchant_request_id = callback_dict.get("MerchantRequestID")
    result_code = callback_dict.get("ResultCode")
    result_desc = callback_dict.get("ResultDesc")
    if not isinstance(checkout_request_id, str) or not isinstance(merchant_request_id, str):
        return None
    if not isinstance(result_code, int) or not isinstance(result_desc, str):
        return None

    return StkCallback(
        checkout_request_id=checkout_request_id,
        merchant_request_id=merchant_request_id,
        result_code=result_code,
        result_desc=result_desc,
        mpesa_receipt_number=receipt_number,
    )


def build_stub_callback_payload(
    *,
    merchant_request_id: str,
    checkout_request_id: str,
    amount: Decimal,
    phone: str,
) -> dict[str, object]:
    receipt = f"STUB{sha256(f'{checkout_request_id}:{phone}'.encode()).hexdigest()[:10].upper()}"
    return {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": merchant_request_id,
                "CheckoutRequestID": checkout_request_id,
                "ResultCode": 0,
                "ResultDesc": "The service request is processed successfully.",
                "CallbackMetadata": {
                    "Item": [
                        {"Name": "Amount", "Value": float(amount)},
                        {"Name": "MpesaReceiptNumber", "Value": receipt},
                        {"Name": "PhoneNumber", "Value": phone},
                    ]
                },
            }
        }
    }


def extract_b2c_callback(payload: dict[str, object]) -> B2CCallback | None:
    result = payload.get("Result")
    if not isinstance(result, dict):
        return None

    result_dict = cast(dict[str, object], result)
    conversation_id = result_dict.get("ConversationID")
    originator_conversation_id = result_dict.get("OriginatorConversationID")
    result_code = result_dict.get("ResultCode")
    result_desc = result_dict.get("ResultDesc")
    receipt_number: str | None = None

    result_parameters = result_dict.get("ResultParameters")
    if isinstance(result_parameters, dict):
        params_dict = cast(dict[str, object], result_parameters)
        params = params_dict.get("ResultParameter")
        if isinstance(params, list):
            params_list = cast(list[object], params)
            for item in params_list:
                if not isinstance(item, dict):
                    continue
                item_dict = cast(dict[str, object], item)
                item_key = item_dict.get("Key")
                item_value = item_dict.get("Value")
                if item_key == "TransactionReceipt" and isinstance(item_value, str):
                    receipt_number = item_value

    if not isinstance(conversation_id, str) or not isinstance(originator_conversation_id, str):
        return None
    if not isinstance(result_code, int) or not isinstance(result_desc, str):
        return None

    return B2CCallback(
        conversation_id=conversation_id,
        originator_conversation_id=originator_conversation_id,
        result_code=result_code,
        result_desc=result_desc,
        mpesa_receipt_number=receipt_number,
    )


def build_stub_b2c_callback_payload(
    *,
    conversation_id: str,
    originator_conversation_id: str,
    amount: Decimal,
    phone: str,
) -> dict[str, object]:
    receipt = f"B2C{sha256(f'{conversation_id}:{phone}'.encode()).hexdigest()[:10].upper()}"
    return {
        "Result": {
            "ConversationID": conversation_id,
            "OriginatorConversationID": originator_conversation_id,
            "ResultCode": 0,
            "ResultDesc": "The service request is processed successfully.",
            "ResultParameters": {
                "ResultParameter": [
                    {"Key": "TransactionAmount", "Value": float(amount)},
                    {"Key": "TransactionReceipt", "Value": receipt},
                    {"Key": "ReceiverPartyPublicName", "Value": phone},
                ]
            },
        }
    }
