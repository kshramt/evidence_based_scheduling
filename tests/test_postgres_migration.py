import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class MigrationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = Path(self.enterContext(tempfile.TemporaryDirectory()))
        config = self.temp / ".config/evidence-based-scheduling"
        config.mkdir(parents=True)
        self.config = config / "deploy.env"
        self.original = "_POSTGRES_PASSWORD=old\n_POSTGRES_APP_USER_PASSWORD=app\nMY_HOST_PGDATA=/old\n"
        self.config.write_text(self.original)
        self.config.chmod(0o600)
        (self.temp / "d").mkdir()
        self.log = self.temp / "docker.jsonl"
        fake = self.temp / "docker"
        fake.write_text("""#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
args = sys.argv[1:]
with open(os.environ['DOCKER_LOG'], 'a') as log:
    log.write(json.dumps(args) + '\\n')
if args[0] == 'inspect':
    print('/old' if 'Mounts' in args[2] else 'registry/app:' + args[-1])
elif args[0] == 'exec':
    sys.exit(int(os.environ.get('AUTH_EXIT', '0')))
elif args[0] == 'compose':
    i = args.index('-f')
    cmd = args[i + 4:]
    if cmd[0] == 'config':
        if '--format' in cmd:
            print(json.dumps({'services': {'postgres_migration': {'environment': {'_POSTGRES_APP_USER_PASSWORD': 'app'}}}}))
    elif cmd[0] == 'ps':
        print(cmd[-1])
    elif cmd[0] == 'run':
        sys.exit(int(os.environ.get('AUTH_EXIT', '0')))
    elif cmd[0] == 'pull':
        sys.exit(int(os.environ.get('PULL_EXIT', '0')))
    elif cmd[0] == 'exec':
        if 'server_version_num' in cmd[-1]:
            print('170012' if 'MY_HOST_PGDATA' in os.environ else os.environ.get('SOURCE_VERSION', '160016'))
        elif 'SELECT' in cmd[-1]:
            print('1|2' if 'MY_HOST_PGDATA' not in os.environ else os.environ.get('TARGET_COUNTS', '1|2'))
        elif 'pg_dumpall' in cmd:
            print('CREATE ROLE postgres;\\nCREATE ROLE app;')
        elif 'pg_dump' in cmd:
            print('backup')
        elif 'pg_restore' in cmd:
            sys.exit(int(os.environ.get('RESTORE_EXIT', '0')))
""")
        fake.chmod(0o700)
        self.env = {
            "PATH": f"{self.temp}:{os.environ['PATH']}",
            "HOME": str(self.temp),
            "DOCKER_LOG": str(self.log),
            "TAG": "test-new-tag",
        }

    def run_migration(self, **overrides: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(  # noqa: S603
            [ROOT / "scripts/migrate_postgres_17.sh"],
            env=self.env | overrides,
            capture_output=True,
            text=True,
            check=False,
        )

    def calls(self) -> list[list[str]]:
        return [json.loads(line) for line in self.log.read_text().splitlines()]

    def test_success_restores_verifies_and_records_rollback(self) -> None:
        result = self.run_migration()
        self.assertEqual(result.returncode, 0, result.stderr)
        new_data = self.temp / "d/ebs-postgres-17"
        self.assertIn(f"MY_HOST_PGDATA='{new_data}'", self.config.read_text())
        self.assertEqual(self.config.stat().st_mode & 0o777, 0o600)
        [backup] = self.temp.glob("ebs-pg16-backup.*")
        self.assertEqual((backup / "deploy.env").read_text(), self.original)
        rollback = (backup / "rollback.sh").read_text()
        self.assertIn("MY_HOST_PGDATA=/old", rollback)
        self.assertIn("registry/app:postgres", (backup / "old-images.yaml").read_text())
        calls = self.calls()
        restore = next(i for i, call in enumerate(calls) if "pg_restore" in call)
        authenticate = next(
            i for i, call in enumerate(calls) if "PGPASSWORD=app" in call
        )
        restart = next(i for i, call in enumerate(calls) if call[-2:] == ["up", "-d"])
        self.assertLess(restore, authenticate)
        self.assertLess(authenticate, restart)
        self.assertIn("run", calls[authenticate])
        self.assertEqual(
            calls[authenticate][calls[authenticate].index("-h") + 1], "postgres"
        )

    def test_existing_destination_stops_before_docker(self) -> None:
        (self.temp / "d/ebs-postgres-17").mkdir()
        self.assertNotEqual(self.run_migration().returncode, 0)
        self.assertFalse(self.log.exists())

    def test_pull_failure_keeps_services_running(self) -> None:
        self.assertNotEqual(self.run_migration(PULL_EXIT="7").returncode, 0)
        self.assertFalse(any("stop" in call for call in self.calls()))
        self.assertEqual(self.config.read_text(), self.original)

    def test_restore_and_verification_failures_keep_old_configuration(self) -> None:
        for failure in ("RESTORE_EXIT", "AUTH_EXIT", "TARGET_COUNTS"):
            with self.subTest(failure=failure):
                destination = self.temp / failure
                result = self.run_migration(
                    NEW_PGDATA=str(destination), **{failure: "9"}
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.config.read_text(), self.original)
        self.assertFalse(any(call[-2:] == ["up", "-d"] for call in self.calls()))

    def test_wrong_source_version_stops_before_pull(self) -> None:
        self.assertNotEqual(self.run_migration(SOURCE_VERSION="170012").returncode, 0)
        self.assertFalse(any("pull" in call or "stop" in call for call in self.calls()))


if __name__ == "__main__":
    unittest.main()
