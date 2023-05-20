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
ref="${2}"
readonly ref
run_number="${3}"
readonly run_number


for service in nginx envoy postgres api_v1 postgres_migration
do
  img="ghcr.io/kshramt/evidence_based_scheduling/${service}"
  docker manifest create "${img}:h-${github_sha}"{,-linux-{amd64,arm64}}
  docker manifest push "${img}:h-${github_sha}" &

  if [[ "${ref}" = "refs/heads/main" ]]; then
    docker manifest create "${img}:"{"b-${run_number}","h-${github_sha}"-linux-{amd64,arm64}}
    docker manifest push "${img}:b-${run_number}" &
    docker manifest create "${img}:"{latest,h-"${github_sha}"-linux-{amd64,arm64}}
    docker manifest push "${img}:latest" &
  fi
done
wait
