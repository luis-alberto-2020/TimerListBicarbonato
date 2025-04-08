    // sw.js - Service Worker Final

    const CACHE_NAME = 'guia-tiempos-cache-v4'; // Incrementar versión si cambias archivos cacheados
    // Lista de archivos a cachear - AJUSTA LAS RUTAS SI ES NECESARIO
    const urlsToCache = [
      './', // Cache la raíz (index.html via './')
      './index.html',
      './styles/style.css',
      './scripts/schedule-data.js',
      './scripts/timer-app.js',
      './manifest.json',
      // Asegúrate que estas rutas e imágenes existan
      './images/icon-192x192.png',
      './images/icon-512x512.png',
      // Asegúrate que estas rutas y sonidos existan si los usas
      './sounds/timer_end.mp3',
      './sounds/pip.mp3'
    ];

    // Instalar
    self.addEventListener('install', event => {
      console.log('[SW] Instalando v4...');
      event.waitUntil(
        caches.open(CACHE_NAME)
          .then(cache => {
            console.log('[SW] Cache abierta, añadiendo archivos principales:', urlsToCache);
            const cachePromises = urlsToCache.map(urlToCache => {
                return cache.add(urlToCache).catch(err => console.warn(`[SW] Falló al cachear ${urlToCache}: ${err}`));
            });
            return Promise.all(cachePromises);
          })
          .then(() => { console.log("[SW] Cacheo inicial completado. Forzando activación..."); return self.skipWaiting(); })
          .catch(err => console.error("[SW] Falló instalación: ", err))
      );
    });

    // Activar y limpiar cachés antiguas
    self.addEventListener('activate', event => {
      console.log('[SW] Activando v4...');
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
        }).then(() => { console.log('[SW] Reclamando clientes...'); return self.clients.claim(); })
      );
    });

    // Fetch (Estrategia: Cache First, luego Network)
    self.addEventListener('fetch', event => {
        if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) { return; }
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) { return cachedResponse; }
                    return fetch(event.request).then(
                        networkResponse => {
                            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') { return networkResponse; }
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => { cache.put(event.request, responseToCache); });
                            return networkResponse;
                        }
                    ).catch(error => { console.error('[SW] Error de Fetch:', event.request.url, error); });
                })
        );
    });

    // Manejo de Notificaciones Click
    self.addEventListener('notificationclick', event => {
      console.log('[SW] Notificación clickeada:', event.notification.tag);
      event.notification.close();
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
          for (let client of windowClients) { const url = new URL(client.url); if (url.pathname === '/' && 'focus' in client) { return client.focus(); } }
          if (clients.openWindow) { return clients.openWindow('.'); }
        })
      );
    });

    console.log('[SW] Service Worker v4 cargado.');
    
    