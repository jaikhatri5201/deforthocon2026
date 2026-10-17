// v9: only stable app-shell assets are precached; certificates are always network-only.
const CACHE='deforthocon-v19-certificate-final-17oct-v2';
const APP_SHELL=['./','./index.html','./style.css','./app.js','./publications.js','./certificate.js','./manifest.webmanifest','./data.json','./faculty_profiles.json',
 './assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png','./assets/apple-touch-icon.png','./assets/registration-qr.png',
 './assets/DEFORTHOCON_2026_Brochure_4.pdf','./assets/brochure-pages/page-1.webp','./assets/brochure-pages/page-2.webp','./assets/brochure-pages/page-3.webp','./assets/brochure-pages/page-4.webp'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const req=event.request; const url=new URL(req.url);
 // Never intercept or persist protected API replies, including publication PDFs or certificate endpoints.
 if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 // Certificate template URLs are versioned and never served from a previous offline cache.
 if(/^\/assets\/DEFORTHOCON_2026_(Faculty|Delegate)_Certificate_.*\.png$/.test(url.pathname))return;
 event.respondWith(fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return response;})
 .catch(()=>caches.match(req).then(cached=>cached||(req.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
