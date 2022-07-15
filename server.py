import datetime
import gzip
import json
import os
import pathlib
import urllib

import flask


class Err(Exception):
    pass


DATA_DIR = os.environ.get("EBS_DATA_DIR", "data")
DATA_CHECKPOINT_DIR = os.environ.get("EBS_DATA_CHECKPOINT_DIR", None)
DATA_BASENAME = os.environ.get("EBS_DATA_BASENAME", "evidence_based_scheduling")

app = flask.Flask(
    __name__, static_folder=pathlib.Path("build", "static"), template_folder="build"
)


@app.route("/")
def root():
    res = flask.make_response(flask.render_template("index.html"))
    res.headers["Cache-Control"] = "no-store"
    return res


@app.route("/api/v1/get")
def get():
    path = pathlib.Path(DATA_DIR, DATA_BASENAME + ".json.gz")
    if path.exists():
        with gzip.open(path, "rt") as fp:
            data = json.load(fp)
    else:
        data = None
    res = flask.make_response(flask.json.jsonify(data))
    res.headers["Cache-Control"] = "no-store"
    return res


@app.route("/api/v1/post", methods=["POST"])
def post():
    return save(flask.request.json)


def save(data):
    s = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    time = datetime.datetime.now().isoformat()
    if DATA_CHECKPOINT_DIR is not None:
        pathlib.Path(DATA_CHECKPOINT_DIR).mkdir(exist_ok=True, parents=True)
        with gzip.open(
            pathlib.Path(DATA_CHECKPOINT_DIR, DATA_BASENAME + "_" + time + ".json.gz"),
            "wt",
        ) as fp:
            fp.write(s)
    pathlib.Path(DATA_DIR).mkdir(exist_ok=True, parents=True)
    with gzip.open(pathlib.Path(DATA_DIR, DATA_BASENAME + ".json.gz"), "wt") as fp:
        fp.write(s)
    return time


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0")
