const CACHE_NAME = 'turkiana-v1';
const urlsToCache = [
  '/Turkiana-Cafe-Sweets/',
  '/Turkiana-Cafe-Sweets/index.html',
  '/Turkiana-Cafe-Sweets/manifest.json',
  '/Turkiana-Cafe-Sweets/Ottomanmastica.jpg',
  '/Turkiana-Cafe-Sweets/Turkishcoffee.jpg',
  // Add any other images you want cached (optional)
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
