import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from . import schemas

logger = logging.getLogger(__name__)


async def get_user(db: Session, user_id: int):
    return await db.scalar(select(models.User).filter(models.User.id == user_id))


async def get_users(db: Session, offset: int = 0, limit: int = 100):
    return (await db.scalars(select(models.User).offset(offset).limit(limit))).all()


async def create_user(db: Session, user: schemas.UserCreate, commit=True):
    db_user = models.User()
    db.add(db_user)
    if commit:
        await db.commit()
        await db.refresh(db_user)
    return db_user


async def create_session_for_user(
    db: Session, session: schemas.SessionCreate, user_id: int, commit=True
):
    db_session = models.Session(**session.dict(), user_id=user_id)
    db.add(db_session)
    if commit:
        await db.commit()
        await db.refresh(db_session)
    return db_session


async def get_sessions(db: Session, offset: int = 0, limit: int = 100):
    return (await db.scalars(select(models.Session).offset(offset).limit(limit))).all()


async def get_sessions_for_user(db: Session, user_id: int):
    db_user = await db.scalar(select(models.User).filter(models.User.id == user_id))
    if db_user is None:
        return []
    return db_user.sessions


async def create_snapshot(db: Session, user_id: int, version_id: int, data: str, commit=True):
    db_snapshot = models.Snapshot(user_id=user_id, version_id=version_id, data=data)
    db.add(db_snapshot)
    if commit:
        await db.commit()
        await db.refresh(db_snapshot)
    return db_snapshot
