from __future__ import annotations

from datetime import datetime
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models import Base, IdempotencyKey, LedgerEntry, Market, OutboxEvent, Wallet
from app.schemas.orders import OrderCreateRequest
from app.services.order_intake import IdempotencyConflictError, OrderIntakeService


@pytest_asyncio.fixture
async def async_session() -> AsyncSession:
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
