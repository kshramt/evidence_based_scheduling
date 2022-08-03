import asyncio
import logging

from . import apps
from .apps import app

__all__ = ["app"]

asyncio.create_task(apps.create_all())
apps.set_handlers(logging.getLogger(), ["app.log"])
