"""add user feed interactions

Revision ID: 20260329_0011
Revises: 20260329_0010
Create Date: 2026-03-29 23:45:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260329_0011"
down_revision = "20260329_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_feed_interactions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("market_slug", sa.String(length=128), nullable=False),
        sa.Column("viewed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("paused_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("opened_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_interacted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "market_slug",
            name="uq_user_feed_interactions_user_market_slug",
        ),
    )
    op.create_index(
        op.f("ix_user_feed_interactions_user_id"),
        "user_feed_interactions",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_feed_interactions_market_slug"),
        "user_feed_interactions",
        ["market_slug"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_user_feed_interactions_market_slug"), table_name="user_feed_interactions"
    )
    op.drop_index(op.f("ix_user_feed_interactions_user_id"), table_name="user_feed_interactions")
    op.drop_table("user_feed_interactions")
