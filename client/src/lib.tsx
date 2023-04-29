import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import * as Recoil from "recoil";
import "@fontsource/material-icons";
import { HTML5Backend } from "react-dnd-html5-backend";
import * as Dnd from "react-dnd";

import * as states from "./states";
import * as toast from "./toast";
import "./lib.css";
import * as utils from "./utils";
import * as components from "./components";
import * as Auth from "./auth";

const App = React.memo((props: { ctx: states.PersistentStateManager }) => {
  const show_mobile = Recoil.useRecoilValue(
    states.show_mobile_atom_map.get(
      React.useContext(states.session_key_context),
    ),
  );

  return (
    <>
      {show_mobile ? (
        <components.MobileApp ctx={props.ctx} />
      ) : (
        <components.DesktopApp ctx={props.ctx} />
      )}
      {toast.component}
    </>
  );
});

const Center = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex justify-center h-[100vh] w-full items-center">
      {children}
    </div>
  );
};

const error_element = (
  <Center>
    {" "}
    <span>
      An error occured while loading the page.{" "}
      <a href=".">Please reload the page.</a>
    </span>
  </Center>
);

const spinner = (
  <Center>
    <div className="animate-spin h-[3rem] w-[3rem] border-4 border-blue-500 rounded-full border-t-transparent"></div>
  </Center>
);

const AuthComponent = ({
  sign_in,
  sign_up,
}: {
  sign_in: typeof Auth.Auth.prototype.sign_in;
  sign_up: typeof Auth.Auth.prototype.sign_up;
}) => {
  const [err, set_err] = React.useState("");
  const [sign_in_loading, set_sign_in_loading] = React.useState(false);
  const on_sign_in = React.useCallback(async () => {
    const el = document.getElementById("sign-in-name") as HTMLInputElement;
    if (el === null) {
      return;
    }
    if (el.value === "") {
      return;
    }
    set_sign_in_loading(true);
    try {
      await sign_in(el.value);
      set_err("");
      el.value = "";
    } catch (err: unknown) {
      set_err(`${err}`);
      console.error(err);
    } finally {
      set_sign_in_loading(false);
    }
  }, [set_sign_in_loading, sign_in]);

  const [sign_up_loading, set_sign_up_loading] = React.useState(false);
  const on_sign_up = React.useCallback(async () => {
    const el = document.getElementById("sign-up-name") as HTMLInputElement;
    if (el === null) {
      return;
    }
    if (el.value === "") {
      return;
    }
    set_sign_up_loading(true);
    try {
      await sign_up(el.value);
      set_err("");
      el.value = "";
    } catch (err: unknown) {
      set_err(`${err}`);
      console.error(err);
    } finally {
      set_sign_up_loading(false);
    }
  }, [set_sign_up_loading, sign_up]);
  return (
    <Center>
      <div className="flex flex-col item-center gap-y-[1em]">
        <div className="flex flex-col items-center gap-y-[0.25em]">
          <div>
            <label htmlFor="sign-in-name" className="block">
              Name
            </label>
            <input id="sign-in-name" type="text" />
          </div>
          <div>
            <button
              className="btn-icon"
              onClick={on_sign_in}
              onDoubleClick={utils.prevent_propagation}
              disabled={sign_in_loading}
            >
              Sign-in
            </button>
          </div>
        </div>
        <span className="text-center">OR</span>
        <div className="flex flex-col items-center gap-y-[0.25em]">
          <div>
            <label htmlFor="sign-in-name" className="block">
              Name
            </label>
            <input id="sign-up-name" type="text" />
          </div>
          <div>
            <button
              className="btn-icon"
              onClick={on_sign_up}
              onDoubleClick={utils.prevent_propagation}
              disabled={sign_up_loading}
            >
              Sign-up
            </button>
          </div>
        </div>
        <div className="text-red-500">{err}</div>
      </div>
    </Center>
  );
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return error_element;
    }
    return this.props.children;
  }
}

const AppComponentImpl = (props: {
  ctx: states.Loadable<states.PersistentStateManager>;
}) => {
  const ctx = props.ctx.get();
  const store = ctx.redux_store.get();
  ctx.useCheckUpdates();
  return (
    <states.session_key_context.Provider value={ctx.session_key}>
      <Provider store={store}>
        <App ctx={ctx} />
        <ctx.Component />
      </Provider>
    </states.session_key_context.Provider>
  );
};

const AppComponent = (props: { auth: Auth.Auth; id_token: Auth.TIdToken }) => {
  const ctx = React.useMemo(() => {
    return new states.Loadable(
      states.get_PersistentStateManager(props.id_token, props.auth),
    );
  }, [props.id_token, props.auth]);
  return (
    <Dnd.DndProvider backend={HTML5Backend}>
      <Recoil.RecoilRoot>
        <ErrorBoundary>
          <React.Suspense fallback={spinner}>
            <AppComponentImpl ctx={ctx} />
          </React.Suspense>
        </ErrorBoundary>
      </Recoil.RecoilRoot>
    </Dnd.DndProvider>
  );
};

const AppOrAuth = () => {
  const auth = React.useMemo(() => {
    const res = new Auth.Auth();
    return res;
  }, []);
  const [id_token, set_id_token] = React.useState<
    undefined | null | Auth.TIdToken
  >(undefined);
  React.useEffect(() => {
    return auth.on_change(set_id_token);
  }, [auth, set_id_token]);
  if (id_token === undefined) {
    return spinner;
  }
  if (id_token === null) {
    return <AuthComponent sign_in={auth.sign_in} sign_up={auth.sign_up} />;
  }
  return <AppComponent auth={auth} id_token={id_token} />;
};

export const main = async () => {
  const container = document.getElementById("root");
  const root = ReactDOM.createRoot(container!);
  root.render(
    <React.StrictMode>
      <Center>
        <span>Check for availability of the persistent storage.</span>
      </Center>
    </React.StrictMode>,
  );
  const render = () => {
    root.render(
      <React.StrictMode>
        <AppOrAuth />
      </React.StrictMode>,
    );
  };
  if (!(await navigator?.storage?.persist())) {
    root.render(
      <React.StrictMode>
        <Center>
          <span>Persistent storage is not available.</span>
        </Center>
        <button
          onClick={render}
          className="hidden"
          id="skip-persistent-storage-check"
        />
      </React.StrictMode>,
    );
    return;
  }

  render();
  return;
};
