from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


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


class MarketCommentResponse(BaseModel):
    id: str
    author: str
    ageLabel: str
    body: str
    likes: int
    parentCommentId: str | None = None
    replies: list["MarketCommentResponse"] = Field(default_factory=lambda: [])


class MarketCommentCreateRequest(BaseModel):
    body: str
    parentCommentId: str | None = None


class AdminMarketCommentItemResponse(BaseModel):
    id: str
    marketId: str
    marketSlug: str
    marketQuestion: str
    author: str
    body: str
    likes: int
    status: str
    createdAt: str
    hiddenAt: str | None = None
    hiddenByName: str | None = None


class AdminMarketCommentQueueResponse(BaseModel):
    items: list[AdminMarketCommentItemResponse]


class MarketHolderResponse(BaseModel):
    id: str
    name: str
    side: str
    shares: float
    avgPrice: float


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


MarketCommentResponse.model_rebuild()
