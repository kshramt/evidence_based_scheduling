import datetime

from sqlalchemy import Column, Integer, String, Index, Boolean, DateTime, CheckConstraint
import sqlalchemy
import sqlalchemy.orm

from .database import Base


class MixIn:
    __mapper_args__ = {"eager_defaults": True}


class ForeignKey(sqlalchemy.ForeignKey):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, ondelete="restrict", onupdate="restrict", **kwargs)


def created_at_of():
    return Column(String, server_default=sqlalchemy.text("current_timestamp"))


def updated_at_of():
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
        nullable=False,
    )
    created_at = created_at_of()
    updated_at = updated_at_of()


class Patch(MixIn, Base):
    __tablename__ = "patches"
    __table_args__ = (CheckConstraint("(id != parent_id) or (snapshot is not null)", name="root_node_should_have_snapshot"),)

    id = Column(Integer, primary_key=True, index=True, nullable=False)
    user_id = Column(
        Integer,
        ForeignKey("users.id", deferrable=True, initially="IMMEDIATE"),
        nullable=False,
    )
    parent_id = Column(
        Integer,
        ForeignKey("patches.id", deferrable=True, initially="IMMEDIATE"),
        nullable=False,
    )  # The root node has a self link.
    patch = Column(String, nullable=False)
    snapshot = Column(String, nullable=True)
    created_at = created_at_of()
    updated_at = updated_at_of()
