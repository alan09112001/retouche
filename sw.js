const CACHE = "preset-ia-v1";
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

// Activation : nettoie les anciens caches
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

  // On ne touche pas aux requêtes non-GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Les appels à l'API Gemini ne sont JAMAIS mis en cache (network only)
  if (url.hostname.includes("generativelanguage.googleapis.com")) {
    return; // laisse le navigateur gérer normalement
  }

  // Coque de l'app : cache d'abord, réseau en repli
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          // Met en cache les réponses valides de même origine + Tailwind
          if (res.ok && (url.origin === location.origin || url.hostname.includes("tailwindcss.com"))) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached); // hors-ligne : renvoie ce qu'on a, sinon échec
    })
  );
});
