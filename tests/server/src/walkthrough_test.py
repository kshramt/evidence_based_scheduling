import collections.abc
import os

import httpx
import pytest


@pytest.mark.asyncio
async def test_walkthrough(
    compose_up: None,
    envoy_waiter: collections.abc.Awaitable[None],
    my_host: str,
) -> None:
    await envoy_waiter
    async with httpx.AsyncClient() as client:
        assert await client.get(
            f"http://{my_host}:{os.environ['ENVOY_HTTP_PORT']}/app/"
        )
