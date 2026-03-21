from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from app.models import Base, Deposit, LedgerEntry, User, UserSession, Wallet
from app.services.account_access import AccountAccessService
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def async_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_onboard_creates_user_wallet_and_session(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    result = await service.onboard_account(first_name="Bryan", phone="0796 851 024")
    account = await service.get_authenticated_account(result.session_token)

    user_count = await async_session.scalar(select(func.count()).select_from(User))
    session_count = await async_session.scalar(select(func.count()).select_from(UserSession))
    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == result.account.user_id)
    )

    assert result.account.first_name == "Bryan"
    assert result.account.phone == "0796851024"
    assert wallet is not None
    assert wallet.available_balance == Decimal("0.00")
    assert wallet.reserved_balance == Decimal("0.00")
    assert user_count == 1
    assert session_count == 1
    assert account is not None
    assert account.user.phone == "0796851024"


@pytest.mark.asyncio
async def test_mpesa_verification_credits_wallet_once(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")

    first = await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")
    second = await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")

    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == onboarded.account.user_id)
    )
    ledger_count = await async_session.scalar(select(func.count()).select_from(LedgerEntry))

    assert first.status == "verified"
    assert second.status == "already_verified"
    assert wallet is not None
    assert wallet.available_balance == Decimal("5.00")
    assert wallet.reserved_balance == Decimal("0.00")
    assert ledger_count == 1


@pytest.mark.asyncio
async def test_wallet_deposit_credits_verified_wallet(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")

    result = await service.initiate_wallet_deposit(
        user_id=onboarded.account.user_id,
        amount=Decimal("500.00"),
    )
    deposit = await async_session.scalar(
        select(Deposit).where(Deposit.user_id == onboarded.account.user_id)
    )
    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == onboarded.account.user_id)
    )
    ledger_count = await async_session.scalar(select(func.count()).select_from(LedgerEntry))

    assert result.status == "completed"
    assert result.requested_amount == Decimal("500.00")
    assert result.credited_amount == Decimal("500.00")
    assert deposit is not None
    assert deposit.status == "completed"
    assert wallet is not None
    assert wallet.available_balance == Decimal("505.00")
    assert ledger_count == 2
