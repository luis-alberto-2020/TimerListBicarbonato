    // sw.js - Service Worker Final

    const CACHE_NAME = 'guia-tiempos-cache-v3'; // Puedes incrementar si cambias archivos cacheados significativamente
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
      './sounds/pip.mp3' // Añadir el nuevo sonido a la caché
    ];

    // Instalar
    self.addEventListener('install', event => {
      console.log('[SW] Instalando...');
      event.waitUntil(
        caches.open(CACHE_NAME)
          .then(cache => {
            console.log('[SW] Cache abierta, añadiendo archivos principales:', urlsToCache);
            // Intenta cachear todo, pero no falles la instalación si un recurso no esencial (ej. sonido) falla
            const cachePromises = urlsToCache.map(urlToCache => {
                return cache.add(urlToCache).catch(err => {
                    console.warn(`[SW] Falló al cachear ${urlToCache}: ${err}`);
                    // Puedes decidir si quieres que la instalación falle si un recurso crítico no se cachea
                });
            });
            return Promise.all(cachePromises);
          })
          .then(() => {
             console.log("[SW] Cacheo inicial completado (o intentos realizados). Forzando activación...");
             return self.skipWaiting(); // Activar nuevo SW inmediatamente
          })
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
        }).then(() => {
             console.log('[SW] Reclamando clientes...');
             return self.clients.claim(); // Tomar control de las páginas abiertas
        })
      );
    });

    // Fetch (Estrategia: Cache First, luego Network)
    self.addEventListener('fetch', event => {
        // Ignorar peticiones que no sean GET o no sean http(s)
        if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
            // console.log('[SW] Ignorando fetch:', event.request.method, event.request.url); // Debug
            return;
        }

        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    // Devolver desde caché si existe
                    if (cachedResponse) {
                        // console.log('[SW] Sirviendo desde caché:', event.request.url); // Debug
                        return cachedResponse;
                    }

                    // Si no está en caché, ir a la red
                    // console.log('[SW] No en caché, buscando en red:', event.request.url); // Debug
                    return fetch(event.request).then(
                        networkResponse => {
                            // console.log('[SW] Respuesta de red OK para:', event.request.url); // Debug

                            // Verificar si la respuesta es válida para cachear
                            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                                // console.log('[SW] Respuesta de red no válida para cachear.'); // Debug
                                return networkResponse; // Devolver la respuesta de red tal cual
                            }

                            // Clonar la respuesta para poder usarla y guardarla en caché
                            const responseToCache = networkResponse.clone();

                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    // console.log('[SW] Cacheando nueva respuesta para:', event.request.url); // Debug
                                    cache.put(event.request, responseToCache);
                                });

                            return networkResponse; // Devolver la respuesta original de la red
                        }
                    ).catch(error => {
                        console.error('[SW] Error de Fetch; no se pudo obtener de red ni caché:', event.request.url, error);
                        // Opcional: Devolver una respuesta offline genérica si falla la red y no está en caché
                        // Por ejemplo: return new Response("Contenido no disponible offline.", { headers: { 'Content-Type': 'text/plain' }});
                    });
                })
        );
    });


    // Manejo de Notificaciones Click
    self.addEventListener('notificationclick', event => {
      console.log('[SW] Notificación clickeada:', event.notification.tag);
      event.notification.close();

      // Intenta enfocar una ventana existente de la app o abrir una nueva
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
          for (let client of windowClients) {
            // Ajusta '.' si tu app no está en la raíz '/'
            const url = new URL(client.url);
            if (url.pathname === '/' && 'focus' in client) { // Compara pathname
              return client.focus();
            }
          }
          if (clients.openWindow) {
             // Ajusta '.' si tu app no está en la raíz '/'
            return clients.openWindow('.');
          }
        })
      );
    });

    console.log('[SW] Service Worker cargado.');
    