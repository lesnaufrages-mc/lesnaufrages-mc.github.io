// Fabrique la version « redirection » de l'ancienne adresse lesnaufrages-mc.github.io.
// Le vrai site est sur https://lesnaufrages.net (Cloudflare Pages). Ici, chaque page de docs/
// devient une petite page qui envoie le visiteur au même endroit sur lesnaufrages.net
// (en gardant ?… et #…), avec un lien canonical pour que Google passe à la nouvelle adresse.
// Les anciens service workers (/jouer/, /strategie/) sont remplacés par un service worker
// qui se désinstalle, vide son cache et recharge la page : sinon les joueurs qui avaient
// « installé » un jeu resteraient bloqués sur la vieille copie.
// Utilisé par .github/workflows/redirection-ancien-site.yml : node scripts/redirection-ancien-site.cjs <dossier de sortie>
const fs = require('fs');
const path = require('path');

const NOUVEAU = 'https://lesnaufrages.net';
const DOCS = path.join(__dirname, '..', 'docs');
const SORTIE = path.resolve(process.argv[2] || 'redirection');

fs.rmSync(SORTIE, { recursive: true, force: true });
fs.mkdirSync(SORTIE, { recursive: true });

function page(cible) {
  const url = NOUVEAU + cible;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Les Naufragés ont déménagé : lesnaufrages.net</title>
<link rel="canonical" href="${url}">
<meta name="robots" content="noindex,follow">
<meta http-equiv="refresh" content="0; url=${url}">
<script>location.replace(${JSON.stringify(url)} + location.search + location.hash);</script>
<style>body{font-family:system-ui,sans-serif;background:#0b1b2b;color:#eef;text-align:center;padding:60px 16px}a{color:#7cf}</style>
</head><body>
<h1>Les Naufragés ont déménagé</h1>
<p>Notre site est maintenant sur <a href="${url}">lesnaufrages.net</a>.</p>
<p>Si tu n'es pas redirigé tout de suite, clique sur le lien.</p>
</body></html>
`;
}

// Pour une adresse inconnue : on garde le chemin tel quel.
const page404 = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="robots" content="noindex">
<title>Les Naufragés ont déménagé : lesnaufrages.net</title>
<script>location.replace(${JSON.stringify(NOUVEAU)} + location.pathname + location.search + location.hash);</script>
</head><body><p>Notre site est maintenant sur <a href="${NOUVEAU}/">lesnaufrages.net</a>.</p></body></html>
`;

const swAdieu = `// L'ancien site a déménagé sur ${NOUVEAU} : ce service worker se retire.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.map(function (c) { return caches.delete(c); }));
  }).then(function () { return self.registration.unregister(); }).then(function () {
    return self.clients.matchAll({ type: 'window' });
  }).then(function (fenetres) {
    fenetres.forEach(function (f) { f.navigate(f.url); });
  }));
});
`;

let pages = 0;
let sws = 0;
(function parcourir(dossier) {
  for (const nom of fs.readdirSync(dossier)) {
    const plein = path.join(dossier, nom);
    const rel = path.relative(DOCS, plein).split(path.sep).join('/');
    if (fs.statSync(plein).isDirectory()) { parcourir(plein); continue; }
    let contenu = null;
    if (nom.endsWith('.html')) {
      const cible = '/' + (nom === 'index.html' ? rel.slice(0, -'index.html'.length) : rel);
      contenu = page(cible); pages++;
    } else if (nom === 'sw.js') {
      contenu = swAdieu; sws++;
    }
    if (contenu === null) continue;
    const dest = path.join(SORTIE, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, contenu);
  }
})(DOCS);

// ads.txt / app-ads.txt restent servis ici aussi (AdSense / AdMob les lisent à l'ancienne adresse).
for (const f of ['ads.txt', 'app-ads.txt']) {
  if (fs.existsSync(path.join(DOCS, f))) fs.copyFileSync(path.join(DOCS, f), path.join(SORTIE, f));
}
fs.writeFileSync(path.join(SORTIE, '404.html'), page404);
fs.writeFileSync(path.join(SORTIE, '.nojekyll'), '');
fs.writeFileSync(path.join(SORTIE, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${NOUVEAU}/sitemap.xml\n`);
console.log(`Redirection prête dans ${SORTIE} : ${pages} pages, ${sws} service workers retirés.`);
