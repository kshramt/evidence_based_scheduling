import * as Idb from "idb";
import { ApiClient } from "./api_v1_grpc/Api_v1ServiceClientPb";
import * as Pb from "./api_v1_grpc/api_v1_pb";

export const db = Idb.openDB<{ auth: { id_token: null | TIdToken } }>(
  "auth",
  1,
  {
    upgrade: (db) => {
      db.createObjectStore("auth");
    },
  },
);

export type TIdToken = {
  user_id: string;
};

export class Auth {
  id_token: null | TIdToken;
  _client: ApiClient;
  _on_change_hooks: Set<(id_token: null | TIdToken) => void>;

  constructor() {
    this._on_change_hooks = new Set();
    this._client = new ApiClient(window.location.origin);
    this.id_token = null;
    db.then((db) => {
      db.get("auth", "id_token").then((id_token) => {
        if (id_token !== undefined) {
          this._set_id_token(id_token);
        }
      });
    });
  }

  sign_up = async (name: string) => {
    if (this.id_token) {
      await this.sign_out();
    }
    const req = new Pb.FakeIdpCreateUserReq();
    req.setName(name);
    const token = (await this._client.fakeIdpCreateUser(req, null)).toObject();
    if (token.userId === undefined) {
      throw new Error("Failed to create user");
    }
    const id_token = { user_id: token.userId };
    this._set_id_token(id_token);
    return id_token;
  };
  sign_in = async (name: string) => {
    if (this.id_token) {
      await this.sign_out();
    }
    const req = new Pb.FakeIdpGetIdTokenReq();
    req.setName(name);
    const token = (await this._client.fakeIdpGetIdToken(req, null)).toObject();
    if (token.userId === undefined) {
      throw new Error("Failed to get an ID token");
    }
    const id_token = { user_id: token.userId };
    this._set_id_token(id_token);
    return id_token;
  };
  sign_out = async () => {
    await this._set_id_token(null);
    await this._invoke_hooks();
  };
  on_change = (hook: (id_token: null | TIdToken) => void) => {
    this._on_change_hooks.add(hook);
    _run_hooks(hook, this.id_token);
    return () => {
      this._on_change_hooks.delete(hook);
    };
  };
  _set_id_token = async (id_token: null | TIdToken) => {
    this.id_token = id_token;
    await _save_id_token(this.id_token);
    this._invoke_hooks();
  };
  _invoke_hooks = () => {
    this._on_change_hooks.forEach((hook) => {
      _run_hooks(hook, this.id_token);
    });
  };
}

export const get_auth = () => {
  return new Auth();
};

const _save_id_token = async (id_token: null | TIdToken) => {
  return await (await db).put("auth", id_token, "id_token");
};

const _run_hooks = (
  hook: (id_token: null | TIdToken) => void,
  id_token: null | TIdToken,
) => {
  try {
    hook(id_token);
  } catch (err: unknown) {
    console.error(JSON.stringify(err));
  }
};
