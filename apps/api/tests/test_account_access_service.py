from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from app.models import Base, Deposit, KycProfile, LedgerEntry, User, UserSession, Wallet, Withdrawal
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


@pytest.mark.asyncio
async def test_wallet_withdrawal_holds_and_completes_for_verified_wallet(
    async_session: AsyncSession,
) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")
    await service.initiate_wallet_deposit(
        user_id=onboarded.account.user_id,
        amount=Decimal("500.00"),
    )

    result = await service.initiate_wallet_withdrawal(
        user_id=onboarded.account.user_id,
        amount=Decimal("200.00"),
    )
    withdrawal = await async_session.scalar(
        select(Withdrawal).where(Withdrawal.user_id == onboarded.account.user_id)
    )
    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == onboarded.account.user_id)
    )

    assert result.status == "completed"
    assert result.released_amount == Decimal("200.00")
    assert withdrawal is not None
    assert withdrawal.status == "completed"
    assert wallet is not None
    assert wallet.available_balance == Decimal("305.00")
    assert wallet.reserved_balance == Decimal("0.00")


@pytest.mark.asyncio
async def test_large_wallet_withdrawal_enters_review_required(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")
    await service.initiate_wallet_deposit(
        user_id=onboarded.account.user_id,
        amount=Decimal("3000.00"),
    )

    result = await service.initiate_wallet_withdrawal(
        user_id=onboarded.account.user_id,
        amount=Decimal("2600.00"),
    )
    withdrawal = await async_session.scalar(
        select(Withdrawal).where(Withdrawal.user_id == onboarded.account.user_id)
    )
    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == onboarded.account.user_id)
    )

    assert result.status == "review_required"
    assert result.released_amount == Decimal("0.00")
    assert withdrawal is not None
    assert withdrawal.requires_review is True
    assert wallet is not None
    assert wallet.available_balance == Decimal("405.00")
    assert wallet.reserved_balance == Decimal("2600.00")


@pytest.mark.asyncio
async def test_wallet_transactions_feed_includes_verification_deposit_and_withdrawal(
    async_session: AsyncSession,
) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")
    await service.initiate_wallet_deposit(
        user_id=onboarded.account.user_id,
        amount=Decimal("500.00"),
    )
    await service.initiate_wallet_withdrawal(
        user_id=onboarded.account.user_id,
        amount=Decimal("200.00"),
    )

    result = await service.get_wallet_transactions(user_id=onboarded.account.user_id)

    assert result.account.wallet.availableBalanceKes == "305.00"
    assert [item.kind for item in result.items[:3]] == [
        "withdrawal",
        "deposit",
        "verification",
    ]
    assert result.items[0].status == "completed"
    assert result.items[1].amountKes == "500.00"
    assert result.items[2].title == "M-Pesa wallet verified"


@pytest.mark.asyncio
async def test_kyc_submission_marks_user_pending(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    result = await service.submit_kyc_profile(
        user_id=onboarded.account.user_id,
        legal_name="Amina Wanjiru",
        national_id_number="12345678",
        date_of_birth="1996-08-14",
        document_reference="https://example.com/id.pdf",
    )

    user = await async_session.scalar(select(User).where(User.id == onboarded.account.user_id))
    profile = await async_session.scalar(
        select(KycProfile).where(KycProfile.user_id == onboarded.account.user_id)
    )

    assert result.status == "pending"
    assert result.account.user.kycStatus == "pending"
    assert user is not None and user.kyc_status == "pending"
    assert profile is not None and profile.status == "pending"
    assert result.profile.nationalIdNumberMasked == "****5678"


@pytest.mark.asyncio
async def test_admin_can_approve_pending_kyc(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    admin = await service.onboard_account(first_name="Admin", phone="0712 345 678")
    applicant = await service.onboard_account(first_name="Amina", phone="0796 000 000")
    await service.submit_kyc_profile(
        user_id=applicant.account.user_id,
        legal_name="Amina Wanjiru",
        national_id_number="12345678",
        date_of_birth="1996-08-14",
        document_reference="https://example.com/id.pdf",
    )

    queue = await service.list_kyc_queue(
        admin_user_id=admin.account.user_id,
        status_filter="pending",
    )
    result = await service.review_kyc_profile(
        admin_user_id=admin.account.user_id,
        target_user_id=applicant.account.user_id,
        decision="approved",
        rejection_reason=None,
    )

    assert queue.items[0].status == "pending"
    assert result.status == "approved"
    assert result.account.user.kycStatus == "approved"
