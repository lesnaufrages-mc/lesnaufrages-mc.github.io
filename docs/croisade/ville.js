/* Ferrum et Fides : les villes en 3D. Tu te promènes sur la place, tu parles aux PNJ
   (forgeron, recruteur, taverne, cour, quêtes) et aux habitants. Le style change selon la région et la religion. */
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
    } else if (religion === 'orthodoxe' || religion === 'armenienne') {
      M.boite(10, 7, 10, pierre, g, 0, 3.5, 0);
      for (var i = -1; i <= 1; i += 2) M.boite(9.6, 0.3, 0.1, 0xa04000, g, 0, 2.5 + i * 1.5, 5.03);
      var dome = religion === 'orthodoxe' ? new T.Mesh(new T.SphereGeometry(4.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.mat(0x5d8aa8)) : new T.Mesh(new T.ConeGeometry(3.6, 4.5, 8), M.mat(0x7b6d5a));
      dome.position.y = religion === 'orthodoxe' ? 7.6 : 9.6;
      var tambour = new T.Mesh(new T.CylinderGeometry(3.6, 3.6, 1.6, 12), M.mat(pierre)); tambour.position.y = 7.6; g.add(tambour);
      dome.position.y += 0.8; g.add(dome);
      M.boite(0.25, 1.6, 0.25, 0xd4ac0d, g, 0, religion === 'orthodoxe' ? 13.5 : 13, 0); M.boite(1, 0.25, 0.25, 0xd4ac0d, g, 0, religion === 'orthodoxe' ? 13.8 : 13.3, 0);
      M.boite(2.2, 3.4, 0.2, 0x4e342e, g, 0, 1.7, 5.05);
    } else if (religion === 'sunnite' || religion === 'chiite') {
      M.boite(11, 6, 11, pierre, g, 0, 3, 0);
      var d2 = new T.Mesh(new T.SphereGeometry(4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.mat(religion === 'chiite' ? 0x2e86c1 : 0x16a085)); d2.position.y = 6; g.add(d2);
      var mi = new T.Mesh(new T.CylinderGeometry(0.9, 1.1, 16, 8), M.mat(pierre)); mi.position.set(6.5, 8, 5); g.add(mi);
      M.boite(2.4, 0.5, 2.4, pierre, g, 6.5, 13, 5);
      var pt = new T.Mesh(new T.ConeGeometry(1, 2.4, 8), M.mat(religion === 'chiite' ? 0x2e86c1 : 0x16a085)); pt.position.set(6.5, 17.2, 5); g.add(pt);
      M.boite(2.4, 3.6, 0.2, 0x5d4037, g, 0, 1.8, 5.55);
      for (var k = -1; k <= 1; k += 2) M.boite(1.2, 2.2, 0.15, 0x1a5276, g, k * 3.2, 3, 5.55, { ombre: false });
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

  // Habitants qui se promènent
  var LOOKS = [
    { tunique: 0x8d6e63, pantalon: 0x5d4037, casque: 'capuche' }, { tunique: 0x2874a6, pantalon: 0x34495e, cheveux: 0x3e2723 },
    { tunique: 0xa04000, pantalon: 0x4a235a, cheveux: 0x1c1c1c }, { tunique: 0x27ae60, pantalon: 0x34495e, casque: 'turban' },
    { tunique: 0xf4ecd8, pantalon: 0x7e5109, casque: 'turban' }, { tunique: 0x7d3c98, pantalon: 0x1b2631, cheveux: 0x6e2c00 },
    { tunique: 0xd4ac0d, pantalon: 0x5d4037, casque: 'chapel' }, { tunique: 0xc0392b, pantalon: 0x212f3d, cheveux: 0xd35400 }
  ];

  function animerMarche(P, ph, amp) {
    P.jambeG.rotation.x = Math.sin(ph) * amp; P.jambeD.rotation.x = -Math.sin(ph) * amp;
    P.brasG.rotation.x = -Math.sin(ph) * amp * 0.6; P.brasD.rotation.x = Math.sin(ph) * amp * 0.6 - 0.1;
    P.corps.position.y = Math.abs(Math.sin(ph)) * amp * 0.1;
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
      // Porte de la ville au sud : on sort
      if (j.pos.z > 0 && Math.abs(j.pos.x) < 3) { quitter(); return; }
      j.pos.x *= V.rayon / r; j.pos.z *= V.rayon / r;
    }
    j.ph += dt * vit * 2.4;
    animerMarche(j.P, j.ph, Math.min(1, vit / 3) * 0.7);
    j.P.g.rotation.y = j.ang;
    // PNJ
    var proche = null, pd = 3;
    V.pnjs.forEach(function (p) {
      if (p.marche) {
        var dx = p.but.x - p.pos.x, dz = p.but.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.5 || p.attente > 0) {
          p.attente -= dt;
          if (p.attente <= 0 && d < 0.5) { p.but = V.points[Math.floor(Math.random() * V.points.length)]; p.attente = 1 + Math.random() * 4; }
          animerMarche(p.P, 0, 0);
        } else {
          p.pos.x += dx / d * 1.6 * dt; p.pos.z += dz / d * 1.6 * dt;
          p.ang += difAngle(p.ang, Math.atan2(dx, dz)) * Math.min(1, dt * 6);
          p.ph += dt * 4; animerMarche(p.P, p.ph, 0.5);
        }
      }
      var dj = Math.hypot(j.pos.x - p.pos.x, j.pos.z - p.pos.z);
      if (dj < 3.5) p.ang += difAngle(p.ang, Math.atan2(j.pos.x - p.pos.x, j.pos.z - p.pos.z)) * Math.min(1, dt * 5);
      p.P.g.rotation.y = p.ang;
      if (dj < pd) { pd = dj; proche = p; }
      if (p.el) {
        var vis = M.projeter(new T.Vector3(p.pos.x, 2.75, p.pos.z), p.el);
        if (vis) p.el.style.opacity = dj > 22 ? '0' : '1';
      }
    });
    V.proche = proche;
    var inv = el('invite');
    if (proche) { inv.classList.remove('hide'); inv.innerHTML = (M.mobile ? '' : '<kbd>E</kbd> ') + 'Parler à <b>' + proche.nom + '</b>'; }
    else if (j.pos.z > V.rayon - 4 && Math.abs(j.pos.x) < 4) { inv.classList.remove('hide'); inv.innerHTML = '⬇️ Sortir de la ville'; }
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
      if (Math.hypot(cx, cz) < V.rayon + 2.5 || (Math.abs(cx) < 2.5 && cz > 0)) break;
      dist -= 0.5;
    }
    var cy = 1.6 + Math.sin(V.pitch) * dist, k = Math.min(1, dt * 10);
    M.cam.position.x += (cx - M.cam.position.x) * k; M.cam.position.y += (cy - M.cam.position.y) * k; M.cam.position.z += (cz - M.cam.position.z) * k;
    M.cam.lookAt(j.pos.x, 1.7, j.pos.z);
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
    V.pnjs.forEach(function (p) { if (p.el) p.el.remove(); });
    el('invite').classList.add('hide');
    document.body.classList.remove('modeVille');
    V = null;
  }

  /* cfg : { lieu (objet FF.LIEUX), joueur: { look, arme }, pnjs: [{ id, nom, role, icone, look }], habitants: n,
             parler(id, pnj), sortir(), pause() } */
  M.ville = function (cfg) {
    nettoyer();
    var L = cfg.lieu;
    var style = L.region === 'occident' || L.region === 'hongrie' ? 'occident' : L.faction === 'romains' ? 'byzance' : 'orient';
    if (L.faction === 'legende') style = 'orient';
    var nuit = !!cfg.nuit;
    M.nouvelleScene(nuit ? M.DECORS.nuit : style === 'occident' ? M.DECORS.ville : M.DECORS.desert);
    var scene = M.scene;
    var r = M.rng(L.nom.length * 97 + L.x | 0);
    V = { cfg: cfg, pnjs: [], obstacles: [], temps: 0, yaw: Math.PI, pitch: 0.3, rayon: 19 };
    // Sol pavé
    var sol = new T.Mesh(new T.CircleGeometry(60, 40), M.mat(style === 'occident' ? 0x9e9a8f : 0xd8c8a0));
    sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; scene.add(sol);
    var place = new T.Mesh(new T.CircleGeometry(V.rayon + 1, 32), M.mat(style === 'occident' ? 0xb3ab9a : 0xe8d8b0));
    place.rotation.x = -Math.PI / 2; place.position.y = 0.02; place.receiveShadow = true; scene.add(place);
    // Maisons autour de la place, avec une porte au sud
    for (var i = 0; i < 26; i++) {
      var a = i / 26 * Math.PI * 2;
      if (Math.abs(difAngle(a, Math.PI / 2)) < 0.25) continue; // rue de la porte (sud = +Z)
      if (Math.abs(difAngle(a, -Math.PI / 2)) < 0.42) continue; // place du monument
      var d = V.rayon + 4 + r() * 2;
      scene.add(M.PROPS.maison(Math.cos(a) * d, Math.sin(a) * d, -a - Math.PI / 2, style === 'occident' ? 'occident' : style, r));
      var d2 = V.rayon + 13 + r() * 6;
      scene.add(M.PROPS.maison(Math.cos(a + 0.12) * d2, Math.sin(a + 0.12) * d2, -a - Math.PI / 2, style === 'occident' ? 'occident' : style, r));
    }
    scene.add(monument(L.religion, 0, -(V.rayon + 7), style));
    // Porte
    var porte = new T.Group(); porte.position.set(0, 0, V.rayon + 3);
    M.boite(2, 6, 2, 0xb3a68b, porte, -3.2, 3, 0); M.boite(2, 6, 2, 0xb3a68b, porte, 3.2, 3, 0); M.boite(8.4, 1.6, 2, 0xb3a68b, porte, 0, 6.6, 0);
    scene.add(porte);
    scene.add(fontaine(0, 0)); V.obstacles.push({ x: 0, z: 0, r: 2.6 });
    if (style !== 'occident') for (i = 0; i < 4; i++) { a = i / 4 * Math.PI * 2 + 0.78; scene.add(M.PROPS.palmier(Math.cos(a) * 9, Math.sin(a) * 9, 0.7, r)); V.obstacles.push({ x: Math.cos(a) * 9, z: Math.sin(a) * 9, r: 0.4 }); }
    else for (i = 0; i < 3; i++) { a = i / 3 * Math.PI * 2 + 0.5; scene.add(M.PROPS.arbre(Math.cos(a) * 10, Math.sin(a) * 10, 0.6, r)); V.obstacles.push({ x: Math.cos(a) * 10, z: Math.sin(a) * 10, r: 0.5 }); }
    if (nuit) for (i = 0; i < 4; i++) { a = i / 4 * Math.PI * 2; M.PROPS.torche(Math.cos(a) * 16, Math.sin(a) * 16, scene); }
    // PNJ importants, en arc de cercle, chacun devant son étal
    var n = cfg.pnjs.length;
    cfg.pnjs.forEach(function (p, k) {
      var ang = Math.PI * 1.15 + (k / Math.max(1, n - 1)) * Math.PI * 0.7 + Math.PI * 0.1;
      if (n === 1) ang = -Math.PI / 2;
      var ang2 = -Math.PI / 2 + (k - (n - 1) / 2) * (Math.PI * 1.25 / Math.max(1, n - 1 || 1));
      var d3 = V.rayon - 4;
      var x = Math.cos(ang2) * d3, z = Math.sin(ang2) * d3;
      if (p.etal) { scene.add(etal(Math.cos(ang2) * (d3 + 1.8), Math.sin(ang2) * (d3 + 1.8), -ang2 + Math.PI / 2, p.etal)); V.obstacles.push({ x: Math.cos(ang2) * (d3 + 1.8), z: Math.sin(ang2) * (d3 + 1.8), r: 1.4 }); }
      ajouterPnj(p, x, z, false);
    });
    // Habitants
    V.points = [];
    for (i = 0; i < 12; i++) { a = r() * Math.PI * 2; d = 5 + r() * 9; V.points.push({ x: Math.cos(a) * d, z: Math.sin(a) * d }); }
    var nh = cfg.habitants == null ? 7 : cfg.habitants;
    for (i = 0; i < nh; i++) {
      var lk = Object.assign({ peau: FF.PEAU[Math.floor(r() * FF.PEAU.length)] }, LOOKS[Math.floor(r() * LOOKS.length)]);
      if (style === 'occident' && lk.casque === 'turban') lk.casque = 'capuche';
      var pt = V.points[i % V.points.length];
      ajouterPnj({ id: 'habitant', nom: 'Habitant', look: lk, habitant: true }, pt.x, pt.z, true);
    }
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
  function ajouterPnj(p, x, z, marche) {
    var P = M.creerPerso(p.look || LOOKS[0], 1);
    if (p.arme) M.equiper(P, p.arme);
    V.scene = M.scene;
    M.scene.add(P.g);
    P.g.position.set(x, 0, z);
    var o = { id: p.id, nom: p.nom, P: P, pos: P.g.position, ang: Math.atan2(-x, -z), marche: marche, but: { x: x, z: z }, attente: Math.random() * 3, ph: 0, data: p };
    if (!marche || p.role) {
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
