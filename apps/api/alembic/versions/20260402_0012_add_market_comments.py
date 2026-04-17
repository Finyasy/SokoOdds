"""add market comments

Revision ID: 20260402_0012
Revises: 20260329_0011
Create Date: 2026-04-02 15:10:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260402_0012"
down_revision = "20260329_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "market_comments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("market_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("likes", sa.Integer(), nullable=False, server_default="0"),
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
    )
    op.create_index(op.f("ix_market_comments_market_id"), "market_comments", ["market_id"], unique=False)
    op.create_index(op.f("ix_market_comments_user_id"), "market_comments", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_market_comments_user_id"), table_name="market_comments")
    op.drop_index(op.f("ix_market_comments_market_id"), table_name="market_comments")
    op.drop_table("market_comments")
