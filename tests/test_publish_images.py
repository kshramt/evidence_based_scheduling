import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ImagePublishTest(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.log = self.directory / "docker.jsonl"
        docker = self.directory / "docker"
        docker.write_text(
            """#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
with open(os.environ["DOCKER_LOG"], "a") as log:
    log.write(json.dumps(args) + "\\n")
if args[0] == "run":
    print("{}")
if args[:1] == ["push"] or args[:2] == ["manifest", "push"]:
    if args[-1].endswith(os.environ["FAIL_PUSH"]):
        sys.exit(7)
"""
        )
        docker.chmod(0o700)

    def run_script(
        self, script: str, arguments: list[str], fail_push: str
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(  # noqa: S603
            [ROOT / "scripts" / script, *arguments],
            cwd=self.directory,
            env=os.environ
            | {
                "PATH": f"{self.directory}:{os.environ['PATH']}",
                "DOCKER_LOG": str(self.log),
                "FAIL_PUSH": fail_push,
            },
            capture_output=True,
            text=True,
            check=False,
        )

    def test_failed_sha_push_blocks_release_tags(self) -> None:
        result = self.run_script(
            "build_test_push.sh",
            [
                "abc",
                "main",
                "linux",
                "amd64",
                "refs/heads/main",
                "12",
                "arm64",
                "linux",
            ],
            "/nginx:h-abc-linux-amd64",
        )
        self.assertEqual(result.returncode, 7, result.stderr)
        commands = [json.loads(line) for line in self.log.read_text().splitlines()]
        self.assertEqual(sum(args[0] == "push" for args in commands), 5)
        self.assertFalse(any(args[0] == "tag" for args in commands))

    def test_failed_release_tag_push_fails_the_script(self) -> None:
        result = self.run_script(
            "build_test_push.sh",
            [
                "abc",
                "main",
                "linux",
                "amd64",
                "refs/heads/main",
                "12",
                "arm64",
                "linux",
            ],
            "/nginx:latest-linux-amd64",
        )
        self.assertEqual(result.returncode, 7, result.stderr)

    def test_failed_manifest_push_fails_the_script(self) -> None:
        result = self.run_script(
            "publish_manifests.sh", ["abc", "refs/heads/main", "12"], "/nginx:h-abc"
        )
        self.assertEqual(result.returncode, 7, result.stderr)
        commands = [json.loads(line) for line in self.log.read_text().splitlines()]
        self.assertFalse(any(args[-1].endswith("/nginx:latest") for args in commands))


if __name__ == "__main__":
    unittest.main()
