# FROM curlimages/curl-base:8.9.1 AS curl_base

FROM docker:24.0.2-cli-alpine3.18 AS download_docker


FROM ghcr.io/astral-sh/ruff:0.6.4 AS download_ruff

FROM ghcr.io/astral-sh/uv:0.7.7 AS download_uv

FROM ubuntu:22.04 AS ubuntu_base
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-0}

# FROM curl_base AS starpls_downloader
# RUN arch="$(dpkg --print-architecture)" && curl -sSf -L -o /usr/local/bin/starpls "https://github.com/withered-magic/starpls/releases/download/v0.1.14/starpls-linux-${arch}" && chmod +x /usr/local/bin/starpls

FROM ubuntu_base AS build_essential_base
RUN apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
   build-essential \
   ca-certificates \
   && apt-get clean \
   && rm -rf /var/lib/apt/lists/*

FROM ubuntu_base AS curl_base
RUN apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
   ca-certificates \
   curl \
   && apt-get clean \
   && rm -rf /var/lib/apt/lists/*

FROM hadolint/hadolint:v2.12.0-alpine AS hadolint_base
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-0}

FROM ghcr.io/amacneil/dbmate:2.21.0 AS base_dbmate
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-0}

FROM denoland/deno:distroless-1.45.2 AS deno_base
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-0}

FROM ubuntu_base AS bazel_downloader
ARG TARGETARCH
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-0}
ADD --link --chmod=555 https://github.com/bazelbuild/buildtools/releases/download/v7.3.1/buildifier-linux-${TARGETARCH:?} /usr/local/bin/buildifier
ADD --link --chmod=555 https://github.com/bazelbuild/buildtools/releases/download/v7.3.1/buildozer-linux-${TARGETARCH:?} /usr/local/bin/buildozer
ADD --link --chmod=555 https://github.com/bazelbuild/bazelisk/releases/download/v1.21.0/bazelisk-linux-${TARGETARCH:?} /usr/local/bin/bazel


FROM node:22.7.0-bookworm-slim AS node_downloader
RUN rm -f /usr/local/bin/docker-entrypoint.sh /usr/local/bin/yarn /usr/local/bin/yarnpkg \
   && corepack enable pnpm

FROM node_downloader AS firebase_downloader
RUN npm install --cache /tmp/empty-cache -g firebase-tools@13.16.0 \
   && rm -rf /tmp/empty-cache

FROM ubuntu_base AS base_js
COPY --link --from=node_downloader /usr/local/bin /usr/local/bin
COPY --link --from=node_downloader /usr/local/lib/node_modules /usr/local/lib/node_modules


FROM docker:24.0.7-cli-alpine3.18 AS docker_downloader


FROM rust:1.84.0-bookworm AS rust_downloader
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-0}
RUN rustup component add clippy rust-analyzer rustfmt

FROM rust_downloader AS sqlx_cli_downloader
RUN cargo install sqlx-cli@0.8.2

FROM build_essential_base AS base_rust
COPY --link --from=rust_downloader /usr/local/cargo /usr/local/cargo
COPY --link --from=rust_downloader /usr/local/rustup /usr/local/rustup
ENV PATH "/usr/local/cargo/bin:/usr/local/rustup/bin:${PATH}"
ENV RUSTUP_HOME="/usr/local/rustup"
ENV CARGO_HOME="/usr/local/cargo"


FROM ubuntu_base AS devcontainer
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
   graphviz \
   htop \
   jq \
   less \
   libssl-dev \
   mold \
   oathtool \
   pkg-config \
   postgresql-client \
   python3 \
   sudo \
   tig \
   tree \
   tmux \
   unzip \
   wget \
   vim

COPY --link .devcontainer/skel /etc/skel

ARG devcontainer_user
RUN useradd --no-log-init -m -s /bin/bash "${devcontainer_user:?}" \
   && usermod -aG sudo "${devcontainer_user:?}" \
   && echo '%sudo ALL=(ALL:ALL) NOPASSWD:ALL' >> /etc/sudoers

COPY --link --from=base_dbmate /usr/local/bin/dbmate /usr/local/bin/dbmate
COPY --link --from=deno_base /bin/deno /usr/local/bin/deno
COPY --link --from=firebase_downloader /usr/local/bin /usr/local/bin
COPY --link --from=firebase_downloader /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --link --from=docker_downloader /usr/local/bin/docker /usr/local/bin/docker
COPY --link --from=docker_downloader /usr/local/libexec/docker /usr/local/libexec/docker
COPY --link --from=bazel_downloader /usr/local/bin/buildifier /usr/local/bin/buildifier
COPY --link --from=bazel_downloader /usr/local/bin/buildozer /usr/local/bin/buildozer
COPY --link --from=bazel_downloader /usr/local/bin/bazel /usr/local/bin/bazel
COPY --link --from=hadolint_base /bin/hadolint /usr/local/bin/hadolint
COPY --link --from=download_ruff /ruff /usr/local/bin/ruff
COPY --link --from=download_uv /uv /usr/local/bin/uv
# COPY --link --from=starpls_downloader /usr/local/bin/starpls /usr/local/bin/starpls

ARG host_home

ENV PATH=/usr/local/go/bin:${PATH}
ENV GOPATH=/h/${host_home:?}/devcontainer/go


# Rust
COPY --link --from=rust_downloader /usr/local/cargo /usr/local/cargo
COPY --link --from=rust_downloader /usr/local/rustup /usr/local/rustup
COPY --link --from=sqlx_cli_downloader /usr/local/cargo/bin/sqlx /usr/local/cargo/bin/cargo-sqlx /usr/local/bin/

USER "${devcontainer_user:?}"
ENV PATH="/usr/local/cargo/bin:/usr/local/rustup/bin:${PATH}"
ENV RUSTUP_HOME="/usr/local/rustup"
ENV CARGO_HOME="/home/${devcontainer_user:?}/.cargo"

FROM ubuntu_base AS base_py
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1
WORKDIR /app

FROM nginx:1.27.3-alpine AS base_nginx
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-0}

FROM envoyproxy/envoy:distroless-v1.33.0 AS base_envoy
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-0}

FROM postgres:16.3-bookworm AS base_postgres
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-0}

FROM base_py11 AS base_poetry11
RUN pip install --no-cache-dir poetry==1.7.0

FROM base_js AS base_client
WORKDIR /app

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
   libxtst6 \
   && apt-get clean \
   && rm -rf /var/lib/apt/lists/*
COPY --link pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --link client/package.json client/
RUN pnpm install --frozen-lockfile

FROM client_npm_ci AS builder_client
COPY --link client client
RUN cd client && pnpm exec playwright install

FROM builder_client AS test_client
RUN cd client && scripts/check.sh

FROM builder_client AS prod_client
RUN cd client && pnpm run build

FROM base_nginx AS prod_nginx
COPY --link --from=prod_client /app/client/dist/static/ /usr/share/nginx/html/static/
COPY --link --from=prod_client /app/client/dist/assets/ /usr/share/nginx/html/assets/
COPY --link --from=prod_client /app/client/dist/browserconfig.xml /app/client/dist/index.html /app/client/dist/manifest.webmanifest /app/client/dist/registerSW.js /app/client/dist/sw.js /usr/share/nginx/html/
COPY --link nginx.conf /etc/nginx/nginx.conf

FROM base_envoy AS prod_envoy
EXPOSE 8080
WORKDIR /app
COPY --link ./envoy.yaml /etc/envoy/envoy.yaml

FROM base_postgres AS prod_postgres

FROM debian:12.7-slim AS prod_postgres_migration
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH ${SOURCE_DATE_EPOCH:-0}
COPY --link --from=base_dbmate /usr/local/bin/dbmate /usr/local/bin/dbmate
COPY --link db/scripts/migrate.sh /app/scripts/migrate.sh
COPY --link db/migrations /app/db/migrations
ENTRYPOINT ["/app/scripts/migrate.sh"]


FROM base_py AS openapi_codegen_builder
RUN --mount=type=cache,target=/root/.cache \
    --mount=from=download_uv,source=/uv,target=/usr/local/bin/uv \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
   uv sync --frozen
COPY --link openapi_codegen openapi_codegen
RUN --mount=type=cache,target=/root/.cache \
    --mount=from=download_ruff,source=/ruff,target=/usr/local/bin/ruff \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    ruff check . \
    && ruff format --check .
COPY --link openapi/api_v2.yaml openapi/api_v2.yaml
RUN .venv/bin/python3 -m openapi_codegen.app < openapi/api_v2.yaml >| openapi_codegen/gen.rs


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
COPY --link .sqlx .sqlx
COPY --link --from=openapi_codegen_builder /app/openapi_codegen/gen.rs api_v2/src/gen.rs
RUN cargo fmt --check
RUN cargo clippy --all-targets --all-features -- -D warnings
RUN cargo test --all-targets --all-features
RUN cargo build --release

FROM gcr.io/distroless/cc-debian12:nonroot AS prod_api_v2
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH ${SOURCE_DATE_EPOCH:-0}
COPY --link --from=base_rust_builder /app/target/release/api_v2 /work/api_v2
WORKDIR /work
ENTRYPOINT ["./api_v2"]

FROM base_py AS tests_e2e
RUN --mount=type=cache,target=/root/.cache \
    --mount=from=download_uv,source=/uv,target=/usr/local/bin/uv \
    --mount=type=bind,source=tests/e2e/pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=tests/e2e/uv.lock,target=uv.lock \
   uv sync --frozen
RUN .venv/bin/python3 -m playwright install-deps \
      && .venv/bin/python3 -m playwright install
COPY --link --from=download_docker /usr/local/bin/docker /usr/local/bin/docker
COPY --link --from=download_docker /usr/local/libexec/docker/cli-plugins/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose
COPY --link --from=download_docker /usr/local/libexec/docker/cli-plugins/docker-buildx /usr/local/libexec/docker/cli-plugins/docker-buildx
COPY --link tests/e2e/src src
