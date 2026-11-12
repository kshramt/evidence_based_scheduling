import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class DeployTest(unittest.TestCase):
    def setUp(self) -> None:
        temp = Path(self.enterContext(tempfile.TemporaryDirectory()))
        config = temp / "evidence-based-scheduling"
        config.mkdir()
        self.env_file = config / "deploy.env"
        self.env_file.touch()
        self.log = temp / "docker.jsonl"
        docker = temp / "docker"
        docker.write_text(
            """#!/usr/bin/env python3
import json, os, sys
with open(os.environ["DOCKER_LOG"], "a") as log:
    log.write(json.dumps([
        os.environ.get("DOCKER_CONTEXT"),
        os.environ.get("DOCKER_HOST"),
        os.environ["_DOCKER_API_V2_TAG"],
        sys.argv[1:],
    ]) + "\\n")
if sys.argv[-1] == "pull":
    sys.exit(int(os.environ.get("PULL_EXIT", "0")))
"""
        )
        docker.chmod(0o700)
        self.env = {
            "PATH": f"{temp}:{os.environ['PATH']}",
            "XDG_CONFIG_HOME": str(temp),
            "HOME": str(temp),
            "MY_HOST_PGDATA": str(temp / "pgdata"),
            "DOCKER_LOG": str(self.log),
        }
        self.temp = temp

    def deploy(self, **overrides: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(  # noqa: S603
            [ROOT / "scripts/deploy.sh"],
            cwd=self.temp,
            env=self.env | overrides,
            capture_output=True,
            text=True,
            check=False,
        )

    def test_pulls_checkout_images_before_starting(self) -> None:
        result = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        sha = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],  # noqa: S607
            cwd=ROOT,
            text=True,
        )
        prefix = ["rootless", None, f"h-{sha.strip()}-linux-amd64"]
        compose = [
            "compose",
            "--env-file",
            str(self.env_file),
            "-f",
            "compose.yaml",
            "-f",
            "compose.prod.yaml",
        ]
        self.assertEqual(
            [json.loads(line) for line in self.log.read_text().splitlines()],
            [[*prefix, [*compose, "pull"]], [*prefix, [*compose, "up", "-d"]]],
        )

    def test_pull_failure_leaves_running_services_alone(self) -> None:
        result = self.deploy(
            PULL_EXIT="7", TAG="custom", DOCKER_HOST="unix:///docker.sock"
        )
        self.assertEqual(result.returncode, 7)
        [call] = self.log.read_text().splitlines()
        context, host, tag, args = json.loads(call)
        self.assertIsNone(context)
        self.assertEqual(host, "unix:///docker.sock")
        self.assertEqual(tag, "custom")
        self.assertEqual(args[-1], "pull")

    def test_missing_env_file_stops_before_docker(self) -> None:
        self.env_file.unlink()
        result = self.deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(str(self.env_file), result.stderr)
        self.assertFalse(self.log.exists())


if __name__ == "__main__":
    unittest.main()
