"""add trades positions and order fill tracking

Revision ID: 20260329_0009
Revises: 20260326_0008
Create Date: 2026-03-29 00:09:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260329_0009"
down_revision = "20260326_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("filled_quantity", sa.Numeric(18, 2), nullable=False, server_default="0.00"),
    )
    op.add_column(
        "orders",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "trades",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("market_id", sa.String(length=64), nullable=False),
        sa.Column("buyer_id", sa.String(length=64), nullable=False),
        sa.Column("seller_id", sa.String(length=64), nullable=False),
        sa.Column("side", sa.String(length=8), nullable=False),
        sa.Column("price", sa.Numeric(5, 4), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 2), nullable=False),
        sa.Column("notional_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("engine_sequence", sa.Integer(), nullable=True),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "market_id",
            "engine_sequence",
            name="uq_trades_market_engine_sequence",
        ),
    )
    op.create_index("ix_trades_market_id", "trades", ["market_id"])
    op.create_index("ix_trades_buyer_id", "trades", ["buyer_id"])
    op.create_index("ix_trades_seller_id", "trades", ["seller_id"])

    op.create_table(
        "positions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("market_id", sa.String(length=64), nullable=False),
        sa.Column("side", sa.String(length=8), nullable=False),
        sa.Column("shares", sa.Numeric(18, 2), nullable=False),
        sa.Column("average_entry_price", sa.Numeric(5, 4), nullable=False),
        sa.Column("realized_pnl", sa.Numeric(18, 2), nullable=False, server_default="0.00"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "user_id",
            "market_id",
            "side",
            name="uq_positions_user_market_side",
        ),
    )
    op.create_index("ix_positions_user_id", "positions", ["user_id"])
    op.create_index("ix_positions_market_id", "positions", ["market_id"])

    with op.batch_alter_table("orders", recreate="auto") as batch_op:
        batch_op.alter_column("filled_quantity", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_positions_market_id", table_name="positions")
    op.drop_index("ix_positions_user_id", table_name="positions")
    op.drop_table("positions")

    op.drop_index("ix_trades_seller_id", table_name="trades")
    op.drop_index("ix_trades_buyer_id", table_name="trades")
    op.drop_index("ix_trades_market_id", table_name="trades")
    op.drop_table("trades")

    op.drop_column("orders", "updated_at")
    op.drop_column("orders", "filled_quantity")
