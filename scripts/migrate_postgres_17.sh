#!/bin/bash

set -euo pipefail
set -o noclobber
umask 077

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
repo_dir="${PWD}"
env_file="${COMPOSE_ENV_FILES:-${XDG_CONFIG_HOME:-${HOME}/.config}/evidence-based-scheduling/deploy.env}"
new_pgdata="${NEW_PGDATA:-${HOME}/d/ebs-postgres-17}"
export TAG="${TAG:-h-$(git rev-parse HEAD)-linux-amd64}"
if [[ -z "${DOCKER_HOST:-}" ]]; then
	export DOCKER_CONTEXT="${DOCKER_CONTEXT:-rootless}"
fi

if [[ ! -r "${env_file}" || ! -w "${env_file}" ]]; then
	printf 'Environment file must be readable and writable: %s\n' "${env_file}" >&2
	exit 1
fi
if [[ "${new_pgdata}" != /* || -e "${new_pgdata}" || "${new_pgdata}" == *$'\n'* || "${new_pgdata}" == *$'\r'* ]]; then
	printf 'NEW_PGDATA must be a new absolute path: %s\n' "${new_pgdata}" >&2
	exit 1
fi
if ! grep -Eq '^FROM postgres:17\.' Dockerfile; then
	printf 'Check out the PostgreSQL 17 deployment commit first.\n' >&2
	exit 1
fi
command -v python3 >/dev/null
compose=(docker compose --env-file "${env_file}" -f compose.yaml -f compose.prod.yaml)
"${compose[@]}" config -q
cid="$("${compose[@]}" ps -q postgres)"
if [[ -z "${cid}" ]]; then
	printf 'No running PostgreSQL container.\n' >&2
	exit 1
fi
old_image="$(docker inspect --format '{{.Config.Image}}' "${cid}")"
old_pgdata="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Source}}{{end}}{{end}}' "${cid}")"
if [[ -z "${old_pgdata}" ]]; then
	printf 'PostgreSQL data mount was not found.\n' >&2
	exit 1
fi
source_version="$("${compose[@]}" exec -T postgres psql -X -U postgres -Atc 'SHOW server_version_num')"
if [[ "${source_version}" != 16[0-9][0-9][0-9][0-9] ]]; then
	printf 'Expected PostgreSQL 16, found %s.\n' "${source_version}" >&2
	exit 1
fi

# Pull every destination image before stopping any writer.
export _DOCKER_API_V2_TAG="${TAG}" _DOCKER_NGINX_TAG="${TAG}" _DOCKER_ENVOY_TAG="${TAG}"
export _DOCKER_POSTGRES_TAG="${TAG}" _DOCKER_POSTGRES_MIGRATION_TAG="${TAG}"
"${compose[@]}" pull
backup_dir="$(mktemp -d "${HOME}/ebs-pg16-backup.XXXXXXXX")"
cp -p -- "${env_file}" "${backup_dir}/deploy.env"
# Capture exact running images, including deployments with mixed image tags.
{
	printf 'services:\n'
	for service in postgres api_v2 nginx envoy postgres_migration; do
		service_cid="$("${compose[@]}" ps -aq "${service}")"
		if [[ -z "${service_cid}" ]]; then
			printf 'Container for %s was not found.\n' "${service}" >&2
			exit 1
		fi
		image="$(docker inspect --format '{{.Config.Image}}' "${service_cid}")"
		printf '  %s:\n    image: "%s"\n' "${service}" "${image}"
	done
} >|"${backup_dir}/old-images.yaml"
{
	printf '#!/bin/bash\nset -euo pipefail\n'
	printf 'cd -- %q\n' "${repo_dir}"
	if [[ -n "${DOCKER_HOST:-}" ]]; then
		printf 'export DOCKER_HOST=%q\n' "${DOCKER_HOST}"
	else
		printf 'export DOCKER_CONTEXT=%q\n' "${DOCKER_CONTEXT}"
	fi
	printf 'cp -p -- %q %q\n' "${backup_dir}/deploy.env" "${env_file}"
	printf 'export MY_HOST_PGDATA=%q\n' "${old_pgdata}"
	printf 'docker compose --env-file %q -f compose.yaml -f compose.prod.yaml -f %q up -d\n' "${env_file}" "${backup_dir}/old-images.yaml"
} >|"${backup_dir}/rollback.sh"
chmod 700 "${backup_dir}/rollback.sh"
printf 'Source image: %s\nSource data: %s\nDestination data: %s\nBackup: %s\n' "${old_image}" "${old_pgdata}" "${new_pgdata}" "${backup_dir}"

stopped=false
report_failure() {
	local exit_status=$?
	if [[ "${stopped}" == true && "${exit_status}" != 0 ]]; then
		printf 'Migration stopped. Keep the application stopped and inspect the error. Backup and rollback script: %s\n' "${backup_dir}" >&2
	fi
}
trap report_failure EXIT
mkdir -m 700 -- "${new_pgdata}"
"${compose[@]}" stop envoy api_v2 nginx postgres_migration
stopped=true
counts_sql='SELECT (SELECT count(*) FROM app.users), (SELECT count(*) FROM app.patches)'
source_counts="$("${compose[@]}" exec -T postgres psql -X -U postgres -Atc "${counts_sql}")"
"${compose[@]}" exec -T postgres pg_dumpall -U postgres --roles-only >|"${backup_dir}/roles.sql"
"${compose[@]}" exec -T postgres pg_dump -U postgres -Fc -d postgres >|"${backup_dir}/postgres.dump"
test -s "${backup_dir}/roles.sql"
test -s "${backup_dir}/postgres.dump"
"${compose[@]}" stop postgres
export MY_HOST_PGDATA="${new_pgdata}"
"${compose[@]}" up -d --wait --no-deps postgres
sed '/^CREATE ROLE postgres;$/d' "${backup_dir}/roles.sql" |
	"${compose[@]}" exec -T postgres psql -X -U postgres -v ON_ERROR_STOP=1
"${compose[@]}" exec -T postgres pg_restore -U postgres --exit-on-error --single-transaction -d postgres <"${backup_dir}/postgres.dump"
target_version="$("${compose[@]}" exec -T postgres psql -X -U postgres -Atc 'SHOW server_version_num')"
target_counts="$("${compose[@]}" exec -T postgres psql -X -U postgres -Atc "${counts_sql}")"
if [[ "${target_version}" != 17[0-9][0-9][0-9][0-9] || "${target_counts}" != "${source_counts}" ]]; then
	printf 'Restored database version or row counts do not match.\n' >&2
	exit 1
fi
# Authenticate over the Compose network, as the API does.
python3 - "${env_file}" <<'PYAUTH'
import json
import subprocess
import sys

config = json.loads(subprocess.check_output([
    "docker", "compose", "--env-file", sys.argv[1],
    "-f", "compose.yaml", "-f", "compose.prod.yaml", "config", "--format", "json",
]))
password = config["services"]["postgres_migration"]["environment"]["_POSTGRES_APP_USER_PASSWORD"]
subprocess.run([
    "docker", "compose", "--env-file", sys.argv[1],
    "-f", "compose.yaml", "-f", "compose.prod.yaml",
    "run", "--rm", "--no-deps", "-e", "PGPASSWORD=" + password,
    "--entrypoint", "psql", "postgres",
    "-X", "-h", "postgres", "-U", "app", "-d", "postgres",
    "-v", "ON_ERROR_STOP=1", "-c", "SELECT count(*) FROM app.users",
], check=True, stdout=subprocess.DEVNULL)
PYAUTH

# Persist the path atomically only after the restored database has passed checks.
python3 - "${env_file}" "${new_pgdata}" <<'PYENV'
import os
from pathlib import Path
import re
import stat
import sys
import tempfile

path = Path(sys.argv[1]).resolve()
value = sys.argv[2].replace("\\", "\\\\").replace("'", "\\'")
line = "MY_HOST_PGDATA='" + value + "'\n"
text = path.read_text()
text = re.sub(r"(?m)^(?:export\s+)?MY_HOST_PGDATA\s*=.*(?:\n|$)", "", text)
text = text.rstrip("\n") + "\n" + line
fd, temp = tempfile.mkstemp(dir=path.parent)
try:
    os.fchmod(fd, stat.S_IMODE(path.stat().st_mode))
    with os.fdopen(fd, "w") as output:
        output.write(text)
        output.flush()
        os.fsync(output.fileno())
    os.replace(temp, path)
finally:
    if os.path.exists(temp):
        os.unlink(temp)
PYENV
COMPOSE_ENV_FILES="${env_file}" scripts/deploy.sh
printf 'PostgreSQL %s restored. User and patch counts: %s\n' "${target_version}" "${target_counts}"
printf 'Keep backup and old data. Rollback before accepting new writes: %s/rollback.sh\n' "${backup_dir}"
