const CACHE = "preset-ia-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://cdn.tailwindcss.com"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Appels API Gemini : jamais touchés
  if (url.hostname.includes("generativelanguage.googleapis.com")) return;

  // PAGE / NAVIGATION → RÉSEAU D'ABORD (toujours la dernière version déployée)
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Reste (CSS, CDN…) → cache d'abord
  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request)
        .then((res) => {
          if (res.ok && (url.origin === location.origin || url.hostname.includes("tailwindcss.com"))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached)
    )
  );
});
