// ── Offline-välimuisti ────────────────────────────────────────────────────────
// Strategia kahdessa kerroksessa:
//   /assets/*  → cache-first: Viten tiedostonimet sisältävät sisältöhashin, joten
//                kerran haettu tiedosto ei koskaan muutu — välimuisti on aina oikein.
//   navigaatio + muut (index.html, manifest, icon) → network-first: tuore versio
//                haetaan aina kun verkko toimii, välimuisti on vain offline-varasto.
// Laiskat chunkit (pelit, kielet, muutosloki) tallentuvat sitä mukaa kun niitä
// avataan — offline toimii niille peleille ja kielille, joissa on kerran käyty.
// Sourcemappeja (.map) ei tallenneta: vain devtools hakee niitä, ja ne ovat isoja.
const CACHE = 'jako-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => clients.claim())
));

// Hae verkosta ja talleta onnistunut vastaus välimuistiin.
function fetchAndCache(request) {
  return fetch(request).then(resp => {
    if (resp.ok) {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(request, copy));
    }
    return resp;
  });
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('.map')) return;

  if (url.pathname.startsWith('/assets/')) {
    // cache-first: hash-nimetty = muuttumaton
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetchAndCache(e.request))
    );
    return;
  }

  // network-first: tuoreus voittaa, välimuisti pelastaa offline-tilassa.
  // Navigaatiopyynnön offline-fallback on aina index.html (SPA:n ainoa sivu).
  e.respondWith(
    fetchAndCache(e.request).catch(() =>
      caches.match(e.request).then(hit => hit || (e.request.mode === 'navigate' ? caches.match('/') : undefined))
    )
  );
});
