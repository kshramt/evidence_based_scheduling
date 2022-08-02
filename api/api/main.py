import asyncio
import logging
from typing import Generic, Literal, TypeVar

import fastapi
import fastapi.middleware.cors
import fastapi.middleware.gzip
import pydantic
import pydantic.generics
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from . import crud, database, models, schemas

logger = logging.getLogger(__name__)


INITIAL_PATCH = '[{"op":"replace","path":"","value":{"data":null}}]'
INITIAL_SNAPSHOT = '{"data":null}'


THeader = TypeVar("THeader")
TBody = TypeVar("TBody")


async def create_all():
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)


asyncio.create_task(create_all())

app = fastapi.FastAPI()
app.add_middleware(fastapi.middleware.gzip.GZipMiddleware)
# app.add_middleware(
#     fastapi.middleware.cors.CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


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


class create_userReq(pydantic.BaseModel):
    body: schemas.UserCreate


class create_userRes(pydantic.BaseModel):
    path: str
    body: schemas.User


@with_path_of(app.post, "/users", response_model=create_userRes)
async def create_user(req: create_userReq, db: Session = Depends(get_db)):
    await db.execute("pragma defer_foreign_keys=ON")
    db_user = await crud.create_user(db=db, user=req.body, commit=False)
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
    return json_response_of(
        create_userRes,
        path=get_user.path_of(user_id=db_user.id),
        body=db_user.to_dict(),
    )


class get_userRes(pydantic.BaseModel):
    body: schemas.User


@with_path_of(app.get, "/users/{user_id}", response_model=get_userRes)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    return json_response_of(
        get_userRes, body=_get_user(db=db, user_id=user_id).to_dict()
    )


async def _get_user(db: Session, user_id: int):
    db_user = await crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return db_user


class get_patchRes(pydantic.BaseModel):
    body: schemas.Patch


@with_path_of(app.get, "/patches/{patch_id}", response_model=get_patchRes)
async def get_patch(patch_id: int, db: Session = Depends(get_db)):
    db_patch = await crud.get_patch(db, patch_id=patch_id)
    if db_patch is None:
        raise HTTPException(status_code=404, detail="Patch not found.")
    return json_response_of(get_patchRes, body=db_patch.to_dict())


class create_patchReq(pydantic.BaseModel):
    body: schemas.PatchCreate


class create_patchRes(pydantic.BaseModel):
    etag: int
    path: str
    body: schemas.Patch


@with_path_of(app.post, "/patches", response_model=create_patchRes)
async def create_patch(req: create_patchReq, db: Session = Depends(get_db)):
    db_parent_patch = await crud.get_patch(db, patch_id=req.body.parent_id)
    if db_parent_patch is None:
        raise HTTPException(status_code=400, detail="The parent patch should exist.")
    if db_parent_patch.user_id != req.body.user_id:
        raise HTTPException(status_code=400, detail="The parent patch should exist.")
    db_patch = await crud.create_patch(db=db, patch=req.body)
    return json_response_of(
        create_patchRes,
        etag=db_patch.id,
        path=get_patch.path_of(patch_id=db_patch.id),
        body=db_patch.to_dict(),
    )


class get_data_of_userRes(pydantic.BaseModel):
    etag: int
    path: str
    body: schemas.Data


@with_path_of(app.get, "/users/{user_id}/data", response_model=get_data_of_userRes)
async def get_data_of_user(user_id: int, db: Session = Depends(get_db)):
    patch_id = await crud.get_current_patch_id(db=db, user_id=user_id)
    if patch_id is None:
        raise HTTPException(status_code=404, detail="User not found.")

    return json_response_of(
        get_data_of_userRes,
        etag=patch_id,
        path=get_data.path_of(patch_id=patch_id),
        body=await _get_data(db=db, patch_id=patch_id),
    )


class get_dataRes(pydantic.BaseModel):
    etag: str
    body: schemas.Data


@with_path_of(
    app.get,
    "/data/{patch_id}",
    response_model=get_dataRes,
)
async def get_data(patch_id: int, db: Session = Depends(get_db)):
    return json_response_of(
        get_dataRes,
        etag=patch_id,
        body=await _get_data(db=db, patch_id=patch_id),
    )


async def _get_data(db: Session, patch_id: int):
    data = await crud.get_data(db=db, patch_id=patch_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Data not found.")
    return data


class put_id_of_data_of_userReqWithIfMatch(pydantic.BaseModel):
    if_match: int
    body: schemas.IntValue


class put_id_of_data_of_userReqWithoutIfMatch(pydantic.BaseModel):
    body: schemas.IntValue


class put_id_of_data_of_userRes200(pydantic.BaseModel):
    etag: int
    path: str
    status_code: Literal[200]
    body: schemas.IntValue


class put_id_of_data_of_userRes412Body(pydantic.BaseModel):
    updated_at: str


class put_id_of_data_of_userRes412(pydantic.BaseModel):
    status_code: Literal[412]
    body: put_id_of_data_of_userRes412Body


@with_path_of(
    app.put,
    "/users/{user_id}/data/id",
    response_model=put_id_of_data_of_userRes412 | put_id_of_data_of_userRes200,
)
async def put_id_of_data_of_user(
    user_id: int,
    req: put_id_of_data_of_userReqWithIfMatch | put_id_of_data_of_userReqWithoutIfMatch,
    db: Session = Depends(get_db),
):
    user = await _get_user(db=db, user_id=user_id)
    if (
        isinstance(req, put_id_of_data_of_userReqWithIfMatch)
        and req.if_match != user.current_patch_id
    ):
        current_patch = await crud.get_patch(db=db, patch_id=user.current_patch_id)
        if current_patch is None:
            raise RuntimeError(
                f"Must not happen: {user} does not have valid current_patch_id."
            )
        logging.error(vars(current_patch))
        return put_id_of_data_of_userRes412(
            status_code=412,
            body=put_id_of_data_of_userRes412Body(updated_at=current_patch.updated_at),
        )

    patch = await crud.get_patch(db=db, patch_id=req.body.value)
    if patch is None:
        raise HTTPException(status_code=400, detail="The patch should exist.")
    if patch.user_id != user_id:
        raise HTTPException(status_code=400, detail="The patch should exist.")

    user.current_patch_id = req.body.value
    await db.commit()

    return json_response_of(
        put_id_of_data_of_userRes200,
        status_code=200,
        etag=req.body.value,
        path=get_data.path_of(patch_id=req.body.value),
        body=dict(value=req.body.value),
    )


class get_id_of_data_of_userResBody(pydantic.BaseModel):
    value: int
    updated_at: str


class get_id_of_data_of_userRes(pydantic.BaseModel):
    etag: int
    path: str
    body: get_id_of_data_of_userResBody


@with_path_of(
    app.get,
    "/users/{user_id}/data/id",
    response_model=get_id_of_data_of_userRes,
)
async def get_id_of_data_of_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    db_user = await _get_user(db=db, user_id=user_id)
    db_patch = await crud.get_patch(db=db, patch_id=db_user.current_patch_id)
    if db_patch is None:
        raise RuntimeError(
            f"Must not happen: {db_user} does not have valid current_patch_id."
        )
    return json_response_of(
        get_id_of_data_of_userRes,
        etag=db_user.current_patch_id,
        path=get_data.path_of(patch_id=db_user.current_patch_id),
        body=dict(value=db_user.current_patch_id, updated_at=db_patch.updated_at),
    )


def json_response_of(cls, **kwargs):
    cls(**kwargs)  # Check
    return fastapi.responses.JSONResponse(kwargs)


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
