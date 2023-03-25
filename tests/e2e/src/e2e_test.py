import collections.abc
import time

import playwright.sync_api
import pytest


def test_walkthrough(
    compose_up: None,
    envoy_waiter: collections.abc.Awaitable[None],
    my_host: str,
    context: playwright.sync_api.BrowserContext,
    envoy_http_port: str,
) -> None:
    page = context.new_page()
    page.goto(f"http://{my_host}:{envoy_http_port}/app")
    # Click an invisible button.
    i = 0
    while True:
        i += 1
        try:
            page.evaluate(
                '()=>{document.getElementById("skip-persistent-storage-check").click()}'
            )
            break
        except Exception:
            if 10 < i:
                raise
            time.sleep(0.1)
    page.locator("#sign-up-name").fill("user1")
    page.get_by_role("button", name="Sign-up").click()
