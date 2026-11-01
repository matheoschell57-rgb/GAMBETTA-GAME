// Service worker du Gambetta Game : toujours la dernière version en ligne,
// et la dernière version vue reste jouable si le réseau coupe.
// Notifications (OneSignal) : chargées ici pour partager ce service worker
try{importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');}catch(_){}
const CACHE='gambetta-v29';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(k=>k.put(r,c));return res;})
    .catch(()=>caches.match(r).then(m=>m||caches.match('./'))));
});
