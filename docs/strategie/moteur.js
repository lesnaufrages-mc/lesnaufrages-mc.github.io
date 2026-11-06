/* Imperium of Wars — moteur du jeu (aucun code d'affichage ici).
   Marche dans le navigateur ET dans Node : réutilisable dans l'appli Expo et testable. */
(function (root) {
  'use strict';
  var MONDE = root.MONDE || require('./monde.js');
  var HISTOIRE = root.HISTOIRE || require('./histoire.js');
  var PERSOS = root.PERSONNAGES || require('./personnages.js');

  var MAX_UNITES = 8;

  // Extensions (ex. l'Édition Couronne, couronne.js) : elles ajoutent leurs règles à ces moments du jeu.
  // ext('revenu', etat, f) additionne ce que chaque extension renvoie (0 si rien).
  var EXT = [];
  function ext(nom, etat, a, b) {
    return EXT.reduce(function (s, x) { var v = x[nom] ? x[nom](etat, a, b) : 0; return s + (+v || 0); }, 0);
  }
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
    ferme:   { nom: 'Fermes',   ico: '🌾', niveaux: ['Fermes', 'Moulins'], couts: [60, 150], effet: '+5 / +12 or et soigne la garnison' },
    port:    { nom: 'Port',     ico: '⚓', niveaux: ['Port', 'Chantier naval', 'Arsenal maritime'], couts: [100, 220, 400], effet: 'Construit des navires, enrichit le commerce et répare la flotte', cotier: true }
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

  // ---------- Mers et marine ----------
  var MERS = HISTOIRE.MERS || {};
  var COTES = PROV.map(function () { return []; });
  Object.keys(MERS).forEach(function (m) { MERS[m].provinces.split(' ').forEach(function (id) { COTES[INDEX[id]].push(m); }); });
  // PORTEE[i] : provinces côtières qu'une flotte partie de i peut atteindre (même mer ou mer voisine).
  var PORTEE = PROV.map(function (P, i) {
    var mers = {};
    COTES[i].forEach(function (m) { mers[m] = 1; MERS[m].voisines.forEach(function (v) { mers[v] = 1; }); });
    return PROV.map(function (Q, j) { return j; }).filter(function (j) { return j !== i && COTES[j].some(function (m) { return mers[m]; }); });
  });
  function estCotiere(i) { return COTES[i].length > 0; }
  function nomMer(i, j) {
    var m = COTES[j].filter(function (x) { return COTES[i].indexOf(x) >= 0; })[0] || COTES[j][0];
    return m ? MERS[m].nom : 'la mer';
  }
  var NAVIRES = {
    galere:   { nom: 'Galère', ico: '🚣', cout: 80, pv: 60, atq: 6, cap: 2, annee: 0, port: 1 },
    cogue:    { nom: 'Cogue', ico: '⛵', cout: 110, pv: 90, atq: 7, cap: 3, annee: 1150, port: 1 },
    caraque:  { nom: 'Caraque', ico: '⛵', cout: 170, pv: 130, atq: 11, cap: 4, annee: 1400, port: 2 },
    galion:   { nom: 'Galion', ico: '⛵', cout: 230, pv: 170, atq: 17, cap: 5, annee: 1550, port: 2 },
    vaisseau: { nom: 'Vaisseau de ligne', ico: '⚓', cout: 320, pv: 230, atq: 28, cap: 4, annee: 1650, port: 3 }
  };
  var TYPES_NAV = Object.keys(NAVIRES), MAX_NAVIRES = 6;
  var MARITIMES = ['byzance', 'venise', 'normandssicile', 'sicile', 'aragon', 'portugal', 'hollande', 'bretagne', 'danemark', 'vikings', 'norvege', 'kalmar', 'genes', 'ottomans', 'fatimides', 'barbaresques'];
  function creerNavire(t) { return { t: t, hp: NAVIRES[t].pv, bouge: false }; }
  function blocageNavire(etat, id, t) {
    var N = NAVIRES[t], p = etat.provinces[id];
    if (!estCotiere(id)) return 'Pas de côte ici.';
    if (N.annee > etat.annee) return 'Disponible en ' + N.annee;
    if ((p.bat.port || 0) < N.port) return 'Port niv. ' + N.port;
    return null;
  }
  function meilleurNavire(etat, id) {
    var l = TYPES_NAV.filter(function (t) { return !blocageNavire(etat, id, t); });
    return l.sort(function (a, b) { return NAVIRES[b].cout - NAVIRES[a].cout; })[0] || null;
  }
  function construireNavire(etat, id, t) {
    var p = etat.provinces[id], f = p.proprio;
    if (f < 0) return 'Province rebelle.';
    var b = blocageNavire(etat, id, t);
    if (b) return b;
    if (etat.factions[f].or < NAVIRES[t].cout) return "Pas assez d'or.";
    if (p.flotte.length >= MAX_NAVIRES) return 'Port plein (' + MAX_NAVIRES + ' navires max).';
    etat.factions[f].or -= NAVIRES[t].cout;
    var n = creerNavire(t); n.bouge = true;
    p.flotte.push(n);
    return null;
  }
  function forceFlotte(fl) { return fl.reduce(function (s, n) { return s + NAVIRES[n.t].atq * n.hp / NAVIRES[n.t].pv; }, 0); }
  function capacite(fl) { return fl.reduce(function (s, n) { return s + (n.bouge ? 0 : NAVIRES[n.t].cap); }, 0); }
  function entretienNavire(t) { return Math.ceil(NAVIRES[t].cout / 30); }
  // Flottes du propriétaire de « vers » qui gardent ses côtes (même mer).
  function flotteDefense(etat, vers) {
    var f = etat.provinces[vers].proprio;
    if (f < 0) return [];
    return etat.provinces.map(function (p, j) { return j; }).filter(function (j) {
      var p = etat.provinces[j];
      return p.proprio === f && p.flotte && p.flotte.length && (j === vers || COTES[j].some(function (m) { return COTES[vers].indexOf(m) >= 0; }));
    });
  }
  // Bataille navale : les navires (modifiés sur place) échangent des bordées pendant 6 rounds au plus.
  function combatNaval(att, def, alea, bonusDef) {
    var tours = [], vie = function () { return { a: att.map(function (n) { return Math.round(n.hp); }), d: def.map(function (n) { return Math.round(n.hp); }) }; };
    tours.push(vie());
    for (var r = 0; r < 6; r++) {
      var vA = att.filter(function (n) { return n.hp > 0; }), vD = def.filter(function (n) { return n.hp > 0; });
      if (!vA.length || !vD.length) break;
      var tirs = [];
      vA.forEach(function (n) { tirs.push([vD[Math.floor(alea() * vD.length)], NAVIRES[n.t].atq * (0.6 + 0.8 * alea()) * 2.2]); });
      vD.forEach(function (n) { tirs.push([vA[Math.floor(alea() * vA.length)], NAVIRES[n.t].atq * (0.6 + 0.8 * alea()) * 2.2 * (1 + bonusDef)]); });
      tirs.forEach(function (t) { t[0].hp = Math.max(0, t[0].hp - t[1]); });
      tours.push(vie());
    }
    var fA = forceFlotte(att), fD = forceFlotte(def);
    return { gagnant: fD <= 0 ? 0 : fA <= 0 ? 1 : fA > fD * (1 + bonusDef) ? 0 : 1, tours: tours };
  }
  // Transport de troupes par la mer entre deux provinces à soi.
  function naviguer(etat, de, vers, indices) {
    var a = etat.provinces[de], b = etat.provinces[vers];
    if (PORTEE[de].indexOf(vers) < 0) return 'Trop loin par la mer.';
    if (b.proprio !== a.proprio) return 'Province ennemie : il faut débarquer.';
    var navires = a.flotte.filter(function (n) { return !n.bouge; });
    if (!navires.length) return 'Aucun navire disponible ici.';
    if (b.flotte.length + navires.length > MAX_NAVIRES) return 'Port plein là-bas.';
    var libres = indices.filter(function (k) { return a.armee[k] && !a.armee[k].bouge; });
    if (libres.length > capacite(a.flotte)) return 'Tes navires ne portent que ' + capacite(a.flotte) + ' unités.';
    if (b.armee.length + libres.length > MAX_UNITES) return "Trop d'unités là-bas.";
    var unites = prendre(a, libres);
    unites.forEach(function (u) { u.bouge = true; });
    navires.forEach(function (n) { n.bouge = true; });
    a.flotte = a.flotte.filter(function (n) { return navires.indexOf(n) < 0; });
    b.armee = b.armee.concat(unites);
    b.flotte = b.flotte.concat(navires);
    return null;
  }
  // Débarquement : la flotte emmène des troupes attaquer une côte. D'abord la bataille navale
  // contre les flottes qui gardent cette côte, puis (si elle est gagnée) la bataille à terre.
  function preparerDebarquement(etat, de, vers, indices) {
    var a = etat.provinces[de], c = etat.provinces[vers];
    if (PORTEE[de].indexOf(vers) < 0) return { erreur: 'Trop loin par la mer.' };
    if (c.proprio === a.proprio) return { erreur: 'Déjà à toi.' };
    if (a.proprio === etat.joueur && c.proprio >= 0 && relation(etat, c.proprio) !== 'guerre')
      return { erreur: 'Tu es en ' + relation(etat, c.proprio) + ' avec ' + etat.factions[c.proprio].nom + '.', paix: c.proprio };
    var navires = a.flotte.filter(function (n) { return !n.bouge; });
    if (!navires.length) return { erreur: 'Aucun navire disponible ici.' };
    var libres = indices.filter(function (k) { return a.armee[k] && !a.armee[k].bouge; });
    if (!libres.length) return { erreur: 'Aucune unité choisie.' };
    if (libres.length > capacite(a.flotte)) return { erreur: 'Tes navires ne portent que ' + capacite(a.flotte) + ' unités.' };
    var unites = prendre(a, libres);
    navires.forEach(function (n) { n.bouge = true; });
    a.flotte = a.flotte.filter(function (n) { return navires.indexOf(n) < 0; });
    var att = { de: de, vers: vers, camp: a.proprio, unites: unites, flotte: navires, mer: true };
    var gardes = flotteDefense(etat, vers);
    if (gardes.length) {
      var def = [];
      gardes.forEach(function (j) { def = def.concat(etat.provinces[j].flotte); });
      var typesA = navires.map(function (n) { return n.t; }), typesD = def.map(function (n) { return n.t; });
      var r = combatNaval(navires, def, aleaPartie(etat), 0.1 * (c.bat.port || 0));
      gardes.forEach(function (j) { etat.provinces[j].flotte = etat.provinces[j].flotte.filter(function (n) { return n.hp > 0; }); });
      att.flotte = navires.filter(function (n) { return n.hp > 0; });
      att.naval = { gagnant: r.gagnant, tours: r.tours, a: typesA, d: typesD, mer: nomMer(de, vers), campD: c.proprio };
      var coules = [typesA.length - att.flotte.length, typesD.length - def.filter(function (n) { return n.hp > 0; }).length];
      att.naval.coules = coules;
      var msg = '⚓ Bataille navale en ' + att.naval.mer + ' : ' + nomF(etat, att.camp) + (r.gagnant === 0 ? ' bat la flotte de ' : ' est repoussé par la flotte de ') + nomF(etat, c.proprio) + ' (' + coules[0] + ' contre ' + coules[1] + ' navires coulés).';
      log(etat, msg);
      if (c.proprio === etat.joueur && att.camp !== etat.joueur) etat.nouvelles.push(msg);
      if (r.gagnant === 1) {
        // Échec : les troupes souffrent en mer et rentrent au port.
        att.unites.forEach(function (u) { u.hp = Math.max(UNITES[u.t].pv, u.hp * 0.6); u.bouge = true; });
        a.armee = a.armee.concat(att.unites).slice(0, MAX_UNITES);
        a.flotte = a.flotte.concat(att.flotte).slice(0, MAX_NAVIRES);
        att.echec = true;
      }
    }
    return att;
  }

  function epoque(id) { return HISTOIRE.EPOQUES.filter(function (e) { return e.id === id; })[0]; }

  // ---------- Partie ----------
  function nouvellePartie(epoqueId, factionId, graine, opts) {
    graine = graine || (Date.now() % 1e9);
    var E = epoque(epoqueId), alea = hasard(graine);
    var factions = E.factions.map(function (f) {
      return { id: f[0], nom: f[1], coul: f[2], capitale: INDEX[f[3][0]], or: 200 };
    });
    var joueur = factions.map(function (f) { return f.id; }).indexOf(factionId);
    var provinces = PROV.map(function (p, i) {
      return { proprio: -1, armee: [], flotte: [], bat: { murs: alea() < 0.4 ? 1 : 0, caserne: 0, marche: 0, ferme: 0, port: 0 },
        base: 15 + Math.floor(alea() * 4) * 5, construit: false, impots: 1, ordre: 65, agit: 0 };
    });
    E.factions.forEach(function (f, fi) {
      f[3].forEach(function (id, k) {
        var p = provinces[INDEX[id]];
        p.proprio = fi;
        if (k === 0) {
          p.bat = { murs: 2, caserne: 1, marche: 1, ferme: 1, port: 0 };
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
    // Ports et flottes de départ : capitales côtières, et toutes les côtes des puissances maritimes.
    E.factions.forEach(function (f, fi) {
      var marin = MARITIMES.indexOf(f[0]) >= 0;
      f[3].forEach(function (id, k) {
        var i = INDEX[id], p = provinces[i];
        if (!estCotiere(i) || (k > 0 && !(marin && alea() < 0.5))) return;
        p.bat.port = marin && k === 0 ? 2 : 1;
        var types = TYPES_NAV.filter(function (t) { return NAVIRES[t].annee <= E.annee && NAVIRES[t].port <= p.bat.port; });
        var n = k === 0 ? (marin ? 3 : 1) : 1;
        for (var q = 0; q < n && types.length; q++) p.flotte.push(creerNavire(types[types.length - 1 - (q % Math.min(2, types.length))]));
      });
    });
    var pas = Math.max(1, Math.round((HISTOIRE.FIN - E.annee) / 150));
    var etat = {
      v: 2, epoque: epoqueId, annee: E.annee, pas: pas, tour: 1, joueur: joueur,
      factions: factions, provinces: provinces, alea: graine,
      journal: [E.annee + ' : ' + E.titre + '. Tu diriges ' + factions[joueur].nom + '.'],
      fin: null, nouvelles: []
    };
    initDiplo(etat, alea);
    creerCour(etat, alea);
    assurerConseil(etat);
    if (opts && opts.couronne) etat.couronne = true;
    EXT.forEach(function (x) { if (x.partie) x.partie(etat, alea); });
    etat.provinces.forEach(function (p, i) { p.ordre = cibleOrdre(etat, i); });
    return etat;
  }

  function armeeDepart(annee, n, alea, rebelles) {
    var dispo = TYPES.filter(function (t) { return UNITES[t].annee <= annee && UNITES[t].caserne <= (rebelles ? 0 : 2) && t !== 'canon'; });
    var a = [];
    for (var i = 0; i < n; i++) a.push(creerUnite(dispo[Math.floor(alea() * dispo.length)]));
    return a;
  }

  // ---------- Gestion : impôts, entretien, ordre public ----------
  var IMPOTS = [
    { nom: 'Bas', ico: '🪶', mult: 0.6, ordre: 15 },
    { nom: 'Normal', ico: '⚖️', mult: 1, ordre: 0 },
    { nom: 'Élevé', ico: '💰', mult: 1.4, ordre: -20 }
  ];
  function niveauImpots(p) { return p.impots == null ? 1 : p.impots; }
  function revenuProvince(p) {
    return Math.round((p.base + BONUS_MARCHE[p.bat.marche] + BONUS_FERME[p.bat.ferme]) * IMPOTS[niveauImpots(p)].mult);
  }
  function entretienUnite(t) { return Math.ceil(UNITES[t].cout / 25); }
  function entretien(etat, f) {
    var e = etat.provinces.reduce(function (s, p) {
      return s + (p.proprio === f ? p.armee.reduce(function (t, u) { return t + entretienUnite(u.t); }, 0) + (p.flotte || []).reduce(function (t, n) { return t + entretienNavire(n.t); }, 0) : 0);
    }, 0);
    return Math.round(e * Math.max(0.3, 1 - (f === etat.joueur ? 0.03 * bonusConseil(etat, 'marechal') : 0) + ext('entretien', etat, f)));
  }
  function estCapitale(etat, i) { var f = etat.provinces[i].proprio; return f >= 0 && etat.factions[f].capitale === i; }
  // Ce que chaque cause ajoute ou retire à l'ordre public d'une province (affiché au joueur).
  function detailOrdre(etat, i) {
    var p = etat.provinces[i], f = p.proprio, d = [];
    if (f < 0) return d;
    d.push(['Base', 50]);
    if (estCapitale(etat, i)) d.push(['👑 Capitale', 20]);
    var imp = IMPOTS[niveauImpots(p)];
    if (imp.ordre) d.push([imp.ico + ' Impôts ' + imp.nom.toLowerCase(), imp.ordre]);
    if (p.armee.length) d.push(['🛡️ Garnison', Math.min(20, 4 * p.armee.length)]);
    if (p.bat.murs) d.push(['🏰 Remparts', 5 * p.bat.murs]);
    var taille = Math.min(25, Math.floor(nbProvinces(etat, f) * 0.7));
    if (taille) d.push(['🗺️ Taille du royaume', -taille]);
    if (p.agit) d.push(['🔥 Conquête récente', -p.agit]);
    var F = etat.factions[f];
    if (F.empires && F.empires.length) d.push(['🦅 Empire restauré', 5 * Math.min(2, F.empires.length)]);
    if (f === etat.joueur) {
      var ch = Math.floor(bonusConseil(etat, 'chapelain') / 2);
      if (ch) d.push(['⛪ ' + nomRole(F, 'chapelain'), ch]);
      var lx = luxes(etat, f).length;
      if (lx) d.push(['💎 Produits de luxe (' + lx + ')', 2 * Math.min(4, lx)]);
    }
    EXT.forEach(function (x) { if (x.ordre) x.ordre(etat, i, d); });
    return d;
  }
  function cibleOrdre(etat, i) {
    return Math.max(0, Math.min(100, detailOrdre(etat, i).reduce(function (s, x) { return s + x[1]; }, 0)));
  }
  function changerImpots(etat, i, n) {
    var p = etat.provinces[i];
    if (p.proprio !== etat.joueur) return 'Pas ta province.';
    p.impots = Math.max(0, Math.min(2, n));
    return null;
  }
  // Ordre public, révoltes et entretien de l'armée, une fois par tour.
  function tourGestion(etat, alea) {
    etat.provinces.forEach(function (p, i) {
      if (p.proprio < 0) return;
      if (p.ordre == null) p.ordre = 65;
      var cible = cibleOrdre(etat, i);
      p.ordre += Math.max(-10, Math.min(10, cible - p.ordre));
      p.agit = Math.max(0, (p.agit || 0) - 5);
      if (p.ordre >= 25 || alea() > 0.25 + (25 - p.ordre) / 50) return;
      // Révolte : des paysans armés contre la garnison.
      var f = p.proprio, n = 1 + Math.floor((25 - p.ordre) / 8);
      var rebelles = [];
      for (var k = 0; k < n; k++) rebelles.push(creerUnite(k % 3 === 2 ? 'arc' : 'milice'));
      var ok = false;
      if (p.armee.length) {
        var b = creerBataille(p.armee, rebelles, Math.floor(alea() * 1e9), { defenseur: 0, murs: 0 });
        resoudreAuto(b);
        ok = b.fin.gagnant === 0;
        p.armee = survivants(b, 0);
      }
      var msg;
      if (ok) {
        p.ordre = Math.min(100, p.ordre + 15);
        msg = '🔥 Révolte écrasée à ' + PROV[i].nom + ' (' + nomF(etat, f) + ').';
      } else {
        p.proprio = -1;
        p.armee = rebelles.slice(0, MAX_UNITES);
        p.impots = 1;
        p.ordre = 50;
        msg = '🔥 ' + PROV[i].nom + ' se révolte et chasse ' + nomF(etat, f) + ' !';
        if (nbProvinces(etat, f) === 0) log(etat, '💀 ' + nomF(etat, f) + ' a disparu !');
      }
      log(etat, msg);
      if (f === etat.joueur) { etat.nouvelles.push(msg); etat.rapport.revoltes.push(i); }
    });
    etat.factions.forEach(function (F, f) {
      var cout = entretien(etat, f);
      F.or -= cout;
      if (f === etat.joueur) {
        etat.rapport.entretien = cout;
        etat.rapport.salaires = salaires(etat);
        F.or -= etat.rapport.salaires;
      }
      // Plus d'or : des soldats désertent.
      var garde = 0;
      while (F.or < 0 && garde++ < 20) {
        var pire = null;
        etat.provinces.forEach(function (p, i) {
          if (p.proprio === f && p.armee.length && (!pire || p.armee.length > etat.provinces[pire].armee.length)) pire = i;
        });
        if (pire == null) break;
        var u = etat.provinces[pire].armee.pop();
        F.or += entretienUnite(u.t) * 3;
        if (f === etat.joueur) etat.nouvelles.push('💸 Caisses vides : ' + UNITES[u.t].nom.toLowerCase() + ' désertent à ' + PROV[pire].nom + '.');
      }
      if (F.or < 0) F.or = 0;
    });
  }

  // ---------- Cour : souverains, familles et mariages ----------
  var PAPES = ['Grégoire', 'Innocent', 'Clément', 'Urbain', 'Benoît', 'Léon', 'Boniface', 'Pie', 'Alexandre', 'Jean'];
  var ROMAINS = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  var LIENS_ENFANT = { m: 'fils', f: 'fille' };
  var PRIORITE = ['fils', 'petit-fils', 'frère', 'neveu', 'fille', 'petite-fille', 'sœur', 'nièce', 'belle-sœur', 'oncle', 'cousin', 'petit-neveu', 'tante', 'cousine'];

  function age(etat, p) { return etat.annee - p.ne; }
  function nomsCulture(c) { return PERSOS.NOMS[c] || PERSOS.NOMS.franc; }
  function nomAlea(etat, F, sexe, alea) {
    var liste = nomsCulture(F.cour.c)[sexe], pris = {};
    [F.roi].concat(F.cour.fam).forEach(function (p) { pris[p.nom] = true; });
    var libres = liste.filter(function (n) { return !pris[n]; });
    return (libres.length ? libres : liste)[Math.floor(alea() * (libres.length || liste.length))];
  }
  function lookCulture(c, alea) {
    var tete = { turc: 'turban', arabe: 'turban', perse: 'turban', steppe: 'fourrure', slave: 'kalpak', byz: 'byzance' }[c] || 'couronne';
    var ch = ['brun', 'noir', 'blond', 'roux'][Math.floor(alea() * (c === 'nord' || c === 'germ' || c === 'anglais' ? 4 : 2))];
    return { barbe: ['pleine', 'courte', 'moustache', 'rase'][Math.floor(alea() * 4)], ch: ch, tete: tete };
  }
  function creerCour(etat, alea) {
    var data = PERSOS.EPOQUES[etat.epoque] || {};
    etat.factions.forEach(function (F) {
      var d = data[F.id] || { c: 'franc', roi: [F.nom.split(' ')[0], etat.annee - 40, 'm'], dyn: F.nom, barbe: 'pleine', ch: 'brun', tete: 'couronne' };
      F.cour = { c: d.c, dyn: d.dyn, elu: !!d.elu, fam: [] };
      F.roi = { nom: d.roi[0], ne: d.roi[1], sexe: d.roi[2], look: { barbe: d.barbe, ch: d.ch, tete: d.tete }, fragile: !!d.fragile };
      F.conj = d.conj ? { nom: d.conj[0], ne: d.conj[1], sexe: d.roi[2] === 'm' ? 'f' : 'm', de: -1 } : null;
      (d.fam || []).forEach(function (m) {
        if (m[1] <= etat.annee) F.cour.fam.push({ nom: m[0], ne: m[1], sexe: m[2], lien: m[3] });
      });
    });
  }
  function assurerCour(etat) {
    if (!etat.factions[0].roi) creerCour(etat, aleaPartie(etat));
    if (!etat.rapport) etat.rapport = { cour: [], revoltes: [], entretien: 0 };
    etat.provinces.forEach(function (p) { if (p.ordre == null) p.ordre = 65; if (p.impots == null) p.impots = 1; if (p.agit == null) p.agit = 0; if (!p.flotte) p.flotte = []; if (p.bat.port == null) p.bat.port = 0; });
    assurerConseil(etat);
  }
  function heritier(F) {
    var liste = F.cour.fam.slice().sort(function (a, b) {
      var pa = PRIORITE.indexOf(a.lien), pb = PRIORITE.indexOf(b.lien);
      return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb) || a.ne - b.ne;
    });
    return liste[0] || null;
  }
  function membresLibres(etat, f) {
    var F = etat.factions[f], l = [];
    if (F.cour.elu) return l;
    if (!F.conj) l.push({ k: -1, p: F.roi });
    F.cour.fam.forEach(function (m, k) { if (!m.epoux) l.push({ k: k, p: m }); });
    return l;
  }
  function membre(F, k) { return k < 0 ? F.roi : F.cour.fam[k]; }

  // Mariage entre un membre de la famille de a et un membre de celle de b (k = -1 : le souverain lui-même).
  // matri : mariage matrilinéaire, la femme (côté a) garde sa dynastie et son mari la rejoint.
  function marier(etat, fa, ka, fb, kb, matri) {
    var A = etat.factions[fa], B = etat.factions[fb], pa = membre(A, ka), pb = membre(B, kb);
    matri = !!matri && pa.sexe === 'f' && kb >= 0;
    if (ka < 0) { // le souverain de a épouse pb, qui rejoint sa cour
      A.conj = { nom: pb.nom, ne: pb.ne, sexe: pb.sexe, de: fb, dyn: B.cour.dyn, matri: matri };
      if (pa.sexe === 'f') A.cour.dynEnfants = matri ? null : B.cour.dyn;
      B.cour.fam.splice(kb, 1);
    } else if (kb < 0) {
      B.conj = { nom: pa.nom, ne: pa.ne, sexe: pa.sexe, de: fa, dyn: A.cour.dyn };
      if (pb.sexe === 'f') B.cour.dynEnfants = A.cour.dyn;
      A.cour.fam.splice(ka, 1);
    } else if (matri) { // le prince quitte sa cour pour celle de sa femme
      pa.epoux = { nom: pb.nom, f: fb, ne: pb.ne, dyn: B.cour.dyn, matri: true };
      B.cour.fam.splice(kb, 1);
    } else {
      pa.epoux = { nom: pb.nom, f: fb, ne: pb.ne, dyn: B.cour.dyn };
      pb.epoux = { nom: pa.nom, f: fa, ne: pa.ne, dyn: A.cour.dyn };
    }
    var a = etat.diplo[fa === etat.joueur ? fb : fa];
    if (a) { a.sang = true; }
  }
  function verifMariage(etat, f, ka, kb, matri) {
    var J = etat.factions[etat.joueur], F = etat.factions[f];
    if (J.cour.elu || F.cour.elu) return 'Un souverain élu ne se marie pas.';
    var pa = membre(J, ka), pb = membre(F, kb);
    if (!pa || !pb) return 'Personne introuvable.';
    if (ka < 0 && kb < 0) return 'Deux souverains ne peuvent pas s\'épouser : choisis un prince ou une princesse.';
    if (pa.sexe === pb.sexe) return 'Il faut un homme et une femme.';
    if ((ka < 0 && J.conj) || (ka >= 0 && pa.epoux)) return pa.nom + ' est déjà marié(e).';
    if ((kb < 0 && F.conj) || (kb >= 0 && pb.epoux)) return pb.nom + ' est déjà marié(e).';
    if (matri && pa.sexe !== 'f') return 'Un mariage matrilinéaire se fait avec une femme de ta famille.';
    if (matri && kb < 0) return 'Un souverain ne quitte pas son trône pour un mariage matrilinéaire.';
    return null;
  }
  function chanceMariage(etat, f, kb, matri) {
    var D = etat.diplo[f], F = etat.factions[f];
    var score = D.att + (D.rel === 'alliance' ? 15 : 0) + Math.min(20, 10 * (puissance(etat, etat.joueur) / Math.max(1, puissance(etat, f)) - 1));
    var h = heritier(F);
    if (kb >= 0 && h && F.cour.fam[kb] === h) score -= 30; // donner son héritier coûte cher
    if (kb < 0) score -= 10;
    score += bonusConseil(etat, 'chancelier') + Math.min(10, Math.floor((etat.factions[etat.joueur].prestige || 0) / 10));
    if (matri) score -= 15 + (kb >= 0 && h && F.cour.fam[kb] === h ? 20 : 0); // perdre un prince (et ses enfants) coûte plus
    return Math.round(score);
  }

  // Mort d'un souverain : l'héritier monte sur le trône (ou un élu, ou une crise).
  function succession(etat, f, alea) {
    var F = etat.factions[f], ancien = F.roi, msgs = [];
    var mort = '⚰️ ' + (f === etat.joueur ? (ancien.sexe === 'f' ? 'Ta souveraine ' : 'Ton souverain ') : '') + ancien.nom + ' (' + F.nom + ') meurt à ' + age(etat, ancien) + ' ans.';
    msgs.push(mort);
    if (F.cour.elu) {
      var nom;
      if (F.id === 'papaute') nom = PAPES[Math.floor(alea() * PAPES.length)] + ' ' + ROMAINS[Math.floor(alea() * ROMAINS.length)];
      else {
        var titre = ancien.nom.split(' ')[0];
        var prenom = nomsCulture(F.cour.c).m[Math.floor(alea() * nomsCulture(F.cour.c).m.length)];
        nom = /^(Posadnik|Grand-pensionnaire|Dey|Grand)$/.test(titre) ? titre + ' ' + prenom : F.id === 'venise' ? 'Doge ' + prenom : prenom;
      }
      F.roi = { nom: nom, ne: etat.annee - 50 - Math.floor(alea() * 15), sexe: 'm', look: { barbe: ancien.look.barbe, ch: 'blanc', tete: ancien.look.tete } };
      msgs.push('🗳️ ' + nom + ' est élu à la tête de ' + F.nom + '.');
      return msgs;
    }
    var h = heritier(F);
    if (!h) {
      // Crise : un lointain cousin prend le pouvoir, une province se soulève.
      // Crise : un lointain cousin prend le pouvoir, le royaume s'agite.
      F.roi = { nom: nomAlea(etat, F, 'm', alea), ne: etat.annee - 22 - Math.floor(alea() * 15), sexe: 'm', look: lookCulture(F.cour.c, alea) };
      F.conj = null;
      F.cour.fam = [];
      F.cour.dynEnfants = null;
      if (alea() < 0.6) F.cour.fam.push({ nom: nomAlea(etat, F, 'm', alea), ne: F.roi.ne + 3 + Math.floor(alea() * 6), sexe: 'm', lien: 'frère' });
      msgs.push('⚠️ Crise de succession : ' + F.roi.nom + ', un lointain cousin, s\'empare du trône de ' + F.nom + '. Le royaume s\'agite (ordre public −15).');
      var pire = -1;
      etat.provinces.forEach(function (p, i) {
        if (p.proprio !== f) return;
        p.ordre = Math.max(0, (p.ordre == null ? 60 : p.ordre) - 15);
        if (F.capitale !== i && p.ordre < 40 && (pire < 0 || p.ordre < etat.provinces[pire].ordre)) pire = i;
      });
      if (pire >= 0) {
        var p = etat.provinces[pire];
        p.proprio = -1; p.armee = armeeDepart(etat.annee, 2, alea, true); p.ordre = 50;
        msgs.push('🔥 Profitant de la crise, ' + PROV[pire].nom + ' fait sécession.');
      }
      return msgs;
    }
    var enfantDuRoi = /^(fils|fille)$/.test(h.lien), dynAvant = F.cour.dyn;
    F.cour.fam.splice(F.cour.fam.indexOf(h), 1);
    F.cour.fam.forEach(function (m) {
      if (m.parent === h.nom) { m.lien = LIENS_ENFANT[m.sexe]; delete m.parent; return; }
      m.lien = m.lien === 'fils' ? 'frère' : m.lien === 'fille' ? 'sœur' : /^petit/.test(m.lien) ? (m.sexe === 'm' ? 'neveu' : 'nièce') : /^(frère|sœur)$/.test(m.lien) ? (m.sexe === 'm' ? 'oncle' : 'tante') : m.sexe === 'm' ? 'cousin' : 'cousine';
    });
    // Les enfants d'une reine mariée de façon patrilinéaire appartiennent à la dynastie de leur père.
    if (ancien.sexe === 'f' && enfantDuRoi && F.cour.dynEnfants && F.cour.dynEnfants !== dynAvant) {
      F.cour.dyn = F.cour.dynEnfants;
      msgs.push('🏰 La dynastie ' + dynAvant + ' s\'éteint sur le trône de ' + F.nom + ' : ' + h.nom + ' est de la maison ' + F.cour.dyn + ', celle de son père.');
      if (f !== etat.joueur && F.cour.dyn === etat.factions[etat.joueur].cour.dyn && etat.diplo[f]) {
        changerAttitude(etat, f, 25);
        msgs.push('🩸 Ta dynastie règne désormais aussi sur ' + F.nom + ' !');
      }
    }
    F.cour.dynEnfants = h.sexe === 'f' && h.epoux && !h.epoux.matri && h.epoux.dyn ? h.epoux.dyn : null;
    var look = h.look || (function () { var l = lookCulture(F.cour.c, alea); if (ancien.look.tete !== 'turban' && ancien.look.tete !== 'byzance') l.tete = ancien.look.tete; if (ancien.look.ch === 'perruque') l.ch = 'perruque'; return l; })();
    F.roi = { nom: h.nom, ne: h.ne, sexe: h.sexe, look: look };
    F.conj = h.epoux ? { nom: h.epoux.nom, ne: h.epoux.ne || h.ne, sexe: h.sexe === 'm' ? 'f' : 'm', de: h.epoux.f, dyn: h.epoux.dyn, matri: !!h.epoux.matri } : null;
    msgs.push('👑 ' + (h.sexe === 'f' ? 'La reine ' : 'Le roi ') + h.nom + ' monte sur le trône de ' + F.nom + '. Vive ' + (h.sexe === 'f' ? 'la reine' : 'le roi') + ' !');
    // Union des couronnes : l'héritier a épousé un membre de la famille du joueur.
    if (f !== etat.joueur && F.conj && F.conj.de === etat.joueur && nbProvinces(etat, f) > 0) {
      var n = 0;
      etat.provinces.forEach(function (p) { if (p.proprio === f) { p.proprio = etat.joueur; p.agit = 10; n++; } });
      etat.factions[etat.joueur].or += F.or;
      F.or = 0;
      msgs.push('💍👑 Union des couronnes ! Par le mariage de ' + F.conj.nom + ' avec ' + h.nom + ', ' + F.nom + ' (' + n + ' provinces) rejoint ton royaume !');
      verifierFin(etat);
    }
    return msgs;
  }

  function probaMort(a, fragile) {
    var p = a < 40 ? 0.008 : a < 55 ? 0.02 : a < 65 ? 0.045 : a < 75 ? 0.09 : 0.16;
    return fragile ? Math.max(p * 8, 0.3) : p;
  }
  // Une année à la cour : naissances, morts, successions.
  function tourCour(etat, alea, avant) {
    var apres = etat.annee;
    etat.factions.forEach(function (F, f) {
      if (!nbProvinces(etat, f)) return;
      var moi = f === etat.joueur;
      for (var an = avant + 1; an <= etat.annee; an++) {
        // Un souverain sans conjoint finit par épouser un(e) noble de sa cour.
        if (!F.conj && !F.cour.elu && an - F.roi.ne >= 16 && an - F.roi.ne < 60 && alea() < (moi ? 0.1 : 0.25)) {
          var sx = F.roi.sexe === 'm' ? 'f' : 'm';
          F.conj = { nom: nomAlea(etat, F, sx, alea), ne: sx === 'f' ? an - 17 - Math.floor(alea() * 8) : F.roi.ne - Math.floor(alea() * 5), sexe: sx, de: -1, matri: sx === 'm' };
          if (moi) etat.rapport.cour.push('💍 ' + F.roi.nom + ' épouse ' + F.conj.nom + ', ' + (sx === 'f' ? 'une noble' : 'un noble') + ' de la cour.');
        }
        // Naissances
        if (F.conj && !F.cour.elu) {
          var mere = F.roi.sexe === 'f' ? F.roi : F.conj, a = an - mere.ne;
          if (a >= 16 && a <= 42 && F.cour.fam.filter(function (m) { return /^(fils|fille)$/.test(m.lien); }).length < 7 && alea() < 0.2) {
            var sexe = alea() < 0.5 ? 'm' : 'f';
            var enfant = { nom: nomAlea(etat, F, sexe, alea), ne: an, sexe: sexe, lien: LIENS_ENFANT[sexe] };
            F.cour.fam.push(enfant);
            if (moi) etat.rapport.cour.push('👶 Naissance ' + (sexe === 'm' ? 'du prince ' : 'de la princesse ') + enfant.nom + ' !');
          }
        }
        // Les princes mariés (et les princesses mariées de façon matrilinéaire) ont des enfants dans la dynastie.
        F.cour.fam.slice().forEach(function (m) {
          if (!m.epoux || (m.sexe === 'f') !== !!m.epoux.matri) return;
          var am = an - (m.sexe === 'f' ? m.ne : (m.epoux.ne || m.ne));
          var nb = F.cour.fam.filter(function (x) { return x.parent === m.nom; }).length;
          if (am < 16 || am > 40 || nb >= 4 || F.cour.fam.length >= 14 || alea() >= 0.15) return;
          var sx2 = alea() < 0.5 ? 'm' : 'f';
          var lien = /^(fils|fille)$/.test(m.lien) ? (sx2 === 'm' ? 'petit-fils' : 'petite-fille') : /^(frère|sœur)$/.test(m.lien) ? (sx2 === 'm' ? 'neveu' : 'nièce') : (sx2 === 'm' ? 'cousin' : 'cousine');
          var bebe = { nom: nomAlea(etat, F, sx2, alea), ne: an, sexe: sx2, lien: lien, parent: m.nom };
          F.cour.fam.push(bebe);
          if (moi) etat.rapport.cour.push('👶 ' + m.nom + ' et ' + m.epoux.nom + ' ont ' + (sx2 === 'm' ? 'un fils, ' : 'une fille, ') + bebe.nom + (m.epoux.matri ? ' (mariage matrilinéaire : de ta dynastie).' : '.'));
        });
        // Morts dans la famille
        for (var k = F.cour.fam.length - 1; k >= 0; k--) {
          var m = F.cour.fam[k];
          if (an - m.ne > 30 && alea() < probaMort(an - m.ne)) {
            F.cour.fam.splice(k, 1);
            if (moi) etat.rapport.cour.push('🕯️ ' + m.nom + ' (' + m.lien + ') est ' + (m.sexe === 'f' ? 'morte' : 'mort') + ' à ' + (an - m.ne) + ' ans.');
          }
        }
        if (F.conj && an - F.conj.ne > 30 && alea() < probaMort(an - F.conj.ne)) {
          if (moi) etat.rapport.cour.push('🕯️ ' + F.conj.nom + ', ' + (F.conj.sexe === 'f' ? 'la reine, est morte.' : 'le prince consort, est mort.'));
          F.conj = null;
        }
        // Mort du souverain
        if (alea() < probaMort(an - F.roi.ne, F.roi.fragile) * Math.max(0.2, 1 + ext('mortRoi', etat, f))) {
          etat.annee = an; // pour l'âge affiché
          var msgs = succession(etat, f, alea);
          etat.annee = apres;
          msgs.forEach(function (t) { log(etat, t); });
          if (moi || (F.conj && F.conj.de === etat.joueur) || etat.diplo[f] && etat.diplo[f].rel === 'alliance' || nbProvinces(etat, f) >= 8 || /Union/.test(msgs.join(' ')))
            msgs.forEach(function (t) { (moi ? etat.rapport.cour : etat.nouvelles).push(t); });
        }
      }
    });
  }

  // ---------- Commerce ----------
  // etat.commerce[f] = { depuis } : accords commerciaux du joueur avec le royaume f.
  var PRODUITS = HISTOIRE.PRODUITS || {}, PRODUIT_DE = [];
  Object.keys(HISTOIRE.PRODUCTION || {}).forEach(function (k) { HISTOIRE.PRODUCTION[k].split(' ').forEach(function (id) { PRODUIT_DE[INDEX[id]] = k; }); });
  function biens(etat, f) {
    var b = {};
    etat.provinces.forEach(function (p, i) { if (p.proprio === f && PRODUIT_DE[i]) b[PRODUIT_DE[i]] = (b[PRODUIT_DE[i]] || 0) + 1; });
    return b;
  }
  function ports(etat, f) { return etat.provinces.reduce(function (s, p) { return s + (p.proprio === f ? p.bat.port || 0 : 0); }, 0); }
  // Deux royaumes sont proches s'ils se touchent ou partagent une mer.
  function proches(etat, f, g) {
    return etat.provinces.some(function (p, i) {
      if (p.proprio !== f) return false;
      return PROV[i].voisins.concat(PORTEE[i]).some(function (v) { return etat.provinces[v].proprio === g; });
    });
  }
  function accords(etat) {
    etat.commerce = etat.commerce || {};
    return Object.keys(etat.commerce).map(Number);
  }
  function valeurAccord(etat, f) {
    var j = etat.joueur, bj = biens(etat, j), bf = biens(etat, f), v = 2;
    Object.keys(bf).forEach(function (k) { if (!bj[k]) v += Math.round(PRODUITS[k].prix / 2); });
    Object.keys(bj).forEach(function (k) { if (!bf[k]) v += Math.round(PRODUITS[k].prix / 4); });
    v *= 1 + 0.08 * Math.min(5, ports(etat, j));
    if (!proches(etat, j, f)) v *= 0.6;
    return Math.min(30, Math.round(v));
  }
  function maxAccords(etat) { return 2 + Math.min(4, Math.floor(ports(etat, etat.joueur) / 2)) + (bonusConseil(etat, 'chancelier') >= 7 ? 1 : 0); }
  function revenuCommerce(etat) { return accords(etat).reduce(function (s, f) { return s + valeurAccord(etat, f); }, 0); }
  // Produits de luxe dont dispose un royaume (les siens, et pour le joueur ceux de ses partenaires).
  function luxes(etat, f) {
    var b = biens(etat, f);
    if (f === etat.joueur) accords(etat).forEach(function (g) { var x = biens(etat, g); for (var k in x) b[k] = 1; });
    return Object.keys(b).filter(function (k) { return PRODUITS[k].luxe; });
  }
  function rompreCommerce(etat, f, raison) {
    if (!etat.commerce || !etat.commerce[f]) return;
    delete etat.commerce[f];
    var m = '📦 Accord commercial avec ' + etat.factions[f].nom + ' rompu' + (raison ? ' : ' + raison : '.');
    log(etat, m);
    etat.nouvelles.push(m);
  }
  function tourCommerce(etat) {
    var total = 0;
    accords(etat).forEach(function (f) {
      if (!nbProvinces(etat, f)) { rompreCommerce(etat, f, 'le royaume a disparu.'); return; }
      if (relation(etat, f) === 'guerre') { rompreCommerce(etat, f, 'vous êtes en guerre.'); return; }
      var v = valeurAccord(etat, f);
      total += v;
      etat.factions[f].or += Math.round(v / 2);
      changerAttitude(etat, f, 1);
    });
    etat.factions[etat.joueur].or += total;
    if (etat.rapport) etat.rapport.commerce = total;
  }

  // ---------- La cour : conseil, courtisans, complots et événements ----------
  var ROLES = {
    chancelier: { nom: 'Chancelier', ico: '📜', dom: 'dip', effet: 'Les royaumes t\'apprécient chaque tour ; mariages, alliances et accords plus faciles.' },
    marechal: { nom: 'Maréchal', ico: '⚔️', dom: 'mar', effet: 'Entretien des armées et des flottes −3 % par point.' },
    intendant: { nom: 'Intendant', ico: '💰', dom: 'int', effet: 'Impôts +2 % par point.' },
    espion: { nom: 'Maître espion', ico: '🕵️', dom: 'intr', effet: 'Déjoue les complots (+10 % par point).' },
    chapelain: { nom: 'Chapelain', ico: '⛪', dom: 'pie', effet: 'Ordre public +1 tous les 2 points dans tout le royaume.' }
  };
  var DOMAINES = { dip: '📜 Diplomatie', mar: '⚔️ Guerre', int: '💰 Finances', intr: '🕵️ Intrigue', pie: '⛪ Piété' };
  var TITRES = {
    franc: ['Comte', 'Duc', 'Baron', 'Sire'], anglais: ['Earl', 'Lord', 'Sir', 'Baron'], germ: ['Graf', 'Herzog', 'Freiherr', 'Ritter'],
    ital: ['Conte', 'Marchese', 'Duca', 'Messer'], iber: ['Conde', 'Duque', 'Don', 'Marqués'], nord: ['Jarl', 'Herse', 'Lendmann', 'Jarl'],
    slave: ['Boyard', 'Kniaz', 'Voïvode', 'Boyard'], hongrois: ['Comte', 'Ban', 'Palatin', 'Baron'], byz: ['Stratège', 'Sébaste', 'Archonte', 'Logothète'],
    arabe: ['Émir', 'Vizir', 'Cheikh', 'Cadi'], turc: ['Pacha', 'Bey', 'Agha', 'Vizir'], steppe: ['Bey', 'Noyan', 'Tarkhan', 'Bey'],
    perse: ['Khan', 'Mirza', 'Vizir', 'Beg'], caucase: ['Eristavi', 'Atabeg', 'Mtavari', 'Eristavi']
  };
  function nomRole(F, r) {
    if (r !== 'chapelain') return ROLES[r].nom;
    var c = F.cour.c;
    return /arabe|turc|perse|steppe/.test(c) ? 'Grand cadi' : c === 'byz' || c === 'slave' ? 'Patriarche' : 'Chapelain';
  }
  function creerNoble(etat, F, alea) {
    var t = TITRES[F.cour.c] || TITRES.franc, doms = Object.keys(DOMAINES);
    var look = lookCulture(F.cour.c, alea);
    if (look.tete === 'couronne' || look.tete === 'byzance') look.tete = alea() < 0.5 ? 'chapeau' : 'aucun';
    if (look.tete === 'fourrure' && alea() < 0.5) look.tete = 'kalpak';
    etat.idNoble = (etat.idNoble || 0) + 1;
    return {
      id: etat.idNoble, nom: (function () {
        var pris = (F.cour.nobles || []).map(function (n) { return n.nom.split(' ').slice(1).join(' '); }), nom;
        for (var k = 0; k < 6; k++) { nom = nomAlea(etat, F, 'm', alea); if (pris.indexOf(nom) < 0) break; }
        return t[Math.floor(alea() * t.length)] + ' ' + nom;
      })(), ne: etat.annee - 22 - Math.floor(alea() * 35), sexe: 'm',
      dom: doms[Math.floor(alea() * doms.length)], comp: 2 + Math.floor(alea() * 5) + Math.floor(alea() * 4), loy: 45 + Math.floor(alea() * 40), look: look
    };
  }
  // Les membres adultes de la famille peuvent aussi siéger au conseil.
  function talent(m) {
    if (!m.dom) {
      var h = 0;
      for (var k = 0; k < m.nom.length; k++) h = (h * 31 + m.nom.charCodeAt(k)) >>> 0;
      m.dom = Object.keys(DOMAINES)[h % 5];
      m.comp = 3 + (h >> 3) % 6;
    }
    return m;
  }
  function assurerConseil(etat) {
    var J = etat.factions[etat.joueur];
    if (!J || !J.cour || J.cour.conseil) return;
    var alea = aleaPartie(etat);
    J.cour.conseil = {};
    J.cour.nobles = [];
    for (var k = 0; k < 6; k++) J.cour.nobles.push(creerNoble(etat, J, alea));
    if (J.prestige == null) J.prestige = 20;
    // Au départ, chaque siège revient au noble le plus doué pour lui.
    Object.keys(ROLES).forEach(function (r) {
      var libres = J.cour.nobles.filter(function (n) { return !estAuConseil(J, 'n' + n.id); });
      libres.sort(function (a, b) { return valeurPour(b, r) - valeurPour(a, r); });
      if (libres[0]) J.cour.conseil[r] = 'n' + libres[0].id;
    });
  }
  // Compétence d'un candidat pour un siège : pleine dans son domaine, réduite ailleurs.
  function valeurPour(c, r) { talent(c); return c.dom === ROLES[r].dom ? c.comp : Math.max(1, Math.floor(c.comp / 3)); }
  function estAuConseil(F, cle) { return Object.keys(F.cour.conseil || {}).some(function (r) { return F.cour.conseil[r] === cle; }); }
  function personneCour(F, cle) {
    if (!cle) return null;
    if (cle.charAt(0) === 'n') { var id = +cle.slice(1); return F.cour.nobles.filter(function (n) { return n.id === id; })[0] || null; }
    var nom = cle.slice(1);
    return F.cour.fam.filter(function (m) { return m.nom === nom; })[0] || null;
  }
  function conseiller(etat, r) {
    var J = etat.factions[etat.joueur];
    if (!J.cour.conseil) return null;
    var p = personneCour(J, J.cour.conseil[r]);
    if (!p && J.cour.conseil[r]) delete J.cour.conseil[r];
    return p;
  }
  function bonusConseil(etat, r) { var p = etat.factions[etat.joueur] && etat.factions[etat.joueur].cour && conseiller(etat, r); return p ? valeurPour(p, r) : 0; }
  function candidats(etat) {
    var J = etat.factions[etat.joueur];
    var l = J.cour.nobles.map(function (n) { return { cle: 'n' + n.id, p: n, fam: false }; });
    J.cour.fam.forEach(function (m) { if (etat.annee - m.ne >= 16 && !(m.epoux && !m.epoux.matri && m.sexe === 'f')) l.push({ cle: 'f' + m.nom, p: talent(m), fam: true }); });
    return l;
  }
  function nommer(etat, r, cle) {
    var J = etat.factions[etat.joueur];
    if (!ROLES[r]) return 'Siège inconnu.';
    if (!cle) { delete J.cour.conseil[r]; return null; }
    var p = personneCour(J, cle);
    if (!p) return 'Personne introuvable.';
    Object.keys(J.cour.conseil).forEach(function (x) { if (J.cour.conseil[x] === cle) delete J.cour.conseil[x]; });
    var ancien = personneCour(J, J.cour.conseil[r]);
    if (ancien && ancien.loy != null) ancien.loy = Math.max(0, ancien.loy - 15); // un renvoi vexe
    J.cour.conseil[r] = cle;
    if (p.loy != null) p.loy = Math.min(100, p.loy + 10);
    return null;
  }
  function salaires(etat) {
    var J = etat.factions[etat.joueur];
    if (!J.cour.conseil) return 0;
    return Object.keys(ROLES).reduce(function (s, r) { var p = conseiller(etat, r); return s + (p ? 1 + Math.floor(valeurPour(p, r) / 2) : 0); }, 0);
  }

  // Événements de cour : le joueur choisit, chaque choix a ses effets.
  var SAVANTS = ['un maître bâtisseur', 'un poète renommé', 'un astronome', 'un grand peintre', 'un médecin savant', 'un troubadour', 'un cartographe'];
  function evenement(etat, type, alea, data) {
    var J = etat.factions[etat.joueur], E = { type: type, data: data || {} };
    var noble = function () { return J.cour.nobles[Math.floor(alea() * J.cour.nobles.length)]; };
    if (type === 'festin') { E.titre = '🍗 Un grand festin ?'; E.texte = 'Les nobles murmurent que la cour de ' + J.roi.nom + ' manque d\'éclat. Ils réclament un grand festin.'; E.choix = ['🍷 Organiser le festin (−60 or)', '🙅 Pas de dépense inutile']; }
    else if (type === 'tournoi') { E.titre = '🏇 Un tournoi'; E.texte = 'Les chevaliers du royaume rêvent d\'un grand tournoi pour montrer leur bravoure.'; E.choix = ['🎺 Organiser le tournoi (−90 or)', '🙅 Refuser']; }
    else if (type === 'faveur') { var n = noble(); if (!n) return null; E.data.id = n.id; E.titre = '🙇 ' + n.nom + ' demande une faveur'; E.texte = n.nom + ' te demande une pension pour ses services.'; E.choix = ['💰 Accorder (−40 or)', '🙅 Refuser']; }
    else if (type === 'rivalite') {
      if (J.cour.nobles.length < 2) return null;
      var x = J.cour.nobles[Math.floor(alea() * J.cour.nobles.length)], y = J.cour.nobles.filter(function (q) { return q !== x; })[Math.floor(alea() * (J.cour.nobles.length - 1))];
      E.data = { x: x.id, y: y.id }; E.titre = '⚔️ Querelle à la cour'; E.texte = x.nom + ' et ' + y.nom + ' se disputent une terre et veulent que tu tranches.'; E.choix = ['👉 Donner raison à ' + x.nom, '👉 Donner raison à ' + y.nom];
    }
    else if (type === 'savant') { var s = SAVANTS[Math.floor(alea() * SAVANTS.length)]; E.data.s = s; E.titre = '🎨 Un visiteur illustre'; E.texte = 'Arrivé de loin, ' + s + ' propose de servir ta cour.'; E.choix = ['🤝 L\'accueillir (−70 or)', '👋 Le renvoyer']; }
    else if (type === 'pelerinage') { E.titre = '🙏 Des reliques'; E.texte = 'Un grand pèlerinage traverse le royaume. Le clergé demande ton soutien.'; E.choix = ['⛪ Financer (−50 or)', '🙅 Ne rien donner']; }
    else if (type === 'ambassade') {
      var amis = diplomatie(etat).filter(function (d) { return d.rel !== 'guerre'; });
      if (!amis.length) return null;
      var d = amis[Math.floor(alea() * amis.length)]; E.data.f = d.f;
      E.titre = '🎁 Une ambassade de ' + d.nom; E.texte = 'Les ambassadeurs de ' + etat.factions[d.f].roi.nom + ' arrivent avec des présents.'; E.choix = ['🎉 Les recevoir en grande pompe (−30 or)', '🙂 Un accueil simple'];
    }
    else if (type === 'noble') { var nv = creerNoble(etat, J, alea); E.data.n = nv; E.titre = '🎩 Un nouveau venu'; E.texte = nv.nom + ' (' + DOMAINES[nv.dom] + ' ' + nv.comp + '/10) demande à entrer à ta cour.'; E.choix = ['🤝 L\'accueillir', '🙅 Refuser']; }
    else if (type === 'complot') { var c = personneCour(J, 'n' + data.id); if (!c) return null; E.titre = '🕵️ Complot découvert !'; E.texte = 'Ton maître espion a découvert que ' + c.nom + ' complote contre toi.'; E.choix = ['⛓️ Le jeter au cachot', '🕊️ Lui pardonner']; }
    return E;
  }
  function choisirEvenement(etat, n) {
    var E = (etat.evenements || []).shift();
    if (!E) return null;
    var J = etat.factions[etat.joueur], a = n === 0, msg;
    var tous = function (d) { J.cour.nobles.forEach(function (x) { x.loy = Math.max(0, Math.min(100, x.loy + d)); }); };
    var cout = function (o) { if (J.or < o) return false; J.or -= o; return true; };
    var noble = function (id) { return personneCour(J, 'n' + id); };
    var pres = function (d) { J.prestige = Math.max(0, (J.prestige || 0) + d); };
    if (E.type === 'festin') {
      if (a && cout(60)) { tous(12); pres(5); msg = '🍷 Le festin est un succès : les nobles sont ravis (loyauté +12, prestige +5).'; }
      else if (a) msg = 'Pas assez d\'or pour le festin.';
      else { tous(-5); msg = 'Les nobles trouvent ta cour bien triste (loyauté −5).'; }
    } else if (E.type === 'tournoi') {
      if (a && cout(90)) { pres(10); tous(6); var g = J.cour.nobles[Math.floor(aleaPartie(etat)() * J.cour.nobles.length)]; if (g) g.loy = Math.min(100, g.loy + 15); msg = '🏆 Tournoi grandiose' + (g ? ', remporté par ' + g.nom : '') + ' (prestige +10).'; }
      else if (a) msg = 'Pas assez d\'or pour le tournoi.';
      else msg = 'Pas de tournoi cette année.';
    } else if (E.type === 'faveur') {
      var x = noble(E.data.id);
      if (!x) msg = 'Il a quitté la cour.';
      else if (a && cout(40)) { x.loy = Math.min(100, x.loy + 25); msg = x.nom + ' te remercie (loyauté +25).'; }
      else if (a) msg = 'Pas assez d\'or.';
      else { x.loy = Math.max(0, x.loy - 20); msg = x.nom + ' est vexé (loyauté −20).'; }
    } else if (E.type === 'rivalite') {
      var g2 = noble(a ? E.data.x : E.data.y), p2 = noble(a ? E.data.y : E.data.x);
      if (g2) g2.loy = Math.min(100, g2.loy + 20);
      if (p2) p2.loy = Math.max(0, p2.loy - 20);
      msg = (g2 ? g2.nom : '?') + ' gagne la querelle' + (p2 ? ', ' + p2.nom + ' t\'en veut' : '') + '.';
    } else if (E.type === 'savant') {
      if (a && cout(70)) { pres(8); var cap = etat.provinces[J.capitale]; if (cap && cap.proprio === etat.joueur) cap.ordre = Math.min(100, cap.ordre + 10); msg = '🎨 ' + E.data.s.charAt(0).toUpperCase() + E.data.s.slice(1) + ' embellit ta capitale (prestige +8).'; }
      else if (a) msg = 'Pas assez d\'or.';
      else msg = 'Le visiteur repart vers une autre cour.';
    } else if (E.type === 'pelerinage') {
      if (a && cout(50)) { etat.provinces.forEach(function (p) { if (p.proprio === etat.joueur) p.ordre = Math.min(100, p.ordre + 6); }); pres(3); msg = '⛪ Le peuple t\'acclame (ordre public +6 partout).'; }
      else if (a) msg = 'Pas assez d\'or.';
      else { var cp = etat.provinces[J.capitale]; if (cp && cp.proprio === etat.joueur) cp.ordre = Math.max(0, cp.ordre - 5); msg = 'Le clergé est déçu.'; }
    } else if (E.type === 'ambassade') {
      if (!etat.diplo[E.data.f]) msg = '';
      else if (a && cout(30)) { changerAttitude(etat, E.data.f, 15); pres(2); msg = '🎉 L\'ambassade repart enchantée (humeur +15).'; }
      else { changerAttitude(etat, E.data.f, 5); msg = 'L\'ambassade repart contente (humeur +5).'; }
    } else if (E.type === 'noble') {
      if (a) { J.cour.nobles.push(E.data.n); msg = E.data.n.nom + ' rejoint ta cour.'; }
      else msg = 'Tu le renvoies chez lui.';
    } else if (E.type === 'complot') {
      var c = noble(E.data.id);
      if (!c) msg = 'Le comploteur a fui.';
      else if (a) { J.cour.nobles.splice(J.cour.nobles.indexOf(c), 1); tous(-3); pres(2); msg = '⛓️ ' + c.nom + ' croupit au cachot. La cour tremble.'; }
      else { c.loy = 60; pres(-5); msg = '🕊️ ' + c.nom + ' jure fidélité, ému par ta clémence.'; }
    }
    if (msg) log(etat, msg);
    return msg;
  }
  // Une année de vie de cour pour le joueur : loyauté, complots, arrivées, morts, événements.
  function tourCourtisans(etat, alea) {
    var J = etat.factions[etat.joueur];
    assurerConseil(etat);
    etat.evenements = [];
    if (!J.cour.nobles) return;
    var espion = bonusConseil(etat, 'espion');
    for (var k = J.cour.nobles.length - 1; k >= 0; k--) {
      var n = J.cour.nobles[k], auConseil = estAuConseil(J, 'n' + n.id);
      n.loy = Math.max(0, Math.min(100, n.loy + (auConseil ? 1 : -1) + ((J.prestige || 0) >= 60 ? 1 : (J.prestige || 0) < 10 ? -1 : 0) + Math.round(alea() * 4 - 2)));
      if (etat.annee - n.ne > 55 && alea() < probaMort(etat.annee - n.ne) * etat.pas) {
        J.cour.nobles.splice(k, 1);
        etat.rapport.cour.push('🕯️ ' + n.nom + ' est mort' + (auConseil ? ' : son siège au conseil est libre.' : '.'));
        continue;
      }
      if (n.loy < 25 && alea() < 0.35) {
        if (alea() < 0.2 + 0.1 * espion) etat.evenements.push(evenement(etat, 'complot', alea, { id: n.id }));
        else {
          // Le complot réussit : vol du trésor ou troubles, puis le traître s'enfuit.
          J.cour.nobles.splice(k, 1);
          if (alea() < 0.5) {
            var vol = Math.max(20, Math.floor(J.or * 0.15));
            J.or = Math.max(0, J.or - vol);
            etat.rapport.cour.push('🗡️ Complot ! ' + n.nom + ' s\'enfuit avec ' + vol + ' pièces d\'or du trésor.');
          } else {
            var cap = etat.provinces[J.capitale];
            if (cap && cap.proprio === etat.joueur) cap.ordre = Math.max(0, cap.ordre - 20);
            etat.rapport.cour.push('🗡️ Complot ! ' + n.nom + ' soulève la capitale contre toi (ordre −20) puis s\'enfuit.');
          }
          J.prestige = Math.max(0, (J.prestige || 0) - 5);
        }
      }
    }
    if (J.cour.nobles.length < 4 && alea() < 0.6) {
      var nv = creerNoble(etat, J, alea);
      J.cour.nobles.push(nv);
      etat.rapport.cour.push('🎩 ' + nv.nom + ' rejoint ta cour (' + DOMAINES[nv.dom] + ' ' + nv.comp + '/10).');
    }
    // Le chancelier entretient les amitiés.
    var ch = bonusConseil(etat, 'chancelier');
    if (ch >= 4) etat.diplo.forEach(function (D, f) { if (D && D.rel !== 'guerre') changerAttitude(etat, f, ch >= 8 ? 2 : 1); });
    if (alea() < 0.5) {
      var types = ['festin', 'tournoi', 'faveur', 'rivalite', 'savant', 'pelerinage', 'ambassade', 'noble'];
      if (etat.annee < 1100) types.splice(1, 1);
      var E = evenement(etat, types[Math.floor(alea() * types.length)], alea);
      if (E) etat.evenements.push(E);
    }
    etat.evenements = etat.evenements.filter(Boolean);
  }

  // ---------- Quêtes : restaurer un empire historique ----------
  var QUETES = HISTOIRE.QUETES || [];
  function quetes(etat, f) {
    var F = etat.factions[f], faites = etat.quetes || {};
    return QUETES.filter(function (q) { return q.pour.indexOf(F.id) >= 0 && (!q.couronne || etat.couronne); }).map(function (q) {
      var manque = q.provinces.filter(function (id) { return etat.provinces[INDEX[id]].proprio !== f; }).map(function (id) { return INDEX[id]; });
      return { q: q, tenues: q.provinces.length - manque.length, total: q.provinces.length, manque: manque, faite: faites[q.id] != null ? faites[q.id] : null };
    });
  }
  function accomplirQuete(etat, f, q) {
    var F = etat.factions[f], ancien = F.nom, moi = f === etat.joueur;
    etat.quetes = etat.quetes || {};
    etat.quetes[q.id] = f;
    F.empires = (F.empires || []).concat(q.id);
    F.nom = q.nom;
    F.or += q.or;
    if (moi) F.prestige = (F.prestige || 0) + 30;
    etat.provinces.forEach(function (p) { if (p.proprio === f) { p.ordre = Math.min(100, (p.ordre == null ? 60 : p.ordre) + 15); p.agit = 0; } });
    var m = q.ico + ' ' + (moi ? 'Quête accomplie ! ' : '') + ancien + ' devient l\'' + q.nom + ' (' + q.titre.toLowerCase() + ').' + (moi ? ' +' + q.or + ' or, ordre public +15 partout.' : '');
    log(etat, m);
    if (moi) {
      (etat.rapport.quetes = etat.rapport.quetes || []).push(m);
      etat.factions.forEach(function (o, k) { if (k !== f && etat.diplo[k]) changerAttitude(etat, k, -8); }); // un empire inquiète ses voisins
    } else etat.nouvelles.push(m);
  }
  function tourQuetes(etat) {
    etat.quetes = etat.quetes || {};
    etat.quetesMoitie = etat.quetesMoitie || {};
    etat.factions.forEach(function (F, f) {
      if (!nbProvinces(etat, f)) return;
      quetes(etat, f).forEach(function (x) {
        if (x.faite != null) return;
        if (!x.manque.length) { accomplirQuete(etat, f, x.q); return; }
        if (f === etat.joueur && x.tenues * 2 >= x.total && !etat.quetesMoitie[x.q.id]) {
          etat.quetesMoitie[x.q.id] = true;
          (etat.rapport.quetes = etat.rapport.quetes || []).push(x.q.ico + ' ' + x.q.titre + ' : tu tiens déjà ' + x.tenues + ' provinces sur ' + x.total + '. Plus que ' + x.manque.length + ' !');
        }
      });
    });
  }

  function revenu(etat, f) {
    var r = etat.provinces.reduce(function (s, p) { return s + (p.proprio === f ? revenuProvince(p) : 0); }, 0);
    return Math.round(r * Math.max(0.3, 1 + (f === etat.joueur ? 0.02 * bonusConseil(etat, 'intendant') : 0) + ext('revenu', etat, f)));
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
      if (att.camp === etat.joueur) etat.factions[att.camp].prestige = (etat.factions[att.camp].prestige || 0) + 1;
      // La flotte entre au port conquis (les navires qui y étaient sont capturés).
      if (att.flotte) c.flotte = att.flotte.concat(c.flotte || []).slice(0, MAX_NAVIRES);
      c.agit = 25;
      c.ordre = Math.min(c.ordre == null ? 40 : c.ordre, 40);
      c.impots = 1;
      EXT.forEach(function (x) { if (x.conquete) x.conquete(etat, att.vers, ancien, att.camp); });
      log(etat, '⚔️ ' + nomF(etat, att.camp) + ' prend ' + PROV[att.vers].nom + ' à ' + nomF(etat, ancien) + '.');
      if (ancien >= 0 && nbProvinces(etat, ancien) === 0) log(etat, '💀 ' + nomF(etat, ancien) + ' a disparu !');
      verifierFin(etat);
    } else {
      c.armee = survD;
      a.armee = a.armee.concat(survA).slice(0, MAX_UNITES);
      if (att.flotte) a.flotte = (a.flotte || []).concat(att.flotte).slice(0, MAX_NAVIRES);
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
        if (estCotiere(id) && p.bat.marche >= 1 && p.bat.port < 2 && alea() < 0.3) choix = 'port';
        construire(etat, id, choix);
      }
      // 1 bis. Une flotte pour garder les côtes et débarquer.
      if (F.or > 220 && alea() < 0.4) {
        var chantiers = miennes.filter(function (i) { return etat.provinces[i].bat.port && etat.provinces[i].flotte.length < 4; });
        if (chantiers.length) {
          var ch = chantiers[Math.floor(alea() * chantiers.length)], nt = meilleurNavire(etat, ch);
          if (nt && NAVIRES[nt].cout < F.or - 80) construireNavire(etat, ch, nt);
        }
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
      // 4. Débarquer sur une côte faible.
      miennes.forEach(function (i) {
        var p = etat.provinces[i];
        if (p.proprio !== f || !p.flotte || alea() > 0.3) return;
        var cap = capacite(p.flotte);
        var dispo = p.armee.map(function (u, k) { return u.bouge ? -1 : k; }).filter(function (k) { return k >= 0; }).slice(0, cap);
        if (dispo.length < 2) return;
        if (dispo.length === p.armee.length) dispo.pop();
        var fEnvoi = force(dispo.map(function (k) { return p.armee[k]; })), fNav = forceFlotte(p.flotte.filter(function (n) { return !n.bouge; }));
        var cibles = PORTEE[i].filter(function (v) {
          var o = etat.provinces[v].proprio;
          if (o === f || PROV[i].voisins.indexOf(v) >= 0 || (o === etat.joueur && relation(etat, f) !== 'guerre')) return false;
          var garde = flotteDefense(etat, v).reduce(function (s, j) { return s + forceFlotte(etat.provinces[j].flotte); }, 0);
          return fEnvoi > forceDefense(etat.provinces[v]) * 1.5 + 40 && fNav > garde * 1.3;
        });
        if (!cibles.length) return;
        var v = cibles[Math.floor(alea() * cibles.length)], cp = etat.provinces[v];
        var att = preparerDebarquement(etat, i, v, dispo);
        if (att.erreur || att.echec) return;
        if (cp.proprio === etat.joueur && cp.armee.length) { renfortAllie(etat, v); pourJoueur.push(att); return; }
        if (cp.proprio === etat.joueur) etat.nouvelles.push('⚓ ' + F.nom + ' débarque à ' + PROV[v].nom + ' !');
        if (!cp.armee.length) { appliquerBataille(etat, att, null); return; }
        var b2 = batailleAttaque(etat, att, Math.floor(alea() * 1e9));
        resoudreAuto(b2);
        appliquerBataille(etat, att, b2);
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
    if (rel === 'guerre') rompreCommerce(etat, f, 'c\'est la guerre !');
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
        aidePrete: D.aideT <= etat.tour, dejaDemande: D.demande === etat.tour, sang: !!D.sang };
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
    if (type === 'finCommerce') {
      if (!etat.commerce || !etat.commerce[f]) return { ok: false, msg: 'Pas d\'accord avec ce royaume.' };
      delete etat.commerce[f];
      changerAttitude(etat, f, -10);
      log(etat, '📦 Tu mets fin à l\'accord commercial avec ' + F.nom + '.');
      return { ok: true, msg: 'Accord commercial avec ' + F.nom + ' terminé.' };
    }
    if (D.demande === etat.tour) return { ok: false, msg: F.nom + ' a déjà reçu ton messager ce tour-ci.' };
    if (type === 'commerce') {
      etat.commerce = etat.commerce || {};
      if (etat.commerce[f]) return { ok: false, msg: 'Vous commercez déjà ensemble.' };
      if (D.rel === 'guerre') return { ok: false, msg: 'Pas de commerce en pleine guerre.' };
      if (accords(etat).length >= maxAccords(etat)) return { ok: false, msg: 'Tu as déjà ' + maxAccords(etat) + ' accords : construis des ports (ou nomme un bon chancelier) pour en signer plus.' };
      D.demande = etat.tour;
      var seuilC = -10 - (D.rel === 'alliance' ? 20 : 0) - (D.sang ? 10 : 0) - bonusConseil(etat, 'chancelier');
      if (D.att < seuilC) { changerAttitude(etat, f, -2); return { ok: false, msg: F.nom + ' refuse de commercer avec toi : améliore d\'abord ses sentiments.' }; }
      etat.commerce[f] = { depuis: etat.tour };
      changerAttitude(etat, f, 5);
      log(etat, '📦 Accord commercial avec ' + F.nom + '.');
      return { ok: true, msg: '📦 Accord commercial signé avec ' + F.nom + ' : +' + valeurAccord(etat, f) + ' or par tour !' };
    }
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
      var seuil = (D.sang ? 25 : 40) - Math.floor(bonusConseil(etat, 'chancelier') / 2);
      if (D.att < seuil) { changerAttitude(etat, f, -2); return { ok: false, msg: F.nom + ' refuse : il faut une humeur de ' + seuil + ' au moins' + (D.sang ? '.' : ' (25 si vos familles sont unies par un mariage).') }; }
      changerRelation(etat, f, 'alliance');
      changerAttitude(etat, f, 10);
      log(etat, '🤝 Alliance conclue avec ' + F.nom + '.');
      return { ok: true, msg: 'Alliance conclue avec ' + F.nom + ' !' };
    }
    if (type === 'mariage') {
      var o = arguments[3] || {};
      var err = verifMariage(etat, f, o.a, o.b, o.matri);
      if (err) return { ok: false, msg: err };
      if (D.rel === 'guerre') return { ok: false, msg: 'Impossible en pleine guerre : signe d\'abord la paix.' };
      D.demande = etat.tour;
      var chance = chanceMariage(etat, f, o.b, o.matri);
      if (chance < 15) { changerAttitude(etat, f, -2); return { ok: false, msg: F.nom + ' refuse ce mariage. Améliore d\'abord ses sentiments (cadeaux, alliance).' }; }
      var pa = membre(J, o.a), pb = membre(F, o.b);
      marier(etat, etat.joueur, o.a, f, o.b, o.matri);
      changerAttitude(etat, f, 20);
      log(etat, '💍 Mariage ' + (o.matri ? 'matrilinéaire ' : '') + 'de ' + pa.nom + ' et ' + pb.nom + ' (' + F.nom + ').');
      return { ok: true, msg: '💍 ' + pa.nom + ' épouse ' + pb.nom + ' ! ' + F.nom + ' devient ta famille.' + (o.matri ? ' ' + pb.nom + ' rejoint ta cour et leurs enfants seront de ta dynastie.' : '') };
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
      if (D.sang) d += 2;
      if (grand) d -= 2;
      changerAttitude(etat, f, d);
      var nb = etat.propositions.length + etat.nouvelles.length;
      if (D.rel === 'guerre' && D.att > 5 && etat.tour - D.depuis >= 3 && alea() < 0.35 && nb < 6) {
        etat.propositions.push({ f: f, type: 'paix' });
      } else if (D.rel === 'paix' && D.att >= (D.sang ? 35 : 50) && alea() < 0.25 && nb < 6) {
        etat.propositions.push({ f: f, type: 'alliance' });
      } else if (D.rel !== 'guerre' && D.att >= 35 && alea() < 0.12 && nb < 6 && etat.factions[f].cour && !etat.factions[f].cour.elu) {
        // Le royaume propose de marier l'un des siens à un membre de ta famille.
        var leurs = membresLibres(etat, f).filter(function (x) { return x.k >= 0; }), miens = membresLibres(etat, etat.joueur);
        var paire = null;
        leurs.some(function (x) { return miens.some(function (y) { if (!verifMariage(etat, f, y.k, x.k)) { paire = { a: y.k, b: x.k }; return true; } return false; }); });
        if (paire) etat.propositions.push({ f: f, type: 'mariage', a: paire.a, b: paire.b, noms: [membre(etat.factions[etat.joueur], paire.a).nom, membre(etat.factions[f], paire.b).nom] });
      } else if (D.rel !== 'guerre' && D.att >= 15 && alea() < 0.1 && nb < 6 && !(etat.commerce || {})[f] && accords(etat).length < maxAccords(etat)) {
        etat.propositions.push({ f: f, type: 'commerce', valeur: valeurAccord(etat, f) });
      } else if (D.rel === 'paix' && voisin && D.att <= (D.sang ? -60 : -40) && etat.tour - D.depuis >= 2 && alea() < 0.5) {
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
      changerAttitude(etat, P.f, P.type === 'paix' ? -5 : -10);
      return 'Tu refuses ' + (P.type === 'paix' ? 'la paix' : P.type === 'mariage' ? 'le mariage' : P.type === 'commerce' ? "l'accord commercial" : "l'alliance") + ' de ' + F.nom + '.';
    }
    if (P.type === 'mariage') {
      var pa = membre(etat.factions[etat.joueur], P.a), pb = membre(F, P.b);
      if (!pa || !pb || pa.nom !== P.noms[0] || pb.nom !== P.noms[1] || verifMariage(etat, P.f, P.a, P.b)) return 'La situation a changé.';
      marier(etat, etat.joueur, P.a, P.f, P.b);
      changerAttitude(etat, P.f, 15);
      log(etat, '💍 Mariage de ' + pa.nom + ' et ' + pb.nom + ' (' + F.nom + ').');
      return '💍 ' + pa.nom + ' épouse ' + pb.nom + ' !';
    }
    if (P.type === 'commerce') {
      if (D.rel === 'guerre' || accords(etat).length >= maxAccords(etat)) return 'La situation a changé.';
      etat.commerce = etat.commerce || {};
      etat.commerce[P.f] = { depuis: etat.tour };
      changerAttitude(etat, P.f, 5);
      log(etat, '📦 Accord commercial avec ' + F.nom + '.');
      return '📦 Accord commercial avec ' + F.nom + ' : +' + valeurAccord(etat, P.f) + ' or par tour !';
    }
    if (P.type === 'paix' && D.rel === 'guerre') { changerRelation(etat, P.f, 'paix'); changerAttitude(etat, P.f, 10); log(etat, '🕊️ Paix signée avec ' + F.nom + '.'); return 'Paix signée avec ' + F.nom + ' !'; }
    if (P.type === 'alliance' && D.rel === 'paix') { changerRelation(etat, P.f, 'alliance'); changerAttitude(etat, P.f, 10); log(etat, '🤝 Alliance conclue avec ' + F.nom + '.'); return 'Alliance conclue avec ' + F.nom + ' !'; }
    return 'La situation a changé.';
  }

  // Fin du tour du joueur : revenus, soins, années qui passent, événements, puis l'IA joue.
  function finDuTour(etat) {
    var avant = etat.annee;
    assurerCour(etat);
    etat.rapport = { cour: [], revoltes: [], entretien: 0, revenu: revenu(etat, etat.joueur), tour: etat.tour + 1 };
    etat.factions.forEach(function (F, f) { F.or += revenu(etat, f) + (f !== etat.joueur ? 10 : 0); });
    etat.provinces.forEach(function (p) {
      p.construit = false;
      var soin = 0.15 + 0.08 * p.bat.ferme;
      p.armee.forEach(function (u) { u.bouge = false; u.hp = Math.min(pvMax(u.t), u.hp + pvMax(u.t) * soin); });
      (p.flotte || []).forEach(function (n) { n.bouge = false; n.hp = Math.min(NAVIRES[n.t].pv, n.hp + NAVIRES[n.t].pv * (p.bat.port ? 0.1 + 0.1 * p.bat.port : 0.05)); });
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
    var aleaT = aleaPartie(etat);
    tourCour(etat, aleaT, avant);
    tourCourtisans(etat, aleaT);
    tourCommerce(etat);
    tourGestion(etat, aleaT);
    tourDiplo(etat);
    var defenses = tourIA(etat);
    etat.provinces.forEach(function (p) { p.armee.forEach(function (u) { u.bouge = false; }); (p.flotte || []).forEach(function (n) { n.bouge = false; }); });
    tourQuetes(etat);
    EXT.forEach(function (x) { if (x.tour) x.tour(etat, aleaT, avant); });
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
    IMPOTS: IMPOTS, entretien: entretien, entretienUnite: entretienUnite, detailOrdre: detailOrdre, cibleOrdre: cibleOrdre,
    changerImpots: changerImpots, estCapitale: estCapitale, assurerCour: assurerCour, heritier: heritier, age: age,
    QUETES: QUETES, quetes: quetes, tourQuetes: tourQuetes,
    MERS: MERS, COTES: COTES, PORTEE: PORTEE, estCotiere: estCotiere, NAVIRES: NAVIRES, TYPES_NAV: TYPES_NAV, MAX_NAVIRES: MAX_NAVIRES,
    blocageNavire: blocageNavire, construireNavire: construireNavire, forceFlotte: forceFlotte, capacite: capacite, entretienNavire: entretienNavire,
    flotteDefense: flotteDefense, combatNaval: combatNaval, naviguer: naviguer, preparerDebarquement: preparerDebarquement, nomMer: nomMer,
    PRODUITS: PRODUITS, PRODUIT_DE: PRODUIT_DE, biens: biens, ports: ports, accords: accords, valeurAccord: valeurAccord, maxAccords: maxAccords,
    revenuCommerce: revenuCommerce, luxes: luxes, proches: proches,
    ROLES: ROLES, DOMAINES: DOMAINES, nomRole: nomRole, conseiller: conseiller, bonusConseil: bonusConseil, candidats: candidats, nommer: nommer,
    valeurPour: valeurPour, salaires: salaires, choisirEvenement: choisirEvenement, assurerConseil: assurerConseil, estAuConseil: estAuConseil,
    membresLibres: membresLibres, membre: membre, verifMariage: verifMariage, chanceMariage: chanceMariage, PERSOS: PERSOS,
    relation: relation, diplomatie: diplomatie, proposer: proposer, repondre: repondre, humeur: humeur, NOM_REL: NOM_REL,
    assurerDiplo: assurerDiplo, changerAttitude: changerAttitude, finDuTour: finDuTour, tourIA: tourIA, verifierFin: verifierFin, log: log,
    // Pour les extensions (couronne.js).
    etendre: function (x) { EXT.push(x); }, ext: ext, INDEX: INDEX, aleaPartie: aleaPartie, succession: succession, changerRelation: changerRelation,
    creerUnite: creerUnite, meilleuresRecrues: meilleuresRecrues, nomF: nomF, rompreCommerce: rompreCommerce, creerNoble: creerNoble
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.Moteur = M;
})(this);
