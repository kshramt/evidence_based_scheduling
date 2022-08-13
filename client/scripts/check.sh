#!/bin/bash

set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=

node_modules/.bin/react-scripts test --ci --watchAll false
node_modules/.bin/eslint --max-warnings 0 src
node_modules/.bin/prettier --check src
