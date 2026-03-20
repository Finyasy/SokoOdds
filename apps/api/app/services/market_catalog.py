from __future__ import annotations

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.models import Market
from app.schemas.markets import MarketResponse


def _to_market_response(market: Market) -> MarketResponse:
    return MarketResponse(
        id=market.id,
        slug=market.slug,
        category=market.category,
        status=market.status,
        question=market.question,
        shortLabel=market.short_label,
        summary=market.summary,
        region=market.region,
        yesPrice=float(market.yes_price),
        noPrice=float(market.no_price),
        volumeKes=float(market.volume_kes),
        liquidityKes=float(market.liquidity_kes),
        closesAt=market.closes_at.isoformat(),
        resolutionSource=market.resolution_source,
        ruleHighlights=market.rule_highlights,
        trustNotes=market.trust_notes,
        orderBook=market.order_book,
        trades=market.trades,
    )


class MarketCatalogService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_markets(self) -> list[MarketResponse]:
        result = await self.session.execute(
            select(Market).order_by(Market.sort_order.asc(), Market.created_at.asc())
        )
        return [_to_market_response(market) for market in result.scalars().all()]

    async def get_market_by_slug(self, slug: str) -> MarketResponse | None:
        result = await self.session.execute(select(Market).where(Market.slug == slug))
        market = result.scalar_one_or_none()
        if not market:
            return None
        return _to_market_response(market)


def get_market_catalog_service(
    session: AsyncSession = Depends(get_async_session),
) -> MarketCatalogService:
    return MarketCatalogService(session=session)
