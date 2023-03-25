import { main } from "./lib";

import { registerSW } from "virtual:pwa-register";

const interval = 86400 * 1000;

registerSW({
  onNeedRefresh: () => {},
  onOfflineReady: () => {},
  // https://vite-pwa-org.netlify.app/guide/periodic-sw-updates.html
  onRegisteredSW: (swUrl: string, r: undefined | ServiceWorkerRegistration) => {
    r &&
      setInterval(async () => {
        if (!(!r.installing && navigator)) return;

        if ("connection" in navigator && !navigator.onLine) return;

        const resp = await fetch(swUrl, {
          cache: "no-store",
          headers: {
            cache: "no-store",
            "cache-control": "no-cache",
          },
        });

        if (resp?.status === 200) await r.update();
      }, interval);
  },
});

main();
