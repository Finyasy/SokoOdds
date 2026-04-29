from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any
from uuid import uuid4

from app.models import EngineState, LedgerEntry, Market, Order, Position, Trade, Wallet
from app.services.account_access import ACTIVE_ORDER_STATUSES
from app.services.order_intake import quantize_money
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

PRICE_PLACES = Decimal("0.0001")
PRICE_MONEY_UNIT = Decimal("1.00")


class TradeResultError(Exception):
    pass


@dataclass(frozen=True)
class TradeExecutedEvent:
    trade_id: str
    market_id: str
    buyer_id: str
    seller_id: str
    side: str
    price: Decimal
    quantity: Decimal
    engine_sequence: int | None
    executed_at: datetime

    @property
    def notional_amount(self) -> Decimal:
        return quantize_money(self.price * self.quantity)

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> TradeExecutedEvent:
        try:
            executed_at_raw = str(payload["executed_at"])
            executed_at = datetime.fromisoformat(executed_at_raw.replace("Z", "+00:00"))
            if executed_at.tzinfo is None:
                executed_at = executed_at.replace(tzinfo=UTC)
            return cls(
                trade_id=str(payload["trade_id"]),
                market_id=str(payload["market_id"]),
                buyer_id=str(payload["buyer_id"]),
                seller_id=str(payload["seller_id"]),
                side=str(payload["side"]).upper(),
                price=Decimal(str(payload["price"])),
                quantity=Decimal(str(payload["quantity"])),
                engine_sequence=(
                    int(payload["engine_sequence"])
                    if payload.get("engine_sequence") is not None
                    else None
                ),
                executed_at=executed_at,
            )
        except (KeyError, ValueError, ArithmeticError) as exc:
            raise TradeResultError("Invalid trade.executed payload.") from exc


def quantize_price(value: Decimal) -> Decimal:
    return value.quantize(PRICE_PLACES, rounding=ROUND_HALF_UP)


async def get_engine_state_value(session: AsyncSession, *, key: str) -> str | None:
    result = await session.execute(select(EngineState).where(EngineState.key == key))
    state = result.scalar_one_or_none()
    return state.value if state is not None else None


async def set_engine_state_value(session: AsyncSession, *, key: str, value: str) -> None:
    async with session.begin():
        await _upsert_engine_state(session, key=key, value=value)


async def apply_trade_executed(
    session: AsyncSession,
    *,
    payload: dict[str, Any],
    cursor_key: str | None = None,
    cursor_value: str | None = None,
) -> bool:
    event = TradeExecutedEvent.from_payload(payload)

    async with session.begin():
        existing_trade = await _get_existing_trade(session, event=event)
        if existing_trade is not None:
            if cursor_key is not None and cursor_value is not None:
                await _upsert_engine_state(session, key=cursor_key, value=cursor_value)
            return False

        market = await _get_market_for_update(session, market_id=event.market_id)
        if market is None:
            raise TradeResultError("Trade result referenced an unknown market.")

        buyer_order = await _get_matching_order_for_update(
            session,
            user_id=event.buyer_id,
            market_id=event.market_id,
            side=event.side,
            direction="BUY",
        )
        seller_order = await _get_matching_order_for_update(
            session,
            user_id=event.seller_id,
            market_id=event.market_id,
            side=event.side,
            direction="SELL",
        )
        if buyer_order is None or seller_order is None:
            raise TradeResultError("Trade result could not be matched to active orders.")

        buyer_wallet = await _get_wallet_for_update(session, user_id=event.buyer_id)
        seller_wallet = await _get_wallet_for_update(session, user_id=event.seller_id)

        notional_amount = event.notional_amount
        buyer_wallet.reserved_balance = quantize_money(
            buyer_wallet.reserved_balance - notional_amount
        )
        if buyer_wallet.reserved_balance < Decimal("0.00"):
            raise TradeResultError("Buyer reserved balance would become negative.")

        seller_had_cash_reserve = seller_order.reserved_amount > Decimal("0.00")
        if seller_had_cash_reserve:
            seller_wallet.reserved_balance = quantize_money(
                seller_wallet.reserved_balance - notional_amount
            )
            if seller_wallet.reserved_balance < Decimal("0.00"):
                raise TradeResultError("Seller reserved balance would become negative.")
            seller_wallet.available_balance = quantize_money(
                seller_wallet.available_balance + notional_amount + notional_amount
            )
        else:
            seller_wallet.available_balance = quantize_money(
                seller_wallet.available_balance + notional_amount
            )

        _apply_fill_to_order(buyer_order, quantity=event.quantity, notional_amount=notional_amount)
        _apply_fill_to_order(seller_order, quantity=event.quantity, notional_amount=notional_amount)

        await _apply_buy_position(
            session,
            user_id=event.buyer_id,
            market_id=event.market_id,
            side=event.side,
            quantity=event.quantity,
            price=event.price,
        )
        await _apply_sell_position(
            session,
            user_id=event.seller_id,
            market_id=event.market_id,
            side=event.side,
            quantity=event.quantity,
            price=event.price,
        )

        session.add(
            Trade(
                id=event.trade_id,
                market_id=event.market_id,
                buyer_id=event.buyer_id,
                seller_id=event.seller_id,
                side=event.side,
                price=event.price,
                quantity=event.quantity,
                notional_amount=notional_amount,
                engine_sequence=event.engine_sequence,
                executed_at=event.executed_at,
            )
        )

        session.add(
            LedgerEntry(
                id=str(uuid4()),
                user_id=event.buyer_id,
                entry_type="TRADE_EXECUTION",
                amount=notional_amount,
                currency=buyer_wallet.currency,
                reference_type="trade",
                reference_id=event.trade_id,
                available_balance_after=buyer_wallet.available_balance,
                reserved_balance_after=buyer_wallet.reserved_balance,
                note=f"Reserved funds consumed for buy fill {event.trade_id}",
            )
        )
        if seller_had_cash_reserve:
            session.add(
                LedgerEntry(
                    id=str(uuid4()),
                    user_id=event.seller_id,
                    entry_type="ORDER_RESERVE_RELEASE",
                    amount=notional_amount,
                    currency=seller_wallet.currency,
                    reference_type="trade",
                    reference_id=event.trade_id,
                    available_balance_after=quantize_money(
                        seller_wallet.available_balance - notional_amount
                    ),
                    reserved_balance_after=seller_wallet.reserved_balance,
                    note=f"Released reserved funds for sell fill {event.trade_id}",
                )
            )
        session.add(
            LedgerEntry(
                id=str(uuid4()),
                user_id=event.seller_id,
                entry_type="TRADE_PROCEEDS",
                amount=notional_amount,
                currency=seller_wallet.currency,
                reference_type="trade",
                reference_id=event.trade_id,
                available_balance_after=seller_wallet.available_balance,
                reserved_balance_after=seller_wallet.reserved_balance,
                note=f"Credited sell proceeds for trade {event.trade_id}",
            )
        )

        _apply_trade_to_market(market, event=event)

        if cursor_key is not None and cursor_value is not None:
            await _upsert_engine_state(session, key=cursor_key, value=cursor_value)

    return True


async def _get_existing_trade(session: AsyncSession, *, event: TradeExecutedEvent) -> Trade | None:
    if event.engine_sequence is not None:
        result = await session.execute(
            select(Trade).where(
                Trade.market_id == event.market_id,
                Trade.engine_sequence == event.engine_sequence,
            )
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            return existing

    result = await session.execute(select(Trade).where(Trade.id == event.trade_id))
    return result.scalar_one_or_none()


async def _get_market_for_update(session: AsyncSession, *, market_id: str) -> Market | None:
    result = await session.execute(select(Market).where(Market.id == market_id).with_for_update())
    return result.scalar_one_or_none()


async def _get_wallet_for_update(session: AsyncSession, *, user_id: str) -> Wallet:
    result = await session.execute(
        select(Wallet).where(Wallet.user_id == user_id).with_for_update()
    )
    wallet = result.scalar_one_or_none()
    if wallet is None:
        raise TradeResultError("Trade result referenced a wallet that does not exist.")
    return wallet


async def _get_matching_order_for_update(
    session: AsyncSession,
    *,
    user_id: str,
    market_id: str,
    side: str,
    direction: str,
) -> Order | None:
    result = await session.execute(
        select(Order)
        .where(
            Order.user_id == user_id,
            Order.market_id == market_id,
            Order.side == side,
            Order.direction == direction,
            Order.status.in_(tuple(ACTIVE_ORDER_STATUSES)),
        )
        .order_by(Order.created_at.asc())
        .with_for_update()
    )
    for order in result.scalars():
        if order.filled_quantity < order.quantity:
            return order
    return None


def _apply_fill_to_order(order: Order, *, quantity: Decimal, notional_amount: Decimal) -> None:
    updated_filled_quantity = quantize_money(order.filled_quantity + quantity)
    if updated_filled_quantity > quantize_money(order.quantity):
        raise TradeResultError("Trade quantity exceeds the remaining order quantity.")

    order.filled_quantity = updated_filled_quantity
    if order.reserved_amount > Decimal("0.00"):
        order.reserved_amount = quantize_money(order.reserved_amount - notional_amount)
        if order.reserved_amount < Decimal("0.00"):
            raise TradeResultError("Order reserved amount would become negative.")
    order.status = (
        "filled" if order.filled_quantity >= quantize_money(order.quantity) else "partially_filled"
    )


async def _apply_buy_position(
    session: AsyncSession,
    *,
    user_id: str,
    market_id: str,
    side: str,
    quantity: Decimal,
    price: Decimal,
) -> None:
    position = await _get_position_for_update(
        session, user_id=user_id, market_id=market_id, side=side, create_if_missing=True
    )
    assert position is not None
    existing_cost = position.shares * position.average_entry_price
    new_cost = quantity * price
    updated_shares = quantize_money(position.shares + quantity)
    total_cost = existing_cost + new_cost
    position.shares = updated_shares
    position.average_entry_price = (
        quantize_price(total_cost / updated_shares)
        if updated_shares > Decimal("0.00")
        else Decimal("0.0000")
    )


async def _apply_sell_position(
    session: AsyncSession,
    *,
    user_id: str,
    market_id: str,
    side: str,
    quantity: Decimal,
    price: Decimal,
) -> None:
    position = await _get_position_for_update(
        session, user_id=user_id, market_id=market_id, side=side, create_if_missing=True
    )
    assert position is not None
    shares_to_close = min(position.shares, quantity)
    realized_increment = quantize_money((price - position.average_entry_price) * shares_to_close)
    position.realized_pnl = quantize_money(position.realized_pnl + realized_increment)
    position.shares = quantize_money(position.shares - shares_to_close)
    if position.shares == Decimal("0.00"):
        position.average_entry_price = Decimal("0.0000")


async def _get_position_for_update(
    session: AsyncSession,
    *,
    user_id: str,
    market_id: str,
    side: str,
    create_if_missing: bool,
) -> Position | None:
    result = await session.execute(
        select(Position)
        .where(Position.user_id == user_id, Position.market_id == market_id, Position.side == side)
        .with_for_update()
    )
    position = result.scalar_one_or_none()
    if position is not None or not create_if_missing:
        return position

    position = Position(
        id=str(uuid4()),
        user_id=user_id,
        market_id=market_id,
        side=side,
        shares=Decimal("0.00"),
        average_entry_price=Decimal("0.0000"),
        realized_pnl=Decimal("0.00"),
    )
    session.add(position)
    await session.flush()
    return position


def _apply_trade_to_market(market: Market, *, event: TradeExecutedEvent) -> None:
    if event.side == "YES":
        market.yes_price = quantize_price(event.price)
        market.no_price = quantize_price(PRICE_MONEY_UNIT - event.price)
    else:
        market.no_price = quantize_price(event.price)
        market.yes_price = quantize_price(PRICE_MONEY_UNIT - event.price)
    market.volume_kes = quantize_money(market.volume_kes + event.notional_amount)

    next_trade = {
        "side": event.side,
        "price": f"{event.price:.4f}",
        "shares": f"{event.quantity:.2f}",
        "time": event.executed_at.isoformat(),
    }
    trades = [next_trade, *market.trades]
    market.trades = trades[:20]


async def _upsert_engine_state(session: AsyncSession, *, key: str, value: str) -> None:
    result = await session.execute(
        select(EngineState).where(EngineState.key == key).with_for_update()
    )
    state = result.scalar_one_or_none()
    if state is None:
        session.add(EngineState(key=key, value=value))
        return
    state.value = value
