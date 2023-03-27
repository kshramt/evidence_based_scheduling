/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available Workbox modules, or add any other
// code you'd like.
// You can also remove this file if you'd prefer not to use a
// service worker, and the Workbox build step will be skipped.

import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { setDefaultHandler } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

// Precache all of the assets generated by your build process.
// Their URLs are injected into the manifest variable below.
// This variable must be present somewhere in your service worker file,
// even if you decide not to use precaching. See https://cra.link/PWA
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const CACHE_NAME = "app";

const network_first = new NetworkFirst({
  cacheName: CACHE_NAME,
  networkTimeoutSeconds: 5,
});
setDefaultHandler(network_first);

// This allows the web app to trigger skipWaiting via
// registration.waiting.postMessage({type: 'SKIP_WAITING'})
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  const base = new URL(".", self.location.toString()).pathname;
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([`${base}index.html`, base]);
    }),
  );
});

clientsClaim();
