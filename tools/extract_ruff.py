#!/usr/bin/env python3

import pathlib
import sys
import zipfile


def main(argv: list[str]) -> int:
    with zipfile.ZipFile(argv[1], "r") as zip_ref:
        for file in zip_ref.filelist:
            if file.filename.endswith("/ruff"):
                path = pathlib.Path(argv[2])
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(zip_ref.read(file))
                path.chmod(0o755)
                return 0
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
