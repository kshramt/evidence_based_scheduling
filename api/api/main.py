import asyncio
import logging
from typing import Final

from . import apps

app: Final = apps.app

asyncio.create_task(apps.on_load_hook())
apps.set_handlers(logging.getLogger(), [])
