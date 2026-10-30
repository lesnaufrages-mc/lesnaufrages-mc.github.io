// Mot Mystère : le jeu marche hors ligne une fois installé.
// Change VERSION si tu veux forcer la mise à jour du cache chez les joueurs.
var VERSION = 'motmystere-v4';
var FICHIERS = ['/jouer/', '/jouer/index.html', '/jouer/installer.js', '/jouer/manifest.webmanifest',
  '/jouer/icone-192.png', '/jouer/icone-512.png', '/jouer/favicon.ico', '/site.js',
  '/supabase-config.js', '/sauvegarde.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(FICHIERS.map(function (f) { return c.add(f).catch(function () {}); })).then(function () {
      // Ajoute aussi le code du jeu (son nom change à chaque export Expo).
      return fetch('/jouer/index.html').then(function (r) { return r.text(); }).then(function (html) {
        var scripts = html.match(/\/jouer\/_expo\/[^"']+\.js/g) || [];
        return Promise.all(scripts.map(function (s) { return c.add(s).catch(function () {}); }));
      }).catch(function () {});
    });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (k) { return k.indexOf('motmystere-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Réseau d'abord (dernière version), le cache si pas d'internet.
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(function (rep) {
    if (rep.ok) { var copie = rep.clone(); caches.open(VERSION).then(function (c) { c.put(req, copie); }); }
    return rep;
  }).catch(function () {
    return caches.match(req).then(function (r) { return r || caches.match('/jouer/index.html'); });
  }));
});
