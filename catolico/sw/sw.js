/*
 * Service worker do Lumen: faz o app funcionar sem internet.
 * Este é um modelo; scripts/build-sw.mjs gera dist/sw.js trocando __VERSION__ e __PRECACHE__.
 *
 * Estratégias:
 *   - App (HTML, JS, CSS, ícones): guardados na instalação. A página principal tenta a rede
 *     primeiro (para pegar atualizações) e cai no que está guardado se não houver internet.
 *   - Bíblia (biblia/blivre/*.json): guardada livro a livro na primeira leitura, num cache
 *     separado que não é apagado quando o app atualiza.
 *   - Fontes do Google: usa a cópia guardada e atualiza em segundo plano.
 */
const VERSION = "__VERSION__";
const APP_CACHE = `lumen-app-${VERSION}`;
const BIBLE_CACHE = "lumen-biblia-v1";
const FONT_CACHE = "lumen-fontes-v1";
const PRECACHE = __PRECACHE__;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keep = new Set([APP_CACHE, BIBLE_CACHE, FONT_CACHE]);
    for (const key of await caches.keys()) if (key.startsWith("lumen-") && !keep.has(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request)) || (await cache.match("./")) || (await cache.match("index.html")) || Response.error();
  }
}

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const update = fetch(request).then(res => { if (res.ok || res.type === "opaque") cache.put(request, res.clone()); return res; }).catch(() => hit);
  return hit || update;
}

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(FONT_CACHE, request));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") { event.respondWith(networkFirst(request)); return; }
  if (url.pathname.includes("/biblia/")) { event.respondWith(cacheFirst(BIBLE_CACHE, request)); return; }
  event.respondWith(cacheFirst(APP_CACHE, request));
});

// Permite ao app ativar uma versão nova assim que ela estiver pronta.
self.addEventListener("message", event => {
  if (event.data && event.data.type === "lumen:skip-waiting") self.skipWaiting();
});
