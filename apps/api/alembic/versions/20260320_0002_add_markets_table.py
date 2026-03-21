"""add markets table

Revision ID: 20260320_0002
Revises: 20260319_0001
Create Date: 2026-03-20 00:00:02
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260320_0002"
down_revision = "20260319_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "markets",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("short_label", sa.String(length=160), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("region", sa.String(length=96), nullable=False),
        sa.Column("yes_price", sa.Numeric(5, 4), nullable=False),
        sa.Column("no_price", sa.Numeric(5, 4), nullable=False),
        sa.Column("volume_kes", sa.Numeric(18, 2), nullable=False),
        sa.Column("liquidity_kes", sa.Numeric(18, 2), nullable=False),
        sa.Column("closes_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolution_source", sa.Text(), nullable=False),
        sa.Column("rule_highlights", sa.JSON(), nullable=False),
        sa.Column("trust_notes", sa.JSON(), nullable=False),
        sa.Column("order_book", sa.JSON(), nullable=False),
        sa.Column("trades", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("slug", name="uq_markets_slug"),
    )
    op.create_index("ix_markets_slug", "markets", ["slug"])
    op.create_index("ix_markets_sort_order", "markets", ["sort_order"])


def downgrade() -> None:
    op.drop_index("ix_markets_sort_order", table_name="markets")
    op.drop_index("ix_markets_slug", table_name="markets")
    op.drop_table("markets")
