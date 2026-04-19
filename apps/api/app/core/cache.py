from collections.abc import Awaitable, Callable
from typing import TypeVar

from pydantic import BaseModel
from redis.asyncio import Redis

T = TypeVar("T", bound=BaseModel)


async def get_or_set_json(
    redis: Redis,
    key: str,
    ttl_seconds: int,
    model: type[T],
    fetch: Callable[[], Awaitable[T]],
) -> T:
    cached = await redis.get(key)
    if cached is not None:
        return model.model_validate_json(cached)
    value = await fetch()
    await redis.set(key, value.model_dump_json(), ex=ttl_seconds)
    return value
