import playwright.async_api
import pytest


@pytest.mark.usefixtures("envoy_waiter")
async def test_e2e(
    my_host: str,
    context: playwright.async_api.BrowserContext,
    envoy_http_port: str,
) -> None:
    base_url = f"http://{my_host}:{envoy_http_port}"
    response = await context.request.get(f"{base_url}/api/v2/sys/health")
    await playwright.async_api.expect(response).to_be_ok()
    assert await response.json() == {"status": "ok"}

    page = await context.new_page()
    await page.goto(f"{base_url}/app")
    skip_storage = page.locator("#skip-persistent-storage-check")
    sign_up_name = page.locator("#sign-up-name")
    await skip_storage.or_(sign_up_name).first.wait_for(state="attached")
    if await skip_storage.count():
        await skip_storage.evaluate("button => button.click()")
    await sign_up_name.fill("user1")
    await page.get_by_role("button", name="Sign up").click()
    await page.get_by_role("button", name="Continue").click()
    await page.locator("#add-root-button").click()

    parent = page.locator("textarea#t-1")
    await parent.press("Control+Enter")
    child = page.locator("textarea#t-3")
    await playwright.async_api.expect(child).to_be_focused()
    child_text = "child visible from queue"
    await child.fill(child_text)

    await parent.dblclick()
    await playwright.async_api.expect(child).to_have_count(0)

    await page.get_by_role("button", name=child_text, exact=True).click()
    await playwright.async_api.expect(child).to_be_focused()
