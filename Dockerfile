from python:3.11.0-slim-bullseye as base_py
env PYTHONUNBUFFERED 1
env PYTHONDONTWRITEBYTECODE 1
workdir /app

from golang:1.20.1-bullseye as base_go

from base_go as docker_go_builder
run --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod go install github.com/docker/cli/cmd/docker@v23.0.1
run --mount=type=cache,target=/root/.cache --mount=type=cache,target=/go/pkg/mod cd /tmp \
   && git clone --depth=1 --branch v2.16.0 https://github.com/docker/compose.git \
   && cd compose \
   && go build -o docker-compose cmd/main.go \
   && mv docker-compose /go/bin/

from base_py as api
workdir /
copy --from=docker_go_builder /go/bin/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose
entrypoint ["python3", "-m", "http.server", "8080"]



from python:3.11.0-slim-bullseye as tester
run --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y \
   ca-certificates \
   curl \
   gnupg \
   lsb-release
run mkdir -m 0755 -p /etc/apt/keyrings
run curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
run echo \
   "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
   $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
run --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y \
   docker-ce-cli docker-buildx-plugin docker-compose-plugin
copy scripts/run_and_curl.sh scripts/run_and_curl.sh
entrypoint ["scripts/run_and_curl.sh"]
