#!/bin/bash

wait_for_jobs() {
	local pid status=0
	for pid; do
		wait "${pid}" || status=$?
	done
	return "${status}"
}
