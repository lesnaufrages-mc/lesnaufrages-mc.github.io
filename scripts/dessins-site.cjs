/* Dessine les images en pixel art du site (docs/img/) : l'île des Naufragés et les petites icônes.
   Tout est généré ici pour pouvoir retoucher les dessins sans logiciel.
   Lancer : node scripts/dessins-site.cjs */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'docs', 'img');
fs.mkdirSync(path.join(OUT, 'ico'), { recursive: true });

// Palette commune (la même que dans docs/style.css).
const C = {
  sable: '#e3c98f', sable2: '#c4a468', sable3: '#9c7f4b',
  mer: '#123f4a', mer2: '#0e3039', mer3: '#0a242b', ecume: '#4f9aa0', ecume2: '#2c6b73',
  feuille: '#3aa757', feuille2: '#24733a', tronc: '#8a5a35', tronc2: '#5f3b20',
  coque: '#5a3a22', coque2: '#3b2414', voile: '#ece0c4', voile2: '#c9b994',
  lune: '#f1e6c8', etoile: '#cfd8d6', caisse: '#a8743f', caisse2: '#6e4724',
  rouge: '#d9774b', gris: '#8fa3a3', blanc: '#f6f0e1', noir: '#0d1b21',
};

// Transforme une grille { "x,y": couleur } en SVG compact (bandes horizontales).
function versSvg(px, w, h, attrs = '') {
  const parCouleur = {};
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const c = px[x + ',' + y];
      if (!c) { x++; continue; }
      let n = 1;
      while (x + n < w && px[(x + n) + ',' + y] === c) n++;
      (parCouleur[c] = parCouleur[c] || []).push(`M${x} ${y}h${n}v1h-${n}z`);
      x += n;
    }
  }
  const chemins = Object.entries(parCouleur).map(([c, d]) => `<path fill="${c}" d="${d.join('')}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges"${attrs}>${chemins}</svg>\n`;
}

// ---------- L'île (192 × 48) ----------
const W = 192, H = 48, MER = 34;
const ile = {};
const pose = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) ile[x + ',' + y] = c; };
const rect = (x, y, w, h, c) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) pose(x + i, y + j, c); };

// Étoiles et lune
[[12, 16], [31, 22], [47, 14], [83, 19], [101, 13], [122, 21], [151, 15], [181, 24], [8, 26], [97, 27]].forEach(([x, y]) => pose(x, y, C.etoile));
for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
  const d = Math.hypot(x - 4, y - 4);
  if (d < 4.3) pose(160 + x, 13 + y, Math.hypot(x - 2.5, y - 3) < 2.2 ? C.lune : C.voile);
}

// Mer : trois bandes, avec des vagues qui se décalent d'une ligne à l'autre
for (let y = MER; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y - MER;
  pose(x, y, p < 4 ? C.mer : p < 9 ? C.mer2 : C.mer3);
  const v = (x + p * 7) % 23;
  if (p % 3 === 0 && v < (p < 4 ? 4 : 2)) pose(x, y, p < 4 ? C.ecume : C.ecume2);
}

// L'île : un dôme de sable, ombré à droite
const CX = 56, LARG = 30;
for (let x = -LARG; x <= LARG; x++) {
  const haut = Math.round(5.5 * Math.cos((x / LARG) * Math.PI / 2) ** 0.8);
  for (let j = 0; j <= haut; j++) pose(CX + x, MER - j, x > LARG * 0.35 ? C.sable2 : C.sable);
  if (haut > 0 && x > -LARG + 3 && x < LARG - 3 && x % 5 === 0) pose(CX + x, MER - haut + 1, C.sable2);
}
for (let x = -LARG - 2; x <= LARG + 2; x++) if ((x + 3) % 4 < 2) pose(CX + x, MER, C.ecume);
rect(CX - 14, MER - 4, 3, 1, C.sable3); // galets

// Palmier : tronc courbé + palmes
const tronc = [[0, 0], [0, -1], [1, -2], [1, -3], [1, -4], [2, -5], [2, -6], [2, -7], [3, -8], [3, -9], [3, -10], [4, -11], [4, -12], [5, -13], [5, -14]];
const PX = CX - 6, PY = MER - 5;
tronc.forEach(([x, y], i) => { pose(PX + x, PY + y, i % 3 === 0 ? C.tronc2 : C.tronc); pose(PX + x + 1, PY + y, C.tronc2); });
const palmes = [
  [-1, 0], [-2, 0], [-3, 1], [-4, 1], [-5, 2], [-6, 3], [-7, 4],
  [1, -1], [2, -1], [3, -1], [4, -1], [5, 0], [6, 0], [7, 1], [8, 2], [9, 3],
  [0, -1], [-1, -2], [-2, -2], [-3, -3], [-4, -3], [-5, -3],
  [1, 0], [2, 1], [3, 2], [3, 3], [4, 4],
  [-1, 1], [-2, 2], [-2, 3], [-3, 4],
  [2, -2], [3, -3], [5, -3], [6, -2], [4, -3],
];
const TX = PX + 5, TY = PY - 15;
palmes.forEach(([x, y], i) => { pose(TX + x, TY + y, i % 4 === 0 ? C.feuille2 : C.feuille); pose(TX + x, TY + y + 1, C.feuille2); });
rect(TX, TY + 1, 2, 2, C.coque2); // noix de coco

// Feu de camp + petit panneau
rect(CX + 8, MER - 6, 4, 1, C.tronc2);
pose(CX + 9, MER - 7, C.rouge); pose(CX + 10, MER - 7, C.sable); pose(CX + 10, MER - 8, C.rouge);
rect(CX - 20, MER - 9, 1, 5, C.tronc2); rect(CX - 23, MER - 10, 7, 3, C.tronc);

// Caisse qui flotte
rect(104, MER - 3, 6, 6, C.caisse); rect(104, MER - 3, 6, 1, C.caisse2); rect(104, MER + 2, 6, 1, C.caisse2);
rect(104, MER - 3, 1, 6, C.caisse2); rect(109, MER - 3, 1, 6, C.caisse2); rect(106, MER - 1, 2, 2, C.caisse2);
rect(104, MER + 1, 6, 2, C.mer); rect(103, MER + 1, 1, 1, C.ecume); rect(110, MER + 1, 1, 1, C.ecume);

// L'épave : coque penchée, mât cassé, voile déchirée
const EX = 138;
for (let x = 0; x < 34; x++) {
  const pente = Math.floor(x / 6);
  const bord = MER - 6 + pente;
  for (let y = bord; y < MER + 2; y++) pose(EX + x, y, y === bord ? C.coque2 : (x + y) % 7 === 0 ? C.coque2 : C.coque);
}
for (let x = 2; x < 30; x += 7) rect(EX + x, MER - 4 + Math.floor(x / 6), 2, 1, C.noir); // hublots
rect(EX + 12, MER - 25, 2, 21, C.coque2);
rect(EX + 6, MER - 22, 14, 1, C.coque2);
for (let j = 0; j < 12; j++) {
  const g = 7 + Math.floor(j / 4), d = 19 - (j > 7 ? j - 7 : 0) - (j === 5 ? 3 : 0);
  for (let x = g; x <= d; x++) if (x !== 12 && x !== 13) pose(EX + x, MER - 21 + j, (x + j) % 5 === 0 ? C.voile2 : C.voile);
}
rect(EX + 12, MER - 27, 5, 2, C.rouge); // fanion
for (let x = -2; x < 36; x++) if ((x + 1) % 5 < 2) pose(EX + x, MER + 1, C.ecume);

fs.writeFileSync(path.join(OUT, 'ile.svg'), versSvg(ile, W, H, ' preserveAspectRatio="xMidYMax meet"'));

// ---------- Icônes 12 × 12 ----------
// Une lettre = une couleur. « . » = vide.
const L = { s: C.sable, S: C.sable2, b: C.tronc, B: C.tronc2, v: C.feuille, V: C.feuille2, r: C.rouge, g: C.gris, w: C.blanc, m: C.ecume, M: C.mer, n: C.noir, j: '#e2b93b', c: C.caisse };
const ICONES = {
  calendrier: [
    '..r......r..', '.rrrrrrrrrr.', '.rrrrrrrrrr.', '.wwwwwwwwww.', '.wnnwwnnwnw.', '.wwwwwwwwww.',
    '.wnnwvvwnnw.', '.wwwvvwwwww.', '.wnnwwnnwnw.', '.wwwwwwwwww.', '.wwwwwwwwww.', '............'],
  flamme: [
    '.....r......', '.....rr.....', '....rrr.....', '...rrjr..r..', '...rjjrr.rr.', '..rrjjjrrrr.',
    '..rjjjjjrrr.', '.rrjjwjjjrr.', '.rjjwwwjjjr.', '.rjjwwwwjjr.', '..rjjwwjjr..', '...rrrrrr...'],
  bouteille: [
    '.....bb.....', '.....bb.....', '.....mm.....', '....mmmm....', '...mmmmmm...', '...mwwwwm...',
    '...mwsswm...', '...mwwwwm...', '...mwsswm...', '...mwwwwm...', '...mmmmmm...', '............'],
  film: [
    '............', 'nnnnnnnnnnnn', 'nwnwnwnwnwnn', 'nnnnnnnnnnnn', 'nmmmmmmmmmmn', 'nmmmmwwmmmmn',
    'nmmmmwwwmmmn', 'nmmmmwwmmmmn', 'nnnnnnnnnnnn', 'nwnwnwnwnwnn', 'nnnnnnnnnnnn', '............'],
  lettres: [
    '............', 'vvvvv.jjjjj.', 'vwwwv.jwwwj.', 'vwvwv.jwjjj.', 'vwwwv.jwwwj.', 'vwvwv.jjjwj.',
    'vvvvv.jwwwj.', '......jjjjj.', 'ggggg.......', 'gwgwg.......', 'gwwwg.......', 'ggggg.......'],
  cadenas: [
    '....gggg....', '...g....g...', '..g......g..', '..g......g..', '..g......g..', '.ssssssssss.',
    '.sSSSSSSSSs.', '.sSSSnnSSSs.', '.sSSSnnSSSs.', '.sSSSSnSSSs.', '.sSSSSSSSSs.', '.ssssssssss.'],
  epees: [
    'g.........g.', 'wg.......gw.', '.wg.....gw..', '..wg...gw...', '...wg.gw....', '....wgw.....',
    '....gwg.....', '...gw.wg....', '.bjg...gjb..', '.bb.....bb..', 'b.........b.', '............'],
  piece: [
    '...jjjjj....', '..jSSSSSj...', '.jSjjjjjSj..', '.jSjjSjjSj..', '.jSjSSSjSj..', '.jSjjSjjSj..',
    '.jSjSSSjSj..', '.jSjjSjjSj..', '.jSjjjjjSj..', '..jSSSSSj...', '...jjjjj....', '............'],
  cadeau: [
    '...rr..rr...', '..r..rr..r..', '...rrrrrr...', '.cccccrcccc.', '.cccccrcccc.', '.rrrrrrrrrr.',
    '..cccrrccc..', '..cccrrccc..', '..cccrrccc..', '..cccrrccc..', '..cccrrccc..', '..cccccccc..'],
  camera: [
    '............', '.......gggg.', '.ggggg.gggg.', 'gggggggggggg', 'gwwwwwwwwwgg', 'gwwmmmmwwggg',
    'gwwmMMmwwggg', 'gwwmMMmwwggg', 'gwwmmmmwwggg', 'gwwwwwwwwwgg', 'gggggggggggg', '............'],
  bouclier: [
    '.mmmmmmmmmm.', '.mwwwwmMMMm.', '.mwwwwmMMMm.', '.mwwwwmMMMm.', '.mmmmmmmmmm.', '.mMMMmwwwwm.',
    '.mMMMmwwwwm.', '..mMMmwwwm..', '..mMMmwwwm..', '...mmmmmm...', '....mmmm....', '.....mm.....'],
  feu: [
    '.....r......', '....rr.r....', '....rjrr....', '...rjjjr....', '...rjwjr.r..', '..rjjwjjrr..',
    '..rjwwwjr...', '...rjwjr....', '.BbbbbbbbbB.', 'bBbBBBBBbBbb', '.b........b.', '............'],
  piece_puzzle: [
    '.....vv.....', '....vvvv....', '.vvvvvvvvvv.', '.vVVVVVVVVv.', '.vVVVVVVVVvv', '.vVVVVVVVVvv',
    '.vVVVVVVVVv.', '.vVVVVVVVVv.', '.vvvv..vvvv.', '....vvvv....', '............', '............'],
  trophee: [
    '.jjjjjjjjjj.', 'jjjjjjjjjjjj', 'j.jjjjjjjj.j', 'j.jjjwjjjj.j', '.jjjjwjjjjj.', '..jjjjjjjj..',
    '...jjjjjj...', '.....jj.....', '.....jj.....', '....jjjj....', '...bbbbbb...', '...bbbbbb...'],
  main: [
    '...s.s.s....', '...s.s.s.s..', '...s.s.s.s..', '...sssssss..', 's..sssssss..', 'ss.sssssss..',
    '.sssssssss..', '..sssssSss..', '..ssssSsss..', '...sssssss..', '....sssss...', '............'],
};
for (const [nom, lignes] of Object.entries(ICONES)) {
  const px = {};
  lignes.forEach((ligne, y) => [...ligne].forEach((ch, x) => { if (L[ch]) px[x + ',' + y] = L[ch]; }));
  fs.writeFileSync(path.join(OUT, 'ico', nom + '.svg'), versSvg(px, 12, 12));
}
console.log('Images écrites dans docs/img/');
