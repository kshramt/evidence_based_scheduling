#!/bin/bash

set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=

export SOURCE_DATE_EPOCH="0"

github_sha="${1}"
readonly github_sha
ref_b64="${2}"
readonly ref_b64
os="${3}"
readonly os
arch="${4}"
readonly arch
ref="${5}"
readonly ref
run_number="${6}"
readonly run_number
host_arch="${7}"
readonly host_arch
host_os="${8}"
readonly host_os
readonly img_prefix=ghcr.io/kshramt/evidence_based_scheduling

readonly services=( nginx envoy postgres api_v2 postgres_migration )

docker run --rm --mount "type=bind,source=${PWD},target=/inputs,ro" denoland/deno:distroless-1.39.1 run --lock /inputs/bake.ts.lock.json --cached-only --allow-all /inputs/bake.ts "${github_sha}" "${ref_b64}" | tee bake.json
if [[ "${os}" = "${host_os}" && "${arch}" = "${host_arch}" ]]; then
  docker buildx bake --file bake.json "${os}-${arch}-prod" "${os}-${arch}-test"
else
  docker buildx bake --file bake.json "${os}-${arch}-prod"
fi

for service in "${services[@]}"
do
  img="${img_prefix}/${service}"
  docker push "${img}":"h-${github_sha}-${os}-${arch}" &
done

if [[ "${os}" = "${host_os}" && "${arch}" = "${host_arch}" ]]; then
  docker run \
    --mount "type=bind,source=${PWD},target=${PWD}" \
    --mount "type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock" \
    --mount "type=bind,source=${HOME}/.docker/buildx,target=/root/.docker/buildx" \
    -e "MY_COMPOSE_DIR=${PWD}" \
    -e "CI=${CI:-}" \
    -e MY_HOST="host.docker.internal" \
    --add-host=host.docker.internal:host-gateway \
    --init \
    --rm \
    "${img_prefix}/tests_e2e:h-${github_sha}-${os}-${arch}" \
    .venv/bin/python3 -m pytest -s src

  # Wait `docker push`
  wait

  TAG="h-${github_sha}-${os}-${arch}" \
  _POSTGRES_PASSWORD=postgres \
  _POSTGRES_APP_USER_PASSWORD=app \
  scripts/launch.sh

  i=0
  for _i in {1..10}; do
    if curl localhost:8080/healthz; then
      break;
    fi
    (( ++i ))
    sleep 1
  done
  if [[ ${i} -ge 10 ]]; then
      exit 1
  fi
fi

for service in "${services[@]}"
do
  img="${img_prefix}/${service}"
  if [[ "${ref}" = "refs/heads/main" ]]; then
    docker tag "${img}:h-${github_sha}-${os}-${arch}" "${img}:b-${run_number}-${os}-${arch}"
    docker push "${img}:b-${run_number}-${os}-${arch}" &
    docker tag "${img}:h-${github_sha}-${os}-${arch}" "${img}:latest-${os}-${arch}"
    docker push "${img}:latest-${os}-${arch}" &
  fi
done
wait
