#!/bin/bash

set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=

tmp_dir="$(mktemp -d)"
readonly tmp_dir

finalize(){
   rm -fr "${tmp_dir}"
}

trap finalize EXIT


export _DOCKER_API_TAG="${TAG:-latest}"
export _DOCKER_NGINX_TAG="${TAG:-latest}"
export _DOCKER_ENVOY_TAG="${TAG:-latest}"
export _DOCKER_POSTGRES_TAG="${TAG:-latest}"

docker compose -f docker-compose.yaml -f docker-compose.prod.yaml down
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml pull

# Migrate
readonly container_id_path="${tmp_dir}/container_id"
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml run --rm -d postgres > "${container_id_path}"
container_id="$(cat "${container_id_path}")"
readonly container_id
docker container exec -e _POSTGRES_APP_USER_PASSWORD="${_POSTGRES_APP_USER_PASSWORD:?}" -e ENV="${ENV:-prod}" "${container_id}" /app/scripts/migrate.sh
docker container stop "${container_id}"

# Start
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d
