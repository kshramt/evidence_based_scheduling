#!/bin/bash

set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=


mkdir -p "${DATA_DIR:=/data}"

if [[ "${USE_LITESTREAM:=yes}" = "yes" ]]; then
   litestream restore -v -if-db-not-exists -if-replica-exists -o "${DATA_DIR}/data.sqlite" "${REPLICA_URI}"
   exec litestream replicate -exec ".venv/bin/python3 -OO -m uvicorn api.main:app --host 0.0.0.0 --log-config log-config.json --port ${PORT:-8080}" "${DATA_DIR}/data.sqlite" "${REPLICA_URI}"
else
   exec .venv/bin/python3 -OO -m uvicorn api.main:app --host 0.0.0.0 --log-config log-config.json --port "${PORT:-8080}"
fi
