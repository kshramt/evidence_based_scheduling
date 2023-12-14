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
pnpm exec vitest run --run --coverage
pnpm exec eslint --max-warnings 0 src
# pnpm exec playwright test -c playwright-ct.config.ts
pnpm exec prettier --check src
