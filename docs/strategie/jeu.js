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
  function assombrir(hex) {
    var n = parseInt(String(hex).slice(1), 16);
    if (isNaN(n)) return '#333';
    var f = function (v) { return Math.round(v * 0.45); };
    return 'rgb(' + f((n >> 16) & 255) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
  }
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

  // Dessin d'un navire (40×30) : coque, mâts et voiles aux couleurs du royaume.
  function coqueNavire(t, c) {
    var bois = '<path d="M3 19H37L32 26H8Z" fill="#6b4423" stroke="#2a1a0c" stroke-width=".8"/>';
    var mat = function (x, h) { return '<path d="M' + x + ' 20V' + h + '" stroke="#3b2a1a" stroke-width="1.3"/>'; };
    var carree = function (x, y, w, hh) { return '<path d="M' + (x - w) + ' ' + y + 'Q' + x + ' ' + (y + 2.5) + ' ' + (x + w) + ' ' + y + 'V' + (y + hh) + 'Q' + x + ' ' + (y + hh + 2) + ' ' + (x - w) + ' ' + (y + hh) + 'Z" fill="' + c + '" stroke="#1f2937" stroke-width=".5"/>'; };
    var latine = function (x, y) { return '<path d="M' + x + ' ' + y + 'L' + (x + 10) + ' 17H' + (x - 5) + 'Z" fill="#f5efe0" stroke="#1f2937" stroke-width=".5"/>'; };
    if (t === 'galere') return mat(19, 4) + latine(19, 4) + bois + '<path d="M9 25l-3 4M14 25l-3 4M19 25l-3 4M24 25l-3 4M29 25l-3 4" stroke="#3b2a1a" stroke-width=".9"/>' + '<path d="M3 19l-2-2" stroke="' + c + '" stroke-width="2"/>';
    if (t === 'cogue') return mat(20, 3) + carree(20, 5, 7, 11) + bois + '<path d="M5 19V15H11V19M29 19V14H35V19" fill="#7c5230" stroke="#2a1a0c" stroke-width=".6"/>';
    if (t === 'caraque') return mat(16, 2) + mat(28, 8) + carree(16, 4, 7, 12) + latine(28, 8) + bois + '<path d="M4 19V14H10V19M30 19V13H36V19" fill="#7c5230" stroke="#2a1a0c" stroke-width=".6"/>';
    var h = mat(11, 6) + mat(20, 1) + mat(29, 6) + carree(11, 7, 5, 9) + carree(20, 3, 6, 12) + carree(29, 7, 5, 9) + bois;
    return t === 'vaisseau' ? h + '<path d="M7 22H33" stroke="#e8d9a8" stroke-width="1.6" stroke-dasharray="1.6 1.4"/>' + '<path d="M20 1l4 1.5-4 1.5" fill="' + c + '"/>' : h + '<path d="M31 19V13H37V19" fill="#7c5230" stroke="#2a1a0c" stroke-width=".6"/>';
  }
  function navireSVG(t, c, taille) { return '<svg class="nav" viewBox="0 0 40 30" width="' + (taille || 26) + '" height="' + Math.round((taille || 26) * 0.75) + '">' + coqueNavire(t, c) + '</svg>'; }
  function puceNavire(n, f, extra) {
    var N = M.NAVIRES[n.t];
    return '<span class="u navire ' + (extra || '') + '">' + navireSVG(n.t, coul(f)) + N.nom + ' <small>' + Math.round(100 * n.hp / N.pv) + '%</small></span>';
  }

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
    M.assurerCour(etat);
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
    var L = MONDE.largeur + 1000, H = MONDE.hauteur + 1000;
    svg.innerHTML =
      '<defs><radialGradient id="mer" cx="45%" cy="40%" r="80%"><stop offset="0" stop-color="#2a5d82"/><stop offset=".6" stop-color="#173f62"/><stop offset="1" stop-color="#0b2240"/></radialGradient>' +
      '<pattern id="vagues" width="28" height="14" patternUnits="userSpaceOnUse"><path d="M0 7q7-4.5 14 0t14 0" fill="none" stroke="#cfe3f2" stroke-opacity=".09" stroke-width=".8"/></pattern>' +
      '<pattern id="papier" width="40" height="40" patternUnits="userSpaceOnUse">' + grain() + '</pattern>' +
      '<clipPath id="clipTerre"><path d="' + MONDE.terre + '"/></clipPath>' +
      '<symbol id="chateau" viewBox="-7 -7 14 14" overflow="visible"><path d="M-6 6V-1h2v-3h2v3h4v-3h2v3h2v7z"/><path d="M-1 6V3a1 1 0 0 1 2 0v3" fill="#3b2a16"/></symbol>' +
      '<symbol id="citadelle" viewBox="-8 -8 16 16" overflow="visible"><path d="M-7 7V0h2v-3h2v3h1v-6h1v-2h2v2h1v6h1v-3h2v3h2v7z"/><path d="M-1 7V4a1 1 0 0 1 2 0v3" fill="#3b2a16"/><path d="M0 -8v-4l3 1.5-3 1.5" fill="#c81e3a" stroke="none"/></symbol>' +
      '<symbol id="navire" viewBox="0 0 40 30"><path d="M20 20V3" stroke="#3b2a1a" stroke-width="2"/><path d="M12 5Q20 8 28 5V16Q20 18 12 16Z" fill="#f5efe0" stroke="#1f2937"/><path d="M3 19H37L32 26H8Z" fill="#6b4423" stroke="#2a1a0c"/></symbol>' +
      '<symbol id="village" viewBox="-5 -5 10 10" overflow="visible"><path d="M-4 4V-0.5L0-4 4-0.5V4z"/></symbol>' +
      '<symbol id="mont" viewBox="-6 -6 12 12" overflow="visible"><path d="M-6 4L-1-5 1.5-1.5 2.5-3 6 4z" fill="#8a7a5c"/><path d="M-1-5L0.6 4H-6z" fill="#b8a782"/><path d="M-1-5L-2.4-2.4-1-3 0-1.6z" fill="#f5f1e6"/></symbol>' +
      '</defs>' +
      '<rect x="-500" y="-500" width="' + L + '" height="' + H + '" fill="url(#mer)"/>' +
      '<rect x="-500" y="-500" width="' + L + '" height="' + H + '" fill="url(#vagues)"/>' +
      '<path d="' + MONDE.terre + '" fill="none" stroke="#7fb2d1" stroke-opacity=".22" stroke-width="9" stroke-linejoin="round"/>' +
      '<path d="' + MONDE.terre + '" fill="none" stroke="#a9d0e6" stroke-opacity=".3" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="' + MONDE.terre + '" fill="#d8c9a0"/>' +
      '<g id="cProv"></g>' +
      '<g clip-path="url(#clipTerre)" pointer-events="none"><rect x="0" y="0" width="' + MONDE.largeur + '" height="' + MONDE.hauteur + '" fill="url(#papier)"/>' + montagnes() + '</g>' +
      '<path id="cFront" class="frontiere" d=""/>' +
      '<path d="' + MONDE.terre + '" fill="none" stroke="#3b2f1c" stroke-width=".9" stroke-linejoin="round" pointer-events="none"/>' +
      '<g id="cRoyaumes"></g><g id="cBord"></g><g id="cTexte"></g>';
    calqueProv = $('cProv'); calqueBord = $('cBord'); calqueTexte = $('cTexte');
    preparerAretes();
    PROV.forEach(function (p, i) {
      var el = document.createElementNS(NS, 'path');
      el.setAttribute('d', p.d);
      el.setAttribute('data-id', i);
      el.setAttribute('class', 'prov');
      calqueProv.appendChild(el);
    });
  }

  // Texture de vieux papier (petits points répartis au hasard, toujours les mêmes).
  function grain() {
    var g = '', a = 7;
    for (var i = 0; i < 70; i++) {
      a = (a * 9301 + 49297) % 233280;
      var x = (a / 233280) * 40; a = (a * 9301 + 49297) % 233280;
      var y = (a / 233280) * 40; a = (a * 9301 + 49297) % 233280;
      g += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (0.3 + (a / 233280) * 0.7).toFixed(2) + '" fill="' + (i % 3 ? '#3b2a12' : '#fff8e6') + '" opacity="' + (i % 3 ? 0.13 : 0.18) + '"/>';
    }
    return g;
  }
  // Grandes chaînes de montagnes (longitude, latitude), dessinées sur la carte.
  var MONTAGNES = [
    [6.6, 45.2], [7.4, 45.9], [8.4, 46.4], [9.6, 46.5], [10.9, 46.8], [12.2, 46.9], [13.5, 46.5], [6.9, 44.4],
    [-1.3, 42.95], [0, 42.75], [1.2, 42.6], [2.2, 42.45], [-5.8, 43.05], [-4.3, 43.1], [-3.3, 37.1], [-5.3, 40.3], [-2.2, 37.9],
    [10.3, 44.3], [12.2, 43.5], [13.6, 42.3], [15, 41.1], [16.1, 39.6], [2.8, 45.2],
    [19.4, 49.4], [21.4, 49.2], [23.4, 48.4], [24.9, 47.4], [25.7, 46.1], [24.2, 45.5], [22.6, 45.3],
    [16.6, 44.2], [18.2, 43.3], [19.7, 42.5], [21, 41.7], [24.5, 42.7], [23.2, 42.4], [21.3, 39.8], [22.1, 38.7],
    [40.2, 43.5], [42, 43], [44, 42.6], [46, 42], [47.6, 41.5],
    [31.8, 37.1], [33.8, 37.3], [35.8, 37.8], [38.3, 38.3], [40.8, 39.1], [42.8, 39.4], [37.2, 40.6], [39.8, 40.5],
    [46.2, 35], [47.8, 33.6], [49.6, 32.2], [36.1, 34.1],
    [-8, 31.1], [-6.2, 32], [-4.6, 33], [-2.3, 34.2], [0.8, 35.1], [3.8, 35.5], [6.3, 35.4], [8.3, 35.1],
    [8.2, 61.2], [9.2, 60.2], [7.4, 59.6], [12.6, 61.6], [-4.6, 57.1], [-5.2, 56.6], [13.2, 50.4], [15.6, 50.7]
  ];
  function montagnes() {
    var K = 22.8, COS = Math.cos(46 * Math.PI / 180), h = '';
    MONTAGNES.forEach(function (m, i) {
      var x = (m[0] + 11) * K * COS, y = (62 - m[1]) * K;
      [[0, 0, 1.15], [-6, 3, 0.8], [6, 2.5, 0.9]].forEach(function (o, k) {
        if (k && (i + k) % 3 === 0) return;
        h += '<use href="#mont" x="' + (x + o[0] - 6) + '" y="' + (y + o[1] - 6) + '" width="' + 12 * o[2] + '" height="' + 12 * o[2] + '" opacity=".75"/>';
      });
    });
    return h;
  }
  // Arêtes partagées entre deux provinces voisines (pour tracer les frontières des royaumes).
  var aretes = [];
  function preparerAretes() {
    var vu = {};
    PROV.forEach(function (P, i) {
      var pts = [];
      P.d.replace(/([ML])\s*(-?[\d.]+)[ ,](-?[\d.]+)/g, function (m, c, x, y) { pts.push({ m: c === 'M', k: x + ',' + y }); });
      for (var j = 1; j < pts.length; j++) {
        if (pts[j].m) continue;
        var a = pts[j - 1].k, b = pts[j].k, cle = a < b ? a + '|' + b : b + '|' + a;
        if (vu[cle] != null && vu[cle] !== i) aretes.push({ a: vu[cle], b: i, d: 'M' + a + 'L' + b });
        else vu[cle] = i;
      }
    });
  }
  function dessinerFrontieres() {
    var d = '';
    aretes.forEach(function (e) { if (etat.provinces[e.a].proprio !== etat.provinces[e.b].proprio) d += e.d; });
    $('cFront').setAttribute('d', d);
  }
  // Grands noms des royaumes, comme sur les cartes anciennes.
  function dessinerRoyaumes() {
    var h = '';
    etat.factions.forEach(function (F, f) {
      var miennes = [];
      etat.provinces.forEach(function (p, i) { if (p.proprio === f) miennes.push(i); });
      if (miennes.length < 2) return;
      var sx = 0, sy = 0;
      miennes.forEach(function (i) { sx += PROV[i].x; sy += PROV[i].y; });
      sx /= miennes.length; sy /= miennes.length;
      // Se poser sur la province la plus proche du centre (pour ne pas tomber dans la mer).
      var best = miennes[0], dmin = 1e9;
      miennes.forEach(function (i) { var d = Math.pow(PROV[i].x - sx, 2) + Math.pow(PROV[i].y - sy, 2); if (d < dmin) { dmin = d; best = i; } });
      var x = (PROV[best].x * 2 + sx) / 3, y = (PROV[best].y * 2 + sy) / 3;
      var nom = F.nom.replace(/^(Royaume|Empire|Duché|Principauté|République|Sultanat|Califat|Émirat|Khanat|Couronne|Régences) (de |d'|des |du )?/, '').replace(/ (de Pierre le Grand|des Habsbourg|des Médicis|\(Saladin\))$/, '').toUpperCase();
      var taille = Math.min(26, 8 + Math.sqrt(miennes.length) * 4.2) * (nom.length > 14 ? 0.8 : 1);
      h += '<text class="royaume" x="' + x.toFixed(1) + '" y="' + (y + 14).toFixed(1) + '" text-anchor="middle" style="--t:' + taille.toFixed(1) + '"' + (f === moi() ? ' data-moi="1"' : '') + '>' + nom + '</text>';
    });
    $('cRoyaumes').innerHTML = h;
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
    if (choix != null && choix !== id && ciblesNavales(choix).indexOf(id) >= 0) {
      envoyerMer(choix, id);
      return;
    }
    choix = id;
    dessiner();
  }

  // Côtes qu'on peut atteindre par la mer depuis la province choisie (contour bleu).
  function ciblesNavales(id) {
    if (id == null) return [];
    var p = etat.provinces[id];
    if (p.proprio !== moi() || !p.flotte || !p.flotte.some(function (n) { return !n.bouge; })) return [];
    return M.PORTEE[id].filter(function (v) {
      if (PROV[id].voisins.indexOf(v) >= 0) return false;
      var o = etat.provinces[v].proprio;
      return o === moi() || mobiles(id).length > 0;
    });
  }
  function mobiles(id) {
    return etat.provinces[id].armee.map(function (u, i) { return u.bouge ? -1 : i; }).filter(function (i) { return i >= 0; });
  }

  function dessiner() {
    var cibles = choix != null && etat.provinces[choix].proprio === moi() && mobiles(choix).length ? PROV[choix].voisins : [];
    var ciblesMer = ciblesNavales(choix);
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
    ciblesMer.forEach(function (v) { h += '<path class="bord mer" d="' + PROV[v].d + '"/>'; });
    calqueBord.innerHTML = h;
    // Villes, noms et armées.
    var t = '';
    PROV.forEach(function (P, i) {
      var p = etat.provinces[i], cap = etat.factions.some(function (f, fi) { return f.capitale === i && p.proprio === fi; });
      var x = P.x, y = P.y;
      var taille = cap ? 7 : p.bat.murs ? 4.5 + p.bat.murs : 3.2;
      var sym = cap ? 'citadelle' : p.bat.murs ? 'chateau' : 'village';
      t += '<use class="ville" href="#' + sym + '" x="' + (x - taille) + '" y="' + (y - taille) + '" width="' + taille * 2 + '" height="' + taille * 2 + '" fill="' + (p.proprio === moi() ? '#fffdf5' : '#efe8d8') + '" stroke="' + (p.proprio >= 0 ? assombrir(coul(p.proprio)) : '#555') + '" stroke-width="1.1" stroke-linejoin="round"/>';
      if (cap) t += '<text class="cour" x="' + x + '" y="' + (y - taille - 3) + '" text-anchor="middle">👑</text>';
      var rel = p.proprio >= 0 && p.proprio !== moi() ? M.relation(etat, p.proprio) : '';
      if (rel === 'alliance') t += '<text class="cour" x="' + (x - 9) + '" y="' + (y + 2) + '" text-anchor="middle">🤝</text>';
      t += '<text class="nom" x="' + x + '" y="' + (y + taille + 7) + '" text-anchor="middle">' + P.nom + '</text>';
      if (p.armee.length) {
        t += '<g class="armee"><circle cx="' + (x + 9) + '" cy="' + (y - 5) + '" r="5" fill="' + (p.proprio === moi() ? '#fbbf24' : '#f8fafc') + '" stroke="' + coul(p.proprio) + '" stroke-width="1.4"/>' +
          '<text x="' + (x + 9) + '" y="' + (y - 3) + '" text-anchor="middle">' + p.armee.length + '</text></g>';
      }
      if (p.flotte && p.flotte.length) {
        t += '<g class="armee flotteM"><use href="#navire" x="' + (x - 21) + '" y="' + (y - 11) + '" width="13" height="10"/>' +
          '<text x="' + (x - 9) + '" y="' + (y - 3) + '" text-anchor="middle">' + p.flotte.length + '</text></g>';
      }
    });
    calqueTexte.innerHTML = t;
    dessinerFrontieres();
    dessinerRoyaumes();
    var F = etat.factions[moi()];
    $('tAnnee').textContent = etat.annee;
    $('tOr').textContent = F.or;
    var net = soldeTour();
    $('tRev').textContent = (net >= 0 ? '+' : '') + net;
    $('tTour').textContent = 'Tour ' + etat.tour;
    $('tReg').textContent = M.nbProvinces(etat, moi()) + '/' + HIST.OBJECTIF;
    $('tFaction').style.background = F.coul;
    dessinerPanneau();
  }

  function soldeTour() { return M.revenu(etat, moi()) + M.revenuCommerce(etat) - M.entretien(etat, moi()) - M.salaires(etat); }
  function dessinerPanneau() {
    var el = $('panneau');
    if (choix == null) {
      var J = etat.factions[moi()], h0 = M.heritier(J);
      el.innerHTML = '<div class="carteRoi">' + portrait(J.roi, moi(), 58) + '<div class="infoRoi">' +
        '<b>' + J.roi.nom + '</b><small>' + M.age(etat, J.roi) + ' ans · ' + J.cour.dyn + ' · ' + J.nom + '</small>' +
        '<small>' + (J.conj ? '💍 ' + J.conj.nom : J.cour.elu ? '🗳️ Souverain élu' : '💍 Pas marié(e)') + (h0 ? ' · 👑 Héritier : ' + h0.nom : J.cour.elu ? '' : ' · ⚠️ Pas d\'héritier') + '</small>' +
        (etat.pseudo ? '<small>🎖️ Joué par ' + etat.pseudo + '</small>' : '') + '</div></div>' +
        '<div class="actions wrap"><button class="btn" id="pCour">👑 Ma cour</button><button class="btn" id="pRoyaume">🏛️ Royaume</button><button class="btn" id="pCommerce">📦 Commerce</button>' + (M.quetes(etat, moi()).length ? '<button class="btn" id="pQuetes">📜 Quêtes</button>' : '') + '</div>' +
        resumeQuete() +
        '<div class="conseil">🧙 <b>Conseiller :</b> ' + conseil() + '</div>';
      $('pCour').onclick = function () { cour(); };
      $('pRoyaume').onclick = royaume;
      $('pCommerce').onclick = commerce;
      if ($('pQuetes')) $('pQuetes').onclick = ecranQuetes;
      if ($('pQuete1')) $('pQuete1').onclick = ecranQuetes;
      return;
    }
    var p = etat.provinces[choix], P = PROV[choix], mien = p.proprio === moi();
    var h = '<h3><span class="pastille" style="background:' + coul(p.proprio) + '"></span>' + P.nom + '</h3>' +
      '<div class="meta">' + nomF(p.proprio) + ' · 💰 +' + M.revenuProvince(p) + '/tour · ' + p.armee.length + '/' + M.MAX_UNITES + ' unités' +
      (M.PRODUIT_DE[choix] ? ' · ' + M.PRODUITS[M.PRODUIT_DE[choix]].ico + ' ' + M.PRODUITS[M.PRODUIT_DE[choix]].nom : '') + (M.estCotiere(choix) ? ' · 🌊 côte' : '') + '</div>';
    var qProv = M.quetes(etat, moi()).filter(function (x) { return x.faite == null && x.q.provinces.indexOf(P.id) >= 0; });
    if (qProv.length) h += '<div class="tagQuete">' + qProv.map(function (x) { return x.q.ico + ' ' + (mien ? 'Fait partie de' : 'À prendre pour') + ' : <b>' + x.q.titre + '</b>'; }).join('<br>') + '</div>';
    if (mien) {
      var ordre = Math.round(p.ordre == null ? 60 : p.ordre), cible = M.cibleOrdre(etat, choix);
      h += '<div class="gestion"><button class="ordre" id="pOrdre"><span>' + humeurOrdre(ordre) + ' Ordre public <b>' + ordre + '</b>' + (cible !== ordre ? ' <small>' + (cible > ordre ? '↗' : '↘') + ' ' + cible + '</small>' : '') + '</span>' +
        '<i class="barreOrdre"><i style="width:' + ordre + '%;background:' + couleurOrdre(ordre) + '"></i></i></button>' +
        '<div class="impots">' + M.IMPOTS.map(function (I, k) { return '<button data-imp="' + k + '"' + ((p.impots == null ? 1 : p.impots) === k ? ' class="on"' : '') + '>' + I.ico + ' ' + I.nom + '</button>'; }).join('') + '</div></div>';
    }
    h += '<div class="bats">' + Object.keys(M.BATIMENTS).map(function (b) {
      var B = M.BATIMENTS[b], n = p.bat[b];
      if (!mien && b !== 'murs' && !(b === 'port' && n)) return '';
      if (b === 'port' && !M.estCotiere(choix)) return '';
      return '<span class="bat' + (n ? '' : ' vide') + '">' + B.ico + ' ' + (n ? B.niveaux[n - 1] : 'Pas de ' + B.nom.toLowerCase()) + '</span>';
    }).join('') + '</div>';
    h += '<div class="unites">' + (p.armee.length ? p.armee.map(function (u) { return puceUnite(u, mien && u.bouge ? 'bouge' : ''); }).join('') : '<span class="aide">Aucune armée ici.</span>') + '</div>';
    if (p.flotte && p.flotte.length) h += '<div class="unites flotte">' + p.flotte.map(function (n) { return puceNavire(n, p.proprio, mien && n.bouge ? 'bouge' : ''); }).join('') + '</div>';
    if (mien) {
      h += '<div class="actions"><button class="btn or" id="pRecruter">➕ Recruter</button><button class="btn" id="pConstruire">🏗️ Construire' + (p.construit ? ' ✓' : '') + '</button>' +
        (p.bat.port ? '<button class="btn bleu" id="pNavires">⛵ Navires</button>' : '') + '</div>';
      h += '<div class="aide" style="margin-top:6px">' + (mobiles(choix).length ? 'Touche une province au contour jaune pour y envoyer tes troupes.' : 'Ces troupes ont déjà bougé ce tour-ci.') +
        (ciblesNavales(choix).length ? ' Contour bleu : destinations par la mer (' + M.capacite(p.flotte) + ' unités transportables).' : M.estCotiere(choix) && !p.bat.port ? ' Construis un ⚓ port pour avoir une flotte.' : '') + '</div>';
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
      document.querySelectorAll('[data-imp]').forEach(function (b) {
        b.onclick = function () { M.changerImpots(etat, choix, +b.getAttribute('data-imp')); sauver(); dessiner(); };
      });
      $('pOrdre').onclick = function () { detailOrdre(choix); };
      $('pRecruter').onclick = function () { recrutement(choix); };
      $('pConstruire').onclick = function () { chantier(choix); };
      if ($('pNavires')) $('pNavires').onclick = function () { chantierNaval(choix); };
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
      if (b === 'port' && !M.estCotiere(id)) return;
      var B = M.BATIMENTS[b], n = p.bat[b] || 0, max = n >= B.niveaux.length;
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

  // ---------- Marine ----------
  var DESC_NAV = {
    galere: 'Rapide et pas chère. Porte 2 unités.',
    cogue: 'Navire de la Hanse, solide. Porte 3 unités.',
    caraque: 'Grand navire armé. Porte 4 unités.',
    galion: 'Puissant et spacieux. Porte 5 unités.',
    vaisseau: 'Le roi des mers : 70 canons. Porte 4 unités.'
  };
  function chantierNaval(id) {
    var p = etat.provinces[id], F = etat.factions[moi()];
    var h = '<h2>⛵ Chantier naval à ' + PROV[id].nom + '</h2><p>💰 <b style="color:#fbbf24">' + F.or + '</b> or · ' + p.flotte.length + '/' + M.MAX_NAVIRES + ' navires · ⚓ ' + M.BATIMENTS.port.niveaux[p.bat.port - 1] + '. Les navires neufs prendront la mer au prochain tour.</p><div class="recrues">';
    M.TYPES_NAV.forEach(function (t) {
      var N = M.NAVIRES[t], bloc = M.blocageNavire(etat, id, t);
      if (bloc && N.annee > etat.annee + 250) return;
      var ok = !bloc && F.or >= N.cout && p.flotte.length < M.MAX_NAVIRES;
      h += '<button class="recrue" data-n="' + t + '"' + (ok ? '' : ' disabled') + '><b>' + navireSVG(t, F.coul, 30) + ' ' + N.nom + '</b><span class="prix">💰 ' + N.cout + '</span>' +
        '<small>' + (bloc ? '🔒 ' + bloc : DESC_NAV[t] + ' ⚔️ ' + N.atq + ' · 🛡️ ' + N.pv) + '</small></button>';
    });
    h += '</div><p class="petitTxt">Une flotte transporte tes troupes vers les côtes de la même mer ou d\'une mer voisine, et garde tes côtes : un ennemi qui veut débarquer devra d\'abord la battre.</p><button class="btn" data-fermer>Terminé</button>';
    feuille(h);
    document.querySelectorAll('[data-n]').forEach(function (b) {
      b.onclick = function () {
        var err = M.construireNavire(etat, id, b.getAttribute('data-n'));
        if (err) { toast(err); return; }
        toast('⛵ Navire mis à l\'eau !');
        sauver(); dessiner(); chantierNaval(id);
      };
    });
  }
  function envoyerMer(de, vers) {
    var a = etat.provinces[de], c = etat.provinces[vers], ami = c.proprio === moi();
    if (!ami && c.proprio >= 0 && M.relation(etat, c.proprio) !== 'guerre') {
      feuille('<h2>⚔️ Déclarer la guerre ?</h2><p>Tu es en <b>' + M.relation(etat, c.proprio) + '</b> avec <b>' + etat.factions[c.proprio].nom + '</b>. Pour débarquer à ' + PROV[vers].nom + ', tu dois lui déclarer la guerre.</p>' +
        '<button class="btn rouge" id="fGuerre">⚔️ Déclarer la guerre</button><button class="btn" data-fermer>Garder la paix</button>');
      $('fGuerre').onclick = function () { var r = M.proposer(etat, c.proprio, 'guerre'); toast(r.msg); sauver(); dessiner(); envoyerMer(de, vers); };
      return;
    }
    var navires = a.flotte.filter(function (n) { return !n.bouge; }), cap = M.capacite(a.flotte);
    var dispo = mobiles(de), pris = dispo.slice(0, cap);
    function rendu() {
      var h = '<h2>' + (ami ? '⛵ Naviguer vers ' : '⚓ Débarquer à ') + PROV[vers].nom + '</h2><p>Par ' + M.nomMer(de, vers) + '. Tes ' + navires.length + ' navire(s) portent <b>' + cap + '</b> unité(s).</p>' +
        '<div class="unites flotte">' + navires.map(function (n) { return puceNavire(n, moi()); }).join('') + '</div>';
      if (dispo.length) h += '<p>Touche une unité pour l\'embarquer ou la laisser à quai (' + pris.length + '/' + cap + ').</p><div class="unites">' + dispo.map(function (i) {
        return '<button class="u ' + (pris.indexOf(i) >= 0 ? 'choix' : 'off') + '" data-i="' + i + '">' + U[a.armee[i].t].ico + ' ' + U[a.armee[i].t].nom + ' <small>' + M.hommes(a.armee[i]) + '</small></button>';
      }).join('') + '</div>';
      if (ami) h += '<button class="btn bleu" id="fNav">⛵ ' + (pris.length ? 'Transporter ' + pris.length + ' unité(s)' : 'Déplacer la flotte seule') + '</button>';
      else {
        var gardes = M.flotteDefense(etat, vers), def = [];
        gardes.forEach(function (j) { def = def.concat(etat.provinces[j].flotte); });
        var fa = M.forceFlotte(navires), fd = M.forceFlotte(def) * (1 + 0.1 * (c.bat.port || 0));
        h += '<div class="duel"><div class="camp"><b style="color:' + coul(moi()) + '">Ta flotte</b>' + navires.map(function (n) { return navireSVG(n.t, coul(moi()), 22); }).join('') + '</div><div class="vs">⚓</div><div class="camp"><b style="color:' + coul(c.proprio) + '">' + (def.length ? 'Flotte de ' + nomF(c.proprio) : 'Aucune flotte') + '</b>' +
          (def.length ? def.map(function (n) { return navireSVG(n.t, coul(c.proprio), 22); }).join('') : '<small>La côte est libre !</small>') + '</div></div>';
        if (def.length) h += '<div class="chances" style="color:' + (fa > fd * 1.3 ? '#22c55e' : fa > fd ? '#fbbf24' : '#e5484d') + '">' + (fa > fd * 1.3 ? '🟢 Ta flotte domine la mer' : fa > fd ? '🟠 Bataille navale serrée' : '🔴 Leur flotte est plus forte : ton débarquement risque d\'échouer') + '</div>';
        var unites = pris.map(function (i) { return a.armee[i]; });
        if (c.armee.length) { var ch = chances(unites, c); h += '<p class="petitTxt">À terre : ' + icones(c.armee) + ' — <span style="color:' + ch.c + '">' + ch.txt + '</span></p>'; }
        if (!pris.length) h += '<button class="btn" disabled>Embarque au moins une unité</button>';
        else if (!c.armee.length) h += '<button class="btn or" id="fDebPrendre">⚓ Débarquer et prendre la province</button>';
        else h += '<button class="btn or" id="fDebCmd">⚓ Débarquer et commander la bataille</button><button class="btn" id="fDebAuto">⚡ Débarquer (résolution automatique)</button>';
      }
      h += '<button class="btn" data-fermer>Annuler</button>';
      feuille(h);
      document.querySelectorAll('#feuille .u[data-i]').forEach(function (b) {
        b.onclick = function () {
          var i = +b.getAttribute('data-i'), k = pris.indexOf(i);
          if (k >= 0) pris.splice(k, 1); else if (pris.length < cap) pris.push(i); else toast('Tes navires sont pleins.');
          rendu();
        };
      });
      if ($('fNav')) $('fNav').onclick = function () {
        var err = M.naviguer(etat, de, vers, pris);
        fermer();
        if (err) { toast(err); return; }
        toast('⛵ La flotte arrive à ' + PROV[vers].nom + '.');
        choix = vers; sauver(); dessiner();
      };
      function go(mode) {
        var att = M.preparerDebarquement(etat, de, vers, pris);
        fermer();
        if (att.erreur) { toast(att.erreur); return; }
        var suite = function () {
          if (att.echec) { toast('⚓ Ta flotte est repoussée : tes troupes rentrent au port, éprouvées.'); finAction(de); return; }
          if (!c.armee.length) { M.appliquerBataille(etat, att, null); finAction(vers); return; }
          lancerBataille(att, mode === 'auto', function () { finAction(vers); });
        };
        sauver();
        if (att.naval) batailleNavale(att, suite); else suite();
      }
      if ($('fDebPrendre')) $('fDebPrendre').onclick = function () { go('prendre'); };
      if ($('fDebCmd')) $('fDebCmd').onclick = function () { go('commander'); };
      if ($('fDebAuto')) $('fDebAuto').onclick = function () { go('auto'); };
    }
    rendu();
  }
  // Bataille navale animée : bordées, coques endommagées, navires qui sombrent.
  function batailleNavale(att, suite) {
    var N = att.naval, W = 340, H = 200, ca = coul(att.camp), cd = coul(N.campD);
    var pos = function (k, gauche) { var col = Math.floor(k / 3), row = k % 3; return { x: gauche ? 52 + col * 46 + (row === 1 ? 12 : 0) : W - 52 - col * 46 - (row === 1 ? 12 : 0), y: 48 + row * 52 }; };
    var navire = function (t, k, gauche, c) {
      var q = pos(k, gauche);
      return '<g class="nb" id="nb' + (gauche ? 'a' : 'd') + k + '" transform="translate(' + (q.x - 28) + ' ' + (q.y - 25) + ') scale(1.4)"><g' + (gauche ? '' : ' transform="translate(40 0) scale(-1 1)"') + '>' + coqueNavire(t, c) + '</g>' +
        '<rect x="6" y="31" width="28" height="3" rx="1.5" fill="#00000066"/><rect class="pv" x="6" y="31" width="28" height="3" rx="1.5" fill="#22c55e"/></g>';
    };
    var a = N.a.slice(0, 9), d = N.d.slice(0, 9);
    var h = '<h2>⚓ Bataille navale</h2><p class="sousTitre">' + N.mer + ' · ' + nomF(att.camp) + ' contre ' + nomF(N.campD) + '</p>' +
      '<svg class="sceneNav" id="sceneNav" viewBox="0 0 ' + W + ' ' + H + '"><defs><linearGradient id="merNav" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e4f78"/><stop offset="1" stop-color="#0b2440"/></linearGradient></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#merNav)"/>' +
      '<path d="M0 30q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0M0 90q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0M0 150q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0" fill="none" stroke="#9cc6e6" stroke-opacity=".18"/>' +
      a.map(function (t, k) { return navire(t, k, true, ca); }).join('') + d.map(function (t, k) { return navire(t, k, false, cd); }).join('') +
      '<g id="feuxNav"></g><text id="roundNav" x="' + W / 2 + '" y="18" text-anchor="middle">Les flottes se rapprochent…</text></svg>' +
      '<div id="resNav" class="chances"></div><button class="btn or hide" id="fNavOk">Continuer</button>';
    feuille(h);
    var r = 0, tours = N.tours;
    var maj = function (vie, types, cote) {
      vie.slice(0, 9).forEach(function (hp, k) {
        var g = $('nb' + cote + k);
        if (!g) return;
        var pct = hp / M.NAVIRES[types[k]].pv;
        g.querySelector('.pv').setAttribute('width', Math.max(0, 28 * pct));
        g.querySelector('.pv').setAttribute('fill', pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#fbbf24' : '#e5484d');
        if (hp <= 0 && !g.classList.contains('coule')) g.classList.add('coule');
      });
    };
    var feux = function (vie, gauche) {
      var html = '';
      vie.slice(0, 9).forEach(function (hp, k) {
        if (hp <= 0) return;
        var q = pos(k, gauche);
        html += '<circle class="feu" cx="' + (q.x + (gauche ? 18 : -18)) + '" cy="' + (q.y + 2) + '" r="5"/><circle class="fumee" cx="' + (q.x + (gauche ? 24 : -24)) + '" cy="' + q.y + '" r="7"/>';
      });
      return html;
    };
    var pas = function () {
      r++;
      if (r >= tours.length) {
        var gagne = N.gagnant === 0, moiGagne = (att.camp === moi()) === gagne;
        $('roundNav').textContent = gagne ? 'Victoire de ' + nomF(att.camp) : 'Victoire de ' + nomF(N.campD);
        $('resNav').innerHTML = (moiGagne ? '🏆 Victoire navale !' : '💀 Défaite en mer…') + '<br><small>Navires coulés : ' + N.coules[0] + ' (attaquant) · ' + N.coules[1] + ' (défenseur)</small>';
        $('resNav').style.color = moiGagne ? '#22c55e' : '#e5484d';
        $('fNavOk').classList.remove('hide');
        return;
      }
      $('roundNav').textContent = 'Bordée ' + r + ' !';
      $('feuxNav').innerHTML = feux(tours[r - 1].a, true) + feux(tours[r - 1].d, false);
      setTimeout(function () { maj(tours[r].a, N.a, 'a'); maj(tours[r].d, N.d, 'd'); $('feuxNav').innerHTML = ''; }, 350);
      setTimeout(pas, 900);
    };
    setTimeout(pas, 700);
    $('fNavOk').onclick = function () { fermer(); suite(); };
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
    var suite = function () { traiterEvenements(function () { traiterPropositions(function () { traiterDefenses(defenses); }); }); };
    rapport(etat.factions[moi()].or - avant, suite);
  };

  // Rapport du royaume au début de chaque tour, comme dans les jeux de gestion.
  function rapport(gain, suite) {
    var R = etat.rapport || {}, J = etat.factions[moi()];
    var risques = etat.provinces.map(function (p, i) { return p.proprio === moi() && p.ordre < 35 ? i : -1; }).filter(function (i) { return i >= 0; });
    var h = '<h2>📜 Rapport du royaume</h2><p class="sousTitre">An ' + etat.annee + ' · Tour ' + etat.tour + ' · ' + J.nom + '</p>';
    h += '<div class="rapport"><section><h4>💰 Trésor</h4><div class="lignes">' +
      '<span>Impôts des provinces</span><b class="plus">+' + (R.revenu || 0) + '</b>' +
      (R.commerce ? '<span>📦 Commerce</span><b class="plus">+' + R.commerce + '</b>' : '') +
      '<span>Entretien des armées</span><b class="moins">−' + (R.entretien || 0) + '</b>' +
      (R.salaires ? '<span>🏛️ Salaires du conseil</span><b class="moins">−' + R.salaires + '</b>' : '') +
      '<span>Bilan du tour</span><b class="' + (gain >= 0 ? 'plus' : 'moins') + '">' + (gain >= 0 ? '+' : '') + gain + '</b>' +
      '<span>Trésor</span><b>' + J.or + ' or</b></div></section>';
    h += '<section><h4>👑 Cour</h4>' + (R.cour && R.cour.length ? '<ul>' + R.cour.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' :
      '<p class="calme">Rien à signaler. ' + J.roi.nom + ' a ' + M.age(etat, J.roi) + ' ans.</p>') + '</section>';
    if (R.quetes && R.quetes.length) h += '<section class="quete"><h4>📜 Quêtes</h4><ul>' + R.quetes.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></section>';
    h += '<section><h4>🌍 Nouvelles du monde</h4>' + (etat.nouvelles.length ? '<ul>' + etat.nouvelles.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' : '<p class="calme">Le monde est calme.</p>') + '</section>';
    if (risques.length) h += '<section class="alerte"><h4>⚠️ Ordre public</h4><p>Risque de révolte à ' + risques.map(function (i) { return '<button class="lienProv" data-prov="' + i + '">' + PROV[i].nom + '</button>'; }).join(', ') + '. Baisse les impôts ou place une garnison.</p></section>';
    if (etat.propositions && etat.propositions.length) h += '<p class="calme">✉️ ' + etat.propositions.length + ' messager(s) attendent ta réponse.</p>';
    h += '</div><button class="btn or" id="fOk">▶ Commencer le tour</button>';
    feuille(h);
    document.querySelectorAll('[data-prov]').forEach(function (b) { b.onclick = function () { fermer(); allerA(+b.getAttribute('data-prov')); suite(); }; });
    $('fOk').onclick = function () { fermer(); suite(); };
  }
  function allerA(i) { choix = i; var P = PROV[i]; centrer(P.x, P.y, Math.min(vb.w, 400)); dessiner(); }
  function humeurOrdre(o) { return o >= 70 ? '😊' : o >= 45 ? '🙂' : o >= 25 ? '😠' : '🔥'; }
  function couleurOrdre(o) { return o >= 60 ? '#22c55e' : o >= 35 ? '#fbbf24' : '#e5484d'; }
  function detailOrdre(i) {
    var p = etat.provinces[i], d = M.detailOrdre(etat, i), cible = M.cibleOrdre(etat, i);
    feuille('<h2>' + humeurOrdre(p.ordre) + ' Ordre public à ' + PROV[i].nom + '</h2><p>Actuel : <b>' + Math.round(p.ordre) + '</b> / 100. Il évolue de 10 points par tour vers <b>' + cible + '</b>. En dessous de 25, la province peut se révolter.</p>' +
      '<div class="lignes">' + d.map(function (x) { return '<span>' + x[0] + '</span><b class="' + (x[1] >= 0 ? 'plus' : 'moins') + '">' + (x[1] >= 0 ? '+' : '') + x[1] + '</b>'; }).join('') + '</div>' +
      '<p class="petitTxt">Pour l\'améliorer : impôts bas, garnison, remparts. Une province conquise reste agitée quelques tours.</p><button class="btn or" data-fermer>OK</button>');
  }
  // Vue d'ensemble du royaume : toutes tes provinces.
  function royaume() {
    var J = etat.factions[moi()], rev = M.revenu(etat, moi()), ent = M.entretien(etat, moi()), com = M.revenuCommerce(etat), sal = M.salaires(etat);
    var liste = etat.provinces.map(function (p, i) { return p.proprio === moi() ? i : -1; }).filter(function (i) { return i >= 0; })
      .sort(function (a, b) { return etat.provinces[a].ordre - etat.provinces[b].ordre; });
    var h = '<h2>🏛️ ' + J.nom + '</h2><div class="lignes"><span>Impôts par tour</span><b class="plus">+' + rev + '</b><span>📦 Commerce</span><b class="plus">+' + com + '</b><span>Entretien armées et flottes</span><b class="moins">−' + ent + '</b><span>🏛️ Salaires du conseil</span><b class="moins">−' + sal + '</b><span>Solde</span><b class="' + (soldeTour() >= 0 ? 'plus' : 'moins') + '">' + (soldeTour() >= 0 ? '+' : '') + soldeTour() + '</b><span>Trésor</span><b>' + J.or + ' or</b></div>' +
      '<table class="tabRoyaume"><thead><tr><th>Province</th><th>💰</th><th>Ordre</th><th>Impôts</th><th>⚔️</th></tr></thead><tbody>';
    liste.forEach(function (i) {
      var p = etat.provinces[i];
      h += '<tr data-prov="' + i + '"><td>' + (M.estCapitale(etat, i) ? '👑 ' : '') + PROV[i].nom + '</td><td>+' + M.revenuProvince(p) + '</td><td style="color:' + couleurOrdre(p.ordre) + '">' + humeurOrdre(p.ordre) + ' ' + Math.round(p.ordre) + '</td><td>' + M.IMPOTS[p.impots == null ? 1 : p.impots].ico + '</td><td>' + p.armee.length + '</td></tr>';
    });
    h += '</tbody></table><p class="petitTxt">Touche une province pour la voir sur la carte.</p><button class="btn" data-fermer>Fermer</button>';
    feuille(h);
    document.querySelectorAll('tr[data-prov]').forEach(function (b) { b.onclick = function () { fermer(); allerA(+b.getAttribute('data-prov')); }; });
  }

  // ---------- Quêtes : restaurer un empire historique ----------
  function resumeQuete() {
    var x = M.quetes(etat, moi()).filter(function (x) { return x.faite == null; }).sort(function (a, b) { return b.tenues / b.total - a.tenues / a.total; })[0];
    if (!x) return '';
    return '<button class="resumeQuete" id="pQuete1"><span>' + x.q.ico + ' <b>' + x.q.titre + '</b> <small>' + x.tenues + '/' + x.total + '</small></span><i class="barreOrdre"><i style="width:' + Math.round(100 * x.tenues / x.total) + '%;background:var(--or)"></i></i></button>';
  }
  function ecranQuetes() {
    var liste = M.quetes(etat, moi());
    var h = '<h2>📜 Quêtes impériales</h2><p>Reprends toutes les provinces d\'un empire historique pour le restaurer : ton royaume prend son nom, reçoit de l\'or et un bonus d\'ordre public permanent.</p>';
    liste.forEach(function (x) {
      var q = x.q, fait = x.faite != null, parMoi = x.faite === moi();
      h += '<section class="carteQuete' + (fait ? ' faite' : '') + '"><h4>' + q.ico + ' ' + q.titre + '</h4><p class="petitTxt">' + q.texte + '</p>';
      if (fait) h += '<p><b>' + (parMoi ? '✅ Accomplie : tu règnes sur l\'' + q.nom + ' !' : '❌ ' + etat.factions[x.faite].nom + ' l\'a restauré avant toi.') + '</b></p>';
      else {
        h += '<div class="progQuete"><i class="barreOrdre"><i style="width:' + Math.round(100 * x.tenues / x.total) + '%;background:var(--or)"></i></i><b>' + x.tenues + ' / ' + x.total + '</b></div>' +
          '<div class="provsQuete">' + q.provinces.map(function (id) {
            var i = M.PROV.findIndex(function (P) { return P.id === id; }), p = etat.provinces[i], mienP = p.proprio === moi();
            return '<button class="lienProv' + (mienP ? ' tenue' : '') + '" data-prov="' + i + '" title="' + (p.proprio >= 0 ? etat.factions[p.proprio].nom : 'Rebelles') + '">' + (mienP ? '✅ ' : '<span class="pastille" style="background:' + coul(p.proprio) + '"></span>') + M.PROV[i].nom + '</button>';
          }).join('') + '</div>' +
          '<p class="petitTxt">🏆 Récompense : ton royaume devient l\'<b>' + q.nom + '</b>, +' + q.or + ' or, ordre public +15 partout et +5 pour toujours.</p>';
      }
      h += '</section>';
    });
    h += '<button class="btn" data-fermer>Fermer</button>';
    feuille(h);
    document.querySelectorAll('[data-prov]').forEach(function (b) { b.onclick = function () { fermer(); allerA(+b.getAttribute('data-prov')); }; });
  }

  // ---------- Cour, dynastie et mariages ----------
  function portrait(p, f, taille) {
    var F = etat.factions[f];
    return window.Portrait ? Portrait.svg(p, { coul: F.coul, culture: F.cour && F.cour.c, age: M.age(etat, p), taille: taille }) : '';
  }
  function looksMembre(m, F) {
    // Les membres de la famille n'ont pas d'apparence enregistrée : on la tire du souverain.
    return { nom: m.nom, ne: m.ne, sexe: m.sexe, look: m.look || { barbe: m.sexe === 'm' ? (F.roi.look.barbe === 'rase' ? 'courte' : F.roi.look.barbe) : 'rase', ch: F.roi.look.ch === 'perruque' ? 'perruque' : F.roi.look.ch, tete: m.sexe === 'f' ? (F.roi.look.tete === 'turban' ? 'voile' : 'aucun') : (F.roi.look.tete === 'turban' ? 'turban' : 'aucun') } };
  }
  function ligneMembre(m, f, extra) {
    var F = etat.factions[f], h = M.heritier(F);
    return '<div class="membre">' + portrait(looksMembre(m, F), f, 40) + '<div><b>' + m.nom + (h === m ? ' <span class="tag">👑 Héritier</span>' : '') + '</b><small>' +
      m.lien + (m.parent ? ' de ' + m.parent : '') + ' · ' + M.age(etat, m) + ' ans' + (m.epoux ? ' · 💍 ' + m.epoux.nom + (m.epoux.f >= 0 && m.epoux.f !== f ? ' (' + etat.factions[m.epoux.f].nom + ')' : '') + (m.epoux.matri ? ' · <span class="tag">♀ matrilinéaire</span>' : '') : '') + '</small></div>' + (extra || '') + '</div>';
  }
  function cour(fid, onglet) {
    var f = fid == null ? moi() : fid, F = etat.factions[f], mien = f === moi();
    onglet = mien && F.cour.conseil ? onglet || 'famille' : 'famille';
    var h = '<h2>👑 ' + (mien ? 'Ta cour' : 'Cour de ' + F.nom) + '</h2>' +
      '<div class="trone">' + portrait(F.roi, f, 110) + '<div><b>' + F.roi.nom + '</b><small>' + (F.roi.sexe === 'f' ? 'Reine' : F.cour.elu ? 'Souverain élu' : 'Roi') + ' · ' + M.age(etat, F.roi) + ' ans</small><small>Dynastie : ' + F.cour.dyn + '</small>' +
      (F.conj ? '<small>💍 ' + F.conj.nom + (F.conj.de >= 0 ? ' (' + (F.conj.de === moi() ? 'ta famille' : etat.factions[F.conj.de].nom) + ')' : '') + ', ' + M.age(etat, F.conj) + ' ans' + (F.roi.sexe === 'f' && F.conj.matri ? ' · ♀ matrilinéaire' : '') + '</small>' : '') +
      (F.roi.sexe === 'f' && F.cour.dynEnfants ? '<small>⚠️ Mariage patrilinéaire : ses enfants seront de la maison ' + F.cour.dynEnfants + '</small>' : '') + '</div>' +
      (F.conj ? portrait(looksMembre(F.conj, F), f, 64) : '') + '</div>';
    if (mien && F.cour.conseil) {
      h += '<div class="onglets">' + [['famille', '👨‍👩‍👧 Famille'], ['conseil', '🏛️ Conseil'], ['nobles', '🎩 Courtisans']].map(function (o) {
        return '<button data-og="' + o[0] + '"' + (o[0] === onglet ? ' class="on"' : '') + '>' + o[1] + '</button>';
      }).join('') + '</div>';
      if (onglet !== 'famille') {
        h += onglet === 'conseil' ? ecranConseil(F) : ecranNobles(F);
        h += '<button class="btn" data-fermer>Fermer</button>';
        feuille(h);
        brancherCour();
        return;
      }
    }
    h += '<h4 class="titreFam">Famille</h4>' + (F.cour.fam.length ? F.cour.fam.slice().sort(function (a, b) { return a.ne - b.ne; }).map(function (m) { return ligneMembre(m, f); }).join('') :
      '<p class="calme">' + (F.cour.elu ? 'Un souverain élu n\'a pas d\'héritier : son successeur sera élu.' : 'Aucun parent proche. Sans héritier, la mort du souverain déclenchera une crise de succession !') + '</p>');
    if (mien && !F.cour.elu) h += '<p class="petitTxt">💡 Marie ta famille à d\'autres dynasties : leur humeur monte, l\'alliance devient plus facile, et si l\'héritier d\'un royaume épouse l\'un des tiens, son royaume peut te revenir en héritage !</p><button class="btn or" id="fMarier">💍 Arranger un mariage</button>';
    h += mien ? '<button class="btn" data-fermer>Fermer</button>' : '<button class="btn" id="fRetourNego">← Négocier</button>';
    feuille(h);
    if ($('fMarier')) $('fMarier').onclick = choisirMariage;
    if ($('fRetourNego')) $('fRetourNego').onclick = function () { negocier(f); };
    brancherCour();
  }
  function brancherCour() {
    document.querySelectorAll('[data-og]').forEach(function (b) { b.onclick = function () { cour(null, b.getAttribute('data-og')); }; });
    document.querySelectorAll('[data-siege]').forEach(function (b) { b.onclick = function () { choisirConseiller(b.getAttribute('data-siege')); }; });
  }
  function lookPersonne(p, F) { return p.look ? p : looksMembre(p, F); }
  function jaugeLoy(l) { return '<i class="barreOrdre loy"><i style="width:' + l + '%;background:' + (l >= 60 ? '#22c55e' : l >= 30 ? '#fbbf24' : '#e5484d') + '"></i></i>'; }
  function ecranConseil(F) {
    var h = '<div class="lignes"><span>✨ Prestige</span><b>' + (F.prestige || 0) + '</b><span>🏛️ Salaires du conseil</span><b class="moins">−' + M.salaires(etat) + ' / tour</b></div>';
    Object.keys(M.ROLES).forEach(function (r) {
      var R = M.ROLES[r], p = M.conseiller(etat, r);
      h += '<div class="siege"><span class="sIco">' + R.ico + '</span>' + (p ? portrait(lookPersonne(p, F), moi(), 44) : '<span class="videS">?</span>') +
        '<div><b>' + M.nomRole(F, r) + '</b><small>' + (p ? p.nom + (p.lien ? ' (' + p.lien + ')' : '') + ' · ' + M.DOMAINES[p.dom] + ' ' + p.comp + '/10 → <b>' + M.valeurPour(p, r) + ' pts</b>' : 'Siège vide') + '</small>' +
        '<small class="effet">' + R.effet + '</small>' + (p && p.loy != null ? jaugeLoy(p.loy) : '') + '</div>' +
        '<button class="btn mini" data-siege="' + r + '">' + (p ? 'Changer' : 'Nommer') + '</button></div>';
    });
    return h + '<p class="petitTxt">💡 Un conseiller travaille à fond dans son domaine. Ailleurs, il ne donne qu\'un tiers de sa compétence. Chacun touche 1 or + la moitié de sa note par tour.</p>';
  }
  function ecranNobles(F) {
    var h = '<p class="petitTxt">Les courtisans peu loyaux (en rouge) finissent par comploter : vol du trésor, émeutes… Un bon 🕵️ maître espion déjoue leurs complots. Festins, tournois et faveurs les gardent fidèles.</p>';
    h += F.cour.nobles.slice().sort(function (a, b) { return a.loy - b.loy; }).map(function (n) {
      return '<div class="membre">' + portrait(n, moi(), 40) + '<div><b>' + n.nom + (M.estAuConseil(F, 'n' + n.id) ? ' <span class="tag">🏛️ Conseil</span>' : '') + '</b><small>' + M.age(etat, n) + ' ans · ' + M.DOMAINES[n.dom] + ' ' + n.comp + '/10 · loyauté ' + n.loy + '</small>' + jaugeLoy(n.loy) + '</div></div>';
    }).join('') || '<p class="calme">Personne à la cour.</p>';
    return h;
  }
  function choisirConseiller(r) {
    var R = M.ROLES[r], F = etat.factions[moi()], liste = M.candidats(etat).sort(function (a, b) { return M.valeurPour(b.p, r) - M.valeurPour(a.p, r); });
    var actuel = F.cour.conseil[r];
    var h = '<h2>' + R.ico + ' ' + M.nomRole(F, r) + '</h2><p>' + R.effet + ' Choisis quelqu\'un de doué en <b>' + M.DOMAINES[R.dom] + '</b>.</p><div class="diplo">';
    liste.forEach(function (c) {
      var p = c.p, v = M.valeurPour(p, r);
      h += '<button class="ligneDiplo' + (c.cle === actuel ? ' on' : '') + '" data-cand="' + c.cle + '">' + portrait(lookPersonne(p, F), moi(), 34) + '<span class="dNom"><b>' + p.nom + (c.fam ? ' 👑' : '') + '</b><small>' + (c.fam ? p.lien + ' · ' : '') + M.DOMAINES[p.dom] + ' ' + p.comp + '/10' + (p.loy != null ? ' · loyauté ' + p.loy : '') + (M.estAuConseil(F, c.cle) && c.cle !== actuel ? ' · déjà au conseil' : '') + '</small></span><span class="note' + (v >= 7 ? ' haute' : v <= 2 ? ' basse' : '') + '">' + v + '</span></button>';
    });
    h += '</div>' + (actuel ? '<button class="btn" id="fVider">🚪 Renvoyer (siège vide)</button>' : '') + '<button class="btn" id="fRetCons">← Conseil</button>';
    feuille(h);
    document.querySelectorAll('[data-cand]').forEach(function (b) { b.onclick = function () { var e = M.nommer(etat, r, b.getAttribute('data-cand')); if (e) toast(e); sauver(); dessiner(); cour(null, 'conseil'); }; });
    if ($('fVider')) $('fVider').onclick = function () { M.nommer(etat, r, null); sauver(); dessiner(); cour(null, 'conseil'); };
    $('fRetCons').onclick = function () { cour(null, 'conseil'); };
  }
  // Événements de cour : un choix à faire au début du tour.
  function traiterEvenements(ensuite) {
    var E = (etat.evenements || [])[0];
    if (etat.fin || !E) { ensuite(); return; }
    feuille('<h2>' + E.titre + '</h2><p>' + E.texte + '</p><p class="petitTxt">💰 Trésor : ' + etat.factions[moi()].or + ' or · ✨ Prestige : ' + (etat.factions[moi()].prestige || 0) + '</p>' +
      E.choix.map(function (c, k) { return '<button class="btn' + (k === 0 ? ' or' : '') + '" data-ev="' + k + '">' + c + '</button>'; }).join(''));
    document.querySelectorAll('[data-ev]').forEach(function (b) {
      b.onclick = function () { var m = M.choisirEvenement(etat, +b.getAttribute('data-ev')); fermer(); if (m) toast(m); sauver(); dessiner(); traiterEvenements(ensuite); };
    });
  }
  // ---------- Commerce ----------
  function importsDe(f) {
    var mes = M.biens(etat, moi()), leurs = M.biens(etat, f);
    var l = Object.keys(leurs).filter(function (k) { return !mes[k]; }).map(function (k) { return M.PRODUITS[k].ico + ' ' + M.PRODUITS[k].nom.toLowerCase(); });
    return l.length ? l.join(', ') : 'des marchandises';
  }
  function commerce() {
    var b = M.biens(etat, moi()), acc = M.accords(etat), max = M.maxAccords(etat), lx = M.luxes(etat, moi()), P = M.PRODUITS;
    var h = '<h2>📦 Commerce</h2><p>Signe des accords commerciaux : chaque partenaire achète ce que tu produis et te vend ce qui te manque. Les ⚓ ports augmentent les profits et le nombre d\'accords.</p>' +
      '<div class="lignes"><span>Revenus du commerce</span><b class="plus">+' + M.revenuCommerce(etat) + ' / tour</b><span>Accords</span><b>' + acc.length + ' / ' + max + '</b><span>⚓ Niveaux de ports</span><b>' + M.ports(etat, moi()) + '</b></div>' +
      '<h4 class="titreFam">Tes marchandises</h4><div class="biens">' + Object.keys(b).map(function (k) { return '<span class="bien' + (P[k].luxe ? ' luxe' : '') + '">' + P[k].ico + ' ' + P[k].nom + (b[k] > 1 ? ' ×' + b[k] : '') + '</span>'; }).join('') + '</div>' +
      '<p class="petitTxt">💎 Luxe à ta cour : ' + (lx.length ? lx.map(function (k) { return P[k].ico + ' ' + P[k].nom; }).join(', ') : 'aucun') + '. Chaque produit de luxe (possédé ou importé) calme le peuple : +2 d\'ordre public partout, jusqu\'à +8.</p>' +
      '<h4 class="titreFam">Tes accords</h4>';
    h += acc.length ? acc.map(function (f) {
      return '<div class="membre">' + portrait(etat.factions[f].roi, f, 34) + '<div><b>' + etat.factions[f].nom + ' <span class="plus">+' + M.valeurAccord(etat, f) + '</span></b><small>Importe : ' + importsDe(f) + '</small></div><button class="btn mini" data-fin="' + f + '">Rompre</button></div>';
    }).join('') : '<p class="calme">Aucun accord pour l\'instant.</p>';
    var partenaires = M.diplomatie(etat).filter(function (d) { return d.rel !== 'guerre' && acc.indexOf(d.f) < 0; })
      .map(function (d) { d.v = M.valeurAccord(etat, d.f); return d; }).sort(function (x, y) { return y.v - x.v; });
    h += '<h4 class="titreFam">Partenaires possibles</h4><div class="diplo">' + partenaires.map(function (d) {
      return '<button class="ligneDiplo" data-com="' + d.f + '">' + portrait(etat.factions[d.f].roi, d.f, 34) + '<span class="dNom"><b>' + d.nom + '</b><small>' + importsDe(d.f) + ' · ' + d.humeur + '</small></span><span class="note haute">+' + d.v + '</span></button>';
    }).join('') + '</div><button class="btn" data-fermer>Fermer</button>';
    feuille(h);
    document.querySelectorAll('[data-com]').forEach(function (x) { x.onclick = function () { var r = M.proposer(etat, +x.getAttribute('data-com'), 'commerce'); toast((r.ok ? '✅ ' : '❌ ') + r.msg); sauver(); dessiner(); commerce(); }; });
    document.querySelectorAll('[data-fin]').forEach(function (x) { x.onclick = function () { var r = M.proposer(etat, +x.getAttribute('data-fin'), 'finCommerce'); toast(r.msg); sauver(); dessiner(); commerce(); }; });
  }
  function choisirMariage() {
    var liste = M.diplomatie(etat).filter(function (d) { return d.rel !== 'guerre' && !etat.factions[d.f].cour.elu; });
    var h = '<h2>💍 Avec quelle famille ?</h2><p>Les royaumes en guerre avec toi refusent tout mariage.</p><div class="diplo">';
    liste.forEach(function (d) {
      var F = etat.factions[d.f];
      h += '<button class="ligneDiplo" data-mf="' + d.f + '">' + portrait(F.roi, d.f, 34) + '<span class="dNom"><b>' + d.nom + '</b><small>' + F.roi.nom + ' · ' + d.humeur + (d.sang ? ' · 🩸 déjà parents' : '') + '</small></span>' + badge(d.rel) + '</button>';
    });
    h += '</div><button class="btn" id="fRetourCour">← Ma cour</button>';
    feuille(h);
    document.querySelectorAll('[data-mf]').forEach(function (b) { b.onclick = function () { mariage(+b.getAttribute('data-mf')); }; });
    $('fRetourCour').onclick = function () { cour(); };
  }
  function mariage(f, choixA, choixB, choixMatri) {
    var F = etat.factions[f], J = etat.factions[moi()];
    var miens = M.membresLibres(etat, moi()), leurs = M.membresLibres(etat, f);
    var a = choixA != null ? choixA : miens.length ? miens[0].k : null;
    var pa = a != null ? M.membre(J, a) : null;
    var compat = leurs.filter(function (x) { return pa && x.p.sexe !== pa.sexe && !(a < 0 && x.k < 0); });
    var b = choixB != null && compat.some(function (x) { return x.k === choixB; }) ? choixB : compat.length ? compat[0].k : null;
    var peutMatri = pa && pa.sexe === 'f' && b != null && b >= 0;
    var matri = peutMatri && (choixMatri != null ? choixMatri : a < 0);
    var h = '<h2>💍 Mariage avec ' + F.nom + '</h2>';
    if (!miens.length) { feuille(h + '<p>Personne de ta famille n\'est libre pour un mariage.</p><button class="btn" id="fRetourM">← Retour</button>'); $('fRetourM').onclick = choisirMariage; return; }
    h += '<h4 class="titreFam">De ta famille</h4><div class="choixM">' + miens.map(function (x) {
      return '<button class="carteM' + (x.k === a ? ' on' : '') + '" data-ma="' + x.k + '">' + portrait(x.k < 0 ? x.p : looksMembre(x.p, J), moi(), 44) + '<b>' + x.p.nom + '</b><small>' + (x.k < 0 ? 'Souverain' : x.p.lien) + ', ' + M.age(etat, x.p) + ' ans</small></button>';
    }).join('') + '</div>';
    h += '<h4 class="titreFam">De la famille de ' + F.roi.nom + '</h4>';
    if (!compat.length) h += '<p class="calme">Personne de compatible chez eux.</p>';
    else h += '<div class="choixM">' + compat.map(function (x) {
      return '<button class="carteM' + (x.k === b ? ' on' : '') + '" data-mb="' + x.k + '">' + portrait(x.k < 0 ? x.p : looksMembre(x.p, F), f, 44) + '<b>' + x.p.nom + (M.heritier(F) === x.p ? ' 👑' : '') + '</b><small>' + (x.k < 0 ? 'Souverain' : x.p.lien) + ', ' + M.age(etat, x.p) + ' ans</small></button>';
    }).join('') + '</div>';
    if (b != null) {
      if (peutMatri) h += '<h4 class="titreFam">Type de mariage</h4><div class="choixLignee">' +
        '<button class="carteM' + (!matri ? ' on' : '') + '" data-mt="0"><b>♂ Patrilinéaire</b><small>' + pa.nom + ' rejoint la famille de son mari : les enfants seront de la maison ' + F.cour.dyn + '.</small></button>' +
        '<button class="carteM' + (matri ? ' on' : '') + '" data-mt="1"><b>♀ Matrilinéaire</b><small>' + M.membre(F, b).nom + ' rejoint ta cour : les enfants seront de ta dynastie (' + J.cour.dyn + '). Plus dur à faire accepter.</small></button></div>';
      var c = M.chanceMariage(etat, f, b, matri);
      h += '<div class="chances" style="color:' + (c >= 35 ? '#22c55e' : c >= 15 ? '#fbbf24' : '#e5484d') + '">' + (c >= 35 ? '🟢 Ils accepteront sûrement' : c >= 15 ? '🟡 Ils devraient accepter' : '🔴 Ils vont refuser : offre d\'abord des cadeaux') + '</div>' +
        (M.heritier(F) === M.membre(F, b) ? '<p class="petitTxt">' + (matri ? '👑 C\'est leur héritier : en venant à ta cour, il renonce à leur trône.' : '👑 C\'est leur héritier : si ' + M.membre(F, b).nom + ' monte sur le trône, son royaume rejoindra le tien !') + '</p>' : '') +
        '<button class="btn or" id="fMarierOk">💍 Proposer ce mariage</button>';
    }
    h += '<button class="btn" id="fRetourM">← Autre famille</button>';
    feuille(h);
    document.querySelectorAll('[data-ma]').forEach(function (x) { x.onclick = function () { mariage(f, +x.getAttribute('data-ma'), b); }; });
    document.querySelectorAll('[data-mb]').forEach(function (x) { x.onclick = function () { mariage(f, a, +x.getAttribute('data-mb'), matri); }; });
    document.querySelectorAll('[data-mt]').forEach(function (x) { x.onclick = function () { mariage(f, a, b, x.getAttribute('data-mt') === '1'); }; });
    $('fRetourM').onclick = choisirMariage;
    if ($('fMarierOk')) $('fMarierOk').onclick = function () {
      var r = M.proposer(etat, f, 'mariage', { a: a, b: b, matri: matri });
      toast((r.ok ? '' : '❌ ') + r.msg);
      sauver(); dessiner();
      if (r.ok) cour(); else negocier(f);
    };
  }

  // Les royaumes te proposent la paix ou une alliance.
  function traiterPropositions(ensuite) {
    if (etat.fin || !etat.propositions || !etat.propositions.length) { ensuite(); return; }
    var P = etat.propositions[0], F = etat.factions[P.f], D = etat.diplo[P.f];
    var paix = P.type === 'paix';
    if (P.type === 'mariage') {
      var pa = M.membre(etat.factions[moi()], P.a), pb = M.membre(F, P.b);
      feuille('<h2>💍 Un messager de ' + F.nom + '</h2><div class="duoM">' + (pa ? portrait(P.a < 0 ? pa : looksMembre(pa, etat.factions[moi()]), moi(), 70) : '') + '<span>💍</span>' + (pb ? portrait(looksMembre(pb, F), P.f, 70) : '') + '</div>' +
        '<p><b>' + F.roi.nom + '</b> propose d\'unir vos familles : <b>' + P.noms[0] + '</b> épouserait <b>' + P.noms[1] + '</b>' + (M.heritier(F) === pb ? ', son héritier !' : '.') + ' Vos royaumes deviendraient parents (humeur en hausse, alliance plus facile).</p>' +
        '<button class="btn or" id="fOui">✅ Accepter</button><button class="btn" id="fNon">❌ Refuser</button>');
      var repM = function (oui) { var msg = M.repondre(etat, 0, oui); fermer(); if (msg) toast(msg); sauver(); dessiner(); traiterPropositions(ensuite); };
      $('fOui').onclick = function () { repM(true); };
      $('fNon').onclick = function () { repM(false); };
      return;
    }
    var com = P.type === 'commerce';
    feuille('<h2>' + (paix ? '🕊️' : com ? '📦' : '🤝') + ' Un messager de ' + F.nom + '</h2>' +
      '<div class="roiNego">' + portrait(F.roi, P.f, 56) + '<span><b>' + F.roi.nom + '</b><small>' + F.nom + ' · ' + M.nbProvinces(etat, P.f) + ' prov. · ' + M.humeur(D.att) + '</small></span></div>' +
      '<p><b>' + F.roi.nom + '</b> ' +
      (paix ? 'est las de la guerre et te propose la <b>paix</b>.' : com ? 'te propose un <b>accord commercial</b> : ses marchands t\'apporteront ' + importsDe(P.f) + ' et te rapporteront <b>+' + M.valeurAccord(etat, P.f) + ' or</b> par tour.' : 'te propose une <b>alliance</b> : vous ne vous attaquerez plus, il défendra tes villes voisines et tu pourras lui demander de l\'or ou des troupes.') + '</p>' +
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
      h += '<button class="ligneDiplo" data-df="' + d.f + '">' + portrait(etat.factions[d.f].roi, d.f, 34) +
        '<span class="dNom"><b><span class="pastille" style="background:' + d.coul + '"></span> ' + d.nom + '</b><small>' + etat.factions[d.f].roi.nom + ' · ' + d.n + ' prov. · ' + d.humeur + (d.sang ? ' · 🩸' : '') + (d.voisin ? ' · voisin' : '') + '</small></span>' + badge(d.rel) + '</button>';
    });
    h += '</div><button class="btn" id="fAideDiplo">❓ Comment marche la diplomatie ?</button><button class="btn" data-fermer>Fermer</button>';
    feuille(h);
    document.querySelectorAll('[data-df]').forEach(function (b) { b.onclick = function () { negocier(+b.getAttribute('data-df')); }; });
    $('fAideDiplo').onclick = function () { aide('diplo'); };
  }
  function negocier(f) {
    var F = etat.factions[f], D = etat.diplo[f], rel = D.rel, J = etat.factions[moi()];
    var h = '<h2><span class="pastille" style="background:' + F.coul + '"></span> ' + F.nom + '</h2>' +
      '<button class="roiNego" id="fVoirCour">' + portrait(F.roi, f, 56) + '<span><b>' + F.roi.nom + '</b><small>' + M.age(etat, F.roi) + ' ans · ' + F.cour.dyn + '</small><small>Voir sa cour ›</small></span></button>' +
      '<div class="relLigne">' + badge(rel) + ' <span>' + M.humeur(D.att) + '</span>' + (D.sang ? '<span class="rel sang">🩸 Familles unies</span>' : '') + '</div>' +
      '<div class="humeurJauge"><i style="left:' + (D.att + 100) / 2 + '%"></i></div>' +
      '<p class="petitTxt">Humeur envers toi : ' + D.att + ' / 100. ' + M.nbProvinces(etat, f) + ' province' + (M.nbProvinces(etat, f) > 1 ? 's' : '') + ', 💰 ' + F.or + ' or.</p>';
    if (rel === 'guerre') h += '<button class="btn or" data-act="paix">🕊️ Proposer la paix</button>';
    if (rel === 'paix') h += '<button class="btn or" data-act="alliance">🤝 Proposer une alliance' + (D.att < 40 ? ' (humeur 40 requise)' : '') + '</button>';
    if (rel === 'alliance') {
      h += '<button class="btn or" data-act="aideOr">💰 Demander de l\'or</button>' +
        '<button class="btn or" data-act="aideTroupes">🛡️ Demander des renforts</button>' +
        (D.aideT > etat.tour ? '<p class="petitTxt">Ton allié pourra t\'aider de nouveau dans ' + (D.aideT - etat.tour) + ' tour(s).</p>' : '');
    }
    if (rel !== 'guerre') h += (etat.commerce || {})[f] ? '<button class="btn" data-act="finCommerce">📦 Mettre fin à l\'accord commercial</button>' : '<button class="btn bleu" data-act="commerce">📦 Accord commercial (+' + M.valeurAccord(etat, f) + ' or/tour)</button>';
    h += '<button class="btn" data-act="cadeau"' + (J.or < 100 ? ' disabled' : '') + '>🎁 Offrir 100 or (humeur +15)</button>';
    if (rel !== 'guerre' && !F.cour.elu && !J.cour.elu) h += '<button class="btn" id="fMariage">💍 Proposer un mariage</button>';
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
    $('fVoirCour').onclick = function () { cour(f); };
    if ($('fMariage')) $('fMariage').onclick = function () { mariage(f); };
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
    cour: ['👑 Dynastie et mariages', [
      'Chaque royaume est dirigé par son vrai souverain historique : Charlemagne, Saladin, Louis XIV… Ils vieillissent, ont des enfants et meurent.',
      'À la mort de ton souverain, l\'héritier (👑) monte sur le trône. Sans héritier, c\'est la <b>crise de succession</b> : un cousin prend le pouvoir et une province peut faire sécession.',
      'Bouton <b>👑 Ma cour</b> : ta famille, ton conjoint et ton héritier. <b>💍 Arranger un mariage</b> pour unir ta famille à une autre dynastie.',
      'Un mariage fait monter l\'humeur (+20), rend l\'alliance plus facile et calme les envies de guerre. Les royaumes te proposeront aussi des mariages.',
      '💍👑 <b>Union des couronnes</b> : si l\'héritier d\'un royaume a épousé l\'un des tiens, à la mort de son père il apporte tout son royaume au tien !',
      '♀ <b>Mariage matrilinéaire</b> : quand une femme de ta famille se marie, choisis « matrilinéaire ». Son mari quitte sa cour pour la tienne et leurs enfants sont de <b>ta</b> dynastie (et peuvent hériter de ton trône). Plus dur à faire accepter.',
      '♂ En mariage patrilinéaire, les enfants d\'une reine appartiennent à la maison de leur père : à sa mort, la dynastie change sur le trône !',
      'Les papes, doges et républiques élisent leur chef : pas de mariage possible avec eux.']],
    conseil: ['🏛️ Conseil et courtisans', [
      'Dans <b>👑 Ma cour</b>, l\'onglet <b>🏛️ Conseil</b> a 5 sièges : 📜 chancelier, ⚔️ maréchal, 💰 intendant, 🕵️ maître espion et ⛪ chapelain.',
      'Nomme pour chaque siège un noble (ou un membre de ta famille) doué dans le bon domaine : sa note donne le bonus. Chaque conseiller touche un salaire.',
      'L\'onglet <b>🎩 Courtisans</b> montre la loyauté de chacun. Sous 25, un courtisan complote : il vole le trésor ou soulève la capitale, sauf si ton maître espion le démasque.',
      'Chaque tour peut apporter un <b>événement de cour</b> : festin, tournoi, querelle, ambassade, savant… Tes choix changent la loyauté, le prestige et le trésor.',
      'Le <b>✨ prestige</b> monte avec les fêtes, les conquêtes et les quêtes. Il rend les mariages plus faciles et la noblesse plus fidèle.']],
    marine: ['⚓ Marine et batailles navales', [
      'Construis un <b>⚓ port</b> dans une province côtière (🌊), puis touche <b>⛵ Navires</b> : galères, cogues, caraques, galions puis vaisseaux de ligne selon l\'époque.',
      'Sélectionne un port avec des navires : les côtes en <b>contour bleu</b> sont accessibles par la mer (même mer ou mer voisine). Chaque navire porte 2 à 5 unités.',
      'Vers une côte à toi, la flotte transporte tes troupes. Vers une côte ennemie, tu <b>débarques</b> : il faut d\'abord battre la flotte qui garde cette mer.',
      'La <b>bataille navale</b> se joue en bordées. Si tu la perds, tes troupes rentrent au port, éprouvées. Si tu la gagnes, la bataille continue à terre.',
      'Tes flottes gardent aussi tes côtes : un ennemi devra les vaincre avant de débarquer chez toi. Les navires se réparent au port.']],
    commerce: ['📦 Commerce', [
      'Chaque province produit une marchandise (🌾 blé, 🍷 vin, 🧵 soie, 🌶️ épices…), visible dans son panneau.',
      'Bouton <b>📦 Commerce</b> : signe des accords avec les royaumes en paix. Plus ils t\'apportent de produits que tu n\'as pas, plus l\'accord rapporte d\'or chaque tour.',
      'Les ⚓ ports augmentent les profits et le nombre d\'accords possibles. Un bon chancelier aide à convaincre.',
      '💎 Les produits de luxe (soie, épices, fourrures, ambre, or) calment le peuple : +2 d\'ordre public partout pour chacun.',
      'La guerre rompt l\'accord commercial avec ce royaume.']],
    quetes: ['📜 Quêtes impériales', [
      'Certains royaumes peuvent <b>restaurer un empire historique</b> : l\'Empire romain, l\'empire de Charlemagne, le grand Califat, l\'Empire perse, la Rus, l\'Empire angevin…',
      'Bouton <b>📜 Quêtes</b> : la liste des provinces à posséder. Celles que tu tiens sont cochées ✅, touche les autres pour les voir sur la carte.',
      'Quand tu les possèdes toutes à la fin d\'un tour, ton royaume prend le nom de l\'empire, gagne de l\'or et l\'ordre public monte pour toujours.',
      'Attention : les autres royaumes peuvent mener la même quête, et un empire qui renaît inquiète ses voisins.']],
    gestion: ['🏛️ Gestion du royaume', [
      'Chaque tour commence par le <b>📜 Rapport du royaume</b> : trésor, cour, nouvelles du monde et provinces à surveiller.',
      'En haut : 💰 ton or et (entre parenthèses) ton bilan par tour, revenus moins l\'entretien des armées.',
      'Chaque unité coûte de l\'or à entretenir à chaque tour. Si les caisses sont vides, des soldats désertent !',
      'Dans chaque province, choisis les <b>impôts</b> : 🪶 bas (−40 % d\'or, +15 d\'ordre), ⚖️ normal, 💰 élevé (+40 % d\'or, −20 d\'ordre).',
      'L\'<b>ordre public</b> (0 à 100) monte avec une garnison, des remparts et des impôts bas. Il baisse avec la taille du royaume et après une conquête. Sous 25 : révolte !',
      'Le bouton <b>🏛️ Royaume</b> résume toutes tes provinces : revenus, ordre public, impôts et garnisons.']],
    faq: ['💬 FAQ', null]
  };
  var FAQ = [
    ['C\'est quoi Imperium of Wars ?', 'Un jeu de stratégie historique gratuit, sur mobile et ordinateur. Tu diriges un vrai royaume sur la carte de l\'Europe et de la Méditerranée, de 771 à 1800 : tu gères tes villes, ta diplomatie, et tu commandes tes armées dans des batailles en 3D.'],
    ['C\'est gratuit ?', 'Oui, 100 % gratuit, sans achat. Le site affiche quelques publicités pour payer l\'hébergement.'],
    ['Faut-il un compte ?', 'Non. Tu peux jouer avec un simple pseudo. Si tu es connecté à ton compte du forum, ton pseudo est repris automatiquement.'],
    ['Comment gagner ?', 'Possède ' + HIST.OBJECTIF + ' provinces avant ' + HIST.FIN + '. Sinon, en ' + HIST.FIN + ', le classement des royaumes décide du vainqueur.'],
    ['Quelles époques ?', HIST.EPOQUES.map(function (e) { return e.annee + ' ' + e.titre; }).join(', ') + '. Les unités évoluent avec le temps, des chevaliers aux mousquetaires.'],
    ['Les personnages sont-ils réels ?', 'Oui : chaque royaume commence avec son vrai souverain, sa dynastie, son conjoint et ses enfants (Charlemagne, Richard Cœur de Lion, Saladin, Mehmed II, Louis XIV…). Ensuite, l\'histoire, c\'est toi qui l\'écris.'],
    ['Comment marchent les mariages ?', 'Touche 👑 Ma cour puis 💍 Arranger un mariage. Un mariage rapproche deux royaumes, et si l\'héritier d\'un royaume épouse l\'un des tiens, tu peux hériter de tout son royaume.'],
    ['C\'est quoi un mariage matrilinéaire ?', 'Quand une princesse (ou ta reine) se marie, les enfants sont normalement de la maison de leur père. En mariage matrilinéaire, le mari rejoint ta cour et les enfants restent de ta dynastie : pratique pour garder ton trône dans la famille quand tu n\'as que des filles.'],
    ['Y a-t-il des batailles navales ?', 'Oui ! Construis un port et des navires, puis débarque sur les côtes ennemies : il faut d\'abord vaincre leur flotte dans une bataille navale. Les flottes gardent aussi tes côtes.'],
    ['Comment gagner plus d\'or ?', 'Impôts, marchés, et surtout le 📦 commerce : signe des accords avec les royaumes qui produisent ce qui te manque. Nomme aussi un bon 💰 intendant au conseil.'],
    ['À quoi sert le conseil ?', 'Dans 👑 Ma cour, onglet Conseil : 5 conseillers donnent des bonus (impôts, entretien, ordre, diplomatie, espionnage). Garde tes courtisans loyaux, sinon ils complotent !'],
    ['C\'est quoi les quêtes ?', 'Selon ton royaume, tu peux restaurer un empire historique (Empire romain, Charlemagne, Califat, Rus, Reconquista…). Touche 📜 Quêtes pour voir les provinces à conquérir et la récompense.'],
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
