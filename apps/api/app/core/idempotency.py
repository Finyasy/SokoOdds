from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Any
from uuid import uuid4

from app.models import IdempotencyKey
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class IdempotencyConflictError(Exception):
    pass


@dataclass(frozen=True)
class IdempotentResponse:
    status_code: int
    response_body: dict[str, Any]
    idempotency_status: str


def make_request_hash(payload: dict[str, Any]) -> str:
    normalized = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return sha256(normalized.encode("utf-8")).hexdigest()


async def get_idempotency_record(
    session: AsyncSession,
    *,
    user_id: str,
    route: str,
    idempotency_key: str,
) -> IdempotencyKey | None:
    result = await session.execute(
        select(IdempotencyKey).where(
            IdempotencyKey.user_id == user_id,
            IdempotencyKey.route == route,
            IdempotencyKey.idempotency_key == idempotency_key,
        )
    )
    return result.scalar_one_or_none()


def replay_idempotent_response(
    record: IdempotencyKey,
    *,
    request_hash: str,
) -> IdempotentResponse:
    if record.request_hash != request_hash:
        raise IdempotencyConflictError(
            "This idempotency key was already used with a different payload."
        )

    return IdempotentResponse(
        status_code=record.response_status,
        response_body=record.response_body,
        idempotency_status="replayed",
    )


def build_idempotency_record(
    *,
    user_id: str,
    route: str,
    idempotency_key: str,
    request_hash: str,
    status_code: int,
    response_body: dict[str, Any],
    ttl: timedelta,
) -> IdempotencyKey:
    return IdempotencyKey(
        id=str(uuid4()),
        user_id=user_id,
        route=route,
        idempotency_key=idempotency_key,
        request_hash=request_hash,
        response_status=status_code,
        response_body=response_body,
        expires_at=datetime.now(UTC) + ttl,
    )
