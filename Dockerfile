from node:18.7.0-bullseye-slim as base_js
from python:3.10.6-slim-bullseye as base_py
env PYTHONUNBUFFERED 1
env PYTHONDONTWRITEBYTECODE 1

from base_js as base_client
run useradd --create-home app
user app

from base_py as base_api
run useradd --create-home app
user app

from base_client as builder_client
workdir /home/app/app/client
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
workdir /home/app/app
run pip install --user --no-cache-dir poetry==1.1.14
copy api .

from builder_api as test_builder_api
run python3 -m poetry install
# copy --from=test_builder_client /app/client/build client

from builder_api as prod_builder_api
run python3 -m poetry install --no-dev

from base_api as builder_litestream
user root
run apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y wget
workdir /tmp
run wget https://github.com/benbjohnson/litestream/releases/download/v0.3.9/litestream-v0.3.9-linux-amd64.deb
run dpkg -i litestream-v0.3.9-linux-amd64.deb

from prod_builder_api as prod
expose 8080
env DATA_DIR /home/app/data

copy --from=builder_litestream /usr/bin/litestream /usr/bin/litestream
copy --from=prod_builder_client /home/app/app/client/build client
copy --from=prod_builder_api /home/app/app/.venv .venv
copy --from=prod_builder_api /home/app/app/log-config.json log-config.json
copy --from=prod_builder_api /home/app/app/api api
cmd ["scripts/run.sh"]
