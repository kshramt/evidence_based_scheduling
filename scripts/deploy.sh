#!/bin/bash

set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

env_file="${COMPOSE_ENV_FILES:-${XDG_CONFIG_HOME:-${HOME}/.config}/evidence-based-scheduling/deploy.env}"
if [[ ! -r "${env_file}" ]]; then
	printf 'Deployment environment file is not readable: %s\n' "${env_file}" >&2
	exit 1
fi

if [[ -z "${DOCKER_HOST:-}" ]]; then
	export DOCKER_CONTEXT="${DOCKER_CONTEXT:-rootless}"
fi

TAG="${TAG:-h-$(git rev-parse HEAD)-linux-amd64}"
export TAG
printf 'Deploying %s\n' "${TAG}"
exec scripts/launch.sh --env-file "${env_file}"
