/* Imperium of Wars — moteur du jeu (aucun code d'affichage ici).
   Marche dans le navigateur ET dans Node : réutilisable dans l'appli Expo et testable. */
(function (root) {
  'use strict';
  var MONDE = root.MONDE || require('./monde.js');
  var HISTOIRE = root.HISTOIRE || require('./histoire.js');

  var MAX_UNITES = 8;
  var CHAMP = { l: 360, h: 520 };

  // ---------- Unités ----------
  // cat : inf, pique, tir, cav, art. bonus = multiplicateur contre une catégorie.
  // annee / caserne : à partir de quand et avec quel niveau de caserne on peut les recruter.
  var UNITES = {
    milice:     { nom: 'Milice',            ico: '🔱', cat: 'pique', cout: 40,  hommes: 40, pv: 8,  atq: 3, def: 5, vit: 28, annee: 0,    caserne: 0, bonus: { cav: 2.2 } },
    arc:        { nom: 'Archers',           ico: '🏹', cat: 'tir',   cout: 60,  hommes: 30, pv: 7,  atq: 2, def: 2, vit: 30, annee: 0,    caserne: 0, portee: 130, tir: 4, bonus: {} },
    epee:       { nom: "Hommes d'armes",    ico: '⚔️', cat: 'inf',   cout: 70,  hommes: 40, pv: 10, atq: 5, def: 6, vit: 30, annee: 0,    caserne: 1, bonus: {} },
    cav:        { nom: 'Cavalerie légère',  ico: '🐎', cat: 'cav',   cout: 80,  hommes: 24, pv: 12, atq: 5, def: 3, vit: 64, annee: 0,    caserne: 1, charge: 2, bonus: { tir: 2.2, art: 3 } },
    chevalier:  { nom: 'Chevaliers',        ico: '🏇', cat: 'cav',   cout: 150, hommes: 24, pv: 18, atq: 8, def: 8, vit: 54, annee: 1000, caserne: 2, charge: 3, bonus: { tir: 2, inf: 1.3, art: 3 } },
    arbal:      { nom: 'Arbalétriers',      ico: '🎯', cat: 'tir',   cout: 90,  hommes: 30, pv: 8,  atq: 2, def: 4, vit: 26, annee: 1150, caserne: 2, portee: 140, tir: 6, perce: true, bonus: {} },
    piquier:    { nom: 'Piquiers',          ico: '🦔', cat: 'pique', cout: 80,  hommes: 48, pv: 9,  atq: 4, def: 7, vit: 24, annee: 1300, caserne: 2, bonus: { cav: 3 } },
    arquebuse:  { nom: 'Arquebusiers',      ico: '🔥', cat: 'tir',   cout: 110, hommes: 32, pv: 8,  atq: 3, def: 3, vit: 28, annee: 1450, caserne: 2, portee: 120, tir: 9, perce: true, bonus: {} },
    canon:      { nom: 'Canons',            ico: '💣', cat: 'art',   cout: 200, hommes: 12, pv: 12, atq: 1, def: 2, vit: 14, annee: 1450, caserne: 3, portee: 230, tir: 25, antiMur: 14, bonus: {} },
    mousquet:   { nom: 'Mousquetaires',     ico: '💂', cat: 'tir',   cout: 120, hommes: 40, pv: 9,  atq: 4, def: 4, vit: 30, annee: 1600, caserne: 2, portee: 140, tir: 8, perce: true, bonus: {} },
    cuirassier: { nom: 'Cuirassiers',       ico: '🎖️', cat: 'cav',   cout: 170, hommes: 28, pv: 16, atq: 8, def: 7, vit: 58, annee: 1600, caserne: 3, charge: 2.5, bonus: { tir: 2, art: 3 } }
  };
  var TYPES = Object.keys(UNITES);

  // ---------- Bâtiments ----------
  var BATIMENTS = {
    murs:    { nom: 'Remparts', ico: '🏰', niveaux: ['Palissade', 'Murs de pierre', 'Forteresse'], couts: [80, 200, 400], effet: 'Défense en cas de siège' },
    caserne: { nom: 'Caserne',  ico: '⚒️', niveaux: ['Caserne', 'Grande caserne', 'Arsenal'], couts: [80, 200, 350], effet: 'Débloque de meilleures unités' },
    marche:  { nom: 'Marché',   ico: '💰', niveaux: ['Marché', 'Foire', 'Port marchand'], couts: [100, 220, 400], effet: '+10 / +25 / +45 or par tour' },
    ferme:   { nom: 'Fermes',   ico: '🌾', niveaux: ['Fermes', 'Moulins'], couts: [60, 150], effet: '+5 / +12 or et soigne la garnison' }
  };
  var BONUS_MARCHE = [0, 10, 25, 45], BONUS_FERME = [0, 5, 12];

  function pvMax(t) { return UNITES[t].hommes * UNITES[t].pv; }
  function creerUnite(t) { return { t: t, hp: pvMax(t), bouge: false }; }
  function hommes(u) { return Math.ceil(u.hp / UNITES[u.t].pv); }
  function force(armee) {
    return armee.reduce(function (s, u) { return s + UNITES[u.t].cout * u.hp / pvMax(u.t); }, 0);
  }
  function forceDefense(p) { return force(p.armee) * (1 + 0.35 * p.bat.murs); }

  function hasard(graine) {
    var a = graine >>> 0 || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function aleaPartie(etat) {
    var f = hasard(etat.alea);
    etat.alea = Math.floor(f() * 4294967295);
    return f;
  }

  var PROV = MONDE.provinces;
  var INDEX = {};
  PROV.forEach(function (p, i) { INDEX[p.id] = i; });

  function epoque(id) { return HISTOIRE.EPOQUES.filter(function (e) { return e.id === id; })[0]; }

  // ---------- Partie ----------
  function nouvellePartie(epoqueId, factionId, graine) {
    graine = graine || (Date.now() % 1e9);
    var E = epoque(epoqueId), alea = hasard(graine);
    var factions = E.factions.map(function (f) {
      return { id: f[0], nom: f[1], coul: f[2], capitale: INDEX[f[3][0]], or: 200 };
    });
    var joueur = factions.map(function (f) { return f.id; }).indexOf(factionId);
    var provinces = PROV.map(function (p, i) {
      return { proprio: -1, armee: [], bat: { murs: alea() < 0.4 ? 1 : 0, caserne: 0, marche: 0, ferme: 0 },
        base: 15 + Math.floor(alea() * 4) * 5, construit: false };
    });
    E.factions.forEach(function (f, fi) {
      f[3].forEach(function (id, k) {
        var p = provinces[INDEX[id]];
        p.proprio = fi;
        if (k === 0) {
          p.bat = { murs: 2, caserne: 1, marche: 1, ferme: 1 };
          p.base = 30;
          p.armee = armeeDepart(E.annee, 4, alea);
        } else {
          p.bat.caserne = alea() < 0.5 ? 1 : 0;
          p.armee = armeeDepart(E.annee, 1 + Math.floor(alea() * 2), alea);
        }
      });
    });
    provinces.forEach(function (p) {
      if (p.proprio === -1) p.armee = armeeDepart(E.annee, 1 + Math.floor(alea() * 2), alea, true);
    });
    var pas = Math.max(1, Math.round((HISTOIRE.FIN - E.annee) / 150));
    var etat = {
      v: 2, epoque: epoqueId, annee: E.annee, pas: pas, tour: 1, joueur: joueur,
      factions: factions, provinces: provinces, alea: graine,
      journal: [E.annee + ' : ' + E.titre + '. Tu diriges ' + factions[joueur].nom + '.'],
      fin: null, nouvelles: []
    };
    initDiplo(etat, alea);
    return etat;
  }

  function armeeDepart(annee, n, alea, rebelles) {
    var dispo = TYPES.filter(function (t) { return UNITES[t].annee <= annee && UNITES[t].caserne <= (rebelles ? 0 : 2) && t !== 'canon'; });
    var a = [];
    for (var i = 0; i < n; i++) a.push(creerUnite(dispo[Math.floor(alea() * dispo.length)]));
    return a;
  }

  function revenuProvince(p) { return p.base + BONUS_MARCHE[p.bat.marche] + BONUS_FERME[p.bat.ferme]; }
  function revenu(etat, f) {
    return etat.provinces.reduce(function (s, p) { return s + (p.proprio === f ? revenuProvince(p) : 0); }, 0);
  }
  function nbProvinces(etat, f) {
    return etat.provinces.filter(function (p) { return p.proprio === f; }).length;
  }

  // Une unité peut-elle être recrutée ici ? Renvoie null si oui, sinon la raison.
  function blocageRecrue(etat, id, t) {
    var U = UNITES[t], p = etat.provinces[id];
    if (U.annee > etat.annee) return 'Disponible en ' + U.annee;
    if (U.caserne > p.bat.caserne) return 'Caserne niv. ' + U.caserne;
    return null;
  }
  function recruter(etat, id, t) {
    var p = etat.provinces[id], f = p.proprio;
    if (f < 0) return 'Province rebelle.';
    var b = blocageRecrue(etat, id, t);
    if (b) return b;
    if (etat.factions[f].or < UNITES[t].cout) return "Pas assez d'or.";
    if (p.armee.length >= MAX_UNITES) return 'Province pleine (' + MAX_UNITES + ' unités max).';
    etat.factions[f].or -= UNITES[t].cout;
    var u = creerUnite(t); u.bouge = true;
    p.armee.push(u);
    return null;
  }

  function construire(etat, id, b) {
    var p = etat.provinces[id], f = p.proprio, B = BATIMENTS[b], niv = p.bat[b];
    if (f < 0) return 'Province rebelle.';
    if (niv >= B.niveaux.length) return 'Déjà au maximum.';
    if (p.construit) return 'Un seul chantier par province et par tour.';
    if (b === 'caserne' && niv + 1 >= 3 && etat.annee < 1400) return 'Arsenal disponible en 1400';
    if (etat.factions[f].or < B.couts[niv]) return "Pas assez d'or.";
    etat.factions[f].or -= B.couts[niv];
    p.bat[b]++;
    p.construit = true;
    return null;
  }

  function prendre(p, indices) {
    var pris = [], restants = [];
    p.armee.forEach(function (u, i) { (indices.indexOf(i) >= 0 && !u.bouge ? pris : restants).push(u); });
    p.armee = restants;
    return pris;
  }

  function deplacer(etat, de, vers, indices) {
    var a = etat.provinces[de], b = etat.provinces[vers];
    if (PROV[de].voisins.indexOf(vers) < 0) return 'Pas voisine.';
    if (b.proprio !== a.proprio) return 'Province ennemie : il faut attaquer.';
    var unites = prendre(a, indices);
    if (b.armee.length + unites.length > MAX_UNITES) { a.armee = a.armee.concat(unites); return "Trop d'unités là-bas."; }
    unites.forEach(function (u) { u.bouge = true; });
    b.armee = b.armee.concat(unites);
    return null;
  }

  function preparerAttaque(etat, de, vers, indices) {
    var a = etat.provinces[de], c = etat.provinces[vers];
    if (PROV[de].voisins.indexOf(vers) < 0) return { erreur: 'Pas voisine.' };
    if (c.proprio === a.proprio) return { erreur: 'Déjà à toi.' };
    if (a.proprio === etat.joueur && c.proprio >= 0 && relation(etat, c.proprio) !== 'guerre')
      return { erreur: 'Tu es en ' + relation(etat, c.proprio) + ' avec ' + etat.factions[c.proprio].nom + '.', paix: c.proprio };
    var unites = prendre(a, indices);
    if (!unites.length) return { erreur: 'Aucune unité choisie.' };
    return { de: de, vers: vers, camp: a.proprio, unites: unites };
  }

  // ---------- Bataille ----------
  // bas / haut : unités en bas et en haut du champ. opts.defenseur = camp (0 bas, 1 haut) qui défend.
  // opts.murs = niveau des remparts du défenseur (0 = bataille en rase campagne).
  function creerBataille(bas, haut, graine, opts) {
    opts = opts || {};
    var def = opts.defenseur == null ? 1 : opts.defenseur;
    var b = { esc: [], temps: 0, fin: null, alea: hasard(graine || 7), tenir: [false, false],
      campAtt: 1 - def, mur: null };
    if (opts.murs > 0) {
      var y = def === 1 ? 175 : CHAMP.h - 175, segs = [];
      for (var i = 0; i < 5; i++) {
        var porte = i === 2, hp = (porte ? 220 : 450) * opts.murs;
        segs.push({ x0: i * CHAMP.l / 5, x1: (i + 1) * CHAMP.l / 5, hp: hp, hpMax: hp, porte: porte });
      }
      b.mur = { y: y, camp: def, dedans: def === 1 ? -1 : 1, segs: segs, niveau: opts.murs };
    }
    function placer(liste, camp) {
      var bord = b.mur && b.mur.camp === camp ? 115 : 110;
      var y0 = camp === 0 ? CHAMP.h - bord : bord, sens = camp === 0 ? 1 : -1;
      var front = liste.filter(function (u) { var c = UNITES[u.t].cat; return c === 'inf' || c === 'pique'; });
      var arriere = liste.filter(function (u) { var c = UNITES[u.t].cat; return c === 'tir' || c === 'art'; });
      var flancs = liste.filter(function (u) { return UNITES[u.t].cat === 'cav'; });
      function ligne(l, y) {
        l.forEach(function (u, i) {
          var x = CHAMP.l / 2 + (i - (l.length - 1) / 2) * Math.min(52, (CHAMP.l - 40) / Math.max(1, l.length - 1 || 1));
          b.esc.push(escouade(u, camp, x, y));
        });
      }
      ligne(front, y0);
      ligne(arriere, y0 + sens * 45);
      flancs.forEach(function (u, i) {
        var cote = i % 2 === 0 ? -1 : 1, rang = Math.floor(i / 2);
        var x = CHAMP.l / 2 + cote * (Math.max(front.length, 2) * 26 + 40 + rang * 30);
        b.esc.push(escouade(u, camp, Math.max(20, Math.min(CHAMP.l - 20, x)), y0 + sens * 10));
      });
    }
    function escouade(u, camp, x, y) {
      return { id: b.esc.length, camp: camp, t: u.t, hp: u.hp, hpMax: pvMax(u.t), x: x, y: y,
        ordre: null, cible: null, fuite: false, sorti: false, contact: 0, source: u };
    }
    placer(bas, 0);
    placer(haut, 1);
    return b;
  }

  function vivant(e) { return e.hp > 0 && !e.fuite && !e.sorti; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function segment(b, x) {
    var s = b.mur.segs;
    return s[Math.max(0, Math.min(s.length - 1, Math.floor(x / (CHAMP.l / s.length))))];
  }
  function abrite(b, e) { // défenseur derrière un rempart encore debout
    return b.mur && e.camp === b.mur.camp && (e.y - b.mur.y) * b.mur.dedans > 0 && segment(b, e.x).hp > 0;
  }
  function brecheProche(b, x) {
    var best = null;
    b.mur.segs.forEach(function (s) {
      if (s.hp > 0) return;
      var cx = (s.x0 + s.x1) / 2;
      if (!best || Math.abs(cx - x) < Math.abs(best - x)) best = cx;
    });
    return best;
  }
  function plusProche(b, e) {
    var best = null, bd = 1e9;
    b.esc.forEach(function (o) {
      if (o.camp === e.camp || !vivant(o)) return;
      var d = dist(e, o);
      if (d < bd) { bd = d; best = o; }
    });
    return best;
  }
  function avancer(e, x, y, v, dt) {
    var dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy);
    if (d < 1) return;
    var pas = Math.min(d, v * dt);
    e.x += dx / d * pas; e.y += dy / d * pas;
  }

  var CONTACT = 22;

  // Se rapproche d'une cible en tenant compte des remparts (passer par une brèche, sinon aller au mur).
  function marcherVers(b, e, cx, cy, v, dt) {
    var m = b.mur;
    if (m && e.camp !== m.camp) {
      var dehors = (e.y - m.y) * m.dedans < 0, cibleDedans = (cy - m.y) * m.dedans > 0;
      if (dehors && cibleDedans && segment(b, e.x).hp > 0) {
        var br = brecheProche(b, e.x);
        if (br != null) { avancer(e, br, m.y, v, dt); return; }
        avancer(e, Math.max(15, Math.min(CHAMP.l - 15, cx)), m.y - m.dedans * 10, v, dt);
        return;
      }
    }
    avancer(e, cx, cy, v, dt);
  }

  function etape(b, dt) {
    if (b.fin) return;
    b.temps += dt;
    var m = b.mur;
    b.esc.forEach(function (e) {
      if (e.hp <= 0 || e.sorti) return;
      var U = UNITES[e.t];
      if (e.fuite) {
        avancer(e, e.x, e.camp === 0 ? CHAMP.h + 60 : -60, U.vit * 1.1, dt);
        if (e.y > CHAMP.h + 20 || e.y < -20) e.sorti = true;
        return;
      }
      var hommesE = Math.ceil(e.hp / U.pv);
      // Les canons de l'assaillant visent d'abord les remparts.
      if (m && U.antiMur && e.camp !== m.camp && !m.segs.some(function (s) { return s.hp <= 0; })) {
        var seg = null, bd = 1e9;
        m.segs.forEach(function (s) {
          if (s.hp <= 0) return;
          var d = Math.hypot((s.x0 + s.x1) / 2 - e.x, m.y - e.y) - (s.porte ? 30 : 0);
          if (d < bd) { bd = d; seg = s; }
        });
        if (seg) {
          if (Math.abs(m.y - e.y) <= U.portee) seg.hp -= hommesE * U.antiMur * dt;
          else avancer(e, e.x, m.y - m.dedans * U.portee * 0.9, U.vit, dt);
          return;
        }
      }
      var cible = null;
      if (e.ordre && e.ordre.cible != null) {
        var c = b.esc[e.ordre.cible];
        if (vivant(c)) cible = c; else e.ordre = null;
      }
      if (!cible && e.ordre && e.ordre.x != null) {
        marcherVers(b, e, e.ordre.x, e.ordre.y, U.vit, dt);
        if (Math.hypot(e.ordre.x - e.x, e.ordre.y - e.y) < 3) e.ordre = null;
        var proche = plusProche(b, e);
        if (proche && dist(e, proche) < CONTACT) cible = proche; else { e.cible = null; return; }
      }
      if (!cible) cible = plusProche(b, e);
      e.cible = cible ? cible.id : null;
      if (!cible) return;
      var d = dist(e, cible), V = UNITES[cible.t];
      var defC = V.def * (abrite(b, cible) ? 1.6 : 1);
      var tenir = b.tenir[e.camp] && !(e.ordre && e.ordre.cible != null);
      if (U.portee && d > CONTACT) {
        if (d <= U.portee) {
          var dd = U.perce ? Math.max(2, defC * 0.5) : defC;
          var deg = hommesE * U.tir * 0.22 / dd * (abrite(b, cible) ? 0.5 : 1) * (0.8 + b.alea() * 0.4);
          cible.hp -= deg * dt;
        } else if (!tenir) marcherVers(b, e, cible.x, cible.y, U.vit, dt);
      } else if (d > CONTACT) {
        e.contact = 0;
        if (!tenir) marcherVers(b, e, cible.x, cible.y, U.vit, dt);
        // Bloqué devant un rempart : on l'attaque (béliers, échelles…).
        if (m && e.camp !== m.camp && Math.abs(e.y - (m.y - m.dedans * 10)) < 3) {
          var s2 = segment(b, e.x);
          if (s2.hp > 0) s2.hp -= hommesE * U.atq * 0.07 * dt;
        }
      } else {
        e.contact += dt;
        var mult = (U.bonus[V.cat] || 1) * (U.charge && e.contact < 2.5 && !abrite(b, cible) ? U.charge : 1);
        cible.hp -= hommesE * U.atq * mult * 0.35 / defC * (0.8 + b.alea() * 0.4) * dt;
      }
    });
    // Moral : fuite quand il reste peu d'hommes (on tient mieux derrière des murs).
    b.esc.forEach(function (e) {
      if (e.hp <= 0) { e.hp = 0; return; }
      if (!e.fuite && e.hp / e.hpMax < (abrite(b, e) ? 0.15 : 0.25)) e.fuite = true;
    });
    for (var i = 0; i < b.esc.length; i++) {
      for (var j = i + 1; j < b.esc.length; j++) {
        var p = b.esc[i], q = b.esc[j];
        if (!vivant(p) || !vivant(q) || p.camp !== q.camp) continue;
        var dx = q.x - p.x, dy = q.y - p.y, dd2 = Math.hypot(dx, dy) || 0.01;
        if (dd2 < 30) {
          var push = (30 - dd2) / 2;
          p.x -= dx / dd2 * push; p.y -= dy / dd2 * push;
          q.x += dx / dd2 * push; q.y += dy / dd2 * push;
        }
      }
    }
    b.esc.forEach(function (e) {
      e.x = Math.max(10, Math.min(CHAMP.l - 10, e.x));
      if (e.fuite) return;
      e.y = Math.max(10, Math.min(CHAMP.h - 10, e.y));
      // Les remparts debout bloquent le passage dans les deux sens.
      if (m && segment(b, e.x).hp > 0) {
        var cote = (e.y - m.y) * m.dedans;
        if (e.camp === m.camp && cote < 10) e.y = m.y + m.dedans * 10;
        if (e.camp !== m.camp && cote > -10) e.y = m.y - m.dedans * 10;
      }
    });
    if (m) m.segs.forEach(function (s) { if (s.hp < 0) s.hp = 0; });
    var reste = [0, 0];
    b.esc.forEach(function (e) { if (vivant(e)) reste[e.camp]++; });
    if (!reste[0] || !reste[1] || b.temps > 300) {
      var g = reste[0] && !reste[1] ? 0 : reste[1] && !reste[0] ? 1 : 1 - b.campAtt; // égalité : le défenseur tient
      b.fin = { gagnant: g };
    }
  }

  function resoudreAuto(b) {
    var garde = 0;
    while (!b.fin && garde++ < 5000) etape(b, 0.1);
    return b.fin;
  }

  function survivants(b, camp) {
    return b.esc.filter(function (e) { return e.camp === camp && e.hp > 0; }).map(function (e) {
      var u = e.source;
      u.hp = Math.max(UNITES[u.t].pv, e.fuite ? e.hp * 0.7 : e.hp);
      u.bouge = true;
      return u;
    });
  }

  // Bataille pour une attaque. joueurEnBas : le camp à placer en bas (pour l'affichage).
  function batailleAttaque(etat, att, graine, campBas) {
    var c = etat.provinces[att.vers];
    var attEnBas = campBas == null ? true : campBas === att.camp;
    return attEnBas ? creerBataille(att.unites, c.armee, graine, { defenseur: 1, murs: c.bat.murs })
                    : creerBataille(c.armee, att.unites, graine, { defenseur: 0, murs: c.bat.murs });
  }

  function appliquerBataille(etat, att, b) {
    var a = etat.provinces[att.de], c = etat.provinces[att.vers];
    var gagne = b ? b.fin.gagnant === b.campAtt : true;
    var survA = b ? survivants(b, b.campAtt) : att.unites;
    var survD = b ? survivants(b, 1 - b.campAtt) : [];
    var ancien = c.proprio;
    if (gagne) {
      c.proprio = att.camp;
      c.armee = survA.slice(0, MAX_UNITES);
      if (b && b.mur && b.mur.segs.some(function (s) { return s.hp <= 0; })) c.bat.murs = Math.max(0, c.bat.murs - 1);
      if (att.camp === etat.joueur && ancien >= 0) changerAttitude(etat, ancien, -25);
      log(etat, '⚔️ ' + nomF(etat, att.camp) + ' prend ' + PROV[att.vers].nom + ' à ' + nomF(etat, ancien) + '.');
      if (ancien >= 0 && nbProvinces(etat, ancien) === 0) log(etat, '💀 ' + nomF(etat, ancien) + ' a disparu !');
      verifierFin(etat);
    } else {
      c.armee = survD;
      a.armee = a.armee.concat(survA).slice(0, MAX_UNITES);
      log(etat, '🛡️ ' + nomF(etat, ancien) + ' repousse ' + nomF(etat, att.camp) + ' à ' + PROV[att.vers].nom + '.');
    }
    return gagne;
  }

  function nomF(etat, f) {
    if (f < 0) return 'des rebelles';
    return f === etat.joueur && etat.pseudo ? etat.pseudo + ' (' + etat.factions[f].nom + ')' : etat.factions[f].nom;
  }
  function log(etat, txt) {
    etat.journal.unshift(txt);
    if (etat.journal.length > 40) etat.journal.length = 40;
  }

  function verifierFin(etat) {
    var n = nbProvinces(etat, etat.joueur);
    if (n === 0) etat.fin = 'defaite';
    else if (n >= HISTOIRE.OBJECTIF) etat.fin = 'victoire';
    else if (etat.annee >= HISTOIRE.FIN) etat.fin = 'temps';
  }

  // Classement des royaumes (pour la fin en 1800).
  function classement(etat) {
    return etat.factions.map(function (f, i) { return { i: i, nom: f.nom, coul: f.coul, n: nbProvinces(etat, i) }; })
      .filter(function (x) { return x.n > 0; })
      .sort(function (a, b) { return b.n - a.n; });
  }

  // ---------- IA ----------
  function meilleuresRecrues(etat, id) {
    return TYPES.filter(function (t) { return !blocageRecrue(etat, id, t); });
  }

  function tourIA(etat) {
    var alea = aleaPartie(etat), pourJoueur = [];
    etat.factions.forEach(function (F, f) {
      if (f === etat.joueur) return;
      var miennes = [];
      etat.provinces.forEach(function (p, i) { if (p.proprio === f) miennes.push(i); });
      if (!miennes.length) return;
      miennes.sort(function (x, y) { return menace(etat, y) - menace(etat, x); });
      // 1. Construire (marché d'abord, puis caserne et remparts aux frontières).
      if (F.or > 250) {
        var id = miennes[Math.floor(alea() * Math.min(3, miennes.length))], p = etat.provinces[id];
        var choix = p.bat.marche < 2 ? 'marche' : p.bat.caserne < 2 ? 'caserne' : p.bat.murs < 2 ? 'murs' : alea() < 0.5 ? 'caserne' : 'marche';
        construire(etat, id, choix);
      }
      // 2. Recruter aux frontières menacées.
      var essais = 0;
      while (F.or >= 40 && essais++ < 12) {
        var r = miennes[essais % Math.min(miennes.length, 3)];
        var dispo = meilleuresRecrues(etat, r).filter(function (t) { return UNITES[t].cout <= F.or; });
        if (!dispo.length) break;
        // Préfère les unités les plus récentes.
        dispo.sort(function (a, b) { return UNITES[b].cout - UNITES[a].cout; });
        var t = dispo[Math.floor(alea() * Math.min(dispo.length, 4))];
        if (recruter(etat, r, t)) continue;
      }
      // 3. Attaquer un voisin plus faible.
      miennes.forEach(function (i) {
        var p = etat.provinces[i];
        if (p.proprio !== f) return;
        var dispo = p.armee.map(function (u, k) { return u.bouge ? -1 : k; }).filter(function (k) { return k >= 0; });
        if (!dispo.length) return;
        var cibles = PROV[i].voisins.filter(function (v) {
          var o = etat.provinces[v].proprio;
          return o !== f && (o !== etat.joueur || relation(etat, f) === 'guerre');
        });
        if (!cibles.length) return;
        // Un allié du joueur s'en prend d'abord aux ennemis du joueur.
        var bonusCible = function (v) {
          var o = etat.provinces[v].proprio;
          return relation(etat, f) === 'alliance' && o >= 0 && relation(etat, o) === 'guerre' ? 0.5 : 1;
        };
        cibles.sort(function (x, y) { return forceDefense(etat.provinces[x]) * bonusCible(x) - forceDefense(etat.provinces[y]) * bonusCible(y); });
        var v = cibles[0], cp = etat.provinces[v];
        var envoi = dispo.slice();
        if (cibles.length > 1 && envoi.length > 1 && p.armee.length === dispo.length) envoi.pop();
        var fEnvoi = force(envoi.map(function (k) { return p.armee[k]; }));
        var audace = etat.tour < 3 ? 1.7 : 1.3;
        if (fEnvoi < forceDefense(cp) * audace + 25) return;
        var att = preparerAttaque(etat, i, v, envoi);
        if (att.erreur) return;
        if (cp.proprio === etat.joueur && cp.armee.length) { renfortAllie(etat, v); pourJoueur.push(att); return; }
        if (!cp.armee.length) { appliquerBataille(etat, att, null); return; }
        var b = batailleAttaque(etat, att, Math.floor(alea() * 1e9));
        resoudreAuto(b);
        appliquerBataille(etat, att, b);
      });
    });
    return pourJoueur;
  }

  function menace(etat, i) {
    var f = etat.provinces[i].proprio;
    return PROV[i].voisins.reduce(function (s, v) {
      var o = etat.provinces[v];
      return s + (o.proprio !== f && o.proprio >= 0 ? force(o.armee) : 0);
    }, 0);
  }

  // ---------- Diplomatie ----------
  // etat.diplo[f] = { rel: 'paix' | 'guerre' | 'alliance', att: -100..100 (humeur envers le joueur),
  //                   depuis: tour du dernier changement, aideT: tour où l'allié peut de nouveau aider, demande: tour }
  function voisinDuJoueur(etat, f) {
    return etat.provinces.some(function (p, i) {
      return p.proprio === f && PROV[i].voisins.some(function (v) { return etat.provinces[v].proprio === etat.joueur; });
    });
  }
  function initDiplo(etat, alea) {
    alea = alea || aleaPartie(etat);
    etat.diplo = etat.factions.map(function (F, f) {
      if (f === etat.joueur) return null;
      var voisin = voisinDuJoueur(etat, f);
      var att = Math.round(voisin ? -35 + alea() * 45 : alea() * 30);
      return { rel: att < -20 ? 'guerre' : 'paix', att: att, depuis: 0, aideT: 0, demande: 0 };
    });
    etat.propositions = [];
  }
  function assurerDiplo(etat) { if (!etat.diplo) initDiplo(etat); if (!etat.propositions) etat.propositions = []; }
  function relation(etat, f) {
    if (f === etat.joueur) return 'soi';
    if (f < 0) return 'guerre';
    assurerDiplo(etat);
    return etat.diplo[f].rel;
  }
  function changerAttitude(etat, f, d) {
    assurerDiplo(etat);
    var D = etat.diplo[f];
    if (D) D.att = Math.max(-100, Math.min(100, Math.round(D.att + d)));
  }
  function changerRelation(etat, f, rel) {
    var D = etat.diplo[f];
    D.rel = rel;
    D.depuis = etat.tour;
  }
  function humeur(att) {
    return att < -30 ? '😠 Hostile' : att < 0 ? '😒 Méfiant' : att < 30 ? '😐 Neutre' : att < 60 ? '🙂 Amical' : '😍 Fidèle';
  }
  // Liste pour l'écran Diplomatie.
  function diplomatie(etat) {
    assurerDiplo(etat);
    return etat.factions.map(function (F, f) {
      if (f === etat.joueur) return null;
      var n = nbProvinces(etat, f);
      if (!n) return null;
      var D = etat.diplo[f];
      return { f: f, nom: F.nom, coul: F.coul, n: n, rel: D.rel, att: D.att, humeur: humeur(D.att), voisin: voisinDuJoueur(etat, f),
        aidePrete: D.aideT <= etat.tour, dejaDemande: D.demande === etat.tour };
    }).filter(Boolean).sort(function (a, b) { return (b.voisin - a.voisin) || (b.n - a.n); });
  }
  function puissance(etat, f) {
    return etat.provinces.reduce(function (s, p) { return s + (p.proprio === f ? force(p.armee) + 40 : 0); }, 0);
  }
  var NOM_REL = { paix: 'Paix', guerre: 'Guerre', alliance: 'Alliance' };

  // Le joueur propose quelque chose à un royaume. Renvoie { ok, msg }.
  function proposer(etat, f, type) {
    assurerDiplo(etat);
    var D = etat.diplo[f], F = etat.factions[f], J = etat.factions[etat.joueur];
    if (!D || !nbProvinces(etat, f)) return { ok: false, msg: 'Ce royaume a disparu.' };
    if (type === 'guerre') {
      if (D.rel === 'guerre') return { ok: false, msg: 'Déjà en guerre.' };
      var trahison = D.rel === 'alliance';
      changerRelation(etat, f, 'guerre');
      changerAttitude(etat, f, -40);
      etat.diplo.forEach(function (o, k) { if (o && k !== f) changerAttitude(etat, k, trahison ? -15 : -4); });
      log(etat, '⚔️ ' + nomF(etat, etat.joueur) + ' déclare la guerre à ' + F.nom + (trahison ? ' et trahit son alliance !' : '.'));
      return { ok: true, msg: 'Guerre déclarée à ' + F.nom + (trahison ? '. Les autres royaumes te font moins confiance.' : '.') };
    }
    if (type === 'cadeau') {
      if (J.or < 100) return { ok: false, msg: "Il faut 100 pièces d'or." };
      J.or -= 100; F.or += 100;
      changerAttitude(etat, f, 15);
      return { ok: true, msg: F.nom + ' apprécie ton cadeau (' + humeur(D.att) + ').' };
    }
    if (D.demande === etat.tour) return { ok: false, msg: F.nom + ' a déjà reçu ton messager ce tour-ci.' };
    if (type === 'paix') {
      if (D.rel !== 'guerre') return { ok: false, msg: 'Vous êtes déjà en paix.' };
      D.demande = etat.tour;
      var ratio = puissance(etat, etat.joueur) / Math.max(1, puissance(etat, f));
      var score = D.att + 20 * Math.min(2, ratio - 1) + Math.min(25, 4 * (etat.tour - D.depuis)) - 5;
      if (score < 0) { changerAttitude(etat, f, -3); return { ok: false, msg: F.nom + ' refuse la paix. Reviens plus tard ou envoie un cadeau.' }; }
      changerRelation(etat, f, 'paix');
      changerAttitude(etat, f, 10);
      log(etat, '🕊️ Paix signée avec ' + F.nom + '.');
      return { ok: true, msg: 'Paix signée avec ' + F.nom + ' !' };
    }
    if (type === 'alliance') {
      if (D.rel === 'alliance') return { ok: false, msg: 'Vous êtes déjà alliés.' };
      if (D.rel === 'guerre') return { ok: false, msg: "Signe d'abord la paix." };
      D.demande = etat.tour;
      if (D.att < 40) { changerAttitude(etat, f, -2); return { ok: false, msg: F.nom + ' refuse : il faut une humeur « Amical » (40) au moins.' }; }
      changerRelation(etat, f, 'alliance');
      changerAttitude(etat, f, 10);
      log(etat, '🤝 Alliance conclue avec ' + F.nom + '.');
      return { ok: true, msg: 'Alliance conclue avec ' + F.nom + ' !' };
    }
    if (type === 'rompre') {
      if (D.rel !== 'alliance') return { ok: false, msg: "Vous n'êtes pas alliés." };
      changerRelation(etat, f, 'paix');
      changerAttitude(etat, f, -20);
      log(etat, '💔 Alliance rompue avec ' + F.nom + '.');
      return { ok: true, msg: 'Alliance rompue avec ' + F.nom + '.' };
    }
    if (type === 'aideOr' || type === 'aideTroupes') {
      if (D.rel !== 'alliance') return { ok: false, msg: 'Seul un allié peut t\'aider.' };
      if (D.aideT > etat.tour) return { ok: false, msg: F.nom + ' t\'a déjà aidé. Encore ' + (D.aideT - etat.tour) + ' tour(s).' };
      D.demande = etat.tour;
      if (D.att < 20) return { ok: false, msg: F.nom + ' n\'a pas assez confiance (humeur 20 minimum).' };
      if (type === 'aideOr') {
        var don = Math.min(300, Math.floor(F.or * 0.3));
        if (don < 30) return { ok: false, msg: F.nom + " n'a presque plus d'or." };
        F.or -= don; J.or += don;
        D.aideT = etat.tour + 4;
        changerAttitude(etat, f, -5);
        log(etat, '💰 ' + F.nom + ' t\'envoie ' + don + " pièces d'or.");
        return { ok: true, msg: F.nom + ' t\'envoie ' + don + " pièces d'or !" };
      }
      var cible = provinceRenfort(etat, f);
      if (cible < 0) return { ok: false, msg: 'Aucune de tes provinces n\'a de place pour des renforts.' };
      var types = TYPES.filter(function (t) { return UNITES[t].annee <= etat.annee && UNITES[t].caserne <= 2; })
        .sort(function (a, b) { return UNITES[b].cout - UNITES[a].cout; });
      var p = etat.provinces[cible], n = Math.min(2, MAX_UNITES - p.armee.length);
      for (var k = 0; k < n; k++) p.armee.push(creerUnite(types[k % Math.min(3, types.length)]));
      D.aideT = etat.tour + 5;
      changerAttitude(etat, f, -8);
      log(etat, '🛡️ ' + F.nom + ' envoie ' + n + ' unité(s) à ' + PROV[cible].nom + '.');
      return { ok: true, msg: F.nom + ' envoie ' + n + ' unité(s) à ' + PROV[cible].nom + ' !', province: cible };
    }
    return { ok: false, msg: 'Proposition inconnue.' };
  }

  // Où un allié envoie ses troupes : une province du joueur voisine de l'allié, sinon la capitale.
  function provinceRenfort(etat, f) {
    var best = -1, bestM = -1;
    etat.provinces.forEach(function (p, i) {
      if (p.proprio !== etat.joueur || p.armee.length >= MAX_UNITES) return;
      var proche = PROV[i].voisins.some(function (v) { return etat.provinces[v].proprio === f; });
      var m = menace(etat, i) + (proche ? 1000 : 0);
      if (m > bestM) { bestM = m; best = i; }
    });
    return best;
  }

  // Quand l'ennemi attaque une province du joueur, un allié voisin envoie une unité en renfort.
  function renfortAllie(etat, cible) {
    var p = etat.provinces[cible];
    if (p.armee.length >= MAX_UNITES) return;
    PROV[cible].voisins.some(function (v) {
      var o = etat.provinces[v];
      if (o.proprio < 0 || o.proprio === etat.joueur || relation(etat, o.proprio) !== 'alliance' || o.armee.length < 2) return false;
      if (etat.diplo[o.proprio].att < 20) return false;
      var u = o.armee.pop();
      u.bouge = true;
      p.armee.push(u);
      var msg = '🤝 ' + etat.factions[o.proprio].nom + ' envoie ' + UNITES[u.t].nom.toLowerCase() + ' défendre ' + PROV[cible].nom + ' !';
      log(etat, msg);
      etat.nouvelles.push(msg);
      return true;
    });
  }

  // Chaque tour : les humeurs bougent, les royaumes proposent la paix, l'alliance, déclarent la guerre…
  function tourDiplo(etat) {
    assurerDiplo(etat);
    var alea = aleaPartie(etat), grand = nbProvinces(etat, etat.joueur) >= 18;
    etat.propositions = [];
    etat.diplo.forEach(function (D, f) {
      if (!D || !nbProvinces(etat, f)) return;
      var F = etat.factions[f], voisin = voisinDuJoueur(etat, f);
      var d = voisin ? -2 : 1;
      if (D.rel === 'alliance') d += 3;
      if (D.rel === 'guerre') d += 2;
      if (grand) d -= 2;
      changerAttitude(etat, f, d);
      var nb = etat.propositions.length + etat.nouvelles.length;
      if (D.rel === 'guerre' && D.att > 5 && etat.tour - D.depuis >= 3 && alea() < 0.35 && nb < 6) {
        etat.propositions.push({ f: f, type: 'paix' });
      } else if (D.rel === 'paix' && D.att >= 50 && alea() < 0.25 && nb < 6) {
        etat.propositions.push({ f: f, type: 'alliance' });
      } else if (D.rel === 'paix' && voisin && D.att <= -40 && etat.tour - D.depuis >= 2 && alea() < 0.5) {
        changerRelation(etat, f, 'guerre');
        var m = '⚔️ ' + F.nom + ' te déclare la guerre !';
        log(etat, m); etat.nouvelles.push(m);
      } else if (D.rel === 'alliance' && D.att < 0) {
        changerRelation(etat, f, 'paix');
        var m2 = '💔 ' + F.nom + ' rompt votre alliance.';
        log(etat, m2); etat.nouvelles.push(m2);
      } else if (D.rel === 'alliance' && D.att >= 45 && D.aideT <= etat.tour && alea() < 0.15) {
        var don = Math.min(150, Math.floor(F.or * 0.25));
        if (don >= 30) {
          F.or -= don; etat.factions[etat.joueur].or += don;
          D.aideT = etat.tour + 3;
          var m3 = '💰 Ton allié ' + F.nom + ' t\'offre ' + don + " pièces d'or.";
          log(etat, m3); etat.nouvelles.push(m3);
        }
      }
    });
  }

  // Réponse du joueur à une proposition d'un royaume.
  function repondre(etat, k, oui) {
    var P = etat.propositions[k];
    if (!P) return null;
    etat.propositions.splice(k, 1);
    var F = etat.factions[P.f], D = etat.diplo[P.f];
    if (!nbProvinces(etat, P.f)) return F.nom + ' a disparu.';
    if (!oui) {
      changerAttitude(etat, P.f, P.type === 'alliance' ? -10 : -5);
      return 'Tu refuses ' + (P.type === 'paix' ? 'la paix' : "l'alliance") + ' de ' + F.nom + '.';
    }
    if (P.type === 'paix' && D.rel === 'guerre') { changerRelation(etat, P.f, 'paix'); changerAttitude(etat, P.f, 10); log(etat, '🕊️ Paix signée avec ' + F.nom + '.'); return 'Paix signée avec ' + F.nom + ' !'; }
    if (P.type === 'alliance' && D.rel === 'paix') { changerRelation(etat, P.f, 'alliance'); changerAttitude(etat, P.f, 10); log(etat, '🤝 Alliance conclue avec ' + F.nom + '.'); return 'Alliance conclue avec ' + F.nom + ' !'; }
    return 'La situation a changé.';
  }

  // Fin du tour du joueur : revenus, soins, années qui passent, événements, puis l'IA joue.
  function finDuTour(etat) {
    var avant = etat.annee;
    etat.factions.forEach(function (F, f) { F.or += revenu(etat, f) + (f !== etat.joueur ? 10 : 0); });
    etat.provinces.forEach(function (p) {
      p.construit = false;
      var soin = 0.15 + 0.08 * p.bat.ferme;
      p.armee.forEach(function (u) { u.bouge = false; u.hp = Math.min(pvMax(u.t), u.hp + pvMax(u.t) * soin); });
    });
    etat.annee = Math.min(HISTOIRE.FIN, etat.annee + etat.pas);
    etat.tour++;
    etat.nouvelles = [];
    HISTOIRE.EVENEMENTS.forEach(function (ev) {
      if (ev.annee > avant && ev.annee <= etat.annee) {
        etat.nouvelles.push('📜 ' + ev.txt);
        log(etat, '📜 ' + ev.annee + ' : ' + ev.txt);
        if (ev.effet === 'peste') etat.provinces.forEach(function (p) { p.armee.forEach(function (u) { u.hp *= 0.55; }); });
        if (ev.effet === 'or') etat.factions[etat.joueur].or += 200;
      }
    });
    TYPES.forEach(function (t) {
      var U = UNITES[t];
      if (U.annee > avant && U.annee <= etat.annee) etat.nouvelles.push('🆕 Nouvelle unité : ' + U.ico + ' ' + U.nom + ' (caserne niv. ' + U.caserne + ')');
    });
    tourDiplo(etat);
    var defenses = tourIA(etat);
    etat.provinces.forEach(function (p) { p.armee.forEach(function (u) { u.bouge = false; }); });
    verifierFin(etat);
    return defenses;
  }

  var M = {
    MONDE: MONDE, HISTOIRE: HISTOIRE, PROV: PROV, CHAMP: CHAMP, MAX_UNITES: MAX_UNITES,
    UNITES: UNITES, TYPES: TYPES, BATIMENTS: BATIMENTS,
    nouvellePartie: nouvellePartie, epoque: epoque,
    pvMax: pvMax, hommes: hommes, force: force, forceDefense: forceDefense,
    revenu: revenu, revenuProvince: revenuProvince, nbProvinces: nbProvinces, classement: classement,
    blocageRecrue: blocageRecrue, recruter: recruter, construire: construire, deplacer: deplacer,
    preparerAttaque: preparerAttaque, creerBataille: creerBataille, batailleAttaque: batailleAttaque,
    etape: etape, resoudreAuto: resoudreAuto, vivant: vivant, abrite: abrite,
    appliquerBataille: appliquerBataille,
    relation: relation, diplomatie: diplomatie, proposer: proposer, repondre: repondre, humeur: humeur, NOM_REL: NOM_REL,
    assurerDiplo: assurerDiplo, changerAttitude: changerAttitude, finDuTour: finDuTour, tourIA: tourIA, verifierFin: verifierFin, log: log
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.Moteur = M;
})(this);
