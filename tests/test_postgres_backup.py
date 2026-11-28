import hashlib
import json
import os
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PostgresBackupTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = Path(self.enterContext(tempfile.TemporaryDirectory())).resolve()
        self.destination = self.temp / "backups"
        self.destination.mkdir()
        self.env_file = self.temp / "evidence-based-scheduling" / "deploy.env"
        self.env_file.parent.mkdir()
        self.env_file.touch()
        self.log = self.temp / "docker.jsonl"
        docker = self.temp / "docker"
        docker.write_text(
            """#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
with open(os.environ["DOCKER_LOG"], "a") as log:
    log.write(json.dumps([os.environ.get("DOCKER_CONTEXT"), args]) + "\\n")
command = args[args.index("exec") + 3]
if command == "pg_dumpall":
    print("roles")
elif command == "pg_dump":
    print(os.environ.get("DUMP_CONTENT", "archive"))
    sys.exit(int(os.environ.get("DUMP_EXIT", "0")))
elif command == "pg_restore":
    archive = sys.stdin.read()
    if "--file=/dev/null" in args and archive != "archive\\n":
        sys.exit(4)
    sys.exit(int(os.environ.get("CHECK_EXIT", "0")))
else:
    sys.exit(5)
"""
        )
        docker.chmod(0o700)
        self.env = {
            "PATH": f"{self.temp}:{os.environ['PATH']}",
            "HOME": str(self.temp),
            "XDG_CONFIG_HOME": str(self.temp),
            "DOCKER_LOG": str(self.log),
        }

    def backup(self, **overrides: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(  # noqa: S603
            [ROOT / "scripts/backup_postgres.sh", self.destination.name],
            cwd=self.temp,
            env=self.env | overrides,
            capture_output=True,
            text=True,
            check=False,
        )

    def test_publishes_private_files_after_checking_archive(self) -> None:
        result = self.backup()
        self.assertEqual(result.returncode, 0, result.stderr)
        backup = Path(result.stdout.strip())
        self.assertEqual(list(self.destination.iterdir()), [backup])
        self.assertEqual(stat.S_IMODE(backup.stat().st_mode), 0o700)
        files = [("roles.sql", "roles\n"), ("postgres.dump", "archive\n")]
        for name, content in files:
            file = backup / name
            self.assertEqual(stat.S_IMODE(file.stat().st_mode), 0o600)
            self.assertEqual(file.read_text(), content)
        manifest = backup / "SHA256SUMS"
        self.assertEqual(stat.S_IMODE(manifest.stat().st_mode), 0o600)
        self.assertEqual(
            manifest.read_text().splitlines(),
            [
                f"{hashlib.sha256(content.encode()).hexdigest()}  {name}"
                for name, content in files
            ],
        )
        prefix = [
            "compose",
            "--env-file",
            str(self.env_file),
            "-f",
            "compose.yaml",
            "-f",
            "compose.prod.yaml",
            "exec",
            "-T",
            "postgres",
        ]
        commands = [
            ["pg_dumpall", "-U", "postgres", "--roles-only"],
            ["pg_dump", "-U", "postgres", "-Fc", "-d", "postgres"],
            ["pg_restore", "--file=/dev/null"],
        ]
        self.assertEqual(
            [json.loads(line) for line in self.log.read_text().splitlines()],
            [["rootless", [*prefix, *command]] for command in commands],
        )

    def test_dump_failure_keeps_previous_backup(self) -> None:
        existing = self.destination / "ebs-postgres-existing"
        existing.mkdir()
        result = self.backup(DUMP_EXIT="7")
        self.assertEqual(result.returncode, 7)
        self.assertEqual(result.stdout, "")
        self.assertEqual(list(self.destination.iterdir()), [existing])

    def test_unreadable_archive_is_never_published(self) -> None:
        result = self.backup(CHECK_EXIT="8")
        self.assertEqual(result.returncode, 8)
        self.assertEqual(result.stdout, "")
        self.assertEqual(list(self.destination.iterdir()), [])

    def test_checksum_failure_keeps_previous_backup(self) -> None:
        existing = self.destination / "ebs-postgres-existing"
        existing.mkdir()
        checksum = self.temp / "sha256sum"
        checksum.write_text("#!/bin/sh\necho partial\nexit 9\n")
        checksum.chmod(0o700)
        result = self.backup()
        self.assertEqual(result.returncode, 9)
        self.assertEqual(result.stdout, "")
        self.assertEqual(list(self.destination.iterdir()), [existing])

    def test_truncated_archive_with_readable_header_is_never_published(self) -> None:
        result = self.backup(DUMP_CONTENT="archive header without payload")
        self.assertEqual(result.returncode, 4)
        self.assertEqual(result.stdout, "")
        self.assertEqual(list(self.destination.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
