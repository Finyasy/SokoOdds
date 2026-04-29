from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import datetime
from decimal import Decimal

import pytest
import pytest_asyncio
from app.models import Base, IdempotencyKey, LedgerEntry, Market, Order, OutboxEvent, Position, Wallet
from app.schemas.orders import OrderCreateRequest
from app.services.order_intake import (
    IdempotencyConflictError,
    InsufficientPositionError,
    OrderIntakeService,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def async_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        async with session.begin():
            session.add(
                Market(
                    id="market-123",
                    slug="market-123",
                    sort_order=1,
                    category="Politics",
                    status="Open",
                    question="Will the market exist for testing?",
                    short_label="Test market",
                    summary="Testing market seed.",
                    region="Test Region",
                    yes_price=Decimal("0.65"),
                    no_price=Decimal("0.35"),
                    volume_kes=Decimal("0.00"),
                    liquidity_kes=Decimal("0.00"),
                    closes_at=datetime.fromisoformat("2026-06-30T18:00:00+03:00"),
                    resolution_source="Test source",
                    rule_highlights=["Rule one"],
                    trust_notes=["Trust note"],
                    order_book={"yesBids": [], "noBids": []},
                    trades=[],
                )
            )
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_order_intake_creates_wallet_ledger_outbox_and_idempotency(
    async_session: AsyncSession,
) -> None:
    service = OrderIntakeService(async_session, default_wallet_balance=Decimal("25000.00"))
    request = OrderCreateRequest(
        market_id="market-123",
        side="YES",
        direction="BUY",
        price=Decimal("0.65"),
        quantity=Decimal("100"),
    )

    created = await service.submit_order(
        user_id="demo-user",
        route="/api/v1/orders",
        idempotency_key="abc-123",
        order_request=request,
    )
    replayed = await service.submit_order(
        user_id="demo-user",
        route="/api/v1/orders",
        idempotency_key="abc-123",
        order_request=request,
    )

    wallet = await async_session.scalar(select(Wallet).where(Wallet.user_id == "demo-user"))
    outbox_count = await async_session.scalar(select(func.count()).select_from(OutboxEvent))
    ledger_count = await async_session.scalar(select(func.count()).select_from(LedgerEntry))
    idempotency_count = await async_session.scalar(select(func.count()).select_from(IdempotencyKey))

    assert created.idempotency_status == "created"
    assert replayed.idempotency_status == "replayed"
    assert created.response_body == replayed.response_body
    assert wallet is not None
    assert wallet.available_balance == Decimal("24935.00")
    assert wallet.reserved_balance == Decimal("65.00")
    assert outbox_count == 1
    assert ledger_count == 1
    assert idempotency_count == 1


@pytest.mark.asyncio
async def test_order_intake_rejects_same_key_with_different_payload(
    async_session: AsyncSession,
) -> None:
    service = OrderIntakeService(async_session, default_wallet_balance=Decimal("25000.00"))
    first_request = OrderCreateRequest(
        market_id="market-123",
        side="YES",
        direction="BUY",
        price=Decimal("0.65"),
        quantity=Decimal("100"),
    )
    second_request = OrderCreateRequest(
        market_id="market-123",
        side="YES",
        direction="BUY",
        price=Decimal("0.64"),
        quantity=Decimal("100"),
    )

    await service.submit_order(
        user_id="demo-user",
        route="/api/v1/orders",
        idempotency_key="abc-456",
        order_request=first_request,
    )

    with pytest.raises(IdempotencyConflictError):
        await service.submit_order(
            user_id="demo-user",
            route="/api/v1/orders",
            idempotency_key="abc-456",
            order_request=second_request,
        )


@pytest.mark.asyncio
async def test_order_intake_creates_position_backed_sell_without_reserving_cash(
    async_session: AsyncSession,
) -> None:
    async with async_session.begin():
        async_session.add_all(
            [
                Wallet(
                    user_id="seller-user",
                    currency="KES",
                    available_balance=Decimal("250.00"),
                    reserved_balance=Decimal("10.00"),
                ),
                Position(
                    id="position-1",
                    user_id="seller-user",
                    market_id="market-123",
                    side="YES",
                    shares=Decimal("12.00"),
                    average_entry_price=Decimal("0.40"),
                    realized_pnl=Decimal("0.00"),
                ),
            ]
        )

    service = OrderIntakeService(async_session, default_wallet_balance=Decimal("25000.00"))
    request = OrderCreateRequest(
        market_id="market-123",
        side="YES",
        direction="SELL",
        price=Decimal("0.65"),
        quantity=Decimal("10"),
    )

    created = await service.submit_order(
        user_id="seller-user",
        route="/api/v1/orders",
        idempotency_key="sell-123",
        order_request=request,
    )

    wallet = await async_session.scalar(select(Wallet).where(Wallet.user_id == "seller-user"))
    order = await async_session.scalar(select(Order).where(Order.user_id == "seller-user"))
    outbox_count = await async_session.scalar(select(func.count()).select_from(OutboxEvent))
    ledger_count = await async_session.scalar(select(func.count()).select_from(LedgerEntry))

    assert created.idempotency_status == "created"
    assert created.response_body["reserved_amount"] == "0.00"
    assert wallet is not None
    assert wallet.available_balance == Decimal("250.00")
    assert wallet.reserved_balance == Decimal("10.00")
    assert order is not None
    assert order.direction == "SELL"
    assert order.reserved_amount == Decimal("0.00")
    assert outbox_count == 1
    assert ledger_count == 0


@pytest.mark.asyncio
async def test_order_intake_rejects_sell_when_available_position_is_already_committed(
    async_session: AsyncSession,
) -> None:
    async with async_session.begin():
        async_session.add_all(
            [
                Position(
                    id="position-2",
                    user_id="seller-user",
                    market_id="market-123",
                    side="YES",
                    shares=Decimal("10.00"),
                    average_entry_price=Decimal("0.40"),
                    realized_pnl=Decimal("0.00"),
                ),
                Order(
                    id="sell-order-1",
                    user_id="seller-user",
                    market_id="market-123",
                    side="YES",
                    direction="SELL",
                    price=Decimal("0.65"),
                    quantity=Decimal("8.00"),
                    filled_quantity=Decimal("0.00"),
                    reserved_amount=Decimal("0.00"),
                    status="submitted",
                    idempotency_key="existing-sell",
                ),
            ]
        )

    service = OrderIntakeService(async_session, default_wallet_balance=Decimal("25000.00"))
    request = OrderCreateRequest(
        market_id="market-123",
        side="YES",
        direction="SELL",
        price=Decimal("0.65"),
        quantity=Decimal("3"),
    )

    with pytest.raises(InsufficientPositionError):
        await service.submit_order(
            user_id="seller-user",
            route="/api/v1/orders",
            idempotency_key="sell-456",
            order_request=request,
        )
