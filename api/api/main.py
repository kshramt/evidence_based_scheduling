from typing import Any
import asyncio
import logging

import fastapi
import fastapi.middleware.gzip
from fastapi import Depends, HTTPException, Response, Header
from sqlalchemy.orm import Session

from . import crud
from . import database
from . import models
from . import schemas

logger = logging.getLogger(__name__)


INITIAL_PATCH = '[{"op": "replace", "path": "", "value": {"data": null}}]'
INITIAL_SNAPSHOT = '{"data": null}'


async def create_all():
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)


asyncio.create_task(create_all())

app = fastapi.FastAPI()
app.add_middleware(fastapi.middleware.gzip.GZipMiddleware)


def with_path_of(app, path: str, *args, **kwargs):
    def deco(fn):
        res = app(path, *args, **kwargs)(fn)
        res.path_of = path.format  # type: ignore
        return res

    return deco


async def get_db():
    async with database.SessionLocal() as db:
        try:
            yield db
        except:
            await db.rollback()
            raise


@with_path_of(app.post, "/users", response_model=schemas.User)
async def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    await db.execute("pragma defer_foreign_keys=ON")
    db_user = await crud.create_user(db=db, user=user, commit=False)
    await db.flush()
    db_patch = await crud.create_patch(
        db=db,
        patch=schemas.PatchCreate(user_id=db_user.id, patch=INITIAL_PATCH, parent_id=0),
        snapshot=INITIAL_SNAPSHOT,
        commit=False,
    )
    await db.flush()
    db_user.current_patch_id = db_patch.id
    db_patch.parent_id = db_patch.id
    await db.commit()
    await db.refresh(db_user)
    return db_user


@app.get("/users", response_model=list[schemas.User])
async def get_users(offset: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return await crud.get_users(db, offset=offset, limit=limit)


@app.get("/users/{user_id}", response_model=schemas.User)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    return await _get_user(db=db, user_id=user_id)


async def _get_user(db: Session, user_id: int):
    db_user = await crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return db_user


@app.get("/patches", response_model=list[schemas.Patch])
async def get_patches(offset: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return await crud.get_patches(db, offset=offset, limit=limit)


@with_path_of(app.get, "/patches/{patch_id}", response_model=schemas.Patch)
async def get_patch(patch_id: int, db: Session = Depends(get_db)):
    db_patch = await crud.get_patch(db, patch_id=patch_id)
    if db_patch is None:
        raise HTTPException(status_code=404, detail="Patch not found.")
    return db_patch


@with_path_of(app.post, "/patches", response_model=schemas.Patch)
async def create_patch(
    patch: schemas.PatchCreate, resp: Response, db: Session = Depends(get_db)
):
    db_parent_patch = await crud.get_patch(db, patch_id=patch.parent_id)
    if db_parent_patch is None:
        raise HTTPException(status_code=400, detail="The parent patch should exist.")
    if db_parent_patch.user_id != patch.user_id:
        raise HTTPException(status_code=400, detail="The parent patch should exist.")
    db_patch = await crud.create_patch(db=db, patch=patch)
    resp.headers["content-location"] = get_patch.path_of(patch_id=db_patch.id)
    return db_patch


@with_path_of(app.get, "/users/{user_id}/data", response_model=schemas.Data)
async def get_data_of_user(user_id: int, resp: Response, db: Session = Depends(get_db)):
    patch_id = await crud.get_current_patch_id(db=db, user_id=user_id)
    if patch_id is None:
        raise HTTPException(status_code=404, detail="User not found.")
    resp.headers["content-location"] = get_data.path_of(patch_id=patch_id)
    return await _get_data(db=db, patch_id=patch_id)


@with_path_of(app.get, "/data/{patch_id}", response_model=schemas.Data)
async def get_data(patch_id: int, db: Session = Depends(get_db)):
    return await _get_data(db=db, patch_id=patch_id)


async def _get_data(db: Session, patch_id: int):
    data = await crud.get_data(db=db, patch_id=patch_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Data not found.")
    return schemas.Data(id=patch_id, data=data)


@with_path_of(app.put, "/users/{user_id}/data/id", response_model=schemas.IntValue)
async def put_id_of_data_of_user(
    user_id: int,
    patch_id_value: schemas.IntValue,
    resp: Response,
    if_match: None | int = Header(default=None),
    db: Session = Depends(get_db),
):
    user = await _get_user(db=db, user_id=user_id)

    if if_match is not None and if_match != user.current_patch_id:
        raise HTTPException(status_code=412, detail="Data have been changed.")

    patch = await crud.get_patch(db=db, patch_id=patch_id_value.value)
    if patch is None:
        raise HTTPException(status_code=400, detail="The patch should exist.")
    if patch.user_id != user_id:
        raise HTTPException(status_code=400, detail="The patch should exist.")

    user.current_patch_id = patch_id_value.value
    await db.commit()

    resp.headers["etag"] = str(patch_id_value.value)
    return patch_id_value


def _set_handlers(logger, paths, level_stderr=logging.INFO, level_path=logging.DEBUG):
    fmt = logging.Formatter(
        # "%(levelname)s\t%(process)d\t%(asctime)s\t%(pathname)s\t%(funcName)s\t%(lineno)d\t%(message)s"
        # "%(levelname)s\t%(asctime)s\t%(pathname)s\t%(funcName)s\t%(lineno)d\t%(message)s"
        "%(levelname)s\t%(asctime)s\t%(name)s\t%(funcName)s\t%(lineno)d\t%(message)s"
    )
    # import pythonjsonlogger.jsonlogger
    # fmt = pythonjsonlogger.jsonlogger.JsonFormatter(
    #     "%(levelname) %(asctime) %(message) %(processName) %(process) %(threadName) %(thread) %(pathname) %(module) %(funcName) %(lineno)",
    #     json_ensure_ascii=False,
    #     rename_fields=dict(asctime="timestamp", levelname="severity")
    # )
    import time

    fmt.converter = time.gmtime  # type: ignore
    fmt.default_time_format = "%Y-%m-%dT%H:%M:%S"
    fmt.default_msec_format = "%s.%03dZ"

    import sys

    hdl = logging.StreamHandler(sys.stderr)
    hdl.setFormatter(fmt)
    hdl.setLevel(level_stderr)
    logger.setLevel(logging.DEBUG)
    logger.addHandler(hdl)

    import pathlib

    for path in paths:
        path = pathlib.Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        hdl_ = logging.FileHandler(path)
        hdl_.setFormatter(fmt)
        hdl_.setLevel(level_path)
        logger.addHandler(hdl_)

    logger.info(dict(log_files=paths))
    return logger


_set_handlers(logging.getLogger(), ["app.log"])
