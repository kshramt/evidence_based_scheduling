#!/bin/bash

# set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=

dir="$(dirname "$0")"
readonly dir
pushd "${dir}/.."

if [[ ${ENV:-prod} != dev ]]; then
    sed -i'' -e 's/@APP_USER_PASSWORD@/'"${_POSTGRES_APP_USER_PASSWORD:?}"'/g' "db/migrations/00000000000000_create_app_user.sql"
fi

dbmate --wait --url "postgres://postgres@/postgres" migrate --verbose
