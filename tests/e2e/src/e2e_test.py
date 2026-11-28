import asyncio
import os
from collections.abc import Awaitable, Callable
from contextlib import AbstractAsyncContextManager
from datetime import datetime, timedelta
from http import HTTPStatus

import playwright.async_api
import pytest

TracedContext = Callable[
    ..., AbstractAsyncContextManager[playwright.async_api.BrowserContext]
]


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
    await parent.wait_for()
    assert (
        await parent.evaluate(
            "(field) => getComputedStyle(field).getPropertyValue('field-sizing')"
        )
        == "content"
    )
    initial_height = await parent.evaluate("(field) => field.offsetHeight")
    await parent.fill("first line\nsecond line\nthird line")
    assert await parent.evaluate("(field) => field.offsetHeight") > initial_height
    await parent.fill("short task")
    assert await parent.evaluate("(field) => field.offsetHeight") == initial_height
    await parent.blur()
    await playwright.async_api.expect(
        page.locator("[data-virtuoso-scroller]").get_by_role(
            "button", name="short task", exact=True
        )
    ).to_be_attached()
    await parent.press("Control+Enter")
    child = page.locator("textarea#t-3")
    await playwright.async_api.expect(child).to_be_focused()
    child_text = "child visible from queue"
    await child.fill(child_text)

    await parent.dblclick()
    await playwright.async_api.expect(child).to_have_count(0)

    jump_to_child = (
        page.locator("[data-virtuoso-scroller]").first.locator("[data-item-index]")
    ).get_by_role("button", name=child_text, exact=True)
    await jump_to_child.press("Enter")
    await playwright.async_api.expect(child).to_be_focused()
    await jump_to_child.press("Space")
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

    await _check_queue_navigation(page, parent, child, child_text)
    await _check_pinned_filter(page, parent, child, child_text)
    await _check_keyboard_exports(page)
    await _check_keyboard_help(page)


async def _check_keyboard_help(page: playwright.async_api.Page) -> None:
    await page.get_by_role("button", name="App menu").press("Enter")
    await page.get_by_role("menuitem", name="Keyboard shortcuts").press("Enter")
    help_dialog = page.get_by_role("dialog", name="Keyboard shortcuts")
    await playwright.async_api.expect(help_dialog).to_be_visible()
    await playwright.async_api.expect(
        help_dialog.get_by_text("Start a task concurrently or stop just that task")
    ).to_be_visible()
    await page.keyboard.press("Escape")
    await playwright.async_api.expect(help_dialog).to_be_hidden()


async def _check_keyboard_exports(page: playwright.async_api.Page) -> None:
    trigger = page.get_by_role("button", name="App menu")
    await trigger.press("Enter")
    menu = page.get_by_role("menu")
    await playwright.async_api.expect(menu).to_be_visible()
    remote = menu.get_by_role("menuitem", name="Check remote")
    state = menu.get_by_role("menuitem", name="Export state")
    database = menu.get_by_role("menuitem", name="Export IndexedDB")

    await remote.press("ArrowDown")
    await playwright.async_api.expect(state).to_be_focused()
    async with page.expect_download() as state_download:
        await page.keyboard.press("Enter")
    assert (await state_download.value).suggested_filename == (
        "evidence_based_scheduling.json"
    )

    await state.press("ArrowDown")
    await playwright.async_api.expect(database).to_be_focused()
    async with page.expect_download() as database_download:
        await page.keyboard.press("Space")
    assert (await database_download.value).suggested_filename == "indexeddb.json"

    await database.press("Escape")
    await playwright.async_api.expect(menu).to_be_hidden()
    await playwright.async_api.expect(trigger).to_be_focused()


async def _check_pinned_filter(
    page: playwright.async_api.Page,
    parent: playwright.async_api.Locator,
    child: playwright.async_api.Locator,
    child_text: str,
) -> None:
    await parent.locator("../..").get_by_role("button", name="more_vert").click()
    await page.get_by_role("button", name="Pin", exact=True).click()
    pinned_child = page.locator("textarea#p-3")
    await playwright.async_api.expect(pinned_child).to_have_value(child_text)
    await page.keyboard.press("Escape")
    await playwright.async_api.expect(page.get_by_role("dialog")).to_have_count(0)

    await child.locator("../..").get_by_role("button", name="done", exact=True).click()
    await playwright.async_api.expect(child).to_have_count(0)
    await parent.dblclick()
    await playwright.async_api.expect(child).to_have_value(child_text)
    await playwright.async_api.expect(pinned_child).to_have_value(child_text)
    todo_filter = page.get_by_role("switch", name="To Do", exact=True)
    await todo_filter.press("Space")
    await playwright.async_api.expect(child).to_have_count(0)
    await playwright.async_api.expect(pinned_child).to_have_count(0)
    await todo_filter.press("Space")
    await playwright.async_api.expect(child).to_have_value(child_text)
    await playwright.async_api.expect(pinned_child).to_have_value(child_text)


async def _check_queue_navigation(
    page: playwright.async_api.Page,
    parent: playwright.async_api.Locator,
    child: playwright.async_api.Locator,
    child_text: str,
) -> None:
    await page.set_viewport_size({"width": 3840, "height": 2160})
    # Make the existing tasks extend beyond the queue's visible area.
    queue = page.locator("[data-virtuoso-scroller]").first
    await queue.evaluate("(element) => { element.style.height = '32px'; }")
    rows = queue.locator("[data-item-index]")
    queue_child = rows.get_by_role("button", name=child_text, exact=True)
    await playwright.async_api.expect(queue_child).to_be_attached()
    assert await queue_child.evaluate(
        "(row) => row.getBoundingClientRect().top >= "
        "row.closest('[data-virtuoso-scroller]').getBoundingClientRect().bottom"
    )
    await queue_child.evaluate(
        """(row) => {
            const pane = row.closest('[data-virtuoso-scroller]');
            pane.scrollTop += row.getBoundingClientRect().top
                - pane.getBoundingClientRect().top;
        }"""
    )
    await playwright.async_api.expect(queue_child).to_be_in_viewport()

    search = page.get_by_role("textbox", name="Search tasks")
    child_jump = child.locator("../..").get_by_role("button", name="Show in queue")
    parent_jump = parent.locator("../..").get_by_role("button", name="Show in queue")
    queue_parent = rows.get_by_role("button", name="short task", exact=True)

    await search.fill("no tasks match this search")
    match_status = page.get_by_role("status").filter(has_text="to-do match")
    await playwright.async_api.expect(match_status).to_have_text("0 to-do matches")
    await search.press("Enter")
    await page.evaluate(
        "() => new Promise(resolve => requestAnimationFrame(() => "
        "requestAnimationFrame(resolve)))"
    )
    await playwright.async_api.expect(search).to_be_focused()

    await search.fill(child_text)
    await playwright.async_api.expect(match_status).to_have_text("1 to-do match")
    await search.press("Enter")
    await playwright.async_api.expect(child).to_be_focused()
    await playwright.async_api.expect(queue.locator("hr")).to_be_attached()
    await playwright.async_api.expect(
        queue.locator("[data-item-index] hr")
    ).to_have_count(0)
    await playwright.async_api.expect(
        queue.locator('[data-item-index="0"]').get_by_role(
            "button", name=child_text, exact=True
        )
    ).to_be_attached()
    await queue.evaluate("(element) => { element.scrollTop = 0; }")
    await child_jump.click()
    await playwright.async_api.expect(queue_child).to_be_in_viewport()
    await playwright.async_api.expect(search).to_have_value(child_text)

    await parent_jump.click()
    await playwright.async_api.expect(search).to_have_value(child_text)
    await playwright.async_api.expect(queue_parent).to_be_in_viewport()

    await child_jump.click()
    await playwright.async_api.expect(queue_child).to_be_in_viewport()
    await search.dispatch_event("keydown", {"key": "Escape", "isComposing": True})
    await playwright.async_api.expect(search).to_have_value(child_text)
    await search.press("Escape")
    await playwright.async_api.expect(search).to_have_value("")
    await playwright.async_api.expect(search).to_be_focused()
    await playwright.async_api.expect(match_status).to_have_count(0)

    clear = page.get_by_role("button", name="Clear task search")
    await playwright.async_api.expect(clear).to_be_disabled()
    await search.fill(child_text)
    await clear.click()
    await playwright.async_api.expect(search).to_have_value("")
    await playwright.async_api.expect(search).to_be_focused()
    await playwright.async_api.expect(match_status).to_have_count(0)


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
async def test_offline_edit_syncs_after_reload(  # noqa: PLR0915
    my_host: str,
    browser: playwright.async_api.Browser,
    envoy_http_port: str,
    traced_context: TracedContext,
) -> None:
    app_url = f"http://{my_host}:{envoy_http_port}/app/"
    user = "offline-user"
    text = "task saved while offline"

    def is_head_update(response: playwright.async_api.Response) -> bool:
        return response.request.method == "PUT" and response.url.endswith("/head")

    async with traced_context(browser, service_workers="block") as source:
        page = await source.new_page()
        await (await _open_auth(page, app_url, "#sign-up-name")).fill(user)
        async with page.expect_response(is_head_update) as initial_head:
            await page.get_by_role("button", name="Sign up").click()
        initial_response = await initial_head.value
        assert initial_response.ok
        assert await initial_response.json() == {"updated": True}
        await _wait_for_desktop(page)

        status = page.get_by_role("status", name="Save status")
        await playwright.async_api.expect(status).to_have_text("Synced")

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
        await playwright.async_api.expect(status).to_have_text("Unsaved editor changes")
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
        await playwright.async_api.expect(status).to_have_text(
            "Saved locally · Sync pending"
        )
        await page.reload()
        await _wait_for_desktop(page)
        await playwright.async_api.expect(task).to_have_value(text)

        replays = 0

        async def resend_patch_batch(route: playwright.async_api.Route) -> None:
            nonlocal replays
            response = await route.fetch()
            duplicate = await route.fetch()
            assert response.status == duplicate.status == HTTPStatus.CREATED
            replays += 1
            await route.fulfill(response=response)

        async with page.expect_response(is_head_update) as head_update:
            await page.unroute("**/api/v2/**")
            await page.route("**/patches~batch", resend_patch_batch)
            await page.evaluate(
                """() => {
                    Object.defineProperty(navigator, "onLine", { value: true });
                    window.dispatchEvent(new Event("online"));
                }"""
            )
        response = await head_update.value
        assert response.ok
        assert await response.json() == {"updated": True}
        await playwright.async_api.expect(status).to_have_text("Synced")
        assert replays > 0

    async with traced_context(browser) as destination:
        page = await destination.new_page()
        await (await _open_auth(page, app_url, "#log-in-name")).fill(user)
        await page.get_by_role("button", name="Log in").click()
        await _wait_for_desktop(page)
        await playwright.async_api.expect(page.locator("textarea#t-1")).to_have_value(
            text
        )


async def _restore_app_database() -> None:
    async def compose(*args: str, data: bytes | None = None) -> bytes:
        process = await asyncio.create_subprocess_exec(
            "docker",
            "compose",
            "-f",
            "compose.yaml",
            "-f",
            f"compose.{os.environ['ENV']}.yaml",
            *args,
            cwd=os.environ["MY_COMPOSE_DIR"],
            stdin=asyncio.subprocess.PIPE if data is not None else None,
            stdout=asyncio.subprocess.PIPE,
        )
        stdout, _ = await process.communicate(data)
        if process.returncode:
            raise RuntimeError(f"Compose command failed: {args!r}")
        return stdout

    postgres = ("exec", "-T", "postgres")
    dump = await compose(
        *postgres, "pg_dump", "-U", "postgres", "-Fc", "-d", "postgres"
    )
    await compose(
        *postgres, "createdb", "-U", "postgres", "-T", "template0", "restored_app"
    )
    await compose(
        *postgres,
        "pg_restore",
        "-U",
        "postgres",
        "--exit-on-error",
        "--single-transaction",
        "-d",
        "restored_app",
        data=dump,
    )

    # The isolated test stack reopens its normal database name after the switch.
    await compose("stop", "api_v2")
    await compose(
        *postgres,
        "psql",
        "-X",
        "-U",
        "postgres",
        "-d",
        "template1",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        "ALTER DATABASE postgres RENAME TO original_app",
        "-c",
        "ALTER DATABASE restored_app RENAME TO postgres",
    )
    await compose("start", "api_v2")


@pytest.mark.parametrize(
    ("timezone", "stop_utc", "start_label", "end_label", "edited_label"),
    [
        (
            "Asia/Tokyo",
            "2026-05-08T16:00:00+00:00",
            "2026-05-08T23:00",
            "2026-05-09T01:00",
            "2026-05-09T00:00",
        ),
        (
            "America/New_York",
            "2026-03-08T08:00:00+00:00",
            "2026-03-08T01:00",
            "2026-03-08T04:00",
            "2026-03-08T03:00",
        ),
    ],
)
async def test_restored_database_opens_task_and_recorded_time(  # noqa: PLR0913
    my_host: str,
    browser: playwright.async_api.Browser,
    envoy_http_port: str,
    envoy_waiter: Callable[[], Awaitable[None]],
    traced_context: TracedContext,
    timezone: str,
    stop_utc: str,
    start_label: str,
    end_label: str,
    edited_label: str,
) -> None:
    app_url = f"http://{my_host}:{envoy_http_port}/app/"
    user = "restore-browser-user"
    text = "task saved before database backup"

    def is_head_update(response: playwright.async_api.Response) -> bool:
        return response.request.method == "PUT" and response.url.endswith("/head")

    async with traced_context(browser, timezone_id=timezone) as source:
        page = await source.new_page()

        async def save(action: Callable[[], Awaitable[None]]) -> None:
            async with page.expect_response(is_head_update) as update:
                await action()
            response = await update.value
            assert response.ok
            assert await response.json() == {"updated": True}

        await (await _open_auth(page, app_url, "#sign-up-name")).fill(user)
        await save(page.get_by_role("button", name="Sign up").click)
        await _wait_for_desktop(page)
        await save(page.locator("#add-root-button").click)
        task = page.locator("textarea#t-1")
        await task.fill(text)
        await save(task.blur)

        stop = datetime.fromisoformat(stop_utc)
        await page.clock.set_fixed_time(stop - timedelta(hours=2))
        await save(lambda: task.press("Control+."))
        await page.clock.set_fixed_time(stop)
        await save(lambda: task.press("Control+."))
        await playwright.async_api.expect(
            task.locator("..").get_by_text("2", exact=True)
        ).to_be_visible()

    await _restore_app_database()
    await envoy_waiter()

    async with traced_context(browser, timezone_id=timezone) as destination:
        page = await destination.new_page()
        await (await _open_auth(page, app_url, "#log-in-name")).fill(user)
        await page.get_by_role("button", name="Log in").click()
        await _wait_for_desktop(page)
        task = page.locator("textarea#t-1")
        await playwright.async_api.expect(task).to_have_value(text)
        await playwright.async_api.expect(
            task.locator("..").get_by_text("2", exact=True)
        ).to_be_visible()

        async def open_records() -> playwright.async_api.Locator:
            await task.locator("../..").get_by_role("button", name="more_vert").click()
            return page.get_by_role("dialog").locator('input[type="datetime-local"]')

        records = await open_records()
        await playwright.async_api.expect(records.nth(0)).to_have_value(start_label)
        await playwright.async_api.expect(records.nth(1)).to_have_value(end_label)
        async with page.expect_response(is_head_update) as update:
            await records.nth(1).fill(edited_label)
        assert await (await update.value).json() == {"updated": True}
        await _save_boundary_event(page, records, edited_label, is_head_update)
        await page.reload()
        await _wait_for_desktop(page)
        records = await open_records()
        await playwright.async_api.expect(records.nth(1)).to_have_value(edited_label)
        await _check_boundary_event(page, edited_label)
        await playwright.async_api.expect(
            task.locator("..").get_by_text("1", exact=True)
        ).to_be_attached()


async def _save_boundary_event(
    page: playwright.async_api.Page,
    records: playwright.async_api.Locator,
    label: str,
    is_head_update: Callable[[playwright.async_api.Response], bool],
) -> None:
    await records.nth(2).fill(label)
    dialog = page.get_by_role("dialog")
    async with page.expect_response(is_head_update) as event_update:
        await dialog.get_by_role("button", name="Set event").click()
    assert await (await event_update.value).json() == {"updated": True}


async def _check_boundary_event(page: playwright.async_api.Page, label: str) -> None:
    dialog = page.get_by_role("dialog")
    await playwright.async_api.expect(
        dialog.get_by_role("button").filter(has_text=label)
    ).to_be_visible()
    await page.keyboard.press("Escape")
    await playwright.async_api.expect(dialog).to_be_hidden()


async def _advance_remote_before_overwrite(
    local_page: playwright.async_api.Page,
    remote_page: playwright.async_api.Page,
    is_head_update: Callable[[playwright.async_api.Response], bool],
) -> None:
    async def on_head_request(route: playwright.async_api.Route) -> None:
        if route.request.method == "PUT":
            async with remote_page.expect_response(is_head_update) as newer:
                await remote_page.locator("#add-root-button").click()
            assert await (await newer.value).json() == {"updated": True}
        await route.continue_()

    await local_page.route("**/head", on_head_request)


async def _reload_after_conflict(page: playwright.async_api.Page) -> None:
    async with page.expect_event(
        "framenavigated", predicate=lambda frame: frame == page.main_frame
    ):
        await page.get_by_role("button", name="Reload", exact=True).click()
    await _wait_for_desktop(page)


@pytest.mark.usefixtures("envoy_waiter")
@pytest.mark.parametrize(
    ("choice", "second_remote_edit"),
    [("Reload", False), ("Use current", False), ("Use current", True)],
)
async def test_sync_conflict_accepts_one_choice(  # noqa: PLR0913
    my_host: str,
    browser: playwright.async_api.Browser,
    envoy_http_port: str,
    choice: str,
    second_remote_edit: bool,
    traced_context: TracedContext,
) -> None:
    app_url = f"http://{my_host}:{envoy_http_port}/app/"

    def is_head_update(response: playwright.async_api.Response) -> bool:
        return response.request.method == "PUT" and response.url.endswith("/head")

    async with (
        traced_context(browser, service_workers="block") as local,
        traced_context(browser) as remote,
    ):
        local_page = await local.new_page()
        await (await _open_auth(local_page, app_url, "#sign-up-name")).fill("conflict")
        async with local_page.expect_response(is_head_update) as initial:
            await local_page.get_by_role("button", name="Sign up").click()
        assert await (await initial.value).json() == {"updated": True}
        await _wait_for_desktop(local_page)

        remote_page = await remote.new_page()
        await (await _open_auth(remote_page, app_url, "#log-in-name")).fill("conflict")
        await remote_page.get_by_role("button", name="Log in").click()
        await _wait_for_desktop(remote_page)
        async with remote_page.expect_response(is_head_update) as updated:
            await remote_page.locator("#add-root-button").click()
        assert await (await updated.value).json() == {"updated": True}

        reload_button = local_page.get_by_role("button", name="Reload", exact=True)
        keep_button = local_page.get_by_role("button", name="Use current", exact=True)
        await local_page.bring_to_front()
        await local_page.evaluate("window.dispatchEvent(new Event('focus'))")
        await reload_button.wait_for()

        if second_remote_edit:
            await _advance_remote_before_overwrite(
                local_page, remote_page, is_head_update
            )

        head_requests: list[str] = []

        def record_head_request(request: playwright.async_api.Request) -> None:
            if request.url.endswith("/head"):
                head_requests.append(request.method)

        local_page.on("request", record_head_request)

        # Both clicks land before the first network request has finished.
        async with local_page.expect_response(
            lambda response: response.url.endswith("/head")
            and response.request.method == ("GET" if choice == "Reload" else "PUT")
        ) as resolution:
            await local_page.evaluate(
                """(choice) => {
                    const buttons = [...document.querySelectorAll("button")];
                    const chosen = buttons.find((button) => button.textContent.trim() === choice);
                    const other = buttons.find((button) =>
                        button.textContent.trim() === (choice === "Reload" ? "Use current" : "Reload"));
                    chosen.click();
                    chosen.click();
                    other.click();
                }""",
                choice,
            )
        assert (await resolution.value).ok
        if choice == "Reload":
            await reload_button.wait_for(state="detached")
            await _wait_for_desktop(local_page)
            await playwright.async_api.expect(
                local_page.locator("textarea#t-1")
            ).to_be_attached()
            assert "PUT" not in head_requests
        elif second_remote_edit:
            assert await (await resolution.value).json() == {"updated": False}
            await _reload_after_conflict(local_page)
            await playwright.async_api.expect(
                local_page.locator("textarea#t-1, textarea#t-3")
            ).to_have_count(2)
        else:
            assert await (await resolution.value).json() == {"updated": True}
            await playwright.async_api.expect(keep_button).to_have_count(0)
            assert head_requests.count("PUT") == 1
            await remote_page.bring_to_front()
            await remote_page.evaluate("window.dispatchEvent(new Event('focus'))")
            await _reload_after_conflict(remote_page)
            await playwright.async_api.expect(
                remote_page.locator("textarea#t-1")
            ).to_have_count(0)


@pytest.mark.usefixtures("envoy_waiter")
async def test_service_worker_loads_app_without_network(
    my_host: str,
    envoy_http_port: str,
    traced_context: TracedContext,
) -> None:
    origin = f"http://{my_host}:{envoy_http_port}"
    async with playwright.async_api.async_playwright() as pw:
        browser = await pw.chromium.launch(
            args=[f"--unsafely-treat-insecure-origin-as-secure={origin}"]
        )
        try:
            async with traced_context(browser) as context:
                page = await context.new_page()
                name = await _open_auth(page, f"{origin}/app/", "#sign-up-name")
                await name.fill("offline-shell")
                await page.get_by_role("button", name="Sign up").click()
                await _wait_for_desktop(page)
                await page.wait_for_function(
                    "navigator.serviceWorker.controller !== null"
                )
                await context.set_offline(True)

                await page.reload()
                await _wait_for_desktop(page)
                await playwright.async_api.expect(
                    page.locator("#add-root-button")
                ).to_be_visible()
        finally:
            await browser.close()
