import collections.abc

import pytest
import playwright.sync_api


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
    page.evaluate(
        '()=>{document.getElementById("skip-persistent-storage-check").click()}'
    )
    page.locator("#sign-up-name").fill("user1")
    page.get_by_role("button", name="Sign-up").click()
