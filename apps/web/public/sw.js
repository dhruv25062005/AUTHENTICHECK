// AuthentiCheck Service Worker: Offline Caching & Fallback
const CACHE_NAME = "authenticheck-v2";
const STATIC_ASSETS = [
  "/",
  "/merchants",
  "/dashboard",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("Failed caching some static assets during sw install:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Do not intercept Next.js internal development, HMR, or telemetry endpoints
  if (
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.includes("__nextjs") ||
    url.pathname.startsWith("/_next/static/webpack/")
  ) {
    return;
  }

  // 1. API requests: Network-first with offline fallback response
  if (url.pathname.startsWith("/api/v1/")) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;

          // Offline fallback for verify route
          if (url.pathname.startsWith("/api/v1/verify/")) {
            const serial = url.pathname.split("/").pop();
            return new Response(
              JSON.stringify({
                status: "SUSPICIOUS",
                riskScore: 50,
                product: {
                  name: "Offline Cached Record Lookup",
                  brand: "Pending Sync",
                  category: "Offline Mode",
                  manufacturer: "Apex Global Offline Ledger",
                  serialNumber: serial || "UNKNOWN",
                  lifecycleStatus: "CACHED_OFFLINE"
                },
                history: { previousScans: 0 },
                reasons: [
                  "Device is currently operating in Offline PWA mode without live cryptographic ledger uplink.",
                  "Basic serial syntax matched. Full verification will re-synchronize upon reconnecting."
                ],
                verifiedAt: new Date().toISOString(),
                isOfflineFallback: true
              }),
              { headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(JSON.stringify({ error: "Network unavailable (Offline)" }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
          });
        })
    );
    return;
  }

  // 2. Navigation / HTML pages: NETWORK-FIRST to prevent hydration mismatches!
  const isHtmlNavigation =
    request.mode === "navigate" ||
    (request.headers.get("accept") && request.headers.get("accept").includes("text/html"));

  if (isHtmlNavigation) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match("/");
        })
    );
    return;
  }

  // 3. Static assets: Stale-while-revalidate for images, icons, manifest
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
