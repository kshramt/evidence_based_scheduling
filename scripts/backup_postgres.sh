#!/bin/bash

set -euo pipefail
set -o noclobber
umask 077

if [[ $# != 1 ]]; then
	printf 'Usage: %s BACKUP_DIRECTORY\n' "$0" >&2
	exit 2
fi
if ! destination="$(cd -- "$1" && pwd -P)"; then
	printf 'Backup destination must be an existing directory.\n' >&2
	exit 1
fi
env_file="${COMPOSE_ENV_FILES:-${XDG_CONFIG_HOME:-${HOME}/.config}/evidence-based-scheduling/deploy.env}"
if [[ ! -r "${env_file}" ]]; then
	printf 'Deployment environment file is not readable: %s\n' "${env_file}" >&2
	exit 1
fi
if [[ "${env_file}" != /* ]]; then
	env_file="${PWD}/${env_file}"
fi
if [[ -z "${DOCKER_HOST:-}" ]]; then
	export DOCKER_CONTEXT="${DOCKER_CONTEXT:-rootless}"
fi
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

compose=(docker compose --env-file "${env_file}" -f compose.yaml -f compose.prod.yaml)
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
staging="$(mktemp -d "${destination}/.ebs-postgres.XXXXXXXX")"
published="${destination}/ebs-postgres-${timestamp}.${staging##*.}"
cleanup() {
	if [[ -d "${staging}" ]]; then
		rm -f -- "${staging}/roles.sql" "${staging}/postgres.dump" "${staging}/SHA256SUMS"
		rmdir -- "${staging}"
	fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"${compose[@]}" exec -T postgres pg_dumpall -U postgres --roles-only >|"${staging}/roles.sql"
"${compose[@]}" exec -T postgres pg_dump -U postgres -Fc -d postgres >|"${staging}/postgres.dump"
if [[ ! -s "${staging}/roles.sql" || ! -s "${staging}/postgres.dump" ]]; then
	printf 'PostgreSQL wrote an empty backup.\n' >&2
	exit 1
fi
"${compose[@]}" exec -T postgres pg_restore --file=/dev/null <"${staging}/postgres.dump"
(
	cd -- "${staging}"
	if command -v sha256sum >/dev/null 2>&1; then
		sha256sum roles.sql postgres.dump
	else
		shasum -a 256 roles.sql postgres.dump
	fi
) >|"${staging}/SHA256SUMS"
if [[ -e "${published}" || -L "${published}" ]]; then
	printf 'Backup destination already exists: %s\n' "${published}" >&2
	exit 1
fi
mv -- "${staging}" "${published}"
printf '%s\n' "${published}"
