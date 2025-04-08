// sw.js - Nombre de archivo corregido

const CACHE_NAME = 'guia-tiempos-cache-v2'; // Incrementa versión si cambias archivos cacheados
const urlsToCache = [
  '.', // Cache la raíz (index.html)
  'index.html',
  'styles/style.css', // Asume CSS en carpeta styles
  'scripts/schedule-data.js',
  'scripts/timer-app.js',
  'manifest.json',
  'images/icon-192x192.png', // Añade tus íconos
  'images/icon-512x512.png',
  'sounds/timer_end.mp3' // Añade tus sonidos si los usas
  // Añade otras imágenes o recursos que necesites offline
];

// Instalar el Service Worker y cachear los archivos estáticos
self.addEventListener('install', event => {
  console.log('[SW] Instalando v2...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache abierta, añadiendo archivos principales.');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error("[SW] Falló cache.addAll: ", err))
  );
  self.skipWaiting(); // Forzar activación inmediata
});

// Activar el Service Worker y limpiar cachés antiguas
self.addEventListener('activate', event => {
  console.log('[SW] Activando v2...');
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
         return self.clients.claim(); // Tomar control inmediato de las páginas
    })
  );
});

// Interceptar las solicitudes de red
self.addEventListener('fetch', event => {
    // console.log('[SW] Fetch interceptado para:', event.request.url); // Debug
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si está en caché, devolverlo desde la caché
                if (response) {
                    // console.log('[SW] Recurso encontrado en caché:', event.request.url); // Debug
                    return response;
                }
                // console.log('[SW] Recurso NO encontrado en caché, buscando en red:', event.request.url); // Debug

                // Si no, intentar obtenerlo de la red
                return fetch(event.request).then(
                    networkResponse => {
                        // console.log('[SW] Respuesta de red recibida para:', event.request.url); // Debug
                        // Opcional: Cachear la nueva respuesta si es válida
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            // console.log('[SW] Respuesta de red no válida para cachear.'); // Debug
                            return networkResponse;
                        }

                        // Clona la respuesta para poder usarla y guardarla en caché
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                // Cachea solo si es una solicitud GET
                                if (event.request.method === 'GET') {
                                     // console.log('[SW] Cacheando nueva respuesta para:', event.request.url); // Debug
                                     cache.put(event.request, responseToCache);
                                }
                            });
                        return networkResponse;
                    }
                ).catch(error => {
                    console.error('[SW] Fetch fallido; error de red.', error);
                    // Podrías devolver una página offline personalizada aquí si quieres
                    // return caches.match('/offline.html');
                    // O simplemente fallar (como hace por defecto si no hay catch)
                });
            })
    );
});


// --- Manejo de Notificaciones (Desde el Service Worker) ---
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notificación clickeada:', event.notification.tag);
  event.notification.close(); // Cierra la notificación

  // Intenta enfocar una ventana existente de la app o abrir una nueva
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Verifica si alguna ventana ya está abierta
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // Ajusta la URL si tu app no está en la raíz '/'
        if (client.url.endsWith('/') && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no hay ventanas abiertas, abre una nueva
      if (clients.openWindow) {
        // Ajusta la URL si tu app no está en la raíz '/'
        return clients.openWindow('.');
      }
    })
  );
});

console.log('[SW] Service Worker cargado.');