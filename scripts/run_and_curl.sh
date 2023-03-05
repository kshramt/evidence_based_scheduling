#!/bin/bash

set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=

echo DOCKER_BUILDKIT "${DOCKER_BUILDKIT:-NOOOOO}"
echo "$HOME"

cd "$WD"
docker buildx build --load --target api -t t:6 .
# docker build --target api -t t:6 .
docker compose -f compose.yaml down --remove-orphans
docker compose -f compose.yaml up --build -d
sleep 3
python3 -c 'import urllib.request ; o = urllib.request.urlopen("http://host.docker.internal:8080"); print(o.read())'
