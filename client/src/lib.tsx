import * as Jotai from "jotai";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import "@fontsource/material-icons";
import { HTML5Backend } from "react-dnd-html5-backend";
import * as Dnd from "react-dnd";
import * as Mt from "@mantine/core";

import * as consts from "src/consts";
import * as retryers from "src/retryers";
import * as states from "./states";
import * as toast from "./toast";
import "./lib.css";
import * as utils from "./utils";
import * as components from "./components";
import * as Auth from "./auth";

const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

const App = (props: {
  ctx: states.PersistentStateManager;
  logOut: () => void;
}) => {
  const [isShowMobileSelected, setIsShowMobileSelected] = React.useState(false);

  const show_mobile = Jotai.useAtomValue(
    states.show_mobile_atom_map.get(
      React.useContext(states.session_key_context),
    ),
  );
  const [showMobileUpdatedAt, setShowMobileUpdatedAt] = Jotai.useAtom(
    states.showMobileUpdatedAtAtomMap.get(
      React.useContext(states.session_key_context),
    ),
  );
  const handleClick = () => {
    setShowMobileUpdatedAt(-Date.now());
    setIsShowMobileSelected(true);
  };
  if (!isShowMobileSelected && Date.now() < showMobileUpdatedAt + TWO_DAYS) {
    return (
      <>
        <button className="btn-icon" onClick={handleClick}>
          Continue
        </button>
        with the current setting. Or select:
        <components.ToggleShowMobileButton />
      </>
    );
  }

  return (
    <>
      {toast.component}
      {show_mobile ? (
        <components.MobileApp ctx={props.ctx} logOut={props.logOut} />
      ) : (
        <components.DesktopApp ctx={props.ctx} logOut={props.logOut} />
      )}
    </>
  );
};

const Center = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex justify-center h-[100vh] w-full items-center">
      {children}
    </div>
  );
};

const error_element = (
  <Center>
    <span>
      An error occured while loading the page.{" "}
      <a href=".">Please reload the page.</a>
    </span>
  </Center>
);

const spinner = <Center>{consts.SPINNER}</Center>;

const AuthComponent = ({
  logIn,
  sign_up,
}: {
  logIn: typeof Auth.Auth.prototype.logIn;
  sign_up: typeof Auth.Auth.prototype.sign_up;
}) => {
  const [err, set_err] = React.useState("");
  const [logInLoading, setLogInLoading] = React.useState(false);
  const onLogIn = async () => {
    const el = document.getElementById(
      "log-in-name",
    ) as null | HTMLInputElement;
    if (el === null) {
      return;
    }
    if (el.value === "") {
      return;
    }
    setLogInLoading(true);
    try {
      await logIn(el.value);
      set_err("");
      el.value = "";
    } catch (err: unknown) {
      set_err(`${err}`);
      console.error(err);
    } finally {
      setLogInLoading(false);
    }
  };

  const [sign_up_loading, set_sign_up_loading] = React.useState(false);
  const on_sign_up = async () => {
    const el = document.getElementById(
      "sign-up-name",
    ) as null | HTMLInputElement;
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
  };
  return (
    <Center>
      <div className="flex flex-col item-center gap-y-[1em]">
        <div className="flex flex-col items-center gap-y-[0.25em]">
          <div>
            <label htmlFor="log-in-name" className="block">
              Name
            </label>
            <input id="log-in-name" type="text" />
          </div>
          <div>
            <button
              className="btn-icon"
              onClick={onLogIn}
              onDoubleClick={utils.prevent_propagation}
              disabled={logInLoading}
            >
              Log in
            </button>
          </div>
        </div>
        <span className="text-center">OR</span>
        <div className="flex flex-col items-center gap-y-[0.25em]">
          <div>
            <label htmlFor="log-in-name" className="block">
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
              Sign up
            </button>
          </div>
        </div>
        <div className="text-red-500">{err}</div>
      </div>
    </Center>
  );
};

const AppComponentImpl = (props: {
  ctx: states.PersistentStateManager;
  store: Awaited<ReturnType<states.PersistentStateManager["get_redux_store"]>>;
  auth: Auth.Auth;
}) => {
  // Check for update on focus.
  React.useEffect(() => {
    let awaited = false;
    const handle_focus = async () => {
      if (awaited) {
        return;
      }
      if (document.hidden) {
        return;
      }
      try {
        awaited = true;
        await retryers.get_online_promise();
        await props.ctx.check_remote_head();
      } finally {
        awaited = false;
      }
    };

    window.addEventListener("focus", handle_focus);
    window.addEventListener("visibilitychange", handle_focus);

    // Check for update on load.
    void handle_focus();

    return () => {
      window.removeEventListener("focus", handle_focus);
      window.removeEventListener("visibilitychange", handle_focus);
    };
  }, [props.ctx]);
  return (
    <states.session_key_context.Provider value={props.ctx.session_key}>
      <states.idbContext.Provider value={props.ctx.db}>
        <Provider store={props.store}>
          <Mt.ColorSchemeScript defaultColorScheme="auto" />
          <Mt.MantineProvider defaultColorScheme="auto">
            <App ctx={props.ctx} logOut={props.auth.logOut} />
            <props.ctx.Component />
          </Mt.MantineProvider>
        </Provider>
      </states.idbContext.Provider>
    </states.session_key_context.Provider>
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

  static getDerivedStateFromError(_: unknown) {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return error_element;
    }

    return this.props.children;
  }
}

const AppComponent = (props: {
  ctx: states.PersistentStateManager;
  store: Awaited<ReturnType<states.PersistentStateManager["get_redux_store"]>>;
  auth: Auth.Auth;
}) => {
  return (
    <Dnd.DndProvider backend={HTML5Backend}>
      <ErrorBoundary>
        <React.Suspense fallback={spinner}>
          <AppComponentImpl
            ctx={props.ctx}
            store={props.store}
            auth={props.auth}
          />
        </React.Suspense>
      </ErrorBoundary>
    </Dnd.DndProvider>
  );
};

export const main = async () => {
  const container = document.getElementById("root");
  if (container === null) {
    throw new Error("Must not happen: container is null.");
  }
  const root = ReactDOM.createRoot(container);
  const renderWithStrictMode = (c: React.ReactNode) => {
    root.render(<React.StrictMode>{c}</React.StrictMode>);
  };

  try {
    // Check for the availability of the persistent storage.
    renderWithStrictMode(
      <Center>
        <span>Check for availability of the persistent storage.</span>
      </Center>,
    );
    if (!(await navigator?.storage?.persist())) {
      await new Promise((resolve) => {
        renderWithStrictMode(
          <>
            <Center>
              <div className="text-center">
                <div>Persistent storage is not available.</div>
                <div>
                  <button onClick={resolve} id="skip-persistent-storage-check">
                    Force to continue
                  </button>
                </div>
              </div>
            </Center>
          </>,
        );
      });
    }

    renderWithStrictMode(spinner);
    const auth = new Auth.Auth();
    await auth.loading;
    while (true) {
      if (auth.id_token === null) {
        renderWithStrictMode(
          <AuthComponent logIn={auth.logIn} sign_up={auth.sign_up} />,
        );
        await auth.waitForAuthentication();
      }

      renderWithStrictMode(spinner);
      if (auth.id_token) {
        const persistentStateManager = await states.getPersistentStateManager(
          auth.id_token,
          auth,
        );
        const reduxStore = await persistentStateManager.reduxStore;
        renderWithStrictMode(
          <AppComponent
            ctx={persistentStateManager}
            store={reduxStore}
            auth={auth}
          />,
        );
        await auth.waitForUnAuthentication();
      }
    }
  } catch (e) {
    console.error(e);
    renderWithStrictMode(error_element);
  }
};
