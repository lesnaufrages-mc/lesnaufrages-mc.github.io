// Prépare le dossier app/ de la version PC à partir du jeu en ligne (docs/strategie).
// Lancé tout seul par « npm start » et « npm run build » : le jeu PC reste toujours
// identique au jeu du site, il n'y a qu'un seul code à modifier.
// Ce qui change pour le PC : pas de pub AdSense, pas de compteur de visites,
// three.js et la police Cinzel inclus (marche sans internet), boutons Quitter et Plein écran.
const fs = require('fs');
const path = require('path');

const ICI = __dirname;
const SOURCE = path.join(ICI, '..', 'docs', 'strategie');
const APP = path.join(ICI, 'app');
const SITE = 'https://lesnaufrages-mc.github.io';

fs.rmSync(APP, { recursive: true, force: true });
fs.mkdirSync(path.join(APP, 'vendor', 'fonts'), { recursive: true });

// 1. Fichiers du jeu (sauf ceux de l'appli web installable, inutiles ici).
const IGNORES = ['sw.js', 'manifest.webmanifest'];
for (const f of fs.readdirSync(SOURCE)) {
  if (!IGNORES.includes(f)) fs.copyFileSync(path.join(SOURCE, f), path.join(APP, f));
}
fs.copyFileSync(path.join(ICI, 'pc.js'), path.join(APP, 'pc.js'));

// 2. Bibliothèques incluses dans le jeu au lieu d'être chargées sur internet.
const mod = (p) => require.resolve(p, { paths: [ICI] });
fs.copyFileSync(mod('three/build/three.min.js'), path.join(APP, 'vendor', 'three.min.js'));
const cinzel = path.dirname(mod('@fontsource/cinzel/package.json'));
let css = '';
for (const poids of [700, 900]) {
  const nom = `cinzel-latin-${poids}-normal.woff2`;
  fs.copyFileSync(path.join(cinzel, 'files', nom), path.join(APP, 'vendor', 'fonts', nom));
  css += `@font-face{font-family:Cinzel;font-style:normal;font-weight:${poids};font-display:swap;src:url(fonts/${nom}) format("woff2")}\n`;
}
fs.writeFileSync(path.join(APP, 'vendor', 'cinzel.css'), css);

// 3. Icône de l'exécutable.
fs.mkdirSync(path.join(ICI, 'build'), { recursive: true });
fs.copyFileSync(path.join(SOURCE, 'icone-512.png'), path.join(ICI, 'build', 'icon.png'));

// 4. Page du jeu adaptée au PC. Chaque remplacement doit trouver son texte :
// sinon on s'arrête, pour ne jamais sortir une version PC à moitié adaptée.
function remplacer(fichier, regles) {
  const p = path.join(APP, fichier);
  let txt = fs.readFileSync(p, 'utf8');
  for (const [avant, apres, nom] of regles) {
    const n = txt.split(avant).length - 1;
    if (n === 0) throw new Error(`preparer.cjs : « ${nom} » introuvable dans ${fichier}. Le jeu a changé : mets à jour preparer.cjs.`);
    txt = txt.split(avant).join(apres);
  }
  fs.writeFileSync(p, txt);
}

const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
const ligne = (re, nom) => {
  const m = html.match(re);
  if (!m) throw new Error(`preparer.cjs : ligne « ${nom} » introuvable dans index.html.`);
  return m[0];
};

remplacer('index.html', [
  [ligne(/<script[^>]*adsbygoogle[^>]*><\/script>\n/, 'pub AdSense'), '', 'pub AdSense'],
  [ligne(/<link rel="manifest"[^>]*>\n/, 'manifest'), '', 'manifest'],
  [ligne(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n/, 'preconnect'), '', 'preconnect polices'],
  [ligne(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, 'police Cinzel'), '<link href="vendor/cinzel.css" rel="stylesheet">', 'police Cinzel'],
  [ligne(/<script src="\.\.\/supabase-config\.js"><\/script>\n/, 'supabase-config'), '', 'supabase-config'],
  [ligne(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase[^>]*><\/script>\n/, 'supabase'), '', 'supabase'],
  [ligne(/<script src="https:\/\/cdnjs\.cloudflare\.com[^"]*three\.min\.js"><\/script>/, 'three.js'), '<script src="vendor/three.min.js"></script>', 'three.js'],
  [ligne(/<script src="\.\.\/site\.js"[^>]*><\/script>/, 'site.js'), '<script src="pc.js"></script>', 'site.js'],
  ['<link rel="icon" href="../icon.png">', '<link rel="icon" href="icone-192.png">', 'icône'],
  ['<a href="../">← Retour au site</a>', '<a href="#" id="bPleinEcran">⛶ Plein écran (F11)</a> · <a href="#" id="bQuitter">✖ Quitter</a>', 'lien Retour au site']
]);

remplacer('jeu.js', [
  ['href="../forum/"', `href="${SITE}/forum/" target="_blank" rel="noopener"`, 'liens forum'],
  [ligneJeu(/\['Peut-on le télécharger \?'.*\],\n/), "['Le jeu marche sans internet ?', 'Oui ! Toute la campagne et les batailles en 3D marchent hors ligne. Touche F11 pour passer en plein écran.'],\n", 'FAQ téléchargement']
]);

function ligneJeu(re) {
  const m = fs.readFileSync(path.join(APP, 'jeu.js'), 'utf8').match(re);
  if (!m) throw new Error('preparer.cjs : question « Peut-on le télécharger ? » introuvable dans jeu.js.');
  return m[0];
}

// 5. Plus aucune adresse internet ne doit être chargée au démarrage.
const final = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
const restes = final.match(/<(script|link)[^>]+(src|href)="(https?:)?\/\/[^"]+"/g);
if (restes) throw new Error('preparer.cjs : la page charge encore internet : ' + restes.join(', '));

console.log('Version PC prête dans pc/app/ (' + fs.readdirSync(APP).length + ' fichiers).');
