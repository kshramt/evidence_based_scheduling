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

NO_ESTIMATION = 0


def _update_data_version(data):
    if "version" not in data:
        return _update_data_version(_v1_of_vnone(data))
    elif data["version"] == 1:
        return _update_data_version(_v2_of_v1(data))
    elif data["version"] == 2:
        return _update_data_version(_v3_of_v2(data))
    elif data["version"] == 3:
        return _update_data_version(_v4_of_v3(data))
    elif data["version"] == 4:
        return data
    else:
        raise Err(f"Unsupported data version: {data.get('version', 'None')}")


def _v4_of_v3(data):
    t = _js_now_v1()
    e = _new_entry_v1(t)
    e["done"] = data["done"]
    e["dont"] = data["dont"]
    e["todo"] = data["todo"]
    del data["done"], data["dont"], data["todo"]
    for k, v in data["kvs"].items():
        v["start_time"] = k
        if v["parent"] is None:
            v["parent"] = t  # The root node
        if v["done_time"]:
            v["end_time"] = v["done_time"]
            v["status"] = "done"
        elif v["dont_time"]:
            v["end_time"] = v["dont_time"]
            v["status"] = "dont"
        else:
            v["end_time"] = None
            v["status"] = "todo"
        done = []
        dont = []
        todo = []
        for ck in v["children"]:
            if data["kvs"][ck]["done_time"]:
                done.append(ck)
            elif data["kvs"][ck]["dont_time"]:
                dont.append(ck)
            else:
                todo.append(ck)
        v["done"] = done
        v["dont"] = dont
        v["todo"] = todo
    for k, v in data["kvs"].items():
        del v["done_time"], v["dont_time"], v["children"]
    data["root"] = t
    data["queue"] = sorted(set(data["kvs"].keys()) - set([data["root"]]))
    data["kvs"][t] = e

    data["version"] = 4
    return data


def _v3_of_v2(data):
    data = _format_datetime_v1(data)
    data["version"] = 3
    return data


def _v2_of_v1(data):
    data = _split_text_v1(data)
    data["version"] = 2
    return data


def _v1_of_vnone(data):
    assert "version" not in data, data
    for v in data["kvs"].values():
        if "width" not in v:
            v["width"] = "49ex"
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
        t = _js_now_v1()
        data = dict(current_entry=None, root=t, kvs=dict(t=_new_entry_v1(t)), version=4)
    data = _remove_tail_none_v1(data)
    data = _update_data_version(data)
    data = _join_text_v1(data)
    data = _parse_datetime_v1(data)
    return flask.json.jsonify(data)


@app.route("/api/v1/post", methods=["POST"])
def post():
    return save(flask.request.json)


def save(data):
    data = _format_datetime_v1(data)
    data = _split_text_v1(data)
    data = _add_tail_none_v1(data)
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


def _new_entry_v1(t: str) -> dict:
    return {
        "done": [],
        "dont": [],
        "end_time": None,
        "estimate": NO_ESTIMATION,
        "height": "3ex",
        "parent": None,
        "ranges": [],
        "start_time": t,
        "status": "todo",  # done | dont | todo
        "text": [""],
        "todo": [],
        "width": "49ex",
    }


def _format_datetime_v1(data):
    for v in data["kvs"].values():
        for r in v["ranges"]:
            for k in ["start", "end"]:
                if r[k] is not None:
                    r[k] = datetime.datetime.fromtimestamp(
                        r[k], datetime.timezone.utc
                    ).isoformat()
    return data


def _parse_datetime_v1(data):
    for v in data["kvs"].values():
        for r in v["ranges"]:
            for k in ["start", "end"]:
                if r[k] is not None:
                    r[k] = datetime.datetime.fromisoformat(r[k]).timestamp()
    return data


def _split_text_v1(data):
    for v in data["kvs"].values():
        v["text"] = v["text"].split("\n")
    return data


def _join_text_v1(data):
    for v in data["kvs"].values():
        v["text"] = "\n".join(v["text"])
    return data


def _add_tail_none_v1(x):
    if isinstance(x, list):
        x = [_add_tail_none_v1(v) for v in x]
        x.append(None)
        return x
    elif isinstance(x, dict):
        return {k: _add_tail_none_v1(v) for k, v in x.items()}
    else:
        return x


def _remove_tail_none_v1(x):
    if isinstance(x, list):
        if x and x[-1] is None:
            x = x[:-1]
        return [_remove_tail_none_v1(v) for v in x]
    elif isinstance(x, dict):
        return {k: _remove_tail_none_v1(v) for k, v in x.items()}
    else:
        return x


def _js_now_v1():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()[:-9] + "Z"


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0")
