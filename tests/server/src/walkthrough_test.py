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

        # CreateUser
        _: api_v1_pb2.CreateUserResp = await stub.CreateUser(
            request=api_v1_pb2.CreateUserReq(user_id="test_user1")
        )

        _: api_v1_pb2.CreateUserResp = await stub.CreateUser(
            request=api_v1_pb2.CreateUserReq(user_id="test_user2")
        )

        # CreateClient
        token = _get_token("test_user1")
        create_client_resp: api_v1_pb2.CreateClientResp = await stub.CreateClient(
            request=api_v1_pb2.CreateClientReq(name="test_client"),
            metadata=(("authorization", f"Bearer {token}"),),
        )
        assert create_client_resp.HasField("client_id")
        assert create_client_resp.client_id == 1
        create_client_resp: api_v1_pb2.CreateClientResp = await stub.CreateClient(
            request=api_v1_pb2.CreateClientReq(name="test_client"),
            metadata=(("authorization", f"Bearer {token}"),),
        )
        assert create_client_resp.HasField("client_id")
        assert create_client_resp.client_id == 2

        # GetPendingPatches
        get_pending_patches_resp: api_v1_pb2.GetPendingPatchesResp = (
            await stub.GetPendingPatches(
                request=api_v1_pb2.GetPendingPatchesReq(client_id=1, size=100),
                metadata=(("authorization", f"Bearer {token}"),),
            )
        )
        assert len(get_pending_patches_resp.patches) == 1
        patch = get_pending_patches_resp.patches[0]
        assert patch.client_id == 0
        assert patch.session_id == 0
        assert patch.patch_id == 0
        assert patch.parent_client_id == 0
        assert patch.parent_session_id == 0
        assert patch.parent_patch_id == 0
        assert json.loads(patch.patch) == [
            {"op": "replace", "path": "", "value": {"data": None}}
        ]


def _get_token(user_id: str) -> str:
    return base64.b64encode(
        json.dumps(dict(user_id=user_id), ensure_ascii=False, sort_keys=True).encode(
            "utf-8"
        )
    ).decode("utf-8")
