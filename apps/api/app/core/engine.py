from __future__ import annotations

from typing import Literal

import httpx
from app.core.config import settings
from fastapi import HTTPException, status
from pydantic import BaseModel


class EngineHealth(BaseModel):
    status: Literal["ready", "hydrating", "unreachable"]
    service: str = "market-engine"
    books_loaded: int = 0
    order_intake_enabled: bool = False
    last_stream_offset: str | None = None
    detail: str | None = None


async def fetch_engine_health() -> EngineHealth:
    if settings.engine_health_mode == "stub":
        is_ready = settings.engine_health_fallback_status == "ready"
        return EngineHealth(
            status=settings.engine_health_fallback_status,
            books_loaded=settings.engine_health_fallback_books_loaded,
            order_intake_enabled=is_ready,
            detail="stub health response from API settings",
        )

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(settings.market_engine_health_url)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        return EngineHealth(
            status="unreachable",
            order_intake_enabled=False,
            detail=f"engine health lookup failed: {exc}",
        )

    return EngineHealth.model_validate(response.json())


async def ensure_engine_ready_for_orders() -> EngineHealth:
    engine_health = await fetch_engine_health()

    if not settings.require_engine_ready_for_orders:
        return engine_health

    if engine_health.status != "ready" or not engine_health.order_intake_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "message": "Order intake is disabled until the market engine is ready.",
                "engine_status": engine_health.status,
            },
        )

    return engine_health
