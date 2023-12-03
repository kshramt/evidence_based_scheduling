import * as Idb from "idb";
import * as v2 from "src/gen/api/v2";
import * as utils from "src/utils";

type TClientV2 = ReturnType<typeof v2.createApiClient>;

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
    this.#client = v2.createApiClient(`${window.location.origin}/api/v2`);
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
    const fake_idp_resp = await this.#client.postFake_idpusers({ name });
    await this.#client.postUsers(
      {},
      { headers: { authorization: utils.get_bearer(fake_idp_resp.id_token) } },
    );
    void this._set_id_token(fake_idp_resp.id_token);
    return fake_idp_resp.id_token;
  };
  logIn = async (name: string) => {
    await this.loading;
    if (this.id_token) {
      return;
    }
    const resp = await this.#client.postFake_idploginid_token({ name });
    void this._set_id_token(resp.id_token);
    return resp.id_token;
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
