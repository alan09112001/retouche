const CACHE = "preset-ia-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://cdn.tailwindcss.com"
];

// Installation : pré-cache la coque de l'application
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(ASSETS).catch(() => {/* ignore les ressources non joignables */})
    )
  );
  self.skipWaiting();
});

// Activation : nettoie les anciens caches (v1, etc.)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;            // jamais les POST (API Gemini)

  const url = new URL(request.url);

  // Les appels à l'API Gemini ne sont JAMAIS mis en cache
  if (url.hostname.includes("generativelanguage.googleapis.com")) return;

  // Coque de l'app : cache d'abord, réseau en repli
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          if (res.ok && (url.origin === location.origin || url.hostname.includes("tailwindcss.com"))) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
