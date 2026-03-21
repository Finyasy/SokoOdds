from __future__ import annotations

from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Annotated
from uuid import uuid4

from app.core.auth import (
    create_session_token,
    extract_bearer_token,
    hash_session_token,
    normalize_phone,
)
from app.core.config import settings
from app.core.database import get_async_session
from app.models import LedgerEntry, User, UserSession, Wallet
from app.schemas.account import AccountSnapshotResponse, AccountUserResponse, WalletResponse
from app.services.order_intake import quantize_money
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

AsyncSessionDep = Annotated[AsyncSession, Depends(get_async_session)]
AuthorizationHeader = Annotated[str | None, Header(alias="Authorization")]


class AuthenticationError(Exception):
    pass


class WalletFundingError(Exception):
    pass


@dataclass(frozen=True)
class AccountSnapshot:
    user_id: str
    first_name: str
    phone: str
    mpesa_phone: str | None
    mpesa_verified: bool
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
    credited_amount: Decimal
    account: AccountSnapshot


def snapshot_from_models(user: User, wallet: Wallet) -> AccountSnapshot:
    return AccountSnapshot(
        user_id=user.id,
        first_name=user.first_name,
        phone=user.phone,
        mpesa_phone=user.mpesa_phone,
        mpesa_verified=user.mpesa_verified_at is not None,
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
        amount_to_credit = quantize_money(amount)
        if amount_to_credit <= Decimal("0.00"):
            raise WalletFundingError("Deposit amount must be greater than zero.")

        async with self._transaction():
            user = await self._get_user_for_update(user_id)
            if user is None:
                raise AuthenticationError("Authenticated user was not found.")
            if user.mpesa_verified_at is None or user.mpesa_phone is None:
                raise WalletFundingError("Verify your M-Pesa wallet before topping up.")

            wallet = await self._get_or_create_wallet_for_update(user.id)
            wallet.available_balance = quantize_money(wallet.available_balance + amount_to_credit)
            deposit_reference = f"mpesa-topup-{uuid4()}"

            self.session.add(
                LedgerEntry(
                    id=str(uuid4()),
                    user_id=user.id,
                    entry_type="MPESA_DEPOSIT",
                    amount=amount_to_credit,
                    currency=wallet.currency,
                    reference_type="deposit",
                    reference_id=deposit_reference,
                    available_balance_after=wallet.available_balance,
                    reserved_balance_after=wallet.reserved_balance,
                    note=f"Demo M-Pesa top-up credited to {user.mpesa_phone}",
                )
            )

        return WalletDepositResult(
            status="initiated",
            deposit_reference=deposit_reference,
            credited_amount=amount_to_credit,
            account=snapshot_from_models(user, wallet),
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
