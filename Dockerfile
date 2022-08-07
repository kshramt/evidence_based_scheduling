from node:18.7.0-bullseye-slim as base_js
from python:3.10.6-slim-bullseye as base_py
env PYTHONUNBUFFERED 1
env PYTHONDONTWRITEBYTECODE 1

from base_js as base_client
from base_py as base_api

from base_client as builder_client
workdir /app/client
copy client/package.json client/package-lock.json ./

from builder_client as test_builder_client
run npm ci
copy client .
run npm run build

from builder_client as prod_builder_client
run npm ci --omit=dev
copy client .
run npm run build

from base_api as builder_api
workdir /app
run pip install --no-cache-dir poetry==1.1.14
copy api .

from builder_api as test_builder_api
run python3 -m poetry install
# copy --from=test_builder_client /app/client/build client

from builder_api as prod_builder_api
run python3 -m poetry install --no-dev

from prod_builder_api as prod
env DATA_DIR /data
copy --from=prod_builder_client /app/client/build client
copy --from=prod_builder_api /app/.venv .venv
copy --from=prod_builder_api /app/log-config.json log-config.json
copy --from=prod_builder_api /app/api api
cmd [".venv/bin/python3", "-OO", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--log-config", "log-config.json"]
