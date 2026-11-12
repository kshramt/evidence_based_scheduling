#!/bin/bash

set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=

pnpm exec tsc --noEmit
pnpm run test --coverage
pnpm exec eslint --max-warnings 0 src
pnpm exec prettier --check src
