import re
import tomllib
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ToolchainTest(unittest.TestCase):
    def test_mise_versions_match_dockerfile(self) -> None:
        with (ROOT / "mise.toml").open("rb") as config_file:
            tools = tomllib.load(config_file)["tools"]
        dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
        docker_version_patterns = {
            "node": r"(?m)^FROM node:([\d.]+)-\S+ AS node_downloader$",
            "pnpm": r"(?m)^RUN npm install -g pnpm@([\d.]+)$",
            "rust": r"(?m)^FROM rust:([\d.]+)-\S+ AS rust_downloader$",
            "uv": r"(?m)^FROM ghcr\.io/astral-sh/uv:([\d.]+) AS download_uv$",
            "deno": r"(?m)^FROM denoland/deno:distroless-([\d.]+) AS deno_base$",
        }

        for tool, pattern in docker_version_patterns.items():
            with self.subTest(tool=tool):
                versions = re.findall(pattern, dockerfile)
                mise_version = tools[tool]
                if isinstance(mise_version, dict):
                    mise_version = mise_version["version"]
                self.assertRegex(mise_version, r"^\d+\.\d+\.\d+$")
                self.assertEqual(versions, [mise_version])


if __name__ == "__main__":
    unittest.main()
