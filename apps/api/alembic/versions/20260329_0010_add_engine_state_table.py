"""add engine state table

Revision ID: 20260329_0010
Revises: 20260329_0009
Create Date: 2026-03-29 00:10:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260329_0010"
down_revision = "20260329_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "engine_state",
        sa.Column("key", sa.String(length=128), primary_key=True),
        sa.Column("value", sa.String(length=255), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("engine_state")
