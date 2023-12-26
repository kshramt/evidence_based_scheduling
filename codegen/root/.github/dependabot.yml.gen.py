#!/usr/bin/python3

import json
from typing import Any


def get_schedule() -> dict[str, Any]:
    return {
        "interval": "weekly",
        "day": "saturday",
        "time": "01:00",
        "timezone": "Asia/Tokyo",
    }


def get_groups() -> dict[str, Any]:
    return {
        "patch": {"update-types": ["patch"]},
        "minor": {"update-types": ["minor"]},
    }


def get_updates() -> list[dict[str, Any]]:
    res = []
    res.append(
        {"package-ecosystem": "docker", "directory": "/", "schedule": get_schedule()}
    )
    for package_ecosystem, paths in (
        ("cargo", ("/api_v2", "/id_generator")),
        ("github-actions", ("/",)),
        (
            "npm",
            (
                "/",
                "/client",
            ),
        ),
        ("pip", ("/", "/tests/e2e")),
    ):
        for path in paths:
            res.append(
                {
                    "package-ecosystem": package_ecosystem,
                    "directory": path,
                    "schedule": get_schedule(),
                    "groups": get_groups(),
                }
            )
    return res


def main() -> None:
    res = {
        "version": 2,
        "updates": get_updates(),
    }
    print(json.dumps(res, indent=2, sort_keys=True, ensure_ascii=False))


main()
