from __future__ import annotations

import json
from dataclasses import dataclass
from hashlib import sha256
from threading import Lock
from typing import Any

from fastapi import Request


@dataclass(frozen=True)
class IdempotencyRecord:
    scope: str
    key: str
    request_hash: str
    status_code: int
    response_body: dict[str, Any]


class InMemoryIdempotencyStore:
    def __init__(self) -> None:
        self._records: dict[tuple[str, str], IdempotencyRecord] = {}
        self._lock = Lock()

    def get(self, scope: str, key: str) -> IdempotencyRecord | None:
        return self._records.get((scope, key))

    def save(self, record: IdempotencyRecord) -> None:
        with self._lock:
            self._records[(record.scope, record.key)] = record

    def clear(self) -> None:
        with self._lock:
            self._records.clear()


def build_scope(*, user_id: str, route: str) -> str:
    return f"{user_id}:{route}"


def make_request_hash(payload: dict[str, Any]) -> str:
    normalized = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return sha256(normalized.encode("utf-8")).hexdigest()


def get_idempotency_store(request: Request) -> InMemoryIdempotencyStore:
    return request.app.state.idempotency_store
