import fastapi.staticfiles


class StaticFiles(fastapi.staticfiles.StaticFiles):
    async def get_response(self, *args, **kwargs):
        resp = await super().get_response(*args, **kwargs)
        if not str(getattr(resp, "path", "")).endswith(".html"):
            resp.headers["cache-control"] = "max-age=7776000, immutable"
        return resp
