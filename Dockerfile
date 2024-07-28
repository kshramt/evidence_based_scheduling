FROM ubuntu:22.04 AS ubuntu_base
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH ${SOURCE_DATE_EPOCH:-0}

FROM ubuntu_base AS curl_base
RUN apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
   ca-certificates \
   curl \
   && apt-get clean \
   && rm -rf /var/lib/apt/lists/*

# FROM curl_base AS starpls_downloader
# RUN arch="$(dpkg --print-architecture)" && curl -sSf -L -o /usr/local/bin/starpls "https://github.com/withered-magic/starpls/releases/download/v0.1.14/starpls-linux-${arch}" && chmod +x /usr/local/bin/starpls

FROM curl_base AS build_essential_base
RUN apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
   build-essential \
   && apt-get clean \
   && rm -rf /var/lib/apt/lists/*

FROM hadolint/hadolint:v2.12.0-alpine AS hadolint_base
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH ${SOURCE_DATE_EPOCH:-0}

FROM ghcr.io/amacneil/dbmate:2.19.0 AS base_dbmate
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH ${SOURCE_DATE_EPOCH:-0}

FROM denoland/deno:distroless-1.45.2 AS deno_base
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH ${SOURCE_DATE_EPOCH:-0}

FROM ubuntu_base AS bazel_downloader
ARG TARGETARCH
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH ${SOURCE_DATE_EPOCH:-0}
ADD --link --chmod=555 https://github.com/bazelbuild/buildtools/releases/download/v6.4.0/buildifier-linux-${TARGETARCH:?} /usr/local/bin/buildifier
ADD --link --chmod=555 https://github.com/bazelbuild/bazelisk/releases/download/v1.19.0/bazelisk-linux-${TARGETARCH:?} /usr/local/bin/bazel


FROM node:22.4.1-bookworm-slim AS node_downloader
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH ${SOURCE_DATE_EPOCH:-0}
RUN mkdir -p /usr/local/node \
   && cp -a /usr/local/bin /usr/local/node/bin && rm -f /usr/local/node/bin/docker-entrypoint.sh \
   && cp -a /usr/local/include /usr/local/node/include \
   && cp -a /usr/local/lib /usr/local/node/lib
RUN npm install -g @pnpm/exe@8.13.1


FROM ubuntu_base AS base_js
COPY --link --from=node_downloader /usr/local/node /usr/local/node
COPY --link --from=node_downloader /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --link --from=node_downloader /usr/local/bin/pnpm /usr/local/bin/
ENV PATH "/usr/local/node/bin:${PATH}"


FROM docker:24.0.7-cli-alpine3.18 AS docker_downloader


FROM rust:1.78.0-bookworm AS rust_downloader
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH ${SOURCE_DATE_EPOCH:-0}
RUN rustup component add clippy rust-analyzer rustfmt

FROM rust_downloader AS sqlx_cli_downloader
RUN cargo install sqlx-cli@0.7.3

FROM build_essential_base AS base_rust
COPY --link --from=rust_downloader /usr/local/cargo /usr/local/cargo
COPY --link --from=rust_downloader /usr/local/rustup /usr/local/rustup
ENV PATH "/usr/local/cargo/bin:/usr/local/rustup/bin:${PATH}"
ENV RUSTUP_HOME "/usr/local/rustup"
ENV CARGO_HOME "/usr/local/cargo"


FROM curl_base AS rye_downloader
RUN curl -sSf https://rye.astral.sh/get | RYE_VERSION="0.35.0" RYE_INSTALL_OPTION="--yes" bash
RUN /root/.rye/shims/rye fetch cpython@3.12.0
RUN cd /root/.rye/py/cpython@3.12.0/bin && ln -s python3 python
RUN /root/.rye/py/cpython@3.12.0/bin/python3 -m pip install poetry==1.7.1


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
COPY --link --from=rye_downloader /root/.rye /root/.rye
ENV PATH "/root/.rye/py/cpython@3.12.0/bin:${PATH}"

COPY --link .devcontainer/skel /etc/skel

ARG devcontainer_user
RUN useradd --no-log-init -m -s /bin/bash "${devcontainer_user:?}" \
   && usermod -aG sudo "${devcontainer_user:?}" \
   && echo '%sudo ALL=(ALL:ALL) NOPASSWD:ALL' >> /etc/sudoers

COPY --link --from=base_dbmate /usr/local/bin/dbmate /usr/local/bin/dbmate
COPY --link --from=deno_base /bin/deno /usr/local/bin/deno
COPY --link --from=node_downloader /usr/local/node /usr/local/node
COPY --link --from=node_downloader /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --link --from=node_downloader /usr/local/bin/pnpm /usr/local/bin/
COPY --link --from=docker_downloader /usr/local/bin/docker /usr/local/bin/docker
COPY --link --from=docker_downloader /usr/local/libexec/docker /usr/local/libexec/docker
COPY --link --from=bazel_downloader /usr/local/bin/buildifier /usr/local/bin/buildifier
COPY --link --from=bazel_downloader /usr/local/bin/bazel /usr/local/bin/bazel
COPY --link --from=hadolint_base /bin/hadolint /usr/local/bin/hadolint
# COPY --link --from=starpls_downloader /usr/local/bin/starpls /usr/local/bin/starpls

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
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH ${SOURCE_DATE_EPOCH:-0}
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1
WORKDIR /app

FROM ubuntu_base AS base_poetry12
COPY --link --from=rye_downloader /root/.rye /root/.rye
ENV PATH "/root/.rye/py/cpython@3.12.0/bin:${PATH}"
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1
WORKDIR /app
RUN python3 -m venv .venv

FROM nginx:1.26.0-alpine AS base_nginx
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH ${SOURCE_DATE_EPOCH:-0}

FROM envoyproxy/envoy:distroless-v1.30.1 AS base_envoy
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH ${SOURCE_DATE_EPOCH:-0}

FROM postgres:16.3-bookworm AS base_postgres
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH ${SOURCE_DATE_EPOCH:-0}

FROM base_py11 AS base_poetry11
RUN apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
   build-essential \
   ca-certificates \
   && apt-get clean \
   && rm -rf /var/lib/apt/lists/*
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

FROM debian:12.5-slim AS prod_postgres_migration
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH ${SOURCE_DATE_EPOCH:-0}
COPY --link --from=base_dbmate /usr/local/bin/dbmate /usr/local/bin/dbmate
COPY --link db/scripts/migrate.sh /app/scripts/migrate.sh
COPY --link db/migrations /app/db/migrations
ENTRYPOINT ["/app/scripts/migrate.sh"]


FROM base_poetry12 AS ruff_builder
COPY --link pyproject.toml requirements_linux.txt ./
RUN .venv/bin/python3 -m pip install -r requirements_linux.txt


FROM base_poetry12 AS openapi_codegen_builder
WORKDIR /app
COPY --link --from=ruff_builder /app/pyproject.toml /app/
COPY --link --from=ruff_builder /app/.venv /app/.venv
RUN .venv/bin/python3 -m ruff check .
RUN .venv/bin/python3 -m ruff format --check .
COPY --link openapi/api_v2.yaml openapi/api_v2.yaml
COPY --link openapi_codegen openapi_codegen
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

FROM base_poetry11 AS tests_e2e
COPY --link tests/e2e/poetry.toml tests/e2e/pyproject.toml tests/e2e/poetry.lock ./
RUN python3 -m poetry install --only main
RUN python3 -m poetry run python3 -m playwright install-deps
RUN python3 -m poetry run python3 -m playwright install
COPY --link --from=docker:24.0.2-cli-alpine3.18 /usr/local/bin/docker /usr/local/bin/docker
COPY --link --from=docker:24.0.2-cli-alpine3.18 /usr/local/libexec/docker/cli-plugins/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose
COPY --link --from=docker:24.0.2-cli-alpine3.18 /usr/local/libexec/docker/cli-plugins/docker-buildx /usr/local/libexec/docker/cli-plugins/docker-buildx
COPY --link tests/e2e/src src
RUN python3 -m poetry install --only main
