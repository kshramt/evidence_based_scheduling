import datetime
import gzip
import json
import os
import urllib

import flask


class Err(Exception):
    pass


def mkdir(path):
    return os.makedirs(path, exist_ok=True)


def jp(path, *more):
    """
    >>> jp(".", "a")
    'a'
    >>> jp("a", "b")
    'a/b'
    >>> jp("a", "b", "..")
    'a'
    >>> jp("a", "/b", "c")
    'a/b/c'
    >>> jp("gs://b", "c//d")
    'gs://b/c/d'
    """
    puri = urllib.parse.urlparse(os.path.sep.join((path, os.path.sep.join(more))))
    return urllib.parse.ParseResult(
        **{**puri._asdict(), **dict(path=os.path.normpath(puri.path))}
    ).geturl()


DATA_DIR = os.environ.get("EBS_DATA_DIR", "data")
DATA_CHECKPOINT_DIR = os.environ.get("EBS_DATA_CHECKPOINT_DIR", None)
DATA_BASENAME = os.environ.get("EBS_DATA_BASENAME", "evidence_based_scheduling")

app = flask.Flask(
    __name__, static_folder=jp("build", "static"), template_folder="build"
)


@app.route("/")
def root():
    res = flask.make_response(flask.render_template("index.html"))
    res.headers["Cache-Control"] = "no-store"
    return res


@app.route("/api/v1/get")
def get():
    try:
        with gzip.open(jp(DATA_DIR, DATA_BASENAME) + ".json.gz", "rt") as fp:
            data = json.load(fp)
    except IOError:
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
        mkdir(DATA_CHECKPOINT_DIR)
        with gzip.open(
            jp(DATA_CHECKPOINT_DIR, DATA_BASENAME) + "_" + time + ".json.gz", "wt"
        ) as fp:
            fp.write(s)
    mkdir(DATA_DIR)
    with gzip.open(jp(DATA_DIR, DATA_BASENAME) + ".json.gz", "wt") as fp:
        fp.write(s)
    return time


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0")
