from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest


def _run_alembic_upgrade(database_path: Path) -> None:
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite+aiosqlite:///{database_path}"
    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "alembic.ini", "upgrade", "head"],
        cwd=Path(__file__).resolve().parents[1],
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )


def _sqlite_connection(database_path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(database_path)
    connection.execute("PRAGMA foreign_keys=ON")
    return connection


def test_market_comment_migrations_create_expected_schema(tmp_path: Path) -> None:
    database_path = tmp_path / "migrated-market-comments.db"
    _run_alembic_upgrade(database_path)

    with _sqlite_connection(database_path) as connection:
        revision = connection.execute("SELECT version_num FROM alembic_version").fetchone()
        assert revision == ("20260409_0016",)

        market_comments_columns = {
            row[1] for row in connection.execute("PRAGMA table_info('market_comments')").fetchall()
        }
        assert "parent_comment_id" in market_comments_columns
        assert "hidden_by_user_id" in market_comments_columns

        market_comment_foreign_keys = {
            (row[3], row[2], row[4], row[6])
            for row in connection.execute("PRAGMA foreign_key_list('market_comments')").fetchall()
        }
        assert ("market_id", "markets", "id", "CASCADE") in market_comment_foreign_keys
        assert ("user_id", "users", "id", "RESTRICT") in market_comment_foreign_keys
        assert ("hidden_by_user_id", "users", "id", "SET NULL") in market_comment_foreign_keys

        market_comment_likes_foreign_keys = {
            (row[3], row[2], row[4], row[6])
            for row in connection.execute(
                "PRAGMA foreign_key_list('market_comment_likes')"
            ).fetchall()
        }
        assert ("comment_id", "market_comments", "id", "CASCADE") in (
            market_comment_likes_foreign_keys
        )
        assert ("user_id", "users", "id", "RESTRICT") in market_comment_likes_foreign_keys

        create_sql = connection.execute(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'market_comments'"
        ).fetchone()
        assert create_sql is not None
        assert "CHECK (likes >= 0)" in create_sql[0]

        follow_tables = connection.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type = 'table' AND name = 'user_comment_thread_follows'"
        ).fetchone()
        assert follow_tables == ("user_comment_thread_follows",)


def test_market_comment_migrations_enforce_integrity_rules(tmp_path: Path) -> None:
    database_path = tmp_path / "migrated-market-comment-integrity.db"
    _run_alembic_upgrade(database_path)

    with _sqlite_connection(database_path) as connection:
        connection.execute(
            """
            INSERT INTO markets (
                id, slug, sort_order, category, status, question, short_label, summary, region,
                yes_price, no_price, volume_kes, liquidity_kes, closes_at, resolution_source,
                rule_highlights, trust_notes, order_book, trades
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "market-1",
                "nairobi-governor-bill-sign-before-june",
                1,
                "Politics",
                "Open",
                "Will Nairobi county sign the urban mobility bill before June 30, 2026?",
                "Nairobi mobility bill before June 30?",
                "A seeded politics market.",
                "Kenya Public Affairs",
                "0.6200",
                "0.3800",
                "486000.00",
                "190000.00",
                "2026-06-30T18:00:00+03:00",
                "Official county release",
                '["Rule 1"]',
                '["Trust note 1"]',
                '{"yesBids":[],"noBids":[]}',
                "[]",
            ),
        )
        connection.execute(
            "INSERT INTO users (id, first_name, phone, kyc_status) VALUES (?, ?, ?, ?)",
            ("user-1", "Brian", "0796000001", "not_started"),
        )
        connection.execute(
            "INSERT INTO users (id, first_name, phone, kyc_status) VALUES (?, ?, ?, ?)",
            ("admin-user", "Admin", "0712345678", "approved"),
        )
        connection.execute(
            """
            INSERT INTO market_comments (
                id, market_id, user_id, body, likes, hidden_at, hidden_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "comment-1",
                "market-1",
                "user-1",
                "Comment created against migrated schema.",
                0,
                "2026-04-09T12:00:00+03:00",
                "admin-user",
            ),
        )
        connection.commit()

        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(
                """
                INSERT INTO market_comments (id, market_id, user_id, body, likes)
                VALUES (?, ?, ?, ?, ?)
                """,
                ("comment-negative", "market-1", "user-1", "Invalid likes.", -1),
            )

        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(
                """
                INSERT INTO market_comment_likes (id, comment_id, user_id)
                VALUES (?, ?, ?)
                """,
                ("like-missing-comment", "missing-comment", "user-1"),
            )

        connection.execute("DELETE FROM users WHERE id = ?", ("admin-user",))
        connection.commit()

        hidden_by_user_id = connection.execute(
            "SELECT hidden_by_user_id FROM market_comments WHERE id = ?",
            ("comment-1",),
        ).fetchone()
        assert hidden_by_user_id == (None,)
