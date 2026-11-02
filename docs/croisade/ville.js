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
  function etal(x, z, ang, couleur) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ang;
    M.boite(2.6, 0.9, 1.2, 0x8d6e63, g, 0, 0.45, 0);
    M.boite(0.12, 2.4, 0.12, 0x5d4037, g, -1.2, 1.2, -0.5); M.boite(0.12, 2.4, 0.12, 0x5d4037, g, 1.2, 1.2, -0.5);
    M.boite(0.12, 2.4, 0.12, 0x5d4037, g, -1.2, 1.2, 0.5); M.boite(0.12, 2.4, 0.12, 0x5d4037, g, 1.2, 1.2, 0.5);
    var toile = M.boite(3, 0.12, 1.8, couleur, g, 0, 2.45, 0); toile.rotation.x = 0.12;
    for (var i = 0; i < 4; i++) M.boite(0.35, 0.35, 0.35, [0xe74c3c, 0xf1c40f, 0x27ae60, 0x8e44ad][i], g, -0.9 + i * 0.6, 1.05, 0, { ombre: false });
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
    garde: ['Circulez.', 'Pas de bagarre en ville !', 'Tout est calme aujourd\'hui.', 'Les portes ferment au coucher du soleil.', 'Range ton épée, étranger.'],
    enfant: ['Un chevalier ! Un vrai !', 'Tu me montres ton épée ?', 'Attrape-moi si tu peux !', 'Hé ! Par ici !', 'Moi aussi, plus tard, je serai soldat !'],
    porteur: ['Attention, ça passe !', 'Pardon, pardon !', 'Lourd, ce chargement…'],
    paysan: ['La récolte sera bonne cette année.', 'Les brigands ont encore volé deux moutons.', 'Bonjour, seigneur.', 'Mes fils pourraient te suivre, si la paye est bonne.', 'Il faudra bientôt rentrer le foin.'],
    habitant: ['Bonjour, voyageur.', 'Le pain a encore augmenté…', 'Tu viens de loin ?', 'On dit que les armées des Francs passent par ici.', 'Le marché est animé aujourd\'hui.', 'Ne bois pas l\'eau du port, crois-moi.']
  };
  var SALUT = { catholique: 'Que Dieu te garde.', orthodoxe: 'Que le Christ te garde.', sunnite: 'Salam aleykoum, voyageur.', chiite: 'Salam aleykoum, voyageur.', armenienne: 'Barev, voyageur !', juive: 'Shalom, voyageur.', mystere: '…',
    copte: 'Que le Seigneur te bénisse.', syriaque: 'Shlomo, voyageur.', maronite: 'Que saint Maron te protège.', nestorienne: 'Shlama, voyageur.', druze: 'Salam, étranger.',
    samaritaine: 'Shalom, voyageur.', paienne: 'Que les anciens dieux te regardent.' };

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
    if (t === 'marchand') { var l = V.cfg.cris || []; return l.length ? l[Math.floor(Math.random() * l.length)] : 'Approchez, approchez !'; }
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
    if (r > V.rayon) {
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
      if (p.type === 'faucheur') { var ct = Math.sin(V.temps * 2.2 + p.ph); p.P.haut.rotation.y = ct * 0.6; p.P.brasD.rotation.x = -0.9 + ct * 0.3; p.P.brasG.rotation.x = -0.9 + ct * 0.3; p.P.haut.rotation.x = 0.35; }
      if (p.type === 'marchand') p.P.brasG.rotation.x = p.bulle ? -1.6 - Math.sin(V.temps * 8) * 0.5 : -0.1;
      var dj = Math.hypot(j.pos.x - p.pos.x, j.pos.z - p.pos.z);
      if (dj < 3.5 && (!p.marche || p.type !== 'enfant')) p.ang += difAngle(p.ang, Math.atan2(j.pos.x - p.pos.x, j.pos.z - p.pos.z)) * Math.min(1, dt * 5);
      p.P.g.rotation.y = p.ang;
      if (p.data.role || !p.marche) { if (dj < pd) { pd = dj; proche = p; } }
      else if (dj < 1.8 && dj < pd) { pd = dj; proche = p; }
      // Paroles
      if (p.type && p.type !== 'pnj') {
        p.cd = (p.cd || 0) - dt;
        if (p.cd <= 0 && dj < (p.type === 'marchand' ? 14 : 4.5)) { parler(p, paroleDe(p)); p.cd = (p.type === 'marchand' ? 7 : 10) + Math.random() * 8; }
      }
      if (p.bulle) {
        p.bulle.t -= dt;
        var hb = p.P.g.scale.y * 2.55 + 0.45 + (p.type === 'porteur' ? 0.6 : 0);
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
    if (V.sonT <= 0) { V.sonT = 6 + Math.random() * 8; M.son(V.village ? (Math.random() < 0.5 ? 'coq' : 'mouton') : (V.cfg.lieu.religion === 'catholique' || V.cfg.lieu.religion === 'orthodoxe') && Math.random() < 0.3 ? 'cloche' : 'foule'); }
    V.proche = proche;
    var inv = el('invite');
    var nomP = proche ? (proche.data.role || !proche.marche ? proche.nom : proche.data.nomCourt || 'Habitant') : '';
    if (proche) { inv.classList.remove('hide'); inv.innerHTML = (M.mobile ? '' : '<kbd>E</kbd> ') + 'Parler à <b>' + nomP + '</b>'; }
    else if (j.pos.z > V.rayon - 4 && Math.abs(j.pos.x) < 4) { inv.classList.remove('hide'); inv.innerHTML = '⬇️ Sortir ' + (V.village ? 'du village' : 'de la ville'); }
    else inv.classList.add('hide');
    if ((M.a('interagir') || M.a('attaque')) && proche) {
      inv.classList.add('hide');
      V.cfg.parler(proche.id, proche);
    }
    // Caméra
    var dist = 7.5, cx, cz;
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
  function quitter() {
    if (!V) return;
    var cb = V.cfg.sortir;
    M.arreter(); // appelle nettoyer()
    cb && cb();
  }
  function nettoyer() {
    if (!V) return;
    V.pnjs.forEach(function (p) { if (p.el) p.el.remove(); if (p.bulle) p.bulle.el.remove(); });
    el('invite').classList.add('hide');
    document.body.classList.remove('modeVille');
    V = null;
  }

  /* cfg : { lieu (objet FF.LIEUX), village, joueur: { look, arme }, pnjs: [{ id, nom, role, icone, look }], habitants: n,
             cris: [phrases des marchands], couleur (bannière du royaume), parler(id, pnj), sortir(), pause() } */
  M.ville = function (cfg) {
    nettoyer();
    var L = cfg.lieu;
    var orient = L.religion === 'sunnite' || L.religion === 'chiite' || /^(syrie|anatolie|egypte|orient)$/.test(L.region) || L.faction === 'legende';
    var style = orient ? 'orient' : L.faction === 'romains' ? 'byzance' : 'occident';
    var village = !!cfg.village;
    var nuit = !!cfg.nuit;
    M.nouvelleScene(nuit ? M.DECORS.nuit : village ? (style === 'orient' ? M.DECORS.desert : M.DECORS.plaine) : style === 'occident' ? M.DECORS.ville : M.DECORS.desert);
    var scene = M.scene;
    var r = M.rng(L.nom.length * 97 + L.x | 0);
    V = { cfg: cfg, pnjs: [], betes: [], obstacles: [], maisons: [], temps: 0, yaw: Math.PI, pitch: 0.3, rayon: village ? 21 : 19, village: village, sonT: 2, style: style };
    var i, a, d;
    if (village) { construireVillage(scene, style, r); var mv = monument(L.religion, 0, -27, style); mv.scale.setScalar(0.6); scene.add(mv); }
    else construireVille(scene, style, r, L, nuit);
    // PNJ importants, en arc de cercle au nord de la place
    var n = cfg.pnjs.length;
    cfg.pnjs.forEach(function (p, k) {
      var ang2 = -Math.PI / 2 + (k - (n - 1) / 2) * (Math.PI * (village ? 0.9 : 1.25) / Math.max(1, n - 1 || 1));
      if (n === 1) ang2 = -Math.PI / 2;
      var d3 = village ? 6.5 : V.rayon - 4;
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
    // Le joueur
    var P = M.creerPerso(cfg.joueur.look, 1);
    M.equiper(P, cfg.joueur.arme || 'epee');
    P.brasD.rotation.x = -0.1;
    scene.add(P.g);
    V.j = { P: P, pos: P.g.position, ang: Math.PI, ph: 0 };
    V.j.pos.set(0, 0, V.rayon - 8);
    document.body.classList.add('modeVille');
    M.cam.position.set(0, 5, V.rayon - 1);
    M.lancer({ type: 'ville', maj: maj, quitter: nettoyer, verrou: !M.mobile });
  };

  function construireVille(scene, style, r, L, nuit) {
    var i, a;
    var sol = new T.Mesh(new T.CircleGeometry(60, 40), M.mat(style === 'occident' ? 0x9e9a8f : 0xd8c8a0));
    sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; scene.add(sol);
    var place = new T.Mesh(new T.CircleGeometry(V.rayon + 1, 32), M.mat(style === 'occident' ? 0xb3ab9a : 0xe8d8b0));
    place.rotation.x = -Math.PI / 2; place.position.y = 0.02; place.receiveShadow = true; scene.add(place);
    // Maisons autour de la place, avec une porte au sud
    for (i = 0; i < 26; i++) {
      a = i / 26 * Math.PI * 2;
      if (Math.abs(difAngle(a, Math.PI / 2)) < 0.25) continue; // rue de la porte (sud = +Z)
      if (Math.abs(difAngle(a, -Math.PI / 2)) < 0.42) continue; // place du monument
      var d = V.rayon + 4 + r() * 2;
      scene.add(M.PROPS.maison(Math.cos(a) * d, Math.sin(a) * d, -a - Math.PI / 2, style, r));
      var d2 = V.rayon + 13 + r() * 6;
      scene.add(M.PROPS.maison(Math.cos(a + 0.12) * d2, Math.sin(a + 0.12) * d2, -a - Math.PI / 2, style, r));
    }
    scene.add(monument(L.religion, 0, -(V.rayon + 7), style));
    // Porte, avec les bannières du royaume
    var porte = new T.Group(); porte.position.set(0, 0, V.rayon + 3);
    M.boite(2, 6, 2, 0xb3a68b, porte, -3.2, 3, 0); M.boite(2, 6, 2, 0xb3a68b, porte, 3.2, 3, 0); M.boite(8.4, 1.6, 2, 0xb3a68b, porte, 0, 6.6, 0);
    scene.add(porte);
    var coul = parseInt((V.cfg.couleur || '#c0392b').slice(1), 16);
    drapeau(-5.2, V.rayon + 1.5, coul, scene); drapeau(5.2, V.rayon + 1.5, coul, scene);
    scene.add(fontaine(0, 0)); V.obstacles.push({ x: 0, z: 0, r: 2.6 });
    if (style !== 'occident') for (i = 0; i < 4; i++) { a = i / 4 * Math.PI * 2 + 0.78; scene.add(M.PROPS.palmier(Math.cos(a) * 9, Math.sin(a) * 9, 0.7, r)); V.obstacles.push({ x: Math.cos(a) * 9, z: Math.sin(a) * 9, r: 0.4 }); }
    else for (i = 0; i < 3; i++) { a = i / 3 * Math.PI * 2 + 0.5; scene.add(M.PROPS.arbre(Math.cos(a) * 10, Math.sin(a) * 10, 0.6, r)); V.obstacles.push({ x: Math.cos(a) * 10, z: Math.sin(a) * 10, r: 0.5 }); }
    if (nuit) for (i = 0; i < 4; i++) { a = i / 4 * Math.PI * 2; M.PROPS.torche(Math.cos(a) * 16, Math.sin(a) * 16, scene); }
    // Vie du marché : étals de marchands, charrettes, tonneaux, caisses
    var couleurs = [0x2874a6, 0x27ae60, 0xd68910, 0x8e44ad, 0xc0392b];
    [[0.25, 15.5], [0.75, 15.5], [2.55, 15.5]].forEach(function (e, k) {
      var ex = Math.cos(e[0]) * e[1], ez = Math.sin(e[0]) * e[1];
      scene.add(etal(ex, ez, -e[0] - Math.PI / 2, couleurs[k % couleurs.length])); V.obstacles.push({ x: ex, z: ez, r: 1.4 });
      var mx = Math.cos(e[0]) * (e[1] - 1.7), mz = Math.sin(e[0]) * (e[1] - 1.7);
      var o = ajouterPnj({ id: 'habitant', nom: 'Marchand', nomCourt: 'Marchand', look: Object.assign({ peau: FF.PEAU[Math.floor(r() * FF.PEAU.length)] }, LOOKS[Math.floor(r() * LOOKS.length)]), habitant: true }, mx, mz, false, 'marchand');
      o.ang = Math.atan2(-mx, -mz);
    });
    scene.add(charrette(-11, 12, 0.6, 'caisses')); V.obstacles.push({ x: -11, z: 12, r: 1.5 });
    scene.add(charrette(13, -6, 2.2, 'foin')); V.obstacles.push({ x: 13, z: -6, r: 1.5 });
    [[-6, 15], [-5.2, 15.8], [7, 14], [-15, -5]].forEach(function (t) { scene.add(tonneau(t[0], t[1])); V.obstacles.push({ x: t[0], z: t[1], r: 0.5 }); });
    [[6.3, 14.8], [-14.5, -3.8], [15, 4]].forEach(function (c) { scene.add(M.PROPS.caisse(c[0], c[1], 0.8)); V.obstacles.push({ x: c[0], z: c[1], r: 0.6 }); });
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
    var nb = 10;
    for (i = 0; i < nb; i++) {
      a = i / nb * Math.PI * 2 + 0.2;
      if (Math.abs(difAngle(a, Math.PI / 2)) < 0.75) continue;
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
    if (!orient) { [[-8, 9], [9, 8.5]].forEach(function (p) { scene.add(meule(p[0], p[1])); V.obstacles.push({ x: p[0], z: p[1], r: 1.3 }); }); }
    else for (i = 0; i < 3; i++) { a = i / 3 * Math.PI * 2 + 1; scene.add(M.PROPS.palmier(Math.cos(a) * 8, Math.sin(a) * 8, 0.75, r)); V.obstacles.push({ x: Math.cos(a) * 8, z: Math.sin(a) * 8, r: 0.4 }); }
    scene.add(charrette(5, 11, 2.6, 'foin')); V.obstacles.push({ x: 5, z: 11, r: 1.5 });
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
      ajouterPnj({ id: 'habitant', nom: village ? 'Villageois' : 'Habitant', nomCourt: village ? 'Villageois' : 'Habitant', look: look(village ? LOOKS_PAYSANS : LOOKS), habitant: true }, pt.x, pt.z, true, village ? 'paysan' : 'habitant');
    }
    // Enfants qui courent
    for (i = 0; i < (village ? 2 : 3); i++) {
      var pe = V.points[(i * 5 + 3) % V.points.length];
      var oe = ajouterPnj({ id: 'habitant', nom: 'Enfant', nomCourt: 'Enfant', look: look(village ? LOOKS_PAYSANS : LOOKS), habitant: true }, pe.x, pe.z, true, 'enfant');
      oe.P.g.scale.setScalar(0.62); oe.vit = 3.4;
    }
    if (!village) {
      // Gardes : deux à la porte, deux en patrouille autour de la place
      var lg = lookGarde(style);
      [-2.2, 2.2].forEach(function (x) { var g = ajouterPnj({ id: 'habitant', nom: 'Garde', nomCourt: 'Garde', look: Object.assign({ peau: FF.PEAU[Math.floor(r() * 3)] }, lg), arme: 'lance', habitant: true }, x, V.rayon - 1.2, false, 'garde'); g.ang = Math.PI; });
      for (i = 0; i < 2; i++) {
        var route = [];
        for (var k = 0; k < 10; k++) { var a2 = (k / 10) * Math.PI * 2 * (i ? -1 : 1) + i * Math.PI; route.push({ x: Math.cos(a2) * 13.5, z: Math.sin(a2) * 13.5 }); }
        var gp = ajouterPnj({ id: 'habitant', nom: 'Garde', nomCourt: 'Garde', look: Object.assign({ peau: FF.PEAU[Math.floor(r() * 3)] }, lg), arme: 'lance', habitant: true }, route[0].x, route[0].z, true, 'garde');
        gp.route = route; gp.iRoute = 1; gp.vit = 1.3;
      }
      // Porteurs avec une caisse sur la tête
      for (i = 0; i < 2; i++) {
        var pp = V.points[(i * 3 + 1) % V.points.length];
        var po = ajouterPnj({ id: 'habitant', nom: 'Porteur', nomCourt: 'Porteur', look: look(LOOKS), habitant: true }, pp.x, pp.z, true, 'porteur');
        M.boite(0.7, 0.55, 0.7, 0x8d6e63, po.P.haut, 0, 2.2, 0); po.vit = 1.2;
      }
      // Animaux : poules, chiens, et un cheval (ou un chameau) attaché près de la porte
      for (i = 0; i < 4; i++) ajouterBete('poule', -9 + r() * 4, 6 + r() * 4, { x: -8, z: 8 });
      ajouterBete('chien', 6, 6); ajouterBete('chien', -6, -8);
      ajouterBete(style === 'orient' ? 'chameau' : 'cheval', 8.5, V.rayon - 2.5);
      if (style === 'orient') ajouterBete('chameau', -8.5, V.rayon - 2.8); else ajouterBete('cheval', -8.5, V.rayon - 2.5);
    } else {
      // Paysans qui moissonnent au bord du village
      [[-6, -15], [7, -14.5], [-15, 4]].forEach(function (f) {
        var o = ajouterPnj({ id: 'habitant', nom: 'Paysan', nomCourt: 'Paysan', look: look(LOOKS_PAYSANS), arme: 'hache', habitant: true }, f[0], f[1], false, 'faucheur');
        o.ang = Math.atan2(f[0], f[1]); o.ph = r() * 6;
      });
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
