from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import uuid4

from app.core.config import settings
from app.core.database import get_async_session
from app.models import Market, MarketComment, MarketCommentLike, Position, User
from app.schemas.markets import (
    AdminMarketCommentItemResponse,
    AdminMarketCommentQueueResponse,
    MarketCommentResponse,
    MarketHolderResponse,
    MarketResponse,
    OrderBookResponse,
    TradePrintResponse,
)
from fastapi import Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

MISSING_COMMENT_AUTHOR_LABEL = "SokoOdds member"


class MarketCommentAuthError(LookupError):
    pass


class MarketCommentNotFoundError(LookupError):
    pass


class MarketCommentValidationError(ValueError):
    pass


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
        orderBook=OrderBookResponse.model_validate(market.order_book),
        trades=[TradePrintResponse.model_validate(trade) for trade in market.trades],
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

    async def get_market_comments(self, slug: str) -> list[MarketCommentResponse] | None:
        result = await self.session.execute(select(Market).where(Market.slug == slug))
        market = result.scalar_one_or_none()
        if not market:
            return None
        comment_rows = await self.session.execute(
            select(MarketComment, User)
            .outerjoin(User, User.id == MarketComment.user_id)
            .where(MarketComment.market_id == market.id, MarketComment.hidden_at.is_(None))
            .order_by(MarketComment.created_at.asc())
            .limit(50)
        )
        comments = _build_comment_tree([(comment, user) for comment, user in comment_rows.all()])
        return comments or _build_market_comments(market)

    async def list_admin_market_comments(
        self,
        *,
        admin_user_id: str,
        status_filter: str | None,
        limit: int,
    ) -> AdminMarketCommentQueueResponse:
        await self._assert_admin_user(admin_user_id)

        normalized_limit = max(1, min(limit, 50))
        query = (
            select(MarketComment, Market, User)
            .join(Market, Market.id == MarketComment.market_id)
            .outerjoin(User, User.id == MarketComment.user_id)
        )

        if status_filter == "visible":
            query = query.where(MarketComment.hidden_at.is_(None))
        elif status_filter == "hidden":
            query = query.where(MarketComment.hidden_at.is_not(None))

        comment_rows = await self.session.execute(
            query.order_by(desc(MarketComment.created_at)).limit(normalized_limit)
        )
        rows = comment_rows.all()

        moderator_ids = {
            comment.hidden_by_user_id
            for comment, _market, _user in rows
            if comment.hidden_by_user_id is not None
        }
        moderator_map: dict[str, User] = {}
        if moderator_ids:
            moderators_result = await self.session.execute(
                select(User).where(User.id.in_(moderator_ids))
            )
            moderator_map = {
                moderator.id: moderator for moderator in moderators_result.scalars().all()
            }

        return AdminMarketCommentQueueResponse(
            items=[
                AdminMarketCommentItemResponse(
                    id=comment.id,
                    marketId=market.id,
                    marketSlug=market.slug,
                    marketQuestion=market.question,
                    author=user.first_name if user else MISSING_COMMENT_AUTHOR_LABEL,
                    body=comment.body,
                    likes=comment.likes,
                    status="hidden" if comment.hidden_at is not None else "visible",
                    createdAt=comment.created_at.isoformat(),
                    hiddenAt=(
                        comment.hidden_at.isoformat() if comment.hidden_at is not None else None
                    ),
                    hiddenByName=(
                        moderator_map[comment.hidden_by_user_id].first_name
                        if comment.hidden_by_user_id in moderator_map
                        else None
                    ),
                )
                for comment, market, user in rows
            ]
        )

    async def get_market_top_holders(self, slug: str) -> list[MarketHolderResponse] | None:
        result = await self.session.execute(select(Market).where(Market.slug == slug))
        market = result.scalar_one_or_none()
        if not market:
            return None

        holders_result = await self.session.execute(
            select(Position, User)
            .join(User, User.id == Position.user_id)
            .where(Position.market_id == market.id, Position.shares > 0)
            .order_by(desc(Position.shares), Position.updated_at.desc())
            .limit(8)
        )
        rows = holders_result.all()

        return [
            MarketHolderResponse(
                id=position.id,
                name=user.first_name,
                side=position.side,
                shares=float(position.shares),
                avgPrice=float(position.average_entry_price * 100),
            )
            for position, user in rows
        ]

    async def create_market_comment(
        self,
        slug: str,
        *,
        user_id: str,
        body: str,
        parent_comment_id: str | None = None,
    ) -> MarketCommentResponse | None:
        result = await self.session.execute(select(Market).where(Market.slug == slug))
        market = result.scalar_one_or_none()
        if not market:
            return None

        user = await self._require_existing_user(
            user_id,
            error_message="Sign in again before posting a comment.",
        )

        parent_comment: MarketComment | None = None
        if parent_comment_id is not None:
            parent_result = await self.session.execute(
                select(MarketComment).where(
                    MarketComment.id == parent_comment_id,
                    MarketComment.market_id == market.id,
                    MarketComment.hidden_at.is_(None),
                )
            )
            parent_comment = parent_result.scalar_one_or_none()
            if parent_comment is None:
                raise MarketCommentNotFoundError("Reply target was not found.")
            if parent_comment.parent_comment_id is not None:
                raise MarketCommentValidationError("Replies can only be posted one level deep.")

        comment = MarketComment(
            id=str(uuid4()),
            market_id=market.id,
            user_id=user_id,
            parent_comment_id=parent_comment.id if parent_comment is not None else None,
            body=body.strip(),
            likes=0,
        )
        self.session.add(comment)
        await self.session.commit()
        await self.session.refresh(comment)

        return MarketCommentResponse(
            id=comment.id,
            author=user.first_name,
            ageLabel="Just now",
            body=comment.body,
            likes=comment.likes,
            parentCommentId=comment.parent_comment_id,
            replies=[],
        )

    async def _require_existing_user(self, user_id: str, *, error_message: str) -> User:
        user_result = await self.session.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise MarketCommentAuthError(error_message)
        return user

    async def like_market_comment(
        self,
        slug: str,
        *,
        comment_id: str,
        user_id: str,
    ) -> MarketCommentResponse | None:
        await self._require_existing_user(
            user_id,
            error_message="Sign in again before liking a comment.",
        )

        result = await self.session.execute(select(Market).where(Market.slug == slug))
        market = result.scalar_one_or_none()
        if not market:
            return None

        comment_result = await self.session.execute(
            select(MarketComment, User)
            .outerjoin(User, User.id == MarketComment.user_id)
            .where(
                MarketComment.id == comment_id,
                MarketComment.market_id == market.id,
                MarketComment.hidden_at.is_(None),
            )
        )
        row = comment_result.one_or_none()
        if row is None:
            return None
        comment, user = row

        like_result = await self.session.execute(
            select(MarketCommentLike).where(
                MarketCommentLike.comment_id == comment_id,
                MarketCommentLike.user_id == user_id,
            )
        )
        if like_result.scalar_one_or_none() is None:
            self.session.add(
                MarketCommentLike(
                    id=str(uuid4()),
                    comment_id=comment_id,
                    user_id=user_id,
                )
            )
            comment.likes += 1
            await self.session.commit()
            await self.session.refresh(comment)

        return MarketCommentResponse(
            id=comment.id,
            author=user.first_name if user else MISSING_COMMENT_AUTHOR_LABEL,
            ageLabel=_format_comment_age_label(comment.created_at),
            body=comment.body,
            likes=comment.likes,
            parentCommentId=comment.parent_comment_id,
            replies=[],
        )

    async def hide_market_comment(
        self,
        slug: str,
        *,
        comment_id: str,
        moderator_user_id: str,
    ) -> MarketCommentResponse | None:
        await self._assert_admin_user(moderator_user_id)

        result = await self.session.execute(select(Market).where(Market.slug == slug))
        market = result.scalar_one_or_none()
        if not market:
            return None

        comment_result = await self.session.execute(
            select(MarketComment, User)
            .outerjoin(User, User.id == MarketComment.user_id)
            .where(MarketComment.id == comment_id, MarketComment.market_id == market.id)
        )
        row = comment_result.one_or_none()
        if row is None:
            return None
        comment, user = row

        if comment.hidden_at is not None:
            return MarketCommentResponse(
                id=comment.id,
                author=user.first_name if user else MISSING_COMMENT_AUTHOR_LABEL,
                ageLabel=_format_comment_age_label(comment.created_at),
                body=comment.body,
                likes=comment.likes,
                parentCommentId=comment.parent_comment_id,
                replies=[],
            )

        comment.hidden_at = datetime.now(UTC)
        comment.hidden_by_user_id = moderator_user_id
        await self.session.commit()
        await self.session.refresh(comment)

        return MarketCommentResponse(
            id=comment.id,
            author=user.first_name if user else MISSING_COMMENT_AUTHOR_LABEL,
            ageLabel=_format_comment_age_label(comment.created_at),
            body=comment.body,
            likes=comment.likes,
            parentCommentId=comment.parent_comment_id,
            replies=[],
        )

    async def restore_market_comment(
        self,
        slug: str,
        *,
        comment_id: str,
        moderator_user_id: str,
    ) -> MarketCommentResponse | None:
        await self._assert_admin_user(moderator_user_id)

        result = await self.session.execute(select(Market).where(Market.slug == slug))
        market = result.scalar_one_or_none()
        if not market:
            return None

        comment_result = await self.session.execute(
            select(MarketComment, User)
            .outerjoin(User, User.id == MarketComment.user_id)
            .where(MarketComment.id == comment_id, MarketComment.market_id == market.id)
        )
        row = comment_result.one_or_none()
        if row is None:
            return None
        comment, user = row

        if comment.hidden_at is None:
            return MarketCommentResponse(
                id=comment.id,
                author=user.first_name if user else MISSING_COMMENT_AUTHOR_LABEL,
                ageLabel=_format_comment_age_label(comment.created_at),
                body=comment.body,
                likes=comment.likes,
                parentCommentId=comment.parent_comment_id,
                replies=[],
            )

        comment.hidden_at = None
        comment.hidden_by_user_id = None
        await self.session.commit()
        await self.session.refresh(comment)

        return MarketCommentResponse(
            id=comment.id,
            author=user.first_name if user else MISSING_COMMENT_AUTHOR_LABEL,
            ageLabel=_format_comment_age_label(comment.created_at),
            body=comment.body,
            likes=comment.likes,
            parentCommentId=comment.parent_comment_id,
            replies=[],
        )

    async def _assert_admin_user(self, user_id: str) -> None:
        user = await self._require_existing_user(
            user_id,
            error_message="Sign in again before moderating comments.",
        )
        from app.services.account_access import normalize_phone

        if normalize_phone(user.phone) not in settings.admin_phone_allowlist_values:
            raise ValueError("Admin access is required.")


def _build_market_comments(market: Market) -> list[MarketCommentResponse]:
    now = datetime.now(UTC)
    comments: list[MarketCommentResponse] = []

    for index, note in enumerate(market.trust_notes[:2], start=1):
        comments.append(
            MarketCommentResponse(
                id=f"{market.id}-trust-{index}",
                author=_category_comment_author(market.category, index),
                ageLabel=_format_age_label(now, market.updated_at, index * 17),
                body=note,
                likes=6 + index * 2,
                parentCommentId=None,
                replies=[],
            )
        )

    for index, trade in enumerate(market.trades[:2], start=1):
        comments.append(
            MarketCommentResponse(
                id=f"{market.id}-trade-{trade['id']}",
                author=_category_comment_author(market.category, index + 2),
                ageLabel=_time_to_age_label(str(trade.get("time", "14:00"))),
                body=(
                    f"{trade['side']} is still trading around Ksh "
                    f"{float(trade['price']) * 100:.0f}c. "
                    f"{int(trade['shares'])} shares matched on the latest visible print."
                ),
                likes=3 + index,
                parentCommentId=None,
                replies=[],
            )
        )

    if not comments:
        comments.append(
            MarketCommentResponse(
                id=f"{market.id}-fallback-comment",
                author=_category_comment_author(market.category, 0),
                ageLabel="Just now",
                body=market.summary,
                likes=1,
                parentCommentId=None,
                replies=[],
            )
        )

    return comments


def _build_comment_tree(
    rows: list[tuple[MarketComment, User | None]],
) -> list[MarketCommentResponse]:
    created_at_by_id: dict[str, datetime] = {}
    by_id: dict[str, MarketCommentResponse] = {}
    roots: list[MarketCommentResponse] = []

    for comment, user in rows:
        created_at_by_id[comment.id] = comment.created_at
        by_id[comment.id] = MarketCommentResponse(
            id=comment.id,
            author=user.first_name if user else MISSING_COMMENT_AUTHOR_LABEL,
            ageLabel=_format_comment_age_label(comment.created_at),
            body=comment.body,
            likes=comment.likes,
            parentCommentId=comment.parent_comment_id,
            replies=[],
        )

    for comment, _user in rows:
        response = by_id[comment.id]
        if comment.parent_comment_id and comment.parent_comment_id in by_id:
            by_id[comment.parent_comment_id].replies.append(response)
        else:
            roots.append(response)

    roots.sort(key=lambda item: created_at_by_id[item.id], reverse=True)
    for item in roots:
        item.replies.sort(key=lambda reply: created_at_by_id[reply.id])

    return roots


def _category_comment_author(category: str, offset: int) -> str:
    authors_by_category = {
        "Politics": ["NairobiWatch", "MzalendoDesk", "CityHallTape", "PolicyPulse"],
        "Football": ["FKFTracker", "GoalMath", "NgongRoadXI", "StadiumTape"],
        "Economy": ["KESFlow", "CBKWatcher", "MacroTape", "TreasuryDesk"],
        "Weather": ["RainGaugeKE", "ForecastTape", "CountyWeather", "StormDesk"],
        "Culture": ["NairobiNights", "StageLeftKE", "TicketDesk", "HypeMeter"],
    }
    authors = authors_by_category.get(category, ["MarketPulse", "SokoOddsDesk"])
    return authors[offset % len(authors)]


def _format_age_label(now: datetime, updated_at: datetime, extra_minutes: int) -> str:
    minutes = max(1, int((now - updated_at.astimezone(UTC)).total_seconds() // 60) + extra_minutes)
    if minutes < 60:
        return f"{minutes}m ago"
    hours = max(1, minutes // 60)
    return f"{hours}h ago"


def _time_to_age_label(value: str) -> str:
    try:
        hour_str, minute_str = value.split(":")
        hour = int(hour_str)
        minute = int(minute_str)
    except ValueError:
        return "Today"

    now = datetime.now(UTC)
    trade_time = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if trade_time > now:
        trade_time = trade_time - timedelta(days=1)

    minutes = max(1, int((now - trade_time).total_seconds() // 60))
    if minutes < 60:
        return f"{minutes}m ago"
    return f"{max(1, minutes // 60)}h ago"


def _format_comment_age_label(created_at: datetime) -> str:
    now = datetime.now(UTC)
    minutes = max(1, int((now - created_at.astimezone(UTC)).total_seconds() // 60))
    if minutes < 60:
        return f"{minutes}m ago"
    if minutes < 60 * 24:
        return f"{max(1, minutes // 60)}h ago"
    return f"{max(1, minutes // (60 * 24))}d ago"


def get_market_catalog_service(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> MarketCatalogService:
    return MarketCatalogService(session=session)
