// Service worker minimo: rende l'app installabile e mostra una pagina
// di cortesia quando il server non è raggiungibile. Non mette in cache le API.
const OFFLINE_HTML = `<!doctype html><html lang="it"><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="font-family:system-ui;padding:32px;text-align:center;color:#1A3A6B">
<h2>Server non raggiungibile</h2><p>Controlla di essere connesso alla rete o alla VPN e riprova.</p>
<button onclick="location.reload()" style="padding:12px 20px;border-radius:12px;border:0;background:#1A3A6B;color:#fff">Riprova</button>
</body></html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    ),
  );
});
