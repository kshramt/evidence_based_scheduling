import asyncio
import collections.abc
import contextlib
import os
import socket
import unittest.mock
import uuid
from typing import Any, Final

import httpx
import pytest
import playwright.async_api

MY_HOST: Final = os.environ["MY_HOST"]


@pytest.fixture
async def browser() -> collections.abc.Generator[
    playwright.async_api.Browser, Any, None
]:
    async with playwright.async_api.async_playwright() as pw:
        yield await pw.chromium.launch()


@pytest.fixture
async def context(
    browser: playwright.async_api.Browser,
) -> collections.abc.Generator[playwright.async_api.BrowserContext, Any, None]:
    context = await browser.new_context()
    try:
        yield context
    finally:
        await context.close()


@pytest.fixture
def my_host() -> str:
    return MY_HOST


@pytest.fixture
def postgres_port() -> str:
    return _get_free_port()


@pytest.fixture
def adminer_port() -> str:
    return _get_free_port()


@pytest.fixture
def api_v1_port() -> str:
    return _get_free_port()


@pytest.fixture
def api_v2_port() -> str:
    return _get_free_port()


@pytest.fixture
def envoy_http_port() -> str:
    return _get_free_port()


@pytest.fixture
def envoy_grpc_port() -> str:
    return _get_free_port()


@pytest.fixture(scope="session")
def event_loop() -> collections.abc.Generator[asyncio.AbstractEventLoop, Any, None]:
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    try:
        yield loop
    finally:
        loop.close()


@pytest.fixture
async def compose_up(
    compose_up_envs: None,
) -> collections.abc.Generator[None, Any, None]:
    try:
        args = ["scripts/launch.sh"]
        res = await asyncio.create_subprocess_exec(
            *args,
            cwd=os.environ["MY_COMPOSE_DIR"],
        )
        stdout, stderr = await res.communicate()
        if res.returncode:
            raise RuntimeError(res.returncode, args, stdout, stderr)
        yield
    finally:
        args = [
            "docker",
            "compose",
            "-f",
            "compose.yaml",
            "-f",
            "compose.dev.yaml",
            "down",
            "--volumes",
        ]
        res = await asyncio.create_subprocess_exec(
            *args,
            cwd=os.environ["MY_COMPOSE_DIR"],
        )
        stdout, stderr = await res.communicate()
        if res.returncode:
            raise RuntimeError(res.returncode, args, stdout, stderr)


@pytest.fixture
async def envoy_waiter(compose_up: None, my_host: str) -> None:
    uri = f"http://{my_host}:{os.environ['ENVOY_HTTP_PORT']}"
    async with httpx.AsyncClient() as client:
        i = -1
        while True:
            i += 1
            try:
                await client.get(uri)
                return
            except Exception:
                if 100 <= i:
                    raise
            await asyncio.sleep(0.1)


@pytest.fixture(scope="session")
def compose_common_envs() -> collections.abc.Generator[None, Any, None]:
    with unittest.mock.patch.dict(
        os.environ,
        dict(
            _POSTGRES_PASSWORD="postgres",
            _POSTGRES_APP_USER_PASSWORD="app",
            ENV="dev",
        ),
    ):
        yield


@pytest.fixture
def compose_up_envs(
    uuid1: str,
    api_v1_port: str,
    api_v2_port: str,
    compose_common_envs: None,
    envoy_http_port: str,
    envoy_grpc_port: str,
    adminer_port: str,
    postgres_port: str,
) -> collections.abc.Generator[None, Any, None]:
    with unittest.mock.patch.dict(
        os.environ,
        dict(
            API_V1_PORT=api_v1_port,
            API_V2_PORT=api_v2_port,
            COMPOSE_PROJECT_NAME=uuid1,
            ENVOY_HTTP_PORT=envoy_http_port,
            ENVOY_GRPC_PORT=envoy_grpc_port,
            ADMINER_PORT=adminer_port,
            POSTGRES_PORT=postgres_port,
            PULL="no",
            MY_HOST_PGDATA=f"./pytest_pgdata_{uuid1}",
        ),
    ):
        yield


@pytest.fixture
def uuid1() -> str:
    return str(uuid.uuid1())


def _get_free_port() -> str:
    with contextlib.closing(socket.socket()) as sock:
        sock.bind(("", 0))
        return str(sock.getsockname()[1])
