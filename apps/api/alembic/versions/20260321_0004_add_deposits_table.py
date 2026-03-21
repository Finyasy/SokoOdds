"""add deposits table

Revision ID: 20260321_0004
Revises: 20260320_0003
Create Date: 2026-03-21 00:00:04
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260321_0004"
down_revision = "20260320_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "deposits",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("phone", sa.String(length=16), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("merchant_request_id", sa.String(length=128), nullable=True),
        sa.Column("checkout_request_id", sa.String(length=128), nullable=True),
        sa.Column("customer_message", sa.Text(), nullable=True),
        sa.Column("mpesa_receipt_number", sa.String(length=64), nullable=True),
        sa.Column("result_code", sa.Integer(), nullable=True),
        sa.Column("result_desc", sa.Text(), nullable=True),
        sa.Column("callback_received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("credited_at", sa.DateTime(timezone=True), nullable=True),
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
    )
    op.create_index("ix_deposits_user_id", "deposits", ["user_id"])
    op.create_index("ix_deposits_merchant_request_id", "deposits", ["merchant_request_id"])
    op.create_index("ix_deposits_checkout_request_id", "deposits", ["checkout_request_id"])


def downgrade() -> None:
    op.drop_index("ix_deposits_checkout_request_id", table_name="deposits")
    op.drop_index("ix_deposits_merchant_request_id", table_name="deposits")
    op.drop_index("ix_deposits_user_id", table_name="deposits")
    op.drop_table("deposits")
