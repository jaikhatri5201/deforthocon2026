// v7: network-first updates, offline-friendly static app shell (API calls bypass the cache).
const CACHE='deforthocon-v7-1-mmc-approved-brochure';
const APP_SHELL=['./','./index.html','./style.css','./app.js','./certificate.js','./manifest.webmanifest','./data.json','./faculty_profiles.json',
 './assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png','./assets/apple-touch-icon.png','./assets/registration-qr.png',
 './assets/DEFORTHOCON_2026_Brochure_2.pdf','./assets/certificate-template.png',
 './assets/brochure-pages/page-1.webp','./assets/brochure-pages/page-2.webp','./assets/brochure-pages/page-3.webp','./assets/brochure-pages/page-4.webp'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const req=event.request; if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 event.respondWith(fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return response;})
 .catch(()=>caches.match(req).then(cached=>cached||(req.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
