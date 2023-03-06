import collections.abc
import os

import grpc
import httpx
import pytest

from src.gen import api_v1_pb2, api_v1_pb2_grpc


@pytest.mark.asyncio
async def test_walkthrough(
    compose_up: None,
    envoy_waiter: collections.abc.Awaitable[None],
    my_host: str,
) -> None:
    await envoy_waiter
    async with httpx.AsyncClient() as client:
        pass
        assert await client.get(
            f"http://{my_host}:{os.environ['ENVOY_HTTP_PORT']}/app/"
        )

    # os.environ["GRPC_TRACE"] = "all"
    # os.environ["GRPC_VERBOSITY"] = "DEBUG"
    async with grpc.aio.insecure_channel(
        f"dns:///{my_host}:{os.environ['ENVOY_GRPC_PORT']}"
    ) as channel:
        stub = api_v1_pb2_grpc.ApiStub(channel)
        resp: api_v1_pb2.CreateUserResp = await stub.CreateUser(
            api_v1_pb2.CreateUserReq(user_id="test_user")
        )
