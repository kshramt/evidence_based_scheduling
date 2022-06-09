import datetime
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
        return _update_data_version(_v5_of_v4(data))
    elif data["version"] == 5:
        return _update_data_version(_v6_of_v5(data))
    elif data["version"] == 6:
        return _update_data_version(_v7_of_v6(data))
    elif data["version"] == 7:
        return _update_data_version(_v8_of_v7(data))
    elif data["version"] == 8:
        return _update_data_version(_v9_of_v8(data))
    elif data["version"] == 9:
        return _update_data_version(_v10_of_v9(data))
    elif data["version"] == 10:
        return _v11_of_v10(data)
    elif data["version"] == 11:
        return data
    else:
        raise Err(f"Unsupported data version: {data.get('version', 'None')}")


def _v11_of_v10(data):
    for k, v in data["kvs"].items():
        if "show_detail" in v:
            del v["show_detail"]
    data["version"] = 11
    return data


def _v10_of_v9(data):
    for k, v in data["kvs"].items():
        v["children"] = v["todo"] + v["done"] + v["dont"]
        del v["todo"]
        del v["done"]
        del v["dont"]
    data["version"] = 10
    return data


def _v9_of_v8(data):
    edges = dict()
    for v in data["kvs"].values():
        v["parents"] = []
    for k, v in data["kvs"].items():
        for br in ("todo", "done", "dont"):
            brs = []
            for ck in v[br]:
                data["id_seq"] += 1
                edge_id = _base36(data["id_seq"])
                edges[edge_id] = dict(p=k, c=ck, t="strong")
                brs.append(edge_id)
                data["kvs"][ck]["parents"].append(edge_id)
            v[br] = brs
    data["edges"] = edges
    data["version"] = 9
    return data


def _v8_of_v7(data):
    tid_of_sid = dict()
    sid_of_tid = dict()
    kmax = 0
    for k, v in enumerate(sorted(data["kvs"].keys())):
        k += 1
        kmax = k
        sid = _base36(k)
        tid_of_sid[sid] = v
        sid_of_tid[v] = sid
    data["kvs"] = {sid_of_tid[k]: v for k, v in data["kvs"].items()}
    for br in ("todo", "done", "dont", "parents"):
        for v in data["kvs"].values():
            v[br] = [sid_of_tid[k] for k in v[br]]
    data["queue"] = [sid_of_tid[k] for k in data["queue"]]
    data["root"] = sid_of_tid[data["root"]]
    data["id_seq"] = kmax
    data["version"] = 8
    return data


def _v7_of_v6(data):
    del data["selected_node_id"]
    for k, v in data["kvs"].items():
        v["show_children"] = False

        if v["parent"] is None:
            v["parents"] = []
        else:
            v["parents"] = [v["parent"]]
        del v["parent"]
    data["version"] = 7
    return data


def _v6_of_v5(data):
    data["selected_node_id"] = data["root"]
    data["version"] = 6
    return data


def _v5_of_v4(data):
    for k, v in data["kvs"].items():
        v["style"] = dict(width=v["width"], height=v["height"])
        del v["width"], v["height"]
    data["version"] = 5
    return data


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


def _base36(x: int):
    cs = "0123456789abcdefghijklmnopqrstuvwxyz"
    assert len(cs) == 36
    assert 0 <= x
    res = ""
    if x < 36:
        return cs[x]
    while 0 < x:
        x, i = divmod(x, 36)
        res = cs[i] + res
    return res


assert _base36(0) == "0"
assert _base36(1) == "1"
assert _base36(34) == "y"
assert _base36(35) == "z"
assert _base36(36) == "10"
assert _base36(92384123) == "1j041n"

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
        with open(jp(DATA_DIR, DATA_BASENAME) + ".json") as fp:
            data = json.load(fp)
        data = _remove_tail_none_v1(data)
        data = _update_data_version(data)
        data = _join_text_v1(data)
        data = _parse_datetime_v1(data)
    except IOError:
        data = None
    res = flask.make_response(flask.json.jsonify(data))
    res.headers["Cache-Control"] = "no-store"
    return res


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
        "parent": None,
        "ranges": [],
        "show_detail": False,
        "start_time": t,
        "status": "todo",  # done | dont | todo
        "style": dict(width="49ex", height="3ex"),
        "text": [""],
        "todo": [],
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
