// sw.js - Service Worker

const CACHE_NAME = 'guia-tiempos-cache-v3'; // Incrementa versión si cambias archivos cacheados
// Lista de archivos a cachear - AJUSTA LAS RUTAS SI ES NECESARIO
const urlsToCache = [
  './', // Cache la raíz (index.html via './')
  './index.html',
  './styles/style.css', 
  './scripts/schedule-data.js',
  './scripts/timer-app.js',
  './manifest.json',
  './images/icon-192x192.png', // Asegúrate que esta ruta exista
  './images/icon-512x512.png', // Asegúrate que esta ruta exista
  './sounds/timer_end.mp3' // Añade tus sonidos si los usas
];

// Instalar
self.addEventListener('install', event => {
  console.log('[SW] Instalando v3...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache abierta, añadiendo archivos principales:', urlsToCache);
        // Es importante manejar errores aquí por si un archivo no existe
        return Promise.all(
           urlsToCache.map(url => {
              return cache.add(url).catch(err => {
                 console.warn(`[SW] Falló al cachear ${url}: ${err}`);
                 // Decide si la falla es crítica o no. Si es un ícono, quizás no lo sea.
                 // Si es app.js o index.html, podría ser crítico.
              });
           })
        );
      })
      .then(() => {
         console.log("[SW] Archivos principales cacheados (o intentos realizados). Forzando activación...");
         return self.skipWaiting(); // Forzar activación inmediata
      })
      .catch(err => console.error("[SW] Falló apertura de cache o skipWaiting: ", err))
  );
});

// Activar y limpiar cachés antiguas
self.addEventListener('activate', event => {
  console.log('[SW] Activando v3...');
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
         return self.clients.claim(); 
    })
  );
});

// Fetch (Estrategia: Cache First, luego Network)
self.addEventListener('fetch', event => {
    // No interceptar peticiones que no sean http/https o que sean de extensiones
    if (!(event.request.url.startsWith('http'))) { 
       // console.log('[SW] Ignorando fetch para scheme no http(s):', event.request.url); // Debug
        return; 
    }
     // No intentar cachear POST, PUT, DELETE, etc.
     if (event.request.method !== 'GET') {
         // console.log('[SW] Ignorando fetch para método no GET:', event.request.method); // Debug
         return event.respondWith(fetch(event.request));
     }


    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    // console.log('[SW] Sirviendo desde caché:', event.request.url); // Debug
                    return response;
                }

                // console.log('[SW] No en caché, buscando en red:', event.request.url); // Debug
                return fetch(event.request).then(
                    networkResponse => {
                        // console.log('[SW] Respuesta de red OK para:', event.request.url); // Debug

                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                             console.log('[SW] Respuesta de red no válida para cachear:', event.request.url, networkResponse.status); // Debug
                            return networkResponse;
                        }

                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                // console.log('[SW] Cacheando nueva respuesta para:', event.request.url); // Debug
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                ).catch(error => {
                    console.error('[SW] Error de Fetch; no se pudo obtener de red ni caché:', error);
                    // Opcional: Devolver una respuesta offline genérica
                    // return new Response("Contenido no disponible offline.", { headers: { 'Content-Type': 'text/plain' }});
                });
            })
    );
});


// Manejo de Notificaciones
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notificación clickeada:', event.notification.tag);
  event.notification.close(); 

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // Ajusta '.' si tu app no está en la raíz
        if (client.url.endsWith('/') && 'focus' in client) { 
          return client.focus();
        }
      }
      if (clients.openWindow) {
         // Ajusta '.' si tu app no está en la raíz
        return clients.openWindow('.'); 
      }
    })
  );
});

console.log('[SW] Service Worker v3 cargado y esperando eventos.');