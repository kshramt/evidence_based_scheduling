#!/bin/bash

set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

# shellcheck source=scripts/wait_for_jobs.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/wait_for_jobs.sh"

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=

export SOURCE_DATE_EPOCH="0"

github_sha="${1}"
readonly github_sha
ref="${2}"
readonly ref
run_number="${3}"
readonly run_number

create_and_push() {
	local img="$1"
	docker manifest create "${img}:h-${github_sha}"{,-linux-amd64}
	# docker manifest create "${img}:h-${github_sha}"{,-linux-{amd64,arm64}}
	docker manifest push "${img}:h-${github_sha}"

	if [[ "${ref}" = "refs/heads/main" ]]; then
		docker manifest create "${img}:"{"b-${run_number}","h-${github_sha}"-linux-amd64}
		# docker manifest create "${img}:"{"b-${run_number}","h-${github_sha}"-linux-{amd64,arm64}}
		docker manifest push "${img}:b-${run_number}"
		docker manifest create "${img}:"{latest,h-"${github_sha}"-linux-amd64}
		# docker manifest create "${img}:"{latest,h-"${github_sha}"-linux-{amd64,arm64}}
		docker manifest push "${img}:latest"
	fi
}

push_jobs=()
for service in nginx envoy postgres api_v2 postgres_migration; do
	create_and_push "ghcr.io/kshramt/evidence_based_scheduling/${service}" &
	push_jobs+=("$!")
done
wait_for_jobs "${push_jobs[@]}"
