import collections.abc
import contextlib
import os
import socket
import subprocess
import time
import typing
import unittest.mock
import uuid
from typing import Any, Final

import httpx
import pytest

MY_HOST: Final = os.environ["MY_HOST"]


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
def envoy_http_port() -> str:
    return _get_free_port()


@pytest.fixture
def envoy_grpc_port() -> str:
    return _get_free_port()


@pytest.fixture(scope="session")
def compose_build(compose_build_envs: None) -> None:
    res = subprocess.run(
        [
            "docker",
            "compose",
            "-f",
            "compose.yaml",
            "-f",
            "compose.dev.yaml",
            "build",
        ],
        cwd=os.environ["MY_COMPOSE_DIR"],
    )
    res.check_returncode()


@pytest.fixture
def compose_up(
    compose_up_envs: None,
    compose_build: None,
) -> collections.abc.Generator[None, Any, None]:
    try:
        res = subprocess.run(
            [
                "scripts/launch.sh",
            ],
            cwd=os.environ["MY_COMPOSE_DIR"],
        )
        res.check_returncode()
        yield
    finally:
        res = subprocess.run(
            [
                "docker",
                "compose",
                "-f",
                "compose.yaml",
                "-f",
                "compose.dev.yaml",
                "down",
                "--volumes",
            ],
            cwd=os.environ["MY_COMPOSE_DIR"],
        )
        res.check_returncode()


@pytest.fixture
def envoy_waiter(compose_up: None, my_host: str, envoy_http_port: str) -> None:  #
    uri = f"http://{my_host}:{envoy_http_port}"
    with httpx.Client() as client:
        i = -1
        while True:
            i += 1
            try:
                client.get(uri)
                return
            except Exception:
                if 100 <= i:
                    raise
            time.sleep(0.1)


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


@pytest.fixture(scope="session")
def compose_build_envs(
    compose_common_envs: None,
) -> collections.abc.Generator[None, Any, None]:
    with unittest.mock.patch.dict(
        os.environ,
        dict(),
    ):
        yield


@pytest.fixture
def compose_up_envs(
    uuid1: str,
    api_v1_port: str,
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
