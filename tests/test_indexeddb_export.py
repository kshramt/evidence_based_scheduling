import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/check_indexeddb_export.py"


def head(patch: int, prefix: str = "") -> dict[str, int]:
    return {
        prefix + "client_id": 1,
        prefix + "session_id": 2,
        prefix + "patch_id": patch,
    }


def fixture() -> dict:
    return {
        "heads": [
            {"key": "local", "value": head(3)},
            {"key": "remote", "value": head(2)},
        ],
        "snapshots": [{"key": [1, 2, 1], "value": {"snapshot": {}}}],
        "patches": [
            {"key": [1, 2, i], "value": {**head(i - 1, "parent_"), "patch": []}}
            for i in (2, 3)
        ],
    }


class IndexedDbExportTest(unittest.TestCase):
    def run_check(self, data: dict) -> subprocess.CompletedProcess[str]:
        with tempfile.TemporaryDirectory() as tmp:
            export = Path(tmp) / "indexeddb.json"
            export.write_text(json.dumps(data), encoding="utf-8")
            return subprocess.run(  # noqa: S603
                [sys.executable, SCRIPT, export],
                capture_output=True,
                check=False,
                text=True,
            )

    def test_both_heads_reach_the_snapshot(self) -> None:
        data = fixture()
        data["patches"][1]["value"]["patch"] = [
            {"op": "add", "path": "/data", "value": None},
            {"op": "copy", "path": "/copy", "from": "/data"},
        ]
        result = self.run_check(data)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_patch_history_can_end_at_its_root(self) -> None:
        data = fixture()
        data["snapshots"].clear()
        data["patches"].append(
            {"key": [1, 2, 1], "value": {**head(1, "parent_"), "patch": []}}
        )
        self.assertEqual(self.run_check(data).returncode, 0)

    def test_missing_patch_and_parent_cycle_are_reported(self) -> None:
        data = fixture()
        data["patches"].pop(0)
        result = self.run_check(data)
        self.assertEqual(result.returncode, 1)
        self.assertIn("Missing or invalid patch", result.stderr)

        data = fixture()
        data["patches"][0]["value"].update(head(3, "parent_"))
        result = self.run_check(data)
        self.assertEqual(result.returncode, 1)
        self.assertIn("Parent cycle", result.stderr)

    def test_malformed_patch_operations_are_reported(self) -> None:
        for operation in (
            {"op": "add", "path": "/data"},
            {"op": "move", "path": "/data", "from": False},
            {"op": "remove", "path": "data"},
            {"op": [], "path": ""},
        ):
            with self.subTest(operation=operation):
                data = fixture()
                data["patches"][1]["value"]["patch"] = [operation]
                result = self.run_check(data)
                self.assertEqual(result.returncode, 1)
                self.assertIn("Invalid operation 0 under local head", result.stderr)


if __name__ == "__main__":
    unittest.main()
