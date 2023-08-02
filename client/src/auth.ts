import * as Idb from "idb";
import * as Connect from "@bufbuild/connect";
import { createGrpcWebTransport } from "@bufbuild/connect-web";
import * as C from "./gen/api/v1/api_connect";

const db = Idb.openDB<{ auth: { id_token: null | TIdToken } }>("auth", 1, {
  upgrade: (db) => {
    db.createObjectStore("auth");
  },
});

export type TIdToken = {
  user_id: string;
};

export class Auth {
  id_token: null | TIdToken;
  _client: Connect.PromiseClient<typeof C.ApiService>;
  _on_change_hooks: Set<(id_token: null | TIdToken) => void>;

  constructor() {
    this._on_change_hooks = new Set();
    this._client = Connect.createPromiseClient(
      C.ApiService,
      createGrpcWebTransport({ baseUrl: window.location.origin }),
    );
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
      await this.logOut();
    }
    const resp = await this._client.fakeIdpCreateUser({ name });
    if (resp.token === undefined) {
      throw new Error("`token` is not set");
    }
    if (resp.token.userId === undefined) {
      throw new Error("`userId` is not set");
    }
    const id_token = { user_id: resp.token.userId };
    this._set_id_token(id_token);
    return id_token;
  };
  logIn = async (name: string) => {
    if (this.id_token) {
      await this.logOut();
    }
    const resp = await this._client.fakeIdpGetIdToken({ name });
    if (resp.token === undefined) {
      throw new Error("`token` is not set");
    }
    if (resp.token.userId === undefined) {
      throw new Error("Failed to get an ID token");
    }
    const id_token = { user_id: resp.token.userId };
    this._set_id_token(id_token);
    return id_token;
  };
  logOut = async () => {
    await this._set_id_token(null);
  };
  on_change = (hook: (id_token: null | TIdToken) => void) => {
    this._on_change_hooks.add(hook);
    _run_hook(hook, this.id_token);
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
      _run_hook(hook, this.id_token);
    });
  };
}

const _save_id_token = async (id_token: null | TIdToken) => {
  return await (await db).put("auth", id_token, "id_token");
};

const _run_hook = (
  hook: (id_token: null | TIdToken) => void,
  id_token: null | TIdToken,
) => {
  try {
    hook(id_token);
  } catch (err: unknown) {
    console.error(JSON.stringify(err));
  }
};
