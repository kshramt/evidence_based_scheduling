import datetime
import json
import os

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
    """
    return os.path.normpath(os.path.sep.join((path, os.path.sep.join(more))))


DATA_DIR = os.environ.get("EBS_DATA_DIR", "data")
DATA_CHECKPOINT_DIR = os.environ.get("EBS_DATA_CHECKPOINT_DIR", None)
DATA_BASENAME = os.environ.get("EBS_DATA_BASENAME", "evidence_based_scheduling")
NO_UPDATE_SERVER_DATA = os.environ.get("EBS_NO_UPDATE_SERVER_DATA", None)


def _update_data_version(data):
    if "version" not in data:
        return _update_data_version(_v1_of_vnone(data))
    elif data["version"] == 1:
        return data
    else:
        raise Err(f"Unsupported data version: {data.get('version', 'None')}")


def _v1_of_vnone(data):
    assert "version" not in data, data
    for v in data["kvs"].values():
        if "width" not in v:
            v["width"] = "60ex"
        if "height" not in v:
            v["height"] = "3ex"
    data["version"] = 1
    return data


app = flask.Flask(
    __name__, static_folder=jp("build", "static"), template_folder="build"
)


@app.route("/")
def root():
    return flask.render_template("index.html")


@app.route("/api/v1/get")
def get():
    try:
        with open(jp(DATA_DIR, DATA_BASENAME) + ".json") as fp:
            data = json.load(fp)
    except IOError:
        data = dict(current_entry=None, done=[], dont=[], kvs=dict(), todo=[])
    data = _update_data_version(data)
    return flask.json.jsonify(data)


@app.route("/api/v1/post", methods=["POST"])
def post():
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


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0")
