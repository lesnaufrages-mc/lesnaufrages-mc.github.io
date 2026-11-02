/* Ferrum et Fides : les batailles en 3D (style Mount & Blade).
   Attaques et parades en 4 directions (gauche, droite, haut, estoc) choisies avec la souris,
   troupes alliées avec ordres (suivre, tenir, charger), boss avec attaques spéciales, pouvoirs des armes légendaires. */
(function () {
  'use strict';
  var T = window.THREE, M = Moteur;

  // ---------- Poses des coups ----------
  // x : lever le bras, z : écarter le bras, r : roulis du poignet, p : tangage du poignet, t : torsion du buste, av : allonge
  var REPOS = { x: -0.35, z: -0.05, r: 0, p: -0.5, t: 0, av: 0 };
  var GARDE = { x: -1.3, z: 0.35, r: -1.5, p: 0.1, t: -0.25, av: 0 };
  var POSES = {
    haut: [{ x: -2.75, z: -0.1, r: 0, p: -0.3, t: -0.25, av: 0 }, { x: -0.55, z: 0, r: 0, p: 0.6, t: 0.15, av: 0.2 }],
    droite: [{ x: -1.55, z: -0.6, r: 1.5, p: -0.2, t: -1.15, av: 0 }, { x: -1.45, z: 0.25, r: 1.5, p: -0.2, t: 1.0, av: 0.1 }],
    gauche: [{ x: -1.6, z: 0.5, r: -1.5, p: -0.2, t: 1.15, av: 0 }, { x: -1.45, z: -0.35, r: -1.5, p: -0.2, t: -1.0, av: 0.1 }],
    estoc: [{ x: -1.25, z: 0, r: 0, p: 1.45, t: -0.4, av: -0.35 }, { x: -1.6, z: 0, r: 0, p: 1.57, t: 0.15, av: 0.5 }]
  };
  var DIRS = ['droite', 'gauche', 'haut', 'estoc'];
  var FLECHE = { gauche: '◀', droite: '▶', haut: '▲', estoc: '●' };
  function lisse(a) { return a * a * (3 - 2 * a); }
  function melange(a, b, k, out) {
    for (var c in a) out[c] = a[c] + (b[c] - a[c]) * k;
    return out;
  }
  function angleVers(a, b) { return Math.atan2(b.x - a.x, b.z - a.z); }
  function difAngle(a, b) { var d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

  var B = null; // la bataille en cours

  // ---------- Combattants ----------
  function Combattant(def, equipe, opts) {
    opts = opts || {};
    this.def = def;
    this.uid = opts.uid || def.id;
    this.equipe = equipe;
    this.joueur = !!opts.joueur;
    this.compagnon = !!opts.compagnon;
    var diff = B.diff;
    var mulPv = equipe === 1 ? diff.pv : 1;
    this.pvMax = Math.round((opts.pv || def.pv) * mulPv * (equipe === 0 && B.cfg.faction === 'latins' && !this.joueur ? 1 : 1));
    this.pv = this.pvMax;
    if (equipe === 0 && !this.joueur && B.cfg.faction === 'latins') this.pv = this.pvMax = this.pvMax + 15; // Ferveur
    this.taille = def.taille || 1;
    this.rayon = 0.42 * this.taille;
    this.vit = def.vit || 3.5;
    this.armeId = opts.arme || def.arme || 'epee';
    this.A = FF.ARMES[this.armeId] || FF.ARMES.epee;
    var look = Object.assign({ peau: FF.PEAU[Math.floor(Math.random() * FF.PEAU.length)] }, def.look || {});
    this.P = M.creerPerso(look, this.taille, { spectre: def.spectre });
    M.equiper(this.P, this.armeId);
    this.g = this.P.g;
    B.scene.add(this.g);
    this.pos = this.g.position;
    this.ang = 0;
    this.vel = new T.Vector3();
    this.etat = 'libre'; this.t = 0;
    this.att = null;
    this.bloc = false; this.blocT = 0; this.blocDir = 'haut';
    this.end = 100;
    this.endPause = 0;
    this.recharge = Math.random() * 1.2;
    this.tirT = 1 + Math.random() * 2;
    this.marche = Math.random() * 6;
    this.cible = null; this.cibleT = 0;
    this.peur = 0; this.vulnerable = 0; this.etourdi = 0; this.fureur = 0; this.brule = 0;
    this.spe = {};
    this.mortT = 0;
    this.decale = (Math.random() - 0.5) * 2;
    this.flash = 0;
    if (def.boss) this.poise = 0;
    // Petite barre de vie au-dessus des ennemis
    if (!this.joueur) {
      var el = document.createElement('div');
      el.className = 'barreTete ' + (equipe === 0 ? 'allie' : 'ennemi') + (def.boss ? ' boss' : '');
      el.innerHTML = '<i></i>' + (this.compagnon ? '<span>' + def.nom + '</span>' : '') + '<b></b>';
      document.getElementById('calqueTextes').appendChild(el);
      this.el = el; this.elPv = el.querySelector('i'); this.elDir = el.querySelector('b');
    }
  }
  Combattant.prototype.vivant = function () { return this.etat !== 'mort'; };
  Combattant.prototype.devant = function () { return new T.Vector3(Math.sin(this.ang), 0, Math.cos(this.ang)); };
  Combattant.prototype.enRoulade = function () { return this.etat === 'esquive' && this.t > 0.05 && this.t < 0.38; };

  Combattant.prototype.attaquer = function (dir, fort) {
    if (this.etat !== 'libre' || this.etourdi > 0) return false;
    var cout = this.A.end * (fort ? 1.5 : 1);
    if (this.joueur && this.end < 5) { M.texte(this.teteP(), 'Épuisé', 'gris'); return false; }
    var dur = this.A.dur * (this.joueur ? 1 : 1.25) * (this.def.boss ? 1.1 : 1);
    this.etat = 'attaque'; this.t = 0;
    this.att = { dir: dir, dur: dur, wf: this.joueur ? 0.34 : 0.5, touches: [], fort: !!fort };
    this.bloc = false;
    if (this.joueur) { this.end -= cout; this.endPause = 0.7; }
    return true;
  };
  Combattant.prototype.teteP = function () { return new T.Vector3(this.pos.x, this.pos.y + 2.3 * this.taille, this.pos.z); };

  // ---------- Coup porté ----------
  function frapper(a, c, deg, dir, o) {
    o = o || {};
    if (!c.vivant() || c.enRoulade()) return false;
    if (B.cfg.amical && c.equipe === 1 && c.def.boss && c.pv - deg <= 0) { /* duel amical : le boss se rend */ }
    var face = Math.abs(difAngle(c.ang, angleVers(c.pos, a.pos))) < 1.45;
    // Parade
    if (c.bloc && face && !o.imparable) {
      var bonneDir = !B.directionnel || !c.joueur || c.blocDir === dir || o.sansDir;
      if (c.joueur && !bonneDir) {
        M.texte(c.teteP(), 'Mauvaise parade !', 'rouge');
      } else if (c.joueur) {
        if (c.blocT < 0.22 && !o.projectile) {
          // Parade parfaite : l'ennemi est déséquilibré
          M.son('parade'); M.eclats(arme(c), 0xf7dc6f, 14, 6);
          M.texte(c.teteP(), 'PARADE !', 'or');
          if (a.etat !== 'mort') { a.etat = 'touche'; a.t = 0; a.etourdi = 1.0; }
          B.stats.parades++;
          return false;
        }
        var cout = deg * (o.brise ? 2.4 : 1.2) * (c.fureur > 0 ? 0 : 1);
        c.end -= cout; c.endPause = 0.6;
        M.son('metal'); M.eclats(arme(c), 0xfdebd0, 6, 4);
        if (c.end <= 0) { c.end = 0; c.bloc = false; c.etat = 'touche'; c.t = 0; c.etourdi = 0.8; M.texte(c.teteP(), 'Garde brisée !', 'rouge'); }
        else {
          if (a.etat === 'attaque' && !o.projectile) { a.etourdi = Math.max(a.etourdi, 0.25); }
          return false;
        }
      } else if (!o.brise || Math.random() < 0.4) {
        M.son('metal'); M.eclats(arme(c), 0xfdebd0, 5, 3);
        if (a.joueur) M.texte(c.teteP(), 'Paré', 'gris');
        return false;
      }
    }
    // Esquive (assassins, Roi Singe)
    if (!c.joueur && c.def.esquive && c.etat === 'libre' && Math.random() < c.def.esquive && !o.projectile && !o.imparable) {
      roulade(c, a.devant().clone().applyAxisAngle(new T.Vector3(0, 1, 0), Math.random() < 0.5 ? 1.2 : -1.2));
      return false;
    }
    if (c.vulnerable > 0) deg *= 1.5;
    if (c.joueur) deg *= B.diff.deg;
    deg = Math.max(1, Math.round(deg * (0.9 + Math.random() * 0.2)));
    c.pv -= deg;
    c.flash = 0.12;
    var dirRecul = new T.Vector3(c.pos.x - a.pos.x, 0, c.pos.z - a.pos.z).normalize();
    var recul = (o.recul || 1) * (c.def.boss ? 1.2 : 4) / c.taille;
    c.vel.addScaledVector(dirRecul, recul);
    M.son('coup');
    M.eclats(new T.Vector3(c.pos.x, c.pos.y + 1.3 * c.taille, c.pos.z), c.def.pierre ? 0x95a5a6 : c.def.spectre ? 0x85c1e9 : 0xb03a2e, c.def.pierre ? 8 : 5, 3);
    M.texte(c.teteP(), String(deg), c.joueur ? 'rouge' : (a.joueur ? 'blanc' : 'petit'));
    if (a.joueur || c.joueur) { B.arret = 0.05; M.secouer(c.joueur ? 0.25 : 0.12); }
    // Réaction : les boss ne bronchent pas à chaque coup
    if (c.def.boss) {
      c.poise += deg;
      if (c.poise > c.pvMax * 0.12) { c.poise = 0; c.etat = 'touche'; c.t = 0; c.att = null; c.etourdi = 0.6; }
    } else if (c.etat !== 'esquive') {
      c.etat = 'touche'; c.t = 0; c.att = null; c.bloc = false; c.etourdi = c.joueur ? 0.25 : 0.4;
    }
    if (o.etourdir) c.etourdi = Math.max(c.etourdi, o.etourdir);
    if (c.pv <= 0) mourir(c, a);
    return true;
  }
  function arme(c) { var p = new T.Vector3(); c.P.main.getWorldPosition(p); return p; }

  function mourir(c, a) {
    c.pv = 0; c.etat = 'mort'; c.t = 0; c.att = null; c.bloc = false;
    if (c.el) { c.el.remove(); c.el = null; }
    if (c.equipe === 1) {
      B.stats.tues++;
      var gain = c.def.or || 8;
      if (!B.cfg.amical) laisserOr(c.pos, gain);
      if (c.def.boss) { B.bossMort = true; M.son('cor'); }
    } else if (!c.joueur) {
      if (!c.compagnon) B.morts[c.uid] = (B.morts[c.uid] || 0) + 1;
    }
    if (c.joueur) { M.son('defaite'); }
  }

  // Pièces d'or au sol (ramassées automatiquement)
  function laisserOr(pos, n) {
    var m = M.boite(0.3, 0.08, 0.3, 0xf1c40f, B.scene, pos.x, 0.4, pos.z, { lueur: 0x7d6608 });
    B.pieces.push({ m: m, n: n, t: 0 });
    if (Math.random() < 0.12) {
      var s = M.boite(0.35, 0.35, 0.35, 0xe74c3c, B.scene, pos.x + 0.5, 0.4, pos.z, { lueur: 0x641e16 });
      B.pieces.push({ m: s, soin: 20, t: 0 });
    }
  }

  function roulade(c, dir) {
    if (c.etat === 'mort') return;
    c.etat = 'esquive'; c.t = 0; c.att = null; c.bloc = false;
    c.rouleDir = dir.clone().setY(0).normalize();
    if (c.joueur) { c.end -= 18; c.endPause = 0.6; }
  }

  // ---------- Projectiles et zones ----------
  function tirer(a, cible, deg, o) {
    o = o || {};
    var dep = new T.Vector3(a.pos.x, a.pos.y + 1.5 * a.taille, a.pos.z);
    var but = new T.Vector3(cible.pos.x + cible.vel.x * 0.3, cible.pos.y + 1.2, cible.pos.z + cible.vel.z * 0.3);
    var dir = but.sub(dep).normalize();
    dir.x += (Math.random() - 0.5) * 0.08; dir.y += (Math.random() - 0.5) * 0.04; dir.z += (Math.random() - 0.5) * 0.08;
    var m = new T.Group();
    M.boite(0.05, 0.05, 0.8, 0x6e4b2a, m, 0, 0, 0, { ombre: false });
    M.boite(0.09, 0.09, 0.12, 0xbdc3c7, m, 0, 0, 0.42, { ombre: false });
    m.position.copy(dep);
    m.lookAt(dep.clone().add(dir));
    B.scene.add(m);
    B.projectiles.push({ m: m, pos: m.position, v: dir.multiplyScalar(o.vitesse || 26), deg: deg, equipe: a.equipe, auteur: a, vie: 2.2, rayon: 0.5 });
    M.son('tir');
  }
  // Vague (Excalibur, onde de Durandal...) : traverse les ennemis
  function vague(a, couleur, deg, largeur, vitesse, portee) {
    var d = a.devant();
    var m = new T.Mesh(new T.BoxGeometry(largeur, 1.6, 0.4), M.mat(couleur, { basic: true, op: 0.7 }));
    m.position.set(a.pos.x + d.x, 1, a.pos.z + d.z);
    m.rotation.y = a.ang;
    B.scene.add(m);
    B.projectiles.push({ m: m, pos: m.position, v: d.multiplyScalar(vitesse), deg: deg, equipe: a.equipe, auteur: a, vie: portee / vitesse, rayon: largeur / 2, perce: true, touches: [], vague: true, couleur: couleur });
  }
  // Zone annoncée au sol puis frappée
  function zone(a, x, z, r, delai, deg, effet, o) {
    var an = M.anneau(x, z, r, a.equipe === 1 ? 0xe74c3c : 0x5dade2, delai, true);
    B.zones.push({ x: x, z: z, r: r, t: 0, delai: delai, deg: deg, equipe: a.equipe, auteur: a, effet: effet, o: o || {} });
    return an;
  }
  function hostiles(c) { return B.combattants.filter(function (o) { return o.equipe !== c.equipe && o.vivant(); }); }
  function amis(c) { return B.combattants.filter(function (o) { return o.equipe === c.equipe && o.vivant(); }); }
  function dist(a, b) { return Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z); }

  // ---------- Pouvoirs des armes légendaires (joueur) ----------
  var POUVOIRS = {
    vague: function (j) { vague(j, 0x9fd8ff, 60, 3.4, 18, 22); M.son('magie'); },
    inbrisable: function (j) {
      j.fureur = 6; M.son('cor');
      M.anneau(j.pos.x, j.pos.z, 4.5, 0xffcc33, 0.5);
      hostiles(j).forEach(function (e) { if (dist(j, e) < 4.5) frapper(j, e, 30, 'haut', { imparable: true, recul: 2.5 }); });
    },
    foudre: function (j) {
      var es = hostiles(j).filter(function (e) { return dist(j, e) < 14; }).sort(function (a, b) { return dist(j, a) - dist(j, b); }).slice(0, 5);
      es.forEach(function (e, i) { setTimeout(function () { if (!B || !e.vivant()) return; M.eclair(e.pos.x, e.pos.z); frapper(j, e, 50, 'haut', { imparable: true, etourdir: 1.5, recul: 0.5 }); }, i * 90); });
      M.son('tonnerre'); M.secouer(0.4);
      if (!es.length) M.eclair(j.pos.x + j.devant().x * 4, j.pos.z + j.devant().z * 4);
    },
    vent: function (j) {
      M.son('feu');
      var d = j.devant();
      for (var i = 0; i < 24; i++) { var p = j.pos.clone().addScaledVector(d, 1 + Math.random() * 7); p.x += (Math.random() - 0.5) * 4; p.z += (Math.random() - 0.5) * 4; p.y = 0.6 + Math.random(); M.eclats(p, 0xa9dfbf, 1, 3, 0); }
      hostiles(j).forEach(function (e) {
        var a = Math.abs(difAngle(j.ang, angleVers(j.pos, e.pos)));
        if (dist(j, e) < 9 && a < 0.7) { frapper(j, e, 35, 'estoc', { imparable: true, recul: 4 }); }
      });
    },
    lancer: function (j) {
      var es = hostiles(j).sort(function (a, b) { return dist(j, a) - dist(j, b); });
      var cible = es[0];
      var m = M.creerArme('gungnir'); m.scale.setScalar(1.2);
      m.position.set(j.pos.x, 1.6, j.pos.z);
      B.scene.add(m);
      B.projectiles.push({ m: m, pos: m.position, v: j.devant().multiplyScalar(20), deg: 90, equipe: 0, auteur: j, vie: 3, rayon: 0.8, cherche: cible, lance: true, perce: false });
      M.son('magie');
    },
    soin: function (j) {
      j.pv = Math.min(j.pvMax, j.pv + 35); M.son('magie');
      M.texte(j.teteP(), '+35', 'vert');
      M.anneau(j.pos.x, j.pos.z, 6, 0xfff3b0, 0.6);
      hostiles(j).forEach(function (e) { if (dist(j, e) < 6) { e.etourdi = 2; e.etat = 'touche'; e.t = 0; e.att = null; } });
    },
    effroi: function (j) {
      M.son('cor'); M.anneau(j.pos.x, j.pos.z, 10, 0xff6b5b, 0.7);
      hostiles(j).forEach(function (e) { if (dist(j, e) < 10 && !e.def.boss) { e.peur = 4; e.vulnerable = 5; } else if (dist(j, e) < 10) e.vulnerable = 5; });
    },
    pointes: function (j) {
      var d = j.devant();
      for (var i = 1; i <= 6; i++) zone(j, j.pos.x + d.x * i * 1.7, j.pos.z + d.z * i * 1.7, 1.3, 0.15 + i * 0.06, 45, 'pointes', { saigne: true });
    },
    tourbillon: function (j) {
      j.tourne = 1.0; M.son('swing');
      M.anneau(j.pos.x, j.pos.z, 5, 0xf4d03f, 1);
      var n = 0, id = setInterval(function () {
        if (!B || n++ >= 4) { clearInterval(id); return; }
        hostiles(j).forEach(function (e) { if (dist(j, e) < 5) frapper(j, e, 18, 'droite', { imparable: true, recul: 2 }); });
      }, 220);
    }
  };

  // ---------- Attaques spéciales des boss ----------
  var SPECIAUX = {
    saut: { cd: 7, portee: 12, f: function (b, c) {
      b.etat = 'special'; b.t = 0; b.speDur = 1.1;
      b.saut = { de: b.pos.clone(), vers: new T.Vector3(c.pos.x, 0, c.pos.z) };
      zone(b, c.pos.x, c.pos.z, 3.2, 1.1, b.def.deg * 1.6, 'impact');
    } },
    charge: { cd: 6, portee: 14, f: function (b, c) {
      b.etat = 'special'; b.t = 0; b.speDur = 1.2; b.ang = angleVers(b.pos, c.pos);
      b.charge = { touche: false };
      M.texte(b.teteP(), '!!', 'rouge');
    } },
    tourbillon: { cd: 8, portee: 4, f: function (b) {
      b.etat = 'special'; b.t = 0; b.speDur = 1.4; b.tourneBoss = true;
      zone(b, b.pos.x, b.pos.z, 3.8, 0.85, b.def.deg * 1.3, 'impact', { suit: b });
    } },
    foudre: { cd: 9, portee: 20, f: function (b, c) {
      b.etat = 'special'; b.t = 0; b.speDur = 0.9;
      for (var i = 0; i < 3; i++) {
        var x = c.pos.x + (i ? (Math.random() - 0.5) * 7 : 0), z = c.pos.z + (i ? (Math.random() - 0.5) * 7 : 0);
        zone(b, x, z, 2.2, 1.1 + i * 0.2, b.def.deg * 1.4, 'foudre');
      }
    } },
    onde: { cd: 6, portee: 16, f: function (b, c) {
      b.ang = angleVers(b.pos, c.pos);
      b.etat = 'special'; b.t = 0; b.speDur = 0.9; b.ondeA = true;
      M.texte(b.teteP(), '!', 'rouge');
    } },
    invocation: { cd: 14, portee: 30, f: function (b) {
      var n = B.combattants.filter(function (o) { return o.equipe === 1 && o.vivant() && !o.def.boss; }).length;
      if (n >= 4) return false;
      b.etat = 'special'; b.t = 0; b.speDur = 0.8;
      M.son('cor');
      for (var i = 0; i < 2; i++) {
        var a = Math.random() * 6.28;
        apparaitre(b.def.invoque || 'noir', 1, b.pos.x + Math.cos(a) * 3, b.pos.z + Math.sin(a) * 3);
      }
    } },
    rochers: { cd: 7, portee: 25, f: function (b, c) {
      b.etat = 'special'; b.t = 0; b.speDur = 0.9;
      for (var i = 0; i < 3; i++) zone(b, c.pos.x + (Math.random() - 0.5) * 6, c.pos.z + (Math.random() - 0.5) * 6, 2, 1.3 + i * 0.25, b.def.deg * 1.2, 'rocher');
    } },
    vent: { cd: 7, portee: 8, f: function (b, c) {
      b.ang = angleVers(b.pos, c.pos);
      b.etat = 'special'; b.t = 0; b.speDur = 0.7;
      zone(b, b.pos.x + Math.sin(b.ang) * 4, b.pos.z + Math.cos(b.ang) * 4, 3.5, 0.7, b.def.deg * 1.2, 'vent');
    } },
    pointes: { cd: 7, portee: 14, f: function (b, c) {
      b.ang = angleVers(b.pos, c.pos);
      b.etat = 'special'; b.t = 0; b.speDur = 0.9;
      for (var i = 1; i <= 7; i++) zone(b, b.pos.x + Math.sin(b.ang) * i * 1.8, b.pos.z + Math.cos(b.ang) * i * 1.8, 1.3, 0.5 + i * 0.08, b.def.deg * 1.2, 'pointes');
    } }
  };

  // ---------- Apparition ----------
  function apparaitre(type, equipe, x, z, opts) {
    var def = typeof type === 'string' ? Object.assign({ id: type }, FF.UNITES[type]) : type;
    if (!def || !def.pv) return null;
    var c = new Combattant(def, equipe, opts);
    c.pos.set(x, 0, z);
    c.ang = equipe === 1 ? angleVers(c.pos, B.joueur ? B.joueur.pos : new T.Vector3()) : Math.PI;
    B.combattants.push(c);
    return c;
  }
  function vagueSuivante() {
    B.vague++;
    var v = B.cfg.vagues[B.vague - 1];
    var lst = [];
    if (v) v.forEach(function (g) { for (var i = 0; i < g[1]; i++) lst.push(g[0]); });
    // Bord de l'arène, du côté opposé au joueur
    var base = B.joueur ? Math.atan2(-B.joueur.pos.z, -B.joueur.pos.x) : 0;
    var R = B.forme.type === 'rect' ? 0 : B.forme.r - 2;
    lst.forEach(function (t, i) {
      var x, z;
      if (B.forme.type === 'rect') { x = (Math.random() - 0.5) * B.forme.w * 0.8; z = -(B.forme.h / 2 - 1.5 - Math.random() * 3); }
      else { var a = base + (i - lst.length / 2) * 0.22 + (Math.random() - 0.5) * 0.2; x = Math.cos(a) * R; z = Math.sin(a) * R; }
      apparaitre(t, 1, x, z);
    });
    afficherVague();
  }
  function lancerBoss() {
    B.bossLance = true;
    var x = 0, z = -(B.forme.type === 'rect' ? B.forme.h / 2 - 3 : B.forme.r - 4);
    if (B.joueur && B.forme.type !== 'rect') { var a = Math.atan2(-B.joueur.pos.z, -B.joueur.pos.x); x = Math.cos(a) * (B.forme.r - 4); z = Math.sin(a) * (B.forme.r - 4); }
    var b = apparaitre(B.cfg.boss, 1, x, z);
    if (!b) return;
    B.boss = b;
    if (b.el) b.el.style.display = 'none';
    el('hudBoss').classList.remove('hide');
    el('hudBossNom').textContent = b.def.nom;
    message(b.def.nom, 'boss');
    M.son('cor');
  }

  // ---------- Interface ----------
  function el(id) { return document.getElementById(id) || { style: {}, classList: { add: function () {}, remove: function () {}, toggle: function () {} } }; }
  function message(txt, classe) {
    var m = el('hudMsg');
    m.textContent = txt; m.className = 'hudMsg montre ' + (classe || '');
    clearTimeout(message.t);
    message.t = setTimeout(function () { m.className = 'hudMsg'; }, 2400);
  }
  function afficherVague() {
    var n = B.cfg.vagues.length;
    if (n > 1) message('Vague ' + B.vague + ' / ' + n);
    else if (n === 1 && !B.cfg.boss) message(B.cfg.titre || 'Combat !');
  }
  function majHud() {
    var j = B.joueur;
    el('hudPv').style.width = Math.max(0, j.pv / j.pvMax * 100) + '%';
    el('hudPvTxt').textContent = Math.max(0, Math.ceil(j.pv)) + ' / ' + j.pvMax;
    el('hudEnd').style.width = Math.max(0, j.end) + '%';
    var A = j.A, p = el('hudPouvoir');
    if (A.pouvoir) {
      p.classList.remove('hide');
      var k = B.pouvoirT > 0 ? B.pouvoirT / A.pouvoir.recharge : 0;
      p.style.setProperty('--k', String(k));
      p.classList.toggle('pret', k <= 0);
      el('hudPouvoirNom').textContent = A.pouvoir.nom;
    } else p.classList.add('hide');
    el('hudArme').textContent = A.nom + (B.armes.length > 1 ? '  ⇄' : '');
    if (B.boss) el('hudBossPv').style.width = Math.max(0, B.boss.pv / B.boss.pvMax * 100) + '%';
    var dir = B.directionnel ? (j.bloc ? j.blocDir : (M.directionSouris() || B.prochDir)) : null;
    var hd = el('hudDir');
    hd.className = 'hudDir' + (dir ? ' d-' + dir : '') + (j.bloc ? ' bloc' : '') + (B.directionnel ? '' : ' hide');
    var nA = B.combattants.filter(function (c) { return c.equipe === 0 && !c.joueur && c.vivant(); }).length;
    var nE = B.combattants.filter(function (c) { return c.equipe === 1 && c.vivant(); }).length;
    el('hudForces').textContent = '🛡️ ' + (nA + 1) + '   ⚔️ ' + nE;
    el('hudOr').textContent = '💰 ' + B.or;
  }

  // ---------- IA ----------
  function choisirCible(c) {
    c.cibleT -= B.dtIA;
    if (c.cible && c.cible.vivant() && c.cibleT > 0) return c.cible;
    var hs = hostiles(c), best = null, bd = 1e9;
    for (var i = 0; i < hs.length; i++) {
      var d = dist(c, hs[i]) - (hs[i].joueur && c.equipe === 1 ? 3 : 0) + (hs[i].nbAssaillants || 0) * 1.5;
      if (d < bd) { bd = d; best = hs[i]; }
    }
    c.cible = best; c.cibleT = 1.2 + Math.random();
    return best;
  }
  function ia(c, dt) {
    var mv = new T.Vector3();
    if (c.etourdi > 0 || c.etat === 'touche' || c.etat === 'esquive' || c.etat === 'special') return mv;
    var cible = choisirCible(c);
    // Ordres des troupes alliées
    if (c.equipe === 0 && B.ordre !== 'charge') {
      var ancre = B.ordre === 'tenir' ? B.ancre : B.joueur.pos;
      var rayonOrdre = B.ordre === 'tenir' ? 6 : 9;
      if (!cible || Math.hypot(cible.pos.x - ancre.x, cible.pos.z - ancre.z) > rayonOrdre) {
        // rester en formation
        // Formation en ligne de part et d'autre du joueur (pour ne pas cacher la caméra)
        var i0 = B.combattants.indexOf(c), idx = i0 % 8, rang = Math.floor(i0 / 8);
        var base = B.ordre === 'tenir' ? B.ancreAng : B.joueur.ang;
        var lat = (idx % 2 ? 1 : -1) * (1.5 + Math.floor(idx / 2) * 1.3), prof = 0.6 + rang * 1.5;
        var cx = ancre.x - Math.sin(base) * prof + Math.cos(base) * lat;
        var cz = ancre.z - Math.cos(base) * prof - Math.sin(base) * lat;
        mv.set(cx - c.pos.x, 0, cz - c.pos.z);
        if (mv.length() < 0.6) { mv.set(0, 0, 0); c.ang += difAngle(c.ang, base) * Math.min(1, dt * 4); }
        else { mv.normalize(); c.ang += difAngle(c.ang, Math.atan2(mv.x, mv.z)) * Math.min(1, dt * 8); }
        c.bloc = false;
        return mv;
      }
    }
    if (!cible) { c.bloc = false; return mv; }
    var d = dist(c, cible);
    var versCible = angleVers(c.pos, cible.pos);
    // Peur (Tizona) : fuir
    if (c.peur > 0) {
      mv.set(c.pos.x - cible.pos.x, 0, c.pos.z - cible.pos.z).normalize();
      c.ang = Math.atan2(mv.x, mv.z);
      return mv;
    }
    c.ang += difAngle(c.ang, versCible) * Math.min(1, dt * (c.etat === 'attaque' ? 2.5 : 7));
    // Parade réflexe quand la cible attaque
    if (c.etat === 'libre') {
      var menace = cible.etat === 'attaque' && cible.cibleCoup === c && cible.att && cible.t < cible.att.dur * cible.att.wf;
      if (menace && c.decideBloc !== cible.att) {
        c.decideBloc = cible.att;
        c.bloc = Math.random() < (c.def.garde || 0) * (cible.joueur ? B.diff.garde : 1);
        if (c.bloc) c.blocDir = cible.att.dir;
      }
      if (!menace && c.bloc && Math.random() < dt * 2) c.bloc = false;
    }
    // Archers
    if (c.def.tir) {
      if (d < 5) { mv.set(c.pos.x - cible.pos.x, 0, c.pos.z - cible.pos.z).normalize(); }
      else if (d > c.def.tir.portee * 0.85) { mv.set(cible.pos.x - c.pos.x, 0, cible.pos.z - c.pos.z).normalize(); }
      else if (c.etat === 'libre') {
        c.tirT -= dt;
        if (c.tirT <= 0) { c.etat = 'tir'; c.t = 0; c.tirCible = cible; c.tirT = c.def.tir.cad * (0.8 + Math.random() * 0.5); }
      }
      if (d < 2.4 && c.etat === 'libre' && c.recharge <= 0) { c.cibleCoup = cible; if (c.attaquer(DIRS[Math.floor(Math.random() * 4)])) c.recharge = 1.5; }
      return mv;
    }
    // Spéciaux des boss
    if (c.def.boss && c.etat === 'libre' && c.def.special) {
      var phase2 = c.pv < c.pvMax * 0.5;
      for (var i = 0; i < c.def.special.length; i++) {
        var s = c.def.special[i], S = SPECIAUX[s];
        if (!S) continue;
        if ((c.spe[s] || 0) <= 0 && d < S.portee && Math.random() < dt * 1.5) {
          if (S.f(c, cible) !== false) c.spe[s] = S.cd * (phase2 ? 0.6 : 1) * (0.8 + Math.random() * 0.4);
          else c.spe[s] = 3;
          return mv;
        }
      }
    }
    var portee = c.A.portee * c.taille * 0.85 + cible.rayon;
    if (d > portee + 0.2) {
      mv.set(cible.pos.x - c.pos.x, 0, cible.pos.z - c.pos.z).normalize();
      // s'écarter des amis devant
      return mv;
    }
    if (c.etat === 'libre' && c.recharge <= 0) {
      var jetons = cible.joueur ? B.combattants.filter(function (o) { return o.equipe === 1 && o.etat === 'attaque' && o.cibleCoup === cible; }).length : 0;
      if (!cible.joueur || jetons < B.diff.jetons || c.def.boss) {
        c.cibleCoup = cible;
        var dir = DIRS[Math.floor(Math.random() * 4)];
        if (c.attaquer(dir)) { c.recharge = (c.def.boss ? 0.6 : 1.1) + Math.random() * (cible.joueur ? B.diff.repit : 1); }
        return mv;
      }
    }
    // tourner autour de la cible en attendant
    if (d < portee * 0.7) mv.set(c.pos.x - cible.pos.x, 0, c.pos.z - cible.pos.z).normalize().multiplyScalar(0.6);
    else {
      var lat = new T.Vector3(Math.cos(versCible), 0, -Math.sin(versCible)).multiplyScalar(c.decale > 0 ? 0.45 : -0.45);
      mv.copy(lat);
    }
    return mv;
  }

  // ---------- Joueur ----------
  function commandeJoueur(j, dt) {
    var mv = new T.Vector3();
    var dep = M.deplacement();
    var yaw = B.yaw;
    if (dep.l > 0.05) {
      mv.set(Math.sin(yaw) * dep.z - Math.cos(yaw) * dep.x, 0, Math.cos(yaw) * dep.z + Math.sin(yaw) * dep.x);
      // NB : la droite de la caméra est (-cos yaw, 0, sin yaw) car le personnage regarde vers +Z
      mv.set(Math.sin(yaw) * dep.z - Math.cos(yaw) * dep.x, 0, Math.cos(yaw) * dep.z + Math.sin(yaw) * dep.x);
    }
    var courir = (M.E.touches.ShiftLeft || M.E.touches.ShiftRight || M.tenu('courir')) && j.end > 5 && dep.l > 0.1 && !j.bloc;
    j.court = courir;
    if (courir) { j.end -= dt * 14; j.endPause = 0.4; }
    // Parade (clic droit / bouton bouclier)
    var veutBloquer = M.E.souris.droit || M.tenu('bloc') || M.E.touches.KeyV;
    if (veutBloquer && (j.etat === 'libre') && j.etourdi <= 0) {
      if (!j.bloc) { j.bloc = true; j.blocT = 0; }
      var d = M.directionSouris();
      if (d) j.blocDir = d;
      if (M.mobile || !B.directionnel) {
        // Sur téléphone : la parade se tourne seule vers l'attaque la plus proche
        var menace = hostiles(j).filter(function (e) { return e.etat === 'attaque' && e.cibleCoup === j; }).sort(function (a, b) { return dist(j, a) - dist(j, b); })[0];
        if (menace) j.blocDir = menace.att.dir;
      }
    } else j.bloc = false;
    // Cible verrouillée douce : face à l'ennemi le plus proche devant soi quand on attaque
    var proche = null, pd = 6;
    hostiles(j).forEach(function (e) { var dd = dist(j, e); if (dd < pd && Math.abs(difAngle(B.yaw, angleVers(j.pos, e.pos))) < 1.4) { pd = dd; proche = e; } });
    if (M.a('attaque') && !j.bloc) {
      var dir = B.directionnel ? (M.directionSouris() || B.prochDir) : B.prochDir;
      if (j.attaquer(dir)) {
        B.prochDir = DIRS[(DIRS.indexOf(B.prochDir) + 1) % 4];
        if (proche) j.ang = angleVers(j.pos, proche.pos);
        else if (mv.lengthSq() > 0.01) j.ang = Math.atan2(mv.x, mv.z);
        else j.ang = B.yaw;
        M.son('swing');
      }
    }
    if (M.a('esquive') && (j.etat === 'libre' || (j.etat === 'attaque' && j.t > j.att.dur * 0.6)) && j.end >= 10 && j.etourdi <= 0) {
      roulade(j, mv.lengthSq() > 0.01 ? mv : j.devant().negate());
    }
    if (M.a('changer') && B.armes.length > 1 && j.etat === 'libre') {
      B.armeIdx = (B.armeIdx + 1) % B.armes.length;
      j.armeId = B.armes[B.armeIdx]; j.A = FF.ARMES[j.armeId];
      M.equiper(j.P, j.armeId);
      message(j.A.nom);
    }
    if (M.a('pouvoir')) {
      if (!j.A.pouvoir) message('Seules les armes légendaires ont un pouvoir', 'petit');
      else if (B.pouvoirT > 0) message('Pouvoir en recharge…', 'petit');
      else if (j.etat === 'libre' || j.etat === 'attaque') {
        POUVOIRS[j.A.pouvoir.id](j);
        B.pouvoirT = j.A.pouvoir.recharge;
        message(j.A.pouvoir.nom, 'or');
        B.stats.pouvoirs++;
      }
    }
    if (M.a('ordre') || M.a('ordre1') || M.a('ordre2') || M.a('ordre3')) {
      var o = M.a('ordre1') ? 'suivre' : M.a('ordre2') ? 'tenir' : M.a('ordre3') ? 'charge' : { suivre: 'tenir', tenir: 'charge', charge: 'suivre' }[B.ordre];
      donnerOrdre(o);
    }
    if (j.etat === 'libre' && mv.lengthSq() > 0.01 && !j.bloc) j.ang += difAngle(j.ang, Math.atan2(mv.x, mv.z)) * Math.min(1, dt * 12);
    if (j.bloc && proche) j.ang += difAngle(j.ang, angleVers(j.pos, proche.pos)) * Math.min(1, dt * 10);
    return mv.multiplyScalar(dep.l > 0.05 ? (courir ? 1.55 : 1) * (j.bloc ? 0.45 : 1) : 0);
  }
  function donnerOrdre(o) {
    B.ordre = o;
    B.ancre = B.joueur.pos.clone(); B.ancreAng = B.joueur.ang;
    var noms = { suivre: '🚩 Suivez-moi !', tenir: '🛡️ Tenez la position !', charge: '⚔️ Chargez !' };
    message(noms[o]);
    M.son('cor');
    Array.prototype.forEach.call(document.querySelectorAll('[data-ordre]'), function (b) { b.classList.toggle('actif', b.dataset.ordre === o); });
  }

  // ---------- Mise à jour d'un combattant ----------
  var tmp = {};
  function majCombattant(c, dt) {
    c.t += dt;
    if (c.flash > 0) c.flash -= dt;
    if (c.etourdi > 0) c.etourdi -= dt;
    c.peur = Math.max(0, c.peur - dt); c.vulnerable = Math.max(0, c.vulnerable - dt); c.fureur = Math.max(0, c.fureur - dt);
    c.recharge -= dt;
    for (var s in c.spe) c.spe[s] -= dt;
    if (c.bloc) c.blocT += dt;
    if (c.endPause > 0) c.endPause -= dt; else c.end = Math.min(100, c.end + dt * (c.bloc ? 10 : 28));
    if (c.etat === 'mort') {
      c.g.rotation.x = Math.max(-Math.PI / 2, -c.t * 4);
      c.g.position.y = c.t > 2.5 ? -(c.t - 2.5) * 0.6 : 0;
      if (c.t > 4 && !c.joueur) { B.scene.remove(c.g); c.supprime = true; }
      return;
    }
    var mv = c.joueur ? commandeJoueur(c, dt) : ia(c, dt);
    var vitesse = c.vit * (c.joueur ? 1.15 : 1);
    if (c.etat === 'attaque') vitesse *= c.joueur ? 0.35 : 0.2;
    if (c.etourdi > 0 || c.etat === 'touche') vitesse = 0;
    // États
    if (c.etat === 'attaque') {
      var a = c.att, k = c.t / a.dur, wf = a.wf;
      if (k >= wf && k < wf + 0.25) {
        // fenêtre de frappe
        var cibles = hostiles(c);
        for (var i = 0; i < cibles.length; i++) {
          var e = cibles[i];
          if (a.touches.indexOf(e) >= 0) continue;
          var dd = dist(c, e), port = c.A.portee * c.taille + e.rayon;
          if (dd > port) continue;
          var ang = Math.abs(difAngle(c.ang, angleVers(c.pos, e.pos))) * 180 / Math.PI;
          var arc = a.dir === 'estoc' ? Math.min(c.A.arc, 40) : c.A.arc;
          if (ang > arc / 2 + 10) continue;
          a.touches.push(e);
          var deg = (c.joueur ? c.A.deg * (B.niveauDeg || 1) : (c.def.deg || 10) * (c.armeId && FF.ARMES[c.armeId].type === 'legendaire' ? 1.1 : 1));
          if (c.equipe === 0 && B.cfg.faction === 'latins') deg *= 1.2; // Charge des chevaliers
          if (c.fureur > 0) deg *= 1.3;
          if (a.dir === 'estoc' && c.A.forme === 'lance') deg *= 1.15;
          if (c.equipe === 1) deg *= 1; // les dégâts ennemis sont ajustés à l'arrivée selon la difficulté
          frapper(c, e, deg, a.dir, { brise: c.A.brise, recul: c.A.recul });
          if (c.A.forme !== 'hache' && c.A.forme !== 'baton' && !c.def.boss) break; // une seule cible sauf armes larges
        }
      }
      if (c.t >= a.dur) { c.etat = 'libre'; c.att = null; }
    } else if (c.etat === 'touche') {
      if (c.t > 0.35 && c.etourdi <= 0) c.etat = 'libre';
    } else if (c.etat === 'esquive') {
      vitesse = 0;
      var kk = Math.min(1, c.t / 0.45);
      c.pos.addScaledVector(c.rouleDir, dt * 9 * (1 - kk * 0.6));
      if (c.t > 0.45) c.etat = 'libre';
    } else if (c.etat === 'tir') {
      vitesse = 0;
      if (c.tirCible && c.tirCible.vivant()) c.ang = angleVers(c.pos, c.tirCible.pos);
      if (c.t > 0.75) { if (c.tirCible && c.tirCible.vivant()) tirer(c, c.tirCible, c.def.tir.deg); c.etat = 'libre'; }
    } else if (c.etat === 'special') {
      vitesse = 0;
      majSpecial(c, dt);
    }
    // Déplacement
    c.pos.x += (mv.x * vitesse + c.vel.x) * dt;
    c.pos.z += (mv.z * vitesse + c.vel.z) * dt;
    c.vel.multiplyScalar(Math.exp(-dt * 7));
    c.vitesseAnim = mv.length() * vitesse;
    animer(c, dt);
  }

  function majSpecial(b, dt) {
    var k = b.t / b.speDur;
    if (b.saut) {
      var p = Math.min(1, Math.max(0, (b.t - 0.15) / 0.95));
      b.pos.x = b.saut.de.x + (b.saut.vers.x - b.saut.de.x) * p;
      b.pos.z = b.saut.de.z + (b.saut.vers.z - b.saut.de.z) * p;
      b.pos.y = Math.sin(p * Math.PI) * 5;
      if (p >= 1) { b.pos.y = 0; b.saut = null; M.secouer(0.5); M.eclats(b.pos.clone(), 0x8d6e63, 18, 7); }
    }
    if (b.charge) {
      if (b.t > 0.45 && b.t < 1.1) {
        var d = b.devant();
        b.pos.addScaledVector(d, dt * 15);
        if (!b.charge.touche) hostiles(b).forEach(function (e) {
          if (!b.charge.touche && dist(b, e) < b.rayon + e.rayon + 0.8) { b.charge.touche = true; frapper(b, e, b.def.deg * 1.3, 'estoc', { recul: 3, sansDir: true }); }
        });
      }
    }
    if (b.tourneBoss) b.g.rotation.y += dt * 18;
    if (b.ondeA && b.t > 0.5) { b.ondeA = false; vague(b, 0xc0392b, b.def.deg * 1.2, 2.6, 13, 18); M.son('swing'); }
    if (k >= 1) { b.etat = 'libre'; b.charge = null; b.saut = null; b.tourneBoss = false; b.pos.y = 0; }
  }

  // Animation des membres
  function animer(c, dt) {
    var P = c.P;
    c.marche += dt * (c.vitesseAnim || 0) * 2.4;
    var amp = Math.min(1, (c.vitesseAnim || 0) / 3) * 0.75;
    P.jambeG.rotation.x = Math.sin(c.marche) * amp;
    P.jambeD.rotation.x = -Math.sin(c.marche) * amp;
    P.brasG.rotation.x = -Math.sin(c.marche) * amp * 0.6;
    P.corps.position.y = Math.abs(Math.sin(c.marche)) * amp * 0.12;
    P.corps.rotation.x = 0; P.corps.rotation.z = 0;
    var pose = REPOS;
    if (c.etat === 'attaque' && c.att) {
      var a = c.att, k = c.t / a.dur, wf = a.wf, po = POSES[a.dir];
      if (k < wf) pose = melange(REPOS, po[0], lisse(k / wf), tmp);
      else if (k < wf + 0.2) pose = melange(po[0], po[1], lisse((k - wf) / 0.2), tmp);
      else pose = melange(po[1], REPOS, lisse(Math.min(1, (k - wf - 0.2) / (1 - wf - 0.2))), tmp);
      // Lueur rouge pendant la préparation d'un coup ennemi (télégraphe)
    } else if (c.bloc) {
      pose = GARDE;
    } else if (c.etat === 'tir') {
      pose = { x: -1.55, z: 0.2, r: 0, p: 1.5, t: -0.6, av: 0 };
      P.brasG.rotation.x = -1.55;
    } else if (c.etat === 'esquive') {
      P.corps.rotation.x = Math.min(1, c.t / 0.45) * Math.PI * 2;
      P.corps.position.y = Math.sin(Math.min(1, c.t / 0.45) * Math.PI) * 0.4;
    } else if (c.etat === 'touche') {
      P.corps.rotation.x = -0.25;
    }
    if (c.etourdi > 0 && c.etat !== 'esquive') P.corps.rotation.z = Math.sin(c.t * 14) * 0.08;
    P.brasD.rotation.x = pose.x; P.brasD.rotation.z = pose.z;
    P.roulis.rotation.y = pose.r; P.poignet.rotation.x = pose.p;
    P.haut.rotation.y = pose.t;
    P.haut.position.z = pose.av || 0;
    if (c.bloc && P.bouclier) { P.brasG.rotation.x = -1.35; P.brasG.rotation.z = 0.35; }
    else if (P.bouclier) { P.brasG.rotation.z = 0; if (c.etat !== 'tir') P.brasG.rotation.x = -0.5 - Math.sin(c.marche) * amp * 0.3; }
    if (c.etat !== 'special' || !c.tourneBoss) c.g.rotation.y = c.ang;
    if (c.joueur && c.tourne > 0) { c.tourne -= dt; c.g.rotation.y += (1 - c.tourne) * 25; }
    if (P.cape) P.cape.rotation.x = 0.1 + Math.min(0.5, (c.vitesseAnim || 0) * 0.08);
    // Clignote en blanc quand touché, rouge quand l'ennemi prépare un coup
    var lueur = c.flash > 0;
    if (lueur !== c.lueurAff) {
      c.lueurAff = lueur;
      c.g.traverse(function (o) { if (o.isMesh && o.material.emissive) { if (!o.userData.mat0) o.userData.mat0 = o.material; o.material = lueur ? M.mat(0xffffff, { lueur: 0x777777 }) : o.userData.mat0; } });
    }
    // Barre de vie + direction de l'attaque annoncée (pour parer)
    if (c.el) {
      var tp = c.teteP(); tp.y += 0.35;
      var vis = M.projeter(tp, c.el);
      if (vis) {
        c.elPv.style.width = Math.max(0, c.pv / c.pvMax * 100) + '%';
        var montreDir = c.equipe === 1 && c.etat === 'attaque' && c.att && c.t < c.att.dur * (c.att.wf + 0.1) && c.cibleCoup === B.joueur;
        c.elDir.textContent = montreDir ? FLECHE[c.att.dir] : '';
        c.el.classList.toggle('menace', !!montreDir);
        var dd = dist(c, B.joueur);
        c.el.style.opacity = (dd > 26 || c.cache) ? '0' : '1';
      }
    }
  }

  // ---------- Collisions ----------
  function collisions() {
    var cs = B.combattants, i, j;
    for (i = 0; i < cs.length; i++) {
      var a = cs[i];
      if (!a.vivant()) continue;
      for (j = i + 1; j < cs.length; j++) {
        var b = cs[j];
        if (!b.vivant()) continue;
        var dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), m = a.rayon + b.rayon;
        if (d < m && d > 0.0001) {
          var p = (m - d) / 2;
          var wa = a.def.boss ? 0.2 : 1, wb = b.def.boss ? 0.2 : 1, s = wa + wb;
          a.pos.x -= dx / d * p * 2 * wa / s; a.pos.z -= dz / d * p * 2 * wa / s;
          b.pos.x += dx / d * p * 2 * wb / s; b.pos.z += dz / d * p * 2 * wb / s;
        }
      }
      B.obstacles.forEach(function (o) {
        var dx = a.pos.x - o.x, dz = a.pos.z - o.z, d = Math.hypot(dx, dz), m = a.rayon + o.r;
        if (d < m && d > 0.0001) { a.pos.x = o.x + dx / d * m; a.pos.z = o.z + dz / d * m; }
      });
      if (B.forme.type === 'rect') {
        a.pos.x = Math.max(-B.forme.w / 2 + 0.5, Math.min(B.forme.w / 2 - 0.5, a.pos.x));
        a.pos.z = Math.max(-B.forme.h / 2 + 0.5, Math.min(B.forme.h / 2 - 0.5, a.pos.z));
      } else {
        var r = Math.hypot(a.pos.x, a.pos.z), rm = B.forme.r;
        if (r > rm) { a.pos.x *= rm / r; a.pos.z *= rm / r; }
      }
    }
  }

  // ---------- Projectiles & zones ----------
  function majProjectiles(dt) {
    for (var i = B.projectiles.length - 1; i >= 0; i--) {
      var p = B.projectiles[i];
      p.vie -= dt;
      if (p.cherche && p.cherche.vivant()) {
        var but = new T.Vector3(p.cherche.pos.x, 1.3, p.cherche.pos.z).sub(p.pos).normalize().multiplyScalar(22);
        p.v.lerp(but, Math.min(1, dt * 5));
      }
      if (!p.vague) p.v.y -= dt * (p.lance ? 0 : 2.5);
      p.pos.addScaledVector(p.v, dt);
      if (p.lance) { p.m.lookAt(p.pos.clone().add(p.v)); p.m.rotateX(Math.PI / 2); }
      else if (!p.vague) p.m.lookAt(p.pos.clone().add(p.v));
      var fini = p.vie <= 0 || p.pos.y < 0.05;
      if (!fini) {
        for (var k = 0; k < B.combattants.length; k++) {
          var c = B.combattants[k];
          if (c.equipe === p.equipe || !c.vivant()) continue;
          if (p.touches && p.touches.indexOf(c) >= 0) continue;
          var dx = c.pos.x - p.pos.x, dz = c.pos.z - p.pos.z;
          if (Math.hypot(dx, dz) < c.rayon + p.rayon && p.pos.y < 2.6 * c.taille) {
            var touche = frapper(p.auteur, c, p.deg, 'estoc', { projectile: true, sansDir: true, imparable: p.vague, recul: p.vague ? 2 : 0.5 });
            if (p.touches) p.touches.push(c);
            if (!p.perce) { fini = true; if (!touche) M.eclats(p.pos.clone(), 0xbdc3c7, 3, 2); break; }
          }
        }
      }
      if (p.vague && Math.random() < 0.5) M.eclats(p.pos.clone(), p.couleur, 1, 1.5, 0);
      if (fini) { B.scene.remove(p.m); B.projectiles.splice(i, 1); }
    }
    for (i = B.zones.length - 1; i >= 0; i--) {
      var z = B.zones[i];
      z.t += dt;
      if (z.o.suit) { z.x = z.o.suit.pos.x; z.z = z.o.suit.pos.z; }
      if (z.t >= z.delai) {
        if (z.effet === 'foudre') { M.eclair(z.x, z.z); M.son('tonnerre'); M.secouer(0.25); }
        else if (z.effet === 'rocher') { M.eclats(new T.Vector3(z.x, 1, z.z), 0x95a5a6, 14, 6); M.son('coup'); M.secouer(0.25); }
        else if (z.effet === 'pointes') { for (var q = 0; q < 4; q++) M.eclats(new T.Vector3(z.x + (Math.random() - 0.5), 0.5, z.z + (Math.random() - 0.5)), z.equipe === 0 ? 0xbb8fce : 0x922b21, 2, 5, 8); M.son('metal'); }
        else if (z.effet === 'vent') { M.eclats(new T.Vector3(z.x, 1, z.z), 0xa9dfbf, 14, 6, 0); }
        else { M.eclats(new T.Vector3(z.x, 0.3, z.z), 0x8d6e63, 12, 6); M.anneau(z.x, z.z, z.r, 0xffffff, 0.3); }
        B.combattants.forEach(function (c) {
          if (c.equipe === z.equipe || !c.vivant()) return;
          if (Math.hypot(c.pos.x - z.x, c.pos.z - z.z) < z.r + c.rayon) frapper(z.auteur, c, z.deg, 'haut', { imparable: true, recul: z.effet === 'vent' ? 4 : 2, etourdir: z.effet === 'foudre' ? 0.8 : 0 });
        });
        B.zones.splice(i, 1);
      }
    }
    // Pièces d'or et soins
    for (i = B.pieces.length - 1; i >= 0; i--) {
      var pc = B.pieces[i], j = B.joueur;
      pc.t += dt;
      pc.m.rotation.y += dt * 3;
      pc.m.position.y = 0.4 + Math.sin(pc.t * 4) * 0.1;
      var dj = Math.hypot(j.pos.x - pc.m.position.x, j.pos.z - pc.m.position.z);
      if (dj < 4 && j.vivant()) { pc.m.position.x += (j.pos.x - pc.m.position.x) * dt * 6; pc.m.position.z += (j.pos.z - pc.m.position.z) * dt * 6; }
      if (dj < 0.9 && j.vivant()) {
        if (pc.soin) { j.pv = Math.min(j.pvMax, j.pv + pc.soin); M.texte(j.teteP(), '+' + pc.soin, 'vert'); }
        else { var g = Math.round(pc.n * (B.cfg.faction === 'romains' ? 1.4 : 1)); B.or += g; M.texte(j.teteP(), '+' + g + ' or', 'or'); M.son('or'); }
        B.scene.remove(pc.m); B.pieces.splice(i, 1);
      } else if (pc.t > 30) { B.scene.remove(pc.m); B.pieces.splice(i, 1); }
    }
  }

  // ---------- Caméra à la 3e personne ----------
  function camera(dt) {
    var j = B.joueur, rc = M.rotationCamera();
    B.yaw -= rc.dx * 0.0042;
    B.pitch = Math.max(0.12, Math.min(0.85, B.pitch + rc.dy * 0.003));
    var dist = 7.2, h = 1.6, cx, cz;
    // Rapprocher la caméra si elle sortait de l'arène (murs, maisons)
    var lim = B.forme.type === 'rect' ? 1e9 : B.forme.r + 4;
    for (var essai = 0; essai < 10; essai++) {
      cx = j.pos.x - Math.sin(B.yaw) * Math.cos(B.pitch) * dist;
      cz = j.pos.z - Math.cos(B.yaw) * Math.cos(B.pitch) * dist;
      if (Math.hypot(cx, cz) < lim) break;
      dist -= 0.5;
    }
    var cy = j.pos.y + h + Math.sin(B.pitch) * dist;
    var k = Math.min(1, dt * 12);
    M.cam.position.x += (cx - M.cam.position.x) * k;
    M.cam.position.y += (cy - M.cam.position.y) * k;
    M.cam.position.z += (cz - M.cam.position.z) * k;
    M.appliquerSecousse(dt);
    M.cam.lookAt(j.pos.x, j.pos.y + 1.7, j.pos.z);
    M.suivreOmbre(j.pos.x, j.pos.z);
    // Cacher les combattants collés à la caméra : sinon un allié derrière le joueur bouche toute la vue
    var cp = M.cam.position;
    B.combattants.forEach(function (c) {
      if (c === j) return;
      c.cache = Math.hypot(c.pos.x - cp.x, c.pos.z - cp.z) < 3.2;
      c.g.visible = !c.cache;
    });
  }

  // ---------- Boucle de la bataille ----------
  var DIFF = {
    facile: { pv: 0.8, deg: 0.55, jetons: 1, garde: 0.5, repit: 2.2 },
    normal: { pv: 1, deg: 0.85, jetons: 2, garde: 0.85, repit: 1.4 },
    difficile: { pv: 1.2, deg: 1.25, jetons: 3, garde: 1, repit: 0.8 }
  };
  function maj(dt) {
    if (B.arret > 0) { B.arret -= dt; dt *= 0.08; }
    B.temps += dt;
    B.dtIA = dt;
    if (M.a('pause')) { B.cfg.pause && B.cfg.pause(); return; }
    if (B.pouvoirT > 0) B.pouvoirT -= dt;
    for (var i = 0; i < B.combattants.length; i++) majCombattant(B.combattants[i], dt);
    B.combattants = B.combattants.filter(function (c) { return !c.supprime; });
    collisions();
    majProjectiles(dt);
    M.majEffets(dt);
    camera(dt);
    majHud();
    // Assaillants par cible (pour répartir les ennemis)
    B.combattants.forEach(function (c) { c.nbAssaillants = 0; });
    B.combattants.forEach(function (c) { if (c.cible && c.equipe === 1) c.cible.nbAssaillants = (c.cible.nbAssaillants || 0) + 1; });
    if (B.fini) { B.finT -= dt; if (B.finT <= 0) terminer(); return; }
    // Fin ?
    if (!B.joueur.vivant()) { B.fini = 'defaite'; B.finT = 2; message(B.cfg.amical ? 'Tu as perdu le duel…' : 'Tu es tombé…', 'rouge'); return; }
    var restants = B.combattants.filter(function (c) { return c.equipe === 1 && c.vivant(); }).length;
    if (restants === 0 && B.temps > 1) {
      B.attente = (B.attente || 0) + dt;
      if (B.attente > 1.8) {
        B.attente = 0;
        if (B.vague < B.cfg.vagues.length) vagueSuivante();
        else if (B.cfg.boss && !B.bossLance) lancerBoss();
        else { B.fini = 'victoire'; B.finT = 2.2; message(B.cfg.amical ? 'Duel gagné !' : 'Victoire !', 'or'); M.son('victoire'); }
      }
    }
  }
  function terminer() {
    var res = { victoire: B.fini === 'victoire', morts: B.morts, or: B.or, stats: B.stats, pvRestants: B.joueur.pv };
    var cb = B.cb;
    nettoyer();
    M.arreter();
    cb(res);
  }
  function nettoyer() {
    if (!B) return;
    B.combattants.forEach(function (c) { if (c.el) c.el.remove(); });
    M.viderEffets();
    el('hudBoss').classList.add('hide');
    B = null;
  }

  /* Lance une bataille.
     cfg : { decor, vagues: [[[type, n], ...], ...], boss, allies: [[type, n]], compagnons: [def], joueur: { nom, armes: [ids], pvMax, look },
             faction, diff: 'facile'|'normal'|'difficile', directionnel, amical, titre, pause() }
     cb(res) : { victoire, morts: {type: n}, or, stats } */
  M.bataille = function (cfg, cb) {
    B = {
      cfg: cfg, cb: cb, combattants: [], projectiles: [], zones: [], pieces: [], morts: {}, or: 0, vague: 0, temps: 0,
      stats: { tues: 0, parades: 0, pouvoirs: 0 }, ordre: 'charge', pouvoirT: 0, prochDir: 'droite',
      diff: DIFF[cfg.diff] || DIFF.normal, directionnel: !!cfg.directionnel, yaw: 0, pitch: 0.32
    };
    var dec = M.construireDecor(cfg.decor || 'plaine', cfg.graine || 7);
    B.scene = M.scene; B.obstacles = dec.obstacles; B.forme = dec.forme;
    // Joueur
    var jd = Object.assign({ id: 'joueur', nom: cfg.joueur.nom, pv: cfg.joueur.pvMax || 120, vit: 3.9, look: cfg.joueur.look }, {});
    B.armes = (cfg.joueur.armes || ['epee']).filter(function (a) { return FF.ARMES[a]; });
    if (!B.armes.length) B.armes = ['epee'];
    B.armeIdx = 0;
    var start = B.forme.type === 'rect' ? { x: 0, z: B.forme.h / 2 - 3 } : { x: 0, z: B.forme.r - 6 };
    B.joueur = apparaitre(jd, 0, start.x, start.z, { joueur: true, arme: B.armes[0], pv: jd.pv });
    B.joueur.ang = Math.PI;
    B.yaw = Math.PI;
    B.niveauDeg = cfg.joueur.bonusDeg || 1;
    // Compagnons et troupes alliées
    var n = 0;
    function placerAllie(def, opts) {
      // Alliés devant et sur les côtés du joueur (il regarde vers -Z)
      var col = n % 6, rang = Math.floor(n / 6);
      var x = start.x + (col % 2 ? 1 : -1) * (1.6 + Math.floor(col / 2) * 1.4), z = start.z - 1 - rang * 1.5;
      if (B.forme.type === 'rect') { x = (col % 2 ? 1 : -1) * (1 + Math.floor(col / 2) * 1.1); z = start.z - 1.5 - rang * 1.3; }
      var c = apparaitre(def, 0, Math.max(-20, Math.min(20, x)), z, opts);
      n++;
      return c;
    }
    (cfg.compagnons || []).forEach(function (def) { placerAllie(def, { compagnon: true }); });
    (cfg.allies || []).forEach(function (g) { for (var i = 0; i < g[1]; i++) placerAllie(g[0], { uid: g[0] }); });
    el('hudBoss').classList.add('hide');
    el('hudOrdres').classList.toggle('hide', n === 0);
    donnerOrdre('charge');
    el('hudMsg').className = 'hudMsg';
    if (!cfg.vagues || !cfg.vagues.length) { B.vague = 0; if (cfg.boss) lancerBoss(); }
    else vagueSuivante();
    M.cam.position.set(start.x, 4, start.z + 8);
    M.lancer({ type: 'bataille', maj: maj, quitter: function () {}, surPerteVerrou: function () { if (B && !B.fini && cfg.pause) cfg.pause(); } });
  };
  M.abandonner = function () { if (B) { B.fini = 'defaite'; terminer(); } };
  M.enBataille = function () { return !!B; };
  // Pour les tests automatiques : accès à l'état
  M._bataille = function () { return B; };
  M._vaincreTous = function () { if (B) B.combattants.forEach(function (c) { if (c.equipe === 1 && c.vivant()) mourir(c, B.joueur); }); };
})();
