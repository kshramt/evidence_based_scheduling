import asyncio

import playwright.async_api


async def test_e2e(
    compose_up: None,
    envoy_waiter: None,
    my_host: str,
    context: playwright.async_api.BrowserContext,
    envoy_http_port: str,
) -> None:
    page = await context.new_page()
    await page.goto(f"http://{my_host}:{envoy_http_port}/app")
    # Click an invisible button.
    i = 0
    while True:
        i += 1
        try:
            await page.evaluate(
                '()=>{document.getElementById("skip-persistent-storage-check").click()}'
            )
            break
        except Exception:
            if 10 < i:
                raise
            asyncio.sleep(0.1)
    await page.locator("#sign-up-name").fill("user1")
    await page.get_by_role("button", name="Sign-up").click()
    await page.locator("#add-root-button").click()
