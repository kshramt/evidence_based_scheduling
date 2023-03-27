import base64
import collections.abc
import json
import os

import google.protobuf.json_format
import google.protobuf.timestamp_pb2
import grpc
import httpx
import pytest

from src.gen.api.v1 import api_pb2, api_pb2_grpc


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
        stub = api_pb2_grpc.ApiServiceStub(channel)

        # FakeIdpCreateUser
        fake_idp_create_user_resp: api_pb2.FakeIdpCreateUserResponse = (
            await stub.FakeIdpCreateUser(
                request=api_pb2.FakeIdpCreateUserRequest(
                    name="test_user1",
                )
            )
        )
        assert fake_idp_create_user_resp.HasField("token")
        assert fake_idp_create_user_resp.token.HasField("user_id")
        fake_idp_create_user_resp2: api_pb2.FakeIdpCreateUserResponse = (
            await stub.FakeIdpCreateUser(
                request=api_pb2.FakeIdpCreateUserRequest(
                    name="test_user2",
                )
            )
        )
        assert fake_idp_create_user_resp2.HasField("token")
        assert fake_idp_create_user_resp2.token.HasField("user_id")
        assert fake_idp_create_user_resp.token.user_id != fake_idp_create_user_resp2.token.user_id

        # FakeIdpGetIdToken
        fake_idp_get_id_token_resp: api_pb2.FakeIdpGetIdTokenResponse = (
            await stub.FakeIdpGetIdToken(
                request=api_pb2.FakeIdpGetIdTokenRequest(
                    name="test_user1",
                )
            )
        )
        assert fake_idp_get_id_token_resp.HasField("token")
        assert fake_idp_get_id_token_resp.token.HasField("user_id")
        assert fake_idp_create_user_resp.token.user_id == fake_idp_get_id_token_resp.token.user_id

        # FakeIdpCreateUser calls CreateUser via a "distributed transaction".
        # # CreateUser
        # _: api_pb2.CreateUserResponse = await stub.CreateUser(
        #     request=api_pb2.CreateUserRequest(user_id=fake_idp_get_id_token_resp.token.user_id)
        # )

        # _: api_pb2.CreateUserResponse = await stub.CreateUser(
        #     request=api_pb2.CreateUserRequest(user_id=fake_idp_create_user_resp2.token.user_id)
        # )

        # CreateClient
        token = _get_token(fake_idp_get_id_token_resp.token.user_id)
        create_client_resp: api_pb2.CreateClientResponse = await stub.CreateClient(
            request=api_pb2.CreateClientRequest(name="test_client1"),
            metadata=(("authorization", f"Bearer {token}"),),
        )
        client_id_1 = 1
        client_id_2 = 2
        assert create_client_resp.HasField("client_id")
        assert create_client_resp.client_id == client_id_1
        create_client_resp: api_pb2.CreateClientResponse = await stub.CreateClient(
            request=api_pb2.CreateClientRequest(name="test_client2"),
            metadata=(("authorization", f"Bearer {token}"),),
        )
        assert create_client_resp.HasField("client_id")
        assert create_client_resp.client_id == client_id_2

        # GetPendingPatches
        get_pending_patches_resp: api_pb2.GetPendingPatchesResponse = (
            await stub.GetPendingPatches(
                request=api_pb2.GetPendingPatchesRequest(
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
        delete_pending_patches_resp: api_pb2.DeletePendingPatchesResponse = (
            await stub.DeletePendingPatches(
                request=api_pb2.DeletePendingPatchesRequest(
                    client_id=client_id_1,
                    patches=[
                        api_pb2.DeletePendingPatchesRequest.Patch(
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
        get_pending_patches_resp: api_pb2.GetPendingPatchesResponse = (
            await stub.GetPendingPatches(
                request=api_pb2.GetPendingPatchesRequest(
                    client_id=client_id_1, size=100
                ),
                metadata=(("authorization", f"Bearer {token}"),),
            )
        )
        assert len(get_pending_patches_resp.patches) == 0

        # CreatePatches
        now = google.protobuf.timestamp_pb2.Timestamp()
        now.GetCurrentTime()
        patch_1 = api_pb2.Patch(
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

        create_patches_resp: api_pb2.CreatePatchesResponse = (
            await stub.CreatePatches(
                request=api_pb2.CreatePatchesRequest(patches=[patch_1]),
                metadata=(("authorization", f"Bearer {token}"),),
            )
        )
        # GetPendingPatches from client_id_1
        get_pending_patches_resp: api_pb2.GetPendingPatchesResponse = (
            await stub.GetPendingPatches(
                request=api_pb2.GetPendingPatchesRequest(
                    client_id=client_id_1, size=100
                ),
                metadata=(("authorization", f"Bearer {token}"),),
            )
        )
        assert len(get_pending_patches_resp.patches) == 0
        # GetPendingPatches from client_id_2
        get_pending_patches_resp: api_pb2.GetPendingPatchesResponse = (
            await stub.GetPendingPatches(
                request=api_pb2.GetPendingPatchesRequest(
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

        # GetHead
        get_current_patch_id_resp: api_pb2.GetHeadResponse = await stub.GetHead(
            request=api_pb2.GetHeadRequest(client_id=client_id_1),
            metadata=(("authorization", f"Bearer {token}"),),
        )
        assert get_current_patch_id_resp.HasField("client_id")
        assert get_current_patch_id_resp.client_id == 0
        assert get_current_patch_id_resp.HasField("session_id")
        assert get_current_patch_id_resp.session_id == 0
        assert get_current_patch_id_resp.HasField("patch_id")
        assert get_current_patch_id_resp.patch_id == 0
        assert get_current_patch_id_resp.HasField("created_at")
        assert get_current_patch_id_resp.HasField("name")
        assert get_current_patch_id_resp.name == "System"

        # UpdateHeadIfNotModified
        update_current_patch_id_if_not_modified_resp: api_pb2.UpdateHeadIfNotModifiedResponse = await stub.UpdateHeadIfNotModified(
            request=api_pb2.UpdateHeadIfNotModifiedRequest(
                client_id=client_id_1,
                session_id=1,
                patch_id=1,
                prev_client_id=100,
                prev_session_id=100,
                prev_patch_id=100,
            ),
            metadata=(("authorization", f"Bearer {token}"),),
        )
        assert update_current_patch_id_if_not_modified_resp.HasField("updated")
        assert update_current_patch_id_if_not_modified_resp.updated == False
        get_current_patch_id_resp: api_pb2.GetHeadResponse = await stub.GetHead(
            request=api_pb2.GetHeadRequest(client_id=client_id_1),
            metadata=(("authorization", f"Bearer {token}"),),
        )
        assert get_current_patch_id_resp.HasField("client_id")
        assert get_current_patch_id_resp.client_id == 0
        assert get_current_patch_id_resp.HasField("session_id")
        assert get_current_patch_id_resp.session_id == 0
        assert get_current_patch_id_resp.HasField("patch_id")
        assert get_current_patch_id_resp.patch_id == 0

        update_current_patch_id_if_not_modified_resp: api_pb2.UpdateHeadIfNotModifiedResponse = await stub.UpdateHeadIfNotModified(
            request=api_pb2.UpdateHeadIfNotModifiedRequest(
                client_id=client_id_1,
                session_id=1,
                patch_id=1,
                prev_client_id=0,
                prev_session_id=0,
                prev_patch_id=0,
            ),
            metadata=(("authorization", f"Bearer {token}"),),
        )
        assert update_current_patch_id_if_not_modified_resp.HasField("updated")
        assert update_current_patch_id_if_not_modified_resp.updated == True
        get_current_patch_id_resp: api_pb2.GetHeadResponse = await stub.GetHead(
            request=api_pb2.GetHeadRequest(client_id=client_id_1),
            metadata=(("authorization", f"Bearer {token}"),),
        )
        assert get_current_patch_id_resp.HasField("client_id")
        assert get_current_patch_id_resp.client_id == client_id_1
        assert get_current_patch_id_resp.HasField("session_id")
        assert get_current_patch_id_resp.session_id == 1
        assert get_current_patch_id_resp.HasField("patch_id")
        assert get_current_patch_id_resp.patch_id == 1
        assert get_current_patch_id_resp.HasField("created_at")
        assert get_current_patch_id_resp.HasField("name")
        assert get_current_patch_id_resp.name == "test_client1"


def _get_token(user_id: str) -> str:
    return base64.b64encode(
        json.dumps(dict(user_id=user_id), ensure_ascii=False, sort_keys=True).encode(
            "utf-8"
        )
    ).decode("utf-8")
