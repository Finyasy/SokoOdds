from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import get_session_factory
from app.bootstrap.demo_markets import seed_markets_if_empty


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.seed_demo_markets_on_startup:
        await seed_markets_if_empty(get_session_factory())
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
