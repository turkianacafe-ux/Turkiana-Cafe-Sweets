/* ─────────────────────────────────────────────
   Turkiana Café — Service Worker  v4
   Scope: /Turkiana-Cafe-Sweets/
   ───────────────────────────────────────────── */

const VERSION      = 'v4';
const SHELL_CACHE  = 'turkiana-shell-'  + VERSION;
const IMAGE_CACHE  = 'turkiana-images-' + VERSION;
const FONT_CACHE   = 'turkiana-fonts-'  + VERSION;
const OTHER_CACHE  = 'turkiana-other-'  + VERSION;
const ALL_CACHES   = [SHELL_CACHE, IMAGE_CACHE, FONT_CACHE, OTHER_CACHE];

const BASE = '/Turkiana-Cafe-Sweets/';

/* App shell — must all succeed for install to complete */
const SHELL = [
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'icon.svg'
];

/* Menu images — cached best-effort (failures won't block install) */
const IMAGES = [
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

/* ── INSTALL ─────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    /* 1. Cache shell — must succeed */
    const sc = await caches.open(SHELL_CACHE);
    await sc.addAll(SHELL);

    /* 2. Cache images — tolerate individual failures */
    const ic = await caches.open(IMAGE_CACHE);
    await Promise.allSettled(IMAGES.map(url =>
      ic.add(url).catch(() => { /* silent */ })
    ));

    /* Activate immediately without waiting for old SW to die */
    await self.skipWaiting();
  })());
});

/* ── ACTIVATE ────────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    /* Remove caches from old versions */
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => !ALL_CACHES.includes(k)).map(k => caches.delete(k))
    );
    /* Take control of all open pages immediately */
    await self.clients.claim();
  })());
});

/* ── FETCH ───────────────────────────────── */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Google Fonts → cache-first */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    return event.respondWith(cacheFirst(req, FONT_CACHE));
  }

  /* CDN scripts → network-first */
  if (url.hostname === 'cdnjs.cloudflare.com') {
    return event.respondWith(networkFirst(req, OTHER_CACHE));
  }

  /* Only intercept same-origin and GitHub Pages assets */
  const isSameOrigin = url.origin === self.location.origin;
  const isGHPages    = url.hostname === 'turkianacafe-ux.github.io';
  if (!isSameOrigin && !isGHPages) return;

  /* HTML shell → cache-first with offline fallback */
  if (req.destination === 'document') {
    return event.respondWith(cacheFirst(req, SHELL_CACHE, htmlFallback));
  }

  /* Manifest & icons → cache-first */
  if (url.pathname.endsWith('manifest.json') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.png')) {
    return event.respondWith(cacheFirst(req, SHELL_CACHE));
  }

  /* Images → stale-while-revalidate */
  if (req.destination === 'image' ||
      /\.(jpe?g|png|gif|webp|avif|svg|ico|jfif)$/i.test(url.pathname)) {
    return event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE));
  }

  /* Everything else → network-first */
  event.respondWith(networkFirst(req, OTHER_CACHE));
});

/* ── STRATEGIES ──────────────────────────── */

async function cacheFirst(req, cacheName, fallback) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    if (fallback) return fallback();
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(req, cacheName, fallback) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    if (fallback) return fallback();
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchP = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  }).catch(() => null);
  return cached || await fetchP || new Response('', { status: 404 });
}

async function htmlFallback() {
  const cache = await caches.open(SHELL_CACHE);
  return (await cache.match(BASE + 'index.html')) ||
         new Response('<h1>You are offline</h1>', {
           headers: { 'Content-Type': 'text/html' }
         });
}
