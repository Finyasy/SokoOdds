from __future__ import annotations

from typing import Annotated

from app.schemas.markets import MarketResponse
from app.services.market_catalog import MarketCatalogService, get_market_catalog_service
from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter()


@router.get("/markets", response_model=list[MarketResponse])
async def list_markets(
    market_catalog: Annotated[MarketCatalogService, Depends(get_market_catalog_service)],
) -> list[MarketResponse]:
    return await market_catalog.list_markets()


@router.get("/markets/{slug}", response_model=MarketResponse)
async def get_market(
    slug: str,
    market_catalog: Annotated[MarketCatalogService, Depends(get_market_catalog_service)],
) -> MarketResponse:
    market = await market_catalog.get_market_by_slug(slug)
    if not market:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Market not found.")
    return market
