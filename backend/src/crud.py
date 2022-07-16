import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from . import schemas

logger = logging.getLogger(__name__)


async def get_user(db: Session, user_id: int):
    return await db.execute(
        select(models.User).filter(models.User.id == user_id).first()
    )


async def read_users(db: Session, offset: int = 0, limit: int = 100):
    return (await db.execute(select(models.User).offset(offset).limit(limit))).all()


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
    return (await db.execute(select(models.Session).offset(offset).limit(limit))).all()


async def read_sessions_for_user(db: Session, user_id: int):
    db_user = await db.execute(
        select(models.User).filter(models.User.id == user_id).first()
    )
    if db_user is None:
        return []
    return db_user.sessions
