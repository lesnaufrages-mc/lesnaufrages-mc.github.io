/* Fabrique la vraie carte du jeu de stratégie (docs/strategie/monde.js).
   Données géographiques : Natural Earth via le paquet npm « world-atlas » (domaine public).
   Lancer : npm i --no-save world-atlas@2 topojson-client@3 && node scripts/carte-monde.cjs */
const fs = require('fs');
const path = require('path');
const topo = require('topojson-client');
const atlas = require('world-atlas/land-50m.json');

// Cadre : Europe, Afrique du Nord, Moyen-Orient.
const LON0 = -11, LON1 = 52, LAT0 = 24, LAT1 = 62;
const K = 22.8, COS = Math.cos(46 * Math.PI / 180);
const L = Math.round((LON1 - LON0) * K * COS), H = Math.round((LAT1 - LAT0) * K);
const proj = ([lon, lat]) => [(lon - LON0) * K * COS, (LAT1 - lat) * K];

// [clé, nom, longitude, latitude]
const PROVINCES = [
  ['lisbonne', 'Lisbonne', -9.1, 38.9], ['compostelle', 'Galice', -8.0, 42.6], ['leon', 'León', -5.6, 42.2],
  ['tolede', 'Tolède', -4.0, 39.8], ['cordoue', 'Cordoue', -5.0, 37.9], ['grenade', 'Grenade', -3.2, 37.1],
  ['valence', 'Valence', -0.9, 39.3], ['saragosse', 'Saragosse', -0.9, 41.6], ['barcelone', 'Barcelone', 1.8, 41.7],
  ['pampelune', 'Navarre', -2.4, 42.9],
  ['paris', 'Paris', 2.35, 48.85], ['rouen', 'Normandie', 0.4, 49.1], ['rennes', 'Bretagne', -2.6, 48.1],
  ['bordeaux', 'Aquitaine', -0.4, 44.6], ['toulouse', 'Toulouse', 1.6, 43.7], ['marseille', 'Provence', 5.8, 43.6],
  ['lyon', 'Lyon', 4.6, 45.6], ['dijon', 'Bourgogne', 4.9, 47.3], ['orleans', 'Orléans', 1.6, 47.4],
  ['metz', 'Lorraine', 6.2, 48.9], ['bruges', 'Flandre', 3.6, 50.9],
  ['londres', 'Londres', -0.6, 51.6], ['york', 'York', -1.4, 54.0], ['edimbourg', 'Écosse', -3.8, 56.3],
  ['dublin', 'Irlande', -7.6, 53.2], ['galles', 'Pays de Galles', -3.7, 52.3],
  ['amsterdam', 'Hollande', 5.4, 52.2], ['cologne', 'Cologne', 7.4, 50.8], ['hambourg', 'Hambourg', 9.8, 53.4],
  ['francfort', 'Francfort', 9.2, 49.9], ['baviere', 'Bavière', 11.8, 48.3], ['saxe', 'Saxe', 12.2, 51.2],
  ['berlin', 'Brandebourg', 13.6, 52.6], ['vienne', 'Vienne', 15.9, 47.9], ['prague', 'Bohême', 14.6, 49.9],
  ['suisse', 'Suisse', 8.2, 46.8],
  ['milan', 'Milan', 9.3, 45.4], ['venise', 'Venise', 12.0, 45.7], ['genes', 'Gênes', 8.6, 44.5],
  ['florence', 'Florence', 11.2, 43.5], ['rome', 'Rome', 12.9, 42.2], ['naples', 'Naples', 15.2, 40.7],
  ['palerme', 'Sicile', 14.0, 37.6], ['sardaigne', 'Sardaigne', 9.0, 40.0], ['corse', 'Corse', 9.1, 42.1],
  ['copenhague', 'Danemark', 9.6, 55.9], ['oslo', 'Norvège', 9.5, 60.3], ['stockholm', 'Suède', 16.5, 59.6],
  ['gothie', 'Gothie', 14.2, 57.0],
  ['dantzig', 'Prusse', 19.6, 54.0], ['cracovie', 'Cracovie', 20.0, 50.1], ['varsovie', 'Mazovie', 21.2, 52.3],
  ['vilnius', 'Lituanie', 25.0, 54.9], ['riga', 'Livonie', 25.2, 57.2], ['novgorod', 'Novgorod', 31.3, 58.5],
  ['moscou', 'Moscou', 37.6, 55.8], ['kiev', 'Kiev', 30.5, 50.4], ['smolensk', 'Smolensk', 32.0, 54.8],
  ['riazan', 'Riazan', 40.5, 54.0], ['tver', 'Vladimir', 40.4, 56.9], ['volga', 'Volga', 46.0, 51.8],
  ['don', 'Don', 39.6, 48.2], ['galicie', 'Galicie', 24.0, 49.7],
  ['bude', 'Hongrie', 19.4, 47.4], ['croatie', 'Croatie', 16.0, 45.4], ['belgrade', 'Serbie', 20.8, 43.9],
  ['transylvanie', 'Transylvanie', 24.0, 46.6], ['valachie', 'Valachie', 25.6, 44.6], ['moldavie', 'Moldavie', 27.6, 47.2],
  ['bulgarie', 'Bulgarie', 24.4, 42.8], ['constantinople', 'Constantinople', 28.0, 41.3],
  ['thessalonique', 'Thessalonique', 22.6, 40.7], ['athenes', 'Grèce', 22.4, 38.2], ['raguse', 'Bosnie', 18.4, 43.6],
  ['crimee', 'Crimée', 34.1, 45.1], ['steppe', 'Steppe pontique', 33.5, 47.3],
  ['brousse', 'Bithynie', 30.0, 40.0], ['ankara', 'Ankara', 33.3, 40.0], ['konya', 'Konya', 32.5, 37.9],
  ['smyrne', 'Smyrne', 28.0, 38.3], ['trebizonde', 'Trébizonde', 39.3, 40.6], ['armenie', 'Arménie', 42.5, 39.6],
  ['antioche', 'Antioche', 36.8, 36.4], ['damas', 'Damas', 36.6, 33.6], ['jerusalem', 'Jérusalem', 35.2, 31.6],
  ['bagdad', 'Bagdad', 44.4, 33.3], ['mossoul', 'Mossoul', 43.1, 36.3], ['tbilissi', 'Géorgie', 44.2, 42.0],
  ['tabriz', 'Tabriz', 46.8, 38.3], ['ispahan', 'Perse', 50.5, 33.3], ['bassora', 'Bassora', 47.0, 30.8],
  ['medine', 'Hedjaz', 38.5, 26.5], ['nedjd', 'Arabie', 44.5, 27.5],
  ['alexandrie', 'Alexandrie', 29.0, 30.9], ['caire', 'Le Caire', 31.6, 29.5], ['tripoli', 'Tripoli', 13.6, 31.6],
  ['cyrene', 'Cyrénaïque', 21.0, 31.6], ['tunis', 'Tunis', 9.6, 35.6], ['alger', 'Alger', 3.3, 35.6],
  ['tlemcen', 'Tlemcen', -1.0, 34.0], ['fes', 'Fès', -4.8, 33.6], ['marrakech', 'Marrakech', -8.0, 31.0],
  ['chypre', 'Chypre', 33.2, 35.1], ['crete', 'Crète', 24.9, 35.25]
];

// ---------- Outils géométriques ----------
function couperDemiPlan(poly, a, b, c) { // garde a·x + b·y <= c
  const res = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const fp = a * p[0] + b * p[1] - c, fq = a * q[0] + b * q[1] - c;
    if (fp <= 0) res.push(p);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
      const k = fp / (fp - fq);
      res.push([p[0] + k * (q[0] - p[0]), p[1] + k * (q[1] - p[1])]);
    }
  }
  return res;
}
function couperConvexe(sujet, convexe) { // sujet quelconque, coupé par un polygone convexe (sens horaire écran)
  let res = sujet;
  for (let i = 0; i < convexe.length && res.length; i++) {
    const p = convexe[i], q = convexe[(i + 1) % convexe.length];
    // côté intérieur = à droite de p→q en coordonnées écran (y vers le bas) pour un polygone horaire
    const a = -(q[1] - p[1]), b = q[0] - p[0];
    res = couperDemiPlan(res, -a, -b, -(a * p[0] + b * p[1]));
  }
  return res;
}
function aire(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; s += p[0] * q[1] - q[0] * p[1]; }
  return s / 2;
}
function orienter(poly) { return aire(poly) < 0 ? poly.slice().reverse() : poly; } // aire > 0 = horaire à l'écran
function simplifier(pts, tol) { // Douglas-Peucker sur un anneau fermé
  if (pts.length < 8) return pts;
  function dp(a, b, out) {
    let max = 0, idx = -1;
    const [x1, y1] = pts[a], [x2, y2] = pts[b], dx = x2 - x1, dy = y2 - y1, n = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / n;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol) { dp(a, idx, out); out.push(pts[idx]); dp(idx, b, out); }
  }
  const mid = Math.floor(pts.length / 2), out = [pts[0]];
  dp(0, mid, out); out.push(pts[mid]); dp(mid, pts.length - 1, out); out.push(pts[pts.length - 1]);
  return out;
}
const r1 = (v) => Math.round(v * 10) / 10;
function chemin(polys) {
  return polys.map((p) => 'M' + p.map((q) => r1(q[0]) + ' ' + r1(q[1])).join('L') + 'Z').join('');
}

// ---------- Terres ----------
const terre = topo.feature(atlas, atlas.objects.land);
const cadre = [[0, 0], [L, 0], [L, H], [0, H]];
let terres = [];
terre.features.forEach((f) => {
  const g = f.geometry;
  const multi = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  multi.forEach((poly) => {
    const anneau = poly[0];
    if (!anneau.some(([lo, la]) => lo > LON0 - 5 && lo < LON1 + 5 && la > LAT0 - 5 && la < LAT1 + 5)) return;
    let p = orienter(anneau.map(proj));
    p = couperConvexe(p, cadre);
    if (p.length < 3 || Math.abs(aire(p)) < 6) return;
    terres.push(simplifier(p, 0.9));
  });
});
terres = terres.filter((p) => p.length >= 3);

// ---------- Provinces (Voronoï limité à un rayon, découpé par les terres) ----------
const sites = PROVINCES.map(([id, nom, lo, la]) => { const [x, y] = proj([lo, la]); return { id, nom, x, y }; });
const RAYON = 115;
sites.forEach((s) => {
  let cell = cadre.slice();
  sites.forEach((o) => {
    if (o === s) return;
    const a = o.x - s.x, b = o.y - s.y;
    cell = couperDemiPlan(cell, a, b, (a * (o.x + s.x) + b * (o.y + s.y)) / 2);
  });
  s.cellule = cell;
  const cercle = [];
  for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2; cercle.push([s.x + Math.cos(t) * RAYON, s.y + Math.sin(t) * RAYON]); }
  let limite = orienter(cell);
  limite = couperConvexe(orienter(cercle), limite);
  limite = orienter(limite);
  s.morceaux = [];
  terres.forEach((t) => {
    const m = couperConvexe(t, limite);
    if (m.length >= 3 && Math.abs(aire(m)) > 4) s.morceaux.push(m);
  });
  if (!s.morceaux.length) console.warn('Province sans terre :', s.id);
});

// Voisins : frontière terrestre commune, ou bras de mer court (traversée en bateau).
function surMediatrice(s, o, pt) {
  const a = o.x - s.x, b = o.y - s.y, n = Math.hypot(a, b);
  return Math.abs(a * pt[0] + b * pt[1] - (a * (o.x + s.x) + b * (o.y + s.y)) / 2) / n < 0.05;
}
function frontiereTerre(s, o) {
  const pa = [].concat(...s.morceaux).filter((p) => surMediatrice(s, o, p));
  const pb = [].concat(...o.morceaux).filter((p) => surMediatrice(s, o, p));
  let best = 0;
  pa.forEach((p) => pb.forEach((q) => { if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.5) best++; }));
  return best >= 2;
}
function voisinsVoronoi(s, o) {
  const a = o.x - s.x, b = o.y - s.y, n = Math.hypot(a, b);
  const c = (a * (o.x + s.x) + b * (o.y + s.y)) / 2;
  return s.cellule.filter((p) => Math.abs(a * p[0] + b * p[1] - c) / n < 0.01).length >= 2;
}
const MER = 95;
const AJOUTS = [['tunis', 'palerme'], ['constantinople', 'brousse'], ['copenhague', 'gothie'], ['londres', 'bruges'],
  ['grenade', 'fes'], ['crete', 'athenes'], ['chypre', 'antioche'], ['crimee', 'steppe'], ['dublin', 'galles']];
const RETRAITS = [['don', 'trebizonde']];
sites.forEach((s) => { s.voisins = new Set(); });
sites.forEach((s, i) => sites.forEach((o, j) => {
  if (j <= i || !voisinsVoronoi(s, o)) return;
  const d = Math.hypot(s.x - o.x, s.y - o.y);
  if (frontiereTerre(s, o) || d < MER) { s.voisins.add(j); o.voisins.add(i); }
}));
const idx = Object.fromEntries(sites.map((s, i) => [s.id, i]));
AJOUTS.forEach(([a, b]) => { sites[idx[a]].voisins.add(idx[b]); sites[idx[b]].voisins.add(idx[a]); });
RETRAITS.forEach(([a, b]) => { sites[idx[a]].voisins.delete(idx[b]); sites[idx[b]].voisins.delete(idx[a]); });

const sortie = {
  largeur: L, hauteur: H,
  terre: chemin(terres),
  provinces: sites.map((s) => ({
    id: s.id, nom: s.nom, x: r1(s.x), y: r1(s.y),
    d: chemin(s.morceaux.map((m) => simplifier(m, 0.6))),
    voisins: [...s.voisins].sort((a, b) => a - b)
  }))
};
const fichier = path.join(__dirname, '..', 'docs', 'strategie', 'monde.js');
fs.writeFileSync(fichier, '/* Carte générée par scripts/carte-monde.cjs — ne pas modifier à la main. Données : Natural Earth. */\n' +
  'var MONDE = ' + JSON.stringify(sortie) + ';\nif (typeof module !== \'undefined\') module.exports = MONDE;\n');
console.log('OK', L + 'x' + H, sites.length, 'provinces,', (fs.statSync(fichier).size / 1024).toFixed(0) + ' Ko');
sites.forEach((s) => console.log(s.id.padEnd(15), [...s.voisins].map((v) => sites[v].id).join(' ')));
