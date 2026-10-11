self.addEventListener('install', (e) => {
  console.log('Service Worker Installed');
});

self.addEventListener('fetch', (e) => {
  // استقبال طلبات الشبكة
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
