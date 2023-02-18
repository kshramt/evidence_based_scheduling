#!/bin/bash

set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=

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

python3 bake.py --sha="${github_sha}" --ref_b64="${ref_b64}" | tee bake.json
docker buildx bake --file bake.json "${os}-${arch}"

if [[ "${os}" = "${host_os}" && "${arch}" = "${host_arch}" ]]; then
  _DOCKER_API_DATA_DIR="./my_data" \
  _USE_LITESTREAM="no" \
  _REPLICA_URI="" \
  _DOCKER_API_TAG="${github_sha}-${os}-${arch}" \
  _DOCKER_NGINX_TAG="${github_sha}-${os}-${arch}" \
  _DOCKER_ENVOY_TAG="${github_sha}-${os}-${arch}" \
  _DOCKER_POSTGRES_TAG="${github_sha}-${os}-${arch}" \
  _POSTGRES_PASSWORD=postgres \
  docker compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d

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

for service in api nginx envoy
do
  img="ghcr.io/kshramt/evidence_based_scheduling/${service}"
  docker push "${img}":"${github_sha}-${os}-${arch}"
  if [[ "${ref}" = "refs/heads/main" ]]; then
    docker tag "${img}:${github_sha}-${os}-${arch}" "${img}:b${run_number}-${os}-${arch}"
    docker push "${img}:b${run_number}-${os}-${arch}"
    docker tag "${img}:${github_sha}-${os}-${arch}" "${img}:latest-${os}-${arch}"
    docker push "${img}:latest-${os}-${arch}"
  fi
done
