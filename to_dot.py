#!/usr/bin/python3

import argparse
import json
import logging
import sys

__version__ = "0.1.0"
logger = logging.getLogger()


def main(argv: list[str]) -> None:
    args = _parse_argv(argv[1:])
    _add_handlers(logger, level_stderr=args.log_level)
    logger.debug(dict(args=args))
    run(args)


color_of_status = dict(todo="darkblue", done="darkred", dont="darkgray")


def run(args: argparse.Namespace) -> None:
    data = json.load(sys.stdin)
    print("digraph G{")
    for k, v in data["nodes"].items():
        if args.todo and v["status"] != "todo":
            continue
        color = color_of_status[v["status"]]
        label = v["text"].strip().split("\n")[0].strip()[:20]
        print(f"n{k}[label={json.dumps(label, ensure_ascii=False)} fontcolor={color}]")
    for k, v in data["edges"].items():
        if args.todo and (
            (data["nodes"][v["p"]]["status"] != "todo")
            or (data["nodes"][v["c"]]["status"] != "todo")
        ):
            continue
        style = "dashed" if v["t"] == "weak" else "solid"
        print(f"n{v['p']}->n{v['c']}[style={json.dumps(style)}]")
    print("}")


def _parse_argv(argv: list[str]) -> argparse.Namespace:
    logger.debug(dict(argv=argv))
    doc = f"""
    {__file__}
    """

    parser = argparse.ArgumentParser(
        doc, formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "--version", action="version", version=f"%(prog)s {__version__}"
    )
    parser.add_argument(
        "--log_level",
        default="warning",
        type=lambda x: getattr(logging, x.upper()),
        help="Set log level.",
    )
    parser.add_argument("--todo", action="store_true")
    args = parser.parse_args(argv)
    logger.debug(dict(args=args))
    return args


def _add_handlers(
    logger: logging.Logger,
    level_stderr: int = logging.INFO,
) -> logging.Logger:
    fmt = logging.Formatter(
        "%(levelname)s\t%(process)d\t%(asctime)s\t%(pathname)s\t%(funcName)s\t%(lineno)d\t%(message)s"
    )
    import time

    fmt.converter = time.gmtime
    fmt.default_time_format = "%Y-%m-%dT%H:%M:%S"
    fmt.default_msec_format = "%s.%03dZ"

    hdl = logging.StreamHandler(sys.stderr)
    hdl.setFormatter(fmt)
    hdl.setLevel(level_stderr)
    logger.setLevel(logging.DEBUG)
    logger.addHandler(hdl)

    return logger


if __name__ == "__main__":
    main(sys.argv)
