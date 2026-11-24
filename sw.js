/* Testing release: fresh application resources, native browser transport for media. */
'use strict';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  // Preserve native media loading/range semantics. Generic fetch can be intercepted
  // by download managers (IDM returned empty 204 responses on this machine).
  if(request.destination==='audio'||request.destination==='video'||request.headers.has('range')||/\.(?:mp3|wav|ogg|webm|m4a|mp4)$/i.test(url.pathname))return;
  if(request.method==='GET'&&url.origin===self.location.origin&&url.href.startsWith(self.registration.scope)){
    event.respondWith(fetch(new Request(request,{cache:'no-store'})));
  }
});
