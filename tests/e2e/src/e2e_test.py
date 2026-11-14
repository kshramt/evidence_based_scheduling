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

    jump_to_child = page.get_by_role("button", name=child_text, exact=True)
    await jump_to_child.click()
    await playwright.async_api.expect(child).to_be_focused()
    await jump_to_child.click()
    await playwright.async_api.expect(child).to_be_focused()

    await parent.press("Control+Enter")
    newer_child = page.locator("textarea#t-5")
    await playwright.async_api.expect(newer_child).to_be_focused()
    sibling_ids = page.locator("textarea#t-3, textarea#t-5")
    assert await sibling_ids.evaluate_all(
        "(nodes) => nodes.map((node) => node.id)"
    ) == [
        "t-5",
        "t-3",
    ]

    # Make the existing tasks extend beyond the queue's visible area.
    queue = page.locator("[data-virtuoso-scroller]").first
    await queue.evaluate("(element) => { element.style.height = '32px'; }")
    queue_child = queue.get_by_role("button", name=child_text, exact=True)
    await playwright.async_api.expect(queue_child).to_be_attached()
    assert await queue_child.evaluate(
        "(row) => row.getBoundingClientRect().top >= "
        "row.closest('[data-virtuoso-scroller]').getBoundingClientRect().bottom"
    )
    await queue.evaluate("(element) => { element.scrollTop = element.scrollHeight; }")
    await playwright.async_api.expect(queue_child).to_be_in_viewport()


async def _open_auth(
    page: playwright.async_api.Page, url: str, field: str
) -> playwright.async_api.Locator:
    await page.goto(url)
    skip_storage = page.locator("#skip-persistent-storage-check")
    name = page.locator(field)
    await skip_storage.or_(name).first.wait_for()
    if await skip_storage.is_visible():
        await skip_storage.click()
    return name


async def _wait_for_desktop(page: playwright.async_api.Page) -> None:
    skip_storage = page.locator("#skip-persistent-storage-check")
    continue_button = page.get_by_role("button", name="Continue", exact=True)
    add_root = page.locator("#add-root-button")
    ready = continue_button.or_(add_root)
    await skip_storage.or_(ready).first.wait_for()
    if await skip_storage.is_visible():
        await skip_storage.click()
    await ready.first.wait_for()
    if await continue_button.is_visible():
        await continue_button.click()
    await add_root.wait_for()


@pytest.mark.usefixtures("envoy_waiter")
async def test_offline_edit_syncs_after_reload(
    my_host: str,
    browser: playwright.async_api.Browser,
    envoy_http_port: str,
) -> None:
    app_url = f"http://{my_host}:{envoy_http_port}/app/"
    user = "offline-user"
    text = "task saved while offline"

    def is_head_update(response: playwright.async_api.Response) -> bool:
        return response.request.method == "PUT" and response.url.endswith("/head")

    async with await browser.new_context(service_workers="block") as source:
        page = await source.new_page()
        await (await _open_auth(page, app_url, "#sign-up-name")).fill(user)
        async with page.expect_response(is_head_update) as initial_head:
            await page.get_by_role("button", name="Sign up").click()
        initial_response = await initial_head.value
        assert initial_response.ok
        assert await initial_response.json() == {"updated": True}
        await _wait_for_desktop(page)

        # Serve the app shell on reload while withholding the sync API.
        await page.route(
            "**/api/v2/**", lambda route: route.abort("internetdisconnected")
        )
        offline = "Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });"
        await page.add_init_script(offline)
        await page.evaluate(offline)
        await page.locator("#add-root-button").click()
        task = page.locator("textarea#t-1")
        await task.fill(text)
        await task.blur()

        # Wait for both the creation and the text edit to be committed locally.
        await page.wait_for_function(
            """async () => {
                const databases = await indexedDB.databases();
                const userDb = databases.find(({ name }) => name?.startsWith("user-"));
                if (!userDb) return false;
                const request = indexedDB.open(userDb.name);
                const db = await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
                try {
                    const count = db.transaction("pending_patches")
                        .objectStore("pending_patches").count();
                    return await new Promise((resolve, reject) => {
                        count.onsuccess = () => resolve(count.result >= 2);
                        count.onerror = () => reject(count.error);
                    });
                } finally {
                    db.close();
                }
            }"""
        )
        await page.reload()
        await _wait_for_desktop(page)
        await playwright.async_api.expect(task).to_have_value(text)

        async with page.expect_response(is_head_update) as head_update:
            await page.unroute("**/api/v2/**")
            await page.evaluate(
                """() => {
                    Object.defineProperty(navigator, "onLine", { value: true });
                    window.dispatchEvent(new Event("online"));
                }"""
            )
        response = await head_update.value
        assert response.ok
        assert await response.json() == {"updated": True}

    async with await browser.new_context() as destination:
        page = await destination.new_page()
        await (await _open_auth(page, app_url, "#log-in-name")).fill(user)
        await page.get_by_role("button", name="Log in").click()
        await _wait_for_desktop(page)
        await playwright.async_api.expect(page.locator("textarea#t-1")).to_have_value(
            text
        )
