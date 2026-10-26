/* Imperium of Wars — affichage et commandes (carte du monde, villes, batailles). */
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
  function nomF(f) { return f >= 0 ? (f === etat.joueur && etat.pseudo ? etat.pseudo + ' (' + etat.factions[f].nom + ')' : etat.factions[f].nom) : 'Rebelles'; }

  // ---------- Pseudo du joueur ----------
  // 1) pseudo du compte du site (forum) s'il est connecté, 2) pseudo déjà tapé ici, 3) pseudo du mode « entre amis ».
  var pseudoCompte = null;
  function nettoyer(t) { return String(t || '').replace(/[^A-Za-z0-9_\-. À-ÖØ-öø-ÿ]/g, '').trim().slice(0, 20); }
  function pseudoLocal() {
    try {
      var p = localStorage.getItem('imperium-pseudo');
      if (p) return nettoyer(p);
      var a = JSON.parse(localStorage.getItem('mm-profil'));
      if (a && a.name) return nettoyer(a.name);
    } catch (e) {}
    return '';
  }
  function pseudo() { return pseudoCompte || pseudoLocal(); }
  (function chercherCompte() {
    var cfg = window.SUPABASE;
    if (!cfg || !cfg.URL || !window.supabase) return;
    try {
      var sb = window.supabase.createClient(cfg.URL, cfg.CLE);
      sb.auth.getSession().then(function (r) {
        var u = r.data && r.data.session && r.data.session.user;
        if (!u) return null;
        return sb.from('profils').select('pseudo').eq('id', u.id).maybeSingle();
      }).then(function (r) {
        if (!r || !r.data || !r.data.pseudo) return;
        pseudoCompte = nettoyer(r.data.pseudo);
        $('menuPseudo').innerHTML = '🔑 Connecté : <b>' + pseudoCompte + '</b>';
        if (etat && !etat.fin && etat.pseudo !== pseudoCompte) { etat.pseudo = pseudoCompte; sauver(); if (!$('campagne').classList.contains('hide')) dessiner(); }
      }).catch(function () {});
    } catch (e) {}
  })();

  // Demande le nom du commandant (sauf si le compte du site le donne déjà).
  function demanderPseudo(suite, forcer) {
    if (pseudoCompte && !forcer) { suite(pseudoCompte); return; }
    var actuel = pseudo();
    feuille('<h2>🎖️ Ton nom de commandant</h2><p>Il s\'affiche sur la carte, dans les batailles et dans le classement.' +
      (window.SUPABASE ? ' Si tu as un compte sur le <a href="../forum/" style="color:#fbbf24">forum</a>, connecte-toi et ton pseudo sera repris tout seul.' : '') + '</p>' +
      '<input id="fPseudo" class="champTexte" maxlength="20" autocomplete="nickname" placeholder="Ton pseudo" value="' + actuel + '">' +
      '<button class="btn or" id="fPseudoOk">✅ Valider</button>');
    var ok = function () {
      var v = nettoyer($('fPseudo').value);
      if (v.length < 2) { toast('Choisis un pseudo d\'au moins 2 lettres.'); return; }
      try { localStorage.setItem('imperium-pseudo', v); } catch (e) {}
      fermer(); suite(v);
    };
    $('fPseudoOk').onclick = ok;
    $('fPseudo').addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
    setTimeout(function () { try { $('fPseudo').focus(); } catch (e) {} }, 250);
  }
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
    if (!pseudoCompte) $('menuPseudo').innerHTML = pseudoLocal() ? '🎖️ Commandant : <b>' + pseudoLocal() + '</b>' : '';
    montrer('menu');
  }
  $('bNouvelle').onclick = choisirEpoque;
  $('bContinuer').onclick = function () {
    etat = charger(); choix = null;
    M.assurerDiplo(etat);
    if (pseudoCompte) etat.pseudo = pseudoCompte;
    if (etat.pseudo) { demarrer(); return; }
    demanderPseudo(function (nom) { etat.pseudo = nom; sauver(); demarrer(); });
  };
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
        var fid = b.getAttribute('data-f');
        demanderPseudo(function (nom) {
          etat = M.nouvellePartie(epId, fid);
          etat.pseudo = nom;
          etat.journal[0] = E.annee + ' : ' + E.titre + '. ' + nom + ' prend la tête de ' + etat.factions[etat.joueur].nom + '.';
          choix = etat.factions[etat.joueur].capitale;
          sauver(); fermer(); demarrer();
          var dejaJoue = false;
          try { dejaJoue = localStorage.getItem('strategie-vu'); localStorage.setItem('strategie-vu', '1'); } catch (e) {}
          if (!dejaJoue) regles(); else toast(E.annee + ' : commandant ' + nom + ', tu diriges ' + etat.factions[etat.joueur].nom + ' !');
        });
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
    feuille('<h2>Pause</h2><p>' + nomF(moi()) + ' · ' + etat.annee + '. Ta campagne est sauvegardée automatiquement.</p>' +
      '<button class="btn" id="fClassement">🏆 Classement des royaumes</button>' +
      '<button class="btn" id="fChroniques">📜 Chroniques</button>' +
      '<button class="btn" id="fAide">❓ Aide et FAQ</button>' +
      (pseudoCompte ? '' : '<button class="btn" id="fPseudoChg">🎖️ Changer de pseudo</button>') +
      '<button class="btn" id="fRegles">📖 Comment jouer</button>' +
      '<button class="btn" id="fMenu">🏠 Menu principal</button>' +
      '<button class="btn rouge" id="fNouvelle">🔄 Nouvelle campagne</button>');
    $('fClassement').onclick = classement;
    $('fChroniques').onclick = chroniques;
    $('fAide').onclick = function () { aide(); };
    if ($('fPseudoChg')) $('fPseudoChg').onclick = function () {
      demanderPseudo(function (nom) { etat.pseudo = nom; sauver(); dessiner(); toast('Tu es maintenant ' + nom + ' !'); }, true);
    };
    $('fRegles').onclick = regles;
    $('fMenu').onclick = function () { fermer(); menu(); };
    $('fNouvelle').onclick = choisirEpoque;
  };
  function chroniques() {
    feuille('<h2>📜 Chroniques</h2><ul class="journal">' + etat.journal.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' +
      '<button class="btn" data-fermer>Fermer</button>');
  };
  function classement() {
    var c = M.classement(etat);
    feuille('<h2>🏆 Classement en ' + etat.annee + '</h2><ol class="journal">' + c.slice(0, 12).map(function (x) {
      return '<li><span class="pastille" style="background:' + x.coul + '"></span> ' + (x.i === moi() ? '<b>' + (etat.pseudo ? '🎖️ ' + etat.pseudo + ' · ' : '') + x.nom + '</b>' : x.nom) + ' — ' + x.n + ' provinces</li>';
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
      var rel = p.proprio >= 0 && p.proprio !== moi() ? M.relation(etat, p.proprio) : '';
      if (rel === 'alliance') t += '<text class="cour" x="' + (x - 9) + '" y="' + (y + 2) + '" text-anchor="middle">🤝</text>';
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
      el.innerHTML = '<h3><span class="pastille" style="background:' + etat.factions[moi()].coul + '"></span>' + (etat.pseudo ? '🎖️ ' + etat.pseudo + ' <small class="sousNom">' + etat.factions[moi()].nom + '</small>' : etat.factions[moi()].nom) + '</h3>' +
        '<div class="aide">Touche une de tes provinces (couleur vive) pour gérer sa ville et son armée. Quand tu as fini, appuie sur <b>Fin du tour</b>.</div>' +
        '<div class="conseil">🧙 <b>Conseiller :</b> ' + conseil() + '</div>';
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
      var rel = p.proprio >= 0 ? M.relation(etat, p.proprio) : 'guerre';
      if (p.proprio >= 0) {
        var D = etat.diplo[p.proprio];
        h += '<div class="relLigne">' + badge(rel) + ' <span>' + M.humeur(D.att) + '</span><button class="btn mini" id="pNegocier">🤝 Négocier</button></div>';
      }
      h += '<div class="aide">' + (rel !== 'guerre' ? 'Vous êtes en ' + (rel === 'paix' ? 'paix' : 'alliance') + ' : pour attaquer ici, il faudra déclarer la guerre.' :
        voisin ? 'Sélectionne une de tes provinces voisines pour attaquer ici.' : 'Trop loin de tes terres pour attaquer.') + (p.bat.murs ? ' Ville fortifiée : il faudra un siège (les canons aident !).' : '') + '</div>';
    }
    el.innerHTML = h;
    if ($('pNegocier')) $('pNegocier').onclick = function () { negocier(p.proprio); };
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
    if (!ami && c.proprio >= 0 && M.relation(etat, c.proprio) !== 'guerre') {
      var allie = M.relation(etat, c.proprio) === 'alliance';
      feuille('<h2>' + (allie ? '💔' : '⚔️') + ' Déclarer la guerre ?</h2><p>Tu es en <b>' + (allie ? 'alliance' : 'paix') + '</b> avec <b>' + etat.factions[c.proprio].nom + '</b>. ' +
        'Pour attaquer ' + PROV[vers].nom + ', tu dois lui déclarer la guerre.' + (allie ? ' Trahir un allié fâche tous les autres royaumes !' : ' Les autres royaumes te feront un peu moins confiance.') + '</p>' +
        '<button class="btn rouge" id="fGuerre">⚔️ Déclarer la guerre</button><button class="btn" data-fermer>Garder la ' + (allie ? 'alliance' : 'paix') + '</button>');
      $('fGuerre').onclick = function () { var r = M.proposer(etat, c.proprio, 'guerre'); toast(r.msg); sauver(); dessiner(); envoyer(de, vers); };
      return;
    }
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
    var suite = function () { traiterPropositions(function () { traiterDefenses(defenses); }); };
    if (etat.nouvelles.length) {
      feuille('<h2>📜 Nouvelles de ' + etat.annee + '</h2><ul class="journal">' + etat.nouvelles.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul><button class="btn or" id="fOk">Continuer</button>');
      $('fOk').onclick = function () { fermer(); suite(); };
    } else suite();
  };

  // Les royaumes te proposent la paix ou une alliance.
  function traiterPropositions(ensuite) {
    if (etat.fin || !etat.propositions || !etat.propositions.length) { ensuite(); return; }
    var P = etat.propositions[0], F = etat.factions[P.f], D = etat.diplo[P.f];
    var paix = P.type === 'paix';
    feuille('<h2>' + (paix ? '🕊️' : '🤝') + ' Un messager de ' + F.nom + '</h2>' +
      '<p><span class="pastille" style="background:' + F.coul + '"></span> <b>' + F.nom + '</b> (' + M.nbProvinces(etat, P.f) + ' provinces, ' + M.humeur(D.att) + ') ' +
      (paix ? 'est las de la guerre et te propose la <b>paix</b>.' : 'te propose une <b>alliance</b> : vous ne vous attaquerez plus, il défendra tes villes voisines et tu pourras lui demander de l\'or ou des troupes.') + '</p>' +
      '<button class="btn or" id="fOui">✅ Accepter</button><button class="btn" id="fNon">❌ Refuser</button>');
    var rep = function (oui) { var msg = M.repondre(etat, 0, oui); fermer(); if (msg) toast(msg); sauver(); dessiner(); traiterPropositions(ensuite); };
    $('fOui').onclick = function () { rep(true); };
    $('fNon').onclick = function () { rep(false); };
  }

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

  // ---------- Diplomatie ----------
  function badge(rel) {
    var c = { paix: 'paix', guerre: 'guerre', alliance: 'alliance' }[rel] || 'paix';
    return '<span class="rel ' + c + '">' + ({ paix: '🕊️ Paix', guerre: '⚔️ Guerre', alliance: '🤝 Alliance' }[rel] || rel) + '</span>';
  }
  function diplomatie() {
    var liste = M.diplomatie(etat);
    var n = { alliance: 0, guerre: 0 };
    liste.forEach(function (d) { if (n[d.rel] != null) n[d.rel]++; });
    var h = '<h2>🤝 Diplomatie</h2><p>' + n.alliance + ' allié(s) · ' + n.guerre + ' guerre(s). Touche un royaume pour négocier. Les voisins sont en haut.</p><div class="diplo">';
    liste.forEach(function (d) {
      h += '<button class="ligneDiplo" data-df="' + d.f + '"><span class="pastille" style="background:' + d.coul + '"></span>' +
        '<span class="dNom"><b>' + d.nom + '</b><small>' + d.n + ' prov. · ' + d.humeur + (d.voisin ? ' · voisin' : '') + '</small></span>' + badge(d.rel) + '</button>';
    });
    h += '</div><button class="btn" id="fAideDiplo">❓ Comment marche la diplomatie ?</button><button class="btn" data-fermer>Fermer</button>';
    feuille(h);
    document.querySelectorAll('[data-df]').forEach(function (b) { b.onclick = function () { negocier(+b.getAttribute('data-df')); }; });
    $('fAideDiplo').onclick = function () { aide('diplo'); };
  }
  function negocier(f) {
    var F = etat.factions[f], D = etat.diplo[f], rel = D.rel, J = etat.factions[moi()];
    var h = '<h2><span class="pastille" style="background:' + F.coul + '"></span> ' + F.nom + '</h2>' +
      '<div class="relLigne">' + badge(rel) + ' <span>' + M.humeur(D.att) + '</span></div>' +
      '<div class="humeurJauge"><i style="left:' + (D.att + 100) / 2 + '%"></i></div>' +
      '<p class="petitTxt">Humeur envers toi : ' + D.att + ' / 100. ' + M.nbProvinces(etat, f) + ' provinces, 💰 ' + F.or + ' or.</p>';
    if (rel === 'guerre') h += '<button class="btn or" data-act="paix">🕊️ Proposer la paix</button>';
    if (rel === 'paix') h += '<button class="btn or" data-act="alliance">🤝 Proposer une alliance' + (D.att < 40 ? ' (humeur 40 requise)' : '') + '</button>';
    if (rel === 'alliance') {
      h += '<button class="btn or" data-act="aideOr">💰 Demander de l\'or</button>' +
        '<button class="btn or" data-act="aideTroupes">🛡️ Demander des renforts</button>' +
        (D.aideT > etat.tour ? '<p class="petitTxt">Ton allié pourra t\'aider de nouveau dans ' + (D.aideT - etat.tour) + ' tour(s).</p>' : '');
    }
    h += '<button class="btn" data-act="cadeau"' + (J.or < 100 ? ' disabled' : '') + '>🎁 Offrir 100 or (humeur +15)</button>';
    if (rel === 'alliance') h += '<button class="btn" data-act="rompre">💔 Rompre l\'alliance</button>';
    if (rel !== 'guerre') h += '<button class="btn rouge" data-act="guerre">⚔️ Déclarer la guerre</button>';
    h += '<button class="btn" id="fRetourDiplo">← Tous les royaumes</button>';
    feuille(h);
    document.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () {
        var r = M.proposer(etat, f, b.getAttribute('data-act'));
        toast((r.ok ? '✅ ' : '❌ ') + r.msg);
        sauver(); dessiner();
        if (r.ok && r.province != null) { choix = r.province; dessiner(); }
        negocier(f);
      };
    });
    $('fRetourDiplo').onclick = diplomatie;
  }
  $('bDiplo').onclick = diplomatie;

  // ---------- Aide, conseils et FAQ ----------
  var AIDE = {
    carte: ['🗺️ La carte', [
      'Fais glisser la carte avec un doigt, pince avec deux doigts (ou + / −) pour zoomer. 🎯 recentre sur ta capitale.',
      'Les couleurs vives sont <b>tes</b> provinces. 👑 = capitale, un carré = ville fortifiée, 🤝 = ville d\'un allié.',
      'La pastille ronde sur une ville indique combien d\'unités y sont.',
      'Chaque tour fait avancer le temps de quelques années. La campagne se termine en ' + HIST.FIN + '.']],
    villes: ['🏰 Villes et or', [
      'Chaque province rapporte de l\'or à chaque tour. 💰 Marché = plus d\'or, 🌾 Ferme = un peu d\'or et des soldats soignés plus vite.',
      '⚒️ La caserne débloque les meilleures unités (niveau 2 et 3). 🏰 Les remparts protègent la ville : l\'ennemi doit faire un siège.',
      'Un seul chantier par ville et par tour : commence par les marchés pour être riche.']],
    armees: ['⚔️ Armées', [
      'Touche une de tes provinces puis <b>Recruter</b>. Les unités récentes arrivent avec les siècles (chevaliers 1000, piquiers 1300, canons 1450, mousquets 1600).',
      'Touche ensuite une province voisine (contour jaune) pour y envoyer tes troupes : déplacement chez toi, attaque chez l\'ennemi.',
      'Une armée qui a bougé se repose jusqu\'au tour suivant. Maximum ' + M.MAX_UNITES + ' unités par province.',
      'Pierre-feuille-ciseaux : 🔱 piques battent 🐎 cavaliers, 🐎 cavaliers écrasent 🏹 tireurs, ⚔️ hommes d\'armes solides partout.']],
    batailles: ['🎖️ Batailles', [
      'Choisis <b>Commander</b> pour diriger toi-même, ou <b>Résolution automatique</b> pour aller vite.',
      'Touche une de tes cartes d\'unité en bas, puis un ennemi pour l\'attaquer, ou le sol pour te déplacer.',
      '⚔️ Charge ! lance tout le monde, 🛡️ Tenir garde la position. Le bouton 🗺️ passe de la 3D à la 2D si ton téléphone rame.',
      'Contre des remparts, amène des canons : ils ouvrent une brèche. Les défenseurs derrière les murs encaissent beaucoup mieux.']],
    diplo: ['🤝 Diplomatie et alliances', [
      'Bouton 🤝 en haut : la liste des royaumes avec ta relation (🕊️ Paix, ⚔️ Guerre, 🤝 Alliance) et leur humeur envers toi (😠 à 😍).',
      'Un royaume en paix ou allié ne t\'attaque pas, et tu dois lui <b>déclarer la guerre</b> avant de l\'attaquer.',
      'L\'humeur monte avec les cadeaux 🎁, la paix et l\'alliance. Elle baisse si tu lui prends des villes, si tu es son voisin, ou si tu deviens trop grand.',
      'Avec une humeur « Amical » (40+), propose une <b>alliance</b>. Un allié défend tes villes voisines quand on les attaque, et tu peux lui demander 💰 de l\'or ou 🛡️ des renforts (puis il faut attendre quelques tours).',
      'Les royaumes t\'écrivent aussi : propositions de paix ou d\'alliance à la fin du tour. Attention, un voisin hostile peut te déclarer la guerre !',
      'Trahir un allié (lui déclarer la guerre) fâche tous les autres royaumes.']],
    faq: ['💬 FAQ', null]
  };
  var FAQ = [
    ['C\'est quoi Imperium of Wars ?', 'Un jeu de stratégie historique gratuit, sur mobile et ordinateur. Tu diriges un vrai royaume sur la carte de l\'Europe et de la Méditerranée, de 771 à 1800 : tu gères tes villes, ta diplomatie, et tu commandes tes armées dans des batailles en 3D.'],
    ['C\'est gratuit ?', 'Oui, 100 % gratuit, sans achat. Le site affiche quelques publicités pour payer l\'hébergement.'],
    ['Faut-il un compte ?', 'Non. Tu peux jouer avec un simple pseudo. Si tu es connecté à ton compte du forum, ton pseudo est repris automatiquement.'],
    ['Comment gagner ?', 'Possède ' + HIST.OBJECTIF + ' provinces avant ' + HIST.FIN + '. Sinon, en ' + HIST.FIN + ', le classement des royaumes décide du vainqueur.'],
    ['Quelles époques ?', HIST.EPOQUES.map(function (e) { return e.annee + ' ' + e.titre; }).join(', ') + '. Les unités évoluent avec le temps, des chevaliers aux mousquetaires.'],
    ['Ma partie est-elle sauvegardée ?', 'Oui, automatiquement sur ton appareil, à chaque action. Reviens quand tu veux avec « Continuer la campagne ».'],
    ['Peut-on le télécharger ?', 'Oui ! Bouton « 📲 Installer le jeu » sur le menu : il s\'ajoute sur ton écran d\'accueil comme une vraie appli et marche même sans internet (sauf la 3D la toute première fois). Sur iPhone : bouton Partager de Safari puis « Sur l\'écran d\'accueil ».'],
    ['Mon téléphone rame en bataille', 'Touche le bouton 🗺️ 2D pendant la bataille : la vue 2D est beaucoup plus légère.'],
    ['Le jeu ne s\'est pas mis à jour', 'Recharge la page (ou ferme et rouvre l\'appli installée) : la nouvelle version arrive au lancement suivant.'],
    ['Où donner mon avis ?', 'Sur le <a href="https://discord.gg/Xdkzj8bZnk" target="_blank" rel="noopener">Discord</a> ou sur le <a href="../forum/">forum</a> du site.']
  ];
  function htmlFAQ() {
    return '<div class="faq">' + FAQ.map(function (q) { return '<details><summary>' + q[0] + '</summary><p>' + q[1] + '</p></details>'; }).join('') + '</div>';
  }
  function aide(sujet) {
    if (!sujet) {
      var h = '<h2>❓ Centre d\'aide</h2><p>Choisis un sujet. Tu peux revenir ici à tout moment avec le bouton ❓ sur la carte.</p>';
      Object.keys(AIDE).forEach(function (k) { h += '<button class="btn" data-aide="' + k + '">' + AIDE[k][0] + '</button>'; });
      h += '<button class="btn" id="fReglesAide">📖 Règles rapides</button><button class="btn or" data-fermer>Fermer</button>';
      feuille(h);
      document.querySelectorAll('[data-aide]').forEach(function (b) { b.onclick = function () { aide(b.getAttribute('data-aide')); }; });
      $('fReglesAide').onclick = regles;
      return;
    }
    var A = AIDE[sujet];
    feuille('<h2>' + A[0] + '</h2>' + (A[1] ? '<ul class="regles">' + A[1].map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' : htmlFAQ()) +
      '<button class="btn" id="fAideRetour">← Autres sujets</button><button class="btn or" data-fermer>Compris !</button>');
    $('fAideRetour').onclick = function () { aide(); };
  }
  $('bAide').onclick = function () { aide(); };
  $('bFAQ').onclick = function () {
    feuille('<h2>💬 FAQ · Imperium of Wars</h2>' + htmlFAQ() + '<button class="btn or" data-fermer>Fermer</button>');
  };

  // Un conseil adapté à la situation, affiché dans le panneau.
  function conseil() {
    var F = etat.factions[moi()], liste = M.diplomatie(etat);
    var guerres = liste.filter(function (d) { return d.rel === 'guerre' && d.voisin; });
    var amis = liste.filter(function (d) { return d.rel === 'paix' && d.att >= 40; });
    var allies = liste.filter(function (d) { return d.rel === 'alliance' && d.aidePrete && d.att >= 20; });
    var sansMarche = etat.provinces.some(function (p) { return p.proprio === moi() && !p.bat.marche && !p.construit; });
    var tips = [];
    if (allies.length) tips.push(allies[0].nom + ' est ton allié : demande-lui de l\'or ou des renforts avec le bouton 🤝.');
    if (amis.length) tips.push(amis[0].nom + ' t\'apprécie : propose-lui une alliance (bouton 🤝).');
    if (guerres.length > 1) tips.push('Tu es en guerre contre ' + guerres.length + ' voisins. Signe la paix avec l\'un d\'eux pour souffler.');
    if (F.or >= 300) tips.push('Tu as ' + F.or + ' or : recrute une armée ou construis des remparts.');
    if (sansMarche) tips.push('Construis un 💰 marché dans tes villes : plus d\'or chaque tour.');
    tips.push('Un voisin en paix ne t\'attaque pas. Choisis bien tes guerres !');
    tips.push('Les canons ouvrent une brèche dans les remparts lors d\'un siège.');
    tips.push('Besoin d\'aide ? Touche ❓ sur la carte.');
    return tips[etat.tour % Math.min(tips.length, 3)];
  }

  // ---------- Installer le jeu (appli hors ligne) ----------
  var invite = null;
  function estInstalle() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone; }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); invite = e; });
  window.addEventListener('appinstalled', function () { invite = null; $('bInstaller').classList.add('hide'); toast('📲 Imperium of Wars est installé !'); });
  if (estInstalle()) $('bInstaller').classList.add('hide');
  $('bInstaller').onclick = function () {
    if (invite) {
      invite.prompt();
      invite.userChoice.then(function () { invite = null; });
      return;
    }
    var ios = /iPhone|iPad|iPod/.test(navigator.userAgent), mobile = ios || /Android|Mobi/.test(navigator.userAgent);
    feuille('<h2>📲 Installer Imperium of Wars</h2><p>Le jeu devient une appli sur ton ' + (mobile ? 'téléphone' : 'PC') + ', dans sa propre fenêtre, et fonctionne même sans internet.</p><ol class="regles">' +
      (ios ? '<li>Ouvre cette page dans <b>Safari</b>.</li><li>Touche le bouton <b>Partager</b> (carré avec une flèche).</li><li>Choisis <b>« Sur l\'écran d\'accueil »</b>, puis <b>Ajouter</b>.</li>'
           : mobile ? '<li>Ouvre cette page dans <b>Chrome</b>.</li><li>Touche le menu <b>⋮</b> en haut à droite.</li><li>Choisis <b>« Installer l\'application »</b> ou <b>« Ajouter à l\'écran d\'accueil »</b>.</li>'
           : '<li>Ouvre cette page dans <b>Chrome</b> ou <b>Edge</b>.</li><li>Clique sur l\'icône <b>Installer</b> (écran avec une flèche) au bout de la barre d\'adresse, ou menu <b>⋮</b> → <b>« Installer Imperium of Wars »</b>.</li><li>Le jeu apparaît dans le menu Démarrer et sur le bureau.</li>') +
      '</ol><button class="btn or" data-fermer>OK</button>');
  };
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  function finPartie() {
    var fin = etat.fin, F = etat.factions[moi()], n = M.nbProvinces(etat, moi());
    var rang = M.classement(etat).map(function (x) { return x.i; }).indexOf(moi()) + 1;
    try { localStorage.removeItem(CLE); } catch (e) {}
    var titre, texte, partage;
    if (fin === 'victoire') {
      titre = '👑 Victoire !'; texte = F.nom + ' domine le monde en ' + etat.annee + ' avec ' + n + ' provinces. Un vrai conquérant !';
      partage = (etat.pseudo ? etat.pseudo + ' a' : 'J\'ai') + ' conquis le monde avec ' + F.nom + ' en ' + etat.annee + ' dans Imperium of Wars ⚔️ Tu fais mieux ?';
    } else if (fin === 'temps') {
      titre = rang === 1 ? '🏆 Premier royaume du monde !' : '⏳ ' + HIST.FIN + ' : fin de la campagne';
      texte = F.nom + ' finit ' + rang + (rang === 1 ? 'er' : 'e') + ' avec ' + n + ' provinces.';
      partage = 'En ' + HIST.FIN + ', mon royaume ' + F.nom + ' est ' + rang + (rang === 1 ? 'er' : 'e') + ' du monde dans Imperium of Wars 🏰 Et toi ?';
    } else {
      titre = '💀 Défaite...'; texte = F.nom + ' est tombé en ' + etat.annee + '. Retente ta chance !';
      partage = 'Mon royaume ' + F.nom + ' est tombé en ' + etat.annee + ' dans Imperium of Wars 🏰 Tu tiendras plus longtemps ?';
    }
    if (etat.pseudo) texte = '🎖️ ' + etat.pseudo + ' : ' + texte;
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

  // ---------- Bataille (3D si possible, sinon vue 2D) ----------
  var cv = $('champ'), ctx = cv.getContext('2d');
  var B = null, ennemi = -1, apres = null, attaqueEnCours = null;
  var vitesse = 1, enCours = false, selection = null, echelle = 1, dernier = 0, marques = [];
  var vue3d = null, majCartes = 0;
  function veut3d() { try { return localStorage.getItem('strategie-vue') !== '2d'; } catch (e) { return true; } }

  function taille() {
    if (vue3d) { vue3d.taille(); return; }
    var z = $('zoneChamp'), w = z.clientWidth - 12, h = z.clientHeight - 12;
    echelle = Math.min(w / M.CHAMP.l, h / M.CHAMP.h);
    var dpr = window.devicePixelRatio || 1;
    cv.style.width = M.CHAMP.l * echelle + 'px';
    cv.style.height = M.CHAMP.h * echelle + 'px';
    cv.width = M.CHAMP.l * echelle * dpr;
    cv.height = M.CHAMP.h * echelle * dpr;
    ctx.setTransform(echelle * dpr, 0, 0, echelle * dpr, 0, 0);
  }
  window.addEventListener('resize', function () { if (B) { taille(); afficher(0); } });

  function preparerVue() {
    if (vue3d) { vue3d.detruire(); vue3d = null; }
    var ok = veut3d() && window.Bataille3D && window.Bataille3D.dispo();
    if (ok) {
      try {
        vue3d = window.Bataille3D.creer($('zoneChamp'), B, {
          unites: U, champ: M.CHAMP, couleurs: [coul(moi()), coul(ennemi)],
          onTap: function (x, y) { toucherChamp(x, y); }
        });
      } catch (e) { vue3d = null; }
    }
    cv.classList.toggle('hide', !!vue3d);
    $('oVue').textContent = vue3d ? '🗺️ 2D' : '🎥 3D';
    $('oVue').classList.toggle('hide', !(window.Bataille3D && window.Bataille3D.dispo()));
    taille();
  }
  $('oVue').onclick = function () {
    try { localStorage.setItem('strategie-vue', vue3d ? '2d' : '3d'); } catch (e) {}
    preparerVue(); afficher(0);
  };

  function afficher(dt) {
    if (!B) return;
    if (vue3d) vue3d.maj(B, dt, selection); else dessinerBataille();
    jauges();
    majCartes -= dt;
    if (majCartes <= 0) { cartesUnites(); majCartes = 0.25; }
  }

  function lancerBataille(att, auto, ensuite) {
    attaqueEnCours = att; apres = ensuite;
    var c = etat.provinces[att.vers], defense = att.camp !== moi();
    ennemi = defense ? att.camp : c.proprio;
    B = M.batailleAttaque(etat, att, Math.random() * 1e9, moi()); // toi toujours en bas
    selection = null; vitesse = 1; marques = []; enCours = false;
    $('oVitesse').textContent = '⏩ x1';
    $('oTenir').classList.remove('actif');
    $('nomMoi').textContent = etat.pseudo ? '🎖️ ' + etat.pseudo : etat.factions[moi()].nom;
    $('nomEux').textContent = nomF(ennemi);
    $('jMoi').style.background = coul(moi());
    $('jEux').style.background = coul(ennemi);
    var nom = PROV[att.vers].nom;
    $('titreBataille').textContent = B.mur ? (defense ? '🏰 Siège de ' + nom + ' : défends la ville !' : '🏰 Siège de ' + nom) : (defense ? '🛡️ Défense de ' : '⚔️ Bataille de ') + nom;
    $('texteBataille').textContent = (B.mur ? (defense ? 'Tes troupes sont derrière les remparts. Les ennemis doivent percer les murs.' :
      'La ville est protégée par des remparts. Frappe les murs ou la porte (au milieu) pour ouvrir une brèche. Les canons les abattent vite !') :
      'Piques et hommes d\'armes devant, tireurs derrière, cavalerie sur les côtés.') +
      ' Choisis une unité (en bas ou sur le terrain), puis touche un ennemi ou le sol. Fais glisser pour tourner la caméra, pince pour zoomer.';
    $('debutBataille').classList.remove('hide');
    $('finBataille').classList.add('hide');
    montrer('bataille');
    if (auto) { finirAuto(); return; }
    preparerVue();
    dernier = performance.now();
    requestAnimationFrame(boucle);
  }

  $('bLancer').onclick = function () {
    $('debutBataille').classList.add('hide');
    enCours = true;
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

  // Une seule boucle : la caméra 3D tourne même avant le début ; la simulation avance pendant la bataille.
  function boucle(t) {
    if (!B) return;
    var dt = Math.min(0.05, (t - dernier) / 1000); dernier = t;
    if (enCours && !B.fin) {
      for (var i = 0; i < vitesse * 2; i++) M.etape(B, dt / 2);
      if (B.fin) setTimeout(terminer, 900);
    }
    afficher(dt);
    requestAnimationFrame(boucle);
  }

  function terminer() {
    if (!B || !$('finBataille').classList.contains('hide')) return;
    enCours = false;
    var gagne = B.fin.gagnant === 0, defense = attaqueEnCours.camp !== moi();
    var pertes = [0, 0];
    B.esc.forEach(function (e) { pertes[e.camp] += U[e.t].hommes - Math.ceil(Math.max(0, e.hp) / U[e.t].pv); });
    if (!vue3d) dessinerBataille();
    M.appliquerBataille(etat, attaqueEnCours, B);
    sauver();
    var nom = PROV[attaqueEnCours.vers].nom;
    $('titreFin').textContent = gagne ? '🏆 Victoire !' : '💀 Défaite';
    $('texteFin').textContent = (gagne ? (defense ? 'Tu as tenu ' : 'Tu as pris ') : (defense ? 'Tu as perdu ' : 'Tu n\'as pas pu prendre ')) +
      nom + '. Pertes : ' + pertes[0] + ' de tes soldats, ' + pertes[1] + ' ennemis.';
    $('finBataille').classList.remove('hide');
  }
  $('bRetourCarte').onclick = function () {
    var f = apres; B = null;
    if (vue3d) { vue3d.detruire(); vue3d = null; }
    if (f) f();
  };

  // Ordres : choisir une de tes unités, puis un ennemi (attaque) ou le sol (déplacement).
  function toucherChamp(x, y) {
    if (!B || !enCours) return;
    var touche = null, bd = vue3d ? 34 : 28;
    B.esc.forEach(function (e) {
      if (!M.vivant(e)) return;
      var d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) { bd = d; touche = e; }
    });
    if (touche && touche.camp === 0) { selection = selection === touche.id ? null : touche.id; majCartes = 0; return; }
    if (selection == null) { if (touche) toast('Choisis d\'abord une de TES unités.'); return; }
    var s = B.esc[selection];
    if (!M.vivant(s)) { selection = null; return; }
    if (x < 0 || x > M.CHAMP.l || y < 0 || y > M.CHAMP.h) return;
    if (touche) { s.ordre = { cible: touche.id }; marquer(touche.x, touche.y, '#ef4444'); }
    else { s.ordre = { x: x, y: y }; marquer(x, y, '#fbbf24'); }
    selection = null; majCartes = 0;
  }
  function marquer(x, y, c) {
    if (vue3d) vue3d.marquer(x, y, c); else marques.push({ x: x, y: y, t: 0.6, c: c });
  }
  cv.addEventListener('pointerdown', function (ev) {
    var rect = cv.getBoundingClientRect();
    toucherChamp((ev.clientX - rect.left) / echelle, (ev.clientY - rect.top) / echelle);
  });

  // Cartes d'unités en bas de l'écran (comme dans Total War).
  function cartesUnites() {
    var zone = $('cartes'), miens = B.esc.filter(function (e) { return e.camp === 0; });
    if (zone._B !== B || zone.children.length !== miens.length) {
      zone._B = B;
      zone.innerHTML = miens.map(function (e) {
        return '<button class="carteU" data-u="' + e.id + '"><span class="ic"></span><span class="nb"></span><i></i></button>';
      }).join('');
    }
    // Mise à jour sur place (sans recréer les boutons, pour ne jamais perdre un appui).
    miens.forEach(function (e, k) {
      var b = zone.children[k], Ue = U[e.t], hp = Math.max(0, e.hp / e.hpMax), mort = e.hp <= 0 || e.sorti;
      b.className = 'carteU' + (selection === e.id ? ' sel' : '') + (e.fuite ? ' fuit' : '') + (mort ? ' mort' : '');
      b.children[0].textContent = e.fuite ? '🏳️' : Ue.ico;
      b.children[1].textContent = Math.ceil(Math.max(0, e.hp) / Ue.pv);
      b.children[2].style.width = Math.round(hp * 100) + '%';
      b.children[2].style.background = hp > 0.5 ? '#22c55e' : hp > 0.25 ? '#fbbf24' : '#ef4444';
    });
  }
  $('cartes').addEventListener('pointerdown', function (ev) {
    var b = ev.target.closest('[data-u]');
    if (!b || !B) return;
    var id = +b.getAttribute('data-u'), e = B.esc[id];
    if (!M.vivant(e)) return;
    selection = selection === id ? null : id;
    majCartes = 0;
    if (!enCours) toast('Lance la bataille pour donner des ordres.');
  });

  function jauges() {
    var f = [0, 0];
    B.esc.forEach(function (e) { if (M.vivant(e)) f[e.camp] += U[e.t].cout * e.hp / e.hpMax; });
    var tot = f[0] + f[1] || 1;
    $('jMoi').style.width = (f[0] / tot * 100) + '%';
    $('jEux').style.width = (f[1] / tot * 100) + '%';
    $('conseil').textContent = selection != null ? 'Touche un ennemi pour l\'attaquer, ou le sol pour y aller.' :
      'Choisis une de tes unités (cartes en bas ou sur le terrain).';
  }

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
  }

  menu();
})();
