import logging
import os
import pathlib
from typing import Final

import sqlalchemy
import sqlalchemy.engine
import sqlalchemy.ext.asyncio
import sqlalchemy.orm

logger = logging.getLogger(__name__)

DATA_DIR: Final = pathlib.Path(os.environ.get("DATA_DIR", "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
SQLALCHEMY_DATABASE_URL = os.environ.get(
    "DATABASE_URL", f"sqlite+aiosqlite:///{DATA_DIR}/data.sqlite"
)


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
        cursor.execute("pragma journal_mode=WAL")
        cursor.execute("pragma foreign_keys=ON")
        cursor.execute("pragma busy_timeout=5000")
    finally:
        cursor.close()


@sqlalchemy.event.listens_for(engine.sync_engine, "connect")
def do_connect(dbapi_connection, connection_record):
    # disable pysqlite's emitting of the BEGIN statement entirely.
    # also stops it from emitting COMMIT before any DDL.
    dbapi_connection.isolation_level = None


@sqlalchemy.event.listens_for(engine.sync_engine, "begin")
def do_begin(conn):
    pass  # sess.execute("begin") or sess.execute("begin immediate")
