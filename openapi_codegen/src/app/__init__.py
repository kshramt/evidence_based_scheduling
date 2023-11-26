import abc
import sys
from typing import Literal, Self

import pydantic
import yaml


class NoExtraModel(pydantic.BaseModel):
    class Config:
        extra = pydantic.Extra.forbid


class AbstractSchema(NoExtraModel, abc.ABC):
    @abc.abstractmethod
    def type_repr(self: Self) -> str:
        ...


class AnySchema(AbstractSchema):
    description: str

    def type_repr(self: Self) -> str:
        return "serde_json::Value"


class ArraySchema(AbstractSchema):
    type: Literal["array"]
    items: "NonObjectSchema"

    def type_repr(self: Self) -> str:
        return f"Vec<{self.items.type_repr()}>"


class BooleanSchema(AbstractSchema):
    type: Literal["boolean"]

    def type_repr(self: Self) -> str:
        return "bool"


class StringSchema(AbstractSchema):
    type: Literal["string"]
    format: None | Literal["date-time"] = None

    def type_repr(self: Self) -> str:
        return "String"


class IntegerSchema(AbstractSchema):
    type: Literal["integer"]
    format: Literal["int32", "int64"]

    def type_repr(self: Self) -> str:
        return "i32" if self.format == "int32" else "i64"


class ObjectSchema(AbstractSchema):
    type: Literal["object"]
    properties: dict[str, "NonObjectSchema"]
    required: None | list[str] = None

    def type_repr(self: Self) -> str:
        raise RuntimeError("Must not happen.")


class Ref(AbstractSchema):
    ref: str = pydantic.Field(..., alias="$ref")

    def type_repr(self: Self) -> str:
        return self.ref.split("/")[-1]


type NonObjectSchema = (
    Ref | StringSchema | IntegerSchema | BooleanSchema | AnySchema | ArraySchema
)

type Schema = (
    Ref
    | StringSchema
    | IntegerSchema
    | ObjectSchema
    | BooleanSchema
    | AnySchema
    | ArraySchema
)


class BearerSecurityScheme(NoExtraModel):
    type: Literal["http"]
    scheme: Literal["bearer"]
    description: None | str = None


SecurityScheme = BearerSecurityScheme


class BearerAuth(NoExtraModel):
    bearerAuth: list[None]


class Content(NoExtraModel):
    class _Schema(NoExtraModel):
        schema: Ref

    applicationJson: _Schema = pydantic.Field(..., alias="application/json")


class OpenApi(NoExtraModel):
    class Info(NoExtraModel):
        title: str
        version: str

    class Path(NoExtraModel):
        class Operation(NoExtraModel):
            class Parameter(NoExtraModel):
                name: str
                in_: Literal["path", "query"] = pydantic.Field(..., alias="in")
                required: bool
                schema: NonObjectSchema

            class RequestBody(NoExtraModel):
                required: Literal[True]
                content: Content

            class Response(NoExtraModel):
                description: str
                content: Content

            summary: str
            parameters: None | list[Parameter] = None
            requestBody: RequestBody
            responses: dict[str, Response]
            security: None | list[BearerAuth] = None

        get: None | Operation = None
        post: None | Operation = None
        put: None | Operation = None
        delete: None | Operation = None

    class Components(NoExtraModel):
        schemas: dict[str, ObjectSchema]
        securitySchemes: dict[str, SecurityScheme]

    openapi: str
    info: Info
    security: None | list[BearerAuth] = None
    paths: dict[str, Path]
    components: Components


def gen_schemas(spec: OpenApi) -> None:
    for name, schema in spec.components.schemas.items():
        required_fields = set(schema.required or [])
        print("#[derive(Debug, serde::Deserialize, serde::Serialize)]")
        print(f"pub struct {name} {{")
        for field_name, field_schema in schema.properties.items():
            type_repr = field_schema.type_repr()
            if field_name not in required_fields:
                type_repr = f"Option<{type_repr}>"
            print(f"    pub {field_name}: {type_repr},")
        print("}")


def gen(spec: OpenApi) -> None:
    gen_schemas(spec)


def main() -> None:
    spec = OpenApi.parse_obj(yaml.safe_load(sys.stdin))
    gen(spec)

