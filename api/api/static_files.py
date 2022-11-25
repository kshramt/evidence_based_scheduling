import fastapi.staticfiles


class StaticFiles(fastapi.staticfiles.StaticFiles):
    async def get_response(self, *args, **kwargs):
        resp = await super().get_response(*args, **kwargs)
        path = str(getattr(resp, "path", ""))
        if not (path.endswith(".html") or path.endswith("/")):
            resp.headers["cache-control"] = "max-age=7776000, immutable"
        return resp
