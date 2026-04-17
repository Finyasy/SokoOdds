"""harden market comment integrity

Revision ID: 20260409_0014
Revises: 20260402_0013
Create Date: 2026-04-09 15:45:00.000000
"""

from __future__ import annotations

from alembic import op

revision = "20260409_0014"
down_revision = "20260402_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("market_comments", recreate="auto") as batch_op:
        batch_op.create_check_constraint(
            "ck_market_comments_likes_nonnegative",
            "likes >= 0",
        )
        batch_op.create_foreign_key(
            "fk_market_comments_market_id",
            "markets",
            ["market_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_foreign_key(
            "fk_market_comments_user_id",
            "users",
            ["user_id"],
            ["id"],
            ondelete="RESTRICT",
        )
        batch_op.create_foreign_key(
            "fk_market_comments_hidden_by_user_id",
            "users",
            ["hidden_by_user_id"],
            ["id"],
            ondelete="SET NULL",
        )

    with op.batch_alter_table("market_comment_likes", recreate="auto") as batch_op:
        batch_op.create_foreign_key(
            "fk_market_comment_likes_comment_id",
            "market_comments",
            ["comment_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_foreign_key(
            "fk_market_comment_likes_user_id",
            "users",
            ["user_id"],
            ["id"],
            ondelete="RESTRICT",
        )


def downgrade() -> None:
    with op.batch_alter_table("market_comment_likes", recreate="auto") as batch_op:
        batch_op.drop_constraint(
            "fk_market_comment_likes_user_id",
            type_="foreignkey",
        )
        batch_op.drop_constraint(
            "fk_market_comment_likes_comment_id",
            type_="foreignkey",
        )

    with op.batch_alter_table("market_comments", recreate="auto") as batch_op:
        batch_op.drop_constraint(
            "fk_market_comments_hidden_by_user_id",
            type_="foreignkey",
        )
        batch_op.drop_constraint(
            "fk_market_comments_user_id",
            type_="foreignkey",
        )
        batch_op.drop_constraint(
            "fk_market_comments_market_id",
            type_="foreignkey",
        )
        batch_op.drop_constraint(
            "ck_market_comments_likes_nonnegative",
            type_="check",
        )
