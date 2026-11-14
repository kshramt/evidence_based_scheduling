#!/bin/bash

set -euo pipefail

source_image="${1:?Pass the source PostgreSQL image}"
target_image="${2:?Pass the target PostgreSQL image}"
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_dir="$(mktemp -d)"
containers=()
cleanup() {
	if (("${#containers[@]}" > 0)); then
		docker rm -fv "${containers[@]}" >/dev/null
	fi
	rm -rf -- "${tmp_dir}"
}
trap cleanup EXIT

start_postgres() {
	local image="$1"
	local container
	container="$(docker run -d -e POSTGRES_PASSWORD=restore-test "${image}")"
	containers+=("${container}")
	for _ in {1..60}; do
		# A TCP connection rules out the temporary initialization server.
		if docker exec "${container}" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then
			return
		fi
		sleep 1
	done
	docker logs "${container}" >&2
	return 1
}

start_postgres "${source_image}"
source_db="${containers[0]}"
start_postgres "${target_image}"
target_db="${containers[1]}"

{
	sed 's/@APP_USER_PASSWORD@/app-test/' "${repo_root}/db/migrations/00000000000000_create_app_user.sql"
	cat "${repo_root}/db/migrations/20230218162542_create_tables.sql"
	cat <<'SQL'
BEGIN;
INSERT INTO app.users (id, head_client_id, head_session_id, head_patch_id)
VALUES ('restore-test', 1, 1, 1);
INSERT INTO app.clients (user_id, client_id, name)
VALUES ('restore-test', 1, 'test client');
INSERT INTO app.patches
(user_id, client_id, session_id, patch_id, parent_client_id, parent_session_id, parent_patch_id, patch, created_at)
VALUES ('restore-test', 1, 1, 1, 1, 1, 1, '[{"op":"add","path":"/fixture","value":"restore me"}]', now());
COMMIT;
SQL
} | docker exec -i "${source_db}" psql -X -U postgres -v ON_ERROR_STOP=1

docker exec "${source_db}" pg_dumpall -U postgres --roles-only --no-role-passwords >"${tmp_dir}/roles.sql"
docker exec "${source_db}" pg_dump -U postgres -Fc -d postgres >"${tmp_dir}/postgres.dump"

# The destination cluster already has its bootstrap superuser.
sed '/^CREATE ROLE postgres;$/d' "${tmp_dir}/roles.sql" |
	docker exec -i "${target_db}" psql -X -U postgres -v ON_ERROR_STOP=1
docker exec -i "${target_db}" pg_restore -U postgres --exit-on-error --single-transaction -d postgres <"${tmp_dir}/postgres.dump"
docker exec "${target_db}" psql -X -U postgres -v ON_ERROR_STOP=1 -c "ALTER ROLE app PASSWORD 'app-test'"

actual="$(docker exec -e PGPASSWORD=app-test "${target_db}" psql -X -h 127.0.0.1 -U app -d postgres -At -v ON_ERROR_STOP=1 -c "
SELECT count(*), min(p.patch->0->>'value') FROM app.users u
JOIN app.patches p ON (p.user_id, p.client_id, p.session_id, p.patch_id)
  = (u.id, u.head_client_id, u.head_session_id, u.head_patch_id)
WHERE u.id = 'restore-test';
")"
if [[ "${actual}" != '1|restore me' ]]; then
	printf 'Unexpected restored head and patch: %s\n' "${actual}" >&2
	exit 1
fi
