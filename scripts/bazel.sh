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

readonly MY_BAZEL_FLAGS="--lockfile_mode error"


bazelisk test $MY_BAZEL_FLAGS //...
bazelisk build $MY_BAZEL_FLAGS //...

for target in //:oci_prod_envoy_push //client:oci_prod_push //api_v2:oci_prod_api_v2_push
do
   bazelisk run $MY_BAZEL_FLAGS --stamp --embed_label "${EMBED_LABEL}" "${target}"
done
