from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Protocol

import pytest
import pytest_asyncio
from app.models import Base, Market, MarketComment, MarketCommentLike, User
from sqlalchemy import event, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


class _SQLiteCursorProtocol(Protocol):
    def execute(self, statement: str) -> object: ...

    def close(self) -> None: ...


class _SQLiteConnectionProtocol(Protocol):
    def cursor(self) -> _SQLiteCursorProtocol: ...


@pytest_asyncio.fixture
async def async_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)

    @event.listens_for(engine.sync_engine, "connect")
    def _enable_sqlite_foreign_keys(
        dbapi_connection: _SQLiteConnectionProtocol,
        _connection_record: object,
    ) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    _ = _enable_sqlite_foreign_keys

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        session.add_all(
            [
                Market(
                    id="market-1",
                    slug="nairobi-governor-bill-sign-before-june",
                    sort_order=1,
                    category="Politics",
                    status="Open",
                    question=(
                        "Will Nairobi county sign the urban mobility bill before June 30, "
                        "2026?"
                    ),
                    short_label="Nairobi mobility bill before June 30?",
                    summary="A seeded politics market.",
                    region="Kenya Public Affairs",
                    yes_price=Decimal("0.6200"),
                    no_price=Decimal("0.3800"),
                    volume_kes=Decimal("486000.00"),
                    liquidity_kes=Decimal("190000.00"),
                    closes_at=datetime.now(UTC) + timedelta(days=30),
                    resolution_source="Official county release",
                    rule_highlights=["Rule 1"],
                    trust_notes=["Trust note 1"],
                    order_book={"yesBids": [], "noBids": []},
                    trades=[],
                ),
                User(
                    id="user-1",
                    first_name="Brian",
                    phone="0796000001",
                ),
                User(
                    id="admin-user",
                    first_name="Admin",
                    phone="0712345678",
                ),
            ]
        )
        await session.commit()
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_market_comment_likes_cannot_go_negative(async_session: AsyncSession) -> None:
    async_session.add(
        MarketComment(
            id="comment-1",
            market_id="market-1",
            user_id="user-1",
            body="Constraint candidate.",
            likes=-1,
        )
    )

    with pytest.raises(IntegrityError):
        await async_session.commit()

    await async_session.rollback()


@pytest.mark.asyncio
async def test_market_comment_requires_existing_market_and_user(
    async_session: AsyncSession,
) -> None:
    async_session.add(
        MarketComment(
            id="comment-missing-user",
            market_id="market-1",
            user_id="missing-user",
            body="Should fail foreign key enforcement.",
            likes=0,
        )
    )

    with pytest.raises(IntegrityError):
        await async_session.commit()

    await async_session.rollback()


@pytest.mark.asyncio
async def test_market_comment_like_requires_existing_comment_and_user(
    async_session: AsyncSession,
) -> None:
    async_session.add(
        MarketComment(
            id="comment-1",
            market_id="market-1",
            user_id="user-1",
            body="Existing comment.",
            likes=0,
        )
    )
    await async_session.commit()

    async_session.add(
        MarketCommentLike(
            id="like-1",
            comment_id="missing-comment",
            user_id="user-1",
        )
    )

    with pytest.raises(IntegrityError):
        await async_session.commit()

    await async_session.rollback()


@pytest.mark.asyncio
async def test_hidden_by_user_id_is_cleared_when_moderator_is_deleted(
    async_session: AsyncSession,
) -> None:
    comment = MarketComment(
        id="comment-hidden",
        market_id="market-1",
        user_id="user-1",
        body="Hidden by an admin user.",
        likes=0,
        hidden_at=datetime.now(UTC),
        hidden_by_user_id="admin-user",
    )
    async_session.add(comment)
    await async_session.commit()

    moderator = await async_session.get(User, "admin-user")
    assert moderator is not None
    await async_session.delete(moderator)
    await async_session.commit()
    async_session.expire_all()

    refreshed_comment = await async_session.scalar(
        select(MarketComment).where(MarketComment.id == "comment-hidden")
    )
    assert refreshed_comment is not None
    assert refreshed_comment.hidden_by_user_id is None
