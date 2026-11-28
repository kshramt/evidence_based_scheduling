import asyncio
import collections.abc
import contextlib
import os
import shutil
import socket
import unittest.mock
import uuid
from pathlib import Path
from typing import Any, Final

import httpx
import playwright.async_api
import pytest

MY_HOST: Final = os.environ["MY_HOST"]


_failed = pytest.StashKey[bool]()
_evidence = pytest.StashKey[Path]()


@pytest.hookimpl(wrapper=True)
def pytest_runtest_makereport(item: pytest.Item):
    report = yield
    if report.failed:
        item.stash[_failed] = True
    if report.when == "teardown" and not item.stash.get(_failed, False):
        path = item.stash.get(_evidence, None)
        if path is not None:
            shutil.rmtree(path, ignore_errors=True)
    return report


@pytest.fixture
def evidence_dir(request: pytest.FixtureRequest):
    destination = os.environ.get("EBS_E2E_ARTIFACTS")
    if not destination:
        return None
    path = Path(destination) / request.node.name
    request.node.stash[_evidence] = path
    return path


@pytest.fixture
def traced_context(evidence_dir: Path | None):
    @contextlib.asynccontextmanager
    async def open_context(browser: playwright.async_api.Browser, **options):
        async with await browser.new_context(**options) as context:
            if evidence_dir is not None:
                await context.tracing.start(screenshots=True, snapshots=True)
            try:
                yield context
            finally:
                if evidence_dir is not None:
                    evidence_dir.mkdir(parents=True, exist_ok=True)
                    await context.tracing.stop(
                        path=evidence_dir / f"trace-{uuid.uuid4()}.zip"
                    )

    return open_context


@pytest.fixture
async def browser() -> collections.abc.Generator[
    playwright.async_api.Browser, Any, None
]:
    async with playwright.async_api.async_playwright() as pw:
        yield await pw.chromium.launch()


@pytest.fixture
async def context(
    browser: playwright.async_api.Browser,
    traced_context,
) -> collections.abc.AsyncIterator[playwright.async_api.BrowserContext]:
    async with traced_context(browser) as context:
        yield context


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
    evidence_dir: Path | None,
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
            f"compose.{os.environ['ENV']}.yaml",
        ]
        if evidence_dir is not None:
            with contextlib.suppress(OSError):
                evidence_dir.mkdir(parents=True, exist_ok=True)
                with (evidence_dir / "compose.log").open("wb") as log:
                    res = await asyncio.create_subprocess_exec(
                        *args,
                        "logs",
                        "--no-color",
                        cwd=os.environ["MY_COMPOSE_DIR"],
                        stdout=log,
                        stderr=asyncio.subprocess.STDOUT,
                    )
                    await res.wait()
        args += ["down", "--volumes"]
        res = await asyncio.create_subprocess_exec(
            *args,
            cwd=os.environ["MY_COMPOSE_DIR"],
        )
        stdout, stderr = await res.communicate()
        if res.returncode:
            raise RuntimeError(res.returncode, args, stdout, stderr)


@pytest.fixture
async def envoy_waiter(
    compose_up: None, my_host: str
) -> collections.abc.Callable[[], collections.abc.Awaitable[None]]:
    async def wait() -> None:
        uri = f"http://{my_host}:{os.environ['ENVOY_HTTP_PORT']}/api/v2/sys/health"
        async with httpx.AsyncClient() as client:
            i = -1
            while True:
                i += 1
                try:
                    response = await client.get(uri)
                    response.raise_for_status()
                    return
                except httpx.HTTPError:
                    if 100 <= i:
                        raise
                await asyncio.sleep(0.1)

    await wait()
    return wait


@pytest.fixture(scope="session")
def compose_common_envs() -> collections.abc.Generator[None, Any, None]:
    with unittest.mock.patch.dict(
        os.environ,
        dict(
            _POSTGRES_PASSWORD="postgres",
            _POSTGRES_APP_USER_PASSWORD="app",
            ENV=os.environ.get("ENV", "dev"),
        ),
    ):
        yield


@pytest.fixture
def compose_up_envs(
    uuid1: str,
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
