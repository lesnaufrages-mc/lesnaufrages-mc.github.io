/* Ferrum et Fides : les villes et les villages en 3D. Tu te promènes, tu parles aux PNJ
   (forgeron, recruteur, marchand, banquier, taverne, cour, quêtes, ancien du village) et aux habitants.
   La ville vit : gardes en patrouille, marchands qui crient, forgeron au travail, enfants, animaux, bruits du marché.
   Le style change selon la région et la religion. */
(function () {
  'use strict';
  var T = window.THREE, M = Moteur;
  var V = null;

  function el(id) { return document.getElementById(id) || { style: {}, classList: { add: function () {}, remove: function () {}, toggle: function () {} } }; }
  function difAngle(a, b) { var d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

  // Monument selon la religion
  function monument(religion, x, z, style) {
    var g = new T.Group(); g.position.set(x, 0, z);
    var pierre = style === 'occident' ? 0xd5ccb8 : style === 'byzance' ? 0xe0c9a6 : 0xf2ead8;
    if (religion === 'catholique') {
      M.boite(8, 7, 12, pierre, g, 0, 3.5, 0);
      var toit = new T.Mesh(new T.ConeGeometry(7.5, 3.5, 4), M.mat(0x5d6d7e)); toit.rotation.y = Math.PI / 4; toit.scale.set(0.75, 1, 1.1); toit.position.y = 8.7; g.add(toit);
      M.boite(3.4, 14, 3.4, pierre, g, 0, 7, 6.5);
      var fl = new T.Mesh(new T.ConeGeometry(2.6, 5, 4), M.mat(0x5d6d7e)); fl.rotation.y = Math.PI / 4; fl.position.set(0, 16.5, 6.5); g.add(fl);
      M.boite(0.3, 2, 0.3, 0xd4ac0d, g, 0, 20, 6.5); M.boite(1.2, 0.3, 0.3, 0xd4ac0d, g, 0, 20.4, 6.5);
      M.boite(2.2, 3.4, 0.2, 0x4e342e, g, 0, 1.7, 8.25);
    } else if (/^(orthodoxe|armenienne|copte|syriaque|maronite|nestorienne)$/.test(religion)) {
      var coupole = religion === 'orthodoxe' || religion === 'copte';
      M.boite(10, 7, 10, pierre, g, 0, 3.5, 0);
      for (var i = -1; i <= 1; i += 2) M.boite(9.6, 0.3, 0.1, 0xa04000, g, 0, 2.5 + i * 1.5, 5.03);
      var dome = coupole ? new T.Mesh(new T.SphereGeometry(4.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.mat(0x5d8aa8)) : new T.Mesh(new T.ConeGeometry(3.6, 4.5, 8), M.mat(0x7b6d5a));
      dome.position.y = coupole ? 7.6 : 9.6;
      var tambour = new T.Mesh(new T.CylinderGeometry(3.6, 3.6, 1.6, 12), M.mat(pierre)); tambour.position.y = 7.6; g.add(tambour);
      dome.position.y += 0.8; g.add(dome);
      M.boite(0.25, 1.6, 0.25, 0xd4ac0d, g, 0, coupole ? 13.5 : 13, 0); M.boite(1, 0.25, 0.25, 0xd4ac0d, g, 0, coupole ? 13.8 : 13.3, 0);
      M.boite(2.2, 3.4, 0.2, 0x4e342e, g, 0, 1.7, 5.05);
    } else if (religion === 'sunnite' || religion === 'chiite') {
      M.boite(11, 6, 11, pierre, g, 0, 3, 0);
      var d2 = new T.Mesh(new T.SphereGeometry(4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.mat(religion === 'chiite' ? 0x2e86c1 : 0x16a085)); d2.position.y = 6; g.add(d2);
      var mi = new T.Mesh(new T.CylinderGeometry(0.9, 1.1, 16, 8), M.mat(pierre)); mi.position.set(6.5, 8, 5); g.add(mi);
      M.boite(2.4, 0.5, 2.4, pierre, g, 6.5, 13, 5);
      var pt = new T.Mesh(new T.ConeGeometry(1, 2.4, 8), M.mat(religion === 'chiite' ? 0x2e86c1 : 0x16a085)); pt.position.set(6.5, 17.2, 5); g.add(pt);
      M.boite(2.4, 3.6, 0.2, 0x5d4037, g, 0, 1.8, 5.55);
      for (var k = -1; k <= 1; k += 2) M.boite(1.2, 2.2, 0.15, 0x1a5276, g, k * 3.2, 3, 5.55, { ombre: false });
    } else if (religion === 'juive' || religion === 'samaritaine') {
      // Synagogue : grande salle, fenêtres rondes, chandelier à sept branches devant
      M.boite(10, 6.5, 10, pierre, g, 0, 3.25, 0);
      M.boite(10.6, 0.5, 10.6, 0x8d6e63, g, 0, 6.75, 0);
      M.boite(2.2, 3.4, 0.2, 0x4e342e, g, 0, 1.7, 5.05);
      var rosace = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 0.2, 14), M.mat(0x5dade2)); rosace.rotation.x = Math.PI / 2; rosace.position.set(0, 4.8, 5.05); g.add(rosace);
      M.boite(0.25, 2.2, 0.25, 0xd4ac0d, g, 3.5, 1.1, 6.5); M.boite(2.6, 0.2, 0.2, 0xd4ac0d, g, 3.5, 2.2, 6.5);
      for (var b7 = 0; b7 < 7; b7++) M.boite(0.15, 0.7, 0.15, 0xd4ac0d, g, 3.5 - 1.2 + b7 * 0.4, 2.6, 6.5);
    } else if (religion === 'druze') {
      // Khalwa : maison de prière simple, blanche, au toit plat
      M.boite(9, 4.5, 7, 0xf8f9f9, g, 0, 2.25, 0);
      var dz = new T.Mesh(new T.SphereGeometry(2.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.mat(0xf8f9f9)); dz.position.y = 4.5; g.add(dz);
      M.boite(2, 3, 0.2, 0x1a5276, g, 0, 1.5, 3.55);
    } else if (religion === 'paienne') {
      // Temple de bois et poteaux sculptés des anciens dieux
      M.boite(9, 4, 7, 0x6e2c00, g, 0, 2, 0);
      var tt = new T.Mesh(new T.ConeGeometry(7, 4, 4), M.mat(0x4e342e)); tt.rotation.y = Math.PI / 4; tt.scale.set(1, 1, 0.8); tt.position.y = 6; g.add(tt);
      M.boite(2, 3, 0.2, 0x1c1c1c, g, 0, 1.5, 3.55);
      for (var pp = -1; pp <= 1; pp += 2) {
        M.boite(0.7, 6, 0.7, 0x8d6e63, g, pp * 5.5, 3, 5);
        M.boite(1, 1, 1, 0x5d4037, g, pp * 5.5, 6.4, 5);
        M.boite(0.2, 0.2, 0.1, 0xf4d03f, g, pp * 5.5 - 0.2, 6.5, 5.5); M.boite(0.2, 0.2, 0.1, 0xf4d03f, g, pp * 5.5 + 0.2, 6.5, 5.5);
      }
    } else {
      for (var c = 0; c < 6; c++) g.add(M.PROPS.colonne(Math.cos(c) * 5, Math.sin(c) * 5, 6, c % 3 === 0));
      M.boite(4, 6, 1, 0xa6acaf, g, 0, 3, 0);
    }
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  function etal(x, z, ang, couleur, biens) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang;
    M.boite(2.6, 0.9, 1.2, 0x8d6e63, g, 0, 0.45, 0);
    M.boite(0.12, 2.4, 0.12, 0x5d4037, g, -1.2, 1.2, -0.5); M.boite(0.12, 2.4, 0.12, 0x5d4037, g, 1.2, 1.2, -0.5);
    M.boite(0.12, 2.4, 0.12, 0x5d4037, g, -1.2, 1.2, 0.5); M.boite(0.12, 2.4, 0.12, 0x5d4037, g, 1.2, 1.2, 0.5);
    var toile = M.boite(3, 0.12, 1.8, couleur, g, 0, 2.45, 0); toile.rotation.x = 0.12;
    for (var i = 0; i < 4; i++) M.boite(0.35, biens ? 0.22 : 0.35, biens ? 0.5 : 0.35, (biens || [0xe74c3c, 0xf1c40f, 0x27ae60, 0x8e44ad])[i], g, -0.9 + i * 0.6, biens ? 1.0 : 1.05, 0, { ombre: false });
    return g;
  }
  function fontaine(x, z) {
    var g = new T.Group(); g.position.set(x, 0, z);
    var b = new T.Mesh(new T.CylinderGeometry(2.4, 2.6, 0.8, 10), M.mat(0xbdc3c7)); b.position.y = 0.4; g.add(b);
    var e = new T.Mesh(new T.CylinderGeometry(2.1, 2.1, 0.1, 10), M.mat(0x5dade2)); e.position.y = 0.75; g.add(e);
    var c = new T.Mesh(new T.CylinderGeometry(0.3, 0.4, 2, 8), M.mat(0xbdc3c7)); c.position.y = 1.4; g.add(c);
    return g;
  }

  // ---------- Décor de la vie quotidienne ----------
  function charrette(x, z, ang, chargement) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang;
    M.boite(1.6, 0.25, 2.6, 0x8d6e63, g, 0, 0.75, 0);
    M.boite(0.1, 0.5, 2.6, 0x6d4c41, g, -0.78, 1.05, 0); M.boite(0.1, 0.5, 2.6, 0x6d4c41, g, 0.78, 1.05, 0);
    M.boite(0.12, 0.12, 2, 0x5d4037, g, 0, 0.7, 2.2);
    for (var k = -1; k <= 1; k += 2) { var r = new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 0.12, 10), M.mat(0x5d4037)); r.rotation.z = Math.PI / 2; r.position.set(k * 0.9, 0.55, -0.2); r.castShadow = true; g.add(r); }
    if (chargement === 'foin') M.boite(1.4, 0.7, 2.2, 0xb39445, g, 0, 1.2, 0);
    else for (var i = 0; i < 3; i++) M.boite(0.5, 0.5, 0.5, [0x8d6e63, 0xa1887f, 0x795548][i], g, (i - 1) * 0.45, 1.15, (i % 2) * 0.6 - 0.3);
    return g;
  }
  function tonneau(x, z) {
    var g = new T.Group(); g.position.set(x, 0, z);
    var t = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.95, 10), M.mat(0x8d5a2b)); t.position.y = 0.48; t.castShadow = true; g.add(t);
    for (var k = -1; k <= 1; k += 2) { var c = new T.Mesh(new T.CylinderGeometry(0.44, 0.44, 0.07, 10), M.mat(0x424949)); c.position.y = 0.48 + k * 0.3; g.add(c); }
    return g;
  }
  function drapeau(x, z, couleur, parent) {
    var g = new T.Group(); g.position.set(x, 0, z);
    M.boite(0.14, 5.5, 0.14, 0x5d4037, g, 0, 2.75, 0);
    var f = M.boite(1.6, 1.1, 0.05, couleur, g, 0.85, 4.9, 0, { ombre: false });
    parent.add(g);
    return f;
  }
  function enclume(x, z) {
    var g = new T.Group(); g.position.set(x, 0, z);
    M.boite(0.5, 0.6, 0.5, 0x5d4037, g, 0, 0.3, 0);
    M.boite(0.75, 0.25, 0.35, 0x424949, g, 0, 0.72, 0);
    return g;
  }
  function chaumiere(x, z, ang, r) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang;
    var w = 3.6 + r() * 1.4, d = 3.2 + r() * 1.2, h = 2.2 + r() * 0.5;
    M.boite(w, h, d, [0xe8dcc0, 0xdcccaa, 0xd7c9a6][Math.floor(r() * 3)], g, 0, h / 2, 0);
    for (var k = -1; k <= 1; k += 2) M.boite(0.18, h, 0.05, 0x6d4c41, g, k * w * 0.45, h / 2, d / 2 + 0.02);
    var toit = new T.Mesh(new T.ConeGeometry(Math.max(w, d) * 0.85, 2.2, 4), M.mat(0x9c7b3e)); toit.position.y = h + 1.05; toit.rotation.y = Math.PI / 4; toit.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(toit);
    M.boite(0.8, 1.5, 0.1, 0x4e342e, g, 0, 0.75, d / 2 + 0.04);
    M.boite(0.5, 0.5, 0.06, 0x2c3e50, g, w * 0.28, h * 0.6, d / 2 + 0.04);
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.userData.r = Math.max(w, d) * 0.62;
    return g;
  }
  function puits(x, z) {
    var g = new T.Group(); g.position.set(x, 0, z);
    var m = new T.Mesh(new T.CylinderGeometry(1.1, 1.2, 0.9, 10), M.mat(0x95a5a6)); m.position.y = 0.45; m.castShadow = true; g.add(m);
    var e = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 0.05, 10), M.mat(0x1b4f72)); e.position.y = 0.85; g.add(e);
    M.boite(0.15, 2.2, 0.15, 0x5d4037, g, -1, 1.1, 0); M.boite(0.15, 2.2, 0.15, 0x5d4037, g, 1, 1.1, 0);
    var t = M.boite(2.6, 0.12, 1.6, 0x8d6e63, g, 0, 2.3, 0); t.rotation.x = 0.1;
    M.boite(0.4, 0.35, 0.4, 0x6d4c41, g, 0.3, 1.3, 0);
    return g;
  }
  function champ(x, z, w, d, ang, couleur) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang;
    M.boite(w, 0.08, d, 0x7b5e3b, g, 0, 0.04, 0, { ombre: false });
    for (var i = -w / 2 + 0.5; i < w / 2; i += 1) M.boite(0.55, 0.45, d - 0.6, couleur, g, i, 0.3, 0);
    return g;
  }
  function meule(x, z) {
    var m = new T.Mesh(new T.CylinderGeometry(1, 1.3, 1.8, 8), M.mat(0xb39445)); m.position.set(x, 0.9, z); m.castShadow = true;
    var c = new T.Mesh(new T.ConeGeometry(1.05, 0.9, 8), M.mat(0xa6893d)); c.position.y = 1.35; m.add(c);
    return m;
  }
  function cloture(x, z, w, d) {
    var g = new T.Group(); g.position.set(x, 0, z);
    var cotes = [[0, -d / 2, w, 0], [0, d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]];
    cotes.forEach(function (c, i) {
      var b = new T.Group(); b.position.set(c[0], 0, c[1]); b.rotation.y = c[3]; g.add(b);
      var long = i === 1 ? c[2] * 0.4 : c[2]; // ouverture sur un côté
      M.boite(long, 0.12, 0.1, 0x8d6e63, b, i === 1 ? -c[2] * 0.3 : 0, 0.55, 0); M.boite(long, 0.12, 0.1, 0x8d6e63, b, i === 1 ? -c[2] * 0.3 : 0, 0.95, 0);
      for (var k = -long / 2; k <= long / 2 + 0.01; k += 1.2) M.boite(0.14, 1.2, 0.14, 0x6d4c41, b, k + (i === 1 ? -c[2] * 0.3 : 0), 0.6, 0);
    });
    return g;
  }


  // ---------- Bannières des royaumes (dessinées en petits pixels, comme le reste du jeu) ----------
  var MOTIFS = {
    lion: ['...##....', '..####...', '..#.##...', '...###.#.', '..#####.#', '.#.####.#', '...####..', '..##.##..', '.##...##.', '##.....##'],
    aigle: ['.....#.....', '....###....', '#...###...#', '##.#####.##', '###########', '.#########.', '...#####...', '...#.#.#...', '..#.....#..'],
    lys: ['...#...', '..###..', '#.###.#', '##.#.##', '#######', '...#...', '.#####.', '..#.#..'],
    chateau: ['#.#.#.#.#', '#########', '.#######.', '.###.###.', '.##...##.', '.##...##.', '#########'],
    trident: ['#...#...#', '#...#...#', '#...#...#', '##..#..##', '.##.#.##.', '..#####..', '....#....', '....#....', '...###...'],
    couronne: ['#..#..#', '#######', '#######'],
    harpe: ['######.', '#....##', '#...#.#', '#..#..#', '#.#...#', '##....#', '#.....#', '#######'],
    etoile: ['....#....', '...###...', '#########', '.#######.', '..#####..', '.##...##.', '##.....##']
  };
  var CACHE_BAN = {};
  M.banniere = function (f) {
    if (CACHE_BAN[f]) return CACHE_BAN[f];
    var B = (FF.BANNIERES && FF.BANNIERES[f]) || { fond: (FF.FACTIONS[f] || {}).couleur || '#7f8c8d', motif: 'uni', c: '#f4f1e8' };
    var cv = document.createElement('canvas'); cv.width = 64; cv.height = 96;
    var x = cv.getContext('2d');
    x.fillStyle = B.fond; x.fillRect(0, 0, 64, 96);
    x.fillStyle = B.c;
    function pix(m, cx, cy, t) { var h = m.length, w = m[0].length; for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if (m[j][i] === '#') x.fillRect(Math.round(cx - w * t / 2 + i * t), Math.round(cy - h * t / 2 + j * t), t, t); }
    var k, m = B.motif;
    if (m === 'croix' || m === 'croix_pommee') { x.fillRect(26, 10, 12, 70); x.fillRect(8, 30, 48, 12); if (m === 'croix_pommee') [[32, 8], [32, 82], [6, 36], [58, 36]].forEach(function (p) { x.fillRect(p[0] - 5, p[1] - 5, 10, 10); }); }
    else if (m === 'sautoir') { x.save(); x.translate(32, 44); [0.6, -0.6].forEach(function (r) { x.save(); x.rotate(r); x.fillRect(-6, -52, 12, 104); x.restore(); }); x.restore(); }
    else if (m === 'fasces') for (k = 0; k < 4; k++) x.fillRect(0, 10 + k * 20, 64, 10);
    else if (m === 'pals') for (k = 0; k < 4; k++) x.fillRect(4 + k * 16, 0, 8, 96);
    else if (m === 'damier') for (k = 0; k < 48; k++) { if ((k + Math.floor(k / 6)) % 2) x.fillRect((k % 6) * 11 - 1, Math.floor(k / 6) * 12, 11, 12); }
    else if (m === 'bandes') { x.save(); x.rotate(0.6); for (k = -4; k < 6; k++) x.fillRect(-40, k * 22, 200, 11); x.restore(); }
    else if (m === 'tiraz') { x.fillRect(0, 24, 64, 14); x.fillStyle = B.fond; for (k = 0; k < 9; k++) x.fillRect(4 + k * 6.5, 27 + (k % 3) * 2, 3, 6 - (k % 3) * 2); x.fillStyle = B.c; x.fillRect(0, 62, 64, 4); }
    else if (m === 'cles') { x.save(); x.translate(32, 44); [0.55, -0.55].forEach(function (r) { x.save(); x.rotate(r); x.fillRect(-3, -26, 6, 50); x.fillRect(-10, -34, 20, 12); x.fillRect(3, 14, 9, 5); x.fillRect(3, 21, 7, 4); x.restore(); }); x.restore(); }
    else if (m === 'lions2') { pix(MOTIFS.lion, 32, 26, 4); pix(MOTIFS.lion, 32, 66, 4); }
    else if (m === 'couronnes') { pix(MOTIFS.couronne, 18, 24, 4); pix(MOTIFS.couronne, 46, 24, 4); pix(MOTIFS.couronne, 32, 62, 4); }
    else if (MOTIFS[m]) pix(MOTIFS[m], 32, 44, m === 'lys' || m === 'harpe' ? 6 : m === 'aigle' ? 5 : 5);
    // Bord et franges
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 0, 64, 3); x.fillRect(0, 0, 2, 96); x.fillRect(62, 0, 2, 96);
    CACHE_BAN[f] = cv;
    return cv;
  };
  // Bannière en 3D, suspendue à une traverse (pendante comme un gonfanon)
  function banniere3d(x, z, ang, faction, parent, h, taille) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang || 0;
    taille = taille || 1; h = h || 5.5;
    M.boite(0.14, h, 0.14, 0x5d4037, g, 0, h / 2, 0);
    M.boite(1.5 * taille, 0.1, 0.1, 0x5d4037, g, 0.75 * taille - 0.05, h - 0.15, 0);
    var tex = new T.CanvasTexture(M.banniere(faction)); tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter;
    var drap = new T.Mesh(new T.PlaneGeometry(1.4 * taille, 2.1 * taille), new T.MeshLambertMaterial({ map: tex, side: T.DoubleSide }));
    var pivot = new T.Group(); pivot.position.set(0.75 * taille - 0.05, h - 0.2, 0.06); g.add(pivot);
    drap.position.y = -1.05 * taille; pivot.add(drap);
    parent.add(g);
    if (V && V.drapeaux) V.drapeaux.push({ p: pivot, ph: x * 0.7 + z });
    return g;
  }
  // Bannière plaquée contre un mur (salle de la caserne)
  function banniereMur(x, y, z, ang, faction, parent, taille) {
    var tex = new T.CanvasTexture(M.banniere(faction)); tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter;
    var m = new T.Mesh(new T.PlaneGeometry(1.4 * (taille || 1), 2.1 * (taille || 1)), new T.MeshLambertMaterial({ map: tex }));
    m.position.set(x, y, z); m.rotation.y = ang || 0; parent.add(m);
    return m;
  }

  // ---------- Bâtiments où l'on entre (boutiques, taverne, caserne…) ----------
  var COUL_BAT = { taverne: 0xd68910, forge: 0x616a6b, armurier: 0x7b241c, coutelier: 0x5d6d7e, orfevre: 0xd4ac0d, apothicaire: 0x1e8449, marchand: 0x2874a6, banque: 0xb7950b, caserne: 0x922b21, prevote: 0x1b2631, cordonnier: 0x6e2c00, tailleur: 0x8e44ad, fourreur: 0x795548 };
  // Places autour de la grand-place (angles), les plus proches de la porte d'abord
  var SLOTS_VILLE = [2.01, 1.13, 2.36, 0.8, 2.71, 0.46, 3.06, 0.12, 3.41, -0.22, 3.76, -0.56, 4.11, -0.9];
  function versMonde(g, lx, lz) {
    var c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y);
    return { x: g.position.x + lx * c + lz * s, z: g.position.z - lx * s + lz * c };
  }
  function batiment(type, a, R, style, faction) {
    var g = new T.Group(); g.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); g.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
    var w = 6.6, d = 6, f = d / 2, c = COUL_BAT[type] || 0x8d6e63, bois = 0x5d4037;
    var pierre = type === 'caserne' || type === 'banque' || type === 'prevote';
    var mur = pierre ? (style === 'occident' ? 0xb8b0a0 : 0xd8c8a6) : style === 'occident' ? 0xe8dcc0 : style === 'byzance' ? 0xe6cfa8 : 0xf2e6cc;
    M.boite(w, 2.7, d, mur, g, 0, 1.35, 0);
    M.boite(w + 0.12, 0.5, d + 0.12, 0x8f877a, g, 0, 0.25, 0);
    var hautF = f; // façade de l'étage
    if (style === 'occident') {
      M.boite(w + 0.4, 2.3, d + 0.4, pierre ? mur : 0xefe4c8, g, 0, 3.85, 0.2); hautF = f + 0.4;
      if (!pierre) {
        [-3.2, -1.1, 1.1, 3.2].forEach(function (x) { M.boite(0.18, 2.3, 0.06, bois, g, x, 3.85, hautF + 0.03); });
        M.boite(w + 0.4, 0.18, 0.06, bois, g, 0, 2.78, hautF + 0.03); M.boite(w + 0.4, 0.18, 0.06, bois, g, 0, 4.92, hautF + 0.03);
        [-2.15, 2.15].forEach(function (x) { var b = M.boite(0.14, 2.6, 0.05, bois, g, x, 3.85, hautF + 0.03); b.rotation.z = 0.75; });
      }
      var toit = new T.Mesh(new T.ConeGeometry(5.6, 3.2, 4), M.mat(pierre ? 0x5d6d7e : 0x8e3b2e)); toit.rotation.y = Math.PI / 4; toit.scale.set((w + 0.6) / 7.92, 1, (d + 0.8) / 7.92); toit.position.set(0, 6.6, 0.2); g.add(toit);
      if (type === 'taverne' || type === 'forge') M.boite(0.8, 2.2, 0.8, 0x7b7d7d, g, 2.2, 7.2, -1.2);
    } else if (style === 'byzance') {
      M.boite(w, 2.2, d, mur, g, 0, 3.8, 0);
      for (var k = 0; k < 3; k++) M.boite(w + 0.02, 0.14, d + 0.02, 0xa04000, g, 0, 2.7 + k * 0.9, 0);
      var tb = new T.Mesh(new T.ConeGeometry(5.4, 1.6, 4), M.mat(0xb03a2e)); tb.rotation.y = Math.PI / 4; tb.scale.set((w + 0.4) / 7.64, 1, (d + 0.4) / 7.64); tb.position.y = 5.7; g.add(tb);
      if (pierre) { var dm = new T.Mesh(new T.SphereGeometry(1.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.mat(0x5d8aa8)); dm.position.y = 6.2; g.add(dm); }
    } else {
      M.boite(w - 1.2, 2, d - 1.2, mur, g, 0, 3.7, -0.6);
      M.boite(w + 0.1, 0.4, d + 0.1, mur, g, 0, 2.9, 0);
      for (var p = -1; p <= 1; p += 2) M.boite(0.4, 0.6, 0.4, mur, g, p * (w / 2 - 0.2), 3.3, f - 0.2);
      if (pierre) { var dd = new T.Mesh(new T.SphereGeometry(1.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.mat(0x16a085)); dd.position.set(0, 4.7, -0.6); g.add(dd); }
    }
    // Porte, encadrement, auvent et enseigne
    M.boite(1.9, 2.75, 0.14, pierre ? 0x7b7d7d : bois, g, 0, 1.38, f + 0.04);
    M.boite(1.5, 2.4, 0.16, 0x3e2723, g, 0, 1.2, f + 0.06);
    M.boite(0.12, 0.12, 0.05, 0xd4ac0d, g, 0.5, 1.2, f + 0.15, { ombre: false });
    var auv = M.boite(2.8, 0.1, 1.2, c, g, 0, 2.85, f + 0.55); auv.rotation.x = 0.28;
    M.boite(0.08, 0.08, 1.2, bois, g, -2.35, 2.45, f + 0.6);
    var ens = M.boite(0.07, 0.7, 0.9, c, g, -2.35, 1.95, f + 0.85);
    M.boite(0.08, 0.3, 0.3, 0xf4d03f, g, -2.35, 1.95, f + 0.85, { ombre: false });
    ens.castShadow = true;
    // Fenêtres (éclairées de l'intérieur)
    var lumiere = type === 'taverne' || type === 'forge' || type === 'orfevre' ? 0xffc46b : 0x2c3e50;
    M.boite(1.1, 0.9, 0.05, lumiere, g, 2.2, 1.6, f + 0.04, lumiere === 0x2c3e50 ? { ombre: false } : { basic: true, ombre: false });
    [-1.8, 1.8].forEach(function (x) { M.boite(0.8, 0.9, 0.05, 0x2c3e50, g, x, 3.9, hautF + 0.05, { ombre: false }); M.boite(0.3, 0.95, 0.05, c, g, x - 0.55, 3.9, hautF + 0.06); M.boite(0.3, 0.95, 0.05, c, g, x + 0.55, 3.9, hautF + 0.06); });
    // Ce qu'on voit devant chaque boutique
    if (type === 'taverne') { g.add(tonneau(-3, f + 0.7)); g.add(tonneau(3.1, f + 0.6)); M.boite(1.4, 0.5, 0.5, 0x8d6e63, g, 2.6, 0.25, f + 1.1); }
    else if (type === 'forge') { M.boite(1.2, 1.3, 1, 0x5d4037, g, 2.8, 0.65, f + 0.8); M.boite(0.6, 0.5, 0.1, 0xff8c1a, g, 2.8, 0.6, f + 1.31, { basic: true, ombre: false }); g.add(enclume(-3, f + 1)); }
    else if (type === 'caserne') { banniere3d(-3, f + 0.5, 0, faction, g, 4.5, 0.9); banniere3d(2.2, f + 0.5, 0, faction, g, 4.5, 0.9); }
    else if (type === 'marchand' || type === 'cordonnier') { g.add(M.PROPS.caisse(-3, f + 0.9, 0.7)); g.add(M.PROPS.caisse(2.9, f + 0.8, 0.6)); }
    else if (type === 'apothicaire') { [0x1e8449, 0x8e44ad, 0xd68910].forEach(function (cc, i) { var pot = new T.Mesh(new T.CylinderGeometry(0.22, 0.28, 0.5, 8), M.mat(cc)); pot.position.set(2.4 + i * 0.5, 0.25, f + 0.6); g.add(pot); }); }
    else if (type === 'banque') { for (var col = -1; col <= 1; col += 2) { var cl = new T.Mesh(new T.CylinderGeometry(0.28, 0.32, 2.7, 8), M.mat(0xe5e7e9)); cl.position.set(col * 1.3, 1.35, f + 0.35); cl.castShadow = true; g.add(cl); } }
    g.traverse(function (o) { if (o.isMesh) { if (o.castShadow !== false) o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  // Chantier : une maison en construction, avec maçon, couvreur et charpentier
  function chantier(a, R, style) {
    var g = new T.Group(); g.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); g.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
    var p = style === 'occident' ? 0xb8b0a0 : 0xe0cfa8, f = 3;
    M.boite(6.6, 3, 0.5, p, g, 0, 1.5, -f);
    M.boite(0.5, 2.6, 6, p, g, -3.05, 1.3, 0); M.boite(0.5, 1.6, 6, p, g, 3.05, 0.8, 0);
    M.boite(2.2, 1.2, 0.5, p, g, -2.2, 0.6, f); M.boite(1.6, 0.6, 0.5, p, g, 2.5, 0.3, f);
    [[-3.4, f + 0.9], [3.4, f + 0.9], [-3.4, f - 0.6], [3.4, f - 0.6]].forEach(function (q) { M.boite(0.14, 3.6, 0.14, 0x8d6e63, g, q[0], 1.8, q[1]); });
    M.boite(7, 0.12, 1.4, 0xa1887f, g, 0, 2.2, f + 0.15);
    M.boite(7, 0.08, 0.08, 0x8d6e63, g, 0, 3.3, f + 0.9);
    for (var i = 0; i < 5; i++) M.boite(0.6, 0.4, 0.45, p, g, 1.6 + (i % 3) * 0.65, 0.2 + Math.floor(i / 3) * 0.4, f + 1.8 + (i % 2) * 0.2);
    for (var k = 0; k < 3; k++) M.boite(3.2, 0.25, 0.25, 0xa1887f, g, -1.6, 0.13 + k * 0.25, f + 2.4 + (k % 2) * 0.1);
    M.boite(1.4, 0.7, 0.4, 0x8d6e63, g, 2.6, 0.35, f + 3.1);
    var m = new T.Mesh(new T.CylinderGeometry(0.35, 0.3, 0.45, 8), M.mat(0x95a5a6)); m.position.set(-0.4, 0.22, f + 1.6); g.add(m);
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  function four(x, z, ang) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang;
    var d = new T.Mesh(new T.SphereGeometry(1.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.mat(0xb3a68b)); d.scale.y = 1.2; d.position.y = 0.4; g.add(d);
    M.boite(2.4, 0.4, 2.4, 0x9e9a8f, g, 0, 0.2, 0);
    M.boite(0.6, 0.5, 0.1, 0xff8c1a, g, 0, 0.75, 1.02, { basic: true, ombre: false });
    M.boite(0.35, 1, 0.35, 0x9e9a8f, g, 0, 1.8, -0.4);
    g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  // Métiers des villages : métier à tisser, cuve du foulon, moulin à vent
  function metierTisser(x, z, ang) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang;
    [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]].forEach(function (q) { M.boite(0.12, 1.6, 0.12, 0x6d4c41, g, q[0], 0.8, q[1]); });
    M.boite(2, 0.12, 0.12, 0x6d4c41, g, 0, 1.55, -0.5); M.boite(2, 0.12, 0.12, 0x6d4c41, g, 0, 0.8, 0.5);
    for (var i = 0; i < 9; i++) M.boite(0.03, 0.04, 1, [0xc0392b, 0xf4f1e8, 0x2874a6][i % 3], g, -0.8 + i * 0.2, 0.86, 0, { ombre: false });
    M.boite(1.7, 0.03, 0.6, 0xa93226, g, 0, 0.84, 0.15, { ombre: false });
    M.boite(1, 0.45, 0.4, 0x8d6e63, g, 0, 0.22, 1.2);
    return g;
  }
  function cuve(x, z) {
    var g = new T.Group(); g.position.set(x, 0, z);
    var c = new T.Mesh(new T.CylinderGeometry(1.1, 1, 0.8, 12), M.mat(0x8d5a2b)); c.position.y = 0.4; c.castShadow = true; g.add(c);
    var e = new T.Mesh(new T.CylinderGeometry(0.98, 0.98, 0.05, 12), M.mat(0x7fa3b8)); e.position.y = 0.7; g.add(e);
    [[1.6, 0.5], [1.7, -0.3]].forEach(function (q, i) { M.boite(0.9, 0.08, 0.6, [0xf4f1e8, 0x2874a6][i], g, q[0], 0.04 + i * 0.08, q[1], { ombre: false }); });
    return g;
  }
  function moulin(x, z, ang) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang;
    var t = new T.Mesh(new T.CylinderGeometry(1.6, 2.2, 6.5, 8), M.mat(0xe8dcc0)); t.position.y = 3.25; g.add(t);
    var toit = new T.Mesh(new T.ConeGeometry(2, 2, 8), M.mat(0x8e3b2e)); toit.position.y = 7.5; g.add(toit);
    M.boite(1, 1.8, 0.1, 0x4e342e, g, 0, 0.9, 2.1);
    var axe = new T.Group(); axe.position.set(0, 6.2, 2); g.add(axe);
    for (var i = 0; i < 4; i++) { var b = new T.Group(); b.rotation.z = i * Math.PI / 2; axe.add(b); M.boite(0.15, 5, 0.1, 0x6d4c41, b, 0, 2.5, 0); M.boite(0.9, 4, 0.04, 0xf4f1e8, b, 0.5, 2.8, 0.05); }
    for (var s = 0; s < 3; s++) M.boite(0.5, 0.6, 0.5, 0xd7c9a6, g, 1.6 + s * 0.3, 0.3, 2.4 - s * 0.5);
    g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    if (V) V.tourne.push({ o: axe, axe: 'z', v: 0.6 });
    return g;
  }

  // ---------- Intérieurs ----------
  var SALLES = {
    taverne: { w: 14, d: 11, h: 4.4, mur: 0xd7c4a1, sol: 0x8d6e4a },
    forge: { w: 13, d: 9, h: 4.6, mur: 0x9e9384, sol: 0x6b5e4e },
    armurier: { w: 10, d: 8, h: 4.2, mur: 0xc9b99a, sol: 0x8d6e4a },
    coutelier: { w: 9, d: 7.5, h: 4, mur: 0xc9b99a, sol: 0x8d6e4a },
    orfevre: { w: 9, d: 7.5, h: 4, mur: 0xe0cfb0, sol: 0x7b5e45 },
    apothicaire: { w: 9, d: 7.5, h: 4, mur: 0xd5c8a8, sol: 0x8d6e4a },
    marchand: { w: 11, d: 8.5, h: 4.4, mur: 0xd7c4a1, sol: 0x8d6e4a },
    banque: { w: 11, d: 8.5, h: 4.8, mur: 0xd5d0c4, sol: 0x9e9a8f },
    caserne: { w: 13, d: 10, h: 4.8, mur: 0xb8b0a0, sol: 0x8f877a },
    prevote: { w: 12, d: 9, h: 4.6, mur: 0xc4bcaa, sol: 0x8f877a },
    cordonnier: { w: 9, d: 7.5, h: 4, mur: 0xd7c4a1, sol: 0x8d6e4a },
    tailleur: { w: 9, d: 7.5, h: 3.8, mur: 0xe8dcc0, sol: 0x9c8462 },
    fourreur: { w: 9, d: 7.5, h: 3.8, mur: 0xd7c9a6, sol: 0x9c8462 }
  };
  function meuble(g) { g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); M.scene.add(g); return g; }
  function obst(x, z, r) { V.obstacles.push({ x: x, z: z, r: r }); }
  function tableI(x, z, w, d) {
    var g = new T.Group(); g.position.set(x, 0, z);
    M.boite(w, 0.12, d, 0x8d6e63, g, 0, 0.82, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (k) { M.boite(0.12, 0.8, 0.12, 0x5d4037, g, k[0] * (w / 2 - 0.15), 0.4, k[1] * (d / 2 - 0.15)); });
    obst(x, z, Math.min(w, d) / 2 + 0.15); if (w > d * 1.5) { obst(x - w / 3, z, d / 2 + 0.1); obst(x + w / 3, z, d / 2 + 0.1); }
    return meuble(g);
  }
  function bancI(x, z, w) { var g = new T.Group(); g.position.set(x, 0, z); M.boite(w, 0.1, 0.4, 0x795548, g, 0, 0.48, 0); M.boite(0.1, 0.45, 0.35, 0x5d4037, g, -w / 2 + 0.2, 0.23, 0); M.boite(0.1, 0.45, 0.35, 0x5d4037, g, w / 2 - 0.2, 0.23, 0); return meuble(g); }
  function chope(x, y, z, parent) { var c = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 0.18, 6), M.mat(0x8d6e63)); c.position.set(x, y, z); (parent || M.scene).add(c); return c; }
  function comptoir(x, z, w, ang) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang || 0;
    M.boite(w, 1.05, 0.8, 0x6d4c41, g, 0, 0.52, 0); M.boite(w + 0.1, 0.1, 0.95, 0x8d6e63, g, 0, 1.08, 0);
    for (var k = -w / 2 + 0.5; k < w / 2; k += 1) obst(x + Math.cos(ang || 0) * k, z - Math.sin(ang || 0) * k, 0.55);
    return meuble(g);
  }
  // Étagère contre un mur : objets de couleurs (pots, bottes, rouleaux de tissu…)
  function etagere(x, z, ang, w, couleurs, forme) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang || 0;
    M.boite(w, 2.6, 0.08, 0x5d4037, g, 0, 1.3, -0.22);
    M.boite(0.08, 2.6, 0.5, 0x5d4037, g, -w / 2, 1.3, 0); M.boite(0.08, 2.6, 0.5, 0x5d4037, g, w / 2, 1.3, 0);
    for (var n = 0; n < 4; n++) {
      var y = 0.3 + n * 0.65; M.boite(w, 0.06, 0.48, 0x795548, g, 0, y, 0);
      for (var i = 0; i < Math.floor(w / 0.42); i++) {
        var c = couleurs[(i + n * 2) % couleurs.length], xx = -w / 2 + 0.3 + i * 0.42;
        if (forme === 'pot') { var p = new T.Mesh(new T.CylinderGeometry(0.11, 0.14, 0.3, 6), M.mat(c)); p.position.set(xx, y + 0.18, 0); g.add(p); }
        else if (forme === 'botte') { M.boite(0.15, 0.35, 0.15, c, g, xx, y + 0.2, -0.05); M.boite(0.15, 0.12, 0.3, c, g, xx, y + 0.09, 0.05); }
        else if (forme === 'rouleau') { var r = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.42, 8), M.mat(c)); r.rotation.z = Math.PI / 2; r.position.set(xx, y + 0.19, 0); g.add(r); i++; }
        else if (forme === 'or') { var o = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.06 + (i % 3) * 0.05, 8), M.mat(c, { lueur: 0x4d3a00 })); o.position.set(xx, y + 0.06, 0); g.add(o); }
        else M.boite(0.28, 0.24 + (i % 2) * 0.1, 0.28, c, g, xx, y + 0.15, 0);
      }
    }
    var mo = versMonde(g, 0, 0); obst(mo.x, mo.z, 0.3); var m1 = versMonde(g, -w / 3, 0), m2 = versMonde(g, w / 3, 0); obst(m1.x, m1.z, 0.35); obst(m2.x, m2.z, 0.35);
    return meuble(g);
  }
  // Râtelier d'armes contre un mur
  function ratelier(x, z, ang, armes) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang || 0;
    var w = armes.length * 0.5 + 0.4;
    M.boite(w, 0.12, 0.3, 0x5d4037, g, 0, 0.5, 0); M.boite(w, 0.12, 0.12, 0x5d4037, g, 0, 1.5, -0.1);
    M.boite(0.1, 1.7, 0.1, 0x5d4037, g, -w / 2, 0.85, -0.1); M.boite(0.1, 1.7, 0.1, 0x5d4037, g, w / 2, 0.85, -0.1);
    armes.forEach(function (id, i) { if (!FF.ARMES[id]) return; var a = M.creerArme(id); a.position.set(-w / 2 + 0.45 + i * 0.5, 0.45, 0); a.rotation.z = 0.08; g.add(a); });
    return meuble(g);
  }
  // Mannequin avec une armure exposée
  function mannequin(x, z, ang, look) {
    var P = M.creerPerso(Object.assign({ peau: 0x8d6e63 }, look), 1);
    P.g.position.set(x, 0, z); P.g.rotation.y = ang || 0;
    P.brasG.rotation.z = -0.2; P.brasD.rotation.z = 0.2;
    M.boite(0.5, 0.1, 0.5, 0x5d4037, P.g, 0, 0.05, 0);
    M.scene.add(P.g); obst(x, z, 0.5);
    return P;
  }
  function feuI(x, y, z, force, portee) {
    var l = new T.PointLight(0xffa040, force || 1.3, portee || 12, 2); l.position.set(x, y, z); M.scene.add(l);
    V.flammes.push({ l: l, f: force || 1.3, ph: Math.random() * 6 });
    return l;
  }
  function cheminee(x, z, ang) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang || 0;
    M.boite(2.6, 1.6, 0.9, 0x7b7d7d, g, 0, 0.8, 0); M.boite(1.6, 0.9, 0.5, 0x1c1c1c, g, 0, 0.55, 0.25, { ombre: false });
    M.boite(3, 0.25, 1.1, 0x5d4037, g, 0, 1.7, 0.05); M.boite(1.8, 2.8, 0.7, 0x7b7d7d, g, 0, 3.2, -0.1);
    for (var i = 0; i < 3; i++) M.boite(0.25, 0.35, 0.25, i === 1 ? 0xffd166 : 0xff7b00, g, -0.35 + i * 0.35, 0.3 + (i === 1 ? 0.06 : 0), 0.3, { basic: true, ombre: false });
    meuble(g); var p = versMonde(g, 0, 0.6); feuI(p.x, 1, p.z, 1.6, 14); obst(x, z, 1.2);
    return g;
  }
  function salle(type, faction) {
    var S0 = SALLES[type] || SALLES.marchand, w = S0.w, d = S0.d, h = S0.h, s = M.scene;
    V.salle = { w: w, d: d, h: h };
    var sol = M.boite(w, 0.1, d, S0.sol, s, 0, -0.05, 0, { ombre: false }); sol.receiveShadow = true;
    var pierreSol = type === 'caserne' || type === 'prevote' || type === 'banque' || type === 'forge';
    if (pierreSol) { for (var i = -w / 2 + 1; i < w / 2; i += 1) M.boite(0.04, 0.012, d, 0x6b6357, s, i, 0.006, 0, { ombre: false }); for (var j = -d / 2 + 1; j < d / 2; j += 1) M.boite(w, 0.012, 0.04, 0x6b6357, s, 0, 0.006, j, { ombre: false }); }
    else for (var k = -w / 2 + 0.6; k < w / 2; k += 0.6) M.boite(0.03, 0.012, d, 0x5d4632, s, k, 0.006, 0, { ombre: false });
    function mur(ww, x, z, rot) { var m = M.boite(ww, h, 0.3, S0.mur, s, x, h / 2, z, { ombre: false }); m.rotation.y = rot || 0; m.receiveShadow = true; var b = M.boite(ww, 1, 0.32, 0x6d4c41, s, x, 0.5, z, { ombre: false }); b.rotation.y = rot || 0; return [m, b]; }
    mur(w + 0.6, 0, -d / 2 - 0.15); mur(d + 0.6, -w / 2 - 0.15, 0, Math.PI / 2); mur(d + 0.6, w / 2 + 0.15, 0, Math.PI / 2);
    var cote = (w - 2) / 2;
    // Le mur de la porte disparaît quand la caméra passe derrière (vue « maison de poupée »)
    V.murAvant = [].concat(mur(cote, -(1 + cote / 2), d / 2 + 0.15), mur(cote, 1 + cote / 2, d / 2 + 0.15),
      M.boite(2.2, h - 2.6, 0.3, S0.mur, s, 0, 2.6 + (h - 2.6) / 2, d / 2 + 0.15, { ombre: false }),
      M.boite(2, 2.6, 0.05, 0xfff3d6, s, 0, 1.3, d / 2 + 0.32, { basic: true, ombre: false }),
      M.boite(2.2, 0.2, 0.34, 0x4e342e, s, 0, 2.65, d / 2 + 0.15, { ombre: false }));
    // Plafond et poutres
    M.boite(w + 0.6, 0.2, d + 0.6, 0x4e342e, s, 0, h + 0.1, 0, { ombre: false });
    for (var b = -w / 2 + 1; b < w / 2; b += 2) M.boite(0.3, 0.3, d, 0x3e2723, s, b, h - 0.15, 0, { ombre: false });
    // Fenêtres : la lumière du jour entre par les côtés
    [-1, 1].forEach(function (cs) { for (var z = -d / 2 + 2; z < d / 2 - 1.5; z += 3.5) { var fe = M.boite(0.05, 1, 0.8, 0xfff3d6, s, cs * (w / 2 - 0.01), 2.4, z, { basic: true, ombre: false }); } });
    V.pointsSalle = [];
    return S0;
  }

  function construireInterieur(type, style, faction, r) {
    var S0 = salle(type, faction), w = S0.w, d = S0.d, s = M.scene;
    var fond = -d / 2 + 0.55, i;
    var places = [];
    function client(x, z, ang, type2) {
      var o = ajouterPnj({ id: 'habitant', nom: _t('Client'), nomCourt: _t('Client'), look: Object.assign({ peau: FF.PEAU[Math.floor(r() * FF.PEAU.length)] }, LOOKS[Math.floor(r() * LOOKS.length)]), habitant: true }, x, z, false, type2 || 'client');
      o.ang = ang; o.ph = r() * 6; return o;
    }
    function assis(o) { o.assis = true; o.P.jambeG.rotation.x = o.P.jambeD.rotation.x = -1.45; o.P.corps.position.y = -0.45; return o; }
    function apprenti(x, z, ang, art, nom) {
      var o = ajouterPnj({ id: 'habitant', nom: nom || _t('Apprenti'), nomCourt: nom || _t('Apprenti'), look: { peau: FF.PEAU[Math.floor(r() * FF.PEAU.length)], tunique: 0x8d6e63, pantalon: 0x5d4037, cheveux: 0x6e2c00 }, habitant: true }, x, z, false, 'apprenti');
      o.ang = ang; o.artisan = art; o.ph = r() * 6; o.P.g.scale.setScalar(0.85); return o;
    }
    if (type === 'taverne') {
      comptoir(-w / 2 + 3.2, fond + 1.6, 4.2, 0);
      for (i = 0; i < 4; i++) { var tn = tonneau(-w / 2 + 1.6 + i * 1, fond + 0.1); tn.rotation.z = Math.PI / 2; tn.position.y = 0.45; meuble(tn); }
      etagere(-w / 2 + 3.2, fond, 0, 3, [0x7b241c, 0x1e8449, 0x8d6e63, 0xd4ac0d], 'pot');
      places.push({ x: -w / 2 + 3.2, z: fond + 0.75, ang: 0 });
      cheminee(w / 2 - 2.5, fond + 0.4, 0);
      // Tables, bancs et clients assis
      [[-2.6, 0.8], [2.4, 0.5], [-2.4, 3.2], [3, 3.1]].forEach(function (t, k) {
        tableI(t[0], t[1], 2.2, 1);
        bancI(t[0], t[1] - 0.95, 2); bancI(t[0], t[1] + 0.95, 2);
        chope(t[0] - 0.4, 0.97, t[1] + 0.1); chope(t[0] + 0.5, 0.97, t[1] - 0.15);
        var nb = k === 1 ? 1 : 2;
        for (var c = 0; c < nb; c++) { var cs = c ? 1 : -1; assis(client(t[0] + (c ? 0.5 : -0.6), t[1] + cs * 0.82, cs > 0 ? Math.PI : 0)); }
      });
      // Héros de passage : assis à une table libre (les PNJ suivants)
      places.push({ x: 2.4 + 0.5, z: 0.5 + 0.82, ang: Math.PI, assis: true }, { x: 2.4 - 0.6, z: 0.5 - 0.82, ang: 0, assis: true }, { x: -w / 2 + 1.2, z: 2.4, ang: Math.PI / 2 });
      // Serveuse qui va du comptoir aux tables
      var sv = ajouterPnj({ id: 'habitant', nom: _t('Serveuse'), nomCourt: _t('Serveuse'), look: { peau: FF.PEAU[Math.floor(r() * 3)], tunique: 0xa93226, pantalon: 0x7b241c, cheveux: 0x6e2c00 }, habitant: true }, -w / 2 + 3.2, fond + 2.4, true, 'serveuse');
      sv.route = [{ x: -w / 2 + 3.4, z: fond + 2.5 }, { x: -1.2, z: 2 }, { x: 0.2, z: 1.9 }, { x: 0.8, z: 4.1 }, { x: -1, z: 4.2 }, { x: -w / 2 + 3.4, z: fond + 2.5 }]; sv.iRoute = 1; sv.vit = 1.4;
      M.boite(0.55, 0.05, 0.4, 0x8d6e63, sv.P.haut, 0.35, 0.95, 0.45); chope(0.3, 1.05, 0.45, sv.P.haut); sv.plateau = true;
      // Musicien près du feu
      var mu = ajouterPnj({ id: 'habitant', nom: _t('Ménestrel'), nomCourt: _t('Ménestrel'), look: { peau: FF.PEAU[Math.floor(r() * 3)], tunique: 0x2874a6, pantalon: 0xd4ac0d, casque: 'chapel' }, habitant: true }, w / 2 - 3.5, fond + 2.4, false, 'musicien');
      mu.ang = Math.PI * 0.85;
      var luth = new T.Group(); luth.position.set(0.05, 0.45, 0.32); luth.rotation.z = 0.9; mu.P.haut.add(luth);
      var ca = new T.Mesh(new T.SphereGeometry(0.22, 8, 6), M.mat(0xa0522d)); ca.scale.z = 0.4; luth.add(ca); M.boite(0.06, 0.6, 0.04, 0x6d4c41, luth, 0, 0.4, 0);
      for (i = 0; i < 3; i++) { var lt = M.boite(0.25, 0.25, 0.25, 0xffd166, s, -3 + i * 3, S0.h - 0.6, 1.5, { basic: true, ombre: false }); M.boite(0.04, 0.4, 0.04, 0x3e2723, s, -3 + i * 3, S0.h - 0.3, 1.5); }
      feuI(-w / 2 + 3, 2.6, fond + 1.8, 0.8, 9);
    } else if (type === 'forge') {
      // Forge à gauche, écurie à droite
      var fo = new T.Group(); fo.position.set(-w / 2 + 1.8, 0, fond + 0.5);
      M.boite(2.4, 1.2, 1.6, 0x7b7d7d, fo, 0, 0.6, 0); M.boite(1.6, 0.25, 1, 0xff7b00, fo, 0, 1.25, 0, { basic: true, ombre: false });
      M.boite(1.4, 2.6, 1, 0x616a6b, fo, 0, 2.9, -0.2); meuble(fo); obst(fo.position.x, fo.position.z, 1.3); feuI(fo.position.x, 1.8, fo.position.z + 0.8, 1.8, 13);
      var ex = -w / 2 + 3.4, ez = fond + 2.6; meuble(enclume(ex, ez)); obst(ex, ez, 0.4);
      places.push({ x: ex - 0.9, z: ez + 0.2, ang: Math.PI / 2, enclume: { x: ex, z: ez } });
      var so = apprenti(-w / 2 + 0.8, fond + 1.8, Math.PI / 2, 'soufflet', _t('Apprenti forgeron'));
      M.boite(0.8, 0.3, 0.6, 0x6e2c00, s, -w / 2 + 1.3, 0.75, fond + 1.8);
      ratelier(-1.2, fond + 0.2, 0, ['epee', 'hache', 'masse', 'lance', 'kilij']);
      // Fers à cheval accrochés
      for (i = 0; i < 5; i++) M.boite(0.22, 0.25, 0.04, 0x566573, s, 1 + i * 0.35, 2.4, fond - 0.05);
      // Écurie : stalles et chevaux
      for (i = 0; i < 3; i++) {
        var sx = w / 2 - 1.2 - i * 2.2;
        M.boite(0.15, 1.3, 2.6, 0x6d4c41, s, sx - 1.1, 0.65, fond + 1.3);
        meuble(new T.Group()); M.boite(1.2, 0.5, 0.4, 0x8d6e63, s, sx, 0.25, fond + 0.3);
        M.boite(0.9, 0.6, 0.5, 0xb39445, s, sx, 0.9, fond + 0.25);
        if (i < 2) { var ch = ajouterBete('cheval', sx, fond + 1.5); ch.ang = Math.PI; ch.g.rotation.y = Math.PI; }
        obst(sx - 1.1, fond + 0.6, 0.3); obst(sx - 1.1, fond + 2, 0.3);
      }
      // Maréchal-ferrant qui ferre un cheval
      var mf = apprenti(w / 2 - 3.6, fond + 3.4, -Math.PI * 0.75, 'marteau', _t('Maréchal-ferrant')); mf.P.g.scale.setScalar(1); mf.P.haut.rotation.x = 0.5;
      var ch2 = ajouterBete('cheval', w / 2 - 2.6, fond + 4.2); ch2.ang = -Math.PI / 2; ch2.g.rotation.y = -Math.PI / 2;
      for (i = 0; i < 3; i++) meuble(M.PROPS.caisse(-w / 2 + 0.8, 1 + i * 1.1, 0.6));
    } else if (type === 'armurier') {
      comptoir(0, fond + 1.8, 3.2, 0);
      places.push({ x: 0, z: fond + 1, ang: 0 });
      mannequin(-w / 2 + 1.2, fond + 0.8, Math.PI / 4, { tunique: 0x7f8c8d, pantalon: 0x566573, casque: 'nasal', bouclier: 'kite', bc: 0x922b21 });
      mannequin(-w / 2 + 1.2, fond + 2.6, Math.PI / 2, { tunique: 0x6d4c41, pantalon: 0x4e342e, casque: 'chapel' });
      mannequin(w / 2 - 1.2, fond + 0.8, -Math.PI / 4, { tunique: 0x95a5a6, pantalon: 0x7f8c8d, casque: 'heaume', bouclier: 'rond', bc: 0x1f4e9e });
      mannequin(w / 2 - 1.2, fond + 2.6, -Math.PI / 2, { tunique: 0xb7950b, pantalon: 0x7f8c8d, casque: 'rond' });
      ratelier(-2.2, fond + 0.15, 0, ['lance', 'hache', 'masse', 'arc']); ratelier(2.2, fond + 0.15, 0, ['epee', 'kilij', 'spathion']);
      apprenti(-1.8, 1.4, Math.PI / 2, 'polir');
      M.boite(1.2, 0.8, 0.8, 0x6d4c41, s, -2.6, 0.4, 1.4); obst(-2.6, 1.4, 0.6);
      client(2.2, 1.6, -Math.PI / 2, 'acheteur');
    } else if (type === 'coutelier') {
      comptoir(0, fond + 1.7, 3, 0);
      places.push({ x: 0, z: fond + 0.9, ang: 0 });
      for (i = 0; i < 6; i++) { var dg = M.creerArme(['seax', 'couteau', 'khanjar'][i % 3]); dg.position.set(-1.2 + i * 0.45, 1.15, fond + 1.7); dg.rotation.z = Math.PI / 2; dg.rotation.x = -Math.PI / 2; s.add(dg); }
      ratelier(-2.4, fond + 0.15, 0, ['seax', 'couteau', 'khanjar', 'epee']);
      // Meule à aiguiser qui tourne, avec des étincelles
      var mg = new T.Group(); mg.position.set(w / 2 - 1.6, 0, 0.6); M.boite(1.2, 0.7, 0.5, 0x6d4c41, mg, 0, 0.35, 0);
      var roue = new T.Mesh(new T.CylinderGeometry(0.45, 0.45, 0.16, 12), M.mat(0x95a5a6)); roue.rotation.z = Math.PI / 2; var axe = new T.Group(); axe.position.y = 1.05; axe.add(roue); mg.add(axe); meuble(mg); obst(mg.position.x, mg.position.z, 0.7);
      V.tourne.push({ o: axe, axe: 'x', v: 8 });
      var ai = apprenti(w / 2 - 1.6, 1.5, Math.PI, 'aiguiser', _t('Rémouleur')); ai.etincelles = { x: mg.position.x, y: 1.05, z: mg.position.z + 0.4 };
      etagere(w / 2 - 1.5, fond, 0, 2, [0x7f8c8d, 0x6d4c41, 0x95a5a6]);
    } else if (type === 'orfevre') {
      comptoir(0, fond + 1.7, 3, 0);
      places.push({ x: 0, z: fond + 0.9, ang: 0 });
      etagere(-2.5, fond, 0, 2.4, [0xd4ac0d, 0xf4d03f, 0xd5d8dc, 0xb7950b], 'or'); etagere(2.5, fond, 0, 2.4, [0xf4d03f, 0xc0392b, 0x2874a6, 0x1e8449], 'or');
      for (i = 0; i < 5; i++) { var bj = new T.Mesh(new T.TorusGeometry(0.07, 0.025, 6, 12), M.mat([0xf4d03f, 0xd5d8dc][i % 2], { lueur: 0x4d3a00 })); bj.position.set(-1 + i * 0.5, 1.16, fond + 1.75); bj.rotation.x = Math.PI / 2; s.add(bj); }
      var cr = new T.Group(); cr.position.set(-w / 2 + 1.2, 0, 1.6); M.boite(1, 0.9, 1, 0x7b7d7d, cr, 0, 0.45, 0); M.boite(0.4, 0.2, 0.4, 0xff7b00, cr, 0, 0.95, 0, { basic: true, ombre: false }); meuble(cr); obst(cr.position.x, cr.position.z, 0.7); feuI(cr.position.x, 1.5, cr.position.z, 0.7, 6);
      apprenti(-w / 2 + 2.1, 1.6, -Math.PI / 2, 'marteau');
      var gd = ajouterPnj({ id: 'habitant', nom: _t('Garde'), nomCourt: _t('Garde'), look: Object.assign({ peau: FF.PEAU[1] }, lookGarde(style)), arme: 'lance', habitant: true }, w / 2 - 0.9, d / 2 - 1.4, false, 'garde'); gd.ang = -Math.PI / 2;
      feuI(0, 3, 0, 0.6, 8);
    } else if (type === 'apothicaire') {
      comptoir(0, fond + 1.7, 3, 0);
      places.push({ x: 0, z: fond + 0.9, ang: 0 });
      etagere(-2.4, fond, 0, 2.6, [0x1e8449, 0x8e44ad, 0xd68910, 0x2874a6, 0xc0392b], 'pot'); etagere(2.4, fond, 0, 2.6, [0x7d6608, 0x117864, 0xa04000, 0x5b2c6f], 'pot');
      etagere(-w / 2 + 0.4, 0.8, Math.PI / 2, 2.4, [0xd5d8dc, 0x1e8449, 0xd68910], 'pot');
      // Herbes séchées au plafond
      for (i = 0; i < 8; i++) M.boite(0.18, 0.5, 0.18, [0x6b8e23, 0x7d6608, 0x58792a][i % 3], s, -3 + i * 0.85, S0.h - 0.55, 0.6 + (i % 2) * 0.5, { ombre: false });
      var mo = new T.Mesh(new T.CylinderGeometry(0.18, 0.14, 0.22, 8), M.mat(0x95a5a6)); mo.position.set(0.9, 1.22, fond + 1.7); s.add(mo);
      tableI(w / 2 - 1.6, 1.3, 1.6, 1);
      var ap = apprenti(w / 2 - 1.6, 2.2, Math.PI, 'piler', _t('Apprentie')); ap.P.g.scale.setScalar(0.9);
      client(-1.5, 1.6, Math.PI * 0.9, 'acheteur');
    } else if (type === 'marchand') {
      comptoir(0, fond + 1.8, 3.6, 0);
      places.push({ x: 0, z: fond + 1, ang: 0 });
      etagere(-3, fond, 0, 3, [0xc0392b, 0x2874a6, 0xd4ac0d, 0x1e8449], 'rouleau'); etagere(3, fond, 0, 3, [0x8d6e63, 0xa1887f, 0xd5d8dc]);
      for (i = 0; i < 6; i++) meuble(M.PROPS.caisse(-w / 2 + 0.9 + (i % 2) * 0.9, 0.2 + Math.floor(i / 2) * 1.1, 0.7));
      [[w / 2 - 1, 0.5], [w / 2 - 1, 1.6], [w / 2 - 1.9, 0.9]].forEach(function (q, k) { var sac = M.boite(0.7, 0.9, 0.6, 0xd7c9a6, s, q[0], 0.45, q[1]); obst(q[0], q[1], 0.45); });
      tonneau(w / 2 - 1, 2.8); meuble(tonneau(w / 2 - 1, 2.8)); obst(w / 2 - 1, 2.8, 0.5);
      client(-1.6, 1.5, Math.PI * 0.9, 'acheteur'); client(1.4, 2.6, -Math.PI * 0.8, 'acheteur');
      var po = ajouterPnj({ id: 'habitant', nom: _t('Portefaix'), nomCourt: _t('Portefaix'), look: { peau: FF.PEAU[2], tunique: 0x8d6e63, pantalon: 0x5d4037 }, habitant: true }, -2, 2.5, true, 'porteur');
      M.boite(0.7, 0.55, 0.7, 0x8d6e63, po.P.haut, 0, 2.2, 0); po.route = [{ x: -w / 2 + 2, z: 1.2 }, { x: 0.5, z: 3 }, { x: w / 2 - 2, z: 1.4 }, { x: 0, z: 2.6 }]; po.iRoute = 0; po.vit = 1.1;
    } else if (type === 'banque') {
      comptoir(0, fond + 2, 5, 0);
      places.push({ x: -1, z: fond + 1.2, ang: 0 });
      for (i = 0; i < 4; i++) { var co = new T.Group(); co.position.set(-w / 2 + 1 + i * 1.3, 0, fond + 0.2); M.boite(1, 0.7, 0.7, 0x6e2c00, co, 0, 0.35, 0); M.boite(1.05, 0.1, 0.75, 0xd4ac0d, co, 0, 0.72, 0); meuble(co); }
      for (i = 0; i < 6; i++) { var pi = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.08 + i * 0.03, 8), M.mat(0xf4d03f, { lueur: 0x4d3a00 })); pi.position.set(0.6 + (i % 3) * 0.3, 1.13 + i * 0.015, fond + 2 + (i > 2 ? 0.2 : -0.1)); s.add(pi); }
      M.boite(0.8, 0.5, 0.05, 0xf4ecd8, s, -1.5, 1.14, fond + 2, { ombre: false });
      var cl = apprenti(1.6, fond + 1.2, 0, 'ecrire', _t('Clerc')); cl.P.g.scale.setScalar(1);
      [-1, 1].forEach(function (cs) { var g2 = ajouterPnj({ id: 'habitant', nom: _t('Garde'), nomCourt: _t('Garde'), look: Object.assign({ peau: FF.PEAU[1] }, lookGarde(style)), arme: 'lance', habitant: true }, cs * (w / 2 - 0.9), d / 2 - 1.5, false, 'garde'); g2.ang = cs > 0 ? -Math.PI / 2 : Math.PI / 2; });
      client(-0.6, 1.2, Math.PI, 'acheteur');
      for (var colI = -1; colI <= 1; colI += 2) { var cln = new T.Mesh(new T.CylinderGeometry(0.3, 0.35, S0.h, 10), M.mat(0xe5e7e9)); cln.position.set(colI * 3, S0.h / 2, 1.5); cln.castShadow = true; s.add(cln); obst(colI * 3, 1.5, 0.45); }
    } else if (type === 'caserne') {
      places.push({ x: -2.5, z: fond + 1.6, ang: 0 }, { x: 0.5, z: fond + 1.6, ang: 0 });
      tableI(-2.5, fond + 0.8, 2, 0.9); M.boite(0.9, 0.04, 0.6, 0xf4ecd8, s, -2.5, 0.9, fond + 0.8, { ombre: false });
      banniereMur(-w / 2 + 2.4, 2.8, fond - 0.12, 0, faction, s, 1.1); banniereMur(w / 2 - 2.4, 2.8, fond - 0.12, 0, faction, s, 1.1); banniereMur(0, 3, fond - 0.12, 0, faction, s, 0.9);
      ratelier(-w / 2 + 0.5, 0.5, Math.PI / 2, ['lance', 'lance', 'hache', 'epee']); ratelier(-w / 2 + 0.5, 3, Math.PI / 2, ['arc', 'arbalete', 'lance']);
      // Lits de camp
      for (i = 0; i < 3; i++) { var lx = w / 2 - 1, lz = fond + 1 + i * 1.6; M.boite(1.8, 0.4, 0.9, 0x6d4c41, s, lx, 0.2, lz); M.boite(1.6, 0.12, 0.8, 0xa1887f, s, lx, 0.45, lz); obst(lx, lz, 0.6); }
      // Quintaine : un soldat s'entraîne à frapper
      var qx = 2.6, qz = 1.6; M.boite(0.2, 1.8, 0.2, 0x6d4c41, s, qx, 0.9, qz); M.boite(0.6, 0.7, 0.4, 0xb39445, s, qx, 1.3, qz); M.boite(1.2, 0.1, 0.1, 0x6d4c41, s, qx, 1.6, qz); obst(qx, qz, 0.5);
      var so2 = ajouterPnj({ id: 'habitant', nom: _t('Soldat'), nomCourt: _t('Soldat'), look: Object.assign({ peau: FF.PEAU[Math.floor(r() * 4)] }, lookGarde(style)), arme: 'epee', habitant: true }, qx, qz + 1.3, false, 'soldat');
      so2.ang = Math.PI; so2.artisan = 'frappe';
      // Recrues en rang
      for (i = 0; i < 3; i++) { var rc = ajouterPnj({ id: 'habitant', nom: _t('Recrue'), nomCourt: _t('Recrue'), look: Object.assign({ peau: FF.PEAU[Math.floor(r() * FF.PEAU.length)] }, LOOKS_PAYSANS[i % LOOKS_PAYSANS.length]), arme: 'lance', habitant: true }, -2.2 + i * 1.1, 2.6, false, 'soldat'); rc.ang = 0; }
      feuI(0, 3.4, 0, 0.7, 10);
    } else if (type === 'prevote') {
      tableI(-2.6, fond + 1.2, 2.2, 1); M.boite(0.5, 0.03, 0.7, 0xf4ecd8, s, -2.9, 0.9, fond + 1.2, { ombre: false });
      tableI(2.6, fond + 1.2, 2.2, 1); for (i = 0; i < 4; i++) M.boite(0.4, 0.03, 0.55, 0xf4ecd8, s, 2.1 + i * 0.32, 0.9 + i * 0.01, fond + 1.2 - (i % 2) * 0.1, { ombre: false });
      places.push({ x: -2.6, z: fond + 0.35, ang: 0 }, { x: 2.6, z: fond + 0.35, ang: 0 });
      // Avis de recherche au mur
      for (i = 0; i < 4; i++) { M.boite(0.55, 0.7, 0.03, 0xf4ecd8, s, -1 + i * 0.7, 2.2 + (i % 2) * 0.2, fond - 0.13, { ombre: false }); M.boite(0.3, 0.3, 0.035, 0x5d4037, s, -1 + i * 0.7, 2.3 + (i % 2) * 0.2, fond - 0.12, { ombre: false }); }
      // Cellule avec un prisonnier
      var cx0 = -w / 2 + 1.6, cz0 = 1.6;
      for (i = 0; i < 7; i++) M.boite(0.08, 2.6, 0.08, 0x424949, s, cx0 - 1.2 + i * 0.4, 1.3, cz0 + 1.3);
      for (i = 0; i < 6; i++) M.boite(0.08, 2.6, 0.08, 0x424949, s, cx0 + 1.2, 1.3, cz0 - 1.2 + i * 0.45);
      M.boite(2.5, 0.1, 0.1, 0x424949, s, cx0, 2.5, cz0 + 1.3);
      for (i = 0; i < 6; i++) obst(cx0 - 1.2 + i * 0.5, cz0 + 1.3, 0.3); for (i = 0; i < 5; i++) obst(cx0 + 1.2, cz0 - 1.2 + i * 0.6, 0.3);
      var pr = ajouterPnj({ id: 'habitant', nom: _t('Prisonnier'), nomCourt: _t('Prisonnier'), look: { peau: FF.PEAU[2], tunique: 0x6d4c41, pantalon: 0x4e342e, barbe: 0x3e2723, cheveux: 0x3e2723 }, habitant: true }, cx0 - 0.3, cz0, false, 'prisonnier');
      assis(pr); pr.P.corps.position.y = -0.85; pr.ang = Math.PI / 2;
      [[w / 2 - 1, d / 2 - 1.6, -Math.PI / 2], [1, 1.8, Math.PI]].forEach(function (q) { var g3 = ajouterPnj({ id: 'habitant', nom: _t('Garde du prévôt'), nomCourt: _t('Garde du prévôt'), look: Object.assign({ peau: FF.PEAU[Math.floor(r() * 3)] }, lookGarde(style)), arme: 'lance', habitant: true }, q[0], q[1], false, 'garde'); g3.ang = q[2]; });
      feuI(0, 3.2, 0, 0.7, 10);
    } else if (type === 'cordonnier') {
      comptoir(0, fond + 1.7, 2.6, 0);
      places.push({ x: 0, z: fond + 0.9, ang: 0 });
      etagere(-2.4, fond, 0, 2.6, [0x6e2c00, 0x3e2723, 0x8d5a2b, 0x4a2f1b], 'botte'); etagere(2.4, fond, 0, 2.6, [0x5d4037, 0x6e2c00, 0x1c1c1c], 'botte');
      M.boite(1, 0.45, 0.6, 0x6d4c41, s, w / 2 - 1.4, 0.23, 1.2); obst(w / 2 - 1.4, 1.2, 0.5);
      var cd = apprenti(w / 2 - 1.4, 1.2, -Math.PI / 2, 'marteau'); assis(cd); cd.P.corps.position.y = -0.5;
      for (i = 0; i < 4; i++) M.boite(0.6, 0.02, 0.5, [0x8d5a2b, 0x6e2c00][i % 2], s, -w / 2 + 1.2, 0.02 + i * 0.03, 1.4 + i * 0.1, { ombre: false });
      client(-1.4, 1.8, Math.PI, 'acheteur');
    } else if (type === 'tailleur') {
      tableI(0, fond + 1.5, 3, 1.2);
      for (i = 0; i < 4; i++) M.boite(0.6, 0.04, 0.9, [0xc0392b, 0x2874a6, 0x1e8449, 0xd4ac0d][i], s, -1.1 + i * 0.7, 0.9 + i * 0.01, fond + 1.5, { ombre: false });
      places.push({ x: 0, z: fond + 0.6, ang: 0 });
      etagere(-2.6, fond, 0, 2.4, [0xc0392b, 0x2874a6, 0x1e8449, 0xd4ac0d, 0x8e44ad, 0xf4f1e8], 'rouleau'); etagere(2.6, fond, 0, 2.4, [0x7b241c, 0x1b4f72, 0x7d6608, 0x5b2c6f], 'rouleau');
      mannequin(-w / 2 + 1.2, 1.4, Math.PI / 2, { tunique: 0x2874a6, pantalon: 0x1b2631, cape: 0xc0392b });
      mannequin(w / 2 - 1.2, 1.4, -Math.PI / 2, { tunique: 0x1e8449, pantalon: 0x7d6608 });
      var ct = apprenti(-w / 2 + 2, 1.4, -Math.PI / 2, 'coudre', _t('Couturière')); ct.P.g.scale.setScalar(0.95);
    } else if (type === 'fourreur') {
      tableI(0, fond + 1.5, 2.6, 1.1);
      places.push({ x: 0, z: fond + 0.6, ang: 0 });
      // Peaux tendues et fourrures suspendues
      for (i = 0; i < 6; i++) M.boite(0.9, 1.2, 0.06, [0x6e2c00, 0x8d6e63, 0xf4f6f6, 0x3e2723, 0xa1887f, 0x5d4037][i], s, -3.2 + i * 1.3, 2.4, fond - 0.12);
      for (i = 0; i < 3; i++) { var cx2 = -w / 2 + 0.2, cz2 = 0.2 + i * 1.3; M.boite(0.06, 1.1, 0.9, [0x6e2c00, 0xf4f6f6, 0x8d6e63][i], s, cx2, 2, cz2); }
      M.boite(1.2, 0.06, 0.9, 0x8d6e63, s, 0, 0.92, fond + 1.5, { ombre: false });
      mannequin(w / 2 - 1.2, 1.4, -Math.PI / 2, { tunique: 0x4e342e, pantalon: 0x3e2723, cape: 0x8d6e63, casque: 'fourrure' });
      var fr = apprenti(w / 2 - 2.2, 2.4, -Math.PI * 0.8, 'coudre'); fr.P.g.scale.setScalar(0.9);
    }
    // Chandelles sur les tables et la lumière du jour par la porte
    V.places = places;
    V.points = [{ x: -1, z: 1 }, { x: 1, z: 1.5 }, { x: 0, z: d / 2 - 2 }];
  }

  // ---------- Animaux ----------
  function creerBete(type) {
    var g = new T.Group(), B = { g: g, type: type, pattes: [] };
    function patte(x, z, h, c) { var p = new T.Group(); p.position.set(x, h, z); g.add(p); M.boite(0.12 * (h > 0.6 ? 1.6 : 1), h, 0.12 * (h > 0.6 ? 1.6 : 1), c, p, 0, -h / 2, 0); B.pattes.push(p); }
    if (type === 'poule') {
      var c = Math.random() < 0.5 ? 0xfdfefe : 0xa04000;
      M.boite(0.34, 0.3, 0.45, c, g, 0, 0.36, 0);
      B.tete = new T.Group(); B.tete.position.set(0, 0.5, 0.2); g.add(B.tete);
      M.boite(0.18, 0.2, 0.18, c, B.tete, 0, 0.08, 0.04); M.boite(0.06, 0.1, 0.12, 0xc0392b, B.tete, 0, 0.22, 0.02, { ombre: false }); M.boite(0.06, 0.05, 0.1, 0xf39c12, B.tete, 0, 0.06, 0.17, { ombre: false });
      patte(-0.08, 0, 0.22, 0xf39c12); patte(0.08, 0, 0.22, 0xf39c12);
      B.vit = 0.9; B.rayon = 5;
    } else if (type === 'chien') {
      var cc = [0x6e2c00, 0x3e2723, 0xd5a253][Math.floor(Math.random() * 3)];
      M.boite(0.4, 0.38, 0.95, cc, g, 0, 0.55, 0);
      B.tete = new T.Group(); B.tete.position.set(0, 0.75, 0.5); g.add(B.tete);
      M.boite(0.32, 0.3, 0.32, cc, B.tete, 0, 0.05, 0.05); M.boite(0.18, 0.15, 0.2, cc, B.tete, 0, -0.02, 0.27); M.boite(0.08, 0.14, 0.06, 0x1c1c1c, B.tete, -0.11, 0.24, -0.02); M.boite(0.08, 0.14, 0.06, 0x1c1c1c, B.tete, 0.11, 0.24, -0.02);
      B.queue = M.boite(0.08, 0.08, 0.4, cc, g, 0, 0.75, -0.6); B.queue.rotation.x = 0.6;
      patte(-0.13, 0.32, 0.38, cc); patte(0.13, 0.32, 0.38, cc); patte(-0.13, -0.32, 0.38, cc); patte(0.13, -0.32, 0.38, cc);
      B.vit = 2.4; B.rayon = 12;
    } else if (type === 'mouton' || type === 'chevre') {
      var laine = type === 'mouton' ? 0xf4f6f6 : 0x5d4037;
      M.boite(0.6, 0.5, 0.9, laine, g, 0, 0.7, 0);
      B.tete = new T.Group(); B.tete.position.set(0, 0.85, 0.5); g.add(B.tete);
      M.boite(0.26, 0.3, 0.32, type === 'mouton' ? 0x2c2c2c : 0x4e342e, B.tete, 0, 0, 0.1);
      if (type === 'chevre') { M.boite(0.06, 0.25, 0.06, 0xd5d8dc, B.tete, -0.08, 0.25, 0); M.boite(0.06, 0.25, 0.06, 0xd5d8dc, B.tete, 0.08, 0.25, 0); }
      var pc = 0x2c2c2c;
      patte(-0.18, 0.3, 0.45, pc); patte(0.18, 0.3, 0.45, pc); patte(-0.18, -0.3, 0.45, pc); patte(0.18, -0.3, 0.45, pc);
      B.vit = 0.5; B.rayon = 2.6;
    } else if (type === 'vache') {
      M.boite(0.9, 0.85, 1.9, 0xfdfefe, g, 0, 1.2, 0); M.boite(0.92, 0.5, 0.6, 0x1c1c1c, g, 0, 1.3, 0.2);
      B.tete = new T.Group(); B.tete.position.set(0, 1.45, 1.05); g.add(B.tete);
      M.boite(0.5, 0.5, 0.55, 0xfdfefe, B.tete, 0, 0, 0.15); M.boite(0.4, 0.22, 0.12, 0xf5b7b1, B.tete, 0, -0.15, 0.45);
      M.boite(0.6, 0.08, 0.08, 0xd5d8dc, B.tete, 0, 0.3, 0.05);
      patte(-0.3, 0.7, 0.8, 0xfdfefe); patte(0.3, 0.7, 0.8, 0xfdfefe); patte(-0.3, -0.7, 0.8, 0xfdfefe); patte(0.3, -0.7, 0.8, 0xfdfefe);
      B.vit = 0.35; B.rayon = 3;
    } else if (type === 'cheval') {
      var ch = [0x6e2c00, 0x1c1c1c, 0xd5d8dc, 0xa04000][Math.floor(Math.random() * 4)];
      M.boite(0.75, 0.8, 2, ch, g, 0, 1.45, 0);
      B.tete = new T.Group(); B.tete.position.set(0, 1.8, 1); g.add(B.tete);
      var cou = M.boite(0.4, 1, 0.45, ch, B.tete, 0, 0.35, 0.1); cou.rotation.x = 0.5;
      M.boite(0.38, 0.38, 0.8, ch, B.tete, 0, 0.75, 0.45);
      M.boite(0.12, 0.7, 0.3, 0x1c1c1c, B.tete, 0, 0.6, -0.05);
      M.boite(0.8, 0.12, 0.9, 0x7b241c, g, 0, 1.9, -0.1); // selle
      patte(-0.25, 0.75, 1.05, ch); patte(0.25, 0.75, 1.05, ch); patte(-0.25, -0.75, 1.05, ch); patte(0.25, -0.75, 1.05, ch);
      B.vit = 0; B.rayon = 0;
    } else if (type === 'chameau') {
      var ca = 0xc9a26b;
      M.boite(0.8, 0.8, 2, ca, g, 0, 1.9, 0); M.boite(0.6, 0.6, 0.7, ca, g, 0, 2.5, -0.1);
      B.tete = new T.Group(); B.tete.position.set(0, 2.1, 1); g.add(B.tete);
      var cc2 = M.boite(0.3, 1.2, 0.35, ca, B.tete, 0, 0.4, 0.2); cc2.rotation.x = 0.7;
      M.boite(0.32, 0.32, 0.65, ca, B.tete, 0, 0.9, 0.65);
      M.boite(0.9, 0.15, 0.6, 0xa93226, g, 0, 2.85, -0.1);
      patte(-0.25, 0.75, 1.5, ca); patte(0.25, 0.75, 1.5, ca); patte(-0.25, -0.75, 1.5, ca); patte(0.25, -0.75, 1.5, ca);
      B.vit = 0; B.rayon = 0;
    }
    g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    return B;
  }
  function ajouterBete(type, x, z, maison) {
    var B = creerBete(type);
    B.pos = B.g.position; B.pos.set(x, 0, z);
    B.maison = maison || { x: x, z: z };
    B.ang = Math.random() * 6; B.g.rotation.y = B.ang;
    B.but = { x: x, z: z }; B.attente = Math.random() * 3; B.ph = Math.random() * 6; B.t = Math.random() * 10;
    M.scene.add(B.g);
    if (!B.vit) V.obstacles.push({ x: x, z: z, r: type === 'chameau' || type === 'cheval' ? 1.1 : 0.5 });
    V.betes.push(B);
    return B;
  }
  function majBetes(dt) {
    var j = V.j;
    V.betes.forEach(function (B) {
      B.t += dt;
      var cible = null;
      if (B.type === 'chien') {
        var dj = Math.hypot(j.pos.x - B.pos.x, j.pos.z - B.pos.z);
        if (dj < 7 || B.suit) { B.suit = dj < 14; if (dj > 2.2) cible = { x: j.pos.x - Math.sin(j.ang) * 1.6, z: j.pos.z - Math.cos(j.ang) * 1.6 }; }
        if (B.queue) B.queue.rotation.y = Math.sin(B.t * (B.suit ? 14 : 4)) * 0.6;
      }
      if (!cible && B.vit) {
        var dx = B.but.x - B.pos.x, dz = B.but.z - B.pos.z;
        if (Math.hypot(dx, dz) < 0.3) {
          B.attente -= dt;
          if (B.attente <= 0) { var a = Math.random() * 6.3, d = Math.random() * B.rayon; B.but = { x: B.maison.x + Math.cos(a) * d, z: B.maison.z + Math.sin(a) * d }; B.attente = 1 + Math.random() * 4; }
        } else cible = B.but;
      }
      var bouge = false;
      if (cible) {
        var ddx = cible.x - B.pos.x, ddz = cible.z - B.pos.z, dd = Math.hypot(ddx, ddz);
        if (dd > 0.25) {
          var v = B.vit * (B.suit && dd > 4 ? 1.8 : 1);
          B.pos.x += ddx / dd * v * dt; B.pos.z += ddz / dd * v * dt;
          B.ang += difAngle(B.ang, Math.atan2(ddx, ddz)) * Math.min(1, dt * 6);
          bouge = true;
        }
      }
      // Pas de bête dans les murs de la ville
      var r = Math.hypot(B.pos.x, B.pos.z);
      if (r > V.rayon - 1) { B.pos.x *= (V.rayon - 1) / r; B.pos.z *= (V.rayon - 1) / r; }
      B.g.rotation.y = B.ang;
      if (bouge) { B.ph += dt * 10; B.pattes.forEach(function (p, i) { p.rotation.x = Math.sin(B.ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.5; }); }
      else B.pattes.forEach(function (p) { p.rotation.x *= 0.8; });
      // La tête : la poule picore, les grands animaux broutent ou secouent la tête
      if (B.tete) {
        if (B.type === 'poule') B.tete.rotation.x = bouge ? 0 : Math.max(0, Math.sin(B.t * 6)) * 1.1;
        else if (B.type === 'chien') B.tete.rotation.x = bouge ? 0 : Math.sin(B.t * 1.5) * 0.1;
        else if (!bouge) B.tete.rotation.x = 0.25 + Math.sin(B.t * 0.8 + B.ph) * 0.25;
      }
    });
  }

  // ---------- Habitants ----------
  var LOOKS = [
    { tunique: 0x8d6e63, pantalon: 0x5d4037, casque: 'capuche' }, { tunique: 0x2874a6, pantalon: 0x34495e, cheveux: 0x3e2723 },
    { tunique: 0xa04000, pantalon: 0x4a235a, cheveux: 0x1c1c1c }, { tunique: 0x27ae60, pantalon: 0x34495e, casque: 'turban' },
    { tunique: 0xf4ecd8, pantalon: 0x7e5109, casque: 'turban' }, { tunique: 0x7d3c98, pantalon: 0x1b2631, cheveux: 0x6e2c00 },
    { tunique: 0xd4ac0d, pantalon: 0x5d4037, casque: 'chapel' }, { tunique: 0xc0392b, pantalon: 0x212f3d, cheveux: 0xd35400 }
  ];
  var LOOKS_PAYSANS = [
    { tunique: 0xa1887f, pantalon: 0x6d4c41, casque: 'capuche' }, { tunique: 0x8d6e63, pantalon: 0x4e342e, cheveux: 0x3e2723, barbe: 0x3e2723 },
    { tunique: 0xbcaaa4, pantalon: 0x5d4037, cheveux: 0xd4ac0d }, { tunique: 0x6d8b74, pantalon: 0x4e342e, casque: 'chapel' }
  ];
  function lookGarde(style) {
    if (style === 'orient') return { tunique: 0xfdfefe, pantalon: 0x1b4f72, casque: 'turban', bouclier: 'rond', bc: 0x1b4f72 };
    if (style === 'byzance') return { tunique: 0x7d3c98, pantalon: 0x4a235a, casque: 'rond', bouclier: 'rond', bc: 0x7d3c98 };
    return { tunique: 0x5d6d7e, pantalon: 0x34495e, casque: 'nasal', bouclier: 'kite', bc: 0x922b21 };
  }
  // Ce que disent les gens quand tu passes à côté d'eux
  var PAROLES = {
    garde: [_t('Circulez.'), _t('Pas de bagarre en ville !'), _t('Tout est calme aujourd\'hui.'), _t('Les portes ferment au coucher du soleil.'), _t('Range ton épée, étranger.')],
    enfant: [_t('Un chevalier ! Un vrai !'), _t('Tu me montres ton épée ?'), _t('Attrape-moi si tu peux !'), _t('Hé ! Par ici !'), _t('Moi aussi, plus tard, je serai soldat !')],
    porteur: [_t('Attention, ça passe !'), _t('Pardon, pardon !'), _t('Lourd, ce chargement…')],
    paysan: [_t('La récolte sera bonne cette année.'), _t('Les brigands ont encore volé deux moutons.'), _t('Bonjour, seigneur.'), _t('Mes fils pourraient te suivre, si la paye est bonne.'), _t('Il faudra bientôt rentrer le foin.')],
    client: [_t('À ta santé, étranger !'), _t('Encore une chope, la belle !'), _t('Ce ragoût est le meilleur de la ville.'), _t('J\'ai tout perdu aux dés…')],
    serveuse: [_t('Qu\'est-ce que je vous sers ?'), _t('Attention, c\'est chaud !'), _t('Une cervoise, ça marche !')],
    musicien: [_t('♪ Halt e grant sunt les puiz e les vals… ♪'), _t('♪ Une chanson pour le chevalier ! ♪'), _t('♪ Écoutez la geste de Roland… ♪')],
    apprenti: [_t('Le maître dit que je fais des progrès !'), _t('Encore une heure de travail…'), _t('Bonjour, seigneur.')],
    soldat: [_t('À vos ordres !'), _t('On s\'entraîne tous les jours.'), _t('La paye tombe à la fin du mois.')],
    prisonnier: [_t('Je suis innocent, je le jure !'), _t('Un peu d\'eau, par pitié…')],
    acheteur: [_t('C\'est trop cher…'), _t('Je vais réfléchir.'), _t('Belle marchandise !')],
    lavandiere: [_t('L\'eau est froide ce matin !'), _t('Encore des taches de vin…'), _t('Tu as vu le fils du boulanger ?')],
    macon: [_t('Encore un rang de pierres et le mur sera fini.'), _t('Attention aux pierres !')],
    couvreur: [_t('Gare en dessous !'), _t('De là-haut, on voit toute la ville !')],
    charpentier: [_t('Ce chêne est solide, il tiendra cent ans.'), _t('Passe-moi la scie !')],
    collecteur: [_t('Au nom du seigneur, l\'impôt est dû !'), _t('Tout le monde paie, même les chevaliers.')],
    tisserand: [_t('Une aune de drap par jour, pas plus.'), _t('Ce fil vient de nos moutons.')],
    foulon: [_t('On piétine le drap pour le rendre solide.'), _t('J\'ai les pieds tout bleus !')],
    meunier: [_t('Le vent est bon aujourd\'hui, le moulin tourne !'), _t('Le meunier prend sa part, c\'est la règle.')],
    boulanger: [_t('Pain chaud ! Pain tout chaud !'), _t('Des galettes au miel !'), _t('Le pain de seigle, pour pas cher !')],
    boucher: [_t('Belle viande de mouton !'), _t('Du lard, du jambon, approchez !'), _t('Abattu ce matin !')],
    poissonnier: [_t('Poisson frais ! Tout frais !'), _t('Des harengs et des anguilles !'), _t('Pêché à l\'aube !')],
    drapier: [_t('De belles étoffes, de toutes les couleurs !'), _t('Du drap de laine pour l\'hiver !')],
    habitant: [_t('Bonjour, voyageur.'), _t('Le pain a encore augmenté…'), _t('Tu viens de loin ?'), _t('On dit que les armées des Francs passent par ici.'), _t('Le marché est animé aujourd\'hui.'), _t('Ne bois pas l\'eau du port, crois-moi.')]
  };
  var CRIEURS = ['marchand', 'boulanger', 'boucher', 'poissonnier', 'drapier'];
  var SALUT = { catholique: _t('Que Dieu te garde.'), orthodoxe: _t('Que le Christ te garde.'), sunnite: _t('Salam aleykoum, voyageur.'), chiite: _t('Salam aleykoum, voyageur.'), armenienne: _t('Barev, voyageur !'), juive: _t('Shalom, voyageur.'), mystere: '…',
    copte: _t('Que le Seigneur te bénisse.'), syriaque: _t('Shlomo, voyageur.'), maronite: _t('Que saint Maron te protège.'), nestorienne: _t('Shlama, voyageur.'), druze: _t('Salam, étranger.'),
    samaritaine: _t('Shalom, voyageur.'), paienne: _t('Que les anciens dieux te regardent.') };

  function animerMarche(P, ph, amp) {
    P.jambeG.rotation.x = Math.sin(ph) * amp; P.jambeD.rotation.x = -Math.sin(ph) * amp;
    P.brasG.rotation.x = -Math.sin(ph) * amp * 0.6; P.brasD.rotation.x = Math.sin(ph) * amp * 0.6 - 0.1;
    P.corps.position.y = Math.abs(Math.sin(ph)) * amp * 0.1;
  }

  // Bulles de paroles au-dessus des têtes
  function parler(o, texte, duree) {
    if (o.bulle) o.bulle.el.remove();
    var e = document.createElement('div');
    e.className = 'bulle';
    e.textContent = texte;
    document.getElementById('calqueTextes').appendChild(e);
    o.bulle = { el: e, t: duree || 3.2 };
  }
  function paroleDe(o) {
    var t = o.type;
    if (t === 'marchand') { var l = V.cfg.cris || []; return l.length ? l[Math.floor(Math.random() * l.length)] : _t('Approchez, approchez !'); }
    var liste = PAROLES[t] || PAROLES.habitant;
    if ((t === 'habitant' || t === 'paysan') && Math.random() < 0.25) return SALUT[V.cfg.lieu.religion] || SALUT.catholique;
    return liste[Math.floor(Math.random() * liste.length)];
  }

  function maj(dt) {
    if (M.a('pause')) { V.cfg.pause && V.cfg.pause(); return; }
    V.temps += dt;
    var j = V.j, dep = M.deplacement(), rc = M.rotationCamera();
    V.yaw -= rc.dx * 0.0042;
    V.pitch = Math.max(0.1, Math.min(0.8, V.pitch + rc.dy * 0.003));
    var mv = new T.Vector3();
    if (dep.l > 0.05) mv.set(Math.sin(V.yaw) * dep.z - Math.cos(V.yaw) * dep.x, 0, Math.cos(V.yaw) * dep.z + Math.sin(V.yaw) * dep.x);
    var courir = M.E.touches.ShiftLeft || M.E.touches.ShiftRight || M.tenu('courir');
    var vit = (courir ? 6.5 : 4) * dep.l;
    if (mv.lengthSq() > 0.001) { mv.normalize(); j.ang += difAngle(j.ang, Math.atan2(mv.x, mv.z)) * Math.min(1, dt * 12); }
    j.pos.x += mv.x * vit * dt; j.pos.z += mv.z * vit * dt;
    // Collisions
    V.obstacles.forEach(function (o) {
      var dx = j.pos.x - o.x, dz = j.pos.z - o.z, d = Math.hypot(dx, dz), m = 0.45 + o.r;
      if (d < m && d > 0.001) { j.pos.x = o.x + dx / d * m; j.pos.z = o.z + dz / d * m; }
    });
    var r = Math.hypot(j.pos.x, j.pos.z);
    if (V.salle) {
      // Dans un bâtiment : les murs, et la porte au sud pour ressortir
      var mw = V.salle.w / 2 - 0.45, md = V.salle.d / 2 - 0.45;
      if (j.pos.z > md - 0.1 && Math.abs(j.pos.x) < 0.9 && mv.z > 0.2) { quitter(); return; }
      j.pos.x = Math.max(-mw, Math.min(mw, j.pos.x)); j.pos.z = Math.max(-md, Math.min(md, j.pos.z));
    } else if (r > V.rayon) {
      // Porte au sud : on sort
      if (j.pos.z > 0 && Math.abs(j.pos.x) < 3) { quitter(); return; }
      j.pos.x *= V.rayon / r; j.pos.z *= V.rayon / r;
    }
    j.ph += dt * vit * 2.4;
    animerMarche(j.P, j.ph, Math.min(1, vit / 3) * 0.7);
    j.P.g.rotation.y = j.ang;
    // PNJ et habitants
    var proche = null, pd = 3;
    V.pnjs.forEach(function (p) {
      var bouge = false;
      if (p.marche) {
        var but = p.route ? p.route[p.iRoute] : p.but;
        var dx = but.x - p.pos.x, dz = but.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.5 || p.attente > 0) {
          p.attente -= dt;
          if (p.attente <= 0 && d < 0.5) {
            if (p.route) { p.iRoute = (p.iRoute + 1) % p.route.length; p.attente = p.type === 'garde' ? 0.6 + Math.random() * 1.5 : 0; }
            else { p.but = V.points[Math.floor(Math.random() * V.points.length)]; p.attente = p.type === 'enfant' ? Math.random() * 0.6 : 1 + Math.random() * 4; }
          }
        } else {
          p.pos.x += dx / d * p.vit * dt; p.pos.z += dz / d * p.vit * dt;
          p.ang += difAngle(p.ang, Math.atan2(dx, dz)) * Math.min(1, dt * 6);
          p.ph += dt * p.vit * 2.5; bouge = true;
        }
        animerMarche(p.P, p.ph, bouge ? (p.type === 'enfant' ? 0.9 : 0.5) : 0);
      }
      // Gestes : porteur (bras levés), forgeron (marteau), paysan (faucille), marchand (bras qui s'agitent)
      if (p.type === 'porteur') { p.P.brasG.rotation.x = -2.9; p.P.brasD.rotation.x = -2.9; }
      if (p.artisan === 'forge') {
        var cyc = (V.temps * 1.3) % 1;
        p.P.brasD.rotation.x = cyc < 0.7 ? -0.4 - cyc / 0.7 * 2.2 : -2.6 + (cyc - 0.7) / 0.3 * 2.2;
        if (p.cycPrec != null && cyc < p.cycPrec) {
          var dfj = Math.hypot(j.pos.x - p.pos.x, j.pos.z - p.pos.z);
          if (dfj < 22) M.eclats(new T.Vector3(p.enclume.x, 0.9, p.enclume.z), 0xffb347, 5, 2.5, 9);
          if (dfj < 9) M.son('enclume');
        }
        p.cycPrec = cyc;
      }
      var tA = V.temps + p.ph;
      if (p.artisan === 'marteau') { var cm = (tA * 1.6) % 1; p.P.brasD.rotation.x = cm < 0.7 ? -0.6 - cm / 0.7 * 1.6 : -2.2 + (cm - 0.7) / 0.3 * 1.6; }
      else if (p.artisan === 'soufflet') { var cs2 = Math.sin(tA * 3); p.P.brasD.rotation.x = p.P.brasG.rotation.x = -1 + cs2 * 0.45; p.P.haut.rotation.x = 0.2 + cs2 * 0.1; }
      else if (p.artisan === 'polir' || p.artisan === 'piler' || p.artisan === 'coudre' || p.artisan === 'ecrire') { var v2 = p.artisan === 'piler' ? 5 : p.artisan === 'polir' ? 4 : 2.5; p.P.brasD.rotation.x = -1 + Math.sin(tA * v2) * (p.artisan === 'piler' ? 0.35 : 0.15); p.P.brasG.rotation.x = -0.9; p.P.haut.rotation.x = 0.25; }
      else if (p.artisan === 'aiguiser') { p.P.brasD.rotation.x = p.P.brasG.rotation.x = -1.2 + Math.sin(tA * 2) * 0.1; p.P.haut.rotation.x = 0.3; if (p.etincelles && Math.random() < dt * 4) M.eclats(new T.Vector3(p.etincelles.x, p.etincelles.y, p.etincelles.z), 0xffb347, 3, 2, 6); }
      else if (p.artisan === 'frappe') { var cf = (tA * 1.1) % 1; p.P.brasD.rotation.x = cf < 0.5 ? -0.3 - cf * 4 : -2.3 + (cf - 0.5) * 4; p.P.haut.rotation.y = cf < 0.5 ? 0.3 : -0.3 + (cf - 0.5) * 1.2; }
      else if (p.artisan === 'scie') { var sc = Math.sin(tA * 5); p.P.brasD.rotation.x = -1.1 + sc * 0.4; p.P.haut.rotation.x = 0.4; }
      else if (p.artisan === 'tisse') { var ct2 = Math.sin(tA * 2.2); p.P.brasD.rotation.x = -1.2 + ct2 * 0.3; p.P.brasG.rotation.x = -1.2 - ct2 * 0.3; p.P.haut.rotation.y = ct2 * 0.15; }
      else if (p.artisan === 'fouler') animerMarche(p.P, tA * 4, 0.5);
      if (p.type === 'client') p.P.brasD.rotation.x = -0.5 - Math.max(0, Math.sin(tA * 0.7)) * 1.5;
      if (p.type === 'musicien') { p.P.brasD.rotation.x = -0.9 + Math.sin(V.temps * 12) * 0.15; p.P.brasG.rotation.x = -1.3; V.luthT = (V.luthT || 0) - dt; if (V.luthT <= 0) { V.luthT = 0.9; if (Math.hypot(j.pos.x - p.pos.x, j.pos.z - p.pos.z) < 12) M.son('luth'); } }
      if (p.plateau) p.P.brasG.rotation.x = -1.4;
      if (p.type === 'lavandiere') { var cl2 = Math.sin(tA * 5); p.P.brasD.rotation.x = -1.1 + cl2 * 0.3; p.P.brasG.rotation.x = -1.1 - cl2 * 0.3; }
      if (p.type === 'faucheur') { var ct = Math.sin(V.temps * 2.2 + p.ph); p.P.haut.rotation.y = ct * 0.6; p.P.brasD.rotation.x = -0.9 + ct * 0.3; p.P.brasG.rotation.x = -0.9 + ct * 0.3; p.P.haut.rotation.x = 0.35; }
      var crieur = CRIEURS.indexOf(p.type) >= 0;
      if (crieur) p.P.brasG.rotation.x = p.bulle ? -1.6 - Math.sin(V.temps * 8) * 0.5 : -0.1;
      var dj = Math.hypot(j.pos.x - p.pos.x, j.pos.z - p.pos.z);
      if (dj < 3.5 && !p.artisan && !p.assis && !p.fixe && (!p.marche || p.type !== 'enfant')) p.ang += difAngle(p.ang, Math.atan2(j.pos.x - p.pos.x, j.pos.z - p.pos.z)) * Math.min(1, dt * 5);
      p.P.g.rotation.y = p.ang;
      if (p.data.role || !p.marche) { if (dj < pd) { pd = dj; proche = p; } }
      else if (dj < 1.8 && dj < pd) { pd = dj; proche = p; }
      // Paroles
      if (p.type && p.type !== 'pnj') {
        p.cd = (p.cd || 0) - dt;
        if (p.cd <= 0 && dj < (crieur ? 14 : 4.5)) { parler(p, paroleDe(p)); p.cd = (crieur ? 7 : 10) + Math.random() * 8; }
      }
      if (p.bulle) {
        p.bulle.t -= dt;
        var hb = p.P.g.scale.y * 2.55 + 0.45 + (p.type === 'porteur' ? 0.6 : 0) + p.pos.y + (p.assis ? -0.45 : 0);
        var vb = M.projeter(new T.Vector3(p.pos.x, hb, p.pos.z), p.bulle.el);
        if (vb) p.bulle.el.style.opacity = p.bulle.t < 0.4 ? String(Math.max(0, p.bulle.t / 0.4)) : dj > 26 ? '0' : '1';
        if (p.bulle.t <= 0) { p.bulle.el.remove(); p.bulle = null; }
      }
      if (p.el) {
        var vis = M.projeter(new T.Vector3(p.pos.x, 2.75, p.pos.z), p.el);
        if (vis) p.el.style.opacity = dj > 22 ? '0' : '1';
      }
    });
    majBetes(dt);
    // Bruits de la ville : murmure du marché, cloche ou coq de temps en temps
    V.sonT -= dt;
    V.drapeaux.forEach(function (f) { f.p.rotation.x = Math.sin(V.temps * 1.7 + f.ph) * 0.08; f.p.rotation.z = Math.sin(V.temps * 1.1 + f.ph) * 0.04; });
    V.tourne.forEach(function (o) { o.o.rotation[o.axe] += o.v * dt; });
    V.flammes.forEach(function (f) { f.l.intensity = f.f * (0.85 + Math.sin(V.temps * 9 + f.ph) * 0.08 + Math.sin(V.temps * 23 + f.ph * 2) * 0.06); });
    if (V.interieur) { if (V.sonT <= 0) { V.sonT = 5 + Math.random() * 6; if (V.interieur === 'taverne') M.son('foule'); } }
    else if (V.sonT <= 0) { V.sonT = 6 + Math.random() * 8; M.son(V.village ? (Math.random() < 0.5 ? 'coq' : 'mouton') : (V.cfg.lieu.religion === 'catholique' || V.cfg.lieu.religion === 'orthodoxe') && Math.random() < 0.3 ? 'cloche' : 'foule'); }
    // Portes des bâtiments : E pour entrer
    var porte = null, pp2 = 2.6;
    V.portes.forEach(function (q) {
      var dq = Math.hypot(j.pos.x - q.x, j.pos.z - q.z);
      if (dq < pp2) { pp2 = dq; porte = q; }
      var vq = M.projeter(new T.Vector3(q.lx, q.h || 3.4, q.lz), q.el);
      if (vq) q.el.style.opacity = Math.hypot(j.pos.x - q.lx, j.pos.z - q.lz) > 13 ? '0' : '1';
    });
    if (porte && proche && pd < pp2) porte = null;
    if (porte) proche = null;
    V.proche = proche;
    var inv = el('invite');
    var nomP = proche ? (proche.data.role || !proche.marche ? proche.nom : proche.data.nomCourt || _t('Habitant')) : '';
    if (proche) { inv.classList.remove('hide'); inv.innerHTML = (M.mobile ? '' : '<kbd>E</kbd> ') + _t('Parler à <b>') + nomP + '</b>'; }
    else if (porte) { inv.classList.remove('hide'); inv.innerHTML = (M.mobile ? '' : '<kbd>E</kbd> ') + _t('Entrer : <b>') + (porte.icone ? porte.icone + ' ' : '') + porte.nom + '</b>'; }
    else if (V.salle) { if (j.pos.z > V.salle.d / 2 - 2.2 && Math.abs(j.pos.x) < 2) { inv.classList.remove('hide'); inv.innerHTML = _t('⬇️ Sortir du bâtiment'); } else inv.classList.add('hide'); }
    else if (j.pos.z > V.rayon - 4 && Math.abs(j.pos.x) < 4) { inv.classList.remove('hide'); inv.innerHTML = _t('⬇️ Sortir ') + (V.village ? _t('du village') : _t('de la ville')); }
    else inv.classList.add('hide');
    var agir = M.a('interagir') || M.a('attaque');
    if (agir && porte && V.cfg.entrer) { inv.classList.add('hide'); V.cfg.entrer(porte.type); return; }
    if (agir && proche) {
      inv.classList.add('hide');
      V.cfg.parler(proche.id, proche);
    }
    // Caméra
    var dist = 7.5, cx, cz;
    if (V.salle) return camSalle(dt);
    // La caméra ne rentre pas dans les maisons : on la rapproche si besoin
    for (var essai = 0; essai < 12; essai++) {
      cx = j.pos.x - Math.sin(V.yaw) * Math.cos(V.pitch) * dist; cz = j.pos.z - Math.cos(V.yaw) * Math.cos(V.pitch) * dist;
      var dedans = Math.hypot(cx, cz) < V.rayon + 2.5 || (Math.abs(cx) < 2.5 && cz > 0);
      if (dedans) dedans = !V.maisons.some(function (m) { return Math.hypot(cx - m.x, cz - m.z) < m.r + 0.6; });
      if (dedans) break;
      dist -= 0.5;
    }
    var cy = 1.6 + Math.sin(V.pitch) * dist, k = Math.min(1, dt * 10);
    M.cam.position.x += (cx - M.cam.position.x) * k; M.cam.position.y += (cy - M.cam.position.y) * k; M.cam.position.z += (cz - M.cam.position.z) * k;
    M.cam.lookAt(j.pos.x, 1.7, j.pos.z);
    // Un habitant collé à la caméra cacherait toute la vue : on le masque
    var cp = M.cam.position;
    V.pnjs.forEach(function (p) {
      var cache = Math.hypot(p.pos.x - cp.x, p.pos.z - cp.z) < 3;
      p.P.g.visible = !cache;
      if (p.el && cache) p.el.style.opacity = '0';
      if (p.bulle && cache) p.bulle.el.style.opacity = '0';
    });
    V.betes.forEach(function (B) { B.g.visible = Math.hypot(B.pos.x - cp.x, B.pos.z - cp.z) > 1.8; });
    M.suivreOmbre(j.pos.x, j.pos.z);
    M.majEffets(dt);
  }
  // Caméra dans une salle : plus proche, et jamais à travers les murs ni le plafond
  function camSalle(dt) {
    var j = V.j, Sl = V.salle, dist = 6.2;
    var cx = j.pos.x - Math.sin(V.yaw) * Math.cos(V.pitch) * dist, cz = j.pos.z - Math.cos(V.yaw) * Math.cos(V.pitch) * dist;
    var cy = 1.6 + Math.sin(V.pitch) * dist;
    cx = Math.max(-Sl.w / 2 + 0.35, Math.min(Sl.w / 2 - 0.35, cx)); cz = Math.max(-Sl.d / 2 + 0.35, Math.min(Sl.d / 2 + 5, cz)); cy = Math.min(Sl.h - 0.45, cy);
    var k = Math.min(1, dt * 10);
    M.cam.position.x += (cx - M.cam.position.x) * k; M.cam.position.y += (cy - M.cam.position.y) * k; M.cam.position.z += (cz - M.cam.position.z) * k;
    M.cam.lookAt(j.pos.x, 1.5, j.pos.z);
    var cp = M.cam.position, ouvert = cp.z > Sl.d / 2 - 0.25;
    V.murAvant.forEach(function (m) { m.visible = !ouvert; });
    V.pnjs.forEach(function (p) {
      var cache = Math.hypot(p.pos.x - cp.x, p.pos.z - cp.z) < 0.9;
      p.P.g.visible = !cache;
      if (p.el) { if (cache) p.el.style.opacity = '0'; }
      if (p.bulle && cache) p.bulle.el.style.opacity = '0';
    });
    M.suivreOmbre(0, 0);
    M.majEffets(dt);
  }
  function quitter() {
    if (!V) return;
    var cb = V.cfg.sortir;
    M.arreter(); // appelle nettoyer()
    cb && cb();
  }
  function nettoyer() {
    if (!V) return;
    V.pnjs.forEach(function (p) { if (p.el) p.el.remove(); if (p.bulle) p.bulle.el.remove(); });
    V.portes.forEach(function (q) { q.el.remove(); });
    el('invite').classList.add('hide');
    document.body.classList.remove('modeVille');
    V = null;
  }

  /* cfg : { lieu (objet FF.LIEUX), village, joueur: { look, arme }, pnjs: [{ id, nom, role, icone, look }], habitants: n,
             cris: [phrases des marchands], couleur (bannière du royaume), parler(id, pnj), sortir(), pause(),
             batiments: [{ type, nom, icone, desc }] (où l'on peut entrer), entrer(type), depart (devant quelle porte on arrive),
             interieur: type (on est DANS un bâtiment) } */
  M.ville = function (cfg) {
    nettoyer();
    var L = cfg.lieu;
    var orient = L.religion === 'sunnite' || L.religion === 'chiite' || /^(syrie|anatolie|egypte|orient)$/.test(L.region) || L.faction === 'legende';
    var style = orient ? 'orient' : L.faction === 'romains' ? 'byzance' : 'occident';
    var village = !!cfg.village;
    var nuit = !!cfg.nuit;
    var dedans = cfg.interieur;
    if (dedans) M.nouvelleScene({ ciel: 0x2b1d12, horizon: 0x3a2a1c, hemi: 0.8, lumCiel: 0xffe2b8, lumSol: 0x6d4c33, soleil: 0xffe0b0, forceSoleil: 0.5, soleilDir: [5, 30, 9], brouillard0: 40, brouillard1: 140 });
    else M.nouvelleScene(nuit ? M.DECORS.nuit : village ? (style === 'orient' ? M.DECORS.desert : M.DECORS.plaine) : style === 'occident' ? M.DECORS.ville : M.DECORS.desert);
    var scene = M.scene;
    var r = M.rng(L.nom.length * 97 + L.x | 0);
    V = { cfg: cfg, pnjs: [], betes: [], obstacles: [], maisons: [], temps: 0, yaw: Math.PI, pitch: 0.3, rayon: dedans ? 99 : village ? 21 : 19, village: village, sonT: 2, style: style,
      drapeaux: [], tourne: [], flammes: [], portes: [], interieur: dedans };
    var i, a, d;
    if (dedans) {
      construireInterieur(dedans, style, L.faction, r);
      cfg.pnjs.forEach(function (p, k) {
        var pl = V.places[k] || { x: -2 + k * 1.3, z: 0, ang: 0 };
        var o = ajouterPnj(p, pl.x, pl.z, false);
        o.ang = pl.ang;
        if (pl.assis) { o.assis = true; o.P.jambeG.rotation.x = o.P.jambeD.rotation.x = -1.45; o.P.corps.position.y = -0.45; }
        if (pl.enclume) { o.artisan = 'forge'; o.enclume = pl.enclume; }
      });
    } else {
      if (village) { construireVillage(scene, style, r); var mv = monument(L.religion, 0, -27, style); mv.scale.setScalar(0.6); scene.add(mv); }
      else construireVille(scene, style, r, L, nuit);
      // PNJ importants, en arc de cercle au nord de la place
      var n = cfg.pnjs.length;
      cfg.pnjs.forEach(function (p, k) {
        var ang2 = -Math.PI / 2 + (k - (n - 1) / 2) * (Math.PI * (village ? 0.9 : 0.55) / Math.max(1, n - 1 || 1));
        if (n === 1) ang2 = -Math.PI / 2;
        var d3 = village ? 6.5 : V.rayon - 6;
        var x = Math.cos(ang2) * d3, z = Math.sin(ang2) * d3;
        if (p.etal) { scene.add(etal(Math.cos(ang2) * (d3 + 1.8), Math.sin(ang2) * (d3 + 1.8), -ang2 + Math.PI / 2, p.etal)); V.obstacles.push({ x: Math.cos(ang2) * (d3 + 1.8), z: Math.sin(ang2) * (d3 + 1.8), r: 1.4 }); }
        var o = ajouterPnj(p, x, z, false);
        if (p.id === 'forgeron') {
          var ex = Math.cos(ang2 + 0.09) * (d3 + 0.2), ez = Math.sin(ang2 + 0.09) * (d3 + 0.2);
          scene.add(enclume(ex, ez)); o.artisan = 'forge'; o.enclume = { x: ex, z: ez };
        }
      });
      // Points de promenade
      V.points = [];
      for (i = 0; i < 14; i++) { a = r() * Math.PI * 2; d = 4 + r() * (village ? 8 : 10); V.points.push({ x: Math.cos(a) * d, z: Math.sin(a) * d }); }
      peupler(style, r, village);
    }
    // Le joueur
    var P = M.creerPerso(cfg.joueur.look, 1);
    M.equiper(P, cfg.joueur.arme || 'epee');
    P.brasD.rotation.x = -0.1;
    scene.add(P.g);
    V.j = { P: P, pos: P.g.position, ang: Math.PI, ph: 0 };
    if (dedans) { V.j.pos.set(0, 0, V.salle.d / 2 - 1.4); V.pitch = 0.35; }
    else {
      V.j.pos.set(0, 0, V.rayon - 8);
      var dp = cfg.depart && V.portes.filter(function (q) { return q.type === cfg.depart; })[0];
      if (dp) { V.j.pos.set(dp.x * 0.9, 0, dp.z * 0.9); V.j.ang = Math.atan2(-dp.x, -dp.z); V.yaw = V.j.ang; }
    }
    document.body.classList.add('modeVille');
    M.cam.position.set(V.j.pos.x - Math.sin(V.yaw) * 4, 4, V.j.pos.z - Math.cos(V.yaw) * 4);
    M.lancer({ type: 'ville', maj: maj, quitter: nettoyer, verrou: !M.mobile });
  };

  function construireVille(scene, style, r, L, nuit) {
    var i, a;
    var sol = new T.Mesh(new T.CircleGeometry(60, 40), M.mat(style === 'occident' ? 0x9e9a8f : 0xd8c8a0));
    sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; scene.add(sol);
    var place = new T.Mesh(new T.CircleGeometry(V.rayon + 1, 32), M.mat(style === 'occident' ? 0xb3ab9a : 0xe8d8b0));
    place.rotation.x = -Math.PI / 2; place.position.y = 0.02; place.receiveShadow = true; scene.add(place);
    // Bâtiments où l'on peut entrer : chacun prend une place autour de la grand-place
    var bats = V.cfg.batiments || [], pris = [];
    bats.forEach(function (B, k) {
      var ang = SLOTS_VILLE[k]; if (ang == null) return;
      pris.push(ang);
      var R = V.rayon + 3.6;
      scene.add(batiment(B.type, ang, R, style, L.faction));
      V.maisons.push({ x: Math.cos(ang) * R, z: Math.sin(ang) * R, r: 3.3 });
      var e = document.createElement('div');
      e.className = 'etiquette porte';
      e.innerHTML = '<span>' + (B.icone || '🚪') + '</span><b>' + B.nom + '</b>' + (B.desc ? '<i>' + B.desc + '</i>' : '');
      document.getElementById('calqueTextes').appendChild(e);
      V.portes.push({ type: B.type, nom: B.nom, icone: B.icone, x: Math.cos(ang) * (V.rayon - 0.4), z: Math.sin(ang) * (V.rayon - 0.4), lx: Math.cos(ang) * (V.rayon + 0.5), lz: Math.sin(ang) * (V.rayon + 0.5), el: e });
    });
    // Un chantier sur une place libre : maçon, couvreur, charpentier
    var libre = SLOTS_VILLE.filter(function (s) { return pris.indexOf(s) < 0; });
    var aCh = libre.length ? libre[libre.length - 1] : null;
    if (aCh != null) {
      var RC = V.rayon + 3.6, gc = chantier(aCh, RC, style); scene.add(gc); pris.push(aCh);
      V.maisons.push({ x: Math.cos(aCh) * RC, z: Math.sin(aCh) * RC, r: 3.3 });
      V.chantier = gc;
    }
    // Maisons autour de la place, avec une porte au sud
    for (i = 0; i < 26; i++) {
      a = i / 26 * Math.PI * 2;
      if (Math.abs(difAngle(a, Math.PI / 2)) < 0.25) continue; // rue de la porte (sud = +Z)
      if (Math.abs(difAngle(a, -Math.PI / 2)) < 0.42) continue; // place du monument
      var d = V.rayon + 4 + r() * 2;
      if (!pris.some(function (s) { return Math.abs(difAngle(a, s)) < 0.2; })) scene.add(M.PROPS.maison(Math.cos(a) * d, Math.sin(a) * d, -a - Math.PI / 2, style, r));
      var d2 = V.rayon + 13 + r() * 6;
      scene.add(M.PROPS.maison(Math.cos(a + 0.12) * d2, Math.sin(a + 0.12) * d2, -a - Math.PI / 2, style, r));
    }
    scene.add(monument(L.religion, 0, -(V.rayon + 7), style));
    // Porte, avec les bannières du royaume
    var porte = new T.Group(); porte.position.set(0, 0, V.rayon + 3);
    M.boite(2, 6, 2, 0xb3a68b, porte, -3.2, 3, 0); M.boite(2, 6, 2, 0xb3a68b, porte, 3.2, 3, 0); M.boite(8.4, 1.6, 2, 0xb3a68b, porte, 0, 6.6, 0);
    scene.add(porte);
    var tex = new T.CanvasTexture(M.banniere(L.faction)); tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter;
    [-3.2, 3.2].forEach(function (x) { var b = new T.Mesh(new T.PlaneGeometry(1.5, 2.6), new T.MeshLambertMaterial({ map: tex, side: T.DoubleSide })); b.position.set(x, 4.2, V.rayon + 1.98); b.rotation.y = Math.PI; scene.add(b); });
    banniere3d(-5.2, V.rayon + 1.5, Math.PI, L.faction, scene); banniere3d(5.2, V.rayon + 1.5, Math.PI, L.faction, scene);
    scene.add(fontaine(0, 0)); V.obstacles.push({ x: 0, z: 0, r: 2.6 });
    if (style !== 'occident') for (i = 0; i < 4; i++) { a = i / 4 * Math.PI * 2 + 0.78; scene.add(M.PROPS.palmier(Math.cos(a) * 9, Math.sin(a) * 9, 0.7, r)); V.obstacles.push({ x: Math.cos(a) * 9, z: Math.sin(a) * 9, r: 0.4 }); }
    else for (i = 0; i < 3; i++) { a = i / 3 * Math.PI * 2 + 0.5; scene.add(M.PROPS.arbre(Math.cos(a) * 10, Math.sin(a) * 10, 0.6, r)); V.obstacles.push({ x: Math.cos(a) * 10, z: Math.sin(a) * 10, r: 0.5 }); }
    if (nuit) for (i = 0; i < 4; i++) { a = i / 4 * Math.PI * 2; M.PROPS.torche(Math.cos(a) * 16, Math.sin(a) * 16, scene); }
    // Marché de bouche : boulanger (avec son four), boucher, poissonnier
    var BOUCHE = [
      { a: 0.25, nom: _t('Boulanger'), type: 'boulanger', toile: 0xd68910, biens: [0xd4a056, 0xc68f3e, 0xe0b46a, 0xb7823a], look: { tunique: 0xf4f1e8, pantalon: 0x8d6e63, casque: 'capuche' } },
      { a: 0.75, nom: _t('Boucher'), type: 'boucher', toile: 0xa93226, biens: [0xa93226, 0xc0392b, 0xe6b0aa, 0x922b21], look: { tunique: 0xe8dcc0, pantalon: 0x5d4037, cheveux: 0x3e2723, barbe: 0x3e2723 } },
      { a: 2.55, nom: _t('Poissonnier'), type: 'poissonnier', toile: 0x2874a6, biens: [0x85929e, 0xaab7b8, 0x5d6d7e, 0x99a3a4], look: { tunique: 0x5d6d7e, pantalon: 0x34495e, casque: 'chapel' } }
    ];
    BOUCHE.forEach(function (e) {
      var R2 = 13.5, ex = Math.cos(e.a) * R2, ez = Math.sin(e.a) * R2;
      scene.add(etal(ex, ez, -e.a - Math.PI / 2, e.toile, e.biens)); V.obstacles.push({ x: ex, z: ez, r: 1.4 });
      if (e.type === 'boulanger') { var fx = Math.cos(e.a - 0.22) * 14.5, fz = Math.sin(e.a - 0.22) * 14.5; scene.add(four(fx, fz, -e.a - Math.PI / 2)); V.obstacles.push({ x: fx, z: fz, r: 1.3 }); }
      var mx = Math.cos(e.a) * (R2 - 1.7), mz = Math.sin(e.a) * (R2 - 1.7);
      var lk = Object.assign({ peau: FF.PEAU[Math.floor(r() * FF.PEAU.length)] }, e.look);
      if (style === 'orient' && lk.casque === 'capuche') lk.casque = 'turban';
      var o = ajouterPnj({ id: 'habitant', nom: e.nom, nomCourt: e.nom, look: lk, habitant: true }, mx, mz, false, e.type);
      o.ang = Math.atan2(-mx, -mz);
    });
    scene.add(charrette(-7, 11.5, 0.6, 'caisses')); V.obstacles.push({ x: -7, z: 11.5, r: 1.5 });
    scene.add(charrette(11, -5, 2.2, 'foin')); V.obstacles.push({ x: 11, z: -5, r: 1.5 });
    [[-6, 14], [-5.2, 14.8], [6.8, 13.5], [-14, -4.5]].forEach(function (t) { scene.add(tonneau(t[0], t[1])); V.obstacles.push({ x: t[0], z: t[1], r: 0.5 }); });
    [[6.2, 14.4], [-13.6, -3.4], [15.5, -2.2]].forEach(function (c) { scene.add(M.PROPS.caisse(c[0], c[1], 0.8)); V.obstacles.push({ x: c[0], z: c[1], r: 0.6 }); });
  }

  function construireVillage(scene, style, r) {
    var i, a, d;
    var orient = style === 'orient';
    var sol = new T.Mesh(new T.CircleGeometry(80, 40), M.mat(orient ? 0xd9c08a : 0x7da453));
    sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; scene.add(sol);
    var place = new T.Mesh(new T.CircleGeometry(10, 24), M.mat(orient ? 0xe2cc98 : 0x9c8462));
    place.rotation.x = -Math.PI / 2; place.position.y = 0.02; place.receiveShadow = true; scene.add(place);
    var chemin = M.boite(3, 0.04, 30, orient ? 0xe2cc98 : 0x9c8462, scene, 0, 0.03, 20, { ombre: false }); chemin.receiveShadow = true;
    scene.add(puits(0, 0)); V.obstacles.push({ x: 0, z: 0, r: 1.3 });
    // Maisons (chaumières ou maisons de terre) en cercle, sauf au sud (chemin) et au nord (l'ancien)
    var nb = 10, bats = V.cfg.batiments || [], SLV = [0.2, 2.713];
    bats.forEach(function (B, k) {
      var ang = SLV[k]; if (ang == null) return;
      var R = 16.6, bx = Math.cos(ang) * R, bz = Math.sin(ang) * R;
      var gb = batiment(B.type, ang, R, style, V.cfg.lieu.faction); gb.scale.set(0.85, 0.8, 0.85); scene.add(gb);
      V.obstacles.push({ x: bx, z: bz, r: 3.2 }); V.maisons.push({ x: bx, z: bz, r: 3.2 });
      var e = document.createElement('div');
      e.className = 'etiquette porte';
      e.innerHTML = '<span>' + (B.icone || '🚪') + '</span><b>' + B.nom + '</b>' + (B.desc ? '<i>' + B.desc + '</i>' : '');
      document.getElementById('calqueTextes').appendChild(e);
      V.portes.push({ type: B.type, nom: B.nom, icone: B.icone, x: Math.cos(ang) * (R - 3.8), z: Math.sin(ang) * (R - 3.8), lx: Math.cos(ang) * (R - 2.9), lz: Math.sin(ang) * (R - 2.9), el: e, h: 2.9 });
    });
    for (i = 0; i < nb; i++) {
      a = i / nb * Math.PI * 2 + 0.2;
      if (Math.abs(difAngle(a, Math.PI / 2)) < 0.75) continue;
      if (bats.length && SLV.slice(0, bats.length).some(function (sv) { return Math.abs(difAngle(a, sv)) < 0.1; })) continue;
      d = 14.5 + r() * 3.5;
      var x = Math.cos(a) * d, z = Math.sin(a) * d;
      var m = orient ? M.PROPS.maison(x, z, -a - Math.PI / 2, 'orient', r) : chaumiere(x, z, -a - Math.PI / 2, r);
      if (orient) m.scale.setScalar(0.85);
      scene.add(m);
      var rr = (m.userData.r || 2.5) * (orient ? 0.85 : 1);
      V.obstacles.push({ x: x, z: z, r: rr }); V.maisons.push({ x: x, z: z, r: rr });
    }
    // Champs et vergers autour du village
    var cultures = orient ? [0xb7950b, 0x6b8e23, 0x9a7d0a] : [0xd4ac0d, 0x6b8e23, 0xc9a43f, 0x58792a];
    for (i = 0; i < 9; i++) {
      a = i / 9 * Math.PI * 2 + 0.35;
      if (Math.abs(difAngle(a, Math.PI / 2)) < 0.3) continue;
      d = 30 + r() * 8;
      scene.add(champ(Math.cos(a) * d, Math.sin(a) * d, 9 + r() * 4, 7 + r() * 3, -a, cultures[i % cultures.length]));
    }
    for (i = 0; i < 16; i++) {
      a = r() * Math.PI * 2; d = 45 + r() * 20;
      scene.add(orient ? M.PROPS.palmier(Math.cos(a) * d, Math.sin(a) * d, 0.9, r) : M.PROPS.arbre(Math.cos(a) * d, Math.sin(a) * d, 0.9, r));
    }
    // Meules, charrette, palmiers ou arbres sur la place
    if (!orient) { [[-11, 11], [11, 10.5]].forEach(function (p) { scene.add(meule(p[0], p[1])); V.obstacles.push({ x: p[0], z: p[1], r: 1.3 }); }); }
    else for (i = 0; i < 3; i++) { a = i / 3 * Math.PI * 2 + 1; scene.add(M.PROPS.palmier(Math.cos(a) * 8, Math.sin(a) * 8, 0.75, r)); V.obstacles.push({ x: Math.cos(a) * 8, z: Math.sin(a) * 8, r: 0.4 }); }
    // Les métiers du village : tisserand, foulon, drapier, et le moulin du meunier
    scene.add(metierTisser(9.5, 3.5, -Math.PI / 2 - 0.35)); V.obstacles.push({ x: 9.5, z: 3.5, r: 1.2 });
    scene.add(cuve(-7.5, 6.5)); V.obstacles.push({ x: -7.5, z: 6.5, r: 1.2 });
    scene.add(etal(3.4, 10.2, -Math.atan2(10.2, 3.4) - Math.PI / 2, 0x8e44ad, [0xc0392b, 0x2874a6, 0x1e8449, 0xd4ac0d])); V.obstacles.push({ x: 3.4, z: 10.2, r: 1.4 });
    scene.add(moulin(-23.4, -8.5, Math.atan2(23.4, 8.5)));
    scene.add(charrette(7.5, 12, 2.6, 'foin')); V.obstacles.push({ x: 7.5, z: 12, r: 1.5 });
    // Enclos avec les moutons (ou les chèvres)
    scene.add(cloture(-10, -3, 6, 5));
    for (i = 0; i < 4; i++) ajouterBete(orient ? 'chevre' : 'mouton', -10 + (r() - 0.5) * 3, -3 + (r() - 0.5) * 2.5, { x: -10, z: -3 });
    [[-13, -3, 0.15], [-7, -3, 0.15], [-10, -5.5, 0.15], [-10, -0.5, 0.15]].forEach(function (o) { V.obstacles.push({ x: o[0], z: o[1], r: 1.6 }); });
    // Entrée du village
    var arche = new T.Group(); arche.position.set(0, 0, V.rayon + 1.5);
    M.boite(0.35, 4, 0.35, 0x6d4c41, arche, -2.6, 2, 0); M.boite(0.35, 4, 0.35, 0x6d4c41, arche, 2.6, 2, 0); M.boite(6, 0.4, 0.4, 0x6d4c41, arche, 0, 3.9, 0);
    M.boite(2.2, 0.7, 0.1, 0xa1887f, arche, 0, 3.2, 0.25);
    scene.add(arche);
  }

  // Habitants, gardes, enfants, porteurs, paysans au travail et animaux
  function peupler(style, r, village) {
    var i, lk;
    var L = V.cfg.lieu;
    function look(liste) {
      var l = Object.assign({ peau: FF.PEAU[Math.floor(r() * FF.PEAU.length)] }, liste[Math.floor(r() * liste.length)]);
      if (style === 'occident' && l.casque === 'turban') l.casque = 'capuche';
      if (style === 'orient' && r() < 0.5) l.casque = 'turban';
      return l;
    }
    var nh = V.cfg.habitants == null ? (village ? 6 : 9) : V.cfg.habitants;
    for (i = 0; i < nh; i++) {
      var pt = V.points[i % V.points.length];
      ajouterPnj({ id: 'habitant', nom: village ? _t('Villageois') : _t('Habitant'), nomCourt: village ? _t('Villageois') : _t('Habitant'), look: look(village ? LOOKS_PAYSANS : LOOKS), habitant: true }, pt.x, pt.z, true, village ? 'paysan' : 'habitant');
    }
    // Enfants qui courent
    for (i = 0; i < (village ? 2 : 3); i++) {
      var pe = V.points[(i * 5 + 3) % V.points.length];
      var oe = ajouterPnj({ id: 'habitant', nom: _t('Enfant'), nomCourt: _t('Enfant'), look: look(village ? LOOKS_PAYSANS : LOOKS), habitant: true }, pe.x, pe.z, true, 'enfant');
      oe.P.g.scale.setScalar(0.62); oe.vit = 3.4;
    }
    if (!village) {
      // Gardes : deux à la porte, deux en patrouille autour de la place
      var lg = lookGarde(style);
      [-2.2, 2.2].forEach(function (x) { var g = ajouterPnj({ id: 'habitant', nom: _t('Garde'), nomCourt: _t('Garde'), look: Object.assign({ peau: FF.PEAU[Math.floor(r() * 3)] }, lg), arme: 'lance', habitant: true }, x, V.rayon - 1.2, false, 'garde'); g.ang = Math.PI; });
      for (i = 0; i < 2; i++) {
        var route = [];
        for (var k = 0; k < 10; k++) { var a2 = (k / 10) * Math.PI * 2 * (i ? -1 : 1) + i * Math.PI; route.push({ x: Math.cos(a2) * 13.5, z: Math.sin(a2) * 13.5 }); }
        var gp = ajouterPnj({ id: 'habitant', nom: _t('Garde du prévôt'), nomCourt: _t('Garde du prévôt'), look: Object.assign({ peau: FF.PEAU[Math.floor(r() * 3)] }, lg), arme: 'lance', habitant: true }, route[0].x, route[0].z, true, 'garde');
        gp.route = route; gp.iRoute = 1; gp.vit = 1.3;
      }
      // Porteurs avec une caisse sur la tête
      for (i = 0; i < 2; i++) {
        var pp = V.points[(i * 3 + 1) % V.points.length];
        var po = ajouterPnj({ id: 'habitant', nom: _t('Portefaix'), nomCourt: _t('Portefaix'), look: look(LOOKS), habitant: true }, pp.x, pp.z, true, 'porteur');
        M.boite(0.7, 0.55, 0.7, 0x8d6e63, po.P.haut, 0, 2.2, 0); po.vit = 1.2;
      }
      // Lavandières agenouillées au bord de la fontaine
      [2.2, 3.4].forEach(function (an, k) {
        var lx = Math.cos(an) * 3, lz = Math.sin(an) * 3;
        var lv = ajouterPnj({ id: 'habitant', nom: _t('Lavandière'), nomCourt: _t('Lavandière'), look: Object.assign({ peau: FF.PEAU[Math.floor(r() * FF.PEAU.length)] }, { tunique: [0x7d6608, 0x5b2c6f][k], pantalon: 0x4e342e, casque: style === 'orient' ? 'turban' : 'capuche' }), habitant: true }, lx, lz, false, 'lavandiere');
        lv.ang = Math.atan2(-lx, -lz); lv.ph = k * 2; lv.P.jambeG.rotation.x = lv.P.jambeD.rotation.x = 1.4; lv.P.corps.position.y = -0.62; lv.P.haut.rotation.x = 0.45; lv.fixe = true;
        V.obstacles.push({ x: lx, z: lz, r: 0.4 });
      });
      M.boite(0.9, 0.08, 0.6, 0xf4f1e8, M.scene, Math.cos(2.8) * 3.4, 0.05, Math.sin(2.8) * 3.4, { ombre: false });
      // Les ouvriers du chantier
      if (V.chantier) {
        var gc = V.chantier, w0 = versMonde(gc, -1.6, 4.1), w1 = versMonde(gc, 1.2, 3.15), w2 = versMonde(gc, 2.6, 5.2), face = gc.rotation.y + Math.PI;
        var mc = ajouterPnj({ id: 'habitant', nom: _t('Maçon'), nomCourt: _t('Maçon'), look: look(LOOKS_PAYSANS), arme: 'masse', habitant: true }, w0.x, w0.z, false, 'macon'); mc.ang = face; mc.artisan = 'marteau';
        var cv = ajouterPnj({ id: 'habitant', nom: _t('Couvreur'), nomCourt: _t('Couvreur'), look: look(LOOKS_PAYSANS), habitant: true }, w1.x, w1.z, false, 'couvreur'); cv.ang = face; cv.artisan = 'marteau'; cv.pos.y = 2.28; cv.P.haut.rotation.x = 0.3;
        var cp = ajouterPnj({ id: 'habitant', nom: _t('Charpentier'), nomCourt: _t('Charpentier'), look: look(LOOKS_PAYSANS), arme: 'hache', habitant: true }, w2.x, w2.z, false, 'charpentier'); cp.ang = face + Math.PI / 2; cp.artisan = 'scie';
      }
      // Le collecteur d'impôts fait sa tournée, escorté d'un garde du prévôt
      var routeC = [];
      for (i = 0; i < 8; i++) { var ac = i / 8 * Math.PI * 2 + 0.3; routeC.push({ x: Math.cos(ac) * 10.5, z: Math.sin(ac) * 10.5 }); }
      var col = ajouterPnj({ id: 'habitant', nom: _t('Collecteur d\'impôts'), nomCourt: _t('Collecteur d\'impôts'), look: { peau: FF.PEAU[0], tunique: 0x1b2631, pantalon: 0x4a235a, cheveux: 0x7b7d7d, cape: 0x7d6608 }, habitant: true }, routeC[0].x, routeC[0].z, true, 'collecteur');
      col.route = routeC; col.iRoute = 1; col.vit = 1.1;
      M.boite(0.3, 0.35, 0.2, 0x7d6608, col.P.haut, 0.5, 0.2, 0.1);
      // Animaux : poules, chiens, et un cheval (ou un chameau) attaché près de la porte
      for (i = 0; i < 4; i++) ajouterBete('poule', -9 + r() * 4, 6 + r() * 4, { x: -8, z: 8 });
      ajouterBete('chien', 6, 6); ajouterBete('chien', -6, -8);
      ajouterBete(style === 'orient' ? 'chameau' : 'cheval', 8.5, V.rayon - 2.5);
      if (style === 'orient') ajouterBete('chameau', -8.5, V.rayon - 2.8); else ajouterBete('cheval', -8.5, V.rayon - 2.5);
    } else {
      // Paysans qui moissonnent au bord du village
      [[-6, -15], [7, -14.5], [-15, 4]].forEach(function (f) {
        var o = ajouterPnj({ id: 'habitant', nom: _t('Paysan'), nomCourt: _t('Paysan'), look: look(LOOKS_PAYSANS), arme: 'hache', habitant: true }, f[0], f[1], false, 'faucheur');
        o.ang = Math.atan2(f[0], f[1]); o.ph = r() * 6;
      });
      // Tisserand à son métier, foulon qui piétine le drap, drapier qui vend ses étoffes, meunier près du moulin
      var ts = ajouterPnj({ id: 'habitant', nom: _t('Tisserand'), nomCourt: _t('Tisserand'), look: look(LOOKS_PAYSANS), habitant: true }, 9.5 + Math.sin(-Math.PI / 2 - 0.35) * 1.2, 3.5 + Math.cos(-Math.PI / 2 - 0.35) * 1.2, false, 'tisserand');
      ts.ang = -Math.PI / 2 - 0.35 + Math.PI; ts.artisan = 'tisse'; ts.assis = true; ts.P.jambeG.rotation.x = ts.P.jambeD.rotation.x = -1.45; ts.P.corps.position.y = -0.45;
      var fl = ajouterPnj({ id: 'habitant', nom: _t('Foulon'), nomCourt: _t('Foulon'), look: { peau: FF.PEAU[Math.floor(r() * 4)], tunique: 0xbcaaa4, pantalon: 0x6d4c41 }, habitant: true }, -7.5, 6.5, false, 'foulon');
      fl.pos.y = 0.3; fl.artisan = 'fouler'; V.obstacles.pop();
      var dx0 = 3.4 - Math.cos(Math.atan2(10.2, 3.4)) * 1.6, dz0 = 10.2 - Math.sin(Math.atan2(10.2, 3.4)) * 1.6;
      var dr = ajouterPnj({ id: 'habitant', nom: _t('Drapier'), nomCourt: _t('Drapier'), look: { peau: FF.PEAU[Math.floor(r() * 4)], tunique: 0x8e44ad, pantalon: 0x34495e, cheveux: 0x3e2723 }, habitant: true }, dx0, dz0, false, 'drapier');
      dr.ang = Math.atan2(-dx0, -dz0);
      var mn = ajouterPnj({ id: 'habitant', nom: _t('Meunier'), nomCourt: _t('Meunier'), look: { peau: FF.PEAU[0], tunique: 0xf4f1e8, pantalon: 0xd7c9a6, casque: 'capuche' }, habitant: true }, -14, -4, true, 'meunier');
      mn.route = [{ x: -18.5, z: -6.5 }, { x: -14, z: 2 }, { x: -4, z: 4 }, { x: -14, z: 2 }]; mn.iRoute = 0; mn.vit = 1; M.boite(0.6, 0.7, 0.5, 0xd7c9a6, mn.P.haut, 0, 1.0, -0.4);
      for (i = 0; i < 6; i++) ajouterBete('poule', -3 + r() * 6, 3 + r() * 4, { x: 0, z: 5 });
      ajouterBete('chien', 3, 4);
      if (style === 'orient') ajouterBete('chameau', 9, -9);
      else { ajouterBete('vache', 10, -8, { x: 10, z: -8 }); ajouterBete('vache', 12, -5, { x: 10, z: -8 }); ajouterBete('cheval', -4.5, 9); }
    }
  }

  function ajouterPnj(p, x, z, marche, type) {
    var P = M.creerPerso(p.look || LOOKS[0], 1);
    if (p.arme) M.equiper(P, p.arme);
    V.scene = M.scene;
    M.scene.add(P.g);
    P.g.position.set(x, 0, z);
    var o = { id: p.id, nom: p.nom, P: P, pos: P.g.position, ang: Math.atan2(-x, -z), marche: marche, but: { x: x, z: z }, attente: Math.random() * 3, ph: 0, data: p, type: type || 'pnj', vit: 1.6, cd: 2 + Math.random() * 6 };
    if (!p.habitant) {
      var e = document.createElement('div');
      e.className = 'etiquette';
      e.innerHTML = (p.icone ? '<span>' + p.icone + '</span>' : '') + '<b>' + p.nom + '</b>' + (p.role ? '<i>' + p.role + '</i>' : '');
      document.getElementById('calqueTextes').appendChild(e);
      o.el = e;
    }
    V.obstacles.push(o.marche ? { x: -999, z: -999, r: 0 } : { x: x, z: z, r: 0.5 });
    V.pnjs.push(o);
    return o;
  }
  M.quitterVille = quitter;
  M.enVille = function () { return !!V; };
  M._ville = function () { return V; };
})();
