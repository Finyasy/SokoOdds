from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from app.integrations.daraja import DarajaConfigurationError
from app.jobs.payment_followups import run_payment_followup_batch
from app.models import Base, Deposit, OutboxEvent, Wallet, Withdrawal
from app.services.account_access import AccountAccessService, daraja_client
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, expire_on_commit=False)
    yield factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_payment_followup_batch_dispatches_deposit_outbox_event(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async with session_factory() as session:
        service = AccountAccessService(
            session=session,
            session_ttl=timedelta(days=30),
            verification_credit_amount=Decimal("5.00"),
        )
        onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
        await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")
        result = await service.initiate_wallet_deposit(
            user_id=onboarded.account.user_id,
            amount=Decimal("500.00"),
        )

    assert result.status == "created"

    processed = await run_payment_followup_batch(session_factory=session_factory)

    async with session_factory() as session:
        deposit = await session.scalar(select(Deposit))
        wallet = await session.scalar(select(Wallet))
        outbox_events = (
            await session.execute(select(OutboxEvent).order_by(OutboxEvent.created_at.asc()))
        ).scalars().all()

    assert processed == 1
    assert deposit is not None and deposit.status == "completed"
    assert wallet is not None and wallet.available_balance == Decimal("505.00")
    assert outbox_events[0].topic == "wallet.deposit.dispatch_requested"
    assert outbox_events[0].status == "completed"


@pytest.mark.asyncio
async def test_payment_followup_batch_dispatches_withdrawal_outbox_event(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async with session_factory() as session:
        service = AccountAccessService(
            session=session,
            session_ttl=timedelta(days=30),
            verification_credit_amount=Decimal("5.00"),
        )
        onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
        await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")
        await service.initiate_wallet_deposit(
            user_id=onboarded.account.user_id,
            amount=Decimal("500.00"),
        )

    await run_payment_followup_batch(session_factory=session_factory)

    async with session_factory() as session:
        service = AccountAccessService(
            session=session,
            session_ttl=timedelta(days=30),
            verification_credit_amount=Decimal("5.00"),
        )
        result = await service.initiate_wallet_withdrawal(
            user_id=onboarded.account.user_id,
            amount=Decimal("200.00"),
        )

    assert result.status == "created"

    processed = await run_payment_followup_batch(session_factory=session_factory)

    async with session_factory() as session:
        withdrawal = await session.scalar(select(Withdrawal))
        wallet = await session.scalar(select(Wallet))
        outbox_events = (
            await session.execute(select(OutboxEvent).order_by(OutboxEvent.created_at.asc()))
        ).scalars().all()

    assert processed == 1
    assert withdrawal is not None and withdrawal.status == "completed"
    assert wallet is not None
    assert wallet.available_balance == Decimal("305.00")
    assert wallet.reserved_balance == Decimal("0.00")
    assert outbox_events[-1].topic == "wallet.withdrawal.dispatch_requested"
    assert outbox_events[-1].status == "completed"


@pytest.mark.asyncio
async def test_payment_followup_batch_retries_failed_deposit_event_after_backoff(
    session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    original_request_stk_push = daraja_client.request_stk_push

    async def fail_stk_push(*, phone: str, amount: str, account_reference: str):
        del phone, amount, account_reference
        raise DarajaConfigurationError("Missing Daraja credentials.")

    monkeypatch.setattr(daraja_client, "request_stk_push", fail_stk_push)

    async with session_factory() as session:
        service = AccountAccessService(
            session=session,
            session_ttl=timedelta(days=30),
            verification_credit_amount=Decimal("5.00"),
        )
        onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
        await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")
        await service.initiate_wallet_deposit(
            user_id=onboarded.account.user_id,
            amount=Decimal("500.00"),
        )

    processed = await run_payment_followup_batch(session_factory=session_factory)
    assert processed == 0

    async with session_factory() as session:
        event = await session.scalar(select(OutboxEvent).where(OutboxEvent.aggregate_type == "deposit"))
        assert event is not None
        payload = dict(event.payload)
        payload["nextAttemptAt"] = (datetime.now(UTC) - timedelta(minutes=1)).isoformat()
        event.payload = payload
        await session.commit()

    monkeypatch.setattr(daraja_client, "request_stk_push", original_request_stk_push)

    processed = await run_payment_followup_batch(session_factory=session_factory)

    async with session_factory() as session:
        deposit = await session.scalar(select(Deposit))
        wallet = await session.scalar(select(Wallet))
        event = await session.scalar(select(OutboxEvent).where(OutboxEvent.aggregate_type == "deposit"))

    assert processed == 1
    assert deposit is not None and deposit.status == "completed"
    assert wallet is not None and wallet.available_balance == Decimal("505.00")
    assert event is not None and event.status == "completed"
