FROM node:20.3.1-bookworm-slim as base_js

FROM python:3.11.0-slim-bullseye as base_py
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1
WORKDIR /app

FROM nginx:1.23.3-alpine as base_nginx

FROM envoyproxy/envoy:v1.25.1 as base_envoy

FROM postgres:15.3-bookworm as base_postgres

FROM base_py as base_poetry
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y build-essential
RUN --mount=type=cache,target=/root/.cache pip install poetry==1.3.1

FROM golang:1.20.5-bookworm as base_go
ENV CGO_ENABLED 0

FROM base_js as base_client
WORKDIR /app/client

FROM base_client as client_npm_ci
COPY --link client/package.json client/package-lock.json ./
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/root/.npm npm ci

FROM client_npm_ci as client_proto
COPY --link proto ../proto
RUN cd ../proto \
   && PATH="${PWD}/../client/node_modules/.bin:${PATH}" buf generate --config buf.yaml --template buf.gen-client.yaml \
   && sed -i -e 's/api_pb.js"/api_pb"/' ../client/src/gen/api/v1/api_connect.ts

FROM client_npm_ci as builder_client
COPY --link client .
COPY --link --from=client_proto /app/client/src/gen /app/client/src/gen

FROM builder_client as test_client
RUN --mount=type=cache,target=/root/.cache scripts/check.sh

FROM builder_client as prod_client
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/root/.npm npm run build

FROM base_nginx as prod_nginx
COPY --link --from=prod_client /app/client/dist/static/ /usr/share/nginx/html/static/
COPY --link --from=prod_client /app/client/dist/assets/ /usr/share/nginx/html/assets/
COPY --link --from=prod_client /app/client/dist/browserconfig.xml /app/client/dist/index.html /app/client/dist/manifest.webmanifest /app/client/dist/registerSW.js /app/client/dist/sw.js /usr/share/nginx/html/
COPY --link nginx.conf /etc/nginx/nginx.conf

FROM base_envoy as prod_envoy
EXPOSE 8080
WORKDIR /app
COPY --link ./envoy.yaml /etc/envoy/envoy.yaml

FROM base_go as dbmate_builder
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install github.com/amacneil/dbmate/v2@v2.4.0

FROM base_postgres as prod_postgres

FROM debian:11.7-slim as prod_postgres_migration
COPY --link --from=dbmate_builder /go/bin/dbmate /usr/local/bin/dbmate
COPY --link db/scripts/migrate.sh /app/scripts/migrate.sh
COPY --link db/migrations /app/db/migrations
ENTRYPOINT ["/app/scripts/migrate.sh"]

FROM base_go as sqlc_builder
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y build-essential
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod CGO_ENABLED=1 go install github.com/kyleconroy/sqlc/cmd/sqlc@v1.18.0

FROM base_go as go_db_builder
WORKDIR /app
COPY --link --from=sqlc_builder /go/bin/sqlc /usr/local/bin/sqlc
COPY --link db db
COPY --link sqlc.yaml ./
RUN /usr/local/bin/sqlc --experimental generate

FROM base_go as buf_builder
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install github.com/bufbuild/buf/cmd/buf@v1.21.0

FROM base_go as protoc_gen_connect_go_builder
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install github.com/bufbuild/connect-go/cmd/protoc-gen-connect-go@v1.5.2

FROM base_go as protoc_gen_go_builder
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.30.0

FROM base_go as staticcheck_builder
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install honnef.co/go/tools/cmd/staticcheck@2023.1.3

# Install gosec
FROM base_go as gosec_builder
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install github.com/securego/gosec/v2/cmd/gosec@v2.16.0

FROM base_go as go_api_v1_grpc_builder
COPY --link --from=protoc_gen_go_builder /go/bin/protoc-gen-go /usr/local/bin/protoc-gen-go
COPY --link --from=buf_builder /go/bin/buf /usr/local/bin/buf
COPY --link --from=protoc_gen_connect_go_builder /go/bin/protoc-gen-connect-go /usr/local/bin/protoc-gen-connect-go
WORKDIR /app
COPY --link proto proto
RUN cd proto \
   && buf lint \
   && buf generate --config buf.yaml --template buf.gen-go.yaml

FROM base_poetry as tests_e2e_grpc_builder
WORKDIR /grpc_py
COPY --link grpc_py/poetry.toml grpc_py/pyproject.toml grpc_py/poetry.lock ./
RUN --mount=type=cache,target=/root/.cache python3 -m poetry install --only main
WORKDIR /app
COPY --link proto proto
RUN mkdir -p gen/api/v1 \
   && touch gen/__init__.py gen/api/__init__.py gen/api/v1/__init__.py \
   && /grpc_py/.venv/bin/python3 -m grpc_tools.protoc -Iproto api/v1/api.proto --python_out=gen --pyi_out=gen --grpc_python_out=gen \
   && sed -i 's/^from api\.v.* import/from . import/' gen/api/v1/api_pb2_grpc.py

FROM base_go as base_go_builder
WORKDIR /app
COPY --link go/go.mod go/go.sum ./
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go mod download
COPY --link go .
COPY --link --from=go_db_builder /app/go/db db
COPY --link --from=go_api_v1_grpc_builder /app/go/gen gen
COPY --link --from=staticcheck_builder /go/bin/staticcheck /usr/local/bin/staticcheck
COPY --link --from=gosec_builder /go/bin/gosec /usr/local/bin/gosec
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go vet -v ./...
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod staticcheck ./...
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod gosec ./...
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go test -v ./...

FROM base_go_builder as api_v1_builder
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go build api_v1/main.go

FROM gcr.io/distroless/static-debian11:nonroot as prod_api_v1
WORKDIR /app
COPY --link --from=api_v1_builder /app/main .
ENTRYPOINT ["./main"]

FROM base_poetry as tests_e2e
COPY --link tests/e2e/poetry.toml tests/e2e/pyproject.toml tests/e2e/poetry.lock ./
RUN --mount=type=cache,target=/root/.cache python3 -m poetry install --only main
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   python3 -m poetry run python3 -m playwright install-deps
RUN python3 -m poetry run python3 -m playwright install
COPY --link --from=docker:24.0.2-cli-alpine3.18 /usr/local/bin/docker /usr/local/bin/docker
COPY --link --from=docker:24.0.2-cli-alpine3.18 /usr/local/libexec/docker/cli-plugins/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose
COPY --link --from=docker:24.0.2-cli-alpine3.18 /usr/local/libexec/docker/cli-plugins/docker-buildx /usr/local/libexec/docker/cli-plugins/docker-buildx
COPY --link tests/e2e/src src
COPY --link --from=tests_e2e_grpc_builder /app/gen src/gen
RUN --mount=type=cache,target=/root/.cache python3 -m poetry install --only main
