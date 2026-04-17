from __future__ import annotations

from typing import Annotated

from app.schemas.markets import (
    AdminMarketCommentQueueResponse,
    MarketCommentCreateRequest,
    MarketCommentResponse,
    MarketHolderResponse,
    MarketResponse,
)
from app.services.account_access import AuthenticatedAccount, get_authenticated_account
from app.services.market_catalog import (
    MarketCatalogService,
    MarketCommentAuthError,
    MarketCommentNotFoundError,
    MarketCommentValidationError,
    get_market_catalog_service,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status

router = APIRouter()
AuthenticatedAccountDep = Annotated[AuthenticatedAccount, Depends(get_authenticated_account)]


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


@router.get("/markets/{slug}/comments", response_model=list[MarketCommentResponse])
async def get_market_comments(
    slug: str,
    market_catalog: Annotated[MarketCatalogService, Depends(get_market_catalog_service)],
) -> list[MarketCommentResponse]:
    comments = await market_catalog.get_market_comments(slug)
    if comments is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Market not found.")
    return comments


@router.get("/admin/markets/comments", response_model=AdminMarketCommentQueueResponse)
async def list_admin_market_comments(
    account: AuthenticatedAccountDep,
    market_catalog: Annotated[MarketCatalogService, Depends(get_market_catalog_service)],
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> AdminMarketCommentQueueResponse:
    try:
        return await market_catalog.list_admin_market_comments(
            admin_user_id=account.user.id,
            status_filter=status_filter,
            limit=limit,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/markets/{slug}/comments", response_model=MarketCommentResponse)
async def create_market_comment(
    slug: str,
    payload: MarketCommentCreateRequest,
    account: AuthenticatedAccountDep,
    market_catalog: Annotated[MarketCatalogService, Depends(get_market_catalog_service)],
) -> MarketCommentResponse:
    if not payload.body.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment body is required.",
        )

    try:
        comment = await market_catalog.create_market_comment(
            slug,
            user_id=account.user.id,
            body=payload.body,
            parent_comment_id=payload.parentCommentId,
        )
    except MarketCommentAuthError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error)) from error
    except MarketCommentNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except MarketCommentValidationError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error)) from error

    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Market not found.")
    return comment


@router.post("/markets/{slug}/comments/{comment_id}/like", response_model=MarketCommentResponse)
async def like_market_comment(
    slug: str,
    comment_id: str,
    account: AuthenticatedAccountDep,
    market_catalog: Annotated[MarketCatalogService, Depends(get_market_catalog_service)],
) -> MarketCommentResponse:
    try:
        comment = await market_catalog.like_market_comment(
            slug,
            comment_id=comment_id,
            user_id=account.user.id,
        )
    except MarketCommentAuthError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error)) from error

    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")
    return comment


@router.post("/markets/{slug}/comments/{comment_id}/hide", response_model=MarketCommentResponse)
async def hide_market_comment(
    slug: str,
    comment_id: str,
    account: AuthenticatedAccountDep,
    market_catalog: Annotated[MarketCatalogService, Depends(get_market_catalog_service)],
) -> MarketCommentResponse:
    try:
        comment = await market_catalog.hide_market_comment(
            slug,
            comment_id=comment_id,
            moderator_user_id=account.user.id,
        )
    except MarketCommentAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")
    return comment


@router.post("/markets/{slug}/comments/{comment_id}/restore", response_model=MarketCommentResponse)
async def restore_market_comment(
    slug: str,
    comment_id: str,
    account: AuthenticatedAccountDep,
    market_catalog: Annotated[MarketCatalogService, Depends(get_market_catalog_service)],
) -> MarketCommentResponse:
    try:
        comment = await market_catalog.restore_market_comment(
            slug,
            comment_id=comment_id,
            moderator_user_id=account.user.id,
        )
    except MarketCommentAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")
    return comment


@router.get("/markets/{slug}/holders", response_model=list[MarketHolderResponse])
async def get_market_holders(
    slug: str,
    market_catalog: Annotated[MarketCatalogService, Depends(get_market_catalog_service)],
) -> list[MarketHolderResponse]:
    holders = await market_catalog.get_market_top_holders(slug)
    if holders is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Market not found.")
    return holders
