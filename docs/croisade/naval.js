/* Ferrum et Fides : les combats navals.
   Tu barres ton navire (vitesse et gouvernail), tu tires des volées de carreaux, tu craches le feu grégeois
   (flotte romaine) ou tu éperonnes. Collé à un navire ennemi, tu peux l'aborder : la bataille continue sur le pont. */
(function () {
  'use strict';
  var T = window.THREE, M = Moteur;
  var N = null;

  function el(id) { return document.getElementById(id) || { style: {}, classList: { add: function () {}, remove: function () {}, toggle: function () {} } }; }
  function difAngle(a, b) { var d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
  function message(txt, classe) {
    var m = el('hudMsg');
    m.textContent = txt; m.className = 'hudMsg montre ' + (classe || '');
    clearTimeout(message.t);
    message.t = setTimeout(function () { m.className = 'hudMsg'; }, 2400);
  }

  // Hauteur des vagues
  function houle(x, z, t) { return Math.sin(x * 0.12 + t * 1.1) * 0.35 + Math.cos(z * 0.09 + t * 0.8) * 0.3 + Math.sin((x + z) * 0.2 + t * 1.7) * 0.12; }

  // ---------- Navire en blocs ----------
  function creerNavire(type) {
    var D = FF.NAVIRES[type];
    var g = new T.Group(), coque = new T.Group(); g.add(coque);
    var c = D.coque;
    M.boite(3.2, 1.3, 10, c, coque, 0, 0.2, 0);
    var proue = M.boite(2.3, 1.3, 2.3, c, coque, 0, 0.2, 5.4); proue.rotation.y = Math.PI / 4; proue.scale.set(2.2, 1.3, 2.2);
    M.boite(3.0, 1.2, 2, c, coque, 0, 1.1, -4.3); // château arrière
    M.boite(2.9, 0.1, 9.6, 0xa1887f, coque, 0, 0.86, 0);
    M.boite(0.2, 0.5, 10, 0x5d4037, coque, 1.55, 1.1, 0); M.boite(0.2, 0.5, 10, 0x5d4037, coque, -1.55, 1.1, 0);
    var mat = new T.Mesh(new T.CylinderGeometry(0.16, 0.2, 8, 6), M.mat(0x6e4b2a)); mat.position.set(0, 4.8, 0.8); mat.castShadow = true; coque.add(mat);
    M.boite(5.4, 0.15, 0.15, 0x6e4b2a, coque, 0, 7.6, 0.85);
    var voile = M.boite(5, 4.2, 0.08, D.voile, coque, 0, 5.4, 0.95);
    M.boite(0.6, 3.4, 0.1, D.embleme, coque, 0, 5.5, 1.0, { ombre: false });
    M.boite(2.8, 0.6, 0.1, D.embleme, coque, 0, 6.0, 1.0, { ombre: false });
    if (D.feu) { M.boite(0.5, 0.5, 0.7, 0xd4ac0d, coque, 0, 1.3, 6.6, { lueur: 0x3d2f05 }); M.boite(0.18, 0.18, 0.5, 0x1c1c1c, coque, 0, 1.25, 7.0); }
    // Rames
    var rames = [];
    for (var i = 0; i < 5; i++) for (var s = -1; s <= 1; s += 2) {
      var r = new T.Group(); r.position.set(s * 1.6, 0.6, -2.6 + i * 1.4);
      M.boite(2.6, 0.08, 0.12, 0x8d6e63, r, s * 1.3, -0.3, 0, { ombre: false });
      coque.add(r); rames.push({ g: r, s: s });
    }
    // Équipage (petits personnages)
    for (var k = 0; k < 4; k++) {
      var p = M.creerPerso({ tunique: D.voile, pantalon: 0x34495e, casque: k % 2 ? 'nasal' : 'aucun', cheveux: 0x3e2723 }, 0.55);
      p.g.position.set((k % 2 ? 0.7 : -0.7), 0.9, -2 + k * 1.6);
      coque.add(p.g);
    }
    return { g: g, coque: coque, voile: voile, rames: rames };
  }

  function Navire(type, equipe, x, z, ang, opts) {
    opts = opts || {};
    this.type = type; this.D = FF.NAVIRES[type]; this.equipe = equipe; this.joueur = !!opts.joueur;
    var m = creerNavire(type);
    this.m = m; this.g = m.g;
    this.pos = this.g.position; this.pos.set(x, 0, z);
    this.ang = ang || 0;
    this.v = 0; this.gaz = this.joueur ? 0.3 : 0.6;
    var mul = equipe === 1 ? N.diffPv : 1;
    this.pvMax = Math.round(this.D.pv * mul); this.pv = this.pvMax;
    this.equipage = opts.equipage != null ? opts.equipage : this.D.equipage;
    this.tirT = 1 + Math.random() * 2; this.feuT = 0; this.brule = 0;
    this.coule = false; this.couleT = 0; this.rayon = 4.2;
    this.decale = Math.random() < 0.5 ? 1 : -1;
    N.scene.add(this.g);
    if (!this.joueur) {
      var e = document.createElement('div');
      e.className = 'barreTete navire ' + (equipe === 0 ? 'allie' : 'ennemi');
      e.innerHTML = '<i></i><span>' + this.D.nom + '</span>';
      document.getElementById('calqueTextes').appendChild(e);
      this.el = e; this.elPv = e.querySelector('i');
    }
  }
  Navire.prototype.devant = function () { return new T.Vector3(Math.sin(this.ang), 0, Math.cos(this.ang)); };
  Navire.prototype.vivant = function () { return !this.coule; };

  function navires(equipe) { return N.navires.filter(function (n) { return n.vivant() && (equipe == null || n.equipe === equipe); }); }
  function dist(a, b) { return Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z); }

  function degats(n, d, auteur) {
    if (!n.vivant()) return;
    n.pv -= d;
    M.texte(new T.Vector3(n.pos.x, 4, n.pos.z), String(Math.round(d)), n.joueur ? 'rouge' : 'blanc');
    if (Math.random() < 0.25 && n.equipage > 1) { n.equipage--; if (n.joueur) N.pertes++; }
    if (n.pv <= 0) couler(n);
  }
  function couler(n) {
    n.pv = 0; n.coule = true; n.couleT = 0;
    if (n.el) { n.el.remove(); n.el = null; }
    M.son('eau');
    if (n.equipe === 1) { N.or += 40; N.coules++; message(n.D.nom + _t(' coulée !'), 'or'); }
  }

  // Volée de carreaux d'arbalète vers une cible
  function volee(n, cible) {
    for (var i = 0; i < 6; i++) {
      var m = M.boite(0.06, 0.06, 0.7, 0x5d4037, N.scene, n.pos.x + (Math.random() - 0.5) * 2, 2.2, n.pos.z + (Math.random() - 0.5) * 6, { ombre: false });
      var but = new T.Vector3(cible.pos.x + (Math.random() - 0.5) * 4 + Math.sin(cible.ang) * cible.v * 0.8, 1.5, cible.pos.z + (Math.random() - 0.5) * 6 + Math.cos(cible.ang) * cible.v * 0.8);
      var d = but.clone().sub(m.position), l = d.length(), tps = l / 30;
      var v = new T.Vector3(d.x / tps, (d.y + 0.5 * 18 * tps * tps) / tps, d.z / tps);
      N.traits.push({ m: m, v: v, t: 0, vie: tps + 0.2, equipe: n.equipe, deg: 3.2 });
    }
    M.son('tir');
  }
  function feuGregeois(n) {
    var d = n.devant();
    M.son('feu');
    for (var i = 0; i < 30; i++) {
      var p = n.pos.clone().addScaledVector(d, 7 + Math.random() * 12);
      p.x += (Math.random() - 0.5) * (2 + i * 0.15); p.z += (Math.random() - 0.5) * (2 + i * 0.15); p.y = 1 + Math.random() * 1.5;
      M.eclats(p, Math.random() < 0.5 ? 0xff7f00 : 0xffc300, 1, 2, -1);
    }
    navires().forEach(function (o) {
      if (o.equipe === n.equipe) return;
      var dd = dist(n, o), a = Math.abs(difAngle(n.ang, Math.atan2(o.pos.x - n.pos.x, o.pos.z - n.pos.z)));
      if (dd < 20 && a < 0.55) { degats(o, 22, n); o.brule = 5; }
    });
  }

  // ---------- Commandes du joueur ----------
  function commande(n, dt) {
    var k = M.E.touches;
    var dep = M.deplacement();
    if (M.mobile || Math.abs(M.E.joy.y) > 0.05) { if (Math.abs(M.E.joy.y) > 0.05) n.gaz = Math.max(-0.3, Math.min(1, M.E.joy.y)); }
    if (k.KeyW || k.ArrowUp) n.gaz = Math.min(1, n.gaz + dt * 0.8);
    if (k.KeyS || k.ArrowDown) n.gaz = Math.max(-0.3, n.gaz - dt * 0.8);
    var barre = -dep.x;
    n.ang += barre * n.D.virage * dt * (0.35 + Math.min(1, Math.abs(n.v) / n.D.vit) * 0.8);
    var cibles = navires(1).sort(function (a, b) { return dist(n, a) - dist(n, b); });
    var proche = cibles[0];
    if ((M.a('esquive') || M.a('attaque') || M.a('tir')) && n.tirT <= 0) {
      if (proche && dist(n, proche) < 34) { volee(n, proche); n.tirT = 2.2; }
      else message(_t('Aucun navire ennemi à portée'), 'petit');
    }
    if (M.a('pouvoir')) {
      if (!N.feu) message(N.cfg.faction === 'romains' ? _t('Pas de siphon sur ce navire') : _t('Le feu grégeois est un secret des Romains'), 'petit');
      else if (n.feuT > 0) message(_t('Le siphon se recharge…'), 'petit');
      else { feuGregeois(n); n.feuT = 8; }
    }
    if (M.a('interagir') || M.a('changer')) {
      if (proche && dist(n, proche) < 11) aborder(proche, true);
      else message(_t('Approche-toi à moins de 10 m pour aborder'), 'petit');
    }
    if (M.a('pause')) { N.cfg.pause && N.cfg.pause(); }
  }

  // ---------- IA des navires ----------
  function ia(n, dt) {
    var hs = navires().filter(function (o) { return o.equipe !== n.equipe; });
    if (!hs.length) { n.gaz = 0.2; return; }
    hs.sort(function (a, b) { return dist(n, a) - dist(n, b); });
    var c = hs[0], d = dist(n, c);
    var vers = Math.atan2(c.pos.x - n.pos.x, c.pos.z - n.pos.z);
    var but = d > 18 ? vers : vers + n.decale * Math.PI / 2;
    // Abordage si plus nombreux
    if (n.equipe === 1 && c.joueur && d < 9 && n.equipage > c.equipage * 1.2 && !N.abordageRefuse && Math.random() < dt * 0.3) { aborder(n, false); return; }
    // Éviter les îles
    N.iles.forEach(function (il) {
      var di = Math.hypot(il.x - n.pos.x, il.z - n.pos.z);
      if (di < il.r + 12) { var fuite = Math.atan2(n.pos.x - il.x, n.pos.z - il.z); but = fuite; }
    });
    n.ang += Math.max(-1, Math.min(1, difAngle(n.ang, but) * 2)) * n.D.virage * dt;
    n.gaz = d > 14 ? 0.9 : 0.5;
    n.tirT -= dt * 0; // (géré dans maj)
    if (n.tirT <= 0 && d < 30) { volee(n, c); n.tirT = (n.equipe === 1 ? N.diffTir : 3) + Math.random() * 1.5; }
    if (n.D.feu && n.feuT <= 0 && d < 16 && Math.abs(difAngle(n.ang, vers)) < 0.5) { feuGregeois(n); n.feuT = 10; }
  }

  // ---------- Abordage : la bataille continue sur le pont ----------
  function aborder(ennemi, parNous) {
    if (N.abordage) return;
    N.abordage = true;
    M.son('cor');
    var cfg = N.cfg, joueurN = N.joueur;
    var nEnnemis = Math.max(2, Math.min(9, ennemi.equipage));
    var troupe = ennemi.D.troupe || 'pirate';
    var allies = (cfg.equipageAllie || []).slice();
    // Le nombre d'hommes à bord limite les alliés
    var place = Math.max(0, joueurN.equipage - (cfg.compagnons || []).length);
    var allies2 = [];
    allies.forEach(function (g) { var k = Math.min(g[1], place); if (k > 0) { allies2.push([g[0], k]); place -= k; } });
    var etat = sauverEtat();
    // Les noms des navires restent cachés pendant le combat sur le pont (ils réapparaissent au retour en mer)
    N.navires.forEach(function (n) { if (n.el) n.el.style.display = 'none'; });
    document.body.classList.remove('modeNaval');
    M.bataille({
      decor: 'pont', titre: parNous ? _t('À l\'abordage !') : _t('Ils nous abordent !'),
      vagues: [[[troupe, Math.ceil(nEnnemis / 2)]], [[troupe, Math.floor(nEnnemis / 2)]]].filter(function (v) { return v[0][1] > 0; }),
      allies: allies2, compagnons: cfg.compagnons, joueur: cfg.joueur, faction: cfg.faction, diff: cfg.diff, directionnel: cfg.directionnel, pause: cfg.pause, graine: 3
    }, function (res) {
      N = etat.N;
      restaurer(etat);
      N.abordage = false;
      N.or += res.or;
      Object.keys(res.morts).forEach(function (k) { N.mortsAbordage[k] = (N.mortsAbordage[k] || 0) + res.morts[k]; });
      if (res.victoire) {
        ennemi.equipage = 0; couler(ennemi); N.captures++;
        message(ennemi.D.nom + _t(' capturée !'), 'or');
        N.or += 60;
      } else {
        N.fini = 'defaite'; N.finT = 0.1;
      }
    });
  }
  // On garde la scène navale pendant l'abordage
  function sauverEtat() { return { N: N, scene: N.scene }; }
  function restaurer(e) {
    // la scène de bataille est remplacée : on remet celle de la mer
    M._sceneActive(e.scene);
    document.body.classList.add('modeNaval');
    M.lancer(modeNaval());
  }

  // ---------- Mer ----------
  function creerMer(lac) {
    var D = { ciel: lac ? 0x7fb3d5 : 0x5d9bd5, horizon: lac ? 0xd5e8d4 : 0xd6eaf8, brouillard0: 60, brouillard1: 260 };
    var scene = M.nouvelleScene(D);
    var g = new T.PlaneGeometry(500, 500, 70, 70);
    g.rotateX(-Math.PI / 2);
    var eau = new T.Mesh(g, new T.MeshPhongMaterial({ color: lac ? 0x2e7d6b : 0x1f6fa3, flatShading: true, shininess: 60, specular: 0x88aacc }));
    eau.receiveShadow = true;
    scene.add(eau);
    N.eau = eau; N.base = g.attributes.position.array.slice();
    // Îles et côtes
    var r = M.rng(lac ? 11 : 5);
    N.iles = [];
    var nb = lac ? 0 : 5;
    for (var i = 0; i < nb; i++) {
      var a = r() * Math.PI * 2, d = 45 + r() * 50, x = Math.cos(a) * d, z = Math.sin(a) * d, rr = 6 + r() * 8;
      var il = new T.Mesh(new T.DodecahedronGeometry(rr, 0), M.mat(0xc8b48a)); il.position.set(x, -rr * 0.55, z); il.scale.y = 0.6; scene.add(il);
      for (var k = 0; k < 3; k++) scene.add(M.PROPS.palmier(x + (r() - 0.5) * rr, z + (r() - 0.5) * rr, 0.8, r));
      N.iles.push({ x: x, z: z, r: rr });
    }
    if (lac) { // rives du lac Ascanie et murailles de Nicée
      for (i = 0; i < 26; i++) {
        a = i / 26 * Math.PI * 2; d = 110 + r() * 10;
        var h = new T.Mesh(new T.DodecahedronGeometry(14 + r() * 8, 0), M.mat(i % 2 ? 0x6b8e4e : 0x7d9a5b)); h.position.set(Math.cos(a) * d, -4, Math.sin(a) * d); scene.add(h);
      }
      for (i = 0; i < 5; i++) scene.add(M.PROPS.tour(-30 + i * 15, -100, 14));
      scene.add(M.PROPS.muraille(0, -100, 60, 0, 10));
    }
    return scene;
  }

  // ---------- Boucle ----------
  function majMer(dt) {
    N.temps += dt;
    var p = N.eau.geometry.attributes.position, b = N.base;
    for (var i = 0; i < p.count; i++) p.array[i * 3 + 1] = houle(b[i * 3], b[i * 3 + 2], N.temps);
    p.needsUpdate = true;
    N.eau.geometry.computeVertexNormals();
  }
  function maj(dt) {
    if (M.a('pause')) { N.cfg.pause && N.cfg.pause(); return; }
    majMer(dt);
    var j = N.joueur;
    N.navires.forEach(function (n) {
      if (n.coule) {
        n.couleT += dt;
        n.g.rotation.z = Math.min(0.6, n.couleT * 0.3);
        n.g.position.y = -n.couleT * 1.2;
        if (n.couleT > 5) { N.scene.remove(n.g); n.supprime = true; }
        return;
      }
      n.tirT -= dt; n.feuT -= dt;
      if (n.brule > 0) { n.brule -= dt; n.pv -= dt * 3; if (Math.random() < 0.4) M.eclats(new T.Vector3(n.pos.x + (Math.random() - 0.5) * 3, 1.5, n.pos.z + (Math.random() - 0.5) * 8), 0xff7f00, 1, 2, -2); if (n.pv <= 0) couler(n); }
      if (n.joueur) commande(n, dt); else ia(n, dt);
      var vMax = n.D.vit * (n.joueur ? 1.05 : 0.95);
      n.v += (n.gaz * vMax - n.v) * Math.min(1, dt * 0.8);
      n.pos.x += Math.sin(n.ang) * n.v * dt;
      n.pos.z += Math.cos(n.ang) * n.v * dt;
      // Bord du terrain
      var r = Math.hypot(n.pos.x, n.pos.z), rm = N.cfg.lac ? 85 : 140;
      if (r > rm) { n.pos.x *= rm / r; n.pos.z *= rm / r; }
      n.pos.y = houle(n.pos.x, n.pos.z, N.temps) - 0.2;
      n.g.rotation.y = n.ang;
      n.m.coque.rotation.x = (houle(n.pos.x + Math.sin(n.ang) * 4, n.pos.z + Math.cos(n.ang) * 4, N.temps) - houle(n.pos.x - Math.sin(n.ang) * 4, n.pos.z - Math.cos(n.ang) * 4, N.temps)) * -0.08;
      n.m.coque.rotation.z = Math.sin(N.temps * 1.3 + n.pos.x) * 0.04;
      n.m.voile.scale.z = 0.08 + Math.abs(n.gaz) * 0.6;
      var ph = N.temps * (2 + n.v * 0.3);
      n.m.rames.forEach(function (ra) { ra.g.rotation.y = Math.sin(ph) * 0.4 * ra.s; ra.g.rotation.z = Math.cos(ph) * 0.15 * ra.s; });
      if (n.el && !N.abordage) { var vis = M.projeter(new T.Vector3(n.pos.x, 9, n.pos.z), n.el); if (vis) n.elPv.style.width = Math.max(0, n.pv / n.pvMax * 100) + '%'; }
    });
    // Collisions entre navires (éperonnage) et avec les îles
    var ns = navires();
    for (var a = 0; a < ns.length; a++) {
      for (var b = a + 1; b < ns.length; b++) {
        var A = ns[a], Bn = ns[b], dx = Bn.pos.x - A.pos.x, dz = Bn.pos.z - A.pos.z, d = Math.hypot(dx, dz);
        if (d < A.rayon + Bn.rayon - 2 && d > 0.01) {
          var pousse = (A.rayon + Bn.rayon - 2 - d) / 2;
          A.pos.x -= dx / d * pousse; A.pos.z -= dz / d * pousse; Bn.pos.x += dx / d * pousse; Bn.pos.z += dz / d * pousse;
          if (A.equipe !== Bn.equipe && (A.eperonT || 0) <= 0) {
            var va = Math.max(0, A.v * (Math.sin(A.ang) * dx + Math.cos(A.ang) * dz) / d), vb = Math.max(0, Bn.v * -(Math.sin(Bn.ang) * dx + Math.cos(Bn.ang) * dz) / d);
            if (va > 4) { degats(Bn, va * 4, A); M.son('coup'); M.secouer(0.3); if (A.joueur) message(_t('Éperonnage !'), 'or'); }
            if (vb > 4) { degats(A, vb * 4, Bn); M.son('coup'); M.secouer(0.3); }
            A.eperonT = Bn.eperonT = 1.5; A.v *= 0.3; Bn.v *= 0.3;
          }
        }
      }
      ns[a].eperonT = (ns[a].eperonT || 0) - dt;
      N.iles.forEach(function (il) {
        var n = ns[a], dx2 = n.pos.x - il.x, dz2 = n.pos.z - il.z, d2 = Math.hypot(dx2, dz2), m = il.r + 3;
        if (d2 < m) { n.pos.x = il.x + dx2 / d2 * m; n.pos.z = il.z + dz2 / d2 * m; n.v *= 0.5; }
      });
    }
    N.navires = N.navires.filter(function (n) { return !n.supprime; });
    // Carreaux
    for (var i = N.traits.length - 1; i >= 0; i--) {
      var t = N.traits[i];
      t.t += dt; t.v.y -= 18 * dt;
      t.m.position.addScaledVector(t.v, dt);
      t.m.lookAt(t.m.position.clone().add(t.v));
      var fini = t.t > t.vie;
      if (!fini) for (var q = 0; q < ns.length; q++) {
        var nn = ns[q];
        if (nn.equipe === t.equipe || nn.coule) continue;
        var lx = t.m.position.x - nn.pos.x, lz = t.m.position.z - nn.pos.z;
        var fx = lx * Math.sin(nn.ang) + lz * Math.cos(nn.ang), sx = lx * Math.cos(nn.ang) - lz * Math.sin(nn.ang);
        if (Math.abs(fx) < 5.5 && Math.abs(sx) < 1.9 && t.m.position.y < 3) { degats(nn, t.deg); fini = true; M.eclats(t.m.position.clone(), 0x8d6e63, 3, 2); break; }
      }
      if (t.m.position.y < -0.5) { fini = true; M.eclats(t.m.position.clone().setY(0.2), 0xd6eaf8, 2, 1.5); }
      if (fini) { N.scene.remove(t.m); N.traits.splice(i, 1); }
    }
    M.majEffets(dt);
    // Caméra
    if (j) {
      var rc = M.rotationCamera();
      N.camOff -= rc.dx * 0.004;
      N.camOff *= Math.exp(-dt * 0.4);
      var yaw = j.ang + N.camOff;
      var cx = j.pos.x - Math.sin(yaw) * 20, cz = j.pos.z - Math.cos(yaw) * 20;
      M.cam.position.x += (cx - M.cam.position.x) * Math.min(1, dt * 4);
      M.cam.position.z += (cz - M.cam.position.z) * Math.min(1, dt * 4);
      M.cam.position.y += (10 - M.cam.position.y) * Math.min(1, dt * 4);
      M.appliquerSecousse(dt);
      M.cam.lookAt(j.pos.x + Math.sin(j.ang) * 6, 2, j.pos.z + Math.cos(j.ang) * 6);
      M.suivreOmbre(j.pos.x, j.pos.z);
    }
    majHud();
    if (N.fini) { N.finT -= dt; if (N.finT <= 0) terminer(); return; }
    if (!j.vivant()) { N.fini = 'defaite'; N.finT = 2.5; message(_t('Ton navire sombre…'), 'rouge'); M.son('defaite'); }
    else if (!navires(1).length) { N.fini = 'victoire'; N.finT = 2.5; message(_t('Victoire sur la mer !'), 'or'); M.son('victoire'); }
  }
  function majHud() {
    var j = N.joueur;
    el('hudNavPv').style.width = Math.max(0, j.pv / j.pvMax * 100) + '%';
    el('hudNavTxt').textContent = j.D.nom + ' — ' + Math.max(0, Math.ceil(j.pv)) + ' / ' + j.pvMax;
    el('hudNavEquipage').textContent = '👥 ' + j.equipage + _t(' marins   ⛵ ') + Math.round(Math.abs(j.v) * 1.94) + _t(' nœuds');
    el('hudNavTir').style.setProperty('--k', String(Math.max(0, j.tirT / 2.2)));
    el('hudNavFeu').classList.toggle('hide', !N.feu);
    el('hudNavFeu').style.setProperty('--k', String(Math.max(0, j.feuT / 8)));
    el('hudNavGaz').style.height = Math.max(0, j.gaz) * 100 + '%';
    el('hudForces').textContent = '⚓ ' + navires(0).length + '   ☠️ ' + navires(1).length;
    el('hudOr').textContent = '💰 ' + N.or;
  }
  function terminer() {
    var res = { victoire: N.fini === 'victoire', or: N.or, morts: N.mortsAbordage, pertesEquipage: N.pertes, coules: N.coules, captures: N.captures };
    var cb = N.cb;
    N.navires.forEach(function (n) { if (n.el) n.el.remove(); });
    M.viderEffets();
    document.body.classList.remove('modeNaval');
    N = null;
    M.arreter();
    cb(res);
  }
  function modeNaval() { return { type: 'naval', maj: maj, surPerteVerrou: function () { if (N && !N.fini && N.cfg.pause) N.cfg.pause(); } }; }

  /* cfg : { navire: 'dromon'|'nef', ennemis: [[type, n]], allies: [[type, n]], equipage, equipageAllie: [[type, n]],
             compagnons, joueur, faction, diff, directionnel, lac, pause() } */
  M.naval = function (cfg, cb) {
    var dpv = { facile: 0.7, normal: 1, difficile: 1.25 }[cfg.diff] || 1;
    var dtir = { facile: 4.5, normal: 3.2, difficile: 2.4 }[cfg.diff] || 3.2;
    N = { cfg: cfg, cb: cb, navires: [], traits: [], temps: 0, or: 0, coules: 0, captures: 0, pertes: 0, mortsAbordage: {}, camOff: 0, diffPv: dpv, diffTir: dtir,
      feu: cfg.faction === 'romains' };
    N.scene = creerMer(cfg.lac);
    document.body.classList.add('modeNaval');
    N.joueur = new Navire(cfg.navire || 'nef', 0, 0, -30, 0, { joueur: true, equipage: Math.max(3, cfg.equipage || 8) });
    N.navires.push(N.joueur);
    (cfg.allies || []).forEach(function (g, gi) { for (var i = 0; i < g[1]; i++) N.navires.push(new Navire(g[0], 0, (i + 1) * 12 * (i % 2 ? 1 : -1), -36 - gi * 8, 0)); });
    var k = 0;
    (cfg.ennemis || []).forEach(function (g) { for (var i = 0; i < g[1]; i++) { N.navires.push(new Navire(g[0], 1, (k - 1.5) * 16, 40 + (k % 2) * 10, Math.PI)); k++; } });
    M.cam.position.set(0, 10, -50);
    message(cfg.titre || _t('Bataille navale !'));
    M.lancer(modeNaval());
  };
  M.enNaval = function () { return !!N; };
  M._naval = function () { return N; };
  M._coulerTous = function () { if (N) navires(1).forEach(couler); };
  M.abandonnerNaval = function () { if (N) { N.fini = 'defaite'; terminer(); } };
})();
