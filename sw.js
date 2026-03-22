const CACHE_NAME = 'turkiana-v2';
const BASE_PATH = '/Turkiana-Cafe-Sweets/';

const urlsToCache = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'icon-192.png',
  BASE_PATH + 'icon-512.png',

  // ALL menu images (complete list - no missing photos offline)
  BASE_PATH + 'Turkishcoffee.jpg',
  BASE_PATH + 'Ottomanmastica.jpg',
  BASE_PATH + 'Ottomanhazelnut.jpg',
  BASE_PATH + 'Ottomancardamom.jpg',
  BASE_PATH + 'Sahlep.jpg',
  BASE_PATH + 'Arabic.jpg',
  BASE_PATH + 'Arabiccup.jpeg',
  BASE_PATH + 'Tea.jpg',
  BASE_PATH + 'Turkishteapot.jpeg',
  BASE_PATH + 'Appletea.jpg',
  BASE_PATH + 'Mulberrytea.jpg',
  BASE_PATH + 'Lemontea.jpg',
  BASE_PATH + 'Romantea.jpg',
  BASE_PATH + 'Matcha.webp',
  BASE_PATH + 'Appletea.avif',
  BASE_PATH + 'Blackmulberrytea.png',
  BASE_PATH + 'Pomegranatetea.avif',
  BASE_PATH + 'Hibiscus.webp',
  BASE_PATH + 'Hibiscustea.webp',
  BASE_PATH + 'Wintertea.webp',
  BASE_PATH + 'Chamomiletea.webp',
  BASE_PATH + 'Greentea.jpg',
  BASE_PATH + 'Latteart.webp',
  BASE_PATH + 'Art.webp',
  BASE_PATH + 'Flatwhite.webp',
  BASE_PATH + 'Espresso.webp',
  BASE_PATH + 'Americano.webp',
  BASE_PATH + 'Hotchocolate.jfif',
  BASE_PATH + 'V60.webp',
  BASE_PATH + 'Drip.jpg',
  BASE_PATH + 'Coldbrew.webp',
  BASE_PATH + 'Lemonade.jpg',
  BASE_PATH + 'Orange.jpeg',
  BASE_PATH + 'Earl.jpeg',
  BASE_PATH + 'Blueberrymojito.webp',
  BASE_PATH + 'Mixberriesmojito.webp',
  BASE_PATH + 'WaterBig.jpg',
  BASE_PATH + 'Sparkling.jpg',
  BASE_PATH + 'Cola.jpg',
  BASE_PATH + 'Mix.jpeg',
  BASE_PATH + 'Carrot.jpeg',
  BASE_PATH + 'Carroticecream.jpeg',
  BASE_PATH + 'TrioBaklava.jpeg',
  BASE_PATH + 'Fanzuella.webp',
  BASE_PATH + 'Darkchocolateopera.jpeg',
  BASE_PATH + 'Darkforestopera.jpeg',
  BASE_PATH + 'Chocolatemousseopera.jpeg',
  BASE_PATH + 'Redvelvetopera.jpeg',
  BASE_PATH + 'Cheesecakeopera.jpeg',
  BASE_PATH + 'Kunafa.jpeg',
  BASE_PATH + 'Brown.jpg',
  BASE_PATH + 'Tiramisu.jpg',
  BASE_PATH + 'Sebastian.jpg',
  BASE_PATH + 'Chocolatenew.jpeg',
  BASE_PATH + 'Pistachionew.jpeg',
  BASE_PATH + 'Snickernew.jpeg',
  BASE_PATH + 'Icecream.webp',
  BASE_PATH + 'Nuts.jpg',
  BASE_PATH + 'Nutsmall.jpg',
  BASE_PATH + 'Patatas.jpg',
  BASE_PATH + 'Plain.webp',
  BASE_PATH + 'Cheese.jpg',
  BASE_PATH + 'Chocolatecroissant.jpg',
  BASE_PATH + 'Almondcroissant.jpg',
  BASE_PATH + 'Cinnamon.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => cachedResponse || fetch(event.request))
      .catch(() => caches.match(BASE_PATH + 'index.html'))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      );
    })
  );
});
