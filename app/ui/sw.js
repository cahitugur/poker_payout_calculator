// Poker Payout Calculator — Service Worker
// Cache-first for static assets, network-first for HTML pages.

const CACHE_VERSION = "v2";
const CACHE_NAME = `poker-calc-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  "./index.html",
  "./side-pot.html",
  "./styles.css",
  "./manifest.webmanifest",
  "../core/payout_calc.js",
  "../core/sidepot_calc.js",
  "../core/shared-icons.js",
  "../core/shared-data.js",
  "../core/settings.js",
  "../core/settings-store.js",
  "../icons/app_icon.png",
];

// ── Install: pre-cache all static assets ──────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for HTML, cache-first for everything else ─────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip non-http(s) schemes
  if (!url.protocol.startsWith("http")) return;

  const isNavigation = request.mode === "navigate";

  if (isNavigation) {
    // Network-first for HTML pages so users always get fresh content when online
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // Cache-first for all other assets (JS, CSS, images, fonts)
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
  }
});
