from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from app.models import Base, Market, MarketComment, MarketCommentLike, User
from app.services.market_catalog import MarketCatalogService
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def async_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


async def seed_market_with_users(async_session: AsyncSession) -> None:
    async_session.add_all(
        [
            Market(
                id="market-1",
                slug="nairobi-governor-bill-sign-before-june",
                sort_order=1,
                category="Politics",
                status="Open",
                question="Will Nairobi county sign the urban mobility bill before June 30, 2026?",
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
                id="user-2",
                first_name="Amina",
                phone="0796000002",
            ),
            User(
                id="admin-user",
                first_name="Admin",
                phone="0712345678",
            ),
        ]
    )
    await async_session.commit()


@pytest.mark.asyncio
async def test_create_comment_and_reply_are_returned_as_nested_thread(
    async_session: AsyncSession,
) -> None:
    await seed_market_with_users(async_session)
    service = MarketCatalogService(async_session)

    parent = await service.create_market_comment(
        "nairobi-governor-bill-sign-before-june",
        user_id="user-1",
        body="Top-level market note.",
    )
    assert parent is not None
    assert parent.parentCommentId is None

    reply = await service.create_market_comment(
        "nairobi-governor-bill-sign-before-june",
        user_id="user-2",
        body="Replying with extra context.",
        parent_comment_id=parent.id,
    )
    assert reply is not None
    assert reply.parentCommentId == parent.id

    comments = await service.get_market_comments("nairobi-governor-bill-sign-before-june")

    assert comments is not None
    assert len(comments) == 1
    assert comments[0].id == parent.id
    assert len(comments[0].replies) == 1
    assert comments[0].replies[0].id == reply.id
    assert comments[0].replies[0].parentCommentId == parent.id


@pytest.mark.asyncio
async def test_like_market_comment_is_idempotent_in_storage(async_session: AsyncSession) -> None:
    await seed_market_with_users(async_session)
    service = MarketCatalogService(async_session)

    created = await service.create_market_comment(
        "nairobi-governor-bill-sign-before-june",
        user_id="user-1",
        body="Please resolve strictly from the county notice.",
    )
    assert created is not None

    first = await service.like_market_comment(
        "nairobi-governor-bill-sign-before-june",
        comment_id=created.id,
        user_id="user-2",
    )
    second = await service.like_market_comment(
        "nairobi-governor-bill-sign-before-june",
        comment_id=created.id,
        user_id="user-2",
    )

    like_count = await async_session.scalar(select(func.count()).select_from(MarketCommentLike))
    persisted = await async_session.scalar(
        select(MarketComment).where(MarketComment.id == created.id)
    )

    assert first is not None
    assert second is not None
    assert first.likes == 1
    assert second.likes == 1
    assert like_count == 1
    assert persisted is not None
    assert persisted.likes == 1


@pytest.mark.asyncio
async def test_hidden_comment_disappears_from_public_feed_and_shows_in_admin_queue(
    async_session: AsyncSession,
) -> None:
    await seed_market_with_users(async_session)
    service = MarketCatalogService(async_session)

    created = await service.create_market_comment(
        "nairobi-governor-bill-sign-before-june",
        user_id="user-1",
        body="This comment should be hidden by admin moderation.",
    )
    assert created is not None

    hidden = await service.hide_market_comment(
        "nairobi-governor-bill-sign-before-june",
        comment_id=created.id,
        moderator_user_id="admin-user",
    )
    assert hidden is not None

    public_comments = await service.get_market_comments("nairobi-governor-bill-sign-before-june")
    hidden_queue = await service.list_admin_market_comments(
        admin_user_id="admin-user",
        status_filter="hidden",
        limit=20,
    )

    assert public_comments is not None
    assert all(comment.id != created.id for comment in public_comments)
    assert any(item.id == created.id for item in hidden_queue.items)
    assert any(item.hiddenByName == "Admin" for item in hidden_queue.items if item.id == created.id)


@pytest.mark.asyncio
async def test_restored_comment_returns_to_public_feed_and_visible_admin_queue(
    async_session: AsyncSession,
) -> None:
    await seed_market_with_users(async_session)
    service = MarketCatalogService(async_session)

    created = await service.create_market_comment(
        "nairobi-governor-bill-sign-before-june",
        user_id="user-1",
        body="Temporary moderation candidate.",
    )
    assert created is not None

    await service.hide_market_comment(
        "nairobi-governor-bill-sign-before-june",
        comment_id=created.id,
        moderator_user_id="admin-user",
    )
    restored = await service.restore_market_comment(
        "nairobi-governor-bill-sign-before-june",
        comment_id=created.id,
        moderator_user_id="admin-user",
    )

    public_comments = await service.get_market_comments("nairobi-governor-bill-sign-before-june")
    visible_queue = await service.list_admin_market_comments(
        admin_user_id="admin-user",
        status_filter="visible",
        limit=20,
    )
    hidden_queue = await service.list_admin_market_comments(
        admin_user_id="admin-user",
        status_filter="hidden",
        limit=20,
    )

    assert restored is not None
    assert restored.id == created.id
    assert public_comments is not None
    assert any(comment.id == created.id for comment in public_comments)
    assert any(item.id == created.id and item.status == "visible" for item in visible_queue.items)
    assert all(item.id != created.id for item in hidden_queue.items)


@pytest.mark.asyncio
async def test_hidden_filter_keeps_visible_comments_out_of_admin_queue(
    async_session: AsyncSession,
) -> None:
    await seed_market_with_users(async_session)
    service = MarketCatalogService(async_session)

    visible = await service.create_market_comment(
        "nairobi-governor-bill-sign-before-june",
        user_id="user-1",
        body="Still visible.",
    )
    hidden = await service.create_market_comment(
        "nairobi-governor-bill-sign-before-june",
        user_id="user-2",
        body="Will be hidden.",
    )
    assert visible is not None
    assert hidden is not None

    await service.hide_market_comment(
        "nairobi-governor-bill-sign-before-june",
        comment_id=hidden.id,
        moderator_user_id="admin-user",
    )

    hidden_queue = await service.list_admin_market_comments(
        admin_user_id="admin-user",
        status_filter="hidden",
        limit=20,
    )

    assert any(item.id == hidden.id for item in hidden_queue.items)
    assert all(item.id != visible.id for item in hidden_queue.items)


@pytest.mark.asyncio
async def test_orphaned_comment_author_uses_safe_fallback_label(
    async_session: AsyncSession,
) -> None:
    await seed_market_with_users(async_session)
    service = MarketCatalogService(async_session)

    async_session.add(
        MarketComment(
            id="orphan-comment",
            market_id="market-1",
            user_id="missing-user",
            body="Persisted comment survives even without its original user row.",
            likes=2,
        )
    )
    await async_session.commit()

    comments = await service.get_market_comments("nairobi-governor-bill-sign-before-june")

    assert comments is not None
    assert any(
        comment.id == "orphan-comment" and comment.author == "SokoOdds member"
        for comment in comments
    )


@pytest.mark.asyncio
async def test_get_market_comments_returns_latest_fifty_threads(
    async_session: AsyncSession,
) -> None:
    await seed_market_with_users(async_session)
    service = MarketCatalogService(async_session)
    base_time = datetime.now(UTC) - timedelta(hours=2)

    async_session.add_all(
        [
            MarketComment(
                id=f"thread-{index}",
                market_id="market-1",
                user_id="user-1",
                body=f"Thread number {index}",
                likes=0,
                created_at=base_time + timedelta(minutes=index),
            )
            for index in range(55)
        ]
    )
    await async_session.commit()

    comments = await service.get_market_comments("nairobi-governor-bill-sign-before-june")

    assert comments is not None
    assert len(comments) == 50
    assert comments[0].body == "Thread number 54"
    assert comments[-1].body == "Thread number 5"
    assert all(comment.body != "Thread number 4" for comment in comments)


@pytest.mark.asyncio
async def test_reply_to_reply_is_rejected(async_session: AsyncSession) -> None:
    await seed_market_with_users(async_session)
    service = MarketCatalogService(async_session)

    parent = await service.create_market_comment(
        "nairobi-governor-bill-sign-before-june",
        user_id="user-1",
        body="Top-level thread starter.",
    )
    assert parent is not None

    reply = await service.create_market_comment(
        "nairobi-governor-bill-sign-before-june",
        user_id="user-2",
        body="First-level reply.",
        parent_comment_id=parent.id,
    )
    assert reply is not None

    with pytest.raises(ValueError, match="Replies can only be posted one level deep."):
        await service.create_market_comment(
            "nairobi-governor-bill-sign-before-june",
            user_id="user-1",
            body="Nested reply should fail.",
            parent_comment_id=reply.id,
        )


@pytest.mark.asyncio
async def test_reply_to_hidden_comment_is_rejected(async_session: AsyncSession) -> None:
    await seed_market_with_users(async_session)
    service = MarketCatalogService(async_session)

    parent = await service.create_market_comment(
        "nairobi-governor-bill-sign-before-june",
        user_id="user-1",
        body="Visible before moderation.",
    )
    assert parent is not None

    await service.hide_market_comment(
        "nairobi-governor-bill-sign-before-june",
        comment_id=parent.id,
        moderator_user_id="admin-user",
    )

    with pytest.raises(LookupError, match="Reply target was not found."):
        await service.create_market_comment(
            "nairobi-governor-bill-sign-before-june",
            user_id="user-2",
            body="Replying to a hidden comment should fail.",
            parent_comment_id=parent.id,
        )
