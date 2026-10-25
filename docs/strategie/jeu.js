/* Naufragés : Conquête — affichage et commandes (carte + batailles). */
(function () {
  'use strict';
  var M = window.Moteur, U = M.UNITES;
  var CLE = 'strategie-partie-v1';
  var etat = null, choix = null;   // choix = id de la région sélectionnée
  var $ = function (id) { return document.getElementById(id); };

  // ---------- Sauvegarde ----------
  function sauver() { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) {} }
  function charger() {
    try { var s = JSON.parse(localStorage.getItem(CLE)); return s && s.v === 1 && !s.fin ? s : null; } catch (e) { return null; }
  }

  function coul(f) { return (M.FACTIONS[f] || M.NEUTRE).coul; }
  function nomF(f) { return (M.FACTIONS[f] || M.NEUTRE).nom; }
  function montrer(id) {
    ['menu', 'campagne', 'bataille'].forEach(function (e) { $(e).classList.toggle('hide', e !== id); });
  }
  function toast(txt) {
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = txt;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function feuille(html) { $('feuille').innerHTML = html; $('voile').classList.remove('hide'); }
  function fermer() { $('voile').classList.add('hide'); }
  $('voile').addEventListener('click', function (e) { if (e.target.id === 'voile') fermer(); });

  function puceUnite(u, extra) {
    return '<span class="u ' + (extra || '') + '">' + U[u.t].ico + ' ' + U[u.t].nom +
      ' <small>' + M.hommes(u) + '</small></span>';
  }

  // ---------- Menu ----------
  function menu() {
    $('bContinuer').classList.toggle('hide', !charger());
    montrer('menu');
  }
  $('bNouvelle').onclick = function () {
    etat = M.nouvellePartie(); choix = 0; sauver(); montrer('campagne'); dessinerCarte();
    var dejaJoue = false;
    try { dejaJoue = localStorage.getItem('strategie-vu'); localStorage.setItem('strategie-vu', '1'); } catch (e) {}
    if (!dejaJoue) regles(); else toast('Tu diriges Les Naufragés 🔵. Conquiers le monde !');
  };
  $('bContinuer').onclick = function () { etat = charger(); choix = null; montrer('campagne'); dessinerCarte(); };
  $('bRegles').onclick = regles;
  $('bMenu').onclick = function () {
    feuille('<h2>Pause</h2><p>Ta campagne est sauvegardée automatiquement.</p>' +
      '<button class="btn" id="fRegles">📖 Comment jouer</button>' +
      '<button class="btn" id="fMenu">🏠 Menu principal</button>' +
      '<button class="btn rouge" id="fRecommencer">🔄 Recommencer à zéro</button>');
    $('fRegles').onclick = regles;
    $('fMenu').onclick = function () { fermer(); menu(); };
    $('fRecommencer').onclick = function () { fermer(); $('bNouvelle').onclick(); };
  };
  $('bJournal').onclick = function () {
    feuille('<h2>📜 Journal de guerre</h2><ul class="journal">' +
      etat.journal.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' +
      '<button class="btn" onclick="document.getElementById(\'voile\').classList.add(\'hide\')">Fermer</button>');
  };

  function regles() {
    feuille('<h2>📖 Comment jouer</h2><ol class="regles">' +
      '<li>Tu es <b style="color:#3b82f6">Les Naufragés</b> (en bleu). Le but : prendre <b>toutes</b> les régions des 3 autres royaumes.</li>' +
      '<li>Touche une de tes régions pour voir ton armée. <b>Recrute</b> des unités avec ton or (chaque région rapporte de l\'or à chaque tour).</li>' +
      '<li>Touche une région <b>voisine</b> (contour jaune) pour y envoyer tes troupes. Si elle est ennemie, c\'est la <b>bataille</b>.</li>' +
      '<li>En bataille, c\'est toi le commandant : touche une de tes unités, puis un ennemi pour l\'attaquer, ou le sol pour la déplacer.</li>' +
      '<li><b>Pierre-feuille-ciseaux</b> : 🔱 Lanciers battent 🐎 Cavaliers · 🐎 Cavaliers écrasent 🏹 Archers · 🏹 Archers tirent de loin · ⚔️ Épéistes solides partout.</li>' +
      '<li>Une unité qui perd trop d\'hommes <b>s\'enfuit</b>. Chaque unité ne bouge qu\'une fois par tour, puis appuie sur <b>Fin du tour</b>.</li>' +
      '</ol><button class="btn or" onclick="document.getElementById(\'voile\').classList.add(\'hide\')">C\'est parti !</button>');
  }

  // ---------- Carte ----------
  var svg = $('carte');
  svg.setAttribute('viewBox', '0 0 ' + M.LARGEUR + ' ' + M.HAUTEUR);

  function dessinerCarte() {
    var cibles = choix != null && etat.regions[choix].proprio === 0 && mobiles(choix).length ? etat.regions[choix].voisins : [];
    var h = '';
    etat.regions.forEach(function (r) {
      var cls = 'reg' + (r.id === choix ? ' sel' : '') + (cibles.indexOf(r.id) >= 0 ? ' cible' : '');
      h += '<polygon class="' + cls + '" data-id="' + r.id + '" points="' + r.poly.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') +
        '" fill="' + coul(r.proprio) + '" fill-opacity="' + (r.proprio === 0 ? 0.75 : 0.55) + '"/>';
    });
    // On redessine les bordures sélectionnées au-dessus des autres.
    etat.regions.forEach(function (r) {
      if (r.id !== choix && cibles.indexOf(r.id) < 0) return;
      h += '<polygon class="reg ' + (r.id === choix ? 'sel' : 'cible') + '" points="' + r.poly.map(function (p) { return p.join(','); }).join(' ') + '" fill="none" pointer-events="none"/>';
    });
    etat.regions.forEach(function (r) {
      var x = r.cx, y = r.cy;
      h += '<text class="nom" x="' + x + '" y="' + (y - 14) + '" text-anchor="middle">' + (r.capitale ? '👑 ' : '') + r.nom + '</text>';
      if (r.armee.length) {
        h += '<circle cx="' + x + '" cy="' + (y + 2) + '" r="11" fill="#f8fafc" stroke="' + coul(r.proprio) + '" stroke-width="3" pointer-events="none"/>' +
          '<text class="nb" x="' + x + '" y="' + (y + 6) + '" text-anchor="middle">' + r.armee.length + '</text>';
      }
      h += '<text x="' + x + '" y="' + (y + 26) + '" text-anchor="middle" font-size="9" fill="#fde68a" font-weight="700" style="paint-order:stroke;stroke:#0b1220;stroke-width:2.5px">+' + r.revenu + '</text>';
    });
    svg.innerHTML = h;
    $('tTour').textContent = etat.tour;
    $('tOr').textContent = etat.or[0];
    $('tRev').textContent = M.revenu(etat, 0);
    $('tReg').textContent = M.nbRegions(etat, 0) + '/' + etat.regions.length;
    dessinerPanneau();
  }

  function mobiles(id) {
    return etat.regions[id].armee.map(function (u, i) { return u.bouge ? -1 : i; }).filter(function (i) { return i >= 0; });
  }

  svg.addEventListener('click', function (e) {
    var p = e.target.closest('polygon[data-id]');
    if (!p) { choix = null; dessinerCarte(); return; }
    var id = +p.getAttribute('data-id');
    if (choix != null && choix !== id && etat.regions[choix].proprio === 0 &&
        etat.regions[choix].voisins.indexOf(id) >= 0 && mobiles(choix).length) {
      envoyer(choix, id);
      return;
    }
    choix = id;
    dessinerCarte();
  });

  function dessinerPanneau() {
    var p = $('panneau');
    if (choix == null) {
      p.innerHTML = '<h3>🗺️ Ta campagne</h3><div class="aide">Touche une de tes régions <b style="color:#3b82f6">bleues</b> pour voir ton armée, recruter et attaquer. ' +
        'Quand tu as fini, appuie sur <b>Fin du tour</b>.</div>';
      return;
    }
    var r = etat.regions[choix], moi = r.proprio === 0;
    var h = '<h3><span class="pastille" style="background:' + coul(r.proprio) + '"></span>' + (r.capitale ? '👑 ' : '') + r.nom + '</h3>' +
      '<div class="meta">' + nomF(r.proprio) + ' · 💰 +' + r.revenu + ' par tour · ' + r.armee.length + '/' + M.MAX_UNITES + ' unités</div>';
    h += '<div class="unites">' + (r.armee.length ? r.armee.map(function (u) { return puceUnite(u, moi && u.bouge ? 'bouge' : ''); }).join('') : '<span class="aide">Aucune armée ici.</span>') + '</div>';
    if (moi) {
      h += '<div class="actions"><button class="btn or" id="pRecruter">➕ Recruter</button></div>';
      h += '<div class="aide" style="margin-top:6px">' + (mobiles(choix).length ? 'Touche une région au contour jaune pour y envoyer tes troupes.' : 'Tes troupes ici ont déjà bougé ce tour-ci.') + '</div>';
    } else {
      var voisin = etat.regions.some(function (o) { return o.proprio === 0 && o.voisins.indexOf(r.id) >= 0; });
      h += '<div class="aide">' + (voisin ? 'Sélectionne une de tes régions voisines pour attaquer ici.' : 'Trop loin de tes terres pour attaquer.') + '</div>';
    }
    p.innerHTML = h;
    if (moi) $('pRecruter').onclick = function () { recrutement(r.id); };
  }

  // ---------- Recrutement ----------
  var DESC = {
    epee: 'Solides au corps à corps. Bons partout.',
    lance: 'Pas chers. Très forts contre la cavalerie.',
    arc: 'Tirent de loin. Fragiles au contact.',
    cav: 'Très rapides. Écrasent les archers.'
  };
  function recrutement(id) {
    var r = etat.regions[id];
    var h = '<h2>➕ Recruter à ' + r.nom + '</h2><p>💰 Tu as <b style="color:#fbbf24">' + etat.or[0] + '</b> or · ' + r.armee.length + '/' + M.MAX_UNITES + ' unités. Les recrues pourront bouger au prochain tour.</p><div class="recrues">';
    M.TYPES.forEach(function (t) {
      var ok = etat.or[0] >= U[t].cout && r.armee.length < M.MAX_UNITES;
      h += '<button class="recrue" data-t="' + t + '"' + (ok ? '' : ' disabled') + '><b>' + U[t].ico + ' ' + U[t].nom + '</b><span class="prix">💰 ' + U[t].cout + '</span><small>' + DESC[t] + '</small></button>';
    });
    h += '</div><button class="btn" id="fFermer">Terminé</button>';
    feuille(h);
    $('fFermer').onclick = fermer;
    document.querySelectorAll('.recrue').forEach(function (b) {
      b.onclick = function () {
        var err = M.recruter(etat, id, b.getAttribute('data-t'));
        if (err) { toast(err); return; }
        sauver(); dessinerCarte(); recrutement(id);
      };
    });
  }

  // ---------- Envoi de troupes / attaque ----------
  function chances(a, d) {
    var fa = M.force(a), fd = M.force(d);
    if (!fd) return { txt: 'Région sans défense : prise facile !', c: '#22c55e' };
    var k = fa / fd;
    if (k > 1.6) return { txt: '🟢 Chances : très bonnes', c: '#22c55e' };
    if (k > 1.15) return { txt: '🟡 Chances : bonnes', c: '#a3e635' };
    if (k > 0.85) return { txt: '🟠 Chances : serré, commande bien !', c: '#fbbf24' };
    return { txt: '🔴 Chances : faibles', c: '#e5484d' };
  }

  function envoyer(de, vers) {
    var a = etat.regions[de], c = etat.regions[vers];
    var dispo = mobiles(de), pris = dispo.slice();
    var ami = c.proprio === 0;
    function rendu() {
      var unites = pris.map(function (i) { return a.armee[i]; });
      var h = '<h2>' + (ami ? '🚶 Déplacer vers ' : '⚔️ Attaquer ') + c.nom + '</h2>' +
        '<p>Touche une unité pour l\'emmener ou la laisser à ' + a.nom + '.</p>' +
        '<div class="unites">' + dispo.map(function (i) {
          return '<button class="u ' + (pris.indexOf(i) >= 0 ? 'choix' : 'off') + '" data-i="' + i + '">' + U[a.armee[i].t].ico + ' ' + U[a.armee[i].t].nom + ' <small>' + M.hommes(a.armee[i]) + '</small></button>';
        }).join('') + '</div>';
      if (ami) {
        h += '<button class="btn bleu" id="fGo"' + (pris.length ? '' : ' disabled') + '>🚶 Déplacer ' + pris.length + ' unité(s)</button>';
      } else {
        var ch = chances(unites, c.armee);
        h += '<div class="duel"><div class="camp"><b style="color:#3b82f6">Toi</b>' + (unites.map(function (u) { return U[u.t].ico; }).join(' ') || '—') +
          '</div><div class="vs">VS</div><div class="camp"><b style="color:' + coul(c.proprio) + '">' + nomF(c.proprio) + '</b>' +
          (c.armee.map(function (u) { return U[u.t].ico; }).join(' ') || 'Personne') + '</div></div>' +
          '<div class="chances" style="color:' + ch.c + '">' + ch.txt + '</div>';
        if (!pris.length) h += '<button class="btn" disabled>Choisis au moins une unité</button>';
        else if (!c.armee.length) h += '<button class="btn or" id="fPrendre">🏴 Prendre la région</button>';
        else h += '<button class="btn or" id="fCommander">🎖️ Commander la bataille</button><button class="btn" id="fAuto">⚡ Résolution automatique</button>';
      }
      h += '<button class="btn" id="fAnnuler">Annuler</button>';
      feuille(h);
      document.querySelectorAll('#feuille .u[data-i]').forEach(function (b) {
        b.onclick = function () {
          var i = +b.getAttribute('data-i'), k = pris.indexOf(i);
          if (k >= 0) pris.splice(k, 1); else pris.push(i);
          rendu();
        };
      });
      $('fAnnuler').onclick = fermer;
      if ($('fGo')) $('fGo').onclick = function () {
        var err = M.deplacer(etat, de, vers, pris);
        fermer();
        if (err) toast(err);
        choix = vers; sauver(); dessinerCarte();
      };
      function attaque(mode) {
        var att = M.preparerAttaque(etat, de, vers, pris);
        fermer();
        if (att.erreur) { toast(att.erreur); return; }
        if (mode === 'prendre') { M.appliquerBataille(etat, att, null); finAction(vers); return; }
        lancerBataille(att, false, mode === 'auto', function () { finAction(vers); });
      }
      if ($('fPrendre')) $('fPrendre').onclick = function () { attaque('prendre'); };
      if ($('fCommander')) $('fCommander').onclick = function () { attaque('commander'); };
      if ($('fAuto')) $('fAuto').onclick = function () { attaque('auto'); };
    }
    rendu();
  }

  function finAction(id) {
    choix = id; sauver(); montrer('campagne'); dessinerCarte();
    if (etat.fin) finPartie();
  }

  // ---------- Fin du tour ----------
  $('bFinTour').onclick = function () {
    var avant = etat.or[0];
    var defenses = M.finDuTour(etat);
    choix = null; sauver(); dessinerCarte();
    toast('Tour ' + etat.tour + ' · 💰 +' + (etat.or[0] - avant) + ' or');
    traiterDefenses(defenses);
  };

  // Les attaques ennemies contre tes régions défendues : tu peux commander la défense.
  function traiterDefenses(liste) {
    if (etat.fin) { finPartie(); return; }
    if (!liste.length) { sauver(); dessinerCarte(); return; }
    var att = liste.shift(), c = etat.regions[att.vers];
    var suite = function () { sauver(); dessinerCarte(); traiterDefenses(liste); };
    if (c.proprio === att.camp) { c.armee = c.armee.concat(att.unites).slice(0, M.MAX_UNITES); suite(); return; }
    if (!c.armee.length) { M.appliquerBataille(etat, att, null); suite(); return; }
    if (c.proprio !== 0) {
      var b = M.creerBataille(att.unites, c.armee, Math.random() * 1e9);
      M.resoudreAuto(b); M.appliquerBataille(etat, att, b); suite(); return;
    }
    choix = c.id; dessinerCarte();
    var ch = chances(c.armee, att.unites);
    feuille('<h2>⚠️ ' + nomF(att.camp) + ' attaque ' + c.nom + ' !</h2>' +
      '<div class="duel"><div class="camp"><b style="color:#3b82f6">Toi</b>' + c.armee.map(function (u) { return U[u.t].ico; }).join(' ') +
      '</div><div class="vs">VS</div><div class="camp"><b style="color:' + coul(att.camp) + '">' + nomF(att.camp) + '</b>' +
      att.unites.map(function (u) { return U[u.t].ico; }).join(' ') + '</div></div>' +
      '<div class="chances" style="color:' + ch.c + '">' + ch.txt + '</div>' +
      '<button class="btn or" id="fDefendre">🎖️ Commander la défense</button><button class="btn" id="fAutoDef">⚡ Résolution automatique</button>');
    $('fDefendre').onclick = function () { fermer(); lancerBataille(att, true, false, function () { montrer('campagne'); suite(); }); };
    $('fAutoDef').onclick = function () { fermer(); lancerBataille(att, true, true, function () { montrer('campagne'); suite(); }); };
  }

  function finPartie() {
    var gagne = etat.fin === 'victoire', tours = etat.tour;
    try { localStorage.removeItem(CLE); } catch (e) {}
    var texte = gagne ? 'J\'ai conquis le monde en ' + tours + ' tours dans Naufragés : Conquête ⚔️ Tu fais mieux ?' :
      'Mon royaume est tombé au tour ' + tours + ' dans Naufragés : Conquête 🏰 Tu tiendras plus longtemps ?';
    feuille('<h2>' + (gagne ? '👑 Victoire totale !' : '💀 Défaite...') + '</h2><p>' +
      (gagne ? 'Tous les royaumes sont à toi, en ' + tours + ' tours. Un vrai commandant !' : 'Ton dernier territoire est tombé au tour ' + tours + '. Retente ta chance !') + '</p>' +
      '<button class="btn or" id="fPartager">📤 Partager mon score</button>' +
      '<button class="btn" id="fRejouer">🔄 Nouvelle campagne</button>');
    $('fPartager').onclick = function () {
      var url = 'https://lesnaufrages-mc.github.io/strategie/';
      if (navigator.share) navigator.share({ text: texte, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(texte + ' ' + url).then(function () { toast('Copié ! Colle-le à tes amis.'); });
    };
    $('fRejouer').onclick = function () { fermer(); $('bNouvelle').onclick(); };
  }

  // ---------- Bataille ----------
  var cv = $('champ'), ctx = cv.getContext('2d');
  var B = null, defense = false, ennemi = 1, apres = null, attaqueEnCours = null;
  var vitesse = 1, enCours = false, selection = null, echelle = 1, dernier = 0, fleches = [];

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

  function lancerBataille(att, enDefense, auto, ensuite) {
    attaqueEnCours = att; defense = enDefense; apres = ensuite;
    var cRegion = etat.regions[att.vers];
    ennemi = enDefense ? att.camp : cRegion.proprio;
    // Le joueur est toujours en bas du champ (camp 0 du simulateur).
    B = enDefense ? M.creerBataille(cRegion.armee, att.unites, Math.random() * 1e9)
                  : M.creerBataille(att.unites, cRegion.armee, Math.random() * 1e9);
    selection = null; vitesse = 1; fleches = []; enCours = false;
    B.tenir = [false, false];
    $('oVitesse').textContent = '⏩ x1';
    $('oTenir').classList.remove('actif');
    $('nomEux').textContent = nomF(ennemi);
    $('jEux').style.background = coul(ennemi);
    $('titreBataille').textContent = (enDefense ? '🛡️ Défense de ' : '⚔️ Bataille de ') + cRegion.nom;
    $('texteBataille').textContent = (enDefense ? nomF(ennemi) + ' t\'attaque. ' : '') + 'Tes troupes sont en bas, en bleu. Les lanciers et épéistes sont devant, les archers derrière, la cavalerie sur les côtés.';
    $('debutBataille').classList.remove('hide');
    $('finBataille').classList.add('hide');
    montrer('bataille');
    taille();
    dessinerBataille();
    if (auto) { finirAuto(); return; }
  }

  $('bLancer').onclick = function () {
    $('debutBataille').classList.add('hide');
    enCours = true; dernier = performance.now();
    requestAnimationFrame(boucle);
  };
  $('bAutoAvant').onclick = finirAuto;
  $('oAuto').onclick = finirAuto;
  function finirAuto() {
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
    toast(B.tenir[0] ? '🛡️ Tenez la ligne ! (les archers tirent toujours)' : 'Les troupes avancent.');
  };
  $('oVitesse').onclick = function () {
    vitesse = vitesse === 1 ? 2 : vitesse === 2 ? 3 : 1;
    $('oVitesse').textContent = '⏩ x' + vitesse;
  };

  function boucle(t) {
    if (!enCours) return;
    var dt = Math.min(0.05, (t - dernier) / 1000); dernier = t;
    for (var i = 0; i < vitesse * 2; i++) M.etape(B, dt / 2);
    dessinerBataille();
    if (B.fin) { enCours = false; setTimeout(terminer, 600); return; }
    requestAnimationFrame(boucle);
  }

  function terminer() {
    var gagne = B.fin.gagnant === 0;
    var pertes = [0, 0];
    B.esc.forEach(function (e) { pertes[e.camp] += U[e.t].hommes - Math.ceil(Math.max(0, e.hp) / U[e.t].pv); });
    // Remet le résultat dans le sens du moteur (camp 0 = attaquant).
    dessinerBataille();
    if (defense) {
      B.esc.forEach(function (e) { e.camp = 1 - e.camp; });
      B.fin.gagnant = 1 - B.fin.gagnant;
    }
    M.appliquerBataille(etat, attaqueEnCours, B);
    sauver();
    $('titreFin').textContent = gagne ? '🏆 Victoire !' : '💀 Défaite';
    $('texteFin').textContent = (gagne ? (defense ? 'Tu as tenu ' : 'Tu as pris ') : (defense ? 'Tu as perdu ' : 'Tu n\'as pas pu prendre ')) +
      etat.regions[attaqueEnCours.vers].nom + '. Pertes : ' + pertes[0] + ' de tes soldats, ' + pertes[1] + ' ennemis.';
    $('finBataille').classList.remove('hide');
  }
  $('bRetourCarte').onclick = function () { var f = apres; B = null; if (f) f(); };

  // Commandes tactiles : unité → cible.
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
    if (selection == null) { if (touche) toast('Touche d\'abord une de TES unités (en bleu).'); return; }
    var s = B.esc[selection];
    if (!M.vivant(s)) { selection = null; return; }
    if (touche) { s.ordre = { cible: touche.id }; fleches.push({ x: touche.x, y: touche.y, t: 0.6, c: '#ef4444' }); }
    else { s.ordre = { x: x, y: y }; fleches.push({ x: x, y: y, t: 0.6, c: '#fbbf24' }); }
    selection = null;
  });

  function dessinerBataille() {
    var L = M.CHAMP.l, H = M.CHAMP.h;
    // Terrain
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3f5f2a'); g.addColorStop(0.5, '#4d7232'); g.addColorStop(1, '#3f5f2a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);
    ctx.fillStyle = 'rgba(0,0,0,.06)';
    for (var k = 0; k < 40; k++) { ctx.beginPath(); ctx.arc((k * 97) % L, (k * 61) % H, 14 + (k % 5) * 4, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(L, H / 2); ctx.stroke(); ctx.setLineDash([]);

    var cs = [coul(0), coul(ennemi)];
    // Lignes d'ordres de tes unités
    B.esc.forEach(function (e) {
      if (e.camp !== 0 || !M.vivant(e)) return;
      var tx = null, ty = null;
      if (e.ordre && e.ordre.cible != null && M.vivant(B.esc[e.ordre.cible])) { tx = B.esc[e.ordre.cible].x; ty = B.esc[e.ordre.cible].y; ctx.strokeStyle = 'rgba(239,68,68,.7)'; }
      else if (e.ordre && e.ordre.x != null) { tx = e.ordre.x; ty = e.ordre.y; ctx.strokeStyle = 'rgba(251,191,36,.7)'; }
      if (tx == null) return;
      ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
    });
    // Flèches des archers
    B.esc.forEach(function (e) {
      if (e.t !== 'arc' || !M.vivant(e) || e.cible == null) return;
      var c = B.esc[e.cible];
      if (!M.vivant(c) || Math.hypot(c.x - e.x, c.y - e.y) > U.arc.portee) return;
      var p = (B.temps * 1.5 + e.id * 0.37) % 1;
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
      for (var a = 0; a < 3; a++) {
        var q = (p + a * 0.33) % 1;
        var x = e.x + (c.x - e.x) * q + (a - 1) * 4, y = e.y + (c.y - e.y) * q - Math.sin(q * Math.PI) * 18;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (c.x - e.x) * 0.04, y + (c.y - e.y) * 0.04); ctx.stroke();
      }
    });
    // Escouades : un point = un soldat
    B.esc.forEach(function (e) {
      if (e.hp <= 0 || e.sorti) return;
      var n = Math.ceil(e.hp / U[e.t].pv), cols = e.t === 'cav' ? 6 : 8, pas = e.t === 'cav' ? 4 : 3.2;
      var rangs = Math.ceil(n / cols), w = (cols - 1) * pas, h = (rangs - 1) * pas;
      ctx.globalAlpha = e.fuite ? 0.45 : 1;
      if (selection === e.id) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, 22, 0, 7); ctx.stroke();
      }
      ctx.fillStyle = cs[e.camp];
      for (var i = 0; i < n; i++) {
        var cx = e.x - w / 2 + (i % cols) * pas + Math.sin(B.temps * 6 + i) * 0.3;
        var cy = e.y - h / 2 + Math.floor(i / cols) * pas;
        ctx.fillRect(cx - 1.2, cy - 1.2, e.t === 'cav' ? 3 : 2.4, e.t === 'cav' ? 3 : 2.4);
      }
      ctx.font = '13px system-ui,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(e.fuite ? '🏳️' : U[e.t].ico, e.x, e.y - h / 2 - 6);
      // barre de vie
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - 12, e.y + h / 2 + 4, 24, 3);
      ctx.fillStyle = e.hp / e.hpMax > 0.5 ? '#22c55e' : e.hp / e.hpMax > 0.25 ? '#fbbf24' : '#ef4444';
      ctx.fillRect(e.x - 12, e.y + h / 2 + 4, 24 * e.hp / e.hpMax, 3);
      ctx.globalAlpha = 1;
    });
    // Marqueurs d'ordre qui s'effacent
    fleches = fleches.filter(function (f) { f.t -= 0.016; return f.t > 0; });
    fleches.forEach(function (f) {
      ctx.strokeStyle = f.c; ctx.globalAlpha = f.t / 0.6; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, 10 + (0.6 - f.t) * 20, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    });
    // Jauges de force
    var f = [0, 0];
    B.esc.forEach(function (e) { if (M.vivant(e)) f[e.camp] += U[e.t].cout * e.hp / e.hpMax; });
    var tot = f[0] + f[1] || 1;
    $('jMoi').style.width = (f[0] / tot * 100) + '%';
    $('jEux').style.width = (f[1] / tot * 100) + '%';
    $('conseil').textContent = selection != null ? 'Maintenant touche un ennemi pour l\'attaquer, ou le sol pour y aller.' :
      'Touche une de tes unités (en bleu) pour lui donner un ordre.';
  }

  menu();
})();
