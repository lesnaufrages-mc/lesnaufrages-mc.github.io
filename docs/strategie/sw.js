// Imperium of Wars : le jeu marche hors ligne une fois installé.
// Change VERSION à chaque mise à jour du jeu pour que les joueurs reçoivent la nouvelle version.
var VERSION = 'imperium-v13';
// La liste des vrais tableaux (portraits), pour les garder aussi hors ligne.
try { importScripts('tableaux.js?v=12'); } catch (e) {}
var FICHIERS = [
  './', 'index.html', 'monde.js?v=12', 'histoire.js?v=12', 'personnages.js?v=12', 'moteur.js?v=12', 'tableaux.js?v=12', 'portraits.js?v=12', 'bataille3d.js?v=12', 'jeu.js?v=12',
  'manifest.webmanifest', 'polices/cinzel-latin.woff2', 'polices/cinzel-latin-ext.woff2', 'icone-192.png', 'icone-512.png', '../supabase-config.js', '../site.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
].concat(Object.keys(self.TABLEAUX || {}).map(function (k) { return 'tableaux/' + self.TABLEAUX[k][0]; }));

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
