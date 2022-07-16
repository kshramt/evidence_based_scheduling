import asyncio
import logging

import fastapi
import fastapi.middleware.gzip
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from . import crud, database, models, schemas

logger = logging.getLogger(__name__)

async def create_all():
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
asyncio.create_task(create_all())

app = fastapi.FastAPI()
app.add_middleware(fastapi.middleware.gzip.GZipMiddleware)


async def get_db():
    async with database.SessionLocal() as db:
        yield db


@app.post("/users/", response_model=schemas.User)
async def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    res = await crud.create_user(db=db, user=user)
    return res


@app.get("/users/", response_model=list[schemas.User])
async def read_users(offset: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return await crud.read_users(db, offset=offset, limit=limit)


@app.get("/users/{user_id}/", response_model=schemas.User)
async def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = await crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return db_user


@app.post("/users/{user_id}/sessions/", response_model=schemas.Session)
async def create_session_for_user(session: schemas.SessionCreate, user_id: int, db: Session = Depends(get_db)):
    return await crud.create_session_for_user(db, session=session, user_id=user_id)


@app.get("/users/{user_id}/sessions/", response_model=list[schemas.Session])
async def read_sessions_for_user(user_id: int, db: Session = Depends(get_db)):
    return await crud.read_sessions_for_user(db, user_id=user_id)


@app.get("/sessions/", response_model=list[schemas.Session])
async def read_sessions(
    offset: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    return await crud.get_sessions(db, offset=offset, limit=limit)


@app.get("/users/{user_id}/datas/{data_id}/")
async def get_data(user_id: int, data_id: int = fastapi.Path(ge=-1)):
    return dict(user_id=user_id, data_id=data_id)
