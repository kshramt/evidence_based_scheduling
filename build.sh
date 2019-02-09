#!/bin/sh

# set -xv
set -o nounset
set -o errexit
set -o noclobber

export IFS=$' \t\n'
export LANG=en_US.UTF-8
umask u=rwx,g=,o=


DOCKER_BUILDKIT=1 docker build -t kshramt/evidence_based_scheduling:latest .
