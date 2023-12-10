FROM ubuntu:22.04 as bazel_downloader
RUN apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
   build-essential \
   ca-certificates \
   curl
RUN arch="$(dpkg --print-architecture)" && curl -L -o /usr/local/bin/buildifier "https://github.com/bazelbuild/buildtools/releases/download/v6.4.0/buildifier-linux-${arch}" && chmod +x /usr/local/bin/buildifier
RUN arch="$(dpkg --print-architecture)" && curl -L -o /usr/local/bin/bazelisk "https://github.com/bazelbuild/bazelisk/releases/download/v1.19.0/bazelisk-linux-${arch}" && chmod +x /usr/local/bin/bazelisk


FROM node:21.4.0-bookworm-slim AS node_downloader
RUN mkdir -p /usr/local/node \
   && cp -a /usr/local/bin /usr/local/node/bin && rm -f /usr/local/node/bin/docker-entrypoint.sh \
   && cp -a /usr/local/include /usr/local/node/include \
   && cp -a /usr/local/lib /usr/local/node/lib


FROM ubuntu:22.04 as base_js
COPY --link --from=node_downloader /usr/local/node /usr/local/node
ENV PATH "/usr/local/node/bin:${PATH}"


FROM docker:24.0.7-cli-alpine3.18 AS docker_downloader
COPY --link --from=docker:24.0.4-cli-alpine3.18 /usr/local/bin/docker /usr/local/bin/docker
COPY --link --from=docker:24.0.4-cli-alpine3.18 /usr/local/libexec/docker /usr/local/libexec/docker


FROM rust:1.74.1-bookworm AS rust_downloader
RUN rustup component add clippy rust-analyzer rustfmt

FROM rust_downloader AS sqlx_cli_downloader
RUN cargo install sqlx-cli@0.7.3

FROM ubuntu:22.04 AS base_rust
RUN apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
   build-essential \
   ca-certificates \
   curl
COPY --link --from=rust_downloader /usr/local/cargo /usr/local/cargo
COPY --link --from=rust_downloader /usr/local/rustup /usr/local/rustup
ENV PATH "/usr/local/cargo/bin:/usr/local/rustup/bin:${PATH}"
ENV RUSTUP_HOME "/usr/local/rustup"
ENV CARGO_HOME "/usr/local/cargo"


FROM ubuntu:22.04 AS rye_downloader
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y curl
RUN curl -sSf https://rye-up.com/get | RYE_VERSION="0.15.2" RYE_INSTALL_OPTION="--yes" bash
RUN /root/.rye/shims/rye fetch cpython@3.12.0
RUN cd /root/.rye/py/cpython@3.12.0/install/bin && ln -s python3 python
RUN /root/.rye/py/cpython@3.12.0/install/bin/python3 -m pip install poetry==1.7.1


FROM ubuntu:22.04 AS devcontainer
RUN sed \
   -e 's|^path-exclude=/usr/share/man|# path-exclude=/usr/share/man|g' \
   -e 's|^path-exclude=/usr/share/doc/|# path-exclude=/usr/share/doc/|g' \
   -i /etc/dpkg/dpkg.cfg.d/excludes
# sudo npx playwright install-deps
RUN apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
   libasound2\
   libatk1.0-0\
   libcairo-gobject2\
   libcairo2\
   libdbus-1-3\
   libdbus-glib-1-2\
   libdrm2\
   libfontconfig1\
   libfreetype6\
   libgbm1\
   libgdk-pixbuf-2.0-0\
   libglib2.0-0\
   libgtk-3-0\
   libnspr4 \
   libnss3\
   libpango-1.0-0\
   libpangocairo-1.0-0\
   libx11-6\
   libx11-xcb1\
   libxcb-shm0\
   libxcb1\
   libxcomposite1\
   libxcursor1\
   libxdamage1\
   libxext6\
   libxfixes3\
   libxi6\
   libxrandr2\
   libxrender1\
   libxtst6
# Basic dependencies
RUN apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
   bash-completion \
   bsdmainutils \
   build-essential \
   ca-certificates \
   colordiff \
   curl \
   git \
   jq \
   less \
   libssl-dev \
   mold \
   oathtool \
   pkg-config \
   postgresql-client \
   sudo \
   tig \
   tree \
   tmux \
   unzip \
   wget \
   vim
COPY --link --from=rye_downloader /root/.rye /root/.rye
ENV PATH "/root/.rye/py/cpython@3.12.0/install/bin:${PATH}"

COPY --link .devcontainer/skel /etc/skel

ARG devcontainer_user
RUN useradd --no-log-init -m -s /bin/bash "${devcontainer_user:?}" \
   && usermod -aG sudo "${devcontainer_user:?}" \
   && echo '%sudo ALL=(ALL:ALL) NOPASSWD:ALL' >> /etc/sudoers

COPY --link --from=node_downloader /usr/local/node /usr/local/node
COPY --link --from=base_go /usr/local/go /usr/local/go
COPY --link --from=docker_downloader /usr/local/bin/docker /usr/local/bin/docker
COPY --link --from=docker_downloader /usr/local/libexec/docker /usr/local/libexec/docker
COPY --link --from=bazel_downloader /usr/local/bin/buildifier /usr/local/bin/buildifier
COPY --link --from=bazel_downloader /usr/local/bin/bazelisk /usr/local/bin/bazelisk

ARG host_home

ENV PATH "/usr/local/node/bin:${PATH}"
ENV PATH "/usr/local/go/bin:${PATH}"
ENV GOPATH "/h/${host_home:?}/devcontainer/go"


# Rust
COPY --link --from=rust_downloader /usr/local/cargo /usr/local/cargo
COPY --link --from=rust_downloader /usr/local/rustup /usr/local/rustup
COPY --link --from=sqlx_cli_downloader /usr/local/cargo/bin/sqlx /usr/local/cargo/bin/cargo-sqlx /usr/local/bin/

USER "${devcontainer_user:?}"
ENV PATH "/usr/local/cargo/bin:/usr/local/rustup/bin:${PATH}"
ENV RUSTUP_HOME "/usr/local/rustup"
ENV CARGO_HOME "/home/${devcontainer_user:?}/.cargo"


FROM python:3.11.5-slim-bullseye AS base_py11
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1
WORKDIR /app

FROM ubuntu:22.04 AS base_poetry12
COPY --link --from=rye_downloader /root/.rye /root/.rye
ENV PATH "/root/.rye/py/cpython@3.12.0/install/bin:${PATH}"
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1
WORKDIR /app

FROM nginx:1.25.3-alpine AS base_nginx

FROM envoyproxy/envoy:distroless-v1.28.0 AS base_envoy

FROM postgres:16.1-bookworm AS base_postgres

FROM base_py11 AS base_poetry11
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y build-essential
RUN pip install poetry==1.7.0

FROM golang:1.21.4-bookworm AS base_go
ENV CGO_ENABLED 0

FROM base_js AS base_client
WORKDIR /app/client

FROM base_client AS client_npm_ci
# sudo npx playwright install-deps
RUN apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
   libasound2\
   libatk1.0-0\
   libcairo-gobject2\
   libcairo2\
   libdbus-1-3\
   libdbus-glib-1-2\
   libdrm2\
   libfontconfig1\
   libfreetype6\
   libgbm1\
   libgdk-pixbuf-2.0-0\
   libglib2.0-0\
   libgtk-3-0\
   libnspr4 \
   libnss3\
   libpango-1.0-0\
   libpangocairo-1.0-0\
   libx11-6\
   libx11-xcb1\
   libxcb-shm0\
   libxcb1\
   libxcomposite1\
   libxcursor1\
   libxdamage1\
   libxext6\
   libxfixes3\
   libxi6\
   libxrandr2\
   libxrender1\
   libxtst6
COPY --link client/package.json client/package-lock.json ./
RUN npm ci
RUN npx playwright install

FROM client_npm_ci AS builder_client
COPY --link client .

FROM builder_client AS test_client
RUN scripts/check.sh

FROM builder_client AS prod_client
RUN npm run build

FROM base_nginx AS prod_nginx
COPY --link --from=prod_client /app/client/dist/static/ /usr/share/nginx/html/static/
COPY --link --from=prod_client /app/client/dist/assets/ /usr/share/nginx/html/assets/
COPY --link --from=prod_client /app/client/dist/browserconfig.xml /app/client/dist/index.html /app/client/dist/manifest.webmanifest /app/client/dist/registerSW.js /app/client/dist/sw.js /usr/share/nginx/html/
COPY --link nginx.conf /etc/nginx/nginx.conf

FROM base_envoy AS prod_envoy
EXPOSE 8080
WORKDIR /app
COPY --link ./envoy.yaml /etc/envoy/envoy.yaml

FROM base_go AS dbmate_builder
RUN go install github.com/amacneil/dbmate/v2@v2.4.0

FROM base_postgres AS prod_postgres

FROM debian:12.1-slim AS prod_postgres_migration
COPY --link --from=dbmate_builder /go/bin/dbmate /usr/local/bin/dbmate
COPY --link db/scripts/migrate.sh /app/scripts/migrate.sh
COPY --link db/migrations /app/db/migrations
ENTRYPOINT ["/app/scripts/migrate.sh"]

FROM base_go AS sqlc_builder
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y build-essential
RUN CGO_ENABLED=1 go install github.com/kyleconroy/sqlc/cmd/sqlc@v1.18.0

FROM base_go AS go_db_builder
WORKDIR /app
COPY --link --from=sqlc_builder /go/bin/sqlc /usr/local/bin/sqlc
COPY --link db db
COPY --link sqlc.yaml ./
RUN /usr/local/bin/sqlc --experimental generate

FROM base_go AS buf_builder
RUN go install github.com/bufbuild/buf/cmd/buf@v1.21.0

FROM base_go AS protoc_gen_connect_go_builder
RUN go install github.com/bufbuild/connect-go/cmd/protoc-gen-connect-go@v1.5.2

FROM base_go AS protoc_gen_go_builder
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.30.0

FROM base_go AS staticcheck_builder
RUN go install honnef.co/go/tools/cmd/staticcheck@2023.1.3

# Install gosec
FROM base_go AS gosec_builder
RUN go install github.com/securego/gosec/v2/cmd/gosec@v2.16.0

FROM base_go AS go_api_v1_grpc_builder
COPY --link --from=protoc_gen_go_builder /go/bin/protoc-gen-go /usr/local/bin/protoc-gen-go
COPY --link --from=buf_builder /go/bin/buf /usr/local/bin/buf
COPY --link --from=protoc_gen_connect_go_builder /go/bin/protoc-gen-connect-go /usr/local/bin/protoc-gen-connect-go
WORKDIR /app
COPY --link proto proto
RUN cd proto \
   && buf lint \
   && buf generate --config buf.yaml --template buf.gen-go.yaml

FROM base_poetry11 AS tests_e2e_grpc_builder
WORKDIR /grpc_py
COPY --link grpc_py/poetry.toml grpc_py/pyproject.toml grpc_py/poetry.lock ./
RUN python3 -m poetry install --only main
WORKDIR /app
COPY --link proto proto
RUN mkdir -p gen/api/v1 \
   && touch gen/__init__.py gen/api/__init__.py gen/api/v1/__init__.py \
   && /grpc_py/.venv/bin/python3 -m grpc_tools.protoc -Iproto api/v1/api.proto --python_out=gen --pyi_out=gen --grpc_python_out=gen \
   && sed -i 's/^from api\.v.* import/from . import/' gen/api/v1/api_pb2_grpc.py

FROM base_go AS base_go_builder
WORKDIR /app
COPY --link go/go.mod go/go.sum ./
RUN go mod download
COPY --link go .
COPY --link --from=go_db_builder /app/go/db db
COPY --link --from=go_api_v1_grpc_builder /app/go/gen gen
COPY --link --from=staticcheck_builder /go/bin/staticcheck /usr/local/bin/staticcheck
COPY --link --from=gosec_builder /go/bin/gosec /usr/local/bin/gosec
RUN gofmt -s -d . | if grep ^ ; then exit 1 ; else : ; fi
RUN go vet -v ./...
RUN staticcheck ./...
RUN gosec ./...
RUN go test -v ./...
RUN go test -v ./...
# RUN CGO_ENABLED=1 go test -race -v ./...

FROM base_go_builder AS api_v1_builder
RUN go build api_v1/main.go

FROM base_rust AS base_rust_builder
WORKDIR /app
COPY --link Cargo.toml Cargo.lock ./
COPY --link api_v2/Cargo.toml api_v2/
COPY --link data/main.rs api_v2/src/
COPY --link id_generator/Cargo.toml id_generator/
COPY --link data/lib.rs id_generator/src/
RUN cargo fetch
COPY --link api_v2/src api_v2/src
COPY --link id_generator/src id_generator/src
COPY --link .sqlx  .sqlx
RUN cargo fmt --check
RUN cargo clippy --all-targets --all-features -- -D warnings
RUN cargo test --all-targets --all-features
RUN cargo build --release

FROM gcr.io/distroless/cc-debian12:nonroot AS prod_api_v2
WORKDIR /app
COPY --link --from=base_rust_builder /app/target/release/api_v2 .
ENTRYPOINT ["./api_v2"]

FROM gcr.io/distroless/static-debian11:nonroot AS prod_api_v1
WORKDIR /app
COPY --link --from=api_v1_builder /app/main .
ENTRYPOINT ["./main"]

FROM base_poetry11 AS tests_e2e
COPY --link tests/e2e/poetry.toml tests/e2e/pyproject.toml tests/e2e/poetry.lock ./
RUN python3 -m poetry install --only main
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   python3 -m poetry run python3 -m playwright install-deps
RUN python3 -m poetry run python3 -m playwright install
COPY --link --from=docker:24.0.2-cli-alpine3.18 /usr/local/bin/docker /usr/local/bin/docker
COPY --link --from=docker:24.0.2-cli-alpine3.18 /usr/local/libexec/docker/cli-plugins/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose
COPY --link --from=docker:24.0.2-cli-alpine3.18 /usr/local/libexec/docker/cli-plugins/docker-buildx /usr/local/libexec/docker/cli-plugins/docker-buildx
COPY --link tests/e2e/src src
COPY --link --from=tests_e2e_grpc_builder /app/gen src/gen
RUN python3 -m poetry install --only main


FROM base_poetry12 AS ruff_builder
COPY --link poetry.toml pyproject.toml poetry.lock ./
RUN python3 -m poetry install


FROM base_poetry12 AS openapi_codegen_builder
WORKDIR /app/openapi_codegen
COPY --link openapi_codegen/poetry.toml openapi_codegen/pyproject.toml openapi_codegen/poetry.lock /
RUN python3 -m poetry install
COPY --link openapi_codegen/src src
COPY --link --from=ruff_builder /app/poetry.toml /app/pyproject.toml /app/poetry.lock /app/
COPY --link --from=ruff_builder /app/.venv /app/.venv
WORKDIR /app
RUN python3 -m poetry run python3 -m ruff check .
RUN python3 -m poetry run python3 -m ruff format .
WORKDIR /app/openapi_codegen
RUN python3 -m poetry install
