// Service Worker — Buku Absen Guru Digital
// Cache "app shell" agar aplikasi tetap bisa dibuka saat koneksi lambat/offline.
// Path dibuat relatif terhadap lokasi sw.js supaya aman dipakai di GitHub Pages
// project page (contoh: https://username.github.io/nama-repo/).

const CACHE_VERSION = 'absen-guru-v13';
const BASE = self.registration.scope; // otomatis menyesuaikan folder deploy

const APP_SHELL = [
  '',
  'index.html',
  'manifest.json',
  'icon/icon-192.png',
  'icon/icon-512.png',
  'icon/icon-maskable-192.png',
  'icon/icon-maskable-512.png',
  'icon/apple-touch-icon.png',
  'icon/favicon-32.png',
  'icon/favicon-64.png',
].map((p) => new URL(p, BASE).toString());

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Strategi: cache-first untuk app shell (file sendiri).
// Request pihak ketiga (Firebase/Firestore/gstatic) dibiarkan lewat apa adanya —
// TIDAK di-cache dan TIDAK di-intercept, karena Firestore memakai koneksi
// realtime (long-lived) yang bisa rusak kalau dibungkus service worker.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const isSameOrigin = request.url.startsWith(self.location.origin);
  if (!isSameOrigin) return; // biarkan browser menangani langsung

  const isAppShell = APP_SHELL.includes(request.url);
  if (isAppShell) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
