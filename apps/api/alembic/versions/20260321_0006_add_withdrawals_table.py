"""add withdrawals table

Revision ID: 20260321_0006
Revises: 20260321_0005
Create Date: 2026-03-21 02:10:06
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260321_0006"
down_revision = "20260321_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "withdrawals",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("phone", sa.String(length=16), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("requires_review", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("conversation_id", sa.String(length=128), nullable=True),
        sa.Column("originator_conversation_id", sa.String(length=128), nullable=True),
        sa.Column("result_code", sa.Integer(), nullable=True),
        sa.Column("result_desc", sa.Text(), nullable=True),
        sa.Column("mpesa_receipt_number", sa.String(length=64), nullable=True),
        sa.Column("callback_received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
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
    op.create_index("ix_withdrawals_user_id", "withdrawals", ["user_id"])
    op.create_index("ix_withdrawals_conversation_id", "withdrawals", ["conversation_id"])
    op.create_index(
        "ix_withdrawals_originator_conversation_id",
        "withdrawals",
        ["originator_conversation_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_withdrawals_originator_conversation_id", table_name="withdrawals")
    op.drop_index("ix_withdrawals_conversation_id", table_name="withdrawals")
    op.drop_index("ix_withdrawals_user_id", table_name="withdrawals")
    op.drop_table("withdrawals")
