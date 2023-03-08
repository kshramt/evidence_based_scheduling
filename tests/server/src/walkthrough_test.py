import base64
import collections.abc
import json
import os

import google.protobuf.json_format
import google.protobuf.timestamp_pb2
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
        client_id_1 = 1
        client_id_2 = 2
        assert create_client_resp.HasField("client_id")
        assert create_client_resp.client_id == client_id_1
        create_client_resp: api_v1_pb2.CreateClientResp = await stub.CreateClient(
            request=api_v1_pb2.CreateClientReq(name="test_client"),
            metadata=(("authorization", f"Bearer {token}"),),
        )
        assert create_client_resp.HasField("client_id")
        assert create_client_resp.client_id == client_id_2

        # GetPendingPatches
        get_pending_patches_resp: api_v1_pb2.GetPendingPatchesResp = (
            await stub.GetPendingPatches(
                request=api_v1_pb2.GetPendingPatchesReq(
                    client_id=client_id_1, size=100
                ),
                metadata=(("authorization", f"Bearer {token}"),),
            )
        )
        assert len(get_pending_patches_resp.patches) == 1
        patch_0 = get_pending_patches_resp.patches[0]
        assert patch_0.client_id == 0
        assert patch_0.session_id == 0
        assert patch_0.patch_id == 0
        assert patch_0.parent_client_id == 0
        assert patch_0.parent_session_id == 0
        assert patch_0.parent_patch_id == 0
        assert json.loads(patch_0.patch) == [
            {"op": "replace", "path": "", "value": {"data": None}}
        ]

        # DeletePendingPatches
        delete_pending_patches_resp: api_v1_pb2.DeletePendingPatchesResp = (
            await stub.DeletePendingPatches(
                request=api_v1_pb2.DeletePendingPatchesReq(
                    client_id=client_id_1,
                    patches=[
                        api_v1_pb2.DeletePendingPatchesReq.Patch(
                            client_id=patch.client_id,
                            session_id=patch.session_id,
                            patch_id=patch.patch_id,
                        )
                        for patch in get_pending_patches_resp.patches
                    ],
                ),
                metadata=(("authorization", f"Bearer {token}"),),
            )
        )

        # GetPendingPatches again
        get_pending_patches_resp: api_v1_pb2.GetPendingPatchesResp = (
            await stub.GetPendingPatches(
                request=api_v1_pb2.GetPendingPatchesReq(
                    client_id=client_id_1, size=100
                ),
                metadata=(("authorization", f"Bearer {token}"),),
            )
        )
        assert len(get_pending_patches_resp.patches) == 0

        # CreatePatches
        now = google.protobuf.timestamp_pb2.Timestamp()
        now.GetCurrentTime()
        patch_1 = api_v1_pb2.Patch(
            client_id=client_id_1,
            session_id=1,
            patch_id=1,
            patch=json.dumps(
                [
                    {
                        "op": "replace",
                        "path": "/data",
                        "value": {"nodes": {"a": {"text": "test_text"}}},
                    }
                ]
            ),
            parent_client_id=0,
            parent_session_id=0,
            parent_patch_id=0,
            created_at=now,
        )

        create_patches_resp: api_v1_pb2.CreatePatchesResp = await stub.CreatePatches(
            request=api_v1_pb2.CreatePatchesReq(patches=[patch_1]),
            metadata=(("authorization", f"Bearer {token}"),),
        )
        # GetPendingPatches from client_id_1
        get_pending_patches_resp: api_v1_pb2.GetPendingPatchesResp = (
            await stub.GetPendingPatches(
                request=api_v1_pb2.GetPendingPatchesReq(
                    client_id=client_id_1, size=100
                ),
                metadata=(("authorization", f"Bearer {token}"),),
            )
        )
        assert len(get_pending_patches_resp.patches) == 0
        # GetPendingPatches from client_id_2
        get_pending_patches_resp: api_v1_pb2.GetPendingPatchesResp = (
            await stub.GetPendingPatches(
                request=api_v1_pb2.GetPendingPatchesReq(
                    client_id=client_id_2, size=100
                ),
                metadata=(("authorization", f"Bearer {token}"),),
            )
        )
        assert len(get_pending_patches_resp.patches) == 2
        actual_0, actual_1 = sorted(
            get_pending_patches_resp.patches, key=lambda p: p.created_at.ToDatetime()
        )
        assert actual_0 == patch_0
        assert actual_1 == patch_1


def _get_token(user_id: str) -> str:
    return base64.b64encode(
        json.dumps(dict(user_id=user_id), ensure_ascii=False, sort_keys=True).encode(
            "utf-8"
        )
    ).decode("utf-8")
