from __future__ import annotations

from dataclasses import dataclass

from app.main import app
from app.schemas.markets import MarketResponse, OrderBookResponse
from app.services.market_catalog import get_market_catalog_service
from fastapi.testclient import TestClient


def build_market_response() -> MarketResponse:
    return MarketResponse(
        id="demo-market-kenya-election",
        slug="nairobi-governor-bill-sign-before-june",
        category="Politics",
        status="Open",
        question="Will Nairobi county sign the urban mobility bill before June 30, 2026?",
        shortLabel="Nairobi mobility bill before June 30?",
        summary="A seeded politics market.",
        region="Kenya Public Affairs",
        yesPrice=0.62,
        noPrice=0.38,
        volumeKes=486000,
        liquidityKes=190000,
        closesAt="2026-06-30T18:00:00+03:00",
        resolutionSource="Official county release",
        ruleHighlights=["Rule 1"],
        trustNotes=["Trust note 1"],
        orderBook=OrderBookResponse(yesBids=[], noBids=[]),
        trades=[],
    )


@dataclass
class FakeMarketCatalogService:
    market: MarketResponse

    async def list_markets(self) -> list[MarketResponse]:
        return [self.market]

    async def get_market_by_slug(self, slug: str) -> MarketResponse | None:
        if slug == self.market.slug:
            return self.market
        return None


def build_client() -> TestClient:
    fake_service = FakeMarketCatalogService(market=build_market_response())
    app.dependency_overrides.clear()
    app.dependency_overrides[get_market_catalog_service] = lambda: fake_service
    return TestClient(app)


def test_list_markets_returns_seeded_shape() -> None:
    client = build_client()

    response = client.get("/api/v1/markets")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["slug"] == "nairobi-governor-bill-sign-before-june"
    assert payload[0]["orderBook"]["yesBids"] == []


def test_get_market_by_slug_returns_404_when_missing() -> None:
    client = build_client()

    response = client.get("/api/v1/markets/missing-market")

    assert response.status_code == 404
