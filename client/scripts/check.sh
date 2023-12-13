#!/bin/bash

set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=

npx -w client tsc --noEmit
npx -w client vitest run --run --coverage
npx -w client eslint --max-warnings 0 src
# npx -w client playwright test -c playwright-ct.config.ts
npx -w client prettier --check src
