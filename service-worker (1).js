// Nome do cache - atualize a versão quando modificar os arquivos
const CACHE_NAME = 'agenda-rosi-v1.0.0';

// Arquivos que serão cacheados para funcionamento offline
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Instala o service worker e faz o cache inicial
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache aberto, adicionando arquivos...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Instalação concluída');
        return self.skipWaiting(); // Força o service worker a ativar imediatamente
      })
  );
});

// Ativa o service worker e limpa caches antigos
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Agora controlando a página');
      return self.clients.claim(); // Toma o controle imediatamente
    })
  );
});

// Intercepta as requisições e serve do cache (offline-first)
self.addEventListener('fetch', event => {
  // Ignora requisições para extensões e analytics
  if (event.request.url.includes('chrome-extension') ||
      event.request.url.includes('firebase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retorna do cache
        if (response) {
          console.log('[Service Worker] Servindo do cache:', event.request.url);
          return response;
        }
        
        // Se não está no cache, tenta buscar da rede
        console.log('[Service Worker] Buscando da rede:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // Verifica se a resposta é válida
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Clone a resposta antes de cachear
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return networkResponse;
          })
          .catch(error => {
            console.error('[Service Worker] Falha na rede e sem cache:', error);
            // Retorna uma página de fallback (opcional)
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Offline - Conteúdo não disponível', {
              status: 503,
              statusText: 'Serviço indisponível'
            });
          });
      })
  );
});

// Sincronização em segundo plano (para quando voltar online)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-agendamentos') {
    console.log('[Service Worker] Sincronizando agendamentos...');
    event.waitUntil(syncAgendamentos());
  }
});

// Função de sincronização (se um dia migrar para Firebase)
async function syncAgendamentos() {
  // Aqui futuramente você pode implementar sincronização com Firebase
  console.log('[Service Worker] Sincronização executada');
  return Promise.resolve();
}

// Recebe mensagens do cliente (página)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});