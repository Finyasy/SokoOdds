from __future__ import annotations

from hashlib import sha256
from secrets import token_urlsafe


def normalize_phone(value: str) -> str:
    digits = "".join(character for character in value if character.isdigit())

    if digits.startswith("254") and len(digits) >= 12:
        return f"0{digits[3:12]}"

    if digits.startswith("7") and len(digits) >= 9:
        return f"0{digits[:9]}"

    if digits.startswith("0") and len(digits) >= 10:
        return digits[:10]

    return digits[:10]


def create_session_token() -> str:
    return token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def extract_bearer_token(authorization_header: str | None) -> str | None:
    if not authorization_header:
        return None

    scheme, _, token = authorization_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None

    return token.strip()
