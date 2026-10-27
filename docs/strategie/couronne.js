/* Imperium of Wars — Édition Couronne (contenu premium), les règles.
   Inspirée de Crusader Kings : religions et guerres saintes, intrigues, renommée et héritages
   de dynastie, traits de caractère des souverains, éducation de l'héritier, Réforme protestante,
   et 3 campagnes de plus (données dans couronne-donnees.js).
   Tout ne s'applique qu'aux parties « Couronne » (etat.couronne), lancées par un joueur qui a l'édition :
   une partie gratuite reste exactement la même. */
(function (root) {
  'use strict';
  var M = root.Moteur || require('./moteur.js');
  var D = root.COURONNE_DONNEES || require('./couronne-donnees.js');
  var H = M.HISTOIRE, PROV = M.PROV, INDEX = M.INDEX, U = M.UNITES;
  var REL = D.RELIGIONS, TR = D.TRAITS, HER = D.HERITAGES, INT = D.INTRIGUES;

  // ---------- Contenu ajouté au jeu ----------
  D.EPOQUES.forEach(function (e) { if (!M.epoque(e.id)) H.EPOQUES.push(e); });
  H.EPOQUES.sort(function (a, b) { return a.annee - b.annee; });
  Object.keys(D.PERSONNAGES).forEach(function (k) { M.PERSOS.EPOQUES[k] = D.PERSONNAGES[k]; });
  D.QUETES.forEach(function (q) { if (!H.QUETES.some(function (x) { return x.id === q.id; })) H.QUETES.push(q); });
  // Les royaumes des nouvelles campagnes peuvent aussi mener les quêtes de base.
  var PLUS = { carolingien: ['lotharingie', 'italie'], italie: ['italie', 'naples'], hongrie: ['magyars'], merdunord: ['dublin'], rus: ['moscovie'], bulgarie: ['bulgares'], pologne: ['lituanie'] };
  H.QUETES.forEach(function (q) { (PLUS[q.id] || []).forEach(function (id) { if (q.pour.indexOf(id) < 0) q.pour.push(id); }); });

  function J(etat) { return etat.factions[etat.joueur]; }
  function C(etat) { return etat.cou; }
  function nbProv(etat, f) { return M.nbProvinces(etat, f); }
  function rapport(etat, t) { (etat.rapport.couronne = etat.rapport.couronne || []).push(t); }

  // ---------- Religions ----------
  var FOI_ID = {
    fatimides: 'chiite', jalayirides: 'sunnite', vikings: 'paien', dublin: 'paien', saxons: 'paien', khazars: 'tengri', avars: 'tengri',
    coumans: 'tengri', magyars: 'tengri', crimee: 'sunnite', kazan: 'sunnite', barbaresques: 'sunnite', pologne: 'catholique', moravie: 'catholique',
    hongrie: 'catholique', croises: 'catholique', chypre: 'catholique', teutonique: 'catholique', boheme: 'catholique', lituanie: 'catholique'
  };
  function foiInitiale(id, culture, annee) {
    if (D.REFORME[id] && annee >= D.REFORME[id] && !(id === 'bretagne' && annee < 1600)) return 'protestant';
    if (id === 'bulgares') return annee < 864 ? 'paien' : 'orthodoxe';
    if (id === 'horde') return annee >= 1313 ? 'sunnite' : 'tengri';
    if (id === 'lituanie' && annee < 1387) return 'paien';
    if (id === 'perse') return annee >= 1501 ? 'chiite' : 'sunnite';
    if ((id === 'novgorod' || id === 'kiev' || id === 'rus') && annee < 990) return 'paien';
    if (FOI_ID[id]) return FOI_ID[id];
    if (culture === 'nord') return annee < 1000 ? 'paien' : 'catholique';
    if (culture === 'slave' || culture === 'byz' || culture === 'caucase') return 'orthodoxe';
    if (culture === 'arabe' || culture === 'turc') return 'sunnite';
    if (culture === 'perse') return 'sunnite';
    if (culture === 'steppe') return 'tengri';
    return 'catholique';
  }
  function foi(etat, f) { return f >= 0 ? etat.factions[f].foi : null; }
  // 0 = même foi, 1 = hérésie (même famille), 2 = infidèles.
  function ecart(a, b) { if (!a || !b || a === b) return 0; return REL[a].groupe === REL[b].groupe ? 1 : 2; }

  // ---------- Traits de caractère ----------
  function hacher(t) { var h = 7; for (var k = 0; k < t.length; k++) h = (h * 31 + t.charCodeAt(k)) >>> 0; return h; }
  // Les traits viennent du nom (toujours les mêmes pour une personne), des vrais traits des grands
  // souverains, et de l'éducation choisie pour l'héritier.
  function traits(p) {
    if (!p) return [];
    var l = null;
    Object.keys(D.TRAITS_HISTOIRE).some(function (k) { if (p.nom.indexOf(k) === 0) { l = D.TRAITS_HISTOIRE[k].slice(); return true; } return false; });
    if (!l) {
      var h = hacher(p.nom + '|' + p.ne), paires = D.PAIRES.slice(0, 6);
      l = [];
      for (var n = 0; n < 2; n++) {
        var k = (h >> (n * 5)) % paires.length, pr = paires.splice(k, 1)[0];
        l.push(pr[(h >> (n * 3 + 11)) & 1]);
      }
      if ((h >> 20) % 5 === 0) l.push('erudit');
      else if ((h >> 22) % 6 === 0) l.push((h >> 25) & 1 ? 'robuste' : 'maladif');
    }
    if (p.educ && l.indexOf(p.educ) < 0) {
      var contraire = null;
      D.PAIRES.forEach(function (pr) { var i = pr.indexOf(p.educ); if (i >= 0) contraire = pr[1 - i]; });
      var j = l.indexOf(contraire);
      if (j >= 0) l[j] = p.educ; else l.unshift(p.educ);
    }
    return l.slice(0, 4);
  }
  // Somme d'un effet (ordre, revenu, piete…) des traits du souverain du joueur.
  function effetTraits(etat, cle) {
    return traits(J(etat).roi).reduce(function (s, t) { return s + (TR[t][cle] || 0); }, 0);
  }
  function niv(etat, k) { return (C(etat).her[k] || 0); }

  // ---------- Nouvelle partie ----------
  function preparer(etat) {
    etat.factions.forEach(function (F) { if (!F.foi) F.foi = foiInitiale(F.id, F.cour && F.cour.c, etat.annee); });
    etat.provinces.forEach(function (p, i) {
      if (p.foi) return;
      if (p.proprio >= 0) { p.foi = etat.factions[p.proprio].foi; return; }
      // Province rebelle : la foi de la province tenue la plus proche.
      var best = null, dmin = 1e12;
      etat.provinces.forEach(function (q, j) {
        if (q.proprio < 0) return;
        var d = Math.pow(PROV[i].x - PROV[j].x, 2) + Math.pow(PROV[i].y - PROV[j].y, 2);
        if (d < dmin) { dmin = d; best = q; }
      });
      p.foi = best ? etat.factions[best.proprio].foi : 'catholique';
    });
    if (!etat.cou) etat.cou = { piete: 40, renom: 50, her: {}, intrigues: [], revs: {}, gs: null, pele: -99, vu: {} };
  }
  function assurer(etat) { if (etat.couronne) preparer(etat); }

  // ---------- Effets branchés dans le moteur ----------
  M.etendre({
    partie: function (etat) { if (etat.couronne) preparer(etat); },
    ordre: function (etat, i, d) {
      if (!etat.couronne || !etat.cou) return;
      var p = etat.provinces[i], f = p.proprio, e = ecart(p.foi, foi(etat, f));
      if (e) d.push([REL[p.foi].ico + (e === 1 ? ' Hérésie : ' : ' Autre religion : ') + REL[p.foi].nom.toLowerCase(), e === 1 ? -5 : -10]);
      if (f !== etat.joueur) return;
      var t = effetTraits(etat, 'ordre');
      if (t) d.push(['🎭 Caractère du souverain', t]);
      if (niv(etat, 'legitimite')) d.push([HER.legitimite.ico + ' Légitimité de la dynastie', 3 * niv(etat, 'legitimite')]);
    },
    revenu: function (etat, f) {
      if (!etat.couronne || !etat.cou || f !== etat.joueur) return 0;
      return effetTraits(etat, 'revenu') + 0.04 * niv(etat, 'gouvernance');
    },
    entretien: function (etat, f) {
      if (!etat.couronne || !etat.cou || f !== etat.joueur) return 0;
      return effetTraits(etat, 'entretien') - 0.05 * niv(etat, 'guerre');
    },
    mortRoi: function (etat, f) {
      if (!etat.couronne || !etat.cou || f !== etat.joueur) return 0;
      return effetTraits(etat, 'mort') - 0.15 * niv(etat, 'sang');
    },
    conquete: function (etat, i, ancien, camp) {
      if (!etat.couronne || !etat.cou || camp !== etat.joueur) return;
      var c = C(etat), p = etat.provinces[i], F = J(etat);
      if (c.revs[i]) {
        delete c.revs[i];
        p.agit = 0; p.ordre = Math.max(p.ordre, 55);
        F.prestige = (F.prestige || 0) + 3;
        rapportOuJournal(etat, '📜 ' + PROV[i].nom + ' accueille son seigneur légitime : aucune révolte (revendication).');
      }
      if (c.gs && c.gs.f === ancien && etat.tour <= c.gs.fin) {
        p.agit = Math.min(p.agit, 5);
        c.piete += 5; F.prestige = (F.prestige || 0) + 2;
      }
    },
    tour: function (etat, alea, avant) { if (etat.couronne) tour(etat, alea, avant); }
  });
  function rapportOuJournal(etat, t) { if (etat.rapport) rapport(etat, t); M.log(etat, t); }

  // ---------- Un tour de l'Édition Couronne ----------
  function lieuxTenus(etat, f) {
    var R = REL[foi(etat, f)];
    return R ? R.lieux.filter(function (id) { return etat.provinces[INDEX[id]].proprio === f; }) : [];
  }
  function gainPiete(etat) {
    return 1 + 2 * lieuxTenus(etat, etat.joueur).length + Math.floor(M.bonusConseil(etat, 'chapelain') / 3) + effetTraits(etat, 'piete') + 2 * niv(etat, 'foi');
  }
  function gainRenom(etat) {
    var F = J(etat);
    return 2 + Math.floor((F.prestige || 0) / 25) + 2 * ((F.empires || []).length) + Math.floor(nbProv(etat, etat.joueur) / 10);
  }
  function tour(etat, alea, avant) {
    preparer(etat);
    var c = C(etat), F = J(etat);
    c.piete = Math.max(0, c.piete + gainPiete(etat));
    c.renom += gainRenom(etat);
    var pr = effetTraits(etat, 'prestige');
    if (pr) F.prestige = Math.max(0, (F.prestige || 0) + pr);
    var dip = effetTraits(etat, 'diplo');
    // Les royaumes de même foi t'apprécient un peu chaque tour, les infidèles se méfient.
    etat.diplo.forEach(function (Dp, f) {
      if (!Dp || !nbProv(etat, f)) return;
      var e = ecart(F.foi, etat.factions[f].foi);
      var d = (e === 0 ? 1 : e === 2 ? -1 : 0) + dip;
      if (d) M.changerAttitude(etat, f, d);
    });
    // La Réforme : certains royaumes deviennent protestants.
    Object.keys(D.REFORME).forEach(function (id) {
      var an = D.REFORME[id];
      if (an <= avant || an > etat.annee) return;
      etat.factions.forEach(function (G, g) {
        if (G.id !== id || g === etat.joueur || G.foi !== 'catholique' || !nbProv(etat, g)) return;
        G.foi = 'protestant';
        var cap = etat.provinces[G.capitale];
        if (cap && cap.proprio === g) cap.foi = 'protestant';
        etat.nouvelles.push('📖 ' + G.nom + ' adopte la Réforme protestante.');
      });
    });
    // Conversion lente des provinces à la foi de leur seigneur.
    etat.provinces.forEach(function (p, i) {
      var f = p.proprio;
      if (f < 0 || !ecart(p.foi, foi(etat, f))) return;
      var ch = 0.04 + (f === etat.joueur ? 0.01 * Math.floor(M.bonusConseil(etat, 'chapelain') / 2) : 0) + (M.estCapitale(etat, i) ? 0.06 : 0);
      if (alea() < ch) {
        p.foi = foi(etat, f);
        if (f === etat.joueur) rapport(etat, REL[p.foi].ico + ' ' + PROV[i].nom + ' se convertit à ta foi (' + REL[p.foi].nom.toLowerCase() + ').');
      }
    });
    // Fin de la guerre sainte.
    if (c.gs && etat.tour > c.gs.fin) {
      rapport(etat, '⚔️ La ' + c.gs.nom.toLowerCase() + ' contre ' + etat.factions[c.gs.f].nom + ' prend fin. Les volontaires rentrent chez eux.');
      c.gs = null;
    }
    tourIntrigues(etat, alea);
    evenements(etat, alea);
  }

  // ---------- Actions : foi ----------
  function coutGuerreSainte(etat, f) { return (ecart(J(etat).foi, foi(etat, f)) === 1 ? 200 : 150) - (niv(etat, 'foi') >= 3 ? 50 : 0); }
  function voisins(etat, f) {
    return etat.provinces.some(function (p, i) { return p.proprio === etat.joueur && PROV[i].voisins.some(function (v) { return etat.provinces[v].proprio === f; }); });
  }
  function ciblesGuerreSainte(etat) {
    var Jf = J(etat).foi;
    return etat.factions.map(function (F, f) {
      if (f === etat.joueur || !nbProv(etat, f) || !ecart(Jf, F.foi) || !voisins(etat, f)) return null;
      return { f: f, cout: coutGuerreSainte(etat, f) };
    }).filter(Boolean);
  }
  function meilleureUnite(etat) {
    var l = M.TYPES.filter(function (t) { return U[t].annee <= etat.annee && U[t].cat !== 'art'; });
    l.sort(function (a, b) { return U[b].cout - U[a].cout; });
    return l[0] || 'milice';
  }
  function guerreSainte(etat, f) {
    var c = C(etat), F = etat.factions[f], Jf = J(etat);
    if (c.gs) return 'Une guerre sainte est déjà en cours.';
    if (!F || !nbProv(etat, f) || !ecart(Jf.foi, F.foi)) return 'Ce royaume partage ta foi.';
    if (!voisins(etat, f)) return 'Ce royaume ne touche pas tes terres.';
    var cout = coutGuerreSainte(etat, f);
    if (c.piete < cout) return 'Il faut ' + cout + ' de piété.';
    c.piete -= cout;
    var R = REL[Jf.foi];
    if (M.relation(etat, f) !== 'guerre') M.changerRelation(etat, f, 'guerre');
    M.changerAttitude(etat, f, -40);
    etat.factions.forEach(function (G, g) {
      if (g === etat.joueur || g === f || !etat.diplo[g]) return;
      if (G.foi === Jf.foi) M.changerAttitude(etat, g, 10);
      else if (G.foi === F.foi) M.changerAttitude(etat, g, -10);
    });
    // Des volontaires rejoignent tes armées à la frontière.
    var n = 3 + (niv(etat, 'guerre') >= 3 ? 1 : 0), t = meilleureUnite(etat), places = [];
    etat.provinces.forEach(function (p, i) {
      if (p.proprio === etat.joueur && PROV[i].voisins.some(function (v) { return etat.provinces[v].proprio === f; })) places.push(i);
    });
    places.sort(function (a, b) { return etat.provinces[a].armee.length - etat.provinces[b].armee.length; });
    var poses = 0;
    for (var k = 0; k < n && places.length; k++) {
      var p = etat.provinces[places[k % places.length]];
      if (p.armee.length >= M.MAX_UNITES) continue;
      p.armee.push(M.creerUnite(t)); poses++;
    }
    c.gs = { f: f, nom: R.guerre, fin: etat.tour + 8 };
    Jf.prestige = (Jf.prestige || 0) + 5;
    var msg = R.ico + ' ' + R.guerre + ' contre ' + F.nom + ' ! ' + poses + ' ' + U[t].nom.toLowerCase() + ' volontaires rejoignent tes armées. Pendant 8 tours, les provinces prises à l\'ennemi se soumettent vite.';
    M.log(etat, msg);
    return { ok: true, msg: msg };
  }
  function convertir(etat, i) {
    var c = C(etat), p = etat.provinces[i], Jf = J(etat);
    if (p.proprio !== etat.joueur) return 'Pas ta province.';
    if (p.foi === Jf.foi) return 'Elle partage déjà ta foi.';
    var cout = coutConversion(etat, i);
    if (c.piete < cout) return 'Il faut ' + cout + ' de piété.';
    c.piete -= cout;
    p.foi = Jf.foi;
    p.ordre = Math.max(0, p.ordre - 5);
    M.log(etat, REL[Jf.foi].ico + ' Les missionnaires convertissent ' + PROV[i].nom + '.');
    return null;
  }
  function coutConversion(etat, i) { return ecart(etat.provinces[i].foi, J(etat).foi) === 1 ? 50 : 80; }
  function pelerinage(etat) {
    var c = C(etat), Jf = J(etat);
    if (etat.tour - c.pele < 10) return 'Prochain pèlerinage possible au tour ' + (c.pele + 10) + '.';
    if (Jf.or < 80) return 'Il faut 80 pièces d\'or.';
    Jf.or -= 80;
    c.pele = etat.tour;
    c.piete += 40;
    Jf.prestige = (Jf.prestige || 0) + 8;
    var R = REL[Jf.foi], lieu = PROV[INDEX[R.lieux[0]]].nom;
    var msg = '🧭 ' + Jf.roi.nom + ' part en pèlerinage vers ' + lieu + ' et revient grandi (piété +40, prestige +8).';
    if (M.aleaPartie(etat)() < 0.12) { Jf.roi.fragile = true; msg += ' Mais il a attrapé une fièvre en route : sa santé reste fragile.'; }
    M.log(etat, msg);
    return { ok: true, msg: msg };
  }
  function predication(etat) {
    var c = C(etat);
    if (c.piete < 60) return 'Il faut 60 de piété.';
    c.piete -= 60;
    etat.provinces.forEach(function (p) { if (p.proprio === etat.joueur) p.ordre = Math.min(100, p.ordre + 10); });
    var msg = '🔔 Grande prédication dans tout le royaume : ordre public +10 partout.';
    M.log(etat, msg);
    return { ok: true, msg: msg };
  }

  // ---------- Actions : dynastie ----------
  function heritage(etat, k) {
    var c = C(etat), n = niv(etat, k);
    if (!HER[k]) return 'Héritage inconnu.';
    if (n >= 3) return 'Déjà au maximum.';
    var cout = D.COUT_HERITAGE[n];
    if (c.renom < cout) return 'Il faut ' + cout + ' de renommée.';
    c.renom -= cout;
    c.her[k] = n + 1;
    M.log(etat, '🏰 La dynastie ' + J(etat).cour.dyn + ' gagne l\'héritage « ' + HER[k].nom + ' » (niveau ' + (n + 1) + ').');
    return null;
  }

  // ---------- Actions : intrigues ----------
  function maxIntrigues(etat) { return niv(etat, 'ombre') >= 2 ? 3 : 2; }
  function vitesse(etat, s) {
    return Math.max(3, INT[s.type].vitesse + 4 * M.bonusConseil(etat, 'espion') + effetTraits(etat, 'intrigue') + 5 * niv(etat, 'ombre'));
  }
  function risque(etat, s) {
    var r = INT[s.type].risque;
    if (!r) return 0;
    return Math.max(2, r - M.bonusConseil(etat, 'espion') - (niv(etat, 'ombre') >= 3 ? 4 : 0) + (effetTraits(etat, 'intrigue') < 0 ? 3 : 0));
  }
  function ciblesIntrigue(etat, type) {
    var cible = INT[type].cible;
    if (cible === 'royaume') return etat.factions.map(function (F, f) { return f !== etat.joueur && nbProv(etat, f) ? f : -1; }).filter(function (f) { return f >= 0; });
    if (cible === 'noble') return (J(etat).cour.nobles || []).filter(function (n) { return n.loy < 80; }).map(function (n) { return n.id; });
    var l = [];
    etat.provinces.forEach(function (p, i) {
      if (p.proprio === etat.joueur || C(etat).revs[i]) return;
      if (PROV[i].voisins.some(function (v) { return etat.provinces[v].proprio === etat.joueur; })) l.push(i);
    });
    return l;
  }
  function lancerIntrigue(etat, type, cible) {
    var c = C(etat), Jf = J(etat), T = INT[type];
    if (!T) return 'Intrigue inconnue.';
    if (c.intrigues.length >= maxIntrigues(etat)) return 'Pas plus de ' + maxIntrigues(etat) + ' intrigues à la fois.';
    if (c.intrigues.some(function (s) { return s.type === type && s.cible === cible; })) return 'Cette intrigue est déjà en cours.';
    if (ciblesIntrigue(etat, type).indexOf(cible) < 0) return 'Cible impossible.';
    if (Jf.or < T.or) return 'Il faut ' + T.or + ' pièces d\'or.';
    Jf.or -= T.or;
    c.intrigues.push({ type: type, cible: cible, prog: 0, debut: etat.tour });
    return null;
  }
  function annulerIntrigue(etat, k) { C(etat).intrigues.splice(k, 1); }
  function nomCible(etat, s) {
    var T = INT[s.type];
    if (T.cible === 'royaume') return etat.factions[s.cible].roi.nom + ' (' + etat.factions[s.cible].nom + ')';
    if (T.cible === 'province') return PROV[s.cible].nom;
    var n = (J(etat).cour.nobles || []).filter(function (x) { return x.id === s.cible; })[0];
    return n ? n.nom : '?';
  }
  function tourIntrigues(etat, alea) {
    var c = C(etat), Jf = J(etat);
    for (var k = c.intrigues.length - 1; k >= 0; k--) {
      var s = c.intrigues[k], T = INT[s.type], nom = nomCible(etat, s);
      // La cible a disparu ?
      if ((T.cible === 'royaume' && !nbProv(etat, s.cible)) || (T.cible === 'province' && etat.provinces[s.cible].proprio === etat.joueur) || nom === '?') {
        c.intrigues.splice(k, 1); continue;
      }
      if (alea() * 100 < risque(etat, s)) {
        c.intrigues.splice(k, 1);
        var cible = T.cible === 'royaume' ? s.cible : T.cible === 'province' ? etat.provinces[s.cible].proprio : -1;
        Jf.prestige = Math.max(0, (Jf.prestige || 0) - 10);
        var msg = '🚨 Intrigue découverte ! ' + T.ico + ' « ' + T.nom + ' » contre ' + nom + ' échoue (prestige −10).';
        if (cible >= 0 && etat.diplo[cible]) {
          M.changerAttitude(etat, cible, -35);
          if (etat.diplo[cible].att < -50 && M.relation(etat, cible) !== 'guerre') {
            M.changerRelation(etat, cible, 'guerre');
            msg += ' Furieux, ' + etat.factions[cible].nom + ' te déclare la guerre !';
          }
        }
        rapport(etat, msg); M.log(etat, msg);
        continue;
      }
      s.prog += vitesse(etat, s);
      if (s.prog < 100) continue;
      c.intrigues.splice(k, 1);
      reussir(etat, s, alea, nom);
    }
  }
  function reussir(etat, s, alea, nom) {
    var c = C(etat), Jf = J(etat), T = INT[s.type], msg;
    if (s.type === 'assassinat') {
      var msgs = M.succession(etat, s.cible, alea);
      msg = '🗡️ Ton complot réussit : ' + nom + ' est assassiné !';
      rapport(etat, msg); M.log(etat, msg);
      msgs.slice(1).forEach(function (t) { rapport(etat, t); M.log(etat, t); });
      return;
    }
    if (s.type === 'revendication') { c.revs[s.cible] = true; msg = '📜 Tes juristes ont « retrouvé » des droits sur ' + nom + ' : conquiers-la sans révolte.'; }
    else if (s.type === 'discorde') {
      etat.provinces.forEach(function (p) { if (p.proprio === s.cible) { p.ordre = Math.max(0, p.ordre - 20); p.agit = (p.agit || 0) + 10; } });
      msg = '🔥 Tes agents sèment la discorde chez ' + etat.factions[s.cible].nom + ' (ordre public −20 partout).';
    } else if (s.type === 'tresor') {
      var F = etat.factions[s.cible], v = Math.min(300, Math.floor(F.or * 0.25));
      F.or -= v; Jf.or += v;
      msg = '💰 Tes espions vident le trésor de ' + F.nom + ' : +' + v + ' or.';
    } else if (s.type === 'rallier') {
      var n = (Jf.cour.nobles || []).filter(function (x) { return x.id === s.cible; })[0];
      if (n) n.loy = Math.min(100, n.loy + 40);
      msg = '🎩 ' + nom + ' t\'est désormais tout dévoué (loyauté +40).';
    }
    if (msg) { rapport(etat, msg); M.log(etat, msg); }
  }

  // ---------- Événements de l'Édition Couronne ----------
  // Ils passent par la même file que les événements de cour (etat.evenements).
  var EDUC = [['brave', '⚔️ Le métier des armes'], ['honnete', '📜 La diplomatie'], ['ruse', '🕯️ L\'intrigue'], ['pieux', '🙏 La piété']];
  function evenements(etat, alea) {
    var c = C(etat), Jf = J(etat), ev = etat.evenements = etat.evenements || [];
    // La Réforme (une seule fois).
    if (!c.vu.reforme && Jf.foi === 'catholique' && etat.annee >= 1517 && etat.annee <= 1650) {
      c.vu.reforme = true;
      ev.push({ type: 'c_reforme', titre: '📖 La Réforme protestante', texte: 'Luther dénonce les abus de l\'Église. Dans tout ton royaume, on lit la Bible en langue du peuple. Tes conseillers te pressent de choisir ton camp.', choix: ['📖 Adopter la Réforme (+200 or des biens de l\'Église, les catholiques t\'en veulent)', '✝️ Rester fidèle à Rome (+60 piété, le pape t\'apprécie)'] });
      return;
    }
    // Éducation de l'héritier.
    var h = M.heritier(Jf);
    if (h && !h.educ && M.age(etat, h) >= 6 && M.age(etat, h) <= 16) {
      ev.push({ type: 'c_educ', data: { nom: h.nom }, titre: '🎓 L\'éducation de ' + h.nom, texte: h.nom + ', ' + (h.sexe === 'f' ? 'ta future héritière' : 'ton futur héritier') + ', a ' + M.age(etat, h) + ' ans. À quoi ses précepteurs doivent-ils ' + (h.sexe === 'f' ? 'la' : 'le') + ' former ? Ce sera un de ses traits de caractère quand ' + (h.sexe === 'f' ? 'elle' : 'il') + ' régnera.', choix: EDUC.map(function (e) { return e[1] + ' (' + TR[e[0]].nom.toLowerCase() + ')'; }) });
      return;
    }
    if (alea() > 0.3) return;
    var types = ['c_relique', 'c_concile', 'c_insulte', 'c_heresie', 'c_astrologue'];
    var t = types[Math.floor(alea() * types.length)], R = REL[Jf.foi];
    if (t === 'c_relique') ev.push({ type: t, titre: '🏺 Une relique sainte', texte: 'Un marchand propose une relique très vénérée par les fidèles ' + R.ico + '. Elle attirerait les pèlerins.', choix: ['💰 L\'acheter (−80 or, +50 piété)', '🙅 Refuser'] });
    else if (t === 'c_concile') ev.push({ type: t, titre: '⛪ Un grand concile', texte: R.chef.charAt(0).toUpperCase() + R.chef.slice(1) + ' te demandent de réunir un concile pour apaiser les querelles religieuses.', choix: ['🤝 Le financer (−50 or, +30 piété, ordre +5 partout)', '🙅 Pas maintenant'] });
    else if (t === 'c_insulte') {
      var l = etat.factions.map(function (F, f) { return f !== etat.joueur && nbProv(etat, f) && voisins(etat, f) ? f : -1; }).filter(function (f) { return f >= 0; });
      if (!l.length) return;
      var f = l[Math.floor(alea() * l.length)], F = etat.factions[f];
      ev.push({ type: t, data: { f: f }, titre: '😤 Une insulte publique', texte: F.roi.nom + ' (' + F.nom + ') s\'est moqué de ' + Jf.roi.nom + ' devant toute sa cour. Tes nobles attendent ta réaction.', choix: ['⚔️ Exiger réparation (prestige +10, ' + F.nom + ' t\'en veut)', '🕊️ Ignorer l\'affront (prestige −5)'] });
    } else if (t === 'c_heresie') {
      var mes = etat.provinces.map(function (p, i) { return p.proprio === etat.joueur && p.foi === Jf.foi && !M.estCapitale(etat, i) ? i : -1; }).filter(function (i) { return i >= 0; });
      if (!mes.length) return;
      var i = mes[Math.floor(alea() * mes.length)];
      ev.push({ type: t, data: { i: i }, titre: '🔥 Une hérésie à ' + PROV[i].nom, texte: 'Des prêcheurs contestent la vraie foi à ' + PROV[i].nom + '. Le clergé réclame des mesures.', choix: ['⚖️ Envoyer des missionnaires (−30 piété)', '🤷 Laisser faire (la province risque de changer de foi)'] });
    } else if (t === 'c_astrologue') ev.push({ type: t, titre: '🔭 L\'astrologue de la cour', texte: 'Ton astrologue a lu dans les étoiles : il prétend savoir si ton règne sera long. Il réclame une belle récompense.', choix: ['💰 L\'écouter (−40 or, renommée +25)', '🙅 Le chasser'] });
  }
  function choisir(etat, E, n) {
    var c = C(etat), Jf = J(etat), a = n === 0, msg;
    var cout = function (o) { if (Jf.or < o) return false; Jf.or -= o; return true; };
    if (E.type === 'c_reforme') {
      if (a) {
        Jf.foi = 'protestant'; Jf.or += 200;
        var cap = etat.provinces[Jf.capitale]; if (cap && cap.proprio === etat.joueur) cap.foi = 'protestant';
        etat.factions.forEach(function (G, g) { if (g !== etat.joueur && G.foi === 'catholique' && etat.diplo[g]) M.changerAttitude(etat, g, -20); });
        msg = '📖 Ton royaume embrasse la Réforme ! +200 or. Les provinces se convertiront peu à peu (ou avec tes missionnaires).';
      } else {
        c.piete += 60;
        etat.factions.forEach(function (G, g) { if (G.id === 'papaute' && etat.diplo[g]) M.changerAttitude(etat, g, 20); });
        msg = '✝️ Tu restes fidèle à Rome (piété +60).';
      }
    } else if (E.type === 'c_educ') {
      var h = Jf.cour.fam.filter(function (m) { return m.nom === E.data.nom; })[0];
      if (h) { h.educ = EDUC[n][0]; msg = '🎓 Les précepteurs de ' + h.nom + ' lui enseignent ' + EDUC[n][1].slice(EDUC[n][1].indexOf(' ') + 1).toLowerCase() + ' (trait « ' + TR[h.educ].nom + ' »).'; }
    } else if (E.type === 'c_relique') {
      if (a && cout(80)) { c.piete += 50; msg = '🏺 La relique attire les pèlerins (piété +50).'; } else if (a) msg = 'Pas assez d\'or.'; else msg = 'Le marchand repart.';
    } else if (E.type === 'c_concile') {
      if (a && cout(50)) { c.piete += 30; etat.provinces.forEach(function (p) { if (p.proprio === etat.joueur) p.ordre = Math.min(100, p.ordre + 5); }); msg = '⛪ Le concile apaise les esprits (piété +30, ordre +5).'; }
      else if (a) msg = 'Pas assez d\'or.'; else { c.piete = Math.max(0, c.piete - 10); msg = 'Le clergé est déçu (piété −10).'; }
    } else if (E.type === 'c_insulte') {
      if (a) { Jf.prestige = (Jf.prestige || 0) + 10; if (etat.diplo[E.data.f]) M.changerAttitude(etat, E.data.f, -25); msg = '⚔️ Ton honneur est sauf (prestige +10).'; }
      else { Jf.prestige = Math.max(0, (Jf.prestige || 0) - 5); msg = '🕊️ Tu ignores l\'affront (prestige −5).'; }
    } else if (E.type === 'c_heresie') {
      var p = etat.provinces[E.data.i];
      if (a && c.piete >= 30) { c.piete -= 30; msg = '⚖️ Les missionnaires ramènent ' + PROV[E.data.i].nom + ' dans la vraie foi (piété −30).'; }
      else {
        var avant = a ? 'Pas assez de piété. ' : '';
        var autres = Object.keys(REL).filter(function (r) { return r !== Jf.foi && REL[r].groupe === REL[Jf.foi].groupe; });
        if (p.proprio === etat.joueur && autres.length && M.aleaPartie(etat)() < 0.5) { p.foi = autres[0]; msg = avant + '🔥 ' + PROV[E.data.i].nom + ' passe à l\'hérésie (' + REL[p.foi].nom.toLowerCase() + ').'; }
        else msg = avant + 'L\'hérésie s\'éteint d\'elle-même.';
      }
    } else if (E.type === 'c_astrologue') {
      if (a && cout(40)) { c.renom += 25; msg = '🔭 « Ta dynastie régnera mille ans ! » La cour est ravie (renommée +25).'; } else if (a) msg = 'Pas assez d\'or.'; else msg = 'L\'astrologue part en maudissant ta lignée.';
    }
    if (msg) M.log(etat, msg);
    return msg;
  }
  // Les choix des événements Couronne sont traités ici, les autres par le moteur.
  var choisirBase = M.choisirEvenement;
  M.choisirEvenement = function (etat, n) {
    var E = (etat.evenements || [])[0];
    if (!E || String(E.type).indexOf('c_') !== 0) return choisirBase(etat, n);
    etat.evenements.shift();
    return choisir(etat, E, n);
  };

  var CR = {
    D: D, RELIGIONS: REL, TRAITS: TR, HERITAGES: HER, INTRIGUES: INT,
    assurer: assurer, foiInitiale: foiInitiale, ecart: ecart, traits: traits, effetTraits: effetTraits, niv: niv,
    gainPiete: gainPiete, gainRenom: gainRenom, lieuxTenus: lieuxTenus,
    ciblesGuerreSainte: ciblesGuerreSainte, guerreSainte: guerreSainte, convertir: convertir, coutConversion: coutConversion,
    pelerinage: pelerinage, predication: predication, heritage: heritage,
    maxIntrigues: maxIntrigues, ciblesIntrigue: ciblesIntrigue, lancerIntrigue: lancerIntrigue, annulerIntrigue: annulerIntrigue,
    vitesse: vitesse, risque: risque, nomCible: nomCible
  };

  // ---------- Accès à l'Édition Couronne ----------
  // Débloquée par le compte du site (table « premium » de Supabase), vérifiée par jeu.js.
  // Le résultat est gardé sur l'appareil pour jouer hors ligne. La version PC (Steam) l'inclut.
  var CLE_ACCES = 'imperium-couronne', acces = null, attente = [];
  function lireCache() { try { return JSON.parse(localStorage.getItem(CLE_ACCES)) || null; } catch (e) { return null; } }
  CR.actif = function () {
    if (root.imperiumPC) return true;
    if (acces !== null) return acces;
    var c = lireCache();
    return !!(c && c.ok);
  };
  CR.connu = function () { return !!root.imperiumPC || acces !== null; };
  // ok : true / false ; uid : compte vérifié ; horsLigne : la vérification a échoué (on garde le cache de ce compte).
  CR.definir = function (ok, uid, horsLigne) {
    if (horsLigne) { var c = lireCache(); acces = !!(c && c.ok && (!uid || c.uid === uid)); }
    else {
      acces = !!ok;
      try { if (acces) localStorage.setItem(CLE_ACCES, JSON.stringify({ ok: true, uid: uid, t: Date.now() })); else localStorage.removeItem(CLE_ACCES); } catch (e) {}
    }
    attente.splice(0).forEach(function (fn) { fn(acces); });
  };
  // Attend la réponse (au plus 5 s) avant de décider.
  CR.attendre = function (fn) {
    if (CR.connu()) { fn(CR.actif()); return; }
    var fait = false, une = function (v) { if (!fait) { fait = true; fn(v); } };
    attente.push(une);
    setTimeout(function () { une(CR.actif()); }, 5000);
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CR;
  else root.Couronne = CR;
})(this);
