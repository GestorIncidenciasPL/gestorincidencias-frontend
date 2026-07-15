// Service Worker — Gestor de Incidencias PL La Zubia
// Objetivo: permitir la instalación como app (PWA) y cachear el "shell" estático
// (HTML/CSS/JS de la propia app e iconos) para que abra más rápido y funcione
// aunque no haya red al abrirla. Las llamadas a la API de Apps Script (POST) y a
// los tiles de mapa NUNCA se cachean aquí: la cola offline de la propia app
// (localStorage) es quien se encarga de esos datos, no el service worker.

const CACHE_NAME = 'gestor-incidencias-v1';

// Ajusta este nombre si renombras el archivo HTML principal al desplegar.
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch(() => {}) // si algún archivo no existe todavía, no bloquea la instalación
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Nunca cachear: llamadas a la API de Apps Script (POST) ni peticiones que no sean GET.
  if (event.request.method !== 'GET') return;
  if (url.includes('script.google.com')) return;

  // Estrategia "network first, cache fallback" para el shell: si hay red, siempre
  // se sirve la versión más reciente; si no hay red, se sirve la copia cacheada.
  event.respondWith(
    fetch(event.request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia)).catch(() => {});
        return respuesta;
      })
      .catch(() => caches.match(event.request))
  );
});
