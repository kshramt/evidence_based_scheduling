import pydantic


class UserBase(pydantic.BaseModel):
    pass


class UserCreate(UserBase):
    pass


class User(UserBase):
    id: int
    enabled: bool

    class Config:
        orm_mode = True


class SessionBase(pydantic.BaseModel):
    pass


class SessionCreate(SessionBase):
    pass


class Session(SessionBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True


class PatchesBase(pydantic.BaseModel):
    version_id: int
    patches: str


class PatchesCreate(PatchesBase):
    pass


class Patches(PatchesBase):
    id: int
    session_id: int

    class Config:
        orm_mode = True
