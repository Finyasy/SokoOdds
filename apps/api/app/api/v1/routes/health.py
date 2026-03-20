from fastapi import APIRouter, Depends

from app.core.engine import EngineHealth, fetch_engine_health

router = APIRouter()


@router.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": "api"}


@router.get("/health/order-intake")
async def order_intake_health(
    engine_health: EngineHealth = Depends(fetch_engine_health),
) -> dict[str, str | int | bool | None]:
    return {
        "status": "ok",
        "service": "api",
        "engine_status": engine_health.status,
        "order_intake_enabled": engine_health.order_intake_enabled,
        "books_loaded": engine_health.books_loaded,
        "last_stream_offset": engine_health.last_stream_offset,
    }
