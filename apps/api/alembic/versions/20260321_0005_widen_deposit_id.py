"""widen deposit id

Revision ID: 20260321_0005
Revises: 20260321_0004
Create Date: 2026-03-21 00:30:05
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260321_0005"
down_revision = "20260321_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("deposits", recreate="auto") as batch_op:
        batch_op.alter_column(
            "id",
            existing_type=sa.String(length=36),
            type_=sa.String(length=64),
            existing_nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("deposits", recreate="auto") as batch_op:
        batch_op.alter_column(
            "id",
            existing_type=sa.String(length=64),
            type_=sa.String(length=36),
            existing_nullable=False,
        )
