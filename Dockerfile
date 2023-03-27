from node:18.7.0-bullseye-slim as base_js

from python:3.11.0-slim-bullseye as base_py
env PYTHONUNBUFFERED 1
env PYTHONDONTWRITEBYTECODE 1
workdir /app

from nginx:1.23.3-alpine as base_nginx

from envoyproxy/envoy:v1.25.1 as base_envoy

from postgres:15.2-bullseye as base_postgres

from base_py as base_poetry
run --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y build-essential
run --mount=type=cache,target=/root/.cache pip install poetry==1.3.1

from golang:1.20.1-bullseye as base_go

from base_go as protoc_gen_go_grpc_builder
run --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.2.0

from base_go as protoc_gen_go_builder
run --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.28.1

from base_poetry as base_protoc
run --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y wget unzip
workdir /tmp
run os="$(uname -s | tr '[:upper:]' '[:lower:]')" \
   && arch="$(uname -m)" \
   && if [ $arch = "arm64" ]; then arch="aarch_64"; elif [ $arch = "aarch64" ]; then arch="aarch_64"; elif [ $arch = "amd64" ]; then arch="x86_64"; fi \
   && wget https://github.com/protocolbuffers/protobuf/releases/download/v22.1/protoc-22.1-"${os}"-"${arch}".zip \
   -O protoc.zip \
   && unzip protoc.zip -d protoc \
   && mv protoc/bin/protoc /usr/local/bin/protoc \
   && mv protoc/include/* /usr/local/include/
copy --from=protoc_gen_go_grpc_builder /go/bin/protoc-gen-go-grpc /usr/local/bin/protoc-gen-go-grpc
copy --from=protoc_gen_go_builder /go/bin/protoc-gen-go /usr/local/bin/protoc-gen-go
workdir /grpc_py
copy grpc_py/poetry.toml grpc_py/pyproject.toml grpc_py/poetry.lock .
run --mount=type=cache,target=/root/.cache python3 -m poetry install --only main

from base_js as base_client
workdir /app/client

from base_client as client_npm_ci
copy client/package.json client/package-lock.json ./
run --mount=type=cache,target=/root/.cache npm ci

from client_npm_ci as client_proto
copy proto ../proto
run cd ../proto \
   && PATH="${PWD}/../client/node_modules/.bin:${PATH}" buf generate --config buf.yaml --template buf.gen-client.yaml \
   && sed -i -e 's/api_pb.js"/api_pb"/' ../client/src/gen/api/v1/api_connect.ts

from client_npm_ci as builder_client
copy client .
copy --from=client_proto /app/client/src/gen /app/client/src/gen

from builder_client as test_client
run --mount=type=cache,target=/root/.cache scripts/check.sh

from builder_client as prod_client
run --mount=type=cache,target=/root/.cache npm run build

from base_nginx as prod_nginx
copy --from=prod_client /app/client/dist /usr/share/nginx/html
copy nginx.conf /etc/nginx/nginx.conf

from base_go as builder_litestream
run --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install github.com/benbjohnson/litestream/cmd/litestream@v0.3.9

from base_envoy as prod_envoy
expose 8080
workdir /app
copy ./envoy.yaml /etc/envoy/envoy.yaml

from base_go as dbmate_builder
run --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install github.com/amacneil/dbmate@v1.16.2

from base_postgres as prod_postgres
copy --from=dbmate_builder /go/bin/dbmate /usr/local/bin/dbmate
copy db/scripts/migrate.sh /app/scripts/migrate.sh
copy db/migrations /app/db/migrations

from base_go as sqlc_builder
run --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y build-essential
run --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install github.com/kyleconroy/sqlc/cmd/sqlc@v1.17.2

from base_go as go_db_builder
workdir /app
copy --from=sqlc_builder /go/bin/sqlc /usr/local/bin/sqlc
copy db db
copy sqlc.yaml .
run /usr/local/bin/sqlc --experimental generate

from base_protoc as go_api_v1_grpc_builder
workdir /app
copy proto proto
run mkdir -p gen/api/v1 \
   && protoc --experimental_allow_proto3_optional -Iproto api/v1/api.proto --go_out gen --go_opt paths=source_relative --go-grpc_out gen --go-grpc_opt paths=source_relative  --go_opt Mapi/v1/api.proto=github.com/kshramt/evidence_based_scheduling/gen/api/v1 --go-grpc_opt Mapi/v1/api.proto=github.com/kshramt/evidence_based_scheduling/gen/api/v1

from base_protoc as tests_server_grpc_builder
workdir /app
copy proto proto
run mkdir -p gen/api/v1 \
   && touch gen/__init__.py gen/api/__init__.py gen/api/v1/__init__.py \
   && /grpc_py/.venv/bin/python3 -m grpc_tools.protoc -Iproto api/v1/api.proto --python_out=gen --pyi_out=gen --grpc_python_out=gen \
   && sed -i 's/^from api\.v.* import/from . import/' gen/api/v1/api_pb2_grpc.py

from base_go as base_go_builder
workdir /app
copy go/go.mod go/go.sum ./
run --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go mod download
copy go .
copy --from=go_db_builder /app/go/db db
copy --from=go_api_v1_grpc_builder /app/gen gen
run --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go vet -v ./...
run --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go test -v ./...

from base_go_builder as api_v1_builder
run --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go build api_v1/main.go

from gcr.io/distroless/base-debian11:latest as prod_api_v1
workdir /app
copy --from=api_v1_builder /app/main .
entrypoint ["./main"]

from base_go as docker_go_builder
run --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install github.com/docker/cli/cmd/docker@v23.0.1
run --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod cd /tmp \
   && git clone --depth=1 --branch v2.16.0 https://github.com/docker/compose.git \
   && cd compose \
   && go build -o docker-compose cmd/main.go \
   && mv docker-compose /go/bin/

from base_poetry as tests_server
copy --from=docker/buildx-bin:0.10.3 /buildx /usr/libexec/docker/cli-plugins/docker-buildx
copy --from=docker_go_builder /go/bin/docker /usr/local/bin/docker
copy --from=docker_go_builder /go/bin/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose
copy tests/server/poetry.toml tests/server/pyproject.toml tests/server/poetry.lock .
run --mount=type=cache,target=/root/.cache python3 -m poetry install --only main
copy tests/server/src src
copy --from=tests_server_grpc_builder /app/gen src/gen
run --mount=type=cache,target=/root/.cache python3 -m poetry install --only main

from base_poetry as tests_e2e
copy --from=docker/buildx-bin:0.10.3 /buildx /usr/libexec/docker/cli-plugins/docker-buildx
copy --from=docker_go_builder /go/bin/docker /usr/local/bin/docker
copy --from=docker_go_builder /go/bin/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose
copy tests/e2e/poetry.toml tests/e2e/pyproject.toml tests/e2e/poetry.lock .
run --mount=type=cache,target=/root/.cache python3 -m poetry install --only main
run --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   python3 -m poetry run python3 -m playwright install-deps
run python3 -m poetry run python3 -m playwright install
copy tests/e2e/src src
copy --from=tests_server_grpc_builder /app/gen src/gen
run --mount=type=cache,target=/root/.cache python3 -m poetry install --only main
