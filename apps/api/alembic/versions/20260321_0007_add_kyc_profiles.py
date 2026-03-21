"""add kyc profiles

Revision ID: 20260321_0007
Revises: 20260321_0006
Create Date: 2026-03-21 18:20:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260321_0007"
down_revision: str | None = "20260321_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "kyc_status",
            sa.String(length=32),
            nullable=False,
            server_default="not_started",
        ),
    )
    op.create_table(
        "kyc_profiles",
        sa.Column("user_id", sa.String(length=64), primary_key=True, nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("legal_name", sa.String(length=120), nullable=False),
        sa.Column("national_id_number", sa.String(length=32), nullable=False),
        sa.Column("date_of_birth", sa.String(length=10), nullable=False),
        sa.Column(
            "document_type",
            sa.String(length=32),
            nullable=False,
            server_default="national_id",
        ),
        sa.Column("document_reference", sa.String(length=255), nullable=False),
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by_user_id", sa.String(length=64), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("kyc_profiles")
    op.drop_column("users", "kyc_status")
