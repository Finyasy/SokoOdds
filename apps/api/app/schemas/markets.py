from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class OrderBookLevelResponse(BaseModel):
    price: float
    shares: int


class OrderBookResponse(BaseModel):
    yesBids: list[OrderBookLevelResponse]
    noBids: list[OrderBookLevelResponse]


class TradePrintResponse(BaseModel):
    id: str
    side: str
    price: float
    shares: int
    time: str


class MarketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    slug: str
    category: str
    status: str
    question: str
    shortLabel: str
    summary: str
    region: str
    yesPrice: float
    noPrice: float
    volumeKes: float
    liquidityKes: float
    closesAt: str
    resolutionSource: str
    ruleHighlights: list[str]
    trustNotes: list[str]
    orderBook: OrderBookResponse
    trades: list[TradePrintResponse]
