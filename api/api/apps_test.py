import logging
import os

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import pytest
from httpx import AsyncClient

import api.apps as target


@pytest.mark.asyncio
async def test__users__user_id__data__id(tmp_path):
    target.set_handlers(logging.getLogger(), [tmp_path / "app.log"])
    await target.create_all()
    async with AsyncClient(app=target.app, base_url="http://test") as ac:
        resp = await ac.post("/users", json=dict(body=dict()))
        assert resp.status_code == 200