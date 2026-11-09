/* Planeta 4 Patas · service worker
   Red primero (siempre la versión más nueva); si no hay conexión, usa la copia guardada.
   Solo guarda archivos del propio sitio; nunca datos de Supabase ni pagos. */
const CACHE = "p4p-v1";
const SHELL = ["./", "index.html", "admin.html", "assets/styles.css", "assets/admin.css", "assets/app.js", "assets/config.js", "assets/logo.jpg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: req.mode === "navigate" }).then((r) => r || (req.mode === "navigate" ? caches.match("index.html") : undefined)))
  );
});
