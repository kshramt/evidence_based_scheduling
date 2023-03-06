import base64
import collections.abc
import json
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

        _: api_v1_pb2.CreateUserResp = await stub.CreateUser(
            request=api_v1_pb2.CreateUserReq(user_id="test_user1")
        )

        _: api_v1_pb2.CreateUserResp = await stub.CreateUser(
            request=api_v1_pb2.CreateUserReq(user_id="test_user2")
        )

        token = _get_token("test_user1")
        resp: api_v1_pb2.CreateClientResp = await stub.CreateClient(
            request=api_v1_pb2.CreateClientReq(name="test_client"),
            metadata=(("authorization", f"Bearer {token}"),),
        )
        assert resp.HasField("client_id")
        assert resp.client_id == 1
        resp: api_v1_pb2.CreateClientResp = await stub.CreateClient(
            request=api_v1_pb2.CreateClientReq(name="test_client"),
            metadata=(("authorization", f"Bearer {token}"),),
        )
        assert resp.HasField("client_id")
        assert resp.client_id == 2


def _get_token(user_id: str) -> str:
    return base64.b64encode(
        json.dumps(dict(user_id=user_id), ensure_ascii=False, sort_keys=True).encode(
            "utf-8"
        )
    ).decode("utf-8")
