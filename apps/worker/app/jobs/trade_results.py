from __future__ import annotations

import asyncio
import os
from typing import Any

from app.core.database import get_session_factory
from app.core.redis import create_redis_client
from app.services.trade_results import (
    TradeResultError,
    apply_trade_executed,
    get_engine_state_value,
    set_engine_state_value,
)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

TRADE_RESULTS_STREAM = os.getenv("WORKER_TRADE_RESULTS_STREAM", "trades")
TRADE_RESULTS_CURSOR_KEY = os.getenv(
    "WORKER_TRADE_RESULTS_CURSOR_KEY",
    "worker:trade-results:trades",
)
TRADE_RESULTS_BATCH_SIZE = int(os.getenv("WORKER_TRADE_RESULTS_BATCH_SIZE", "20"))
TRADE_RESULTS_BLOCK_MS = int(os.getenv("WORKER_TRADE_RESULTS_BLOCK_MS", "250"))


async def consume_trade_result_batch(
    *,
    redis_client: Any,
    session_factory: async_sessionmaker[AsyncSession],
    stream: str = TRADE_RESULTS_STREAM,
    cursor_key: str = TRADE_RESULTS_CURSOR_KEY,
    batch_size: int = TRADE_RESULTS_BATCH_SIZE,
    block_ms: int = TRADE_RESULTS_BLOCK_MS,
) -> int:
    async with session_factory() as session:
        cursor_value = await get_engine_state_value(session, key=cursor_key)
    start_id = cursor_value or "0-0"

    records = await redis_client.xread(
        {stream: start_id},
        count=batch_size,
        block=block_ms,
    )
    if not records:
        return 0

    processed = 0
    for _stream_name, entries in records:
        for entry_id, payload in entries:
            if str(payload.get("type", "")) != "trade.executed":
                async with session_factory() as session:
                    await set_engine_state_value(session, key=cursor_key, value=entry_id)
                continue

            async with session_factory() as session:
                await apply_trade_executed(
                    session,
                    payload=payload,
                    cursor_key=cursor_key,
                    cursor_value=entry_id,
                )
            processed += 1
    return processed


def run_trade_result_consumer() -> None:
    async def _run() -> None:
        redis_client = create_redis_client()
        session_factory = get_session_factory()
        try:
            processed = await consume_trade_result_batch(
                redis_client=redis_client,
                session_factory=session_factory,
            )
            print(f"trade-result consumer processed {processed} event(s)")
        except TradeResultError as exc:
            print(f"trade-result consumer failed: {exc}")
            raise
        finally:
            await redis_client.aclose()

    asyncio.run(_run())
