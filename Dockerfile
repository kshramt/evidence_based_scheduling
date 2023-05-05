FROM node:18.7.0-bullseye-slim as base_js

FROM python:3.11.0-slim-bullseye as base_py
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1
WORKDIR /app

FROM nginx:1.23.3-alpine as base_nginx

FROM envoyproxy/envoy:v1.25.1 as base_envoy

FROM postgres:15.2-bullseye as base_postgres

FROM base_py as base_poetry
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y build-essential
RUN --mount=type=cache,target=/root/.cache pip install poetry==1.3.1

FROM golang:1.20.1-bullseye as base_go

FROM base_js as base_client
WORKDIR /app/client

FROM base_client as client_npm_ci
COPY client/package.json client/package-lock.json ./
RUN --mount=type=cache,target=/root/.cache npm ci

FROM client_npm_ci as client_proto
COPY proto ../proto
RUN cd ../proto \
   && PATH="${PWD}/../client/node_modules/.bin:${PATH}" buf generate --config buf.yaml --template buf.gen-client.yaml \
   && sed -i -e 's/api_pb.js"/api_pb"/' ../client/src/gen/api/v1/api_connect.ts

FROM client_npm_ci as builder_client
COPY client .
COPY --from=client_proto /app/client/src/gen /app/client/src/gen

FROM builder_client as test_client
RUN --mount=type=cache,target=/root/.cache scripts/check.sh

FROM builder_client as prod_client
RUN --mount=type=cache,target=/root/.cache npm run build

FROM base_nginx as prod_nginx
COPY --from=prod_client /app/client/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

FROM base_envoy as prod_envoy
EXPOSE 8080
WORKDIR /app
COPY ./envoy.yaml /etc/envoy/envoy.yaml

FROM base_go as dbmate_builder
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install github.com/amacneil/dbmate@v1.16.2

FROM base_postgres as prod_postgres
COPY --from=dbmate_builder /go/bin/dbmate /usr/local/bin/dbmate
COPY db/scripts/migrate.sh /app/scripts/migrate.sh
COPY db/migrations /app/db/migrations

FROM base_go as sqlc_builder
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y build-essential
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install github.com/kyleconroy/sqlc/cmd/sqlc@v1.17.2

FROM base_go as go_db_builder
WORKDIR /app
COPY --from=sqlc_builder /go/bin/sqlc /usr/local/bin/sqlc
COPY db db
COPY sqlc.yaml .
RUN /usr/local/bin/sqlc --experimental generate

FROM base_go as buf_builder
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install github.com/bufbuild/buf/cmd/buf@v1.15.1

FROM base_go as protoc_gen_connect_go_builder
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install github.com/bufbuild/connect-go/cmd/protoc-gen-connect-go@v1.5.2

FROM base_go as protoc_gen_go_builder
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.30.0

FROM base_go as go_api_v1_grpc_builder
COPY --from=protoc_gen_go_builder /go/bin/protoc-gen-go /usr/local/bin/protoc-gen-go
COPY --from=buf_builder /go/bin/buf /usr/local/bin/buf
COPY --from=protoc_gen_connect_go_builder /go/bin/protoc-gen-connect-go /usr/local/bin/protoc-gen-connect-go
WORKDIR /app
COPY proto proto
RUN cd proto \
   && buf lint \
   && buf generate --config buf.yaml --template buf.gen-go.yaml

FROM base_poetry as tests_e2e_grpc_builder
WORKDIR /grpc_py
COPY grpc_py/poetry.toml grpc_py/pyproject.toml grpc_py/poetry.lock ./
RUN --mount=type=cache,target=/root/.cache python3 -m poetry install --only main
WORKDIR /app
COPY proto proto
RUN mkdir -p gen/api/v1 \
   && touch gen/__init__.py gen/api/__init__.py gen/api/v1/__init__.py \
   && /grpc_py/.venv/bin/python3 -m grpc_tools.protoc -Iproto api/v1/api.proto --python_out=gen --pyi_out=gen --grpc_python_out=gen \
   && sed -i 's/^from api\.v.* import/from . import/' gen/api/v1/api_pb2_grpc.py

FROM base_go as base_go_builder
WORKDIR /app
COPY go/go.mod go/go.sum ./
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go mod download
COPY go .
COPY --from=go_db_builder /app/go/db db
COPY --from=go_api_v1_grpc_builder /app/go/gen gen
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go vet -v ./...
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go test -v ./...

FROM base_go_builder as api_v1_builder
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go build api_v1/main.go

FROM gcr.io/distroless/base-debian11:latest as prod_api_v1
WORKDIR /app
COPY --from=api_v1_builder /app/main .
ENTRYPOINT ["./main"]

FROM base_go as docker_go_builder
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install github.com/docker/cli/cmd/docker@v23.0.1
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod cd /tmp \
   && git clone --depth=1 --branch v2.16.0 https://github.com/docker/compose.git \
   && cd compose \
   && go build -o docker-compose cmd/main.go \
   && mv docker-compose /go/bin/

FROM base_poetry as tests_e2e
COPY --from=docker/buildx-bin:0.10.3 /buildx /usr/libexec/docker/cli-plugins/docker-buildx
COPY --from=docker_go_builder /go/bin/docker /usr/local/bin/docker
COPY --from=docker_go_builder /go/bin/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose
COPY tests/e2e/poetry.toml tests/e2e/pyproject.toml tests/e2e/poetry.lock ./
RUN --mount=type=cache,target=/root/.cache python3 -m poetry install --only main
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   python3 -m poetry run python3 -m playwright install-deps
RUN python3 -m poetry run python3 -m playwright install
COPY tests/e2e/src src
COPY --from=tests_e2e_grpc_builder /app/gen src/gen
RUN --mount=type=cache,target=/root/.cache python3 -m poetry install --only main
