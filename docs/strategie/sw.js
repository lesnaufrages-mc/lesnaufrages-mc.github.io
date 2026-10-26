// Imperium of Wars : le jeu marche hors ligne une fois installé.
// Change VERSION à chaque mise à jour du jeu pour que les joueurs reçoivent la nouvelle version.
var VERSION = 'imperium-v11';
var FICHIERS = [
  './', 'index.html', 'monde.js?v=9', 'histoire.js?v=9', 'personnages.js?v=9', 'moteur.js?v=9', 'portraits.js?v=9', 'bataille3d.js?v=9', 'jeu.js?v=9',
  'manifest.webmanifest', 'icone-192.png', 'icone-512.png', '../supabase-config.js', '../site.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    // Un fichier qui échoue (ex. réseau coupé) ne bloque pas l'installation.
    return Promise.all(FICHIERS.map(function (f) { return c.add(f).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (k) { return k.indexOf('imperium-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Réseau d'abord (pour avoir la dernière version), le cache si pas d'internet.
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var nous = url.origin === self.location.origin || url.hostname === 'cdnjs.cloudflare.com';
  if (!nous) return;
  e.respondWith(fetch(req).then(function (rep) {
    if (rep.ok) { var copie = rep.clone(); caches.open(VERSION).then(function (c) { c.put(req, copie); }); }
    return rep;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: false }).then(function (r) { return r || caches.match(req, { ignoreSearch: true }); });
  }));
});
