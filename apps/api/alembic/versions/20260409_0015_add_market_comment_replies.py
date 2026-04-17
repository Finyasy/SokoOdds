"""add market comment replies

Revision ID: 20260409_0015
Revises: 20260409_0014
Create Date: 2026-04-09 18:10:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260409_0015"
down_revision = "20260409_0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "market_comments",
        sa.Column("parent_comment_id", sa.String(length=36), nullable=True),
    )
    op.create_index(
        op.f("ix_market_comments_parent_comment_id"),
        "market_comments",
        ["parent_comment_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_market_comments_parent_comment_id"), table_name="market_comments")
    op.drop_column("market_comments", "parent_comment_id")
