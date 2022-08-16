import asyncio
import logging

from . import apps, static_files
from .apps import app

app.mount(
    "/app",
    static_files.StaticFiles(directory="client", html=True),
    name="app",
)
asyncio.create_task(apps.on_load_hook())
apps.set_handlers(logging.getLogger(), [])
