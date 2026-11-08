// Service worker du Gambetta Game : toujours la dernière version en ligne,
// et la dernière version vue reste jouable si le réseau coupe.
// Notifications (OneSignal) : chargées ici pour partager ce service worker
try{importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');}catch(_){}
const CACHE='gambetta-v50';
// Les photos des cartes (dossier img/) sont gardées sur le téléphone d'une version à l'autre :
// leur adresse change dès que la photo change (?v=…), donc pas besoin de les retélécharger.
const IMG='gambetta-img';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('gambetta-v')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
  if(/\/img\//.test(u.pathname)){
    e.respondWith(caches.open(IMG).then(k=>k.match(r).then(m=>m||fetch(r).then(res=>{if(res&&res.ok)k.put(r,res.clone());return res;})
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(x=>x||Response.error())))));
    return;}
  e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(k=>k.put(r,c));return res;})
    .catch(()=>caches.match(r).then(m=>m||caches.match('./'))));
});
