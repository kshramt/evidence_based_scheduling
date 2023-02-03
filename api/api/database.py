import logging
import os
import pathlib
from typing import Any, Final

import sqlalchemy
import sqlalchemy.dialects.sqlite
import sqlalchemy.engine
import sqlalchemy.ext.asyncio
import sqlalchemy.orm

logger = logging.getLogger(__name__)

DATA_DIR: Final = pathlib.Path(os.environ.get("DATA_DIR", "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
SQLALCHEMY_DATABASE_URL = os.environ.get(
    "DATABASE_URL", f"sqlite+aiosqlite:///{DATA_DIR}/data.sqlite"
)


engine: Final = sqlalchemy.ext.asyncio.create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=dict(check_same_thread=False),
    future=True,
)
SessionLocal: Final = sqlalchemy.ext.asyncio.async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    future=True,
    class_=sqlalchemy.ext.asyncio.AsyncSession,
    expire_on_commit=False,
)

Base: Final = sqlalchemy.orm.declarative_base(
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
def on_engine_connect(
    dbapi_connection: sqlalchemy.dialects.sqlite.aiosqlite.AsyncAdapt_aiosqlite_connection,
    connection_record: Any,
) -> None:
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("pragma journal_mode=WAL")
        # Litestream's replication can loose some transactions anyway.
        cursor.execute("pragma synchronous=NORMAL")
        cursor.execute("pragma wal_autocheckpoint=0")
        cursor.execute("pragma foreign_keys=ON")
        cursor.execute("pragma busy_timeout=5000")
    finally:
        cursor.close()


@sqlalchemy.event.listens_for(engine.sync_engine, "connect")
def do_connect(
    dbapi_connection: sqlalchemy.dialects.sqlite.aiosqlite.AsyncAdapt_aiosqlite_connection,
    connection_record: Any,
) -> None:
    # disable pysqlite's emitting of the BEGIN statement entirely.
    # also stops it from emitting COMMIT before any DDL.
    dbapi_connection.isolation_level = None


@sqlalchemy.event.listens_for(engine.sync_engine, "begin")
def do_begin(conn: Any) -> None:
    pass  # sess.execute("begin") or sess.execute("begin immediate")
