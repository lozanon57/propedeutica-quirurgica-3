// Caché sencilla: la app (textos, figuras y diapositivas) funciona sin conexión una vez abierta; el audio necesita conexión.
const VERSION = "pq3-v3";
const SHELL = ["./", "index.html", "css/app.css", "js/app.js", "js/data.js", "js/store.js", "js/util.js", "js/player.js",
  "js/views/lesson.js", "js/views/quiz.js", "data/t25.json", "data/t27.json", "data/t32.json", "data/t39.json",
  "data/audioguia.json", "icon.svg", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Red primero (contenidos siempre al día) y caché como respaldo.
  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then((res) => {
        if (res.ok && res.status === 200) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => (await caches.match(req, { ignoreSearch: true })) ?? Response.error())
  );
});
