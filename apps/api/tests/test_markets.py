from __future__ import annotations

from dataclasses import dataclass

from app.main import app
from app.schemas.markets import (
    AdminMarketCommentItemResponse,
    AdminMarketCommentQueueResponse,
    MarketCommentResponse,
    MarketHolderResponse,
    MarketResponse,
    OrderBookResponse,
)
from app.services.account_access import get_authenticated_account
from app.services.market_catalog import (
    MarketCommentNotFoundError,
    MarketCommentValidationError,
    get_market_catalog_service,
)
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

    async def get_market_comments(self, slug: str) -> list[MarketCommentResponse] | None:
        if slug != self.market.slug:
            return None
        return [
            MarketCommentResponse(
                id="comment-1",
                author="NairobiWatch",
                ageLabel="34m ago",
                body="Rule source is clear.",
                likes=6,
                parentCommentId=None,
                replies=[
                    MarketCommentResponse(
                        id="comment-1-reply-1",
                        author="Brian",
                        ageLabel="12m ago",
                        body="Agreed, official county release should decide it.",
                        likes=2,
                        parentCommentId="comment-1",
                        replies=[],
                    )
                ],
            )
        ]

    async def list_admin_market_comments(
        self,
        *,
        admin_user_id: str,
        status_filter: str | None,
        limit: int,
    ) -> AdminMarketCommentQueueResponse:
        assert admin_user_id == "admin-user"
        assert status_filter == "visible"
        assert limit == 10
        return AdminMarketCommentQueueResponse(
            items=[
                AdminMarketCommentItemResponse(
                    id="comment-1",
                    marketId=self.market.id,
                    marketSlug=self.market.slug,
                    marketQuestion=self.market.question,
                    author="NairobiWatch",
                    body="Rule source is clear.",
                    likes=6,
                    status="visible",
                    createdAt="2026-04-09T12:00:00+03:00",
                    hiddenAt=None,
                    hiddenByName=None,
                )
            ]
        )

    async def get_market_top_holders(self, slug: str) -> list[MarketHolderResponse] | None:
        if slug != self.market.slug:
            return None
        return [
            MarketHolderResponse(
                id="position-1",
                name="Brian",
                side="YES",
                shares=120.0,
                avgPrice=62.0,
            )
        ]

    async def create_market_comment(
        self, slug: str, *, user_id: str, body: str, parent_comment_id: str | None = None
    ) -> MarketCommentResponse | None:
        if slug != self.market.slug:
            return None
        return MarketCommentResponse(
            id="comment-reply-created" if parent_comment_id else "comment-created",
            author="Brian",
            ageLabel="Just now",
            body=body,
            likes=0,
            parentCommentId=parent_comment_id,
            replies=[],
        )

    async def like_market_comment(
        self, slug: str, *, comment_id: str, user_id: str
    ) -> MarketCommentResponse | None:
        if slug != self.market.slug or comment_id != "comment-1":
            return None
        return MarketCommentResponse(
            id="comment-1",
            author="NairobiWatch",
            ageLabel="34m ago",
            body="Rule source is clear.",
            likes=7,
            parentCommentId=None,
            replies=[],
        )

    async def hide_market_comment(
        self, slug: str, *, comment_id: str, moderator_user_id: str
    ) -> MarketCommentResponse | None:
        if slug != self.market.slug or comment_id != "comment-1":
            return None
        return MarketCommentResponse(
            id="comment-1",
            author="NairobiWatch",
            ageLabel="34m ago",
            body="Rule source is clear.",
            likes=6,
            parentCommentId=None,
            replies=[],
        )

    async def restore_market_comment(
        self, slug: str, *, comment_id: str, moderator_user_id: str
    ) -> MarketCommentResponse | None:
        if slug != self.market.slug or comment_id != "comment-1":
            return None
        return MarketCommentResponse(
            id="comment-1",
            author="NairobiWatch",
            ageLabel="34m ago",
            body="Rule source is clear.",
            likes=6,
            parentCommentId=None,
            replies=[],
        )


@dataclass
class FakeAuthenticatedAccount:
    user: object


def build_client(fake_service: FakeMarketCatalogService | None = None) -> TestClient:
    fake_service = fake_service or FakeMarketCatalogService(market=build_market_response())
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


def test_get_market_comments_returns_backend_shape() -> None:
    client = build_client()

    response = client.get("/api/v1/markets/nairobi-governor-bill-sign-before-june/comments")

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["author"] == "NairobiWatch"
    assert payload[0]["likes"] == 6
    assert payload[0]["replies"][0]["parentCommentId"] == "comment-1"


def test_list_admin_market_comments_returns_queue_shape() -> None:
    client = build_client()
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "admin-user"})()
    )

    response = client.get("/api/v1/admin/markets/comments?status=visible&limit=10")

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"][0]["marketSlug"] == "nairobi-governor-bill-sign-before-june"
    assert payload["items"][0]["status"] == "visible"


def test_get_market_holders_returns_backend_shape() -> None:
    client = build_client()

    response = client.get("/api/v1/markets/nairobi-governor-bill-sign-before-june/holders")

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["name"] == "Brian"
    assert payload[0]["side"] == "YES"


def test_create_market_comment_returns_persisted_shape() -> None:
    client = build_client()
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "user-123"})()
    )

    response = client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments",
        json={"body": "This should settle from the official notice only."},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["author"] == "Brian"
    assert payload["body"] == "This should settle from the official notice only."
    assert payload["parentCommentId"] is None


def test_create_market_reply_returns_persisted_shape() -> None:
    client = build_client()
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "user-123"})()
    )

    response = client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments",
        json={
            "body": "Agreed, official county release should decide it.",
            "parentCommentId": "comment-1",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "comment-reply-created"
    assert payload["parentCommentId"] == "comment-1"


def test_create_market_comment_returns_401_when_session_user_is_missing() -> None:
    @dataclass
    class MissingUserMarketCatalogService(FakeMarketCatalogService):
        async def create_market_comment(
            self,
            slug: str,
            *,
            user_id: str,
            body: str,
            parent_comment_id: str | None = None,
        ) -> MarketCommentResponse | None:
            raise LookupError("Sign in again before posting a comment.")

    client = build_client(MissingUserMarketCatalogService(market=build_market_response()))
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "user-123"})()
    )

    response = client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments",
        json={"body": "This should settle from the official notice only."},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Sign in again before posting a comment."


def test_create_market_reply_returns_404_when_parent_comment_is_missing() -> None:
    @dataclass
    class MissingParentReplyMarketCatalogService(FakeMarketCatalogService):
        async def create_market_comment(
            self,
            slug: str,
            *,
            user_id: str,
            body: str,
            parent_comment_id: str | None = None,
        ) -> MarketCommentResponse | None:
            raise MarketCommentNotFoundError("Reply target was not found.")

    client = build_client(MissingParentReplyMarketCatalogService(market=build_market_response()))
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "user-123"})()
    )

    response = client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments",
        json={
            "body": "Replying after moderation should fail.",
            "parentCommentId": "comment-1",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Reply target was not found."


def test_create_market_reply_returns_400_when_reply_depth_is_invalid() -> None:
    @dataclass
    class InvalidDepthReplyMarketCatalogService(FakeMarketCatalogService):
        async def create_market_comment(
            self,
            slug: str,
            *,
            user_id: str,
            body: str,
            parent_comment_id: str | None = None,
        ) -> MarketCommentResponse | None:
            raise MarketCommentValidationError("Replies can only be posted one level deep.")

    client = build_client(InvalidDepthReplyMarketCatalogService(market=build_market_response()))
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "user-123"})()
    )

    response = client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments",
        json={
            "body": "Third level reply should fail.",
            "parentCommentId": "comment-1-reply-1",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Replies can only be posted one level deep."


def test_like_market_comment_returns_updated_shape() -> None:
    client = build_client()
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "user-123"})()
    )

    response = client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments/comment-1/like",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "comment-1"
    assert payload["likes"] == 7


def test_like_market_comment_returns_401_when_session_user_is_missing() -> None:
    @dataclass
    class MissingUserLikeMarketCatalogService(FakeMarketCatalogService):
        async def like_market_comment(
            self, slug: str, *, comment_id: str, user_id: str
        ) -> MarketCommentResponse | None:
            raise LookupError("Sign in again before liking a comment.")

    client = build_client(MissingUserLikeMarketCatalogService(market=build_market_response()))
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "user-123"})()
    )

    response = client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments/comment-1/like",
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Sign in again before liking a comment."


def test_hide_market_comment_returns_403_when_user_lacks_admin_access() -> None:
    @dataclass
    class ForbiddenHideMarketCatalogService(FakeMarketCatalogService):
        async def hide_market_comment(
            self, slug: str, *, comment_id: str, moderator_user_id: str
        ) -> MarketCommentResponse | None:
            raise ValueError("Admin access is required.")

    client = build_client(ForbiddenHideMarketCatalogService(market=build_market_response()))
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "user-123"})()
    )

    response = client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments/comment-1/hide",
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access is required."


def test_list_admin_market_comments_returns_403_when_user_lacks_admin_access() -> None:
    @dataclass
    class ForbiddenAdminQueueMarketCatalogService(FakeMarketCatalogService):
        async def list_admin_market_comments(
            self,
            *,
            admin_user_id: str,
            status_filter: str | None,
            limit: int,
        ) -> AdminMarketCommentQueueResponse:
            raise ValueError("Admin access is required.")

    client = build_client(ForbiddenAdminQueueMarketCatalogService(market=build_market_response()))
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "user-123"})()
    )

    response = client.get("/api/v1/admin/markets/comments?status=visible&limit=10")

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access is required."


def test_list_admin_market_comments_returns_401_when_session_user_is_missing() -> None:
    @dataclass
    class MissingUserAdminQueueMarketCatalogService(FakeMarketCatalogService):
        async def list_admin_market_comments(
            self,
            *,
            admin_user_id: str,
            status_filter: str | None,
            limit: int,
        ) -> AdminMarketCommentQueueResponse:
            raise LookupError("Sign in again before moderating comments.")

    client = build_client(MissingUserAdminQueueMarketCatalogService(market=build_market_response()))
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "admin-user"})()
    )

    response = client.get("/api/v1/admin/markets/comments?status=visible&limit=10")

    assert response.status_code == 401
    assert response.json()["detail"] == "Sign in again before moderating comments."


def test_hide_market_comment_returns_401_when_session_user_is_missing() -> None:
    @dataclass
    class MissingUserHideMarketCatalogService(FakeMarketCatalogService):
        async def hide_market_comment(
            self, slug: str, *, comment_id: str, moderator_user_id: str
        ) -> MarketCommentResponse | None:
            raise LookupError("Sign in again before moderating comments.")

    client = build_client(MissingUserHideMarketCatalogService(market=build_market_response()))
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "admin-user"})()
    )

    response = client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments/comment-1/hide",
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Sign in again before moderating comments."


def test_hide_market_comment_returns_updated_shape_for_admin() -> None:
    client = build_client()
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "admin-user"})()
    )

    response = client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments/comment-1/hide",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "comment-1"
    assert payload["author"] == "NairobiWatch"


def test_restore_market_comment_returns_updated_shape_for_admin() -> None:
    client = build_client()
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "admin-user"})()
    )

    response = client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments/comment-1/restore",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "comment-1"
    assert payload["author"] == "NairobiWatch"


def test_restore_market_comment_returns_403_when_user_lacks_admin_access() -> None:
    @dataclass
    class ForbiddenRestoreMarketCatalogService(FakeMarketCatalogService):
        async def restore_market_comment(
            self, slug: str, *, comment_id: str, moderator_user_id: str
        ) -> MarketCommentResponse | None:
            raise ValueError("Admin access is required.")

    client = build_client(ForbiddenRestoreMarketCatalogService(market=build_market_response()))
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "user-123"})()
    )

    response = client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments/comment-1/restore",
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access is required."


def test_restore_market_comment_returns_401_when_session_user_is_missing() -> None:
    @dataclass
    class MissingUserRestoreMarketCatalogService(FakeMarketCatalogService):
        async def restore_market_comment(
            self, slug: str, *, comment_id: str, moderator_user_id: str
        ) -> MarketCommentResponse | None:
            raise LookupError("Sign in again before moderating comments.")

    client = build_client(MissingUserRestoreMarketCatalogService(market=build_market_response()))
    app.dependency_overrides[get_authenticated_account] = lambda: FakeAuthenticatedAccount(
        user=type("FakeUser", (), {"id": "admin-user"})()
    )

    response = client.post(
        "/api/v1/markets/nairobi-governor-bill-sign-before-june/comments/comment-1/restore",
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Sign in again before moderating comments."
