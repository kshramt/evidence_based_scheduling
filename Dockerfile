from node:18.7.0-bullseye-slim as base_js
from python:3.10.6-slim-bullseye as base_py
env PYTHONUNBUFFERED 1
env PYTHONDONTWRITEBYTECODE 1

from base_js as base_client
from base_py as base_api

from base_client as builder_client
workdir /app/client
copy client/package.json client/package-lock.json ./
run npm ci
copy client .

from builder_client as test_builder_client

from builder_client as prod_builder_client
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

from base_api as builder_litestream
run apt-get update && apt-get install -y wget
run wget https://github.com/benbjohnson/litestream/releases/download/v0.3.9/litestream-v0.3.9-linux-amd64.deb
run dpkg -i litestream-v0.3.9-linux-amd64.deb

from prod_builder_api as prod
expose 8080
env DATA_DIR /data

copy --from=builder_litestream /usr/bin/litestream /usr/bin/litestream
copy --from=prod_builder_client /app/client/build client
copy --from=prod_builder_api /app/.venv .venv
copy --from=prod_builder_api /app/log-config.json log-config.json
copy --from=prod_builder_api /app/api api
cmd ["scripts/run.sh"]
