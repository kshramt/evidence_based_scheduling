import * as Idb from "idb";
import createClient from "openapi-fetch";
import * as v2 from "src/gen/api/v2";
import * as utils from "src/utils";

type TClientV2 = ReturnType<typeof createClient<v2.paths>>;

const db = Idb.openDB<{ auth: { key: "id_token"; value: null | TIdToken } }>(
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
  loading: Promise<void>;
  #client: TClientV2;
  #on_change_hooks: Set<(id_token: null | TIdToken) => void>;

  constructor() {
    this.#on_change_hooks = new Set();
    this.#client = createClient<v2.paths>({ baseUrl: `${window.location.origin}/api/v2` });
    this.id_token = null;
    this.loading = db
      .then((db_) => {
        return db_.get("auth", "id_token");
      })
      .then((id_token) => {
        if (id_token !== undefined) {
          void this._set_id_token(id_token);
        }
      });
  }
  sign_up = async (name: string) => {
    if (this.id_token) {
      await this.logOut();
    }
    const fake_idp_resp = await this.#client.POST("/fake_idp/users", {
      body: { name },
    });
    if (fake_idp_resp.data === undefined) {
      throw new Error(JSON.stringify(fake_idp_resp.error));
    }
    const resp = await this.#client.POST("/users", {
      body: {},
      headers: { authorization: utils.get_bearer(fake_idp_resp.data.id_token) },
    });
    if (resp.data === undefined) {
      throw new Error(JSON.stringify(resp.error));
    }
    void this._set_id_token(fake_idp_resp.data.id_token);
    return fake_idp_resp.data.id_token;
  };
  logIn = async (name: string) => {
    await this.loading;
    if (this.id_token) {
      return;
    }
    const resp = await this.#client.POST("/fake_idp/login/id_token", {
      body: { name },
    });
    if (resp.data === undefined) {
      throw new Error(JSON.stringify(resp.error));
    }
    void this._set_id_token(resp.data.id_token);
    return resp.data.id_token;
  };
  logOut = async () => {
    await this._set_id_token(null);
  };
  on_change = (hook: (id_token: null | TIdToken) => void) => {
    this.#on_change_hooks.add(hook);
    _run_hook(hook, this.id_token);
    return () => {
      this.#on_change_hooks.delete(hook);
    };
  };
  waitForAuthentication = async () => {
    if (this.id_token) {
      return;
    }
    const unregister = await new Promise<() => void>((resolve) => {
      const unregister = this.on_change((id_token) => {
        if (id_token) {
          resolve(unregister);
        }
      });
    });
    unregister();
  };
  waitForUnAuthentication = async () => {
    if (this.id_token === null) {
      return;
    }
    const unregister = await new Promise<() => void>((resolve) => {
      const unregister = this.on_change((id_token) => {
        if (id_token === null) {
          resolve(unregister);
        }
      });
    });
    unregister();
  };
  _set_id_token = async (id_token: null | TIdToken) => {
    this.id_token = id_token;
    await _save_id_token(this.id_token);
    this._invoke_hooks();
  };
  _invoke_hooks = () => {
    this.#on_change_hooks.forEach((hook) => {
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
