// Service Worker para Guía de Tiempos PWA

const CACHE_NAME = 'guia-tiempos-nefra-v1.1'; // Incrementar versión si cambias archivos cacheados
const urlsToCache = [
  '/', // Cachea la raíz (importante para PWA)
  'index.html',
  'styles/style.css',
  'scripts/schedule-data.js',
  'scripts/timer-app.js',
  // Añade aquí los íconos que quieras disponibles offline
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
  // '/icons/icon-144x144.png' // Ejemplo si tienes más
];

// Evento 'install': Cachear los archivos base de la aplicación
self.addEventListener('install', event => {
  console.log('[SW GuiaTiempos] Instalando v1.1...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW GuiaTiempos] Cache abierto, añadiendo archivos base a cache:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
         console.log('[SW GuiaTiempos] Archivos base cacheados correctamente.');
         // Forzar la activación del nuevo SW inmediatamente
         return self.skipWaiting();
      })
      .catch(error => {
          console.error('[SW GuiaTiempos] Fallo al cachear archivos base:', error);
      })
  );
});

// Evento 'activate': Limpiar caches viejos
self.addEventListener('activate', event => {
  console.log('[SW GuiaTiempos] Activando v1.1...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW GuiaTiempos] Borrando cache viejo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        console.log('[SW GuiaTiempos] v1.1 Activado y listo.');
        // Tomar control de las páginas abiertas inmediatamente
        return self.clients.claim();
    })
  );
});


// Evento 'fetch': Servir desde cache primero (estrategia Cache First)
self.addEventListener('fetch', event => {
  // Solo aplicar cache first para peticiones GET (HTML, CSS, JS, Imagenes)
  if (event.request.method === 'GET') {
      event.respondWith(
        caches.match(event.request) // Intenta encontrar en cache
          .then(response => {
            // Si está en cache, devolverlo
            if (response) {
              return response;
            }
            // Si no está en cache, ir a la red
            // console.log('[SW GuiaTiempos] No en cache, buscando en red:', event.request.url);
            return fetch(event.request)
                     .then(networkResponse => {
                         // Opcional: podríamos cachear recursos nuevos aquí si quisiéramos
                         // con cache.put(event.request, networkResponse.clone());
                         return networkResponse;
                     });
          })
          .catch(error => {
              console.error('[SW GuiaTiempos] Error en fetch:', error);
              // Aquí podríamos devolver una página offline fallback si la tuviéramos cacheada
              // return caches.match('/offline.html');
          })
      );
  }
});