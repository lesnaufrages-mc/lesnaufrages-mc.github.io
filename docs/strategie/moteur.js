/* Naufragés : Conquête — moteur du jeu (aucun code d'affichage ici).
   Ce fichier marche dans le navigateur ET dans Node, pour pouvoir le
   réutiliser plus tard dans l'appli Expo et le tester facilement. */
(function (root) {
  'use strict';

  var LARGEUR = 400, HAUTEUR = 600;      // taille de la carte
  var MAX_UNITES = 8;                    // unités max par région
  var CHAMP = { l: 360, h: 520 };        // taille du champ de bataille

  // ---------- Unités ----------
  // hommes × pv = points de vie de l'unité. bonus = multiplicateur contre un type.
  var UNITES = {
    epee:  { nom: 'Épéistes',  ico: '⚔️', cout: 60,  hommes: 40, pv: 10, atq: 5, def: 5, vit: 30, portee: 0,   bonus: {} },
    lance: { nom: 'Lanciers',  ico: '🔱', cout: 50,  hommes: 40, pv: 9,  atq: 4, def: 6, vit: 28, portee: 0,   bonus: { cav: 2.5 } },
    arc:   { nom: 'Archers',   ico: '🏹', cout: 70,  hommes: 30, pv: 7,  atq: 2, def: 2, vit: 30, portee: 130, tir: 4, bonus: {} },
    cav:   { nom: 'Cavaliers', ico: '🐎', cout: 100, hommes: 24, pv: 14, atq: 6, def: 4, vit: 64, portee: 0,   bonus: { arc: 2.2 }, charge: 2.2 }
  };
  var TYPES = ['epee', 'lance', 'arc', 'cav'];

  function pvMax(t) { return UNITES[t].hommes * UNITES[t].pv; }
  function creerUnite(t) { return { t: t, hp: pvMax(t), bouge: false }; }
  function hommes(u) { return Math.ceil(u.hp / UNITES[u.t].pv); }
  function force(armee) {
    return armee.reduce(function (s, u) { return s + UNITES[u.t].cout * u.hp / pvMax(u.t); }, 0);
  }

  // ---------- Hasard reproductible ----------
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

  // ---------- Factions ----------
  var FACTIONS = [
    { nom: 'Les Naufragés',    coul: '#3b82f6', joueur: true },
    { nom: 'Royaume du Nord',  coul: '#e5484d' },
    { nom: 'Empire du Sud',    coul: '#e2b93b' },
    { nom: "Clans de l'Est",   coul: '#a855f7' }
  ];
  var NEUTRE = { nom: 'Rebelles', coul: '#6b7280' };

  // ---------- Carte ----------
  // [nom, x, y, faction de départ (-1 = rebelles), capitale ?]
  var LIEUX = [
    ['Port-Naufrage', 70, 535, 0, true],
    ['Givreterre',   200, 55,  1, true],
    ['Solaria',      335, 545, 2, true],
    ['Krahn',        350, 175, 3, true],
    ['Brumeval',      55, 95,  -1], ['Hautecombe', 120, 190, -1], ['Pic-Gelé',  250, 150, -1],
    ['Marais-Noir',   45, 300, -1], ['Clairefont', 165, 280, -1], ['Rochebrune', 270, 285, -1],
    ['Dunes-Rouges', 365, 345, -1], ['Bois-Sombre', 100, 410, -1], ['Cœur-du-Monde', 215, 395, -1],
    ['Fort-Corail',  300, 440, -1], ['Anse-Grise',  185, 520, -1], ['Vallée-Douce', 42, 455, -1],
    ['Corne-du-Loup', 330, 60, -1], ['Lac-Miroir',  60, 200, -1]
  ];

  // Découpe un polygone par un demi-plan a·x + b·y <= c (Sutherland–Hodgman).
  function couper(poly, a, b, c) {
    var res = [];
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], q = poly[(i + 1) % poly.length];
      var fp = a * p[0] + b * p[1] - c, fq = a * q[0] + b * q[1] - c;
      if (fp <= 0) res.push(p);
      if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
        var k = fp / (fp - fq);
        res.push([p[0] + k * (q[0] - p[0]), p[1] + k * (q[1] - p[1])]);
      }
    }
    return res;
  }

  // Régions = cellules de Voronoï : chaque point du terrain appartient au lieu le plus proche.
  function construireCarte() {
    var m = 6;
    var regions = LIEUX.map(function (l, i) {
      return { id: i, nom: l[0], x: l[1], y: l[2], depart: l[3], capitale: !!l[4] };
    });
    regions.forEach(function (r) {
      var poly = [[m, m], [LARGEUR - m, m], [LARGEUR - m, HAUTEUR - m], [m, HAUTEUR - m]];
      regions.forEach(function (o) {
        if (o === r) return;
        var a = o.x - r.x, b = o.y - r.y;
        var c = (a * (o.x + r.x) + b * (o.y + r.y)) / 2;
        poly = couper(poly, a, b, c);
      });
      r.poly = poly;
      var cx = 0, cy = 0;
      poly.forEach(function (p) { cx += p[0]; cy += p[1]; });
      r.cx = cx / poly.length; r.cy = cy / poly.length;
    });
    // Deux régions sont voisines si elles partagent une frontière (2 sommets sur la médiatrice).
    regions.forEach(function (r) {
      r.voisins = [];
      regions.forEach(function (o) {
        if (o === r) return;
        var a = o.x - r.x, b = o.y - r.y, n = Math.hypot(a, b);
        var c = (a * (o.x + r.x) + b * (o.y + r.y)) / 2;
        var surLigne = r.poly.filter(function (p) { return Math.abs(a * p[0] + b * p[1] - c) / n < 0.01; });
        if (surLigne.length >= 2) {
          var d = Math.hypot(surLigne[0][0] - surLigne[1][0], surLigne[0][1] - surLigne[1][1]);
          if (d > 4) r.voisins.push(o.id);
        }
      });
    });
    return regions;
  }

  // ---------- Partie ----------
  function nouvellePartie(graine) {
    graine = graine || (Date.now() % 1e9);
    var alea = hasard(graine);
    var regions = construireCarte().map(function (r) {
      var armee = [];
      if (r.capitale) armee = ['epee', 'lance', 'arc'].map(creerUnite);
      else {
        var n = 1 + Math.floor(alea() * 2);
        for (var i = 0; i < n; i++) armee.push(creerUnite(alea() < 0.6 ? 'lance' : 'epee'));
      }
      return {
        id: r.id, nom: r.nom, x: r.x, y: r.y, cx: r.cx, cy: r.cy, poly: r.poly, voisins: r.voisins,
        capitale: r.capitale, proprio: r.depart,
        revenu: r.capitale ? 50 : 20 + Math.floor(alea() * 4) * 5,
        armee: armee
      };
    });
    return {
      v: 1, graine: graine, tour: 1, alea: graine,
      or: [150, 150, 150, 150],
      regions: regions,
      journal: ['Tour 1 : prends ton premier territoire !'],
      fin: null
    };
  }

  function aleaPartie(etat) {
    var f = hasard(etat.alea);
    etat.alea = Math.floor(f() * 4294967295);
    return f;
  }

  function revenu(etat, f) {
    return etat.regions.reduce(function (s, r) { return s + (r.proprio === f ? r.revenu : 0); }, 0);
  }
  function nbRegions(etat, f) {
    return etat.regions.filter(function (r) { return r.proprio === f; }).length;
  }

  function recruter(etat, regionId, t) {
    var r = etat.regions[regionId], f = r.proprio;
    if (f < 0) return 'Région rebelle.';
    if (etat.or[f] < UNITES[t].cout) return "Pas assez d'or.";
    if (r.armee.length >= MAX_UNITES) return 'Région pleine (' + MAX_UNITES + ' unités max).';
    etat.or[f] -= UNITES[t].cout;
    var u = creerUnite(t); u.bouge = true; // une nouvelle recrue ne bouge pas ce tour-ci
    r.armee.push(u);
    return null;
  }

  // Déplace des unités vers une région voisine qui nous appartient.
  function deplacer(etat, de, vers, indices) {
    var a = etat.regions[de], b = etat.regions[vers];
    if (a.voisins.indexOf(vers) < 0) return 'Pas voisine.';
    if (b.proprio !== a.proprio) return 'Région ennemie : il faut attaquer.';
    var unites = prendre(a, indices);
    if (b.armee.length + unites.length > MAX_UNITES) { a.armee = a.armee.concat(unites); return 'Trop d\'unités là-bas.'; }
    unites.forEach(function (u) { u.bouge = true; });
    b.armee = b.armee.concat(unites);
    return null;
  }

  function prendre(region, indices) {
    var pris = [], restants = [];
    region.armee.forEach(function (u, i) { (indices.indexOf(i) >= 0 && !u.bouge ? pris : restants).push(u); });
    region.armee = restants;
    return pris;
  }

  // ---------- Bataille (simulation temps réel, utilisée aussi pour la résolution auto) ----------
  function creerBataille(attaquants, defenseurs, graine) {
    var escouades = [];
    function placer(liste, camp) {
      var y0 = camp === 0 ? CHAMP.h - 110 : 110, sens = camp === 0 ? 1 : -1;
      var front = liste.filter(function (u) { return u.t === 'epee' || u.t === 'lance'; });
      var arriere = liste.filter(function (u) { return u.t === 'arc'; });
      var flancs = liste.filter(function (u) { return u.t === 'cav'; });
      function ligne(l, y) {
        l.forEach(function (u, i) {
          var x = CHAMP.l / 2 + (i - (l.length - 1) / 2) * 52;
          escouades.push(nouvelleEscouade(u, camp, x, y));
        });
      }
      ligne(front, y0 - sens * 0);
      ligne(arriere, y0 + sens * 45);
      flancs.forEach(function (u, i) {
        var cote = i % 2 === 0 ? -1 : 1, rang = Math.floor(i / 2);
        var x = CHAMP.l / 2 + cote * (Math.max(front.length, 2) * 26 + 40 + rang * 30);
        escouades.push(nouvelleEscouade(u, camp, Math.max(20, Math.min(CHAMP.l - 20, x)), y0 + sens * 10));
      });
    }
    function nouvelleEscouade(u, camp, x, y) {
      return { id: escouades.length, camp: camp, t: u.t, hp: u.hp, hpMax: pvMax(u.t), x: x, y: y,
        ordre: null, cible: null, fuite: false, sorti: false, contact: 0, tirT: 0, source: u };
    }
    placer(attaquants, 0);
    placer(defenseurs, 1);
    return { esc: escouades, temps: 0, fin: null, alea: hasard(graine || 7), tenir: [false, false] };
  }

  function vivant(e) { return e.hp > 0 && !e.fuite && !e.sorti; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

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

  function etape(b, dt) {
    if (b.fin) return;
    b.temps += dt;
    b.esc.forEach(function (e) {
      if (e.hp <= 0 || e.sorti) return;
      var U = UNITES[e.t];
      if (e.fuite) {
        avancer(e, e.x, e.camp === 0 ? CHAMP.h + 60 : -60, U.vit * 1.1, dt);
        if (e.y > CHAMP.h + 20 || e.y < -20) e.sorti = true;
        return;
      }
      // Choix de la cible : l'ordre du commandant d'abord, sinon l'ennemi le plus proche.
      var cible = null;
      if (e.ordre && e.ordre.cible != null) {
        var c = b.esc[e.ordre.cible];
        if (vivant(c)) cible = c; else e.ordre = null;
      }
      if (!cible && e.ordre && e.ordre.x != null) {
        avancer(e, e.ordre.x, e.ordre.y, U.vit, dt);
        if (Math.hypot(e.ordre.x - e.x, e.ordre.y - e.y) < 2) e.ordre = null;
        var proche = plusProche(b, e);
        if (proche && dist(e, proche) < CONTACT) cible = proche; else { e.cible = null; return; }
      }
      if (!cible) cible = plusProche(b, e);
      e.cible = cible ? cible.id : null;
      if (!cible) return;
      var d = dist(e, cible);
      var hommesE = Math.ceil(e.hp / U.pv), V = UNITES[cible.t];
      var tenir = b.tenir[e.camp] && !(e.ordre && e.ordre.cible != null);
      if (U.portee && d > CONTACT) {
        if (d <= U.portee) {
          var deg = hommesE * U.tir * 0.22 / V.def * (0.8 + b.alea() * 0.4);
          cible.hp -= deg * dt;
        } else if (!tenir) avancer(e, cible.x, cible.y, U.vit, dt);
      } else if (d > CONTACT) {
        if (!tenir) avancer(e, cible.x, cible.y, U.vit, dt);
        e.contact = 0;
      } else {
        e.contact += dt;
        var mult = (U.bonus[cible.t] || 1) * (U.charge && e.contact < 2.5 ? U.charge : 1);
        var degats = hommesE * U.atq * mult * 0.35 / V.def * (0.8 + b.alea() * 0.4);
        cible.hp -= degats * dt;
      }
    });
    // Moral : une unité qui a perdu 75 % de ses hommes s'enfuit.
    b.esc.forEach(function (e) {
      if (e.hp <= 0) { e.hp = 0; return; }
      if (!e.fuite && e.hp / e.hpMax < 0.25) e.fuite = true;
    });
    // Les unités d'un même camp ne se superposent pas.
    for (var i = 0; i < b.esc.length; i++) {
      for (var j = i + 1; j < b.esc.length; j++) {
        var p = b.esc[i], q = b.esc[j];
        if (!vivant(p) || !vivant(q) || p.camp !== q.camp) continue;
        var dx = q.x - p.x, dy = q.y - p.y, dd = Math.hypot(dx, dy) || 0.01;
        if (dd < 30) {
          var push = (30 - dd) / 2;
          p.x -= dx / dd * push; p.y -= dy / dd * push;
          q.x += dx / dd * push; q.y += dy / dd * push;
        }
      }
    }
    b.esc.forEach(function (e) {
      e.x = Math.max(10, Math.min(CHAMP.l - 10, e.x));
      if (!e.fuite) e.y = Math.max(10, Math.min(CHAMP.h - 10, e.y));
    });
    var reste = [0, 0];
    b.esc.forEach(function (e) { if (vivant(e)) reste[e.camp]++; });
    if (!reste[0] || !reste[1] || b.temps > 300) {
      b.fin = { gagnant: reste[0] && !reste[1] ? 0 : (reste[1] && !reste[0] ? 1 : 1) }; // égalité : le défenseur tient
    }
  }

  function resoudreAuto(b) {
    var garde = 0;
    while (!b.fin && garde++ < 5000) etape(b, 0.1);
    return b.fin;
  }

  // Survivants d'un camp après la bataille (les fuyards reviennent, un peu affaiblis).
  function survivants(b, camp) {
    return b.esc.filter(function (e) { return e.camp === camp && e.hp > 0; }).map(function (e) {
      var u = e.source;
      u.hp = Math.max(UNITES[u.t].pv, e.fuite ? e.hp * 0.7 : e.hp);
      u.bouge = true;
      return u;
    });
  }

  // Lance une attaque : retire les unités de la région de départ et renvoie ce qu'il faut pour la bataille.
  function preparerAttaque(etat, de, vers, indices) {
    var a = etat.regions[de], cibleR = etat.regions[vers];
    if (a.voisins.indexOf(vers) < 0) return { erreur: 'Pas voisine.' };
    if (cibleR.proprio === a.proprio) return { erreur: 'Déjà à toi.' };
    var unites = prendre(a, indices);
    if (!unites.length) return { erreur: 'Aucune unité choisie.' };
    return { de: de, vers: vers, camp: a.proprio, unites: unites, defense: cibleR.armee };
  }

  // Applique le résultat d'une bataille terminée sur la carte.
  function appliquerBataille(etat, att, bataille) {
    var a = etat.regions[att.de], c = etat.regions[att.vers];
    var gagnant = bataille ? bataille.fin.gagnant : 0;
    var survA = bataille ? survivants(bataille, 0) : att.unites;
    var survD = bataille ? survivants(bataille, 1) : [];
    var ancien = c.proprio;
    var nomA = (FACTIONS[att.camp] || NEUTRE).nom, nomD = (FACTIONS[ancien] || NEUTRE).nom;
    if (gagnant === 0) {
      c.proprio = att.camp;
      c.armee = survA.slice(0, MAX_UNITES);
      log(etat, '⚔️ ' + nomA + ' prend ' + c.nom + ' à ' + nomD + '.');
      verifierFin(etat);
    } else {
      c.armee = survD;
      a.armee = a.armee.concat(survA).slice(0, MAX_UNITES);
      log(etat, '🛡️ ' + nomD + ' repousse ' + nomA + ' à ' + c.nom + '.');
    }
    return gagnant === 0;
  }

  function log(etat, txt) {
    etat.journal.unshift(txt);
    if (etat.journal.length > 30) etat.journal.length = 30;
  }

  function verifierFin(etat) {
    if (nbRegions(etat, 0) === 0) etat.fin = 'defaite';
    else if ([1, 2, 3].every(function (f) { return nbRegions(etat, f) === 0; })) etat.fin = 'victoire';
  }

  // ---------- IA ----------
  // Joue les 3 factions ennemies. Les attaques contre une région du joueur défendue
  // sont renvoyées pour que le joueur puisse commander sa défense.
  function tourIA(etat) {
    var alea = aleaPartie(etat), pourJoueur = [];
    [1, 2, 3].forEach(function (f) {
      var miennes = etat.regions.filter(function (r) { return r.proprio === f; });
      if (!miennes.length) return;
      // 1. Recruter, en priorité aux frontières menacées.
      miennes.sort(function (x, y) { return menace(etat, y) - menace(etat, x); });
      var essais = 0;
      while (etat.or[f] >= 50 && essais++ < 20) {
        var r = miennes[essais % Math.min(miennes.length, 3)];
        var t = alea() < 0.3 ? 'lance' : alea() < 0.5 ? 'epee' : alea() < 0.6 ? 'arc' : 'cav';
        if (etat.or[f] < UNITES[t].cout) t = 'lance';
        if (recruter(etat, r.id, t)) continue;
      }
      // 2. Attaquer un voisin plus faible.
      miennes.forEach(function (r) {
        if (r.proprio !== f) return;
        var dispo = r.armee.map(function (u, i) { return u.bouge ? -1 : i; }).filter(function (i) { return i >= 0; });
        if (!dispo.length) return;
        var cibles = r.voisins.map(function (id) { return etat.regions[id]; }).filter(function (c) { return c.proprio !== f; });
        if (!cibles.length) return;
        cibles.sort(function (x, y) { return force(x.armee) - force(y.armee); });
        var cible = cibles[0];
        // Garde une unité à la maison si un autre ennemi est à côté.
        var envoi = dispo.slice();
        if (cibles.length > 1 && envoi.length > 1 && r.armee.length === dispo.length) envoi.pop();
        var fEnvoi = force(envoi.map(function (i) { return r.armee[i]; }));
        var audace = etat.tour < 3 ? 1.6 : 1.25;
        if (fEnvoi < force(cible.armee) * audace + 20) return;
        var att = preparerAttaque(etat, r.id, cible.id, envoi);
        if (att.erreur) return;
        if (cible.proprio === 0 && cible.armee.length) { pourJoueur.push(att); return; }
        if (!cible.armee.length) { appliquerBataille(etat, att, null); return; }
        var b = creerBataille(att.unites, cible.armee, Math.floor(alea() * 1e9));
        resoudreAuto(b);
        appliquerBataille(etat, att, b);
      });
    });
    return pourJoueur;
  }

  function menace(etat, r) {
    return r.voisins.reduce(function (s, id) {
      var v = etat.regions[id];
      return s + (v.proprio !== r.proprio && v.proprio >= 0 ? force(v.armee) : 0);
    }, 0);
  }

  // Fin du tour du joueur : revenus, soins, puis l'IA joue.
  function finDuTour(etat) {
    [0, 1, 2, 3].forEach(function (f) { etat.or[f] += revenu(etat, f) + (f > 0 ? 10 : 0); });
    etat.regions.forEach(function (r) {
      r.armee.forEach(function (u) { u.bouge = false; u.hp = Math.min(pvMax(u.t), u.hp + pvMax(u.t) * 0.15); });
    });
    var defenses = tourIA(etat);
    etat.regions.forEach(function (r) { r.armee.forEach(function (u) { u.bouge = false; }); });
    etat.tour++;
    verifierFin(etat);
    return defenses;
  }

  var M = {
    LARGEUR: LARGEUR, HAUTEUR: HAUTEUR, CHAMP: CHAMP, MAX_UNITES: MAX_UNITES,
    UNITES: UNITES, TYPES: TYPES, FACTIONS: FACTIONS, NEUTRE: NEUTRE,
    construireCarte: construireCarte, nouvellePartie: nouvellePartie,
    pvMax: pvMax, hommes: hommes, force: force, revenu: revenu, nbRegions: nbRegions,
    recruter: recruter, deplacer: deplacer, preparerAttaque: preparerAttaque,
    creerBataille: creerBataille, etape: etape, resoudreAuto: resoudreAuto, vivant: vivant,
    appliquerBataille: appliquerBataille, finDuTour: finDuTour, tourIA: tourIA, verifierFin: verifierFin, log: log
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.Moteur = M;
})(this);
