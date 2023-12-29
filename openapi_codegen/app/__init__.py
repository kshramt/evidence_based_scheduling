import abc
import json
import re
import sys
from collections.abc import Iterable
from typing import Final, Literal, Self, TypeAlias

import pydantic
import yaml

SEP_PAT: Final = re.compile(r"[/_{}:~]")


class NoExtraModel(pydantic.BaseModel):
    class Config:
        extra = "forbid"


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

    def type_repr(self: Self) -> str:
        return "String"


class DateTimeSchema(AbstractSchema):
    type: Literal["string"]
    format: Literal["date-time"]

    def type_repr(self: Self) -> str:
        return "chrono::DateTime<chrono::Utc>"


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


NonObjectSchema: TypeAlias = (
    Ref
    | StringSchema
    | DateTimeSchema
    | IntegerSchema
    | BooleanSchema
    | AnySchema
    | ArraySchema
)

Schema: TypeAlias = (
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
    bearerAuth: list[None]  # noqa: N815


class Content(NoExtraModel):
    class _Schema(NoExtraModel):
        schema_: Ref = pydantic.Field(..., alias="schema")

    applicationJson: _Schema = pydantic.Field(..., alias="application/json")  # noqa: N815


class Operation(NoExtraModel):
    class Parameter(NoExtraModel):
        name: str
        in_: Literal["path", "query"] = pydantic.Field(..., alias="in")
        required: bool
        schema_: NonObjectSchema = pydantic.Field(..., alias="schema")

    class RequestBody(NoExtraModel):
        required: Literal[True]
        content: Content

    class Response(NoExtraModel):
        description: str
        content: Content

    summary: str
    parameters: None | list[Parameter] = None
    requestBody: None | RequestBody = None  # noqa: N815
    responses: dict[str, Response]
    security: None | tuple[()] | tuple[BearerAuth] = None


class OpenApi(NoExtraModel):
    class Info(NoExtraModel):
        title: str
        version: str

    class Components(NoExtraModel):
        schemas: dict[str, ObjectSchema]
        securitySchemes: dict[str, SecurityScheme]  # noqa: N815

    class Server(NoExtraModel):
        url: str

    openapi: str
    info: Info
    security: None | tuple[()] | tuple[BearerAuth] = None
    servers: tuple[Server]
    paths: dict[str, dict[str, Operation]]
    components: Components

    def gen(self: Self) -> None:
        self.gen_schemas()
        self.gen_responses()
        self.gen_api()
        self.gen_register()

    def gen_schemas(self: Self) -> None:
        for name, schema in self.components.schemas.items():
            required_fields = set(schema.required or [])
            print(f"""\
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct {name} {{""")
            for field_name, field_schema in schema.properties.items():
                type_repr = field_schema.type_repr()
                if field_name not in required_fields:
                    type_repr = f"Option<{type_repr}>"
                print(f"    pub {field_name}: {type_repr},")
            print(
                """\
}"""
            )

    def gen_responses(self: Self) -> None:
        for path, op_name, op_def in self._get_ops():
            type_name = _get_type_name_of_path_and_op(path, op_name)
            path_params = _get_path_params(op_def)
            if path_params:
                print(
                    f"""\
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize)]
pub struct {type_name}Path {{"""
                )
                for param in path_params:
                    typ = param.schema_.type_repr()
                    if not param.required:
                        typ = f"Option<{typ}>"
                    print(
                        f"""\
    pub {param.name}: {typ},"""
                    )
                print(
                    """\
}"""
                )
            query_params = _get_query_params(op_def)
            if query_params:
                print(
                    f"""\
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize)]
pub struct {type_name}Query {{"""
                )
                for param in query_params:
                    typ = param.schema_.type_repr()
                    if not param.required:
                        typ = f"Option<{typ}>"
                    print(
                        f"""\
    pub {param.name}: {typ},"""
                    )
                print(
                    """\
}"""
                )
            print(
                f"""\
#[rustfmt::skip]
#[derive(Debug)]
pub enum {type_name} {{"""
            )
            for resp_code, resp_def in op_def.responses.items():
                print(
                    f"""\
    S{resp_code}({resp_def.content.applicationJson.schema_.type_repr()}),"""
                )
            print(
                """
}"""
            )
            print(
                f"""\
#[rustfmt::skip]
impl axum::response::IntoResponse for {type_name} {{
    fn into_response(self) -> axum::response::Response {{
        match self  {{"""
            )
            for resp_code, _ in op_def.responses.items():
                print(
                    f"""\
            {type_name}::S{resp_code}(body) => (axum::http::StatusCode::{_STATUS_CODE_DICT[resp_code]}, axum::Json(body)),"""
                )
            print(
                """
        }.into_response()
    }
}"""
            )

    def gen_api(self: Self) -> None:
        print(
            """\
#[rustfmt::skip]
#[async_trait::async_trait]
pub trait Api {
    type TError: axum::response::IntoResponse;
    type TState: Clone + Send + Sync;
    type TToken: axum::extract::FromRequestParts<Self::TState, Rejection = Self::TError> + Send;

"""
        )
        for path, op_name, op_def in self._get_ops():
            security = self._get_security(path, op_name)
            fn_name = _get_fn_name(path, op_name)
            type_name = _get_type_name_of_path_and_op(path, op_name)
            print(
                f"""\
    async fn {fn_name}(
        state: axum::extract::State<Self::TState>,"""
            )
            if security is not None:
                print(
                    """\
        token: Self::TToken,"""
                )
            path_params = _get_path_params(op_def)
            if path_params:
                print(
                    f"""\
        path: axum::extract::Path<{type_name}Path>,"""
                )
            query_params = _get_query_params(op_def)
            if query_params:
                print(
                    f"""\
        query: axum::extract::Query<{type_name}Query>,"""
                )
            if op_def.requestBody:
                print(
                    f"""\
        body: axum::extract::Json<{op_def.requestBody.content.applicationJson.schema_.type_repr()}>,"""
                )
            print(
                f"""\
    ) -> Result<{type_name}, Self::TError>;"""
            )
        print(
            """\
}"""
        )

    def gen_register(self: Self) -> None:
        print(
            """\
#[rustfmt::skip]
pub fn register_app<TApi: Api + 'static>(
    app: axum::Router<TApi::TState>,
) -> axum::Router<TApi::TState> {"""
        )
        for path, op_name, _ in self._get_ops():
            print(
                f"""\
    let app = app.route({_get_axum_string(path)}, axum::routing::{op_name}(TApi::{_get_fn_name(path, op_name)}));"""
            )
        print(
            f"""\
    axum::Router::new().nest({_get_axum_string(self.servers[0].url)}, app)
}}"""
        )

    def _get_security(self: Self, path: str, op_name: str) -> None | BearerAuth:
        """Get the default security and check if it is modified at the operation level."""
        security = self.security
        op_security = self.paths[path][op_name].security
        if op_security is not None:
            security = op_security
        match security:
            case None:
                return None
            case ():
                return None
            case (BearerAuth(),):
                return security[0]
            case _:
                raise NotImplementedError("Multiple security is not supported.")

    def _get_ops(self: Self) -> Iterable[tuple[str, str, Operation]]:
        for path, path_ops in self.paths.items():
            for op_name, op_def in path_ops.items():
                yield path, op_name, op_def


_STATUS_CODE_DICT: Final = {
    "200": "OK",
    "201": "CREATED",
    "204": "NO_CONTENT",
    "400": "BAD_REQUEST",
    "401": "UNAUTHORIZED",
    "403": "FORBIDDEN",
    "404": "NOT_FOUND",
    "409": "CONFLICT",
}


def _get_axum_string(s: str) -> str:
    return json.dumps(s.replace("{", ":").replace("}", ""))


def _get_path_params(op_def: Operation) -> list[Operation.Parameter]:
    return [param for param in op_def.parameters or [] if param.in_ == "path"]


def _get_query_params(op_def: Operation) -> list[Operation.Parameter]:
    return [param for param in op_def.parameters or [] if param.in_ == "query"]


def _get_fn_name(path: str, op_name: str) -> str:
    """Returns function name for the operation.

    # Examples
    >>> _get_fn_name("/api/v2/users/{user_id}", "get")
    "api_v2_users_user_id_get"
    """
    pat = SEP_PAT
    parts = pat.split(path) + pat.split(op_name)
    parts = [part.lower() for part in parts if part]
    return "_".join(parts)


def _get_type_name_of_path_and_op(path: str, op_name: str) -> str:
    """Returns enum name for the operation.

    # Examples
    >>> _get_enum_name("/api/v2/users/{user_id}", "get")
    "ApiV2UsersUserIdGet"
    """
    pat = SEP_PAT
    parts = pat.split(path) + pat.split(op_name)
    parts = [part.capitalize() for part in parts if part]
    return "".join(parts)


def main() -> None:
    spec = OpenApi.model_validate(yaml.safe_load(sys.stdin))
    spec.gen()
