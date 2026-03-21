from app.core.config import settings
from redis.asyncio import Redis


def create_redis_client() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)  # type: ignore[no-any-return]
