import asyncio
import logging

import fastapi.staticfiles

from . import apps
from .apps import app

app.mount(
    "/app", fastapi.staticfiles.StaticFiles(directory="client", html=True), name="app"
)
asyncio.create_task(apps.on_load_hook())
apps.set_handlers(logging.getLogger(), [])
