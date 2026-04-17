"""add market comment likes and moderation

Revision ID: 20260402_0013
Revises: 20260402_0012
Create Date: 2026-04-02 16:20:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260402_0013"
down_revision = "20260402_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("market_comments", sa.Column("hidden_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("market_comments", sa.Column("hidden_by_user_id", sa.String(length=64), nullable=True))
    op.create_table(
        "market_comment_likes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("comment_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "comment_id",
            "user_id",
            name="uq_market_comment_likes_comment_user",
        ),
    )
    op.create_index(
        op.f("ix_market_comment_likes_comment_id"),
        "market_comment_likes",
        ["comment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_market_comment_likes_user_id"),
        "market_comment_likes",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_market_comment_likes_user_id"), table_name="market_comment_likes")
    op.drop_index(op.f("ix_market_comment_likes_comment_id"), table_name="market_comment_likes")
    op.drop_table("market_comment_likes")
    op.drop_column("market_comments", "hidden_by_user_id")
    op.drop_column("market_comments", "hidden_at")
