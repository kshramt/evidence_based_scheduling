import fastapi.staticfiles
import starlette.types


class StaticFiles(fastapi.staticfiles.StaticFiles):
    async def get_response(
        self, path: str, scope: starlette.types.Scope
    ) -> fastapi.Response:
        resp = await super().get_response(path=path, scope=scope)
        # path = str(getattr(resp, "path", ""))
        # if not (path.endswith(".html") or path.endswith("/")):
        #     resp.headers["cache-control"] = "max-age=7776000, immutable"
        return resp
