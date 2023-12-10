#!/bin/bash

set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=


usage_and_exit(){
   {
      echo "${0##*/}"
   } >&2
   exit "${1:-1}"
}

readonly dir="$(dirname "$0")"
readonly tmp_dir="$(mktemp -d)"

finalize(){
   rm -fr "${tmp_dir}"
}

trap finalize EXIT

bazelisk test //...
bazelisk build --stamp --embed_label "${EMBED_LABEL}" //...

for target in //:oci_prod_envoy_push
do
   bazelisk run --stamp --embed_label "${EMBED_LABEL}" "${target}"
done
