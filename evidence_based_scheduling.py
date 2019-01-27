import datetime
import json

import flask


DATA_BASENAME = "evidence_based_scheduling"


with open(DATA_BASENAME + ".json") as fp:
    DATA = json.load(fp)


app = flask.Flask(__name__)


@app.route("/api/v1/get")
def get():
    return flask.json.jsonify(DATA)


@app.route("/api/v1/post", methods=["POST"])
def post():
    return save(flask.request.json)


def save(data):
    s = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    time = datetime.datetime.now().isoformat()
    with open(DATA_BASENAME + "_" + time + ".json", "w") as fp:
        fp.write(s)
    with open(DATA_BASENAME + ".json", "w") as fp:
        fp.write(s)
    return time
