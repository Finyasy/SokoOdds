from __future__ import annotations

import asyncio
import os
from datetime import UTC, datetime, timedelta

from app.core.database import get_session_factory
from app.models import OutboxEvent
from app.services.account_access import AccountAccessService, WalletFundingError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

PAYMENT_OUTBOX_TOPICS = (
    "wallet.deposit.dispatch_requested",
    "wallet.withdrawal.dispatch_requested",
)
PAYMENT_OUTBOX_BATCH_SIZE = int(os.getenv("WORKER_PAYMENT_OUTBOX_BATCH_SIZE", "20"))
PAYMENT_OUTBOX_MAX_ATTEMPTS = int(os.getenv("WORKER_PAYMENT_OUTBOX_MAX_ATTEMPTS", "3"))
PAYMENT_OUTBOX_RETRY_MINUTES = int(os.getenv("WORKER_PAYMENT_OUTBOX_RETRY_MINUTES", "5"))


async def claim_pending_payment_events(
    *,
    session_factory: async_sessionmaker[AsyncSession],
    batch_size: int = PAYMENT_OUTBOX_BATCH_SIZE,
) -> list[str]:
    async with session_factory() as session:
        async with session.begin():
            result = await session.execute(
                select(OutboxEvent)
                .where(
                    OutboxEvent.status.in_(("pending", "failed")),
                    OutboxEvent.topic.in_(PAYMENT_OUTBOX_TOPICS),
                )
                .order_by(OutboxEvent.created_at.asc())
                .limit(batch_size * 4)
                .with_for_update()
            )
            events = [event for event in result.scalars().all() if _should_claim_event(event)]
            events = events[:batch_size]
            for event in events:
                event.status = "processing"
        return [event.id for event in events]


async def process_payment_event(
    *,
    session_factory: async_sessionmaker[AsyncSession],
    event_id: str,
) -> bool:
    async with session_factory() as session:
        result = await session.execute(select(OutboxEvent).where(OutboxEvent.id == event_id))
        event = result.scalar_one_or_none()
        if event is None:
            return False

        service = AccountAccessService(
            session=session,
            session_ttl=service_session_ttl(),
            verification_credit_amount=service_verification_credit_amount(),
        )

        try:
            if event.topic == "wallet.deposit.dispatch_requested":
                processed = await service.dispatch_deposit_request(
                    deposit_reference=event.aggregate_id,
                )
            elif event.topic == "wallet.withdrawal.dispatch_requested":
                processed = await service.dispatch_withdrawal_request(
                    withdrawal_reference=event.aggregate_id,
                )
            else:
                processed = False
        except WalletFundingError as exc:
            async with session.begin():
                payload = dict(event.payload)
                attempts = int(payload.get("attempts", 0) or 0) + 1
                payload["attempts"] = attempts
                payload["error"] = str(exc)
                payload["nextAttemptAt"] = (
                    datetime.now(UTC) + timedelta(minutes=PAYMENT_OUTBOX_RETRY_MINUTES)
                ).isoformat()
                event.status = "failed"
                event.payload = payload
            return False

        async with session.begin():
            event.status = "completed" if processed else "skipped"
        return processed


async def run_payment_followup_batch(
    *,
    session_factory: async_sessionmaker[AsyncSession],
    batch_size: int = PAYMENT_OUTBOX_BATCH_SIZE,
) -> int:
    event_ids = await claim_pending_payment_events(
        session_factory=session_factory,
        batch_size=batch_size,
    )
    processed = 0
    for event_id in event_ids:
        if await process_payment_event(session_factory=session_factory, event_id=event_id):
            processed += 1
    return processed


def service_session_ttl():
    from datetime import timedelta

    from app.core.config import settings

    return timedelta(hours=settings.auth_session_ttl_hours)


def service_verification_credit_amount():
    from decimal import Decimal

    from app.core.config import settings

    return Decimal(settings.mpesa_verification_credit_amount)


def run_payment_followup_loop() -> None:
    async def _run() -> None:
        session_factory = get_session_factory()
        processed = await run_payment_followup_batch(session_factory=session_factory)
        print(f"payment follow-up loop processed {processed} outbox event(s)")

    asyncio.run(_run())


def _should_claim_event(event: OutboxEvent) -> bool:
    if event.status == "pending":
        return True
    if event.status != "failed":
        return False

    payload = dict(event.payload)
    attempts = int(payload.get("attempts", 0) or 0)
    if attempts >= PAYMENT_OUTBOX_MAX_ATTEMPTS:
        return False

    next_attempt_at_raw = payload.get("nextAttemptAt")
    if not isinstance(next_attempt_at_raw, str):
        return True

    next_attempt_at = datetime.fromisoformat(next_attempt_at_raw)
    if next_attempt_at.tzinfo is None:
        next_attempt_at = next_attempt_at.replace(tzinfo=UTC)
    return next_attempt_at <= datetime.now(UTC)
