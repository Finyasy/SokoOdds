from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

import pytest
import pytest_asyncio
from app.core.database import get_async_session
from app.main import create_app
from app.models import Base, Market, User
from app.services.account_access import get_authenticated_account
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


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


@pytest_asyncio.fixture
async def market_comment_client(
    tmp_path: Path,
) -> AsyncIterator[tuple[AsyncClient, dict[str, str]]]:
    database_path = tmp_path / "market-comment-endpoints.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{database_path}", future=True)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        await seed_market_with_users(session)

    current_user = {"id": "user-1"}

    async def override_async_session() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    def override_authenticated_account() -> object:
        user = type("FakeUser", (), {"id": current_user["id"]})()
        return type("FakeAuthenticatedAccount", (), {"user": user})()

    test_app = create_app()
    test_app.dependency_overrides[get_async_session] = override_async_session
    test_app.dependency_overrides[get_authenticated_account] = override_authenticated_account

    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://testserver",
    ) as client:
        yield client, current_user

    test_app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_comment_endpoints_persist_nested_thread_and_likes(
    market_comment_client: tuple[AsyncClient, dict[str, str]],
) -> None:
    client, current_user = market_comment_client

    create_response = await client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments",
        json={"body": "Top-level policy note from the first user."},
    )
    assert create_response.status_code == 200
    created_comment = create_response.json()
    assert created_comment["author"] == "Brian"
    assert created_comment["parentCommentId"] is None

    current_user["id"] = "user-2"
    reply_response = await client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments",
        json={
            "body": "Replying with more county context.",
            "parentCommentId": created_comment["id"],
        },
    )
    assert reply_response.status_code == 200
    reply_comment = reply_response.json()
    assert reply_comment["author"] == "Amina"
    assert reply_comment["parentCommentId"] == created_comment["id"]

    like_response = await client.post(
        f"/api/v1/markets/nairobi-governor-bill-sign-before-june/comments/{created_comment['id']}/like"
    )
    assert like_response.status_code == 200
    assert like_response.json()["likes"] == 1

    comments_response = await client.get(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments"
    )
    assert comments_response.status_code == 200

    comments = comments_response.json()
    assert len(comments) == 1
    assert comments[0]["id"] == created_comment["id"]
    assert comments[0]["likes"] == 1
    assert len(comments[0]["replies"]) == 1
    assert comments[0]["replies"][0]["id"] == reply_comment["id"]
    assert comments[0]["replies"][0]["author"] == "Amina"


@pytest.mark.asyncio
async def test_admin_comment_endpoints_hide_and_restore_comment(
    market_comment_client: tuple[AsyncClient, dict[str, str]],
) -> None:
    client, current_user = market_comment_client

    create_response = await client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments",
        json={"body": "Moderation candidate from the public feed."},
    )
    assert create_response.status_code == 200
    created_comment = create_response.json()

    current_user["id"] = "admin-user"
    hide_response = await client.post(
        f"/api/v1/markets/nairobi-governor-bill-sign-before-june/comments/{created_comment['id']}/hide"
    )
    assert hide_response.status_code == 200
    assert hide_response.json()["id"] == created_comment["id"]

    public_comments_after_hide = await client.get(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments"
    )
    assert public_comments_after_hide.status_code == 200
    assert all(
        comment["id"] != created_comment["id"]
        for comment in public_comments_after_hide.json()
    )

    hidden_queue_response = await client.get(
        "/api/v1/admin/markets/comments?status=hidden&limit=10"
    )
    assert hidden_queue_response.status_code == 200
    assert any(
        item["id"] == created_comment["id"] and item["hiddenByName"] == "Admin"
        for item in hidden_queue_response.json()["items"]
    )

    restore_response = await client.post(
        f"/api/v1/markets/nairobi-governor-bill-sign-before-june/comments/{created_comment['id']}/restore"
    )
    assert restore_response.status_code == 200
    assert restore_response.json()["id"] == created_comment["id"]

    public_comments_after_restore = await client.get(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments"
    )
    assert public_comments_after_restore.status_code == 200
    assert any(
        comment["id"] == created_comment["id"]
        for comment in public_comments_after_restore.json()
    )

    visible_queue_response = await client.get(
        "/api/v1/admin/markets/comments?status=visible&limit=10"
    )
    assert visible_queue_response.status_code == 200
    assert any(
        item["id"] == created_comment["id"] and item["status"] == "visible"
        for item in visible_queue_response.json()["items"]
    )
