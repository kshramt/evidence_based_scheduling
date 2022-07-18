from sqlalchemy import Column, Integer, ForeignKey, String, Index, Boolean
import sqlalchemy.orm

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    enabled = Column(Boolean, nullable=False, default=True)

    sessions = sqlalchemy.orm.relationship("Session", back_populates="user")


class Snapshot(Base):
    __tablename__ = "snapshot"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="restrict",
            onupdate="restrict",
        ),
        index=True,
        nullable=False,
    )
    version_id = Column(Integer, index=True, nullable=False)
    data = Column(String, nullable=False)

    # __table_args__ = (Index("index_user_id_version_id", "user_id", "version_id"),)


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="restrict",
            onupdate="restrict",
        ),
        index=True,
        nullable=False,
    )

    user = sqlalchemy.orm.relationship("User", back_populates="sessions")


class Patches(Base):
    __tablename__ = "patchess"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(
        Integer,
        ForeignKey("sessions.id", ondelete="restrict", onupdate="restrict"),
        index=True,
        nullable=False,
    )
    version_id = Column(Integer, index=True, nullable=False)
    patches = Column(String, nullable=False)
