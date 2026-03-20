from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse

from app.core.engine import EngineHealth, ensure_engine_ready_for_orders
from app.schemas.orders import OrderCreateRequest
from app.services.account_access import AuthenticatedAccount, get_optional_authenticated_account
from app.services.order_intake import (
    IdempotencyConflictError,
    InsufficientFundsError,
    MarketNotTradableError,
    OrderIntakeService,
    UnknownMarketError,
    get_order_intake_service,
)

router = APIRouter()


@router.post("/orders", status_code=status.HTTP_202_ACCEPTED)
async def create_order(
    order_request: OrderCreateRequest,
    request: Request,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key")],
    order_service: Annotated[OrderIntakeService, Depends(get_order_intake_service)],
    engine_health: Annotated[EngineHealth, Depends(ensure_engine_ready_for_orders)],
    authenticated_account: Annotated[
        AuthenticatedAccount | None, Depends(get_optional_authenticated_account)
    ],
) -> JSONResponse:
    del engine_health  # The dependency enforces readiness when enabled.

    if authenticated_account is not None and authenticated_account.user.mpesa_verified_at is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Verify your M-Pesa wallet before placing an order.",
        )

    user_id = authenticated_account.user.id if authenticated_account is not None else "demo-user"

    try:
        result = await order_service.submit_order(
            user_id=user_id,
            route=str(request.url.path),
            idempotency_key=idempotency_key,
            order_request=order_request,
        )
    except IdempotencyConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except UnknownMarketError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except MarketNotTradableError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except InsufficientFundsError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return JSONResponse(
        status_code=result.status_code,
        content=result.response_body,
        headers={"X-Idempotency-Status": result.idempotency_status},
    )
