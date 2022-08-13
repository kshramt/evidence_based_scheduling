#!/bin/bash

set -xv
set -o nounset
set -o errexit
set -o pipefail
set -o noclobber

export IFS=$' \t\n'
export LANG=C.UTF-8
umask u=rwx,g=,o=

.venv/bin/python3 -m pyflakes api
.venv/bin/python3 -m mypy api
.venv/bin/python3 -m black --check api
.venv/bin/python3 -m isort --check-only api
.venv/bin/python3 -m pytest
