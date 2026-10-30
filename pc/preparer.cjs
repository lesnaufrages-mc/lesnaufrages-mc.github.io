// Prépare le dossier app/ de la version PC à partir du jeu en ligne (docs/strategie).
// Lancé tout seul par « npm start » et « npm run build » : le jeu PC reste toujours
// identique au jeu du site, il n'y a qu'un seul code à modifier.
// Ce qui change pour le PC : pas de pub AdSense, pas de compteur de visites,
// three.js inclus (marche sans internet), boutons Quitter et Plein écran.
const fs = require('fs');
const path = require('path');

const ICI = __dirname;
const SOURCE = path.join(ICI, '..', 'docs', 'strategie');
const APP = path.join(ICI, 'app');
const SITE = 'https://lesnaufrages-mc.github.io';

fs.rmSync(APP, { recursive: true, force: true });
fs.mkdirSync(path.join(APP, 'vendor'), { recursive: true });

// 1. Fichiers du jeu (sauf ceux de l'appli web installable, inutiles ici).
const IGNORES = ['sw.js', 'manifest.webmanifest'];
for (const f of fs.readdirSync(SOURCE)) {
  // Les dossiers (ex. tableaux/ : les vrais portraits) sont copiés avec tout leur contenu.
  if (!IGNORES.includes(f)) fs.cpSync(path.join(SOURCE, f), path.join(APP, f), { recursive: true });
}
fs.copyFileSync(path.join(ICI, 'pc.js'), path.join(APP, 'pc.js'));
// Sous Windows, git peut fournir des fins de ligne \r\n : on remet des \n pour que
// les remplacements ci-dessous trouvent leurs lignes partout.
for (const f of ['index.html', 'jeu.js', 'couronne-ui.js']) {
  const p = path.join(APP, f);
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'));
}

// 2. Bibliothèques incluses dans le jeu au lieu d'être chargées sur internet.
const mod = (p) => require.resolve(p, { paths: [ICI] });
fs.copyFileSync(mod('three/build/three.min.js'), path.join(APP, 'vendor', 'three.min.js'));
// Les polices (Cinzel…) sont déjà dans docs/strategie/polices/ : copiées avec le jeu.

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
  [ligne(/<script src="\.\.\/supabase-config\.js"><\/script>\n/, 'supabase-config'), '', 'supabase-config'],
  [ligne(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase[^>]*><\/script>\n/, 'supabase'), '', 'supabase'],
  [ligne(/<script src="\.\.\/sauvegarde\.js"[^>]*><\/script>\n/, 'sauvegarde'), '', 'sauvegarde en ligne'],
  [ligne(/<script src="https:\/\/cdnjs\.cloudflare\.com[^"]*three\.min\.js"><\/script>/, 'three.js'), '<script src="vendor/three.min.js"></script>', 'three.js'],
  [ligne(/<script src="\.\.\/site\.js"[^>]*><\/script>/, 'site.js'), '<script src="pc.js"></script>', 'site.js'],
  ['<link rel="icon" href="../icon.png">', '<link rel="icon" href="icone-192.png">', 'icône'],
  ['<a href="../conditions.html">', '<a href="' + SITE + '/conditions.html" target="_blank">', 'lien Conditions'],
  ['<a href="../confidentialite.html">', '<a href="' + SITE + '/confidentialite.html" target="_blank">', 'lien Confidentialité'],
  ['<a href="../cookies.html" data-cookies>', '<a href="' + SITE + '/cookies.html" target="_blank">', 'lien Cookies'],
  ['<a href="../">← Retour au site</a>', '<a href="#" id="bPleinEcran">⛶ Plein écran (F11)</a> · <a href="#" id="bQuitter">✖ Quitter</a>', 'lien Retour au site']
]);

remplacer('jeu.js', [
  ['href="../forum/"', `href="${SITE}/forum/" target="_blank" rel="noopener"`, 'liens forum'],
  [ligneJeu(/\['Peut-on le télécharger \?'.*\],\n/), "['Le jeu marche sans internet ?', 'Oui ! Toute la campagne et les batailles en 3D marchent hors ligne. Touche F11 pour passer en plein écran.'],\n", 'FAQ téléchargement']
]);

// L'Édition Couronne est incluse dans la version PC (le jeu Steam est payant) : couronne.js la débloque
// toute seule (window.imperiumPC). Le seul lien vers la page d'achat ouvre le site dans le navigateur.
remplacer('couronne-ui.js', [
  ["var PAGE = '../couronne/';", `var PAGE = '${SITE}/couronne/';`, 'page de l\'Édition Couronne']
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
