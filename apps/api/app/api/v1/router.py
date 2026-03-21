from app.api.v1.routes.account import router as account_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.markets import router as markets_router
from app.api.v1.routes.orders import router as orders_router
from fastapi import APIRouter

api_router = APIRouter()
api_router.include_router(account_router, tags=["account"])
api_router.include_router(health_router, tags=["health"])
api_router.include_router(markets_router, tags=["markets"])
api_router.include_router(orders_router, tags=["orders"])
