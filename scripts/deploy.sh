#!/bin/bash

set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

export COMPOSE_ENV_FILES="${COMPOSE_ENV_FILES:-${XDG_CONFIG_HOME:-${HOME}/.config}/evidence-based-scheduling/deploy.env}"
if [[ ! -r "${COMPOSE_ENV_FILES}" ]]; then
	printf 'Deployment environment file is not readable: %s\n' "${COMPOSE_ENV_FILES}" >&2
	exit 1
fi

if [[ -z "${DOCKER_HOST:-}" ]]; then
	export DOCKER_CONTEXT="${DOCKER_CONTEXT:-rootless}"
fi

TAG="${TAG:-h-$(git rev-parse HEAD)-linux-amd64}"
export TAG
printf 'Deploying %s\n' "${TAG}"
exec scripts/launch.sh
