#!/bin/bash

set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=


export _DOCKER_API_TAG="${TAG:-latest}"
export _DOCKER_NGINX_TAG="${TAG:-latest}"
export _DOCKER_ENVOY_TAG="${TAG:-latest}"

git pull origin main
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml down
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml pull
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d
