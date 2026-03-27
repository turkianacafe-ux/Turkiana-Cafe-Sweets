/* ─────────────────────────────────────────────────────────────
   Turkiana Café — Service Worker  v3
   Strategy:
     • Shell (HTML, manifest, icons) → Cache-first, network fallback
     • Images                        → Cache-first, stale-while-revalidate
     • Fonts (Google Fonts)          → Cache-first, long TTL
     • Everything else               → Network-first, cache fallback
   ───────────────────────────────────────────────────────────── */

const APP_VERSION   = '3';
const SHELL_CACHE   = `turkiana-shell-v${APP_VERSION}`;
const IMAGE_CACHE   = `turkiana-images-v${APP_VERSION}`;
const FONT_CACHE    = `turkiana-fonts-v${APP_VERSION}`;
const RUNTIME_CACHE = `turkiana-runtime-v${APP_VERSION}`;

const ALL_CACHES = [SHELL_CACHE, IMAGE_CACHE, FONT_CACHE, RUNTIME_CACHE];

const BASE = '/Turkiana-Cafe-Sweets/';

/* App shell — must cache on install */
const SHELL_URLS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png'
];

/* All menu images */
const IMAGE_URLS = [
  'Turkishcoffee.jpg',
  'Ottomanmastica.jpg',
  'Ottomanhazelnut.jpg',
  'Ottomancardamom.jpg',
  'Sahlep.jpg',
  'Arabic.jpg',
  'Arabiccup.jpeg',
  'Tea.jpg',
  'Turkishteapot.jpeg',
  'Appletea.jpg',
  'Mulberrytea.jpg',
  'Lemontea.jpg',
  'Romantea.jpg',
  'Matcha.webp',
  'Appletea.avif',
  'Blackmulberrytea.png',
  'Pomegranatetea.avif',
  'Hibiscus.webp',
  'Hibiscustea.webp',
  'Wintertea.webp',
  'Chamomiletea.webp',
  'Greentea.jpg',
  'Latteart.webp',
  'Art.webp',
  'Flatwhite.webp',
  'Espresso.webp',
  'Americano.webp',
  'Hotchocolate.jfif',
  'V60.webp',
  'Drip.jpg',
  'Coldbrew.webp',
  'Lemonade.jpg',
  'Orange.jpeg',
  'Earl.jpeg',
  'Blueberrymojito.webp',
  'Mixberriesmojito.webp',
  'WaterBig.jpg',
  'Sparkling.jpg',
  'Cola.jpg',
  'Mix.jpeg',
  'Carrot.jpeg',
  'Carroticecream.jpeg',
  'TrioBaklava.jpeg',
  'Fanzuella.webp',
  'Darkchocolateopera.jpeg',
  'Darkforestopera.jpeg',
  'Chocolatemousseopera.jpeg',
  'Redvelvetopera.jpeg',
  'Cheesecakeopera.jpeg',
  'Kunafa.jpeg',
  'Brown.jpg',
  'Tiramisu.jpg',
  'Sebastian.jpg',
  'Chocolatenew.jpeg',
  'Pistachionew.jpeg',
  'Snickernew.jpeg',
  'Icecream.webp',
  'Nuts.jpg',
  'Nutsmall.jpg',
  'Patatas.jpg',
  'Plain.webp',
  'Cheese.jpg',
  'Chocolatecroissant.jpg',
  'Almondcroissant.jpg',
  'Cinnamon.jpg'
].map(f => BASE + f);

/* ─── INSTALL ─────────────────────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      /* Cache shell immediately — these must succeed */
      const shellCache = await caches.open(SHELL_CACHE);
      await shellCache.addAll(SHELL_URLS);

      /* Cache images in background — individual failures are tolerated */
      const imageCache = await caches.open(IMAGE_CACHE);
      const imageResults = await Promise.allSettled(
        IMAGE_URLS.map(url =>
          imageCache.add(url).catch(err => {
            console.warn('[SW] Image cache miss:', url, err.message);
          })
        )
      );

      const cached = imageResults.filter(r => r.status === 'fulfilled').length;
      console.log(`[SW] Install complete — ${cached}/${IMAGE_URLS.length} images cached`);

      /* Skip waiting so the new SW activates immediately */
      self.skipWaiting();
    })()
  );
});

/* ─── ACTIVATE ─────────────────────────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      /* Delete old caches from previous versions */
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => !ALL_CACHES.includes(key))
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );

      /* Take control of all clients immediately */
      await clients.claim();
      console.log('[SW] Activated — v' + APP_VERSION);
    })()
  );
});

/* ─── FETCH ────────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event;

  /* Only handle GET requests */
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* ── Google Fonts → Cache-first ── */
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  /* ── External scripts (QRCode CDN etc.) → Network-first ── */
  if (url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  /* ── Only handle same-origin or GitHub Pages asset requests below ── */
  const isOurOrigin =
    url.origin === self.location.origin ||
    url.hostname === 'turkianacafe-ux.github.io';

  if (!isOurOrigin) return;

  /* ── App shell (HTML, manifest, icons) → Cache-first ── */
  if (
    request.destination === 'document' ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname.endsWith('.png')
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE, offlineFallback));
    return;
  }

  /* ── Images → Cache-first, stale-while-revalidate ── */
  if (
    request.destination === 'image' ||
    /\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  /* ── Everything else → Network-first, cache fallback ── */
  event.respondWith(networkFirst(request, RUNTIME_CACHE, offlineFallback));
});

/* ─── STRATEGIES ───────────────────────────────────────────── */

/**
 * Cache-first: serve from cache, fetch & update on miss.
 */
async function cacheFirst(request, cacheName, fallback) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    if (fallback) return fallback(request);
    throw err;
  }
}

/**
 * Network-first: try network, fall back to cache.
 */
async function networkFirst(request, cacheName, fallback) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallback) return fallback(request);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Stale-while-revalidate: serve from cache instantly, refresh in background.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response('', { status: 404 });
}

/**
 * Offline fallback — returns the cached index.html for document requests.
 */
async function offlineFallback(request) {
  if (request.destination === 'document') {
    const cache = await caches.open(SHELL_CACHE);
    const fallback =
      (await cache.match(BASE + 'index.html')) ||
      (await cache.match(BASE));
    if (fallback) return fallback;
  }
  return new Response(
    JSON.stringify({ error: 'You are offline', url: request.url }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/* ─── BACKGROUND SYNC (future-ready) ──────────────────────── */
self.addEventListener('sync', event => {
  if (event.tag === 'turkiana-sync') {
    event.waitUntil(Promise.resolve());
  }
});

/* ─── PUSH NOTIFICATIONS (future-ready) ───────────────────── */
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json().catch(() => ({ title: 'Turkiana', body: event.data.text() }));
  event.waitUntil(
    data.then(d =>
      self.registration.showNotification(d.title || 'Turkiana', {
        body: d.body || '',
        icon: BASE + 'icon-192.png',
        badge: BASE + 'icon-192.png',
        vibrate: [100, 50, 100],
        data: { url: d.url || BASE }
      })
    )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || BASE;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url === target && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(target);
    })
  );
});
