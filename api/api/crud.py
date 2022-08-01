import json
import logging
import time

import jsonpatch
from sqlalchemy import and_, func, join, select
from sqlalchemy.orm import Session

from . import models, schemas

logger = logging.getLogger(__name__)


async def get_user(db: Session, user_id: int):
    return await db.scalar(select(models.User).filter(models.User.id == user_id))


async def get_users(db: Session, offset: int = 0, limit: int = 100):
    return (await db.scalars(select(models.User).offset(offset).limit(limit))).all()


async def create_user(db: Session, user: schemas.UserCreate, commit=True):
    db_user = models.User(current_patch_id=0)
    db.add(db_user)
    if commit:
        await db.commit()
        await db.refresh(db_user)
    return db_user


async def get_patch(db: Session, patch_id: int):
    return await db.scalar(select(models.Patch).filter(models.Patch.id == patch_id))


async def create_patch(
    db: Session, patch: schemas.PatchCreate, snapshot=None, commit=True
):
    db_patch = models.Patch(**patch.dict(), snapshot=snapshot)
    db.add(db_patch)
    if commit:
        await db.commit()
        await db.refresh(db_patch)
    return db_patch


async def get_current_patch_id(db: Session, user_id: int):
    return await db.scalar(
        select(models.User.current_patch_id).filter(models.User.id == user_id)
    )


async def get_data(db: Session, patch_id: int, commit=True):
    select_cols = (
        models.Patch.id,
        models.Patch.parent_id,
        models.Patch.patch,
        models.Patch.snapshot,
    )

    branch = select(select_cols).where(models.Patch.id == patch_id).cte(recursive=True)

    # There should be no duplications.
    branch = branch.union_all(
        select(select_cols).select_from(
            join(
                branch,
                models.Patch,
                and_(branch.c.snapshot == None, branch.c.parent_id == models.Patch.id),
            )
        )
    )
    stmt = select((func.coalesce(branch.c.snapshot, branch.c.patch),)).order_by(
        branch.c.id
    )
    t1 = time.monotonic()
    ss = (await db.scalars(stmt)).all()
    if not ss:
        return None
    res = json.loads(ss[0])
    for patch in ss[1:]:
        jsonpatch.apply_patch(res, patch, in_place=True)
    t2 = time.monotonic()
    if 1 < t2 - t1:
        db_patch = await get_patch(db=db, patch_id=patch_id)
        if db_patch is None:
            raise RuntimeError(f"Must not happen: db_patch is None for {patch_id}")
        db_patch.snapshot = json.dumps(
            res, sort_keys=True, ensure_ascii=False, separators=(",", ":")
        )
        if commit:
            await db.commit()
    return res
