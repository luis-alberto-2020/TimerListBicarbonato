// sw.js - Service Worker

const CACHE_NAME = 'guia-tiempos-cache-v3'; // Puedes incrementar si cambias archivos
const urlsToCache = [
  './', 
  './index.html',
  './styles/style.css', 
  './scripts/schedule-data.js',
  './scripts/timer-app.js',
  './manifest.json',
  // Asegúrate que estas rutas e imágenes existan
  './images/icon-192x192.png', 
  './images/icon-512x512.png',
  // Asegúrate que esta ruta y sonido existan si usas sonido
  './sounds/timer_end.mp3', 
  './sounds/pip.mp3' // Añadir el nuevo sonido a la caché
];

// Instalar
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache abierta, añadiendo archivos principales:', urlsToCache);
        return Promise.all(
           urlsToCache.map(url => {
              return cache.add(url).catch(err => console.warn(`[SW] Falló al cachear ${url}: ${err}`));
           })
        );
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error("[SW] Falló instalación: ", err))
  );
});

// Activar y limpiar cachés antiguas
self.addEventListener('activate', event => {
  console.log('[SW] Activando...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch (Estrategia: Cache First, luego Network)
self.addEventListener('fetch', event => {
    if (!(event.request.url.startsWith('http'))) { return; }
     if (event.request.method !== 'GET') { return event.respondWith(fetch(event.request)); }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) { return response; }
                return fetch(event.request).then(
                    networkResponse => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') { return networkResponse; }
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => { cache.put(event.request, responseToCache); });
                        return networkResponse;
                    }
                ).catch(error => { console.error('[SW] Error de Fetch:', error); /* Podrías devolver una respuesta offline */ });
            })
    );
});

// Manejo de Notificaciones Click
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notificación clickeada:', event.notification.tag);
  event.notification.close(); 
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) { if (client.url.endsWith('/') && 'focus' in client) { return client.focus(); } }
      if (clients.openWindow) { return clients.openWindow('.'); }
    })
  );
});

console.log('[SW] Service Worker cargado.');