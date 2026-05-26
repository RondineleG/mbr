/* ═══════════════════════════════════════════════════════════════
   SERVICE WORKER — MrBur PWA
   Cache de recursos estáticos para funcionar offline
   Estratégia: Cache First para estáticos, Network First para dinâmicos
   ═══════════════════════════════════════════════════════════════ */
const CACHE_VERSION = '1.2.4';
const CACHE_NAME = `mrbur-${CACHE_VERSION}`;

// Cache de recursos estáticos (app shell)
const STATIC_CACHE = [
  './',
  'index.html',
  'offline.html',
  'firebase-config.js',
  'manifest.json',
  'favicon.svg',
  'icon-72.png',
  'icon-96.png',
  'icon-128.png',
  'icon-144.png',
  'icon-152.png',
  'icon-192.png',
  'icon-384.png',
  'icon-512.png'
];

// Cache de recursos CSS/JS
const ASSETS_CACHE = [
  'css/tokens.css',
  'css/base.css',
  'css/components.css',
  'css/auth.css',
  'css/app.css',
  'js/utils/dom.js',
  'js/utils/format.js',
  'js/utils/loading.js',
  'js/utils/constants.js',
  'js/firebase/db.service.js',
  'js/firebase/auth.service.js',
  'js/firebase/auth-real.js',
  'js/app/state.js',
  'js/app/router.js',
  'js/app/session.js',
  'js/app/main.js',
  'js/components/toast.js',
  'js/components/modal.js',
  'js/components/topbar.js',
  'js/services/user.service.js',
  'js/services/invite.service.js',
  'js/services/order.service.js',
  'js/services/points.service.js',
  'js/services/mission.service.js',
  'js/services/product.service.js',
  'js/services/reward.service.js',
  'js/pages/login.page.js',
  'js/pages/onboarding.page.js',
  'js/pages/home.page.js',
  'js/pages/cardapio.page.js',
  'js/pages/clube.page.js',
  'js/pages/busca.page.js',
  'js/pages/sacola.page.js',
  'js/pages/pedidos.page.js',
  'js/pages/perfil.page.js',
  'js/pages/mission.page.js',
  'js/pages/convites.page.js'
];

// Instalação - cache de recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Permite que a página peça a ativação imediata do SW novo (auto-update).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Ativação - limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Estratégia de cache: Cache First para estáticos
function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) {
      return cached;
    }
    return fetch(request).then((response) => {
      if (!response || response.status !== 200) {
        return response;
      }
      const responseToCache = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, responseToCache);
      });
      return response;
    });
  });
}

// Estratégia de cache: Network First para dinâmicos
function networkFirst(request) {
  return fetch(request).then((response) => {
    if (!response || response.status !== 200) {
      return response;
    }
    const responseToCache = response.clone();
    caches.open(CACHE_NAME).then((cache) => {
      cache.put(request, responseToCache);
    });
    return response;
  }).catch(() => {
    // Fallback para cache ou página offline
    return caches.match(request).then((cached) => {
      if (cached) return cached;
      return caches.match('/offline.html');
    });
  });
}

// Fetch - gerencia diferentes estratégias de cache
self.addEventListener('fetch', (event) => {
  // Ignorar requisições não-GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar requisições para Firebase (são dinâmicas)
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return;
  }

  const url = new URL(event.request.url);

  // HTML / navegação → SEMPRE Network First (o PWA pega o shell mais novo online;
  // cai pro cache só offline). Precisa vir ANTES do STATIC_CACHE.
  if (event.request.mode === 'navigate' || url.pathname.match(/\.html$/) || url.pathname === '/') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // CSS/JS → Network First (deploys refletem na hora; fallback p/ cache offline).
  if (url.pathname.match(/\.(css|js)$/)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Ícones e assets estáticos imutáveis → Cache First.
  if (STATIC_CACHE.some(path => url.pathname === path || url.pathname.endsWith(path))) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Padrão: Network First.
  event.respondWith(networkFirst(event.request));
});
