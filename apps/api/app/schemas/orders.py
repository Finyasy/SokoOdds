from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator

PRICE_MIN = Decimal("0.01")
PRICE_MAX = Decimal("0.99")
QUANTITY_MIN = Decimal("1")


class OrderCreateRequest(BaseModel):
    market_id: str = Field(min_length=1)
    side: Literal["YES", "NO"]
    direction: Literal["BUY", "SELL"]
    price: Decimal
    quantity: Decimal

    @field_validator("price")
    @classmethod
    def validate_price(cls, value: Decimal) -> Decimal:
        if value < PRICE_MIN or value > PRICE_MAX:
            raise ValueError("price must be between 0.01 and 0.99")
        return value

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, value: Decimal) -> Decimal:
        if value < QUANTITY_MIN:
            raise ValueError("quantity must be at least 1")
        return value
