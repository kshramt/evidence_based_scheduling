"""Check that each exported IndexedDB head has a complete history."""

import argparse
import json
from pathlib import Path

Head = tuple[int, int, int]
HEAD_FIELDS = ("client_id", "session_id", "patch_id")
VALUE_OPERATIONS = {"add", "replace", "test"}
SOURCE_OPERATIONS = {"copy", "move"}
OPERATIONS = VALUE_OPERATIONS | SOURCE_OPERATIONS | {"remove"}


def head(value: object, prefix: str = "") -> Head:
    if not isinstance(value, dict):
        raise ValueError("Expected a head object")
    numbers = [value.get(prefix + field) for field in HEAD_FIELDS]
    if any(type(number) is not int for number in numbers):
        raise ValueError("Invalid head fields")
    return numbers[0], numbers[1], numbers[2]


def store(data: dict, name: str) -> dict:
    entries = data.get(name)
    if not isinstance(entries, list):
        raise ValueError(f"Missing or invalid {name} store")
    result = {}
    for entry in entries:
        if not isinstance(entry, dict) or "key" not in entry or "value" not in entry:
            raise ValueError(f"Invalid record in {name}")
        key = entry["key"]
        if isinstance(key, list):
            if len(key) != len(HEAD_FIELDS) or any(
                type(number) is not int for number in key
            ):
                raise ValueError(f"Invalid key in {name}")
            key = tuple(key)
        elif not isinstance(key, str) or name != "heads":
            raise ValueError(f"Invalid key in {name}")
        if key in result:
            raise ValueError(f"Duplicate key in {name}")
        result[key] = entry["value"]
    return result


def pointer(value: object) -> bool:
    """Accept the empty root pointer or a slash-prefixed pointer."""
    return isinstance(value, str) and (value == "" or value.startswith("/"))


def check_operations(operations: list, name: str, key: Head) -> None:
    """Check operation shape without applying the patch."""
    for index, entry in enumerate(operations):
        error = f"Invalid operation {index} under {name} head at {key}"
        if not isinstance(entry, dict) or not pointer(entry.get("path")):
            raise ValueError(error)
        operation = entry.get("op")
        if not isinstance(operation, str) or operation not in OPERATIONS:
            raise ValueError(error)
        if operation in VALUE_OPERATIONS and "value" not in entry:
            raise ValueError(error)
        if operation in SOURCE_OPERATIONS and not pointer(entry.get("from")):
            raise ValueError(error)


def check(data: object) -> None:
    """Check both heads, allowing history to terminate at a snapshot or root patch."""
    if not isinstance(data, dict):
        raise ValueError("Expected an IndexedDB export object")
    heads = store(data, "heads")
    snapshots = store(data, "snapshots")
    patches = store(data, "patches")
    verified: set[Head] = set()
    for name in ("local", "remote"):
        key = head(heads.get(name))
        visited: set[Head] = set()
        while key not in verified:
            if key in visited:
                raise ValueError(f"Parent cycle under {name} head at {key}")
            visited.add(key)
            if key in snapshots:
                snapshot = snapshots[key]
                if not isinstance(snapshot, dict) or not isinstance(
                    snapshot.get("snapshot"), dict
                ):
                    raise ValueError(f"Invalid snapshot under {name} head at {key}")
                break
            patch = patches.get(key)
            if not isinstance(patch, dict) or not isinstance(patch.get("patch"), list):
                raise ValueError(f"Missing or invalid patch under {name} head at {key}")
            check_operations(patch["patch"], name, key)
            parent = head(patch, "parent_")
            if parent == key:
                break
            key = parent
        verified.update(visited)


def main() -> int:
    """Read an export file and report whether its history is reachable."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("export", type=Path)
    args = parser.parse_args()
    try:
        with args.export.open(encoding="utf-8") as source:
            check(json.load(source))
    except (OSError, ValueError) as error:
        parser.exit(1, f"{error}\n")
    print("Local and remote history are reachable.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
