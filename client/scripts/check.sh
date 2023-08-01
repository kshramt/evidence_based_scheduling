#!/bin/bash

set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=

node_modules/.bin/tsc --noEmit
node_modules/.bin/vitest run --run --coverage
node_modules/.bin/eslint --max-warnings 0 src
node_modules/.bin/playwright test -c playwright-ct.config.ts
node_modules/.bin/prettier --check src
