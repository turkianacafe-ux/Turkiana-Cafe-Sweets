const VER         = 'v5';
const SHELL_CACHE = 'turkiana-shell-'  + VER;
const IMG_CACHE   = 'turkiana-images-' + VER;
const FONT_CACHE  = 'turkiana-fonts-'  + VER;
const NET_CACHE   = 'turkiana-net-'    + VER;
const ALL_CACHES  = [SHELL_CACHE, IMG_CACHE, FONT_CACHE, NET_CACHE];

// Base path derived from service worker location
const SW_URL  = self.location.href;
const BASE    = SW_URL.substring(0, SW_URL.lastIndexOf('/') + 1);

// Core shell files (must succeed)
const SHELL_URLS = [
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
  BASE + 'icon.svg'
];

// All images (best‑effort)
const IMG_FILES = [
  'Turkishcoffee.jpg','Ottomanmastica.jpg','Ottomanhazelnut.jpg',
  'Ottomancardamom.jpg','Sahlep.jpg','Arabic.jpg','Arabiccup.jpeg',
  'Tea.jpg','Turkishteapot.jpeg','Appletea.jpg','Mulberrytea.jpg',
  'Lemontea.jpg','Romantea.jpg','Matcha.webp','Appletea.avif',
  'Blackmulberrytea.png','Pomegranatetea.avif','Hibiscus.webp',
  'Hibiscustea.webp','Wintertea.webp','Chamomiletea.webp','Greentea.jpg',
  'Latteart.webp','Art.webp','Flatwhite.webp','Espresso.webp',
  'Americano.webp','Hotchocolate.jfif','V60.webp','Drip.jpg',
  'Coldbrew.webp','Lemonade.jpg','Orange.jpeg','Earl.jpeg',
  'Blueberrymojito.webp','Mixberriesmojito.webp','WaterBig.jpg',
  'Sparkling.jpg','Cola.jpg','Mix.jpeg','Carrot.jpeg',
  'Carroticecream.jpeg','TrioBaklava.jpeg','Fanzuella.webp',
  'Darkchocolateopera.jpeg','Darkforestopera.jpeg',
  'Chocolatemousseopera.jpeg','Redvelvetopera.jpeg',
  'Cheesecakeopera.jpeg','Kunafa.jpeg','Brown.jpg','Tiramisu.jpg',
  'Sebastian.jpg','Chocolatenew.jpeg','Pistachionew.jpeg',
  'Snickernew.jpeg','Icecream.webp','Nuts.jpg','Nutsmall.jpg',
  'Patatas.jpg','Plain.webp','Cheese.jpg','Chocolatecroissant.jpg',
  'Almondcroissant.jpg','Cinnamon.jpg'
].map(f => BASE + f);

// ----- Install: cache shell and best‑effort images -----
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const sc = await caches.open(SHELL_CACHE);
    await sc.addAll(SHELL_URLS);
    const ic = await caches.open(IMG_CACHE);
    await Promise.allSettled(IMG_FILES.map(url => ic.add(url).catch(() => {})));
    await self.skipWaiting();
    console.log('[SW] Installed ' + VER);
  })());
});

// ----- Activate: remove old caches -----
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !ALL_CACHES.includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
    console.log('[SW] Active ' + VER);
  })());
});

// ----- Fetch: apply strategies -----
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts -> cache‑first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    return event.respondWith(cacheFirst(req, FONT_CACHE));
  }
  // QRCode CDN -> network‑first
  if (url.hostname === 'cdnjs.cloudflare.com') {
    return event.respondWith(networkFirst(req, NET_CACHE));
  }
  // Only handle same‑origin requests
  if (url.origin !== self.location.origin) return;

  // HTML (document) -> cache‑first with offline fallback
  if (req.destination === 'document') {
    return event.respondWith(cacheFirst(req, SHELL_CACHE, offlinePage));
  }
  // Manifest & icons -> cache‑first
  if (url.pathname.endsWith('manifest.json') || /\.(png|svg)$/.test(url.pathname)) {
    return event.respondWith(cacheFirst(req, SHELL_CACHE));
  }
  // Images -> stale‑while‑revalidate
  if (req.destination === 'image' || /\.(jpe?g|png|gif|webp|avif|svg|ico|jfif)$/i.test(url.pathname)) {
    return event.respondWith(staleWhileRevalidate(req, IMG_CACHE));
  }
  // Everything else -> network‑first
  event.respondWith(networkFirst(req, NET_CACHE));
});

// ----- Helper strategies -----
async function cacheFirst(req, name, fallback) {
  const cache = await caches.open(name);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    return fallback ? fallback() : new Response('Offline', { status: 503 });
  }
}

async function networkFirst(req, name, fallback) {
  const cache = await caches.open(name);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    return fallback ? fallback() : new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(req, name) {
  const cache = await caches.open(name);
  const cached = await cache.match(req);
  const fresh = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  }).catch(() => null);
  return cached || (await fresh) || new Response('', { status: 404 });
}

async function offlinePage() {
  const cache = await caches.open(SHELL_CACHE);
  return (await cache.match(BASE + 'index.html')) ||
    new Response(
      '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width">' +
      '<title>Turkiana — Offline</title>' +
      '<style>body{background:#080604;color:#c9a96e;font-family:Georgia,serif;' +
      'display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}' +
      'h1{font-size:2rem;font-weight:300;letter-spacing:.1em}</style></head>' +
      '<body><div><h1>Turkiana</h1><p>You are offline. Please check your connection.</p></div></body></html>',
      { headers: { 'Content-Type': 'text/html;charset=utf-8' } }
    );
}
