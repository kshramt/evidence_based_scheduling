import logging
import os
import pathlib

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import pytest
from httpx import AsyncClient

import api.apps as target


@pytest.mark.asyncio
async def test__users__user_id__data__id(tmp_path: pathlib.Path) -> None:
    target.set_handlers(logging.getLogger(), [tmp_path / "app.log"])
    await target.on_load_hook()
    async with AsyncClient(app=target.app, base_url="http://test") as ac:
        resp = await ac.post("/users", json=dict(body=dict()))
        assert resp.status_code == 200
        resp = await ac.get("/users/1/data")
        assert resp.status_code == 200
        assert resp.json() == {"body": {"data": None}, "etag": 1, "path": "/data/1"}
        resp = await ac.get("/users/1/data/id")
        assert resp.status_code == 200
        data = resp.json()
        assert data["etag"] == 1
