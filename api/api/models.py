import datetime
import logging
from typing import Any, Final

import sqlalchemy
import sqlalchemy.orm
import sqlalchemy.types
import zstd
from sqlalchemy import Boolean, CheckConstraint, Column, Integer, String

from .database import Base

logger: Final = logging.getLogger(__name__)


class CompressedString(sqlalchemy.types.TypeDecorator):
    impl = sqlalchemy.types.LargeBinary
    cache_ok = True

    def process_bind_param(self, value: None | str, dialect: Any):
        if value is None:
            return None
        return zstd.compress(value.encode())

    def process_result_value(self, value: None | bytes, dialect: Any):
        if value is None:
            return None
        return zstd.decompress(value).decode()


class MixIn:
    __mapper_args__ = {"eager_defaults": True}

    def to_dict(self) -> dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if not k.startswith("_")}


class ForeignKey(sqlalchemy.ForeignKey):
    def __init__(self, *args, **kwargs) -> None:
        kwargs["ondelete"] = "restrict"
        kwargs["onupdate"] = "restrict"
        super().__init__(*args, **kwargs)


def created_at_of() -> Column[str]:
    return Column(String, server_default=sqlalchemy.text("current_timestamp"))


def updated_at_of() -> Column[str]:
    return Column(
        String,
        server_default=sqlalchemy.text("current_timestamp"),
        onupdate=datetime.datetime.utcnow,
    )


class User(MixIn, Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, nullable=False)
    enabled = Column(Boolean, nullable=False, default=True)
    current_patch_id = Column(
        Integer,
        ForeignKey("patches.id", deferrable=True, initially="IMMEDIATE"),
        index=True,
        nullable=False,
    )
    created_at = created_at_of()
    updated_at = updated_at_of()


class Patch(MixIn, Base):
    __tablename__ = "patches"
    __table_args__ = (
        CheckConstraint(
            "(id != parent_id) or (snapshot is not null)",
            name="root_node_should_have_snapshot",
        ),
    )

    id = Column(Integer, primary_key=True, index=True, nullable=False)
    user_id = Column(
        Integer,
        ForeignKey("users.id", deferrable=True, initially="IMMEDIATE"),
        index=True,
        nullable=False,
    )
    parent_id = Column(
        Integer,
        ForeignKey("patches.id", deferrable=True, initially="IMMEDIATE"),
        index=True,
        nullable=False,
    )  # The root node has a self link.
    patch = Column(CompressedString, nullable=False)
    snapshot = Column(CompressedString, nullable=True)
    created_at = created_at_of()
    updated_at = updated_at_of()
