import logging
import os
import pathlib
from typing import Final

import sqlalchemy.engine
import sqlalchemy.ext.asyncio
import sqlalchemy.orm
import sqlalchemy

logger = logging.getLogger(__name__)

DATA_DIR: Final = pathlib.Path(os.environ.get("DATA_DIR", "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
SQLALCHEMY_DATABASE_URL = f"sqlite+aiosqlite:///{DATA_DIR}/data.sqlite"


engine = sqlalchemy.ext.asyncio.create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=dict(check_same_thread=False),
    future=True,
)
SessionLocal = sqlalchemy.orm.sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
    class_=sqlalchemy.ext.asyncio.AsyncSession,
    expire_on_commit=False,
)

Base = sqlalchemy.orm.declarative_base(
    metadata=sqlalchemy.MetaData(
        naming_convention={
            "ix": "ix_%(column_0_label)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )
)


@sqlalchemy.event.listens_for(engine.sync_engine, "connect")
def on_engine_connect(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("pragma foreign_keys=ON")
    finally:
        cursor.close()
