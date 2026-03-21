from __future__ import annotations

from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from hashlib import sha256
from typing import Annotated, cast
from uuid import uuid4

from app.core.auth import (
    create_session_token,
    extract_bearer_token,
    hash_session_token,
    normalize_phone,
)
from app.core.config import settings
from app.core.database import get_async_session
from app.integrations.daraja import B2CPayoutResult, DarajaConfigurationError, daraja_client
from app.models import Deposit, KycProfile, LedgerEntry, User, UserSession, Wallet, Withdrawal
from app.schemas.account import (
    AccountSnapshotResponse,
    AccountUserResponse,
    AdminKycQueueItemResponse,
    AdminKycQueueResponse,
    AdminWalletSupportItemResponse,
    AdminWalletSupportResponse,
    KycProfileResponse,
    KycSubmissionResponse,
    WalletDepositStatusResponse,
    WalletResponse,
    WalletTransactionItemResponse,
    WalletTransactionsResponse,
    WalletWithdrawalStatusResponse,
)
from app.services.order_intake import quantize_money
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

AsyncSessionDep = Annotated[AsyncSession, Depends(get_async_session)]
AuthorizationHeader = Annotated[str | None, Header(alias="Authorization")]


class AuthenticationError(Exception):
    pass


class WalletFundingError(Exception):
    pass


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
class AccountSnapshot:
    user_id: str
    first_name: str
    phone: str
    mpesa_phone: str | None
    mpesa_verified: bool
    kyc_status: str
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


def snapshot_from_models(user: User, wallet: Wallet) -> AccountSnapshot:
    return AccountSnapshot(
        user_id=user.id,
        first_name=user.first_name,
        phone=user.phone,
        mpesa_phone=user.mpesa_phone,
        mpesa_verified=user.mpesa_verified_at is not None,
        kyc_status=user.kyc_status,
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
            try:
                stk_result = await daraja_client.request_stk_push(
                    phone=user.mpesa_phone,
                    amount=f"{requested_amount:.2f}",
                    account_reference=deposit_reference,
                )
            except DarajaConfigurationError as exc:
                raise WalletFundingError(str(exc)) from exc
            except Exception as exc:  # pragma: no cover
                raise WalletFundingError("Could not initiate the M-Pesa prompt.") from exc

            self.session.add(
                Deposit(
                    id=deposit_reference,
                    user_id=user.id,
                    phone=user.mpesa_phone,
                    amount=requested_amount,
                    currency="KES",
                    provider="daraja",
                    status="pending",
                    merchant_request_id=stk_result.merchant_request_id,
                    checkout_request_id=stk_result.checkout_request_id,
                    customer_message=stk_result.customer_message,
                    mpesa_receipt_number=None,
                    result_code=None,
                    result_desc=None,
                    callback_received_at=None,
                    credited_at=None,
                )
            )

        if settings.daraja_mode == "stub" and settings.daraja_stub_auto_complete:
            await self.process_stk_callback(
                callback_payload=build_stub_callback_payload(
                    merchant_request_id=stk_result.merchant_request_id,
                    checkout_request_id=stk_result.checkout_request_id,
                    amount=requested_amount,
                    phone=user.mpesa_phone,
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

            customer_message = (
                "Withdrawal queued for manual review."
                if requires_review
                else f"M-Pesa withdrawal initiated for {user.mpesa_phone}"
            )
            status = "review_required" if requires_review else "pending"
            payout_result: B2CPayoutResult | None = None

            if not requires_review:
                try:
                    payout_result = await daraja_client.request_b2c_payout(
                        phone=user.mpesa_phone,
                        amount=f"{requested_amount:.2f}",
                    )
                except DarajaConfigurationError as exc:
                    raise WalletFundingError(str(exc)) from exc
                except Exception as exc:  # pragma: no cover
                    raise WalletFundingError("Could not initiate the M-Pesa withdrawal.") from exc

                customer_message = payout_result.response_description

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
                    conversation_id=(
                        payout_result.conversation_id if payout_result is not None else None
                    ),
                    originator_conversation_id=(
                        payout_result.originator_conversation_id
                        if payout_result is not None
                        else None
                    ),
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

        if (
            settings.daraja_mode == "stub"
            and settings.daraja_stub_auto_complete
            and not requires_review
            and payout_result is not None
        ):
            await self.process_b2c_callback(
                callback_payload=build_stub_b2c_callback_payload(
                    conversation_id=payout_result.conversation_id,
                    originator_conversation_id=payout_result.originator_conversation_id,
                    amount=requested_amount,
                    phone=user.mpesa_phone,
                )
            )

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

        if kind_filter in (None, "all", "deposit"):
            deposit_query = select(Deposit, User).join(User, User.id == Deposit.user_id)
            if status_filter is not None and status_filter != "all":
                deposit_query = deposit_query.where(Deposit.status == status_filter)
            deposit_query = deposit_query.order_by(desc(Deposit.created_at)).limit(normalized_limit)
            deposits_result = await self.session.execute(deposit_query)
            items.extend(
                self._build_admin_deposit_support_item(deposit, user)
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
                self._build_admin_withdrawal_support_item(withdrawal, user)
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
                Withdrawal.status.in_(("pending", "review_required", "completed")),
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
        elif withdrawal.status == "review_required":
            subtitle = "Funds are reserved while the payout waits for manual review."
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
        self, deposit: Deposit, user: User
    ) -> AdminWalletSupportItem:
        if deposit.status == "completed":
            subtitle = f"Top-up confirmed for {deposit.phone}."
        elif deposit.status == "failed":
            subtitle = deposit.result_desc or "The M-Pesa prompt did not complete."
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
        )

    def _build_admin_withdrawal_support_item(
        self, withdrawal: Withdrawal, user: User
    ) -> AdminWalletSupportItem:
        if withdrawal.status == "completed":
            subtitle = f"Payout completed to {withdrawal.phone}."
        elif withdrawal.status == "review_required":
            subtitle = "Funds are reserved while this payout waits for manual review."
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
