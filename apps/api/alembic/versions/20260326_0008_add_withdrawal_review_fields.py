"""add withdrawal review fields

Revision ID: 20260326_0008
Revises: 20260321_0007
Create Date: 2026-03-26 20:15:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260326_0008"
down_revision = "20260321_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "withdrawals",
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "withdrawals",
        sa.Column("reviewed_by_user_id", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("withdrawals", "reviewed_by_user_id")
    op.drop_column("withdrawals", "reviewed_at")
