from __future__ import annotations

from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any
from uuid import uuid4

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.idempotency import make_request_hash
from app.models import IdempotencyKey, LedgerEntry, Market, Order, OutboxEvent, Wallet
from app.schemas.orders import OrderCreateRequest

MONEY_PLACES = Decimal("0.01")
ORDER_IDEMPOTENCY_TTL = timedelta(hours=24)


class IdempotencyConflictError(Exception):
    pass


class InsufficientFundsError(Exception):
    pass


class UnknownMarketError(Exception):
    pass


class MarketNotTradableError(Exception):
    pass


@dataclass(frozen=True)
class OrderSubmissionResult:
    status_code: int
    response_body: dict[str, Any]
    idempotency_status: str


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_PLACES, rounding=ROUND_HALF_UP)


class OrderIntakeService:
    def __init__(self, session: AsyncSession, default_wallet_balance: Decimal) -> None:
        self.session = session
        self.default_wallet_balance = quantize_money(default_wallet_balance)

    async def submit_order(
        self,
        *,
        user_id: str,
        route: str,
        idempotency_key: str,
        order_request: OrderCreateRequest,
    ) -> OrderSubmissionResult:
        request_hash = make_request_hash(order_request.model_dump(mode="json"))

        try:
            return await self._submit_order_transaction(
                user_id=user_id,
                route=route,
                idempotency_key=idempotency_key,
                request_hash=request_hash,
                order_request=order_request,
            )
        except IntegrityError:
            await self.session.rollback()
            return await self._replay_after_conflict(
                user_id=user_id,
                route=route,
                idempotency_key=idempotency_key,
                request_hash=request_hash,
            )

    async def _submit_order_transaction(
        self,
        *,
        user_id: str,
        route: str,
        idempotency_key: str,
        request_hash: str,
        order_request: OrderCreateRequest,
    ) -> OrderSubmissionResult:
        async with self._transaction():
            existing_record = await self._get_idempotency_record(
                user_id=user_id,
                route=route,
                idempotency_key=idempotency_key,
            )

            if existing_record:
                return self._handle_existing_idempotency(existing_record, request_hash)

            market = await self._get_market(order_request.market_id)
            if not market:
                raise UnknownMarketError("Market not found.")
            if market.status not in {"Open", "Closing Soon"}:
                raise MarketNotTradableError("This market is not accepting new orders.")

            wallet = await self._get_or_create_wallet_for_update(user_id)
            reserved_amount = quantize_money(order_request.price * order_request.quantity)

            if wallet.available_balance < reserved_amount:
                raise InsufficientFundsError("Insufficient available balance for this order.")

            wallet.available_balance = quantize_money(wallet.available_balance - reserved_amount)
            wallet.reserved_balance = quantize_money(wallet.reserved_balance + reserved_amount)

            order_id = str(uuid4())
            response_body = {
                "order_id": order_id,
                "status": "submitted",
                "market_id": order_request.market_id,
                "reserved_amount": f"{reserved_amount:.2f}",
                "available_balance": f"{wallet.available_balance:.2f}",
                "reserved_balance": f"{wallet.reserved_balance:.2f}",
            }

            self.session.add(
                Order(
                    id=order_id,
                    user_id=user_id,
                    market_id=order_request.market_id,
                    side=order_request.side,
                    direction=order_request.direction,
                    price=order_request.price,
                    quantity=order_request.quantity,
                    reserved_amount=reserved_amount,
                    status="submitted",
                    idempotency_key=idempotency_key,
                )
            )
            self.session.add(
                LedgerEntry(
                    id=str(uuid4()),
                    user_id=user_id,
                    entry_type="ORDER_RESERVE",
                    amount=reserved_amount,
                    currency=wallet.currency,
                    reference_type="order",
                    reference_id=order_id,
                    available_balance_after=wallet.available_balance,
                    reserved_balance_after=wallet.reserved_balance,
                    note=f"Reserved funds for order {order_id}",
                )
            )
            self.session.add(
                OutboxEvent(
                    id=str(uuid4()),
                    topic="order.created",
                    aggregate_type="order",
                    aggregate_id=order_id,
                    payload={
                        "order_id": order_id,
                        "market_id": order_request.market_id,
                        "user_id": user_id,
                        "side": order_request.side,
                        "direction": order_request.direction,
                        "price": str(order_request.price),
                        "quantity": str(order_request.quantity),
                        "reserved_amount": f"{reserved_amount:.2f}",
                    },
                    status="pending",
                )
            )
            self.session.add(
                IdempotencyKey(
                    id=str(uuid4()),
                    user_id=user_id,
                    route=route,
                    idempotency_key=idempotency_key,
                    request_hash=request_hash,
                    response_status=202,
                    response_body=response_body,
                    expires_at=datetime.now(UTC) + ORDER_IDEMPOTENCY_TTL,
                )
            )

        return OrderSubmissionResult(
            status_code=202,
            response_body=response_body,
            idempotency_status="created",
        )

    async def _replay_after_conflict(
        self,
        *,
        user_id: str,
        route: str,
        idempotency_key: str,
        request_hash: str,
    ) -> OrderSubmissionResult:
        existing_record = await self._get_idempotency_record(
            user_id=user_id,
            route=route,
            idempotency_key=idempotency_key,
        )
        if not existing_record:
            raise RuntimeError("Idempotency conflict occurred but no durable record was found.")
        return self._handle_existing_idempotency(existing_record, request_hash)

    def _handle_existing_idempotency(
        self,
        existing_record: IdempotencyKey,
        request_hash: str,
    ) -> OrderSubmissionResult:
        if existing_record.request_hash != request_hash:
            raise IdempotencyConflictError(
                "This idempotency key was already used with a different payload."
            )

        return OrderSubmissionResult(
            status_code=existing_record.response_status,
            response_body=existing_record.response_body,
            idempotency_status="replayed",
        )

    async def _get_idempotency_record(
        self,
        *,
        user_id: str,
        route: str,
        idempotency_key: str,
    ) -> IdempotencyKey | None:
        result = await self.session.execute(
            select(IdempotencyKey).where(
                IdempotencyKey.user_id == user_id,
                IdempotencyKey.route == route,
                IdempotencyKey.idempotency_key == idempotency_key,
            )
        )
        return result.scalar_one_or_none()

    async def _get_or_create_wallet_for_update(self, user_id: str) -> Wallet:
        result = await self.session.execute(
            select(Wallet).where(Wallet.user_id == user_id).with_for_update()
        )
        wallet = result.scalar_one_or_none()
        if wallet:
            return wallet

        wallet = Wallet(
            user_id=user_id,
            currency="KES",
            available_balance=self.default_wallet_balance,
            reserved_balance=Decimal("0.00"),
        )
        self.session.add(wallet)
        await self.session.flush()
        return wallet

    async def _get_market(self, market_id: str) -> Market | None:
        result = await self.session.execute(select(Market).where(Market.id == market_id))
        return result.scalar_one_or_none()

    @asynccontextmanager
    async def _transaction(self):
        if self.session.in_transaction():
            yield
            await self.session.commit()
            return

        async with self.session.begin():
            yield


def get_order_intake_service(
    session: AsyncSession = Depends(get_async_session),
) -> OrderIntakeService:
    from app.core.config import settings

    return OrderIntakeService(
        session=session,
        default_wallet_balance=Decimal(settings.demo_user_default_wallet_balance),
    )
