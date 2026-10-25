/* Naufragés : Conquête — affichage et commandes (carte du monde, villes, batailles). */
(function () {
  'use strict';
  var M = window.Moteur, U = M.UNITES, PROV = M.PROV, MONDE = M.MONDE, HIST = M.HISTOIRE;
  var CLE = 'strategie-partie-v2';
  var etat = null, choix = null;   // choix = index de la province sélectionnée
  var $ = function (id) { return document.getElementById(id); };
  var REBELLES = '#9ca3af';

  // ---------- Sauvegarde ----------
  function sauver() { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) {} }
  function charger() {
    try { var s = JSON.parse(localStorage.getItem(CLE)); return s && s.v === 2 && !s.fin ? s : null; } catch (e) { return null; }
  }

  function coul(f) { return f >= 0 ? etat.factions[f].coul : REBELLES; }
  function nomF(f) { return f >= 0 ? etat.factions[f].nom : 'Rebelles'; }
  function moi() { return etat.joueur; }
  function montrer(id) {
    ['menu', 'campagne', 'bataille'].forEach(function (e) { $(e).classList.toggle('hide', e !== id); });
  }
  function toast(txt) {
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = txt;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2800);
  }
  function feuille(html) { $('feuille').innerHTML = html; $('feuille').scrollTop = 0; $('voile').classList.remove('hide'); }
  function fermer() { $('voile').classList.add('hide'); }
  $('voile').addEventListener('click', function (e) { if (e.target.id === 'voile') fermer(); });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-fermer]')) fermer(); });

  function puceUnite(u, extra) {
    return '<span class="u ' + (extra || '') + '">' + U[u.t].ico + ' ' + U[u.t].nom + ' <small>' + M.hommes(u) + '</small></span>';
  }
  function icones(armee) { return armee.map(function (u) { return U[u.t].ico; }).join(' ') || 'Personne'; }

  // ---------- Menu : époque puis royaume ----------
  function menu() {
    $('bContinuer').classList.toggle('hide', !charger());
    montrer('menu');
  }
  $('bNouvelle').onclick = choisirEpoque;
  $('bContinuer').onclick = function () { etat = charger(); choix = null; demarrer(); };
  $('bRegles').onclick = regles;

  function choisirEpoque() {
    var h = '<h2>📅 Choisis ton époque</h2><p>Chaque campagne se termine en ' + HIST.FIN + '. Les unités évoluent avec les siècles : chevaliers, arbalètes, puis canons et mousquets.</p>';
    HIST.EPOQUES.forEach(function (e) {
      h += '<button class="carteChoix" data-ep="' + e.id + '"><span class="an">' + e.annee + '</span><b>' + e.titre + '</b><small>' + e.texte + '</small></button>';
    });
    h += '<button class="btn" data-fermer>Annuler</button>';
    feuille(h);
    document.querySelectorAll('[data-ep]').forEach(function (b) { b.onclick = function () { choisirFaction(b.getAttribute('data-ep')); }; });
  }

  function choisirFaction(epId) {
    var E = M.epoque(epId);
    var liste = E.factions.slice().sort(function (a, b) { return b[3].length - a[3].length; });
    var h = '<h2>' + E.annee + ' · ' + E.titre + '</h2><p>Quel royaume veux-tu diriger ? Objectif : posséder <b>' + HIST.OBJECTIF + ' provinces</b> avant ' + HIST.FIN + '.</p>';
    liste.forEach(function (f) {
      var n = f[3].length, diff = n >= 10 ? '🟢 Facile' : n >= 4 ? '🟡 Moyen' : '🔴 Difficile';
      var cap = PROV.filter(function (p) { return p.id === f[3][0]; })[0].nom;
      h += '<button class="carteChoix faction" data-f="' + f[0] + '"><span class="pastille" style="background:' + f[2] + '"></span><b>' + f[1] + '</b>' +
        '<small>Capitale : ' + cap + ' · ' + n + ' province' + (n > 1 ? 's' : '') + ' · ' + diff + '</small></button>';
    });
    h += '<button class="btn" id="fRetourEp">← Autre époque</button>';
    feuille(h);
    $('fRetourEp').onclick = choisirEpoque;
    document.querySelectorAll('[data-f]').forEach(function (b) {
      b.onclick = function () {
        etat = M.nouvellePartie(epId, b.getAttribute('data-f'));
        choix = etat.factions[etat.joueur].capitale;
        sauver(); fermer(); demarrer();
        var dejaJoue = false;
        try { dejaJoue = localStorage.getItem('strategie-vu'); localStorage.setItem('strategie-vu', '1'); } catch (e) {}
        if (!dejaJoue) regles(); else toast(E.annee + ' : tu diriges ' + etat.factions[etat.joueur].nom + ' !');
      };
    });
  }

  function regles() {
    feuille('<h2>📖 Comment jouer</h2><ol class="regles">' +
      '<li>Choisis une <b>époque</b> (de 771 à 1700) et un <b>royaume</b>. Le but : posséder <b>' + HIST.OBJECTIF + ' provinces</b> avant ' + HIST.FIN + ', ou être le plus grand royaume à la fin.</li>' +
      '<li>Fais glisser la carte pour te déplacer, pince (ou boutons + / −) pour zoomer. Touche une de tes provinces pour voir sa ville et son armée.</li>' +
      '<li><b>Construis</b> dans tes villes : 💰 marché (plus d\'or), ⚒️ caserne (meilleures unités), 🏰 remparts (défense), 🌾 fermes. Un chantier par ville et par tour.</li>' +
      '<li><b>Recrute</b> des unités. De nouvelles apparaissent avec le temps : chevaliers (1000), arbalétriers (1150), piquiers (1300), canons et arquebuses (1450), mousquetaires (1600).</li>' +
      '<li>Touche une province <b>voisine</b> (contour jaune) pour y envoyer tes troupes. Si elle est ennemie : <b>bataille</b>, ou <b>siège</b> si la ville a des remparts.</li>' +
      '<li>En bataille, c\'est toi le commandant : touche une de tes unités, puis un ennemi pour l\'attaquer, ou le sol pour la déplacer. Les canons abattent les murs !</li>' +
      '<li>🔱🦔 Piques battent 🐎🏇 cavaliers · 🐎🏇 cavaliers écrasent 🏹🎯🔥 tireurs · ⚔️ hommes d\'armes solides partout.</li>' +
      '</ol><button class="btn or" data-fermer>C\'est parti !</button>');
  }

  // ---------- Campagne ----------
  function demarrer() {
    montrer('campagne');
    construireCarte();
    var c = PROV[etat.factions[etat.joueur].capitale];
    centrer(c.x, c.y, 330);
    dessiner();
  }

  $('bMenu').onclick = function () {
    feuille('<h2>Pause</h2><p>' + etat.factions[moi()].nom + ' · ' + etat.annee + '. Ta campagne est sauvegardée automatiquement.</p>' +
      '<button class="btn" id="fClassement">🏆 Classement des royaumes</button>' +
      '<button class="btn" id="fRegles">📖 Comment jouer</button>' +
      '<button class="btn" id="fMenu">🏠 Menu principal</button>' +
      '<button class="btn rouge" id="fNouvelle">🔄 Nouvelle campagne</button>');
    $('fClassement').onclick = classement;
    $('fRegles').onclick = regles;
    $('fMenu').onclick = function () { fermer(); menu(); };
    $('fNouvelle').onclick = choisirEpoque;
  };
  $('bJournal').onclick = function () {
    feuille('<h2>📜 Chroniques</h2><ul class="journal">' + etat.journal.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' +
      '<button class="btn" data-fermer>Fermer</button>');
  };
  function classement() {
    var c = M.classement(etat);
    feuille('<h2>🏆 Classement en ' + etat.annee + '</h2><ol class="journal">' + c.slice(0, 12).map(function (x) {
      return '<li><span class="pastille" style="background:' + x.coul + '"></span> ' + (x.i === moi() ? '<b>' + x.nom + ' (toi)</b>' : x.nom) + ' — ' + x.n + ' provinces</li>';
    }).join('') + '</ol><button class="btn" data-fermer>Fermer</button>');
  }

  // ---------- Carte zoomable ----------
  var svg = $('carte'), vb = { x: 0, y: 0, w: MONDE.largeur, h: MONDE.hauteur };
  var NS = 'http://www.w3.org/2000/svg';
  var calqueProv, calqueBord, calqueTexte;

  function construireCarte() {
    if (calqueProv) return;
    svg.innerHTML =
      '<defs><radialGradient id="mer" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#1d4e7a"/><stop offset="1" stop-color="#0c2643"/></radialGradient>' +
      '<pattern id="vagues" width="24" height="12" patternUnits="userSpaceOnUse"><path d="M0 6q6-4 12 0t12 0" fill="none" stroke="#ffffff" stroke-opacity=".05"/></pattern></defs>' +
      '<rect x="-500" y="-500" width="' + (MONDE.largeur + 1000) + '" height="' + (MONDE.hauteur + 1000) + '" fill="url(#mer)"/>' +
      '<rect x="-500" y="-500" width="' + (MONDE.largeur + 1000) + '" height="' + (MONDE.hauteur + 1000) + '" fill="url(#vagues)"/>' +
      '<path d="' + MONDE.terre + '" fill="#cdbf98" stroke="#8b7d5a" stroke-width=".6"/>' +
      '<g id="cProv"></g><g id="cBord"></g><g id="cTexte"></g>';
    calqueProv = $('cProv'); calqueBord = $('cBord'); calqueTexte = $('cTexte');
    PROV.forEach(function (p, i) {
      var el = document.createElementNS(NS, 'path');
      el.setAttribute('d', p.d);
      el.setAttribute('data-id', i);
      el.setAttribute('class', 'prov');
      calqueProv.appendChild(el);
    });
  }

  function appliquerVue() {
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
    svg.classList.toggle('loin', vb.w > 520);
    svg.classList.toggle('tresloin', vb.w > 800);
  }
  function ratio() { var r = svg.getBoundingClientRect(); return r.height / r.width || 1; }
  function centrer(x, y, w) {
    vb.w = w; vb.h = w * ratio();
    vb.x = x - vb.w / 2; vb.y = y - vb.h / 2;
    borner(); appliquerVue();
  }
  function borner() {
    var maxW = MONDE.largeur * 1.15;
    if (vb.w > maxW) { var k = maxW / vb.w; vb.w *= k; vb.h *= k; }
    if (vb.w < 120) { var k2 = 120 / vb.w; vb.w *= k2; vb.h *= k2; }
    vb.x = Math.max(-80, Math.min(MONDE.largeur + 80 - vb.w, vb.x));
    vb.y = Math.max(-80, Math.min(MONDE.hauteur + 80 - vb.h, vb.y));
  }
  function zoomer(f, cx, cy) { // cx, cy en coordonnées carte
    var r = svg.getBoundingClientRect();
    if (cx == null) { cx = vb.x + vb.w / 2; cy = vb.y + vb.h / 2; }
    var nx = (cx - vb.x) / vb.w, ny = (cy - vb.y) / vb.h;
    vb.w *= f; vb.h = vb.w * (r.height / r.width);
    vb.x = cx - nx * vb.w; vb.y = cy - ny * vb.h;
    borner(); appliquerVue();
  }
  function versCarte(px, py) {
    var r = svg.getBoundingClientRect();
    return { x: vb.x + (px - r.left) / r.width * vb.w, y: vb.y + (py - r.top) / r.height * vb.h };
  }
  $('zPlus').onclick = function () { zoomer(0.7); };
  $('zMoins').onclick = function () { zoomer(1.4); };
  $('zMoi').onclick = function () {
    var c = PROV[choix != null ? choix : etat.factions[moi()].capitale];
    centrer(c.x, c.y, 330);
  };
  window.addEventListener('resize', function () { if (etat && !$('campagne').classList.contains('hide')) { vb.h = vb.w * ratio(); borner(); appliquerVue(); } });

  // Glisser pour déplacer, pincer pour zoomer, toucher pour choisir.
  var doigts = {}, geste = null;
  svg.addEventListener('pointerdown', function (e) {
    doigts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(doigts);
    if (ids.length === 1) geste = { type: 'tap', x0: e.clientX, y0: e.clientY, vx: vb.x, vy: vb.y, cible: e.target };
    else if (ids.length === 2) {
      var a = doigts[ids[0]], b = doigts[ids[1]];
      geste = { type: 'pince', d0: Math.hypot(a.x - b.x, a.y - b.y), w0: vb.w, c: versCarte((a.x + b.x) / 2, (a.y + b.y) / 2) };
    }
    try { svg.setPointerCapture(e.pointerId); } catch (er) {}
  });
  svg.addEventListener('pointermove', function (e) {
    if (!doigts[e.pointerId] || !geste) return;
    doigts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var r = svg.getBoundingClientRect(), ids = Object.keys(doigts);
    if (geste.type !== 'pince' && ids.length === 1) {
      var dx = e.clientX - geste.x0, dy = e.clientY - geste.y0;
      if (geste.type === 'tap' && Math.hypot(dx, dy) > 8) geste.type = 'glisse';
      if (geste.type === 'glisse') {
        vb.x = geste.vx - dx / r.width * vb.w; vb.y = geste.vy - dy / r.height * vb.h;
        borner(); appliquerVue();
      }
    } else if (geste.type === 'pince' && ids.length >= 2) {
      var a = doigts[ids[0]], b = doigts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
      var w = geste.w0 * geste.d0 / Math.max(d, 1);
      zoomer(w / vb.w, geste.c.x, geste.c.y);
    }
  });
  function finDoigt(e) {
    var g = geste;
    delete doigts[e.pointerId];
    if (Object.keys(doigts).length === 0) {
      if (g && g.type === 'tap' && e.type === 'pointerup') toucherCarte(g.cible);
      geste = null;
    } else if (g && g.type === 'pince') geste = { type: 'fini' };
  }
  svg.addEventListener('pointerup', finDoigt);
  svg.addEventListener('pointercancel', finDoigt);
  svg.addEventListener('wheel', function (e) {
    e.preventDefault();
    var c = versCarte(e.clientX, e.clientY);
    zoomer(e.deltaY > 0 ? 1.15 : 0.87, c.x, c.y);
  }, { passive: false });

  function toucherCarte(el) {
    var p = el && el.closest ? el.closest('path[data-id]') : null;
    if (!p) { choix = null; dessiner(); return; }
    var id = +p.getAttribute('data-id');
    if (choix != null && choix !== id && etat.provinces[choix].proprio === moi() &&
        PROV[choix].voisins.indexOf(id) >= 0 && mobiles(choix).length) {
      envoyer(choix, id);
      return;
    }
    choix = id;
    dessiner();
  }

  function mobiles(id) {
    return etat.provinces[id].armee.map(function (u, i) { return u.bouge ? -1 : i; }).filter(function (i) { return i >= 0; });
  }

  function dessiner() {
    var cibles = choix != null && etat.provinces[choix].proprio === moi() && mobiles(choix).length ? PROV[choix].voisins : [];
    var els = calqueProv.children;
    for (var i = 0; i < els.length; i++) {
      var p = etat.provinces[i];
      els[i].setAttribute('fill', coul(p.proprio));
      els[i].setAttribute('fill-opacity', p.proprio === moi() ? 0.92 : p.proprio < 0 ? 0.35 : 0.72);
    }
    // Contours : sélection en blanc, cibles possibles en jaune.
    var h = '';
    if (choix != null) h += '<path class="bord sel" d="' + PROV[choix].d + '"/>';
    cibles.forEach(function (v) { h += '<path class="bord cible" d="' + PROV[v].d + '"/>'; });
    calqueBord.innerHTML = h;
    // Villes, noms et armées.
    var t = '';
    PROV.forEach(function (P, i) {
      var p = etat.provinces[i], cap = etat.factions.some(function (f, fi) { return f.capitale === i && p.proprio === fi; });
      var x = P.x, y = P.y;
      var taille = 2 + p.bat.murs * 0.9 + (cap ? 1 : 0);
      t += '<rect class="ville" x="' + (x - taille) + '" y="' + (y - taille) + '" width="' + taille * 2 + '" height="' + taille * 2 + '" rx="' + (p.bat.murs ? 0.6 : taille) + '" fill="' + (p.proprio === moi() ? '#fff' : '#f1f5f9') + '" stroke="' + coul(p.proprio) + '" stroke-width="1.2"/>';
      if (cap) t += '<text class="cour" x="' + x + '" y="' + (y - taille - 1.5) + '" text-anchor="middle">👑</text>';
      t += '<text class="nom" x="' + x + '" y="' + (y + taille + 7) + '" text-anchor="middle">' + P.nom + '</text>';
      if (p.armee.length) {
        t += '<g class="armee"><circle cx="' + (x + 9) + '" cy="' + (y - 5) + '" r="5" fill="' + (p.proprio === moi() ? '#fbbf24' : '#f8fafc') + '" stroke="' + coul(p.proprio) + '" stroke-width="1.4"/>' +
          '<text x="' + (x + 9) + '" y="' + (y - 3) + '" text-anchor="middle">' + p.armee.length + '</text></g>';
      }
    });
    calqueTexte.innerHTML = t;
    var F = etat.factions[moi()];
    $('tAnnee').textContent = etat.annee;
    $('tOr').textContent = F.or;
    $('tRev').textContent = M.revenu(etat, moi());
    $('tReg').textContent = M.nbProvinces(etat, moi()) + '/' + HIST.OBJECTIF;
    $('tFaction').style.background = F.coul;
    dessinerPanneau();
  }

  function dessinerPanneau() {
    var el = $('panneau');
    if (choix == null) {
      el.innerHTML = '<h3><span class="pastille" style="background:' + etat.factions[moi()].coul + '"></span>' + etat.factions[moi()].nom + '</h3>' +
        '<div class="aide">Touche une de tes provinces (couleur vive) pour gérer sa ville et son armée. Fais glisser la carte pour te déplacer. Quand tu as fini, appuie sur <b>Fin du tour</b>.</div>';
      return;
    }
    var p = etat.provinces[choix], P = PROV[choix], mien = p.proprio === moi();
    var h = '<h3><span class="pastille" style="background:' + coul(p.proprio) + '"></span>' + P.nom + '</h3>' +
      '<div class="meta">' + nomF(p.proprio) + ' · 💰 +' + M.revenuProvince(p) + '/tour · ' + p.armee.length + '/' + M.MAX_UNITES + ' unités</div>';
    h += '<div class="bats">' + Object.keys(M.BATIMENTS).map(function (b) {
      var B = M.BATIMENTS[b], n = p.bat[b];
      if (!mien && b !== 'murs') return '';
      return '<span class="bat' + (n ? '' : ' vide') + '">' + B.ico + ' ' + (n ? B.niveaux[n - 1] : 'Pas de ' + B.nom.toLowerCase()) + '</span>';
    }).join('') + '</div>';
    h += '<div class="unites">' + (p.armee.length ? p.armee.map(function (u) { return puceUnite(u, mien && u.bouge ? 'bouge' : ''); }).join('') : '<span class="aide">Aucune armée ici.</span>') + '</div>';
    if (mien) {
      h += '<div class="actions"><button class="btn or" id="pRecruter">➕ Recruter</button><button class="btn" id="pConstruire">🏗️ Construire' + (p.construit ? ' ✓' : '') + '</button></div>';
      h += '<div class="aide" style="margin-top:6px">' + (mobiles(choix).length ? 'Touche une province au contour jaune pour y envoyer tes troupes.' : 'Ces troupes ont déjà bougé ce tour-ci.') + '</div>';
    } else {
      var voisin = P.voisins.some(function (v) { return etat.provinces[v].proprio === moi(); });
      h += '<div class="aide">' + (voisin ? 'Sélectionne une de tes provinces voisines pour attaquer ici.' : 'Trop loin de tes terres pour attaquer.') + (p.bat.murs ? ' Ville fortifiée : il faudra un siège (les canons aident !).' : '') + '</div>';
    }
    el.innerHTML = h;
    if (mien) {
      $('pRecruter').onclick = function () { recrutement(choix); };
      $('pConstruire').onclick = function () { chantier(choix); };
    }
  }

  // ---------- Recrutement ----------
  var DESC = {
    milice: 'Pas chère. Forte contre la cavalerie.',
    arc: 'Tire de loin. Fragile au contact.',
    epee: 'Solide au corps à corps.',
    cav: 'Rapide. Écrase les tireurs.',
    chevalier: 'Charge dévastatrice. Très chère.',
    arbal: 'Perce les armures.',
    piquier: 'Mur de piques : stoppe toute cavalerie.',
    arquebuse: 'Arme à feu : gros dégâts.',
    canon: 'Abat les remparts. Très lent.',
    mousquet: 'Tir puissant et précis.',
    cuirassier: 'Cavalerie lourde moderne.'
  };
  function recrutement(id) {
    var p = etat.provinces[id], F = etat.factions[moi()];
    var h = '<h2>➕ Recruter à ' + PROV[id].nom + '</h2><p>💰 <b style="color:#fbbf24">' + F.or + '</b> or · ' + p.armee.length + '/' + M.MAX_UNITES + ' unités · ⚒️ caserne niv. ' + p.bat.caserne + '. Les recrues bougeront au prochain tour.</p><div class="recrues">';
    M.TYPES.forEach(function (t) {
      var bloc = M.blocageRecrue(etat, id, t);
      if (bloc && U[t].annee > etat.annee + 250) return;
      var ok = !bloc && F.or >= U[t].cout && p.armee.length < M.MAX_UNITES;
      h += '<button class="recrue" data-t="' + t + '"' + (ok ? '' : ' disabled') + '><b>' + U[t].ico + ' ' + U[t].nom + '</b><span class="prix">💰 ' + U[t].cout + '</span>' +
        '<small>' + (bloc ? '🔒 ' + bloc : DESC[t]) + '</small></button>';
    });
    h += '</div><button class="btn" data-fermer>Terminé</button>';
    feuille(h);
    document.querySelectorAll('.recrue').forEach(function (b) {
      b.onclick = function () {
        var err = M.recruter(etat, id, b.getAttribute('data-t'));
        if (err) { toast(err); return; }
        sauver(); dessiner(); recrutement(id);
      };
    });
  }

  // ---------- Construction ----------
  function chantier(id) {
    var p = etat.provinces[id], F = etat.factions[moi()];
    var h = '<h2>🏗️ Construire à ' + PROV[id].nom + '</h2><p>💰 <b style="color:#fbbf24">' + F.or + '</b> or. ' + (p.construit ? '<b>Chantier déjà lancé ce tour-ci.</b>' : 'Un seul chantier par ville et par tour.') + '</p><div class="recrues">';
    Object.keys(M.BATIMENTS).forEach(function (b) {
      var B = M.BATIMENTS[b], n = p.bat[b], max = n >= B.niveaux.length;
      var ok = !max && !p.construit && F.or >= B.couts[n];
      h += '<button class="recrue" data-b="' + b + '"' + (ok ? '' : ' disabled') + '><b>' + B.ico + ' ' + (max ? B.niveaux[n - 1] : B.niveaux[n]) + '</b>' +
        '<span class="prix">' + (max ? '✓ Maximum' : '💰 ' + B.couts[n]) + '</span><small>Niveau ' + n + '/' + B.niveaux.length + ' · ' + B.effet + '</small></button>';
    });
    h += '</div><button class="btn" data-fermer>Terminé</button>';
    feuille(h);
    document.querySelectorAll('[data-b]').forEach(function (b) {
      b.onclick = function () {
        var err = M.construire(etat, id, b.getAttribute('data-b'));
        if (err) { toast(err); return; }
        toast('🏗️ Construit !');
        sauver(); dessiner(); chantier(id);
      };
    });
  }

  // ---------- Envoi de troupes / attaque ----------
  function chances(a, p, defenseur) {
    var fa = M.force(a), fd = defenseur ? M.force(p.armee) : M.forceDefense(p);
    if (!p.armee.length) return { txt: 'Province sans défense : prise facile !', c: '#22c55e' };
    var k = defenseur ? fa * (1 + 0.35 * p.bat.murs) / M.force(defenseur) : fa / fd;
    if (k > 1.6) return { txt: '🟢 Chances : très bonnes', c: '#22c55e' };
    if (k > 1.15) return { txt: '🟡 Chances : bonnes', c: '#a3e635' };
    if (k > 0.85) return { txt: '🟠 Chances : serré, commande bien !', c: '#fbbf24' };
    return { txt: '🔴 Chances : faibles', c: '#e5484d' };
  }

  function envoyer(de, vers) {
    var a = etat.provinces[de], c = etat.provinces[vers];
    var dispo = mobiles(de), pris = dispo.slice(), ami = c.proprio === moi();
    function rendu() {
      var unites = pris.map(function (i) { return a.armee[i]; });
      var siege = !ami && c.bat.murs > 0 && c.armee.length;
      var h = '<h2>' + (ami ? '🚶 Déplacer vers ' : siege ? '🏰 Assiéger ' : '⚔️ Attaquer ') + PROV[vers].nom + '</h2>' +
        '<p>Touche une unité pour l\'emmener ou la laisser à ' + PROV[de].nom + '.</p>' +
        '<div class="unites">' + dispo.map(function (i) {
          return '<button class="u ' + (pris.indexOf(i) >= 0 ? 'choix' : 'off') + '" data-i="' + i + '">' + U[a.armee[i].t].ico + ' ' + U[a.armee[i].t].nom + ' <small>' + M.hommes(a.armee[i]) + '</small></button>';
        }).join('') + '</div>';
      if (ami) {
        h += '<button class="btn bleu" id="fGo"' + (pris.length ? '' : ' disabled') + '>🚶 Déplacer ' + pris.length + ' unité(s)</button>';
      } else {
        var ch = chances(unites, c);
        h += '<div class="duel"><div class="camp"><b style="color:' + coul(moi()) + '">Toi</b>' + (icones(unites)) +
          '</div><div class="vs">VS</div><div class="camp"><b style="color:' + coul(c.proprio) + '">' + nomF(c.proprio) + '</b>' + icones(c.armee) +
          (siege ? '<div class="murs">🏰 ' + M.BATIMENTS.murs.niveaux[c.bat.murs - 1] + '</div>' : '') + '</div></div>' +
          '<div class="chances" style="color:' + ch.c + '">' + ch.txt + '</div>';
        if (!pris.length) h += '<button class="btn" disabled>Choisis au moins une unité</button>';
        else if (!c.armee.length) h += '<button class="btn or" id="fPrendre">🏴 Prendre la province</button>';
        else h += '<button class="btn or" id="fCommander">🎖️ Commander ' + (siege ? 'le siège' : 'la bataille') + '</button><button class="btn" id="fAuto">⚡ Résolution automatique</button>';
      }
      h += '<button class="btn" data-fermer>Annuler</button>';
      feuille(h);
      document.querySelectorAll('#feuille .u[data-i]').forEach(function (b) {
        b.onclick = function () {
          var i = +b.getAttribute('data-i'), k = pris.indexOf(i);
          if (k >= 0) pris.splice(k, 1); else pris.push(i);
          rendu();
        };
      });
      if ($('fGo')) $('fGo').onclick = function () {
        var err = M.deplacer(etat, de, vers, pris);
        fermer();
        if (err) toast(err);
        choix = vers; sauver(); dessiner();
      };
      function attaque(mode) {
        var att = M.preparerAttaque(etat, de, vers, pris);
        fermer();
        if (att.erreur) { toast(att.erreur); return; }
        if (mode === 'prendre') { M.appliquerBataille(etat, att, null); finAction(vers); return; }
        lancerBataille(att, mode === 'auto', function () { finAction(vers); });
      }
      if ($('fPrendre')) $('fPrendre').onclick = function () { attaque('prendre'); };
      if ($('fCommander')) $('fCommander').onclick = function () { attaque('commander'); };
      if ($('fAuto')) $('fAuto').onclick = function () { attaque('auto'); };
    }
    rendu();
  }

  function finAction(id) {
    choix = id; sauver(); montrer('campagne'); dessiner();
    if (etat.fin) finPartie();
  }

  // ---------- Fin du tour ----------
  $('bFinTour').onclick = function () {
    var avant = etat.factions[moi()].or;
    var defenses = M.finDuTour(etat);
    choix = null; sauver(); dessiner();
    toast('📅 ' + etat.annee + ' · 💰 +' + (etat.factions[moi()].or - avant) + ' or');
    var suite = function () { traiterDefenses(defenses); };
    if (etat.nouvelles.length) {
      feuille('<h2>📜 Nouvelles de ' + etat.annee + '</h2><ul class="journal">' + etat.nouvelles.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul><button class="btn or" id="fOk">Continuer</button>');
      $('fOk').onclick = function () { fermer(); suite(); };
    } else suite();
  };

  function traiterDefenses(liste) {
    if (etat.fin) { finPartie(); return; }
    if (!liste.length) { sauver(); dessiner(); return; }
    var att = liste.shift(), c = etat.provinces[att.vers];
    var suite = function () { sauver(); dessiner(); traiterDefenses(liste); };
    if (c.proprio === att.camp) { c.armee = c.armee.concat(att.unites).slice(0, M.MAX_UNITES); suite(); return; }
    if (!c.armee.length) { M.appliquerBataille(etat, att, null); suite(); return; }
    if (c.proprio !== moi()) {
      var b = M.batailleAttaque(etat, att, Math.random() * 1e9);
      M.resoudreAuto(b); M.appliquerBataille(etat, att, b); suite(); return;
    }
    choix = att.vers; dessiner();
    var P = PROV[att.vers];
    centrer(P.x, P.y, Math.min(vb.w, 400));
    var ch = chances(c.armee, c, att.unites);
    feuille('<h2>⚠️ ' + nomF(att.camp) + ' attaque ' + P.nom + ' !</h2>' +
      '<div class="duel"><div class="camp"><b style="color:' + coul(moi()) + '">Toi</b>' + icones(c.armee) +
      (c.bat.murs ? '<div class="murs">🏰 ' + M.BATIMENTS.murs.niveaux[c.bat.murs - 1] + '</div>' : '') +
      '</div><div class="vs">VS</div><div class="camp"><b style="color:' + coul(att.camp) + '">' + nomF(att.camp) + '</b>' + icones(att.unites) + '</div></div>' +
      '<div class="chances" style="color:' + ch.c + '">' + ch.txt + '</div>' +
      '<button class="btn or" id="fDefendre">🎖️ Commander la défense</button><button class="btn" id="fAutoDef">⚡ Résolution automatique</button>');
    $('fDefendre').onclick = function () { fermer(); lancerBataille(att, false, function () { montrer('campagne'); suite(); }); };
    $('fAutoDef').onclick = function () { fermer(); lancerBataille(att, true, function () { montrer('campagne'); suite(); }); };
  }

  function finPartie() {
    var fin = etat.fin, F = etat.factions[moi()], n = M.nbProvinces(etat, moi());
    var rang = M.classement(etat).map(function (x) { return x.i; }).indexOf(moi()) + 1;
    try { localStorage.removeItem(CLE); } catch (e) {}
    var titre, texte, partage;
    if (fin === 'victoire') {
      titre = '👑 Victoire !'; texte = F.nom + ' domine le monde en ' + etat.annee + ' avec ' + n + ' provinces. Un vrai conquérant !';
      partage = 'J\'ai conquis le monde avec ' + F.nom + ' en ' + etat.annee + ' dans Naufragés : Conquête ⚔️ Tu fais mieux ?';
    } else if (fin === 'temps') {
      titre = rang === 1 ? '🏆 Premier royaume du monde !' : '⏳ ' + HIST.FIN + ' : fin de la campagne';
      texte = F.nom + ' finit ' + rang + (rang === 1 ? 'er' : 'e') + ' avec ' + n + ' provinces.';
      partage = 'En ' + HIST.FIN + ', mon royaume ' + F.nom + ' est ' + rang + (rang === 1 ? 'er' : 'e') + ' du monde dans Naufragés : Conquête 🏰 Et toi ?';
    } else {
      titre = '💀 Défaite...'; texte = F.nom + ' est tombé en ' + etat.annee + '. Retente ta chance !';
      partage = 'Mon royaume ' + F.nom + ' est tombé en ' + etat.annee + ' dans Naufragés : Conquête 🏰 Tu tiendras plus longtemps ?';
    }
    feuille('<h2>' + titre + '</h2><p>' + texte + '</p>' +
      '<button class="btn or" id="fPartager">📤 Partager mon score</button>' +
      '<button class="btn" id="fRejouer">🔄 Nouvelle campagne</button>');
    $('fPartager').onclick = function () {
      var url = 'https://lesnaufrages-mc.github.io/strategie/';
      if (navigator.share) navigator.share({ text: partage, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(partage + ' ' + url).then(function () { toast('Copié ! Colle-le à tes amis.'); });
    };
    $('fRejouer').onclick = choisirEpoque;
  }

  // ---------- Bataille ----------
  var cv = $('champ'), ctx = cv.getContext('2d');
  var B = null, ennemi = -1, apres = null, attaqueEnCours = null;
  var vitesse = 1, enCours = false, selection = null, echelle = 1, dernier = 0, marques = [];

  function taille() {
    var z = $('zoneChamp'), w = z.clientWidth - 12, h = z.clientHeight - 12;
    echelle = Math.min(w / M.CHAMP.l, h / M.CHAMP.h);
    var dpr = window.devicePixelRatio || 1;
    cv.style.width = M.CHAMP.l * echelle + 'px';
    cv.style.height = M.CHAMP.h * echelle + 'px';
    cv.width = M.CHAMP.l * echelle * dpr;
    cv.height = M.CHAMP.h * echelle * dpr;
    ctx.setTransform(echelle * dpr, 0, 0, echelle * dpr, 0, 0);
  }
  window.addEventListener('resize', function () { if (B) { taille(); dessinerBataille(); } });

  function lancerBataille(att, auto, ensuite) {
    attaqueEnCours = att; apres = ensuite;
    var c = etat.provinces[att.vers], defense = att.camp !== moi();
    ennemi = defense ? att.camp : c.proprio;
    B = M.batailleAttaque(etat, att, Math.random() * 1e9, moi()); // toi toujours en bas
    selection = null; vitesse = 1; marques = []; enCours = false;
    $('oVitesse').textContent = '⏩ x1';
    $('oTenir').classList.remove('actif');
    $('nomMoi').textContent = etat.factions[moi()].nom;
    $('nomEux').textContent = nomF(ennemi);
    $('jMoi').style.background = coul(moi());
    $('jEux').style.background = coul(ennemi);
    var nom = PROV[att.vers].nom;
    $('titreBataille').textContent = B.mur ? (defense ? '🏰 Siège de ' + nom + ' : défends la ville !' : '🏰 Siège de ' + nom) : (defense ? '🛡️ Défense de ' : '⚔️ Bataille de ') + nom;
    $('texteBataille').textContent = (B.mur ? (defense ? 'Tes troupes sont derrière les remparts (en bas). Les ennemis doivent percer les murs.' :
      'La ville est protégée par des remparts. Frappe les murs ou la porte (au milieu) pour ouvrir une brèche. Les canons les abattent vite !') :
      'Tes troupes sont en bas. Piques et hommes d\'armes devant, tireurs derrière, cavalerie sur les côtés.');
    $('debutBataille').classList.remove('hide');
    $('finBataille').classList.add('hide');
    montrer('bataille');
    taille();
    dessinerBataille();
    if (auto) finirAuto();
  }

  $('bLancer').onclick = function () {
    $('debutBataille').classList.add('hide');
    enCours = true; dernier = performance.now();
    requestAnimationFrame(boucle);
  };
  $('bAutoAvant').onclick = finirAuto;
  $('oAuto').onclick = finirAuto;
  function finirAuto() {
    if (!B || B.fin && !$('finBataille').classList.contains('hide')) return;
    $('debutBataille').classList.add('hide');
    enCours = false;
    M.resoudreAuto(B);
    terminer();
  }
  $('oCharge').onclick = function () {
    if (!B) return;
    B.tenir[0] = false; $('oTenir').classList.remove('actif');
    B.esc.forEach(function (e) { if (e.camp === 0) e.ordre = null; });
    toast('⚔️ À l\'attaque !');
  };
  $('oTenir').onclick = function () {
    if (!B) return;
    B.tenir[0] = !B.tenir[0];
    if (B.tenir[0]) B.esc.forEach(function (e) { if (e.camp === 0 && e.ordre && e.ordre.cible == null) e.ordre = null; });
    $('oTenir').classList.toggle('actif', B.tenir[0]);
    toast(B.tenir[0] ? '🛡️ Tenez la ligne ! (les tireurs tirent toujours)' : 'Les troupes avancent.');
  };
  $('oVitesse').onclick = function () {
    vitesse = vitesse === 1 ? 2 : vitesse === 2 ? 3 : 1;
    $('oVitesse').textContent = '⏩ x' + vitesse;
  };

  function boucle(t) {
    if (!enCours || !B) return;
    var dt = Math.min(0.05, (t - dernier) / 1000); dernier = t;
    for (var i = 0; i < vitesse * 2; i++) M.etape(B, dt / 2);
    dessinerBataille();
    if (B.fin) { enCours = false; setTimeout(terminer, 600); return; }
    requestAnimationFrame(boucle);
  }

  function terminer() {
    if (!B || !$('finBataille').classList.contains('hide')) return;
    var gagne = B.fin.gagnant === 0, defense = attaqueEnCours.camp !== moi();
    var pertes = [0, 0];
    B.esc.forEach(function (e) { pertes[e.camp] += U[e.t].hommes - Math.ceil(Math.max(0, e.hp) / U[e.t].pv); });
    dessinerBataille();
    M.appliquerBataille(etat, attaqueEnCours, B);
    sauver();
    var nom = PROV[attaqueEnCours.vers].nom;
    $('titreFin').textContent = gagne ? '🏆 Victoire !' : '💀 Défaite';
    $('texteFin').textContent = (gagne ? (defense ? 'Tu as tenu ' : 'Tu as pris ') : (defense ? 'Tu as perdu ' : 'Tu n\'as pas pu prendre ')) +
      nom + '. Pertes : ' + pertes[0] + ' de tes soldats, ' + pertes[1] + ' ennemis.';
    $('finBataille').classList.remove('hide');
  }
  $('bRetourCarte').onclick = function () { var f = apres; B = null; if (f) f(); };

  cv.addEventListener('pointerdown', function (ev) {
    if (!B || !enCours) return;
    var rect = cv.getBoundingClientRect();
    var x = (ev.clientX - rect.left) / echelle, y = (ev.clientY - rect.top) / echelle;
    var touche = null, bd = 28;
    B.esc.forEach(function (e) {
      if (!M.vivant(e)) return;
      var d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) { bd = d; touche = e; }
    });
    if (touche && touche.camp === 0) { selection = selection === touche.id ? null : touche.id; return; }
    if (selection == null) { if (touche) toast('Touche d\'abord une de TES unités.'); return; }
    var s = B.esc[selection];
    if (!M.vivant(s)) { selection = null; return; }
    if (touche) { s.ordre = { cible: touche.id }; marques.push({ x: touche.x, y: touche.y, t: 0.6, c: '#ef4444' }); }
    else { s.ordre = { x: x, y: y }; marques.push({ x: x, y: y, t: 0.6, c: '#fbbf24' }); }
    selection = null;
  });

  function dessinerBataille() {
    var L = M.CHAMP.l, H = M.CHAMP.h;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3f5f2a'); g.addColorStop(0.5, '#4d7232'); g.addColorStop(1, '#3f5f2a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);
    ctx.fillStyle = 'rgba(0,0,0,.06)';
    for (var k = 0; k < 40; k++) { ctx.beginPath(); ctx.arc((k * 97) % L, (k * 61) % H, 14 + (k % 5) * 4, 0, 7); ctx.fill(); }
    var m = B.mur;
    if (m) {
      // La ville derrière les murs (pavés) puis les remparts.
      ctx.fillStyle = 'rgba(120,113,108,.35)';
      if (m.dedans < 0) ctx.fillRect(0, 0, L, m.y); else ctx.fillRect(0, m.y, L, H - m.y);
      m.segs.forEach(function (s) {
        var w = s.x1 - s.x0, debout = s.hp > 0;
        if (debout) {
          ctx.fillStyle = s.porte ? '#7c4a1e' : '#a8a29e';
          ctx.fillRect(s.x0, m.y - 6, w, 12);
          ctx.fillStyle = s.porte ? '#5b3412' : '#78716c';
          for (var c = 0; c < w; c += 10) ctx.fillRect(s.x0 + c, m.y - 9 * (m.dedans < 0 ? 1 : -1) - (m.dedans < 0 ? 0 : 3), 6, 4);
          ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(s.x0 + 6, m.y + (m.dedans < 0 ? 9 : -12), w - 12, 3);
          ctx.fillStyle = s.hp / s.hpMax > 0.5 ? '#22c55e' : '#ef4444';
          ctx.fillRect(s.x0 + 6, m.y + (m.dedans < 0 ? 9 : -12), (w - 12) * s.hp / s.hpMax, 3);
        } else {
          ctx.fillStyle = '#57534e';
          for (var r = 0; r < 7; r++) ctx.fillRect(s.x0 + 6 + r * (w - 12) / 7, m.y - 3 + (r % 3) * 2, 5, 4);
        }
      });
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(L, H / 2); ctx.stroke(); ctx.setLineDash([]);
    }
    var cs = [coul(moi()), coul(ennemi)];
    B.esc.forEach(function (e) {
      if (e.camp !== 0 || !M.vivant(e)) return;
      var tx = null, ty = null;
      if (e.ordre && e.ordre.cible != null && M.vivant(B.esc[e.ordre.cible])) { tx = B.esc[e.ordre.cible].x; ty = B.esc[e.ordre.cible].y; ctx.strokeStyle = 'rgba(239,68,68,.7)'; }
      else if (e.ordre && e.ordre.x != null) { tx = e.ordre.x; ty = e.ordre.y; ctx.strokeStyle = 'rgba(251,191,36,.7)'; }
      if (tx == null) return;
      ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
    });
    // Projectiles des tireurs et des canons
    B.esc.forEach(function (e) {
      var Ut = U[e.t];
      if (!Ut.portee || !M.vivant(e)) return;
      var tx, ty;
      if (Ut.antiMur && m && m.camp !== e.camp && !m.segs.some(function (s) { return s.hp <= 0; })) {
        var s = m.segs.filter(function (q) { return q.hp > 0; })[0]; tx = (s.x0 + s.x1) / 2; ty = m.y;
      } else {
        if (e.cible == null) return;
        var c = B.esc[e.cible];
        if (!M.vivant(c) || Math.hypot(c.x - e.x, c.y - e.y) > Ut.portee) return;
        tx = c.x; ty = c.y;
      }
      var p = (B.temps * (Ut.antiMur ? 0.8 : 1.5) + e.id * 0.37) % 1;
      if (Ut.antiMur) {
        ctx.fillStyle = '#111';
        var bx = e.x + (tx - e.x) * p, by = e.y + (ty - e.y) * p - Math.sin(p * Math.PI) * 30;
        ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, 7); ctx.fill();
        return;
      }
      var feu = Ut.perce && Ut.portee <= 140 && e.t !== 'arbal';
      ctx.strokeStyle = feu ? 'rgba(254,240,138,.8)' : 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
      for (var a = 0; a < 3; a++) {
        var q = (p + a * 0.33) % 1;
        var x = e.x + (tx - e.x) * q + (a - 1) * 4, y = e.y + (ty - e.y) * q - (feu ? 0 : Math.sin(q * Math.PI) * 18);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (tx - e.x) * 0.04, y + (ty - e.y) * 0.04); ctx.stroke();
      }
    });
    B.esc.forEach(function (e) {
      if (e.hp <= 0 || e.sorti) return;
      var Ut = U[e.t], cav = Ut.cat === 'cav', art = Ut.cat === 'art';
      var n = Math.ceil(e.hp / Ut.pv), cols = cav ? 6 : art ? 4 : 8, pas = cav ? 4 : art ? 6 : 3.2;
      var rangs = Math.ceil(n / cols), w = (cols - 1) * pas, h = (rangs - 1) * pas;
      ctx.globalAlpha = e.fuite ? 0.45 : 1;
      if (selection === e.id) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, 22, 0, 7); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(e.x - w / 2 - 3, e.y - h / 2 - 3, w + 6, h + 6);
      ctx.fillStyle = cs[e.camp];
      for (var i = 0; i < n; i++) {
        var cx = e.x - w / 2 + (i % cols) * pas + Math.sin(B.temps * 6 + i) * 0.3;
        var cy = e.y - h / 2 + Math.floor(i / cols) * pas;
        var sz = cav ? 3 : art ? 4 : 2.4;
        ctx.fillRect(cx - sz / 2, cy - sz / 2, sz, sz);
      }
      ctx.font = '13px system-ui,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(e.fuite ? '🏳️' : Ut.ico, e.x, e.y - h / 2 - 6);
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - 12, e.y + h / 2 + 4, 24, 3);
      ctx.fillStyle = e.hp / e.hpMax > 0.5 ? '#22c55e' : e.hp / e.hpMax > 0.25 ? '#fbbf24' : '#ef4444';
      ctx.fillRect(e.x - 12, e.y + h / 2 + 4, 24 * e.hp / e.hpMax, 3);
      ctx.globalAlpha = 1;
    });
    marques = marques.filter(function (f) { f.t -= 0.016; return f.t > 0; });
    marques.forEach(function (f) {
      ctx.strokeStyle = f.c; ctx.globalAlpha = f.t / 0.6; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, 10 + (0.6 - f.t) * 20, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    });
    var f = [0, 0];
    B.esc.forEach(function (e) { if (M.vivant(e)) f[e.camp] += U[e.t].cout * e.hp / e.hpMax; });
    var tot = f[0] + f[1] || 1;
    $('jMoi').style.width = (f[0] / tot * 100) + '%';
    $('jEux').style.width = (f[1] / tot * 100) + '%';
    $('conseil').textContent = selection != null ? 'Maintenant touche un ennemi pour l\'attaquer, ou le sol pour y aller.' :
      'Touche une de tes unités pour lui donner un ordre.';
  }

  menu();
})();
