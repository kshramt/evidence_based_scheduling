import datetime
import json
import os

import flask


def mkdir(path):
    return os.makedirs(path, exist_ok=True)


def jp(path, *more):
    """
    >>> _jp(".", "a")
    'a'
    >>> _jp("a", "b")
    'a/b'
    >>> _jp("a", "b", "..")
    'a'
    >>> _jp("a", "/b", "c")
    'a/b/c'
    """
    return os.path.normpath(os.path.sep.join((path, os.path.sep.join(more))))


DATA_DIR = os.environ.get("EBS_DATA_DIR", "data")
DATA_CHECKPOINT_DIR = os.environ.get("EBS_DATA_CHECKPOINT_DIR", None)
DATA_BASENAME = os.environ.get("EBS_DATA_BASENAME", "evidence_based_scheduling")


try:
    with open(jp(DATA_DIR, DATA_BASENAME) + ".json") as fp:
        DATA = json.load(fp)
except IOError:
    DATA = dict(current_entry=None, done=[], dont=[], kvs=dict(), todo=[])


app = flask.Flask(__name__)


@app.route("/api/v1/get")
def get():
    return flask.json.jsonify(DATA)


@app.route("/api/v1/post", methods=["POST"])
def post():
    global DATA
    DATA = flask.request.json
    return save(flask.request.json)


def save(data):
    s = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    time = datetime.datetime.now().isoformat()
    if DATA_CHECKPOINT_DIR is not None:
        mkdir(DATA_CHECKPOINT_DIR)
        with open(
            jp(DATA_CHECKPOINT_DIR, DATA_BASENAME) + "_" + time + ".json", "w"
        ) as fp:
            fp.write(s)
    mkdir(DATA_DIR)
    with open(jp(DATA_DIR, DATA_BASENAME) + ".json", "w") as fp:
        fp.write(s)
    return time
