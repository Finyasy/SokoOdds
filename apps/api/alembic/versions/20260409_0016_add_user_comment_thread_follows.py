"""add user comment thread follows

Revision ID: 20260409_0016
Revises: 20260409_0015
Create Date: 2026-04-09 22:20:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260409_0016"
down_revision = "20260409_0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_comment_thread_follows",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("market_slug", sa.String(length=128), nullable=False),
        sa.Column("comment_id", sa.String(length=36), nullable=False),
        sa.Column("last_seen_reply_count", sa.Integer(), nullable=False),
        sa.Column("auto_followed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "market_slug",
            "comment_id",
            name="uq_user_comment_thread_follows_user_market_comment",
        ),
    )
    op.create_index(
        op.f("ix_user_comment_thread_follows_user_id"),
        "user_comment_thread_follows",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_comment_thread_follows_market_slug"),
        "user_comment_thread_follows",
        ["market_slug"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_comment_thread_follows_comment_id"),
        "user_comment_thread_follows",
        ["comment_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_user_comment_thread_follows_comment_id"),
        table_name="user_comment_thread_follows",
    )
    op.drop_index(
        op.f("ix_user_comment_thread_follows_market_slug"),
        table_name="user_comment_thread_follows",
    )
    op.drop_index(
        op.f("ix_user_comment_thread_follows_user_id"),
        table_name="user_comment_thread_follows",
    )
    op.drop_table("user_comment_thread_follows")
