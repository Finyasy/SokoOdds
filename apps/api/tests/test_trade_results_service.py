from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from app.models import Base, EngineState, Market, Order, Position, Trade, Wallet
from app.services.trade_results import apply_trade_executed
from sqlalchemy import select
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
async def test_apply_trade_executed_updates_orders_wallets_positions_and_market(
    async_session: AsyncSession,
) -> None:
    async_session.add_all(
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
                slug="election-market",
                sort_order=1,
                category="Politics",
                status="Open",
                question="Will this test market resolve?",
                short_label="Election market",
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
                quantity=Decimal("12.00"),
                filled_quantity=Decimal("0.00"),
                reserved_amount=Decimal("6.00"),
                status="submitted",
                idempotency_key="sell-1",
            ),
            Position(
                id="position-1",
                user_id="seller-1",
                market_id="market-1",
                side="YES",
                shares=Decimal("12.00"),
                average_entry_price=Decimal("0.4000"),
                realized_pnl=Decimal("0.00"),
            ),
        ]
    )
    await async_session.commit()

    created = await apply_trade_executed(
        async_session,
        payload={
            "trade_id": "trade-1",
            "market_id": "market-1",
            "buyer_id": "buyer-1",
            "seller_id": "seller-1",
            "side": "YES",
            "price": "0.5000",
            "quantity": "10.00",
            "engine_sequence": 7,
            "executed_at": "2026-03-29T09:00:00Z",
            "type": "trade.executed",
        },
        cursor_key="worker:trade-results:trades",
        cursor_value="1711702800000-0",
    )

    buyer_wallet = await async_session.scalar(select(Wallet).where(Wallet.user_id == "buyer-1"))
    seller_wallet = await async_session.scalar(select(Wallet).where(Wallet.user_id == "seller-1"))
    buyer_order = await async_session.scalar(select(Order).where(Order.id == "buy-order-1"))
    seller_order = await async_session.scalar(select(Order).where(Order.id == "sell-order-1"))
    buyer_position = await async_session.scalar(
        select(Position).where(
            Position.user_id == "buyer-1",
            Position.market_id == "market-1",
            Position.side == "YES",
        )
    )
    seller_position = await async_session.scalar(
        select(Position).where(
            Position.user_id == "seller-1",
            Position.market_id == "market-1",
            Position.side == "YES",
        )
    )
    market = await async_session.scalar(select(Market).where(Market.id == "market-1"))
    trade = await async_session.scalar(select(Trade).where(Trade.id == "trade-1"))
    cursor = await async_session.scalar(
        select(EngineState).where(EngineState.key == "worker:trade-results:trades")
    )

    assert created is True
    assert buyer_wallet is not None and buyer_wallet.reserved_balance == Decimal("0.00")
    assert seller_wallet is not None
    assert seller_wallet.available_balance == Decimal("104.00")
    assert seller_wallet.reserved_balance == Decimal("1.00")
    assert buyer_order is not None and buyer_order.status == "filled"
    assert buyer_order.reserved_amount == Decimal("0.00")
    assert seller_order is not None and seller_order.status == "partially_filled"
    assert seller_order.filled_quantity == Decimal("10.00")
    assert seller_order.reserved_amount == Decimal("1.00")
    assert buyer_position is not None and buyer_position.shares == Decimal("10.00")
    assert buyer_position.average_entry_price == Decimal("0.5000")
    assert seller_position is not None and seller_position.shares == Decimal("2.00")
    assert seller_position.realized_pnl == Decimal("1.00")
    assert market is not None and market.yes_price == Decimal("0.5000")
    assert market.no_price == Decimal("0.5000")
    assert market.volume_kes == Decimal("105.00")
    assert market.trades[0]["price"] == "0.5000"
    assert trade is not None and trade.notional_amount == Decimal("5.00")
    assert cursor is not None and cursor.value == "1711702800000-0"


@pytest.mark.asyncio
async def test_apply_trade_executed_is_idempotent_for_same_sequence(
    async_session: AsyncSession,
) -> None:
    async_session.add_all(
        [
            Wallet(
                user_id="buyer-1",
                currency="KES",
                available_balance=Decimal("9.50"),
                reserved_balance=Decimal("0.50"),
            ),
            Wallet(
                user_id="seller-1",
                currency="KES",
                available_balance=Decimal("9.50"),
                reserved_balance=Decimal("0.50"),
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
                yes_price=Decimal("0.5000"),
                no_price=Decimal("0.5000"),
                volume_kes=Decimal("0.00"),
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
                quantity=Decimal("1.00"),
                filled_quantity=Decimal("0.00"),
                reserved_amount=Decimal("0.50"),
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
                quantity=Decimal("1.00"),
                filled_quantity=Decimal("0.00"),
                reserved_amount=Decimal("0.50"),
                status="submitted",
                idempotency_key="sell-1",
            ),
        ]
    )
    await async_session.commit()

    payload = {
        "trade_id": "trade-1",
        "market_id": "market-1",
        "buyer_id": "buyer-1",
        "seller_id": "seller-1",
        "side": "YES",
        "price": "0.5000",
        "quantity": "1.00",
        "engine_sequence": 9,
        "executed_at": "2026-03-29T09:00:00Z",
    }

    first = await apply_trade_executed(async_session, payload=payload)
    second = await apply_trade_executed(async_session, payload=payload)
    trades = (await async_session.execute(select(Trade))).scalars().all()

    assert first is True
    assert second is False
    assert len(trades) == 1
