from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from app.jobs.trade_results import consume_trade_result_batch
from app.models import Base, EngineState, Market, Order, Position, Trade, Wallet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


class FakeRedis:
    def __init__(self, records: list[tuple[str, list[tuple[str, dict[str, str]]]]]) -> None:
        self.records = records

    async def xread(
        self,
        streams: dict[str, str],
        *,
        count: int,
        block: int,
    ) -> list[tuple[str, list[tuple[str, dict[str, str]]]]]:
        del streams, count, block
        return self.records


@pytest_asyncio.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        session.add_all(
            [
                Wallet(
                    user_id="buyer-1",
                    currency="KES",
                    available_balance=Decimal("95.00"),
                    reserved_balance=Decimal("5.00"),
                ),
                Wallet(
                    user_id="seller-1",
                    currency="KES",
                    available_balance=Decimal("94.00"),
                    reserved_balance=Decimal("6.00"),
                ),
                Market(
                    id="market-1",
                    slug="market-1",
                    sort_order=1,
                    category="Politics",
                    status="Open",
                    question="Will this test market resolve?",
                    short_label="Test market",
                    summary="Test market.",
                    region="Kenya",
                    yes_price=Decimal("0.6000"),
                    no_price=Decimal("0.4000"),
                    volume_kes=Decimal("100.00"),
                    liquidity_kes=Decimal("50.00"),
                    closes_at=datetime.now(UTC) + timedelta(days=1),
                    resolution_source="Test source",
                    rule_highlights=["Rule"],
                    trust_notes=["Trust"],
                    order_book={"yesBids": [], "noBids": []},
                    trades=[],
                ),
                Order(
                    id="buy-order-1",
                    user_id="buyer-1",
                    market_id="market-1",
                    side="YES",
                    direction="BUY",
                    price=Decimal("0.5000"),
                    quantity=Decimal("10.00"),
                    filled_quantity=Decimal("0.00"),
                    reserved_amount=Decimal("5.00"),
                    status="submitted",
                    idempotency_key="buy-1",
                ),
                Order(
                    id="sell-order-1",
                    user_id="seller-1",
                    market_id="market-1",
                    side="YES",
                    direction="SELL",
                    price=Decimal("0.5000"),
                    quantity=Decimal("10.00"),
                    filled_quantity=Decimal("0.00"),
                    reserved_amount=Decimal("5.00"),
                    status="submitted",
                    idempotency_key="sell-1",
                ),
                Position(
                    id="position-1",
                    user_id="seller-1",
                    market_id="market-1",
                    side="YES",
                    shares=Decimal("10.00"),
                    average_entry_price=Decimal("0.4000"),
                    realized_pnl=Decimal("0.00"),
                ),
            ]
        )
        await session.commit()
    yield factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_trade_result_worker_consumes_and_persists_trade(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    redis_client = FakeRedis(
        [
            (
                "trades",
                [
                    ("1711702800001-0", {"type": "heartbeat"}),
                    (
                        "1711702800002-0",
                        {
                            "type": "trade.executed",
                            "trade_id": "trade-1",
                            "market_id": "market-1",
                            "buyer_id": "buyer-1",
                            "seller_id": "seller-1",
                            "side": "YES",
                            "price": "0.5000",
                            "quantity": "10.00",
                            "engine_sequence": "11",
                            "executed_at": "2026-03-29T09:00:00Z",
                        },
                    ),
                ],
            )
        ]
    )

    processed = await consume_trade_result_batch(
        redis_client=redis_client,
        session_factory=session_factory,
        stream="trades",
        cursor_key="worker:trade-results:trades",
        batch_size=10,
        block_ms=1,
    )

    async with session_factory() as session:
        trade = await session.scalar(select(Trade).where(Trade.id == "trade-1"))
        cursor = await session.scalar(
            select(EngineState).where(EngineState.key == "worker:trade-results:trades")
        )

    assert processed == 1
    assert trade is not None
    assert cursor is not None
    assert cursor.value == "1711702800002-0"
