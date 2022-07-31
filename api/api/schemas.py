from typing import Any

import pydantic


class UserBase(pydantic.BaseModel):
    pass


class UserCreate(UserBase):
    pass


class User(UserBase):
    id: int
    enabled: bool
    current_patch_id: int

    class Config:
        orm_mode = True


class PatchBase(pydantic.BaseModel):
    parent_id: int
    user_id: int
    patch: str


class PatchCreate(PatchBase):
    pass


class Patch(PatchBase):
    id: int

    class Config:
        orm_mode = True


class DataBase(pydantic.BaseModel):
    pass


class Data(DataBase):
    data: None | dict[str, Any] = pydantic.Field(...)


class IntValue(pydantic.BaseModel):
    value: int
