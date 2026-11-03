/* Ferrum et Fides : la campagne (carte, voyages, villes, dialogues, troupes, sauvegarde).
   Sauvegarde dans le navigateur : clé « ferrum-partie-v1 » (copiée en ligne par ../sauvegarde.js si tu es connecté). */
(function () {
  'use strict';
  var M = Moteur;
  var CLE = 'ferrum-partie-v1';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  // ---------- État et sauvegarde ----------
  var S = null; // la partie en cours
  var OPT = { diff: 'facile', dir: false, son: true };
  function lire() {
    try { var d = JSON.parse(localStorage.getItem(CLE)); if (d && d.v === 1) return d; } catch (e) {}
    return null;
  }
  function sauver() {
    if (!S || S.rapide) return;
    S.options = OPT;
    try { localStorage.setItem(CLE, JSON.stringify(S)); } catch (e) {}
  }
  function lireOptions() {
    var d = lire();
    if (d && d.options) OPT = Object.assign(OPT, d.options);
    M.muet(!OPT.son);
  }
  function nouvellePartie(faction, heros) {
    S = {
      v: 1, faction: faction, heros: heros, lieu: faction === 'latins' ? 'bouillon' : 'constantinople',
      jour: 0, debut: faction === 'latins' ? [1096, 7, 15] : [1096, 11, 1],
      or: 60, renom: 0, troupes: faction === 'latins' ? { sergent: 2, milicien: 2 } : { skutatos: 2, toxotes: 1 },
      armes: faction === 'latins' ? ['epee'] : ['spathion'], equip: faction === 'latins' ? ['epee'] : ['spathion'],
      etape: 0, drapeaux: {}, aff: { melisende: 0, zoe: 0 }, compagnons: [], discussions: {}, legendes: {}, intrigues: {},
      opinion: {}, fav: { latins: faction === 'latins' ? 2 : 0, romains: faction === 'romains' ? 2 : 0 }, fini: false,
      stats: { victoires: 0, tues: 0 }, vus: {}
    };
    S.drapeaux[faction] = true;
    completer(S);
    sauver();
  }
  // Champs ajoutés avec l'économie et les villages (les anciennes sauvegardes les reçoivent aussi)
  function completer(s) {
    if (!s) return s;
    s.banque = s.banque || { solde: 0, maj: s.jour || 0, pret: 0, echeance: 0, retard: 0 };
    s.inv = s.inv || {}; s.marche = s.marche || {}; s.villages = s.villages || {}; s.xp = s.xp || {}; s.tournois = s.tournois || {};
    s.prisonniers = s.prisonniers || {}; s.rel = s.rel || {}; s.courriers = s.courriers || []; s.paix = s.paix || {}; s.garnison = s.garnison || {};
    s.nouvelles = s.nouvelles || []; s.fiefNiv = s.fiefNiv || 0; if (s.fief === undefined) { s.fief = null; s.suzerain = null; s.fiefMaj = 0; }
    return s;
  }

  // Progression
  function niveau() { return 1 + Math.floor((S.renom || 0) / 25); }
  function pvMax() { return 100 + (niveau() - 1) * 10; }
  function placeTroupes() { return Math.min(30, 6 + niveau() * 2); }
  function nbTroupes() { var n = 0; for (var k in S.troupes) n += S.troupes[k]; return n; }
  function etapeActuelle() { return FF.HISTOIRE[S.faction][S.etape] || null; }
  function lookHeros() {
    return S.faction === 'latins'
      ? { peau: 0xf1c27d, tunique: 0xf8f9f9, croix: 0xc0392b, pantalon: 0x5d6d7e, casque: 'nasal', bouclier: 'kite', bc: 0xc0392b, cape: 0x922b21 }
      : { peau: 0xe0ac69, tunique: 0x7d3c98, croix: 0xf1c40f, pantalon: 0x1b2631, casque: 'rond', bouclier: 'rond', bc: 0x7d3c98, cape: 0x4a235a };
  }
  function dateTexte(j) {
    var d = new Date(Date.UTC(S.debut[0], S.debut[1], S.debut[2]) + (j == null ? S.jour : j) * 86400000);
    return d.getUTCDate() + ' ' + MOIS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }
  function drapeau(f) { return !!(S && (S.drapeaux[f] || f === S.faction)); }
  function appliquer(e) {
    if (!e) return;
    if (e.aff) for (var k in e.aff) { S.aff[k] = Math.max(0, (S.aff[k] || 0) + e.aff[k]); if (e.aff[k] > 0) petitMsg('❤️ ' + FF.PERSOS[k].nom + ' apprécie cela.'); }
    if (e.fav) for (var f in e.fav) S.fav[f] = (S.fav[f] || 0) + e.fav[f];
    if (e.drapeau) S.drapeaux[e.drapeau] = true;
    if (e.or) { S.or = Math.max(0, S.or + e.or); petitMsg((e.or > 0 ? '+' : '') + e.or + ' or'); }
    if (e.renom) S.renom += e.renom;
    sauver();
  }
  function txt(t) { return esc(t).replace(/\{heros\}/g, esc(S ? S.heros : '')); }

  // ---------- Écrans ----------
  var ECRANS = ['accueil', 'creation', 'carte', 'jeu3d'];
  function ecran(nom) {
    ECRANS.forEach(function (e) { $(e).classList.toggle('hide', e !== nom); });
    document.body.dataset.ecran = nom;
    if (nom === 'carte') { redim(); dessinerCarte(); majBarre(); }
  }
  var msgT = 0;
  function petitMsg(t) {
    var m = $('toast'); m.textContent = t; m.classList.add('montre');
    clearTimeout(msgT); msgT = setTimeout(function () { m.classList.remove('montre'); }, 2600);
  }

  // Fenêtre générique (forge, recrues, cour, journal…)
  function fenetre(titre, html, fermer) {
    $('fenTitre').textContent = titre;
    $('fenCorps').innerHTML = html;
    $('fenetre').classList.remove('hide');
    $('fenetre').onFerme = fermer || null;
    $('fenCorps').scrollTop = 0;
  }
  function fermerFenetre() {
    $('fenetre').classList.add('hide');
    var f = $('fenetre').onFerme; $('fenetre').onFerme = null;
    if (f) f();
  }
  $('fenFermer').onclick = fermerFenetre;

  // ---------- Portraits en blocs ----------
  function hex(c) { return '#' + ('000000' + (c >>> 0).toString(16)).slice(-6); }
  function portrait(id) {
    var P = FF.PERSOS[id] || {}, L = P.look;
    if (id === 'heros' && S) L = Object.assign({}, L, S.faction === 'romains' ? { peau: 0xe0ac69, cheveux: 0x1c1c1c, casque: 0xb7950b } : { casque: 0x95a5a6 });
    var c = document.createElement('canvas'); c.width = c.height = 96;
    var g = c.getContext('2d');
    g.fillStyle = '#1e1a14'; g.fillRect(0, 0, 96, 96);
    if (!L) { g.fillStyle = '#c9a24a'; g.font = '48px serif'; g.textAlign = 'center'; g.fillText('✠', 48, 64); return c; }
    var r = function (x, y, w, h, col) { g.fillStyle = hex(col); g.fillRect(x, y, w, h); };
    if (L.longs) r(16, 22, 64, 66, L.cheveux);
    r(14, 80, 68, 16, 0x5d4037);
    r(22, 22, 52, 56, L.peau);
    if (L.cheveux && !L.casque && !L.turban && !L.capuche) r(20, 16, 56, 14, L.cheveux);
    if (L.capuche) { r(16, 10, 64, 22, L.capuche); r(14, 22, 10, 50, L.capuche); r(72, 22, 10, 50, L.capuche); }
    if (L.casque) { r(18, 10, 60, 24, L.casque); if (L.nezOr) r(44, 34, 8, 16, 0xd4ac0d); else r(45, 30, 6, 20, L.casque); }
    if (L.turban) { r(16, 8, 64, 24, L.turban); r(30, 2, 36, 10, L.turban); }
    if (L.couronne) { r(20, 10, 56, 12, L.couronne); r(22, 4, 8, 8, L.couronne); r(44, 2, 8, 10, L.couronne); r(66, 4, 8, 8, L.couronne); }
    if (L.mitre) { r(28, 0, 40, 24, L.mitre); r(46, 2, 4, 20, 0xd4ac0d); }
    if (L.chapeau) { r(20, 8, 56, 16, L.chapeau); }
    r(33, 44, 9, 7, L.yeux || 0x1c1c1c); r(54, 44, 9, 7, L.yeux || 0x1c1c1c);
    if (L.barbe) r(24, 60, 48, 18, L.barbe); else r(40, 64, 16, 4, 0x8d5524);
    if (L.cicatrice) r(56, 34, 4, 26, 0x922b21);
    if (L.bijou) r(30, 84, 36, 6, L.bijou);
    return c;
  }

  // ---------- Dialogues ----------
  var D = { file: [], fin: null, ligne: null, ecrit: 0, txt: '' };
  function dialogue(lignes, fin) {
    D.file = lignes.slice();
    D.fin = fin;
    $('dialogue').classList.remove('hide');
    M.pause(true);
    suivante();
  }
  function suivante() {
    $('dlgChoix').innerHTML = '';
    if (!D.file.length) {
      $('dialogue').classList.add('hide');
      var f = D.fin; D.fin = null;
      if (f) f(); else M.pause(false);
      return;
    }
    var l = D.file.shift();
    if (l.si) { D.file = (drapeau(l.si) ? (l.alors || []) : (l.sinon || [])).concat(D.file); suivante(); return; }
    if (l.choix) {
      var bloc = $('dlgChoix');
      $('dlgSuite').classList.add('hide');
      l.choix.forEach(function (c) {
        var b = document.createElement('button');
        b.className = 'choix';
        b.innerHTML = txt(c.t);
        b.onclick = function () {
          M.son('clic');
          appliquer(c.e);
          if (c.combat) {
            $('dialogue').classList.add('hide');
            var reste = D.file, fin = D.fin; D.fin = null;
            combat(c.combat, function () { dialogue(reste, fin); }, { retourCarte: false });
          } else suivante();
        };
        bloc.appendChild(b);
      });
      return;
    }
    var P = FF.PERSOS[l.q] || { nom: l.q };
    $('dlgNom').textContent = l.q === 'narrateur' ? '' : (l.q === 'heros' ? S.heros : P.nom);
    var por = $('dlgPortrait'); por.innerHTML = ''; por.appendChild(portrait(l.q));
    $('dialogue').classList.toggle('narration', l.q === 'narrateur');
    D.txt = l.t.replace(/\{heros\}/g, S ? S.heros : '');
    D.ecrit = 0;
    $('dlgSuite').classList.remove('hide');
    ecrire();
  }
  function ecrire() {
    clearTimeout(D.tmr);
    D.ecrit = Math.min(D.txt.length, D.ecrit + 2);
    $('dlgTexte').textContent = D.txt.slice(0, D.ecrit);
    if (D.ecrit < D.txt.length) D.tmr = setTimeout(ecrire, 16);
  }
  function avancer() {
    if ($('dialogue').classList.contains('hide') || $('dlgChoix').children.length) return;
    if (D.ecrit < D.txt.length) { D.ecrit = D.txt.length; $('dlgTexte').textContent = D.txt; clearTimeout(D.tmr); return; }
    suivante();
  }
  $('dialogue').addEventListener('click', function (e) { if (!e.target.closest('.choix')) avancer(); });
  document.addEventListener('keydown', function (e) {
    if ($('dialogue').classList.contains('hide')) return;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); avancer(); }
  });

  // ---------- Carte de campagne ----------
  var cv = $('carteCanvas'), ctx = cv.getContext('2d');
  var VUE = { x: 0, y: 0, z: 1 };
  var terre = null;
  var voyage = null; // animation du déplacement
  function redim() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!VUE.ok && S) centrerSur(S.lieu, 1.6); else borner();
  }
  function centrerSur(id, z) {
    var L = FF.LIEUX[id];
    VUE.z = z || VUE.z;
    VUE.x = L.x - cv.clientWidth / 2 / VUE.z;
    VUE.y = L.y - cv.clientHeight / 2 / VUE.z;
    VUE.ok = true;
    borner();
  }
  // Garder la vue sur la carte (sinon on voit le bord du monde dessiné)
  function borner() {
    if (!window.MONDE) return;
    var W = MONDE.largeur, H = MONDE.hauteur, cw = cv.clientWidth, ch = cv.clientHeight;
    var zmin = Math.max(0.6, cw / W, ch / H);
    if (VUE.z < zmin) {
      var mx = VUE.x + cw / 2 / VUE.z, my = VUE.y + ch / 2 / VUE.z;
      VUE.z = zmin; VUE.x = mx - cw / 2 / VUE.z; VUE.y = my - ch / 2 / VUE.z;
    }
    VUE.x = Math.max(0, Math.min(W - cw / VUE.z, VUE.x));
    VUE.y = Math.max(0, Math.min(H - ch / VUE.z, VUE.y));
  }
  function ecranVers(x, y) { return { x: x / VUE.z + VUE.x, y: y / VUE.z + VUE.y }; }
  function posJoueur() {
    if (voyage) {
      var a = FF.LIEUX[voyage.de], b = FF.LIEUX[voyage.vers], k = Math.min(1, voyage.t);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    return FF.LIEUX[S.lieu];
  }
  function objectifLieu() { var e = etapeActuelle(); return e ? e.lieu : null; }
  // Noms des lieux sans chevauchement : on essaie au-dessus, dessous, à droite puis à gauche du point ;
  // si rien ne tient, le nom attend qu'on zoome (le lieu actuel et l'objectif sont toujours écrits)
  function dessinerNoms(obj) {
    var fs = 11 / VUE.z * Math.min(1.6, Math.max(1, VUE.z * 0.7));
    ctx.font = '700 ' + fs + 'px Cinzel, Georgia, serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    var pris = [], m = 2 / VUE.z;
    // Les boîtes des points comptent aussi, pour qu'un nom ne cache pas une ville voisine
    Object.keys(FF.LIEUX).forEach(function (id) { var L = FF.LIEUX[id], r = 4.5 / Math.sqrt(VUE.z) * 1.4; pris.push([L.x - r, L.y - r, L.x + r, L.y + r, id]); });
    var ids = Object.keys(FF.LIEUX).sort(function (a, b) { return prio(b) - prio(a); });
    function prio(id) { return id === S.lieu ? 3 : id === obj ? 2 : 0; }
    function libre(b, id) { return pris.every(function (p) { return p[4] === id || b[2] + m < p[0] || b[0] - m > p[2] || b[3] + m < p[1] || b[1] - m > p[3]; }); }
    ids.forEach(function (id) {
      var L = FF.LIEUX[id];
      if (L.village && VUE.z < 1.9 && !prio(id)) return;
      ctx.font = (L.village ? 'italic 600 ' + fs * 0.85 : '700 ' + fs) + 'px Cinzel, Georgia, serif';
      var r = 4.5 / Math.sqrt(VUE.z) * 1.4, tw = ctx.measureText(L.nom).width, hh = fs * 0.8;
      var cands = [
        [L.x - tw / 2, L.y - r - 3 / VUE.z],          // au-dessus
        [L.x - tw / 2, L.y + r + hh + 2 / VUE.z],     // dessous
        [L.x + r + 3 / VUE.z, L.y + hh / 2],          // à droite
        [L.x - r - 3 / VUE.z - tw, L.y + hh / 2]      // à gauche
      ];
      var choix = null;
      // Sous la bannière du joueur, le nom du lieu actuel passe dessous
      if (id === S.lieu && !voyage) cands.push(cands.shift());
      for (var i = 0; i < cands.length; i++) {
        var c = cands[i], bx = [c[0], c[1] - hh, c[0] + tw, c[1] + fs * 0.15];
        if (libre(bx, id)) { choix = c; pris.push(bx.concat(id)); break; }
      }
      if (!choix) { if (!prio(id)) return; choix = cands[0]; }
      ctx.lineWidth = 3 / VUE.z; ctx.strokeStyle = 'rgba(20,16,10,.85)'; ctx.strokeText(L.nom, choix[0], choix[1]);
      ctx.fillStyle = id === S.lieu ? '#f7dc6f' : '#f4ecd8'; ctx.fillText(L.nom, choix[0], choix[1]);
    });
    // Noms des royaumes en grandes lettres pâles, là où il reste de la place
    if (VUE.z < 2.6) {
      var fr = 12 / VUE.z * Math.min(1.5, Math.max(1, VUE.z * 0.8));
      ctx.font = 'italic 700 ' + fr + 'px Cinzel, Georgia, serif';
      ctx.fillStyle = 'rgba(74,59,34,' + Math.min(0.55, (2.6 - VUE.z) * 0.6) + ')';
      ROYAUMES_CARTE().forEach(function (k) {
        var tw = ctx.measureText(k.nom).width, pas = 16 / VUE.z;
        var essais = [[0, 0], [0, -pas], [0, pas], [0, -2 * pas], [0, 2 * pas], [-2 * pas, 0], [2 * pas, 0]];
        for (var i = 0; i < essais.length; i++) {
          var x = k.x + essais[i][0] - tw / 2, y = k.y + essais[i][1];
          var bx = [x, y - fr * 0.8, x + tw, y + fr * 0.2];
          if (libre(bx, '§' + k.nom)) { pris.push(bx.concat('§' + k.nom)); ctx.fillText(k.nom, x, y); break; }
        }
      });
    }
    ctx.textAlign = 'center';
  }
  // Centre de chaque royaume (moyenne de ses lieux), pour écrire son nom sur la carte
  var _royCarte = null;
  function ROYAUMES_CARTE() {
    if (_royCarte) return _royCarte;
    var acc = {};
    Object.keys(FF.LIEUX).forEach(function (id) {
      var L = FF.LIEUX[id], F = FF.FACTIONS[L.faction];
      if (!F || L.faction === 'legende') return;
      var a = acc[L.faction] || (acc[L.faction] = { x: 0, y: 0, n: 0 });
      a.x += L.x; a.y += L.y; a.n++;
    });
    var NOMS = { romains: 'EMPIRE ROMAIN', seldjoukides: 'SULTANAT DE ROUM', emirs: 'ÉMIRATS', fatimides: 'CALIFAT FATIMIDE', abbassides: 'CALIFAT ABBASSIDE', armeniens: 'ARMÉNIENS',
      hongrie: 'HONGRIE', venise: '', genes: '', cid: '', irlande: 'IRLANDE', france: 'FRANCE', empire: 'SAINT-EMPIRE', flandre: '', normandie: '', toulouse: 'TOULOUSE',
      angleterre: 'ANGLETERRE', ecosse: 'ÉCOSSE', castille: 'CASTILLE', barcelone: '', almoravides: 'ALMORAVIDES', saragosse: 'SARAGOSSE', papaute: '', normands: 'NORMANDS',
      sicile: 'SICILE', croatie: 'CROATIE', boheme: 'BOHÊME', pologne: 'POLOGNE', rus: 'RUS DE KIEV', danemark: 'DANEMARK', norvege: 'NORVÈGE', suede: 'SUÈDE' };
    var DEC = { romains: [0, 34], empire: [10, -16], rus: [-10, 30], france: [-8, 22], emirs: [30, 0], fatimides: [-30, 40] };
    _royCarte = Object.keys(acc).filter(function (k) { return NOMS[k]; }).map(function (k) {
      var a = acc[k], d = DEC[k] || [0, 18];
      return { nom: NOMS[k], x: a.x / a.n + d[0], y: a.y / a.n + d[1] };
    });
    return _royCarte;
  }
  function dessinerCarte() {
    if (!S || $('carte').classList.contains('hide')) return;
    var w = cv.clientWidth, h = cv.clientHeight;
    ctx.save();
    var gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2c5470'); gr.addColorStop(1, '#1d3c55');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    ctx.translate(-VUE.x * VUE.z, -VUE.y * VUE.z); ctx.scale(VUE.z, VUE.z);
    if (!terre && window.MONDE) terre = new Path2D(window.MONDE.terre);
    if (terre) {
      ctx.fillStyle = '#d8c8a0'; ctx.fill(terre);
      ctx.strokeStyle = '#7a6a48'; ctx.lineWidth = 1.2 / VUE.z; ctx.stroke(terre);
    }
    // Routes
    FF.ROUTES.forEach(function (r) {
      var a = FF.LIEUX[r[0]], b = FF.LIEUX[r[1]];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      if (r[2] === 'mer') { ctx.strokeStyle = 'rgba(214,234,248,.65)'; ctx.setLineDash([2 / VUE.z * 2, 4 / VUE.z * 2]); ctx.lineWidth = 1.6 / VUE.z; }
      else { ctx.strokeStyle = 'rgba(110,75,42,.75)'; ctx.setLineDash([6 / VUE.z, 3 / VUE.z]); ctx.lineWidth = 2 / VUE.z; }
      ctx.stroke();
    });
    ctx.setLineDash([]);
    var obj = objectifLieu(), t = performance.now() / 1000;
    // Lieux
    Object.keys(FF.LIEUX).forEach(function (id) {
      var L = FF.LIEUX[id], F = FF.FACTIONS[L.faction];
      if (L.village) {
        // Village : petite maison au toit de chaume
        var rv = 3.2 / Math.sqrt(VUE.z) * 1.4;
        ctx.fillStyle = F.couleur; ctx.strokeStyle = '#1b1610'; ctx.lineWidth = 1.2 / VUE.z;
        ctx.fillRect(L.x - rv * 0.8, L.y - rv * 0.4, rv * 1.6, rv * 1.2); ctx.strokeRect(L.x - rv * 0.8, L.y - rv * 0.4, rv * 1.6, rv * 1.2);
        ctx.beginPath(); ctx.moveTo(L.x - rv * 1.1, L.y - rv * 0.4); ctx.lineTo(L.x, L.y - rv * 1.4); ctx.lineTo(L.x + rv * 1.1, L.y - rv * 0.4); ctx.closePath();
        ctx.fillStyle = '#c8a24a'; ctx.fill(); ctx.stroke();
        if (id === obj) { ctx.save(); ctx.translate(L.x, L.y - rv * 3); ctx.fillStyle = '#f7dc6f'; ctx.strokeStyle = '#7d6608'; ctx.lineWidth = 1 / VUE.z; etoile(ctx, 0, 0, 5, rv * 1.3, rv * 0.55); ctx.fill(); ctx.stroke(); ctx.restore(); }
        return;
      }
      var r = (L.faction === 'legende' ? 5 : 4.5) / Math.sqrt(VUE.z) * 1.4;
      if (L.faction === 'legende' || FF.LEGENDES[id]) {
        if (!S.legendes[id] && S.etape >= 1) { ctx.fillStyle = 'rgba(241,196,15,' + (0.25 + 0.2 * Math.sin(t * 3)) + ')'; ctx.beginPath(); ctx.arc(L.x, L.y, r * 2.2, 0, 7); ctx.fill(); }
      }
      ctx.beginPath(); ctx.arc(L.x, L.y, r, 0, 7);
      ctx.fillStyle = F.couleur; ctx.fill();
      ctx.lineWidth = 1.5 / VUE.z; ctx.strokeStyle = '#1b1610'; ctx.stroke();
      if (L.port) { ctx.fillStyle = '#d6eaf8'; ctx.font = (7 / Math.sqrt(VUE.z) * 1.4) + 'px sans-serif'; ctx.fillText('⚓', L.x + r * 0.6, L.y + r * 1.9); }
      if (id === obj) {
        ctx.save(); ctx.translate(L.x, L.y - r * 2.6 - Math.sin(t * 4) * 2 / VUE.z);
        ctx.fillStyle = '#f7dc6f'; ctx.strokeStyle = '#7d6608'; ctx.lineWidth = 1 / VUE.z;
        etoile(ctx, 0, 0, 5, r * 1.3, r * 0.55); ctx.fill(); ctx.stroke(); ctx.restore();
      }
    });
    dessinerNoms(obj);
    // Le joueur : une bannière
    var p = posJoueur(), s = 1 / Math.sqrt(VUE.z) * 1.5;
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#3e2723'; ctx.fillRect(-0.8 * s, -16 * s, 1.6 * s, 16 * s);
    ctx.fillStyle = S.faction === 'latins' ? '#f8f9f9' : '#7d3c98'; ctx.fillRect(0.8 * s, -16 * s, 9 * s, 7 * s);
    ctx.fillStyle = S.faction === 'latins' ? '#c0392b' : '#f1c40f';
    ctx.fillRect(4.2 * s, -15.5 * s, 1.6 * s, 6 * s); ctx.fillRect(1.6 * s, -13.3 * s, 7 * s, 1.6 * s);
    ctx.restore();
    ctx.restore();
  }
  function etoile(c, x, y, n, R, r) {
    c.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = i * Math.PI / n - Math.PI / 2, rr = i % 2 ? r : R; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
  }
  function boucleCarte() {
    requestAnimationFrame(boucleCarte);
    if (!S || $('carte').classList.contains('hide')) return;
    if (voyage) {
      voyage.t += 1 / 60 / voyage.duree;
      if (voyage.t >= 1) { var v = voyage; voyage = null; arriveeEtape(v); }
    }
    dessinerCarte();
  }
  requestAnimationFrame(boucleCarte);

  // Glisser / zoomer la carte
  (function () {
    var drag = null, pinch = null, bouge = false;
    cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, vx: VUE.x, vy: VUE.y }; bouge = false; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', function (e) {
      if (!drag || pinch) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) bouge = true;
      VUE.x = drag.vx - dx / VUE.z; VUE.y = drag.vy - dy / VUE.z; borner();
    });
    cv.addEventListener('pointerup', function (e) {
      if (drag && !bouge) clicCarte(e.clientX - cv.getBoundingClientRect().left, e.clientY - cv.getBoundingClientRect().top);
      drag = null;
    });
    cv.addEventListener('wheel', function (e) { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.offsetX, e.offsetY); }, { passive: false });
    cv.addEventListener('touchstart', function (e) { if (e.touches.length === 2) { pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); drag = null; } }, { passive: true });
    cv.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinch) {
        var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        var r = cv.getBoundingClientRect();
        zoom(d / pinch, (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left, (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top);
        pinch = d;
      }
    }, { passive: true });
    cv.addEventListener('touchend', function () { pinch = null; });
    $('zoomPlus').onclick = function () { zoom(1.3, cv.clientWidth / 2, cv.clientHeight / 2); };
    $('zoomMoins').onclick = function () { zoom(1 / 1.3, cv.clientWidth / 2, cv.clientHeight / 2); };
    $('recentrer').onclick = function () { centrerSur(S.lieu, VUE.z); };
  })();
  function zoom(f, sx, sy) {
    var p = ecranVers(sx, sy);
    VUE.z = Math.max(0.6, Math.min(6, VUE.z * f));
    VUE.x = p.x - sx / VUE.z; VUE.y = p.y - sy / VUE.z;
    borner();
  }
  function clicCarte(sx, sy) {
    if (voyage) return;
    var p = ecranVers(sx, sy), best = null, bd = 18 / VUE.z;
    Object.keys(FF.LIEUX).forEach(function (id) { var L = FF.LIEUX[id], d = Math.hypot(L.x - p.x, L.y - p.y); if (d < bd) { bd = d; best = id; } });
    if (best) choisirLieu(best);
  }

  // Panneau d'un lieu
  function choisirLieu(id) {
    var L = FF.LIEUX[id], F = FF.FACTIONS[L.faction], R = FF.RELIGIONS[L.religion];
    var ici = id === S.lieu;
    var chemin = ici ? [] : trajet(S.lieu, id);
    var jours = chemin.reduce(function (s, e) { return s + e.jours; }, 0);
    var h = '<div class="lieuTete"><span class="pastille" style="background:' + F.couleur + '"></span><div><b>' + (L.village ? '🌾 ' : '') + esc(L.nom) + '</b><small>' + (L.village ? 'Village · ' : '') + esc(F.nom) + ' · ' + esc(R.nom) + '</small></div></div>';
    if (F.souverain) h += '<p class="muted">👑 ' + esc(F.souverain) + (!/^(latins|romains|legende)$/.test(L.faction) ? ' · 🤝 relation ' + relation(L.faction) : '') + '</p>';
    if (S.guerres) { var gl = enGuerre(L.faction); if (gl.length) h += '<p class="rouge">⚔️ En guerre contre ' + esc(gl.map(function (x) { return FF.FACTIONS[x].nom; }).join(', ')) + '</p>'; }
    if (S.fief === id) h += '<p class="objectif">🏰 Ton fief · ' + revenuFief() + ' or par semaine · défense ' + defenseFief() + '</p>';
    h += '<p>' + esc(L.desc) + '</p>';
    h += '<p class="muted">' + (R.icone || '') + ' ' + esc(R.nom) + (L.minorites ? ' · Aussi : ' + L.minorites.map(function (r) { return (FF.RELIGIONS[r].icone || '') + ' ' + esc(FF.RELIGIONS[r].nom.split(' (')[0].toLowerCase()); }).join(', ') : '') + '</p>';
    var C = FF.COMMERCE[id];
    if (C && (S.vus[id] || ici)) h += '<p class="muted">🛒 ' + (C[0] ? 'Produit : ' + C[0].split(' ').map(function (g) { return FF.MARCH[g].icone + ' ' + FF.MARCH[g].nom.toLowerCase(); }).join(', ') : '') + (C[1] ? ' · Recherche : ' + C[1].split(' ').map(function (g) { return FF.MARCH[g].icone + ' ' + FF.MARCH[g].nom.toLowerCase(); }).join(', ') : '') + '</p>';
    if (L.village && S.villages[id]) h += '<p class="muted">🤝 Entente avec le village : ' + S.villages[id].rel + '</p>';
    if (id === objectifLieu()) h += '<p class="objectif">⭐ ' + esc(etapeActuelle().objectif) + '</p>';
    if (FF.LEGENDES[id] && !S.legendes[id]) h += '<p class="legende">✦ Lieu de légende : ' + esc(FF.LEGENDES[id].titre) + '</p>';
    var bt = '';
    if (ici && S.fief === id) bt += '<button class="btn or" data-act="fief">🏰 Gérer mon fief</button>';
    if (ici) bt += '<button class="btn or" data-act="entrer">' + (estCamp(id) ? '⛺ Aller au camp' : L.village ? '🌾 Entrer dans le village' : '🏰 Entrer dans la ville') + '</button>';
    else if (chemin.length) bt += '<button class="btn or" data-act="aller">🐎 Voyager (' + jours + ' jours' + (chemin.some(function (e) { return e.type === 'mer'; }) ? ', traversée en mer' : '') + ')</button>';
    else bt += '<p class="muted">Aucune route connue.</p>';
    $('panneauLieu').innerHTML = h + bt;
    $('panneauLieu').classList.remove('hide');
    Array.prototype.forEach.call($('panneauLieu').querySelectorAll('[data-act]'), function (b) {
      b.onclick = function () {
        if (b.dataset.act === 'fief') return fief(function () { choisirLieu(id); });
        $('panneauLieu').classList.add('hide');
        if (b.dataset.act === 'entrer') entrerLieu(id);
        else partir(chemin);
      };
    });
  }
  // Plus court chemin (en jours) entre deux lieux
  function joursRoute(a, b, type) { var A = FF.LIEUX[a], B = FF.LIEUX[b]; return Math.max(2, Math.round(Math.hypot(A.x - B.x, A.y - B.y) / (type === 'mer' ? 14 : 8))); }
  function trajet(de, vers) {
    var dist = {}, prec = {}, file = [de]; dist[de] = 0;
    while (file.length) {
      file.sort(function (a, b) { return dist[a] - dist[b]; });
      var u = file.shift();
      if (u === vers) break;
      FF.LIEUX[u].voisins.forEach(function (v) {
        var d = dist[u] + joursRoute(u, v.id, v.type);
        if (dist[v.id] == null || d < dist[v.id]) { dist[v.id] = d; prec[v.id] = { de: u, type: v.type }; if (file.indexOf(v.id) < 0) file.push(v.id); }
      });
    }
    if (dist[vers] == null) return [];
    var ch = [], c = vers;
    while (c !== de) { var p = prec[c]; ch.unshift({ de: p.de, vers: c, type: p.type, jours: joursRoute(p.de, c, p.type) }); c = p.de; }
    return ch;
  }
  function partir(chemin) {
    if (!chemin.length) return;
    var e = chemin.shift();
    voyage = { de: e.de, vers: e.vers, type: e.type, jours: e.jours, t: 0, duree: Math.min(1.4, 0.3 + e.jours * 0.06), reste: chemin };
  }
  function arriveeEtape(v) {
    S.lieu = v.vers; S.jour += v.jours;
    majMonde(v.jours);
    sauver();
    majBarre();
    // Rencontre en route ?
    var L = FF.LIEUX[v.vers];
    var chance = v.type === 'mer' ? 0.22 : 0.2;
    if (S.etape >= 1 && Math.random() < chance && !S.fini) {
      var reg = v.type === 'mer' ? 'mer' : L.region;
      rencontre(FF.RENCONTRES[reg] || FF.RENCONTRES.occident, function () {
        if (v.reste.length) partir(v.reste); else arrivee(v.vers);
      });
      return;
    }
    if (v.reste.length) partir(v.reste); else arrivee(v.vers);
  }
  function arrivee(id) {
    centrerSur(id, VUE.z);
    if (id === objectifLieu()) petitMsg('⭐ Ta mission est ici : entre dans ' + (estCamp(id) ? 'le camp' : 'la ville') + '.');
    choisirLieu(id);
  }
  function rencontre(R, suite) {
    var payer = Math.max(20, Math.round(S.or * 0.25));
    var h = '<p class="grand">⚔️ ' + esc(R.nom) + ' vous barrent la route !</p>' +
      '<button class="btn or" data-r="combat">Combattre</button>' +
      (R.mer ? '' : '<button class="btn" data-r="payer"' + (S.or < payer ? ' disabled' : '') + '>Payer ' + payer + ' or pour passer</button>') +
      '<button class="btn" data-r="fuir">Fuir (tu perds des provisions et peut-être un homme)</button>';
    fenetre('Rencontre', h);
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-r]'), function (b) {
      b.onclick = function () {
        $('fenetre').classList.add('hide');
        if (b.dataset.r === 'payer') { S.or -= payer; sauver(); suite(); }
        else if (b.dataset.r === 'fuir') {
          S.or = Math.max(0, S.or - 10); var ks = Object.keys(S.troupes).filter(function (k) { return S.troupes[k] > 0; });
          if (ks.length && Math.random() < 0.5) { var k = ks[Math.floor(Math.random() * ks.length)]; S.troupes[k]--; petitMsg('Un ' + FF.UNITES[k].nom.toLowerCase() + ' a disparu dans la fuite.'); }
          sauver(); suite();
        } else combat(R.mer ? { mer: true, titre: R.nom, ennemis: R.ennemis } : { titre: R.nom, decor: R.decor, vagues: R.vagues }, suite, { rencontre: true });
      };
    });
  }

  // Lieux où l'on ne peut pas entrer en ville (guerre, champ de bataille)
  function estCamp(id) {
    if (id === 'liban' || id === 'dorylee' || id === 'iconium') return true;
    if (id === 'nicee') return S.etape <= idxEtape('nicee');
    if (id === 'antioche') return S.etape <= idxEtape('antioche');
    if (id === 'jerusalem') return !S.fini;
    return false;
  }
  function idxEtape(lieu) { var h = FF.HISTOIRE[S.faction]; for (var i = 0; i < h.length; i++) if (h[i].lieu === lieu) return i; return 99; }

  // ---------- Entrer dans un lieu ----------
  function entrerLieu(id) {
    if (estCamp(id)) return camp(id);
    var L = FF.LIEUX[id];
    if (L.village) return entrerVillage(id);
    var pnjs = [];
    var e = etapeActuelle();
    if (e && e.lieu === id) {
      var q = (e.avant.filter(function (l) { return l.q && l.q !== 'narrateur' && l.q !== 'heros'; })[0] || { q: 'anselme' }).q;
      pnjs.push({ id: 'quete', nom: FF.PERSOS[q].nom, role: '⭐ ' + e.titre, look: lookPerso(q), icone: '⭐' });
    }
    if (FF.LEGENDES[id] && !S.legendes[id] && S.etape >= 1) pnjs.push({ id: 'legende', nom: id === 'bagdad' ? 'Wang' : 'Vieil ermite', role: '✦ ' + FF.LEGENDES[id].titre, icone: '✦', look: id === 'bagdad' ? lookPerso('marchand') : { tunique: 0x5d4037, casque: 'capuche', barbe: 0xd5d8dc } });
    pnjs.push({ id: 'forgeron', nom: 'Forgeron', role: 'Armes', icone: '⚒️', etal: 0x7f8c8d, look: { tunique: 0x5d4037, pantalon: 0x3e2723, barbe: 0x3e2723, cheveux: 0x3e2723 }, arme: 'masse' });
    if (recruesIci(id).length) pnjs.push({ id: 'recruteur', nom: 'Capitaine', role: 'Recrues et mercenaires', icone: '🛡️', etal: 0xc0392b, look: { tunique: 0x7b241c, pantalon: 0x34495e, casque: 'nasal', bouclier: 'kite', bc: 0x7b241c }, arme: 'lance' });
    pnjs.push({ id: 'taverne', nom: 'Aubergiste', role: 'Taverne : compagnons et rumeurs', icone: '🍺', etal: 0xd68910, look: { tunique: 0xa04000, pantalon: 0x4a235a, cheveux: 0x6e2c00 } });
    herosIci(id).forEach(function (h) { var T = FF.TALENTS[h.talent]; pnjs.push({ id: 'heros_' + h.id, nom: h.nom, role: T.icone + ' ' + T.nom + ' · à engager', icone: T.icone, look: h.unite.look, arme: h.unite.arme }); });
    var cour = FF.COURS[id];
    if (cour && S.etape >= (cour.min || 0) && (id !== 'jerusalem' || S.fini)) pnjs.push({ id: 'cour', nom: 'Héraut', role: '👑 ' + cour.titre, icone: '👑', look: { tunique: 0xf1c40f, pantalon: 0x7d3c98, cheveux: 0x1c1c1c } });
    pnjsReligion(L, true).forEach(function (p) { pnjs.push(p); });
    pnjs.push({ id: 'marchand', nom: 'Marchand', role: 'Marchandises', icone: '🛒', etal: 0x27ae60, look: { tunique: 0x1e8449, pantalon: 0x4a235a, cheveux: 0x3e2723, barbe: 0x3e2723 } });
    if (FF.BANQUES[id]) pnjs.push({ id: 'banque', nom: FF.BANQUES[id].split(' (')[0], role: 'Banque', icone: '🏦', etal: 0xb7950b, look: { tunique: 0x154360, pantalon: 0x1b2631, casque: L.religion === 'sunnite' || L.religion === 'chiite' ? 'turban' : 'aucun', cheveux: 0x5d4037, cape: 0x7d6608 } });
    if (ARENES.indexOf(id) >= 0) pnjs.push({ id: 'arene', nom: 'Maître d\'armes', role: 'Tournoi', icone: '🏆', look: { tunique: 0x922b21, pantalon: 0x1b2631, casque: 'nasal', barbe: 0x5d4037 }, arme: 'epee' });
    S.vus[id] = true;
    ecran('jeu3d');
    M.ville({
      lieu: L, joueur: { look: lookHeros(), arme: S.equip[0] }, pnjs: pnjs, nuit: false, cris: crisMarchands(id), couleur: (FF.FACTIONS[L.faction] || {}).couleur,
      parler: function (pid, pnj) { M.pause(true); parlerPnj(pid, id, pnj); },
      sortir: function () { ecran('carte'); choisirLieu(id); },
      pause: menuPause
    });
    $('nomLieu3d').textContent = L.nom;
    petitMsg('Bienvenue à ' + L.nom + '. Approche-toi des gens pour leur parler.');
  }
  function lookPerso(q) {
    var P = FF.PERSOS[q], L = (P && P.look) || {};
    return { peau: L.peau || 0xf1c27d, tunique: L.couronne ? 0x7d3c98 : L.turban ? 0xfdfefe : 0x5d6d7e, pantalon: 0x34495e, casque: L.turban ? 'turban' : L.couronne ? 'couronne' : L.casque ? 'nasal' : L.capuche ? 'capuche' : 'aucun', barbe: L.barbe, cheveux: L.cheveux, cape: L.couronne ? 0x4a235a : null };
  }
  function reprendreVille() { M.pause(false); }

  var RUMEURS = {
    occident: ['On dit que Pierre l\'Ermite a entraîné des milliers de pauvres gens vers l\'Orient, sans armes ni vivres.', 'Le duc Godefroy a vendu ses terres pour payer son armée. Un homme pieux… ou très ambitieux.', 'Un moine m\'a dit que l\'épée de Charlemagne dort sous la chapelle d\'Aix.', 'Les bandes de la croisade populaire ont massacré les Juifs de Mayence et de Cologne. Une honte.'],
    hongrie: ['Le roi Coloman se méfie des croisés. Les derniers ont pillé Zemun.', 'Les plaines de Hongrie sont belles, mais les mercenaires de Raoul y rôdent.'],
    balkans: ['Les Petchénègues escortent les croisés… et tirent sur ceux qui pillent.', 'L\'empereur Alexis est rusé : il offre de l\'or et demande des serments.', 'Dans la Garde varègue, il y a des Anglais qui ont fui Guillaume le Conquérant.'],
    anatolie: ['Kılıç Arslan a écrasé la croisade populaire l\'an dernier. Il croit que les chevaliers seront aussi faciles à battre.', 'Il fait si chaud en Anatolie que les chevaux tombent comme des mouches.'],
    syrie: ['Les émirs d\'Alep et de Damas se détestent plus qu\'ils ne détestent les Francs.', 'Les Fatimides du Caire ont repris Jérusalem aux Turcs. Ils pensent que les Francs ne viennent que pour Antioche.'],
    orient: ['Les marchands de la route de la soie apportent de la soie, du papier et même des épées d\'un pays appelé Japon.', 'Le calife de Bagdad règne, mais c\'est le sultan seldjoukide qui commande.'],
    egypte: ['Le phare d\'Alexandrie se voit à des lieues en mer.', 'Le vizir al-Afdal tient le Caire d\'une main de fer.'],
    mer: ['Les Génois et les Pisans se disputent toutes les routes de la mer.', 'Le feu grégeois brûle même sur l\'eau. Personne ne sait comment les Romains le fabriquent.'],
    nord: ['Le roi Magnus de Norvège rêve de conquérir l\'Irlande.', 'Le roi d\'Angleterre a prêté une fortune à son frère pour la croisade. En échange, il garde la Normandie.', 'Les huscarls danois se vendent au plus offrant, jusqu\'à Constantinople.'],
    est: ['Les Coumans ont brûlé le monastère des Grottes de Kiev.', 'Les fourrures de Novgorod valent de l\'or à Constantinople.', 'Le duc de Pologne vieillit, et ses fils se disputent déjà.'],
    iberie: ['Les Almoravides ont traversé la mer depuis le Maroc. Rien ne les arrête.', 'Le Cid tient toujours Valence. Les Almoravides n\'osent pas l\'attaquer.', 'À Tolède, des savants traduisent les livres arabes en latin.']
  };
  // Prêtres, imams, rabbins… : un par religion présente dans le lieu
  function lookPretre(rel) {
    if (rel === 'sunnite' || rel === 'chiite' || rel === 'druze') return { tunique: 0xfdfefe, pantalon: rel === 'druze' ? 0x1c1c1c : 0xfdfefe, casque: 'turban', barbe: 0x7b7d7d };
    if (rel === 'juive' || rel === 'samaritaine') return { tunique: 0x1b2631, pantalon: 0x1b2631, casque: 'capuche', cheveux: 0x3e2723, barbe: 0x3e2723, cape: 0xfdfefe };
    if (rel === 'paienne') return { tunique: 0x6e2c00, pantalon: 0x4e342e, casque: 'fourrure', cheveux: 0xd5d8dc, barbe: 0xd5d8dc };
    if (rel === 'copte' || rel === 'syriaque' || rel === 'maronite' || rel === 'nestorienne') return { tunique: 0x1c1c1c, pantalon: 0x1c1c1c, casque: 'capuche', barbe: 0x7b7d7d };
    return { tunique: 0x1c1c1c, pantalon: 0x1c1c1c, cheveux: 0x7b7d7d, barbe: rel !== 'catholique' ? 0x7b7d7d : null };
  }
  function pnjsReligion(L, avecMinorites) {
    var l = [], rels = [L.religion].concat(avecMinorites ? L.minorites || [] : []);
    rels.forEach(function (r, i) {
      var R = FF.RELIGIONS[r]; if (!R || !R.pretre) return;
      l.push({ id: i ? 'pretre_' + r : 'pretre', nom: R.pretre[0], role: i ? R.pretre[1] + ' · communauté ' + R.nom.split(' (')[0].toLowerCase() : R.pretre[1], icone: R.icone, look: lookPretre(r) });
    });
    return l;
  }
  var ARENES = ['constantinople', 'paris', 'cologne', 'venise', 'genes', 'londres', 'toulouse', 'tolede', 'palerme', 'kiev', 'antioche', 'damas', 'bagdad', 'alexandrie', 'rome', 'roskilde'];

  function parlerPnj(pid, lieu, pnj) {
    var L = FF.LIEUX[lieu];
    if (pid === 'quete') return mission(etapeActuelle(), reprendreVille);
    if (pid === 'legende') return legende(lieu, reprendreVille);
    if (pid === 'forgeron') return forge(reprendreVille);
    if (pid === 'recruteur') return recruter(lieu, false, reprendreVille);
    if (pid === 'taverne') return taverne(lieu, reprendreVille);
    if (pid === 'cour') return cour(lieu, reprendreVille);
    if (pid === 'pretre') return pretre(lieu, pnj, reprendreVille, L.religion);
    if (pid.indexOf('pretre_') === 0) return pretre(lieu, pnj, reprendreVille, pid.slice(7));
    if (pid === 'marchand' || pid === 'etal') return marche(lieu, reprendreVille);
    if (pid === 'banque') return banque(lieu, reprendreVille);
    if (pid === 'arene') return tournoi(lieu, reprendreVille);
    if (pid === 'ancien') return ancien(lieu, reprendreVille);
    if (pid.indexOf('heros_') === 0) return rencontreHeros(pid.slice(6), lieu, reprendreVille);
    // Habitant : une rumeur, ou un bon conseil pour le commerce
    var r = RUMEURS[L.region] || RUMEURS.occident;
    var t = Math.random() < 0.4 ? conseilCommerce(lieu) : r[Math.floor(Math.random() * r.length)];
    dialogue([{ q: 'narrateur', t: '« ' + t + ' »' }], reprendreVille);
  }

  // Camp de l'armée (lieux en guerre)
  function camp(id) {
    var L = FF.LIEUX[id], e = etapeActuelle();
    var h = '<p>' + esc(L.desc) + '</p>';
    if (e && e.lieu === id) h += '<button class="btn or" data-c="mission">⭐ ' + esc(e.titre) + '</button>';
    else h += '<p class="muted">Rien à faire ici pour l\'instant.' + (e ? ' Ton objectif : ' + esc(e.objectif) : '') + '</p>';
    fenetre(id === 'liban' ? '❄️ ' + L.nom : '⛺ Camp devant ' + L.nom, h);
    var b = $('fenCorps').querySelector('[data-c]');
    if (b) b.onclick = function () { $('fenetre').classList.add('hide'); mission(e, function () { ecran('carte'); }); };
  }

  // ---------- Mission d'histoire ----------
  function mission(e, retour) {
    if (!e) return retour && retour();
    var h = '<p class="date">' + esc(e.date) + ' · ' + esc(FF.LIEUX[e.lieu].nom) + '</p><p>' + esc(e.objectif) + '</p>' +
      '<details><summary>📜 Le saviez-vous ?</summary><p>' + esc(e.fait) + '</p></details>' +
      '<button class="btn or" id="goMission">Commencer</button>';
    fenetre(e.titre, h, function () { if (retour) retour(); });
    $('goMission').onclick = function () {
      $('fenetre').onFerme = null; $('fenetre').classList.add('hide');
      dialogue(e.avant, function () {
        var lancer = function () {
          combat(e.combat, function (res) {
            if (!res.victoire) { quitterVilleSiBesoin(); ecran('carte'); return; }
            dialogue(e.apres, function () { recompense(e.recompense, function () {
              S.etape++;
              S.stats.victoires++;
              sauver();
              if (e.recompense.fin) return epilogue();
              quitterVilleSiBesoin();
              ecran('carte');
              var suite = etapeActuelle();
              if (suite) petitMsg('Nouvel objectif : ' + suite.objectif);
            }); });
          }, { histoire: true });
        };
        if (e.recompense.tuto || !S.vus.tuto) { S.vus.tuto = true; aide(lancer); } else lancer();
      });
    };
  }
  function quitterVilleSiBesoin() { if (M.enVille()) M.arreter(); }
  function recompense(r, suite) {
    var h = '<div class="recomp">';
    if (r.or) { var g = Math.round(r.or * (S.faction === 'romains' ? 1.4 : 1)); S.or += g; h += '<p>💰 +' + g + ' or</p>'; }
    if (r.renom) { var avant = niveau(); S.renom += r.renom; h += '<p>⭐ +' + r.renom + ' renommée</p>'; if (niveau() > avant) h += '<p class="or">⬆️ Niveau ' + niveau() + ' ! PV max ' + pvMax() + ', +2 places de troupes.</p>'; }
    if (r.arme && S.armes.indexOf(r.arme) < 0) {
      var A = FF.ARMES[r.arme]; S.armes.push(r.arme);
      if (A.type === 'legendaire') { S.equip = [S.equip[0], r.arme]; }
      h += '<p class="arme">' + (A.type === 'legendaire' ? '✨ Arme légendaire : ' : '⚔️ Nouvelle arme : ') + '<b>' + esc(A.nom) + '</b><br><small>' + esc(A.desc) + (A.pouvoir ? ' Pouvoir (touche E) : ' + esc(A.pouvoir.nom) + '.' : '') + '</small></p>';
    }
    if (r.compagnon && S.compagnons.indexOf(r.compagnon) < 0) { S.compagnons.push(r.compagnon); h += '<p>🤝 ' + esc(FF.PERSOS[r.compagnon].nom) + ' rejoint ta compagnie' + (FF.COMPAGNONS[r.compagnon].unite ? ' et combattra à tes côtés.' : '.') + '</p>'; }
    h += '</div><button class="btn or" id="okRecomp">Continuer</button>';
    sauver();
    fenetre('Récompenses', h);
    $('okRecomp').onclick = function () { $('fenetre').classList.add('hide'); suite(); };
  }

  function legende(lieu, retour) {
    var Lg = FF.LEGENDES[lieu];
    dialogue(Lg.avant, function () {
      combat(Lg.combat, function (res) {
        if (!res.victoire) { quitterVilleSiBesoin(); ecran('carte'); return; }
        S.legendes[lieu] = true;
        dialogue(Lg.apres, function () { recompense({ arme: Lg.arme, renom: 10, or: 50 }, function () { quitterVilleSiBesoin(); ecran('carte'); }); });
      }, {});
    });
  }

  // ---------- Combats ----------
  function compagnonsCombat() {
    return S.compagnons.filter(function (c) { return FF.COMPAGNONS[c] && FF.COMPAGNONS[c].unite; }).map(function (c) {
      var u = FF.COMPAGNONS[c].unite;
      return Object.assign({ id: c }, u, { pv: u.pv + niveau() * 6 });
    });
  }
  function alliesCombat(max) {
    var lst = [], place = max;
    // les meilleures troupes d'abord
    Object.keys(S.troupes).sort(function (a, b) { return (FF.UNITES[b].prix || 0) - (FF.UNITES[a].prix || 0); }).forEach(function (k) {
      var n = Math.min(S.troupes[k], place);
      if (n > 0) { lst.push([k, n]); place -= n; }
    });
    return lst;
  }
  function combat(def, fin, opts) {
    opts = opts || {};
    var C = typeof def === 'string' ? FF.COMBATS[def] : def;
    var wasVille = M.enVille();
    if (wasVille) M.arreter();
    ecran('jeu3d');
    $('nomLieu3d').textContent = C.titre || '';
    var joueur = { nom: S.heros, armes: S.equip.slice(), pvMax: pvMax(), look: lookHeros(), bonusDeg: 1 + (niveau() - 1) * 0.04 };
    var comp = C.seul ? [] : compagnonsCombat();
    var commun = { joueur: joueur, compagnons: comp, faction: S.faction, diff: OPT.diff, directionnel: OPT.dir && !M.mobile, pause: menuPause };
    var apres = function (res) {
      // Pertes
      var morts = res.morts || {};
      Object.keys(morts).forEach(function (k) {
        if (!S.troupes[k]) return;
        var perdus = Math.round(morts[k] * (res.victoire ? 0.5 : 0.8) * (talent('medecin') ? 0.67 : 1)); // la moitié des blessés survit après une victoire
        S.troupes[k] = Math.max(0, S.troupes[k] - perdus);
      });
      if (res.pertesEquipage) for (var i = 0; i < res.pertesEquipage; i++) { var ks = Object.keys(S.troupes).filter(function (k) { return S.troupes[k] > 0; }); if (!ks.length) break; S.troupes[ks[Math.floor(Math.random() * ks.length)]]--; }
      Object.keys(S.troupes).forEach(function (k) { if (!S.troupes[k]) delete S.troupes[k]; });
      var gain = res.or || 0;
      S.or += gain;
      var perte = 0;
      if (!res.victoire && !C.amical) { perte = Math.round(S.or * 0.2); S.or -= perte; }
      if (res.victoire) { S.renom += opts.histoire ? 0 : 3; S.stats.tues += (res.stats && res.stats.tues) || 0; if (!C.seul) gagnerXp(res); }
      sauver();
      var h = '<p class="grand ' + (res.victoire ? 'or' : 'rouge') + '">' + (res.victoire ? (C.amical ? '🏆 Victoire !' : '🏆 Victoire !') : (C.amical ? 'Duel perdu…' : '💀 Défaite…')) + '</p>';
      h += '<p>💰 Or ramassé : ' + gain + (perte ? ' · Or perdu : ' + perte + ' (l\'or déposé à la banque, lui, est à l\'abri)' : '') + '</p>';
      if (res.stats) h += '<p>⚔️ Ennemis vaincus : ' + res.stats.tues + (res.stats.parades ? ' · Parades parfaites : ' + res.stats.parades : '') + '</p>';
      if (res.coules != null) h += '<p>⚓ Navires coulés : ' + res.coules + ' · capturés : ' + res.captures + '</p>';
      h += capturer(C, res); sauver();
      var lp = Object.keys(morts).filter(function (k) { return FF.UNITES[k]; }).map(function (k) { return morts[k] + ' ' + FF.UNITES[k].nom.toLowerCase(); });
      if (lp.length) h += '<p class="muted">Tombés au combat : ' + esc(lp.join(', ')) + (res.victoire ? ' (la moitié des blessés s\'en remettront)' : '') + '</p>';
      if (!res.victoire) h += '<button class="btn or" id="reessayer">Réessayer</button>';
      h += '<button class="btn" id="okCombat">' + (res.victoire ? 'Continuer' : 'Retour à la carte') + '</button>';
      fenetre(res.victoire ? 'Victoire' : 'Défaite', h);
      var ok = $('okCombat'), re = $('reessayer');
      ok.onclick = function () {
        $('fenetre').classList.add('hide');
        if (res.victoire || S.rapide || (!opts.histoire && !opts.rencontre)) fin(res);
        else ecran('carte');
      };
      if (re) re.onclick = function () { $('fenetre').classList.add('hide'); combat(def, fin, opts); };
    };
    if (C.mer) {
      M.naval(Object.assign({}, commun, {
        titre: C.titre, navire: S.faction === 'romains' ? 'dromon' : 'nef', ennemis: C.ennemis, allies: C.allies, lac: C.lac,
        equipage: Math.min(14, 4 + nbTroupes()), equipageAllie: alliesCombat(10)
      }), apres);
    } else {
      var allies = C.seul ? [] : alliesCombat(Math.max(0, 11 - comp.length)).concat(C.alliesHisto || []);
      M.bataille(Object.assign({}, commun, { titre: C.titre, decor: C.decor, vagues: C.vagues || [], boss: C.boss, allies: allies, amical: C.amical, graine: (C.titre || 'x').length * 13 }), apres);
    }
  }

  // ---------- Forge ----------
  function forge(retour) {
    var h = '<p class="muted">Tu as ' + S.or + ' or. Tu portes deux armes : change en combat avec X, la molette ou ⇄.</p><div class="grille">';
    Object.keys(FF.ARMES).forEach(function (id) {
      var A = FF.ARMES[id], a = S.armes.indexOf(id) >= 0;
      if (A.type === 'legendaire' && !a) return;
      var eq = S.equip.indexOf(id);
      h += '<div class="carteArme ' + (A.type === 'legendaire' ? 'leg' : '') + '"><b>' + esc(A.nom) + '</b><small>' + esc(A.origine) + '</small>' +
        '<div class="stats">' + barre('Dégâts', A.deg / 26) + barre('Vitesse', 0.42 / A.dur) + barre('Portée', A.portee / 3.3) + '</div><p>' + esc(A.desc) + (A.pouvoir ? ' <i>✨ ' + esc(A.pouvoir.nom) + '</i>' : '') + '</p>';
      if (!a) h += '<button class="btn or petit" data-acheter="' + id + '"' + (S.or < A.prix ? ' disabled' : '') + '>Acheter ' + A.prix + ' or</button>';
      else h += '<div class="rangee"><button class="btn petit' + (eq === 0 ? ' actif' : '') + '" data-eq="0" data-id="' + id + '">Main 1</button><button class="btn petit' + (eq === 1 ? ' actif' : '') + '" data-eq="1" data-id="' + id + '">Main 2</button></div>';
      h += '</div>';
    });
    h += '</div>';
    fenetre('⚒️ Forge et armurerie', h, retour);
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-acheter]'), function (b) {
      b.onclick = function () { var A = FF.ARMES[b.dataset.acheter]; if (S.or < A.prix) return; S.or -= A.prix; S.armes.push(b.dataset.acheter); S.equip[0] = b.dataset.acheter; sauver(); M.son('or'); forge(retour); };
    });
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-eq]'), function (b) {
      b.onclick = function () {
        var i = +b.dataset.eq, id = b.dataset.id, autre = S.equip.indexOf(id);
        if (autre >= 0 && autre !== i) S.equip[autre] = S.equip[i];
        S.equip[i] = id;
        S.equip = S.equip.filter(function (x, k) { return x && S.equip.indexOf(x) === k; });
        sauver(); forge(retour);
      };
    });
  }
  function barre(nom, k) { return '<label>' + nom + '<span><i style="width:' + Math.round(Math.min(1, k) * 100) + '%"></i></span></label>'; }

  // ---------- Recrutement ----------
  function recruesIci(lieu) {
    var l = (FF.RECRUES[lieu] || []).filter(function (k) { var U = FF.UNITES[k]; return U && (!U.faction || U.faction === S.faction); });
    if (lieu === 'jerusalem' && !S.fini) l = l.filter(function (k) { return k !== 'hospitalier'; });
    // Troupes de ta faction dans les villes amies
    var L = FF.LIEUX[lieu];
    if (S.faction === 'latins' && L.religion === 'catholique' && l.indexOf('sergent') < 0) l.push('sergent');
    if (S.faction === 'romains' && L.faction === 'romains' && l.indexOf('skutatos') < 0) l.push('skutatos');
    return l;
  }
  function prix(k) { return Math.round(FF.UNITES[k].prix * (S.faction === 'romains' ? 0.75 : 1)); }
  function recruter(lieu, mercsSeuls, retour) {
    var l = recruesIci(lieu).filter(function (k) { return !mercsSeuls || FF.UNITES[k].merc; });
    var h = '<p class="muted">💰 ' + S.or + ' or · 👥 ' + nbTroupes() + ' / ' + placeTroupes() + ' hommes (plus de places en gagnant des niveaux).</p><div class="liste">';
    l.forEach(function (k) {
      var U = FF.UNITES[k];
      h += '<div class="ligneUnite"><div><b>' + esc(U.nom) + '</b>' + (U.merc ? ' <span class="tag">mercenaire</span>' : '') + (k === 'hospitalier' ? ' <span class="tag or">ordre saint</span>' : '') +
        '<small>❤️ ' + U.pv + ' · ⚔️ ' + U.deg + (U.tir ? ' · 🏹 tir' : '') + (U.histo ? ' — ' + esc(U.histo) : '') + '</small></div>' +
        '<button class="btn or petit" data-rec="' + k + '"' + (S.or < prix(k) || nbTroupes() >= placeTroupes() ? ' disabled' : '') + '>' + prix(k) + ' or</button></div>';
    });
    if (!l.length) h += '<p>Personne à engager ici.</p>';
    h += '</div>';
    fenetre(mercsSeuls ? '💰 Mercenaires' : '🛡️ Recruter', h, retour);
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-rec]'), function (b) {
      b.onclick = function () { var k = b.dataset.rec; if (S.or < prix(k) || nbTroupes() >= placeTroupes()) return; S.or -= prix(k); S.troupes[k] = (S.troupes[k] || 0) + 1; sauver(); M.son('or'); recruter(lieu, mercsSeuls, retour); };
    });
  }

  // ---------- Commerce : acheter là où c'est produit, revendre là où c'est recherché ----------
  function hashTxt(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 9973; return h; }
  function infoCommerce(lieu) { var C = FF.COMMERCE[lieu] || ['', '']; return { prod: C[0] ? C[0].split(' ') : [], dem: C[1] ? C[1].split(' ') : [] }; }
  function chargeMax() { return 20 + 2 * nbTroupes() + (talent('intendant') ? 15 : 0); }
  function charge() { var n = 0; for (var g in S.inv) n += S.inv[g]; return n; }
  // Ce que le joueur a déjà vendu (+) ou acheté (-) ici fait bouger les prix ; ça revient à la normale en quelques semaines
  function ecartMarche(lieu, g) {
    var m = S.marche[lieu] && S.marche[lieu][g];
    if (!m) return 0;
    return m.d * Math.pow(0.93, Math.max(0, S.jour - m.j));
  }
  function bougerMarche(lieu, g, n) {
    var e = ecartMarche(lieu, g);
    S.marche[lieu] = S.marche[lieu] || {};
    S.marche[lieu][g] = { d: Math.max(-25, Math.min(25, e + n)), j: S.jour };
  }
  function prixMarche(lieu, g) {
    var I = infoCommerce(lieu), base = FF.MARCH[g].prix;
    var m = I.prod.indexOf(g) >= 0 ? 0.6 : I.dem.indexOf(g) >= 0 ? 1.65 : 1;
    var f = 1 + 0.12 * Math.sin(S.jour / 6 + hashTxt(lieu + g));
    var st = Math.max(0.45, Math.min(1.6, 1 - 0.035 * ecartMarche(lieu, g)));
    return Math.max(1, base * m * f * st);
  }
  function prixAchat(lieu, g) { return Math.max(1, Math.round(prixMarche(lieu, g) * 1.08 * (talent('marchand') ? 0.92 : 1))); }
  function prixVente(lieu, g) { return Math.max(1, Math.round(prixMarche(lieu, g) * 0.9 * (talent('marchand') ? 1.06 : 1))); }
  function marche(lieu, retour) {
    var L = FF.LIEUX[lieu], I = infoCommerce(lieu);
    var liste = [];
    I.prod.concat(I.dem, Object.keys(S.inv).filter(function (g) { return S.inv[g] > 0; }), L.village ? [] : ['ble', 'vin', 'sel', 'fer']).forEach(function (g) { if (g && liste.indexOf(g) < 0) liste.push(g); });
    var h = '<p class="muted">💰 ' + S.or + ' or · 📦 Chargement ' + charge() + ' / ' + chargeMax() + ' (2 places de plus par soldat). Achète là où c\'est produit, revends là où c\'est recherché.</p><div class="liste">';
    liste.forEach(function (g) {
      var G = FF.MARCH[g], a = prixAchat(lieu, g), v = prixVente(lieu, g), n = S.inv[g] || 0;
      var vendable = !L.village || I.prod.indexOf(g) < 0 || n > 0;
      var tag = I.prod.indexOf(g) >= 0 ? ' <span class="tag">produit ici</span>' : I.dem.indexOf(g) >= 0 ? ' <span class="tag or">recherché ici</span>' : '';
      h += '<div class="ligneUnite"><div><b>' + G.icone + ' ' + esc(G.nom) + '</b>' + tag + '<small>Achat ' + a + ' · Vente ' + v + (n ? ' · tu en as ' + n : '') + '</small></div><div class="boutons">' +
        '<button class="btn or petit" data-ach="' + g + '"' + (S.or < a || charge() >= chargeMax() ? ' disabled' : '') + '>Acheter</button>' +
        (vendable ? '<button class="btn petit" data-ven="' + g + '"' + (!n ? ' disabled' : '') + '>Vendre</button>' : '') +
        (n > 1 ? '<button class="btn petit" data-tout="' + g + '">Tout vendre</button>' : '') + '</div></div>';
    });
    h += '</div>';
    fenetre('🛒 Marché ' + (L.village ? 'du village' : 'de ' + L.nom), h, retour);
    function action(sel, f) { Array.prototype.forEach.call($('fenCorps').querySelectorAll(sel), function (b) { b.onclick = function () { f(b); sauver(); majBarre(); marche(lieu, retour); }; }); }
    action('[data-ach]', function (b) { var g = b.dataset.ach, p = prixAchat(lieu, g); if (S.or < p || charge() >= chargeMax()) return; S.or -= p; S.inv[g] = (S.inv[g] || 0) + 1; bougerMarche(lieu, g, -1); M.son('or'); });
    action('[data-ven]', function (b) { var g = b.dataset.ven; if (!S.inv[g]) return; S.or += prixVente(lieu, g); S.inv[g]--; if (!S.inv[g]) delete S.inv[g]; bougerMarche(lieu, g, 1); M.son('or'); });
    action('[data-tout]', function (b) { var g = b.dataset.tout, tot = 0; while (S.inv[g] > 0) { tot += prixVente(lieu, g); S.inv[g]--; bougerMarche(lieu, g, 1); } delete S.inv[g]; S.or += tot; M.son('or'); petitMsg('+' + tot + ' or'); });
  }
  // Ce que crient les marchands de la ville
  function crisMarchands(lieu) {
    var I = infoCommerce(lieu);
    var c = I.prod.map(function (g) { return FF.MARCH[g].icone + ' ' + FF.MARCH[g].nom + ' ! Le meilleur prix de la ville !'; });
    I.dem.forEach(function (g) { c.push('J\'achète ' + FF.MARCH[g].nom.toLowerCase() + ', je paie bien !'); });
    c.push('Approchez, approchez !', 'Goûtez, goûtez, c\'est gratuit !');
    return c;
  }
  // Un habitant donne une bonne adresse pour le commerce
  function conseilCommerce(lieu) {
    var ids = Object.keys(FF.COMMERCE).filter(function (k) { return k !== lieu && FF.COMMERCE[k][1] && FF.LIEUX[k] && !FF.LIEUX[k].village; });
    var k = ids[Math.floor(Math.random() * ids.length)], g = FF.COMMERCE[k][1].split(' ')[0];
    S.vus[k] = true; sauver();
    return 'Un marchand m\'a dit qu\'à ' + FF.LIEUX[k].nom + ', on paie très cher ' + (/^[aeiouéè]/i.test(FF.MARCH[g].nom) ? 'l\'' : 'le ') + FF.MARCH[g].nom.toLowerCase() + '.';
  }

  // ---------- Banque : dépôt avec intérêts, prêt à rembourser ----------
  function majBanque() {
    var b = S.banque;
    var p = Math.floor((S.jour - b.maj) / 10);
    if (p > 0) {
      if (b.solde > 0) b.solde = Math.round(b.solde * Math.pow(1.01, p));
      b.maj += p * 10;
    }
    // Retard de remboursement : la dette grossit de 5 % tous les 10 jours
    if (b.pret > 0 && S.jour > b.echeance) {
      var r = Math.floor((S.jour - b.echeance) / 10);
      if (r > b.retard) { b.pret = Math.round(b.pret * Math.pow(1.05, r - b.retard)); b.retard = r; }
    }
  }
  function pretMax() { return 150 + niveau() * 100; }
  function banque(lieu, retour) {
    majBanque();
    var b = S.banque;
    var h = '<p>« Ton argent est plus en sécurité ici que dans ta bourse. Le même compte sert chez tous les banquiers et changeurs de la carte. »</p>' +
      '<p class="muted">💰 Sur toi : ' + S.or + ' or · 🏦 À la banque : ' + b.solde + ' or (+1 % tous les 10 jours). En cas de défaite, tu perds 20 % de l\'or sur toi, jamais celui de la banque.</p>' +
      '<h3>Dépôt</h3><div class="boutons">' +
      [50, 200].map(function (n) { return '<button class="btn petit" data-dep="' + n + '"' + (S.or < n ? ' disabled' : '') + '>Déposer ' + n + '</button>'; }).join('') +
      '<button class="btn petit" data-dep="tout"' + (!S.or ? ' disabled' : '') + '>Tout déposer</button></div>' +
      '<div class="boutons">' + [50, 200].map(function (n) { return '<button class="btn petit" data-ret="' + n + '"' + (b.solde < n ? ' disabled' : '') + '>Retirer ' + n + '</button>'; }).join('') +
      '<button class="btn petit" data-ret="tout"' + (!b.solde ? ' disabled' : '') + '>Tout retirer</button></div><h3>Prêt</h3>';
    if (b.pret > 0) {
      var reste = b.echeance - S.jour;
      h += '<p>Tu dois <b>' + b.pret + ' or</b>. ' + (reste >= 0 ? 'À rembourser dans ' + reste + ' jours.' : '<span class="rouge">En retard de ' + (-reste) + ' jours : la dette grossit de 5 % tous les 10 jours !</span>') + '</p>' +
        '<button class="btn or" data-c="rembourser"' + (S.or + b.solde < b.pret ? ' disabled' : '') + '>Rembourser ' + b.pret + ' or</button>';
    } else {
      h += '<p class="muted">Tu peux emprunter jusqu\'à ' + pretMax() + ' or (plus avec ta renommée). Tu rends 15 % de plus, dans les 60 jours.</p><div class="boutons">' +
        [100, 250, 500].filter(function (n) { return n <= pretMax(); }).map(function (n) { return '<button class="btn petit" data-pret="' + n + '">Emprunter ' + n + '</button>'; }).join('') + '</div>';
    }
    fenetre('🏦 ' + (FF.BANQUES[lieu] || 'Banque'), h, retour);
    function action(sel, f) { Array.prototype.forEach.call($('fenCorps').querySelectorAll(sel), function (x) { x.onclick = function () { f(x); M.son('or'); sauver(); majBarre(); banque(lieu, retour); }; }); }
    action('[data-dep]', function (x) { var n = x.dataset.dep === 'tout' ? S.or : Math.min(S.or, +x.dataset.dep); S.or -= n; b.solde += n; });
    action('[data-ret]', function (x) { var n = x.dataset.ret === 'tout' ? b.solde : Math.min(b.solde, +x.dataset.ret); b.solde -= n; S.or += n; });
    action('[data-pret]', function (x) { var n = +x.dataset.pret; if (b.pret > 0 || n > pretMax()) return; S.or += n; b.pret = Math.round(n * 1.15); b.echeance = S.jour + 60; b.retard = 0; petitMsg('+' + n + ' or empruntés'); });
    action('[data-c="rembourser"]', function () {
      var reste = b.pret, deBourse = Math.min(S.or, reste); S.or -= deBourse; reste -= deBourse;
      b.solde -= reste; b.pret = 0; b.retard = 0;
      if (S.jour <= b.echeance) { S.renom += 1; petitMsg('Dette remboursée à temps : ta parole vaut de l\'or (+1 ⭐).'); } else petitMsg('Dette remboursée.');
    });
  }

  // ---------- Tournoi des grandes villes ----------
  function tournoi(lieu, retour) {
    var L = FF.LIEUX[lieu];
    var dernier = S.tournois[lieu], attente = dernier == null ? 0 : dernier + 7 - S.jour;
    var prix = 80 + niveau() * 25, inscription = 15;
    var h = '<p>« Trois manches, seul contre tous, armes émoussées. Le vainqueur repart avec la bourse et la gloire. »</p>' +
      '<p class="muted">Inscription : ' + inscription + ' or · Récompense : ' + prix + ' or et +5 ⭐ renommée. Pas de soldats ni de compagnons : c\'est ton combat.</p>';
    if (attente > 0) h += '<p>Le prochain tournoi de ' + esc(L.nom) + ' aura lieu dans ' + attente + ' jours.</p>';
    else h += '<button class="btn or" data-c="go"' + (S.or < inscription ? ' disabled' : '') + '>⚔️ S\'inscrire (' + inscription + ' or)</button>';
    fenetre('🏆 Tournoi de ' + L.nom, h, retour);
    var b = $('fenCorps').querySelector('[data-c="go"]');
    if (!b) return;
    b.onclick = function () {
      $('fenetre').onFerme = null; $('fenetre').classList.add('hide');
      S.or -= inscription; S.tournois[lieu] = S.jour; sauver();
      var style = /^(syrie|anatolie|egypte|orient)$/.test(L.region) ? 'orient' : L.region === 'nord' ? 'nord' : L.region === 'est' ? 'est' : L.faction === 'romains' ? 'byzance' : 'occident';
      var adv = { occident: ['milicien', 'sergent', 'chevalier'], byzance: ['skutatos', 'varegue', 'varegue'], orient: ['seldjoukide', 'fatimide', 'assassin'], nord: ['milicien', 'huscarl', 'huscarl'], est: ['coumane', 'druzhinnik', 'druzhinnik'] }[style];
      M.arreter();
      combat({ titre: 'Tournoi de ' + L.nom, decor: style === 'occident' || style === 'nord' || style === 'est' ? 'ville' : 'desert', amical: true, seul: true,
        vagues: [[[adv[0], 1]], [[adv[1], 1]], [[adv[2], 1], [adv[0], 1]]] }, function (res) {
        if (res.victoire) { S.or += prix; S.renom += 5; sauver(); petitMsg('🏆 Tu remportes le tournoi : +' + prix + ' or, +5 ⭐ !'); }
        else petitMsg('Le public t\'applaudit quand même. Reviens dans une semaine !');
        entrerLieu(lieu);
      }, {});
    };
  }

  // ---------- Villages : volontaires, entente, entraide ----------
  function etatVillage(id) {
    var L = FF.LIEUX[id], v = S.villages[id];
    if (!v) {
      var maRel = FF.FACTIONS[S.faction].religion, gr = FF.RELIGIONS[L.religion].groupe;
      var base = L.religion === maRel ? 10 : gr === 'chretien' ? 5 : gr === 'juif' || gr === 'autre' ? 0 : -10;
      if (S.vus['savoir_' + L.religion]) base += 5;
      if (S.rel && S.rel[L.faction] != null) base += Math.round(S.rel[L.faction] / 5);
      v = S.villages[id] = { rel: base, vol: base >= 0 ? 2 : 0, maj: S.jour, aide: -99 };
    }
    var p = Math.floor((S.jour - v.maj) / 4);
    if (p > 0) { v.vol = Math.min(volMax(v), v.vol + p); v.maj += p * 4; }
    v.vol = Math.min(v.vol, volMax(v));
    return v;
  }
  function volMax(v) { return v.rel < 0 ? 0 : Math.min(10, 2 + Math.floor(v.rel / 15) + (talent('recruteur') ? 2 : 0)); }
  function nomEntente(r) { return r < 0 ? 'méfiants' : r < 20 ? 'neutres' : r < 50 ? 'amicaux' : 'dévoués'; }
  function prixVolontaire(k) { return Math.max(4, Math.round(prix(k) * 0.6)); }
  function entrerVillage(id) {
    var L = FF.LIEUX[id];
    etatVillage(id);
    S.vus[id] = true; sauver();
    var pnjs = [
      { id: 'ancien', nom: 'L\'ancien du village', role: 'Volontaires et entraide', icone: '🌾', look: { tunique: 0x6d4c41, pantalon: 0x4e342e, cheveux: 0xd5d8dc, barbe: 0xd5d8dc, casque: L.religion === 'sunnite' || L.religion === 'chiite' ? 'turban' : 'aucun' } },
      { id: 'etal', nom: 'Marché du village', role: 'Produits de la ferme', icone: '🧺', etal: 0xd68910, look: { tunique: 0xa04000, pantalon: 0x5d4037, casque: 'capuche' } }
    ];
    pnjsReligion(L, false).forEach(function (p) { pnjs.push(p); });
    var e = etapeActuelle();
    if (e && e.lieu === id) pnjs.unshift({ id: 'quete', nom: 'Messager', role: '⭐ ' + e.titre, icone: '⭐', look: { tunique: 0x2874a6, casque: 'capuche' } });
    ecran('jeu3d');
    M.ville({
      lieu: L, village: true, joueur: { look: lookHeros(), arme: S.equip[0] }, pnjs: pnjs, cris: crisMarchands(id),
      parler: function (pid, pnj) { M.pause(true); parlerPnj(pid, id, pnj); },
      sortir: function () { ecran('carte'); choisirLieu(id); },
      pause: menuPause
    });
    $('nomLieu3d').textContent = L.nom;
    petitMsg('Bienvenue au village de ' + L.nom + '. L\'ancien cherche des gens de confiance.');
  }
  function ancien(id, retour) {
    var L = FF.LIEUX[id], v = etatVillage(id), k = L.recrue || 'paysan', U = FF.UNITES[k];
    var place = placeTroupes() - nbTroupes(), p = prixVolontaire(k);
    var h = '<p>🤝 Entente : <b>' + v.rel + '</b> (les villageois sont ' + nomEntente(v.rel) + ').</p>';
    if (v.rel < 0) h += '<p>« Des étrangers en armes… Nous n\'avons rien pour toi. Prouve d\'abord que tu nous veux du bien. »</p>';
    else h += '<p>« ' + (v.vol ? v.vol + ' jeunes gens veulent te suivre.' : 'Personne d\'autre ne veut partir pour l\'instant. Reviens dans quelques jours.') + ' »</p>' +
      '<p class="muted">De nouveaux volontaires arrivent tous les 4 jours (jusqu\'à ' + volMax(v) + ' : plus l\'entente est bonne, plus il y en a). Ils gagnent de l\'expérience au combat et peuvent devenir de vrais soldats (dans « Ma compagnie »).</p>' +
      '<div class="ligneUnite"><div><b>' + esc(U.nom) + '</b><small>❤️ ' + U.pv + ' · ⚔️ ' + U.deg + (U.tir ? ' · 🏹 tir' : '') + '</small></div><div class="boutons">' +
      '<button class="btn or petit" data-v="1"' + (!v.vol || !place || S.or < p ? ' disabled' : '') + '>Engager 1 (' + p + ' or)</button>' +
      '<button class="btn petit" data-v="tous"' + (!v.vol || !place || S.or < p ? ' disabled' : '') + '>Tous ceux possibles</button></div></div>';
    // Entraide : une demande du village tous les 12 jours
    var dispo = S.jour - v.aide >= 12;
    var demande = (hashTxt(id) + Math.floor(S.jour / 12)) % 2 ? 'brigands' : 'grain';
    h += '<h3>Entraide</h3>';
    if (!dispo) h += '<p class="muted">Le village n\'a besoin de rien pour l\'instant (revient dans ' + (12 - (S.jour - v.aide)) + ' jours).</p>';
    else if (demande === 'brigands') h += '<p>« Des brigands rançonnent nos fermes. Chasse-les et le village s\'en souviendra. »</p><button class="btn or" data-a="brigands">⚔️ Chasser les brigands (+20 entente, 40 or)</button>';
    else h += '<p>« La récolte a été mauvaise. Avec 40 or, nous pourrions acheter du grain pour l\'hiver. »</p><button class="btn or" data-a="grain"' + (S.or < 40 ? ' disabled' : '') + '>🌾 Donner 40 or (+12 entente, +1 ⭐)</button>';
    fenetre('🌾 ' + L.nom + ' : l\'ancien du village', h, retour);
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-v]'), function (b) {
      b.onclick = function () {
        var n = b.dataset.v === 'tous' ? v.vol : 1;
        for (var i = 0; i < n; i++) { if (!v.vol || nbTroupes() >= placeTroupes() || S.or < p) break; S.or -= p; v.vol--; S.troupes[k] = (S.troupes[k] || 0) + 1; }
        M.son('or'); sauver(); majBarre(); ancien(id, retour);
      };
    });
    var a = $('fenCorps').querySelector('[data-a]');
    if (a) a.onclick = function () {
      if (a.dataset.a === 'grain') { if (S.or < 40) return; S.or -= 40; v.rel += 12; S.renom += 1; v.aide = S.jour; sauver(); M.son('or'); petitMsg('Le village te remercie.'); ancien(id, retour); return; }
      $('fenetre').onFerme = null; $('fenetre').classList.add('hide');
      M.arreter();
      var dec = /^(syrie|anatolie|egypte|orient)$/.test(L.region) ? 'desert' : L.region === 'balkans' || L.region === 'hongrie' ? 'plaine' : 'foret';
      combat({ titre: 'Les brigands de ' + L.nom, decor: dec, vagues: [[['brigand', 3]], [['brigand', 2], ['noir_tir', 1]]] }, function (res) {
        if (res.victoire) { v.rel += 20; v.aide = S.jour; S.or += 40; S.renom += 2; v.vol = Math.min(volMax(v), v.vol + 1); sauver(); petitMsg('Le village est libéré ! +20 entente, +40 or.'); }
        else petitMsg('Les brigands t\'ont repoussé… Reviens plus fort.');
        entrerLieu(id);
      }, {});
    };
  }

  // ---------- Promotion des troupes (avec l'expérience des combats) ----------
  function promoDe(k) { var U = FF.UNITES[k]; if (!U || !U.promo) return null; var c = typeof U.promo === 'object' ? U.promo[S.faction] : U.promo; return c && FF.UNITES[c] ? c : null; }
  function gagnerXp(res) {
    var ks = Object.keys(S.troupes).filter(function (k) { return S.troupes[k] > 0 && promoDe(k); });
    if (!ks.length) return;
    var gain = Math.round((4 + Math.round(((res.stats && res.stats.tues) || 0) / 2)) * (talent('instructeur') ? 1.5 : 1));
    ks.forEach(function (k) { S.xp[k] = Math.min(999, (S.xp[k] || 0) + gain); });
  }

  // ---------- Taverne : compagnons, romance, rumeurs ----------
  function taverne(lieu, retour) {
    var h = '<p>La salle sent le vin chaud et la fumée. Des voyageurs de tous les pays parlent fort.</p>';
    S.compagnons.forEach(function (c) {
      var Cp = FF.COMPAGNONS[c]; if (!Cp) return;
      var faites = S.discussions[c] || 0, d = Cp.discussions[faites];
      var coeur = Cp.taverne ? ' · ' + FF.TALENTS[Cp.talent].icone + ' ' + FF.TALENTS[Cp.talent].nom : c === 'yusuf' ? '' : ' · ❤️ ' + (S.aff[c] || 0);
      if (d && S.etape >= d.min) h += '<button class="btn or" data-parler="' + c + '">💬 Parler à ' + esc(Cp.nom) + coeur + '</button>';
      else h += '<p class="muted">' + esc(Cp.nom) + coeur + (S.drapeaux['romance_' + c] ? ' · 💕 en couple' : ' — n\'a rien de nouveau à te dire pour l\'instant.') + '</p>';
    });
    if (!S.compagnons.length) h += '<p class="muted">Tu n\'as pas encore de compagnons.</p>';
    var ici = herosIci(lieu);
    h += '<h3>Héros de passage</h3>' + (ici.length ? ici.map(function (x) { var T = FF.TALENTS[x.talent]; return '<button class="btn or" data-heros="' + x.id + '">' + T.icone + ' ' + esc(x.nom) + ' · ' + esc(T.nom) + '</button>'; }).join('') :
      '<p class="muted">Personne à engager ici aujourd\'hui. Les héros voyagent : ils changent de taverne tous les 10 jours.</p>');
    if (recruesIci(lieu).some(function (k) { return FF.UNITES[k].merc; })) h += '<button class="btn" data-t="mercs">💰 Engager des mercenaires</button>';
    h += '<button class="btn" data-t="rancons">⛓️ Marchand de rançons' + (nbPrisonniers() ? ' (' + nbPrisonniers() + ' prisonniers)' : '') + '</button>';
    h += '<button class="btn" data-t="rumeur">👂 Écouter les rumeurs</button>';
    fenetre('🍺 Taverne de ' + FF.LIEUX[lieu].nom, h, retour);
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-parler]'), function (b) {
      b.onclick = function () {
        var c = b.dataset.parler, Cp = FF.COMPAGNONS[c], d = Cp.discussions[S.discussions[c] || 0];
        $('fenetre').onFerme = null; $('fenetre').classList.add('hide');
        var lignes = d.d;
        if (d.romance && (S.aff[c] || 0) < 6) lignes = [{ q: c, t: 'Je… non, rien. Une autre fois, peut-être.' }, { q: 'narrateur', t: '(Il faudrait que ' + Cp.nom + ' t\'apprécie davantage : ❤️ 6 ou plus.)' }];
        else S.discussions[c] = (S.discussions[c] || 0) + 1;
        sauver();
        dialogue(lignes, function () { taverne(lieu, retour); });
      };
    });
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-heros]'), function (b) { b.onclick = function () { rencontreHeros(b.dataset.heros, lieu, function () { taverne(lieu, retour); }); }; });
    $('fenCorps').querySelector('[data-t="rancons"]').onclick = function () { rancons(lieu, function () { taverne(lieu, retour); }); };
    var m = $('fenCorps').querySelector('[data-t="mercs"]');
    if (m) m.onclick = function () { recruter(lieu, true, function () { taverne(lieu, retour); }); };
    $('fenCorps').querySelector('[data-t="rumeur"]').onclick = function () {
      var r = RUMEURS[FF.LIEUX[lieu].region] || RUMEURS.occident;
      $('fenetre').onFerme = null; $('fenetre').classList.add('hide');
      dialogue([{ q: 'narrateur', t: '« ' + r[Math.floor(Math.random() * r.length)] + ' »' }], function () { taverne(lieu, retour); });
    };
  }

  // ---------- Prisonniers et rançons ----------
  function capPrisonniers() { return 5 + niveau() * 2; }
  function nbPrisonniers() { var n = 0; for (var k in S.prisonniers) n += S.prisonniers[k]; return n; }
  function capturer(C, res) {
    if (C.amical || C.mer || C.seul || !res.victoire) return '';
    var types = [];
    (C.vagues || []).forEach(function (v) { v.forEach(function (g) { var U = FF.UNITES[g[0]]; if (U && !U.boss && !U.pierre && !U.spectre) for (var i = 0; i < g[1]; i++) types.push(g[0]); }); });
    if (!types.length) return '';
    var place = capPrisonniers() - nbPrisonniers();
    if (place <= 0) return '<p class="muted">⛓️ Tu ne peux pas garder plus de ' + capPrisonniers() + ' prisonniers : vends-les dans une taverne.</p>';
    var n = Math.min(Math.round(((res.stats && res.stats.tues) || types.length) * 0.35 + Math.random() * 0.8), place, types.length);
    var pris = {};
    for (var i = 0; i < n; i++) { var k = types[Math.floor(Math.random() * types.length)]; S.prisonniers[k] = (S.prisonniers[k] || 0) + 1; pris[k] = (pris[k] || 0) + 1; }
    var l = Object.keys(pris).map(function (k) { return FF.UNITES[k].nom.toLowerCase() + ' × ' + pris[k]; });
    return l.length ? '<p>⛓️ Prisonniers capturés : ' + esc(l.join(', ')) + ' <span class="muted">(un marchand de rançons les achète dans les tavernes)</span></p>' : '';
  }
  function prixRancon(k) { var U = FF.UNITES[k]; return Math.max(10, Math.round((U.or || 8) * 2 + (U.prix || U.pv * 0.4) * 0.5)); }
  function rancons(lieu, retour) {
    var ks = Object.keys(S.prisonniers).filter(function (k) { return S.prisonniers[k] > 0; });
    var h = '<p>Un homme au regard rusé t\'attend dans un coin de la taverne : « Des prisonniers ? Je paie bien. Leurs familles paieront encore mieux. »</p>';
    if (!ks.length) h += '<p class="muted">Tu n\'as aucun prisonnier. Gagne des batailles pour en capturer (' + capPrisonniers() + ' au maximum).</p>';
    else {
      var total = 0;
      h += '<div class="liste">' + ks.map(function (k) {
        var p = prixRancon(k); total += p * S.prisonniers[k];
        return '<div class="ligneUnite"><div><b>' + S.prisonniers[k] + ' × ' + esc(FF.UNITES[k].nom) + '</b><small>Rançon : ' + p + ' or chacun</small></div><div><button class="btn petit or" data-vendre="' + k + '">Vendre 1</button>' +
          '<button class="btn petit" data-enrole="' + k + '"' + (nbTroupes() >= placeTroupes() ? ' disabled' : '') + '>Enrôler 1</button></div></div>';
      }).join('') + '</div>';
      h += '<button class="btn or" id="toutVendre">💰 Tout vendre (' + total + ' or)</button>';
      h += '<p class="muted">Enrôler : 60 % de chances que le prisonnier accepte de se battre pour toi. Sinon, il s\'enfuit.</p>';
    }
    fenetre('⛓️ Marchand de rançons', h, retour);
    function apres() { sauver(); majBarre(); rancons(lieu, retour); }
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-vendre]'), function (b) { b.onclick = function () { var k = b.dataset.vendre; if (!S.prisonniers[k]) return; S.prisonniers[k]--; S.or += prixRancon(k); M.son('or'); apres(); }; });
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-enrole]'), function (b) {
      b.onclick = function () {
        var k = b.dataset.enrole; if (!S.prisonniers[k] || nbTroupes() >= placeTroupes()) return;
        S.prisonniers[k]--;
        if (Math.random() < 0.6) { S.troupes[k] = (S.troupes[k] || 0) + 1; petitMsg('Le ' + FF.UNITES[k].nom.toLowerCase() + ' jure de te servir.'); }
        else petitMsg('Le prisonnier s\'est enfui dès qu\'on l\'a détaché…');
        apres();
      };
    });
    var t = $('toutVendre');
    if (t) t.onclick = function () { Object.keys(S.prisonniers).forEach(function (k) { S.or += prixRancon(k) * S.prisonniers[k]; }); S.prisonniers = {}; M.son('or'); apres(); };
  }

  // ---------- Royaumes : relations, messagers, vassalité, fief, guerres ----------
  function royaumesDiplo() { return Object.keys(FF.FACTIONS).filter(function (k) { var F = FF.FACTIONS[k]; return k !== 'latins' && k !== 'romains' && k !== 'legende' && capitale(k); }); }
  function capitale(f) {
    if (FF.CAPITALES[f]) return FF.CAPITALES[f];
    var l = Object.keys(FF.LIEUX).filter(function (k) { return FF.LIEUX[k].faction === f && !FF.LIEUX[k].village; })[0];
    return l || Object.keys(FF.LIEUX).filter(function (k) { return FF.LIEUX[k].faction === f; })[0] || null;
  }
  function relation(f) {
    if (S.rel[f] == null) {
      var maRel = FF.FACTIONS[S.faction].religion, r = FF.FACTIONS[f].religion;
      S.rel[f] = r === maRel ? 10 : FF.RELIGIONS[r].groupe === 'chretien' ? 0 : -15;
    }
    return S.rel[f];
  }
  function changerRel(f, n) { S.rel[f] = Math.max(-100, Math.min(100, relation(f) + n)); }
  function nomRel(r) { return r >= 50 ? 'amitié' : r >= 20 ? 'bonne entente' : r > -20 ? 'neutre' : r > -50 ? 'méfiance' : 'hostilité'; }
  function nouvelle(t) { S.nouvelles.unshift({ j: S.jour, t: t }); if (S.nouvelles.length > 30) S.nouvelles.length = 30; }
  function enGuerre(f) { return S.guerres.filter(function (g) { return g.a === f || g.b === f; }).map(function (g) { return g.a === f ? g.b : g.a; }); }
  function guerreEntre(a, b) { return S.guerres.filter(function (g) { return (g.a === a && g.b === b) || (g.a === b && g.b === a); })[0]; }
  function initMonde() {
    if (S.guerres) return;
    S.guerres = FF.GUERRES.map(function (g) { return { a: g[0], b: g[1], fa: Math.round(Math.random() * 30), fb: Math.round(Math.random() * 30), debut: S.jour }; });
  }
  // Le temps passe : messagers, guerres, revenus du fief
  function majMonde(jours) {
    initMonde();
    // messagers arrivés
    S.courriers = S.courriers.filter(function (c) {
      if (S.jour < c.arrive) return true;
      var g = 6 + Math.floor(Math.random() * 6) + (c.cadeau ? 6 : 0);
      changerRel(c.f, g);
      nouvelle('🕊️ Ton messager est arrivé à ' + FF.LIEUX[capitale(c.f)].nom + ' : relation avec ' + FF.FACTIONS[c.f].nom + ' +' + g + '.');
      petitMsg('🕊️ Ton messager est bien arrivé : ' + FF.FACTIONS[c.f].nom + ' +' + g);
      return false;
    });
    // guerres : la fatigue de guerre monte jusqu'à la paix
    S.guerres = S.guerres.filter(function (g) {
      g.fa += jours * (0.3 + Math.random() * 0.5); g.fb += jours * (0.3 + Math.random() * 0.5);
      if (g.fa >= 100 || g.fb >= 100) {
        var perdant = g.fa >= g.fb ? g.a : g.b, gagnant = perdant === g.a ? g.b : g.a;
        S.paix[g.a + '|' + g.b] = S.jour + 60;
        nouvelle('🕊️ Paix entre ' + FF.FACTIONS[g.a].nom + ' et ' + FF.FACTIONS[g.b].nom + '. Épuisé, ' + FF.FACTIONS[perdant].nom + ' cède à ' + FF.FACTIONS[gagnant].nom + '.');
        return false;
      }
      return true;
    });
    // nouvelles guerres (rivalités de l'époque)
    S.prochaineGuerre = S.prochaineGuerre || S.jour + 15;
    if (S.jour >= S.prochaineGuerre) {
      S.prochaineGuerre = S.jour + 15 + Math.floor(Math.random() * 15);
      var libres = FF.RIVAUX.filter(function (r) { return !guerreEntre(r[0], r[1]) && !((S.paix[r[0] + '|' + r[1]] || 0) > S.jour || (S.paix[r[1] + '|' + r[0]] || 0) > S.jour); });
      if (S.guerres.length < 9 && libres.length && Math.random() < 0.6) {
        var r = libres[Math.floor(Math.random() * libres.length)];
        S.guerres.push({ a: r[0], b: r[1], fa: 0, fb: 0, debut: S.jour });
        nouvelle('⚔️ ' + FF.FACTIONS[r[0]].nom + ' déclare la guerre à ' + FF.FACTIONS[r[1]].nom + ' !');
        if (S.suzerain === r[0] || S.suzerain === r[1]) petitMsg('⚔️ Ton suzerain est en guerre ! Ouvre 🕊️ Royaumes pour le servir.');
      }
    }
    // fief : revenus chaque semaine, raids en temps de guerre
    if (S.fief) {
      var gagne = 0;
      while (S.jour - S.fiefMaj >= 7) {
        S.fiefMaj += 7;
        var rev = revenuFief(), raid = enGuerre(S.suzerain).length && Math.random() < 0.3;
        if (raid) {
          var force = 4 + Math.floor(Math.random() * 8) + niveau(), def = defenseFief();
          if (def >= force) { S.or += rev; changerRel(S.suzerain, 2); nouvelle('🛡️ Des pillards ennemis ont attaqué ' + FF.LIEUX[S.fief].nom + '. Ta garnison les a repoussés ! (+' + rev + ' or)'); }
          else {
            var ks = Object.keys(S.garnison).filter(function (k) { return S.garnison[k] > 0; });
            if (ks.length) { var k = ks[Math.floor(Math.random() * ks.length)]; S.garnison[k]--; if (!S.garnison[k]) delete S.garnison[k]; }
            nouvelle('🔥 ' + FF.LIEUX[S.fief].nom + ' a été pillé ! Pas de revenus cette semaine. Renforce ta garnison.');
          }
        } else { S.or += rev; gagne += rev; }
      }
      if (gagne) { nouvelle('💰 Ton fief de ' + FF.LIEUX[S.fief].nom + ' t\'a rapporté ' + gagne + ' or.'); petitMsg('💰 Revenus de ton fief : +' + gagne + ' or'); }
    }
  }
  function revenuFief() { return (FF.LIEUX[S.fief].village ? 35 : 55) + S.fiefNiv * 15 + Math.max(0, Math.floor(relation(S.suzerain) / 10)) * 3; }
  function defenseFief() { var d = S.fiefNiv * 3; for (var k in S.garnison) d += S.garnison[k] * Math.max(1, Math.round(FF.UNITES[k].pv / 30)); return d; }
  function choisirFief(f) {
    var v = Object.keys(FF.LIEUX).filter(function (k) { return FF.LIEUX[k].faction === f && FF.LIEUX[k].village; });
    if (v.length) return v[0];
    var c = Object.keys(FF.LIEUX).filter(function (k) { return FF.LIEUX[k].faction === f && k !== capitale(f) && !estCamp(k); });
    return c.length ? c[c.length - 1] : capitale(f);
  }
  function joursVers(lieu) { if (lieu === S.lieu) return 1; var ch = trajet(S.lieu, lieu); return ch.length ? ch.reduce(function (s, e) { return s + e.jours; }, 0) : 20; }

  function diplomatie(retour) {
    initMonde();
    var h = '';
    if (S.suzerain) h += '<p class="objectif">👑 Tu es vassal de <b>' + esc(FF.FACTIONS[S.suzerain].nom) + '</b> · 🏰 Fief : <b>' + esc(FF.LIEUX[S.fief].nom) + '</b> (' + revenuFief() + ' or par semaine, défense ' + defenseFief() + ')</p>';
    else h += '<p class="muted">Gagne la confiance d\'un royaume (relation 25 ou plus, niveau 2) pour lui prêter serment : il te donnera un fief.</p>';
    if (S.nouvelles.length) h += '<h3>📜 Nouvelles</h3><ul class="nouvelles">' + S.nouvelles.slice(0, 4).map(function (n) { return '<li><small>' + esc(dateTexte(n.j)) + '</small> ' + esc(n.t) + '</li>'; }).join('') + '</ul>';
    h += '<h3>👑 Royaumes</h3><div class="liste">' + royaumesDiplo().sort(function (a, b) { return relation(b) - relation(a); }).map(function (f) {
      var F = FF.FACTIONS[f], r = relation(f), g = enGuerre(f), enRoute = S.courriers.some(function (c) { return c.f === f; });
      var l = '<div class="ligneUnite diplo"><div><b><span class="pastille" style="background:' + F.couleur + '"></span>' + esc(F.nom) + (S.suzerain === f ? ' 👑' : '') + '</b>' +
        '<small>' + (F.souverain ? esc(F.souverain) + ' · ' : '') + 'Relation ' + r + ' (' + nomRel(r) + ')' + (g.length ? ' · ⚔️ en guerre contre ' + esc(g.map(function (x) { return FF.FACTIONS[x].nom; }).join(', ')) : '') + '</small></div><div>';
      l += enRoute ? '<small class="muted">🕊️ messager en route</small>' : '<button class="btn petit" data-msg="' + f + '"' + (S.or < 30 ? ' disabled' : '') + '>🕊️ Messager (30 or)</button>';
      if (g.length && r >= 0) l += '<button class="btn petit or" data-servir="' + f + '"' + ((S.servi || 0) > S.jour ? ' disabled' : '') + '>⚔️ Servir</button>';
      if (!S.suzerain && r >= 25 && niveau() >= 2) l += '<button class="btn petit or" data-serment="' + f + '">🤝 Prêter serment</button>';
      if (S.suzerain === f) l += '<button class="btn petit" data-renoncer="1">Renoncer</button>';
      return l + '</div></div>';
    }).join('') + '</div>';
    if (S.guerres.length) h += '<h3>⚔️ Guerres en cours</h3>' + S.guerres.map(function (g) {
      return '<div class="guerre"><span>' + esc(FF.FACTIONS[g.a].nom) + '</span><b>contre</b><span>' + esc(FF.FACTIONS[g.b].nom) + '</span>' +
        '<small>Fatigue de guerre : ' + Math.round(g.fa) + ' % / ' + Math.round(g.fb) + ' % (à 100 %, un camp demande la paix)</small></div>';
    }).join('');
    h += '<p class="muted">🕊️ Un messager porte une lettre et un cadeau au souverain. Il met autant de jours que le voyage depuis ta position. ⚔️ Servir : tu combats pour un royaume en guerre (relation 0 ou plus) contre de l\'or et sa reconnaissance.</p>';
    fenetre('🕊️ Royaumes et diplomatie', h, retour);
    function act(sel, f) { Array.prototype.forEach.call($('fenCorps').querySelectorAll(sel), function (b) { b.onclick = function () { f(b); }; }); }
    act('[data-msg]', function (b) {
      var f = b.dataset.msg; if (S.or < 30) return;
      S.or -= 30; var j = joursVers(capitale(f)); S.courriers.push({ f: f, arrive: S.jour + j, cadeau: true });
      sauver(); majBarre(); M.son('or'); petitMsg('🕊️ Ton messager part pour ' + FF.LIEUX[capitale(f)].nom + ' (' + j + ' jours).'); diplomatie(retour);
    });
    act('[data-serment]', function (b) {
      var f = b.dataset.serment; S.suzerain = f; S.fief = choisirFief(f); S.fiefMaj = S.jour; S.renom += 5; S.garnison = S.garnison || {};
      enGuerre(f).forEach(function (e) { changerRel(e, -10); });
      nouvelle('👑 Tu prêtes serment à ' + FF.FACTIONS[f].souverain + '. Tu reçois le fief de ' + FF.LIEUX[S.fief].nom + '.');
      sauver(); majBarre(); M.son('victoire');
      $('fenetre').onFerme = null; $('fenetre').classList.add('hide');
      dialogue([{ q: 'narrateur', t: 'Tu t\'agenouilles devant ' + FF.FACTIONS[f].souverain + ' et places tes mains dans les siennes. C\'est l\'hommage : tu deviens son vassal.' },
        { q: 'narrateur', t: 'En échange de ta fidélité, il te confie le fief de ' + FF.LIEUX[S.fief].nom + '. Il te rapportera de l\'or chaque semaine. Laisse-y une garnison pour le protéger des pillards.' }], function () { diplomatie(retour); });
    });
    act('[data-renoncer]', function () {
      changerRel(S.suzerain, -30); nouvelle('Tu renonces à ton serment envers ' + FF.FACTIONS[S.suzerain].nom + '. Ton fief lui revient.');
      for (var k in S.garnison) S.troupes[k] = (S.troupes[k] || 0) + S.garnison[k];
      S.suzerain = null; S.fief = null; S.garnison = {}; S.fiefNiv = 0; sauver(); diplomatie(retour);
    });
    act('[data-servir]', function (b) { servir(b.dataset.servir, retour); });
  }
  function servir(f, retour) {
    var ennemi = enGuerre(f)[0]; if (!ennemi) return;
    var Lc = FF.LIEUX[capitale(ennemi)], R = FF.RENCONTRES[Lc.region] || FF.RENCONTRES.occident;
    var paie = 40 + niveau() * 15, vassal = S.suzerain === f;
    $('fenetre').onFerme = null; $('fenetre').classList.add('hide');
    S.servi = S.jour + 5;
    combat({ titre: 'Pour ' + FF.FACTIONS[f].nom + ' contre ' + FF.FACTIONS[ennemi].nom, decor: R.decor, vagues: R.vagues.concat([R.vagues[0]]) }, function (res) {
      if (!res.victoire) return diplomatie(retour);
      var g = guerreEntre(f, ennemi); if (g) { if (g.a === ennemi) g.fa += 15; else g.fb += 15; }
      S.or += paie; S.renom += 3; changerRel(f, vassal ? 8 : 5); changerRel(ennemi, -5);
      nouvelle('⚔️ Tu as battu une troupe de ' + FF.FACTIONS[ennemi].nom + ' pour ' + FF.FACTIONS[f].nom + ' (+' + paie + ' or).');
      sauver(); majBarre(); diplomatie(retour);
    }, {});
  }
  function fief(retour) {
    var L = FF.LIEUX[S.fief], h = '<p>' + esc(L.desc) + '</p>';
    h += '<p>💰 Revenus : <b>' + revenuFief() + ' or</b> par semaine · 🛡️ Défense : <b>' + defenseFief() + '</b>' + (enGuerre(S.suzerain).length ? ' · <span class="rouge">⚔️ ton suzerain est en guerre : des pillards peuvent attaquer</span>' : '') + '</p>';
    var cout = 200 + S.fiefNiv * 150, noms = ['un moulin', 'une palissade de bois', 'une tour de pierre'];
    if (S.fiefNiv < 3) h += '<button class="btn or" id="developper"' + (S.or < cout ? ' disabled' : '') + '>🏗️ Construire ' + noms[S.fiefNiv] + ' (' + cout + ' or) : +15 or par semaine, +3 défense</button>';
    else h += '<p class="muted">Ton domaine est entièrement développé.</p>';
    h += '<h3>Garnison</h3><div class="liste">';
    var ks = {}; Object.keys(S.troupes).concat(Object.keys(S.garnison)).forEach(function (k) { ks[k] = 1; });
    h += Object.keys(ks).map(function (k) {
      return '<div class="ligneUnite"><div><b>' + esc(FF.UNITES[k].nom) + '</b><small>Avec toi : ' + (S.troupes[k] || 0) + ' · En garnison : ' + (S.garnison[k] || 0) + '</small></div><div>' +
        '<button class="btn petit" data-laisser="' + k + '"' + (!S.troupes[k] ? ' disabled' : '') + '>Laisser 1</button><button class="btn petit" data-reprendre="' + k + '"' + (!S.garnison[k] || nbTroupes() >= placeTroupes() ? ' disabled' : '') + '>Reprendre 1</button></div></div>';
    }).join('') + '</div><p class="muted">Les soldats en garnison ne te suivent pas au combat, mais protègent ton fief des pillards.</p>';
    fenetre('🏰 Mon fief de ' + L.nom, h, retour);
    function act(sel, f) { Array.prototype.forEach.call($('fenCorps').querySelectorAll(sel), function (b) { b.onclick = function () { f(b); sauver(); majBarre(); fief(retour); }; }); }
    act('[data-laisser]', function (b) { var k = b.dataset.laisser; if (!S.troupes[k]) return; S.troupes[k]--; if (!S.troupes[k]) delete S.troupes[k]; S.garnison[k] = (S.garnison[k] || 0) + 1; });
    act('[data-reprendre]', function (b) { var k = b.dataset.reprendre; if (!S.garnison[k] || nbTroupes() >= placeTroupes()) return; S.garnison[k]--; if (!S.garnison[k]) delete S.garnison[k]; S.troupes[k] = (S.troupes[k] || 0) + 1; });
    act('#developper', function () { var c = 200 + S.fiefNiv * 150; if (S.or < c || S.fiefNiv >= 3) return; S.or -= c; S.fiefNiv++; M.son('victoire'); petitMsg('🏗️ Travaux terminés !'); });
  }

  // ---------- Héros de taverne ----------
  var MAX_HEROS = 4;
  function talent(t) { return S.compagnons.some(function (c) { return FF.COMPAGNONS[c] && FF.COMPAGNONS[c].talent === t; }); }
  function lieuHeros(h) { return h.villes[(Math.floor(S.jour / 10) + hashTxt(h.id)) % h.villes.length]; }
  function herosIci(lieu) { return FF.HEROS.filter(function (h) { return S.compagnons.indexOf(h.id) < 0 && lieuHeros(h) === lieu; }); }
  function nbHeros() { return S.compagnons.filter(function (c) { return FF.COMPAGNONS[c] && FF.COMPAGNONS[c].taverne; }).length; }
  function ouEstHeros(id) { var h = FF.HEROS.filter(function (x) { return x.id === id; })[0]; return h ? FF.LIEUX[lieuHeros(h)].nom : ''; }
  function rencontreHeros(id, lieu, retour) {
    var Cp = FF.COMPAGNONS[id], T = FF.TALENTS[Cp.talent], U = Cp.unite;
    if (S.compagnons.indexOf(id) >= 0) return retour();
    $('fenetre').onFerme = null; $('fenetre').classList.add('hide');
    dialogue([{ q: id, t: Cp.pres }, { q: id, t: 'Je cherche un chef qui paie bien et qui ne meurt pas trop vite. Ce serait toi ?' }], function () {
      var h = '<p>' + esc(Cp.pres) + '</p><p><b>' + T.icone + ' ' + esc(T.nom) + '</b> : ' + esc(T.desc) + '</p>' +
        '<p class="muted">❤️ ' + U.pv + ' PV · ⚔️ ' + U.deg + (U.tir ? ' · 🏹 tir ' + U.tir.deg : '') + ' · Combat à tes côtés et te suit partout.</p>';
      var plein = nbHeros() >= MAX_HEROS;
      if (plein) h += '<p class="rouge">Tu as déjà ' + MAX_HEROS + ' héros engagés. Renvoies-en un (menu Compagnie) pour faire de la place.</p>';
      else if (S.or < Cp.prix) h += '<p class="rouge">Il te faut ' + Cp.prix + ' or (tu en as ' + S.or + ').</p>';
      else h += '<button class="btn or" id="engager">🤝 Engager pour ' + Cp.prix + ' or</button>';
      fenetre(T.icone + ' ' + Cp.nom, h, retour);
      var b = $('engager');
      if (b) b.onclick = function () {
        S.or -= Cp.prix; S.compagnons.push(id); S.discussions[id] = 0; sauver(); majBarre(); M.son('or');
        $('fenetre').onFerme = null; $('fenetre').classList.add('hide');
        dialogue([{ q: id, t: 'Marché conclu. Tu ne le regretteras pas.' }, { q: 'narrateur', t: Cp.nom + ' rejoint ta compagnie.' }], retour);
      };
    });
  }
  function renvoyerHeros(id) {
    var i = S.compagnons.indexOf(id);
    if (i >= 0 && FF.COMPAGNONS[id].taverne) { S.compagnons.splice(i, 1); sauver(); petitMsg(FF.COMPAGNONS[id].nom + ' quitte ta compagnie et retourne dans les tavernes.'); }
  }

  // ---------- Cours et intrigues ----------
  function cour(lieu, retour) {
    var Co = FF.COURS[lieu];
    S.opinion[lieu] = S.opinion[lieu] || {};
    var visite = 'cour_' + lieu + '_' + S.jour;
    var h = '<p class="muted">Gagne la confiance des courtisans : ils te révèlent leurs secrets. 💰 ' + S.or + ' or</p><div class="liste">';
    Co.courtisans.forEach(function (c) {
      var op = S.opinion[lieu][c.id] || 0;
      h += '<div class="ligneCour"><canvas data-por="' + c.id + '" width="96" height="96"></canvas><div><b>' + esc(FF.PERSOS[c.id].nom) + '</b><small>' + esc(c.role) + ' · Opinion : ' + coeurs(op) + '</small><p>' + esc(c.desc) + '</p>' +
        '<div class="rangee"><button class="btn petit" data-cp="' + c.id + '"' + (S.vus[visite + c.id] ? ' disabled' : '') + '>Discuter</button><button class="btn petit" data-cc="' + c.id + '"' + (S.or < 50 ? ' disabled' : '') + '>Présent (50 or)</button></div></div></div>';
    });
    h += '</div>';
    var intr = Co.intrigues.filter(function (i) { return S.etape >= i.min && !S.intrigues[i.id]; });
    intr.forEach(function (i) { h += '<button class="btn or" data-intr="' + i.id + '">🗝️ Intrigue : ' + esc(i.titre) + '</button>'; });
    fenetre('👑 ' + Co.titre, h, retour);
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-por]'), function (c) { var p = portrait(c.dataset.por); c.getContext('2d').drawImage(p, 0, 0); });
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-cp]'), function (b) {
      b.onclick = function () {
        var c = Co.courtisans.filter(function (x) { return x.id === b.dataset.cp; })[0];
        S.vus[visite + c.id] = true;
        S.opinion[lieu][c.id] = (S.opinion[lieu][c.id] || 0) + 1;
        sauver();
        $('fenetre').onFerme = null; $('fenetre').classList.add('hide');
        var lignes = [{ q: c.id, t: (S.opinion[lieu][c.id] >= 2 ? 'Entre nous… ' : 'On raconte que… ') + c.rumeur }];
        dialogue(lignes, function () { cour(lieu, retour); });
      };
    });
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-cc]'), function (b) {
      b.onclick = function () { if (S.or < 50) return; S.or -= 50; S.opinion[lieu][b.dataset.cc] = (S.opinion[lieu][b.dataset.cc] || 0) + 2; S.renom += 1; sauver(); M.son('or'); petitMsg('Ton présent est apprécié.'); cour(lieu, retour); };
    });
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-intr]'), function (b) {
      b.onclick = function () {
        var i = Co.intrigues.filter(function (x) { return x.id === b.dataset.intr; })[0];
        S.intrigues[i.id] = true; sauver();
        $('fenetre').onFerme = null; $('fenetre').classList.add('hide');
        dialogue(i.d, function () {
          if (!M.enVille()) { // l'intrigue a mené à un combat : on revient sur la carte
            ecran('carte'); return;
          }
          cour(lieu, retour);
        });
      };
    });
  }
  function coeurs(n) { return n <= 0 ? 'neutre' : '★'.repeat(Math.min(5, n)); }

  // ---------- Religion ----------
  function pretre(lieu, pnj, retour, rel) {
    var L = FF.LIEUX[lieu], R = FF.RELIGIONS[rel || L.religion]; rel = rel || L.religion;
    var h = '<h3>' + (R.icone || '') + ' ' + esc(R.nom) + '</h3><p>' + esc(R.texte) + '</p>';
    if (R.chef) h += '<p>👤 <b>Chef en 1096 :</b> ' + esc(R.chef) + '</p><p>🏛️ <b>Lieu de prière :</b> ' + esc(R.culte) + '</p><p>🎉 <b>Fêtes :</b> ' + esc(R.fete) + '</p>';
    if (lieu === 'jerusalem' && rel === L.religion) h += '<p class="muted">À Jérusalem, les lieux saints des trois religions sont à quelques rues les uns des autres : le Saint-Sépulcre, le mont du Temple et le Dôme du Rocher, le mur occidental.</p>';
    var su = 'savoir_' + rel;
    if (!S.vus[su]) h += '<button class="btn or" id="apprendre">📖 Écouter et apprendre leur foi : +2 renommée, meilleure entente avec leurs villages</button>';
    else h += '<p class="muted">📖 Tu connais déjà cette religion. Ses villages t\'accueillent mieux.</p>';
    var cle = 'offrande_' + lieu + '_' + rel + '_' + S.jour;
    h += '<button class="btn" id="offrande"' + (S.vus[cle] || S.or < 20 ? ' disabled' : '') + '>Faire une aumône aux pauvres (20 or) : +3 renommée</button>';
    if (rel !== FF.FACTIONS[S.faction].religion) h += '<p class="muted">Ce n\'est pas ta religion, mais le respect ouvre bien des portes.</p>';
    fenetre(pnj.data.icone + ' ' + pnj.nom, h, retour);
    $('offrande').onclick = function () { if (S.or < 20) return; S.or -= 20; S.renom += 3; S.vus[cle] = true; sauver(); majBarre(); M.son('or'); petitMsg('Les pauvres te bénissent.'); pretre(lieu, pnj, retour, rel); };
    var ap = $('apprendre');
    if (ap) ap.onclick = function () {
      S.vus[su] = true; S.renom += 2;
      Object.keys(S.villages).forEach(function (v) { if (FF.LIEUX[v].religion === rel) S.villages[v].rel += 5; });
      sauver(); majBarre(); M.son('victoire'); petitMsg('Tu connais maintenant ' + nbReligions() + ' religions sur ' + religionsReelles().length + '.');
      pretre(lieu, pnj, retour, rel);
    };
  }
  function religionsReelles() { return Object.keys(FF.RELIGIONS).filter(function (k) { return k !== 'mystere'; }); }
  function nbReligions() { return religionsReelles().filter(function (k) { return S.vus['savoir_' + k]; }).length; }

  // ---------- Compagnie, journal, codex ----------
  function compagnie() {
    var h = '<div class="statsHeros"><canvas id="porHeros" width="96" height="96"></canvas><div><b>' + esc(S.heros) + '</b><small>' + esc(FF.FACTIONS[S.faction].nom) + '</small>' +
      '<p>Niveau ' + niveau() + ' · ⭐ ' + S.renom + ' renommée · ❤️ ' + pvMax() + ' PV · 💰 ' + S.or + ' or</p>' +
      '<p>Faveur : ✝️ Latins ' + S.fav.latins + ' · ☦️ Romains ' + S.fav.romains + ' · 📖 Religions connues : ' + nbReligions() + ' / ' + religionsReelles().length + '</p></div></div>';
    h += '<h3>Bonus de ta faction</h3><ul>' + FF.FACTIONS[S.faction].bonus.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>';
    h += '<h3>Armes en main</h3><p>' + S.equip.map(function (a) { return esc(FF.ARMES[a].nom); }).join(' · ') + ' <span class="muted">(change-les chez un forgeron)</span></p>';
    h += '<h3>Compagnons (' + nbHeros() + ' / ' + MAX_HEROS + ' héros engagés)</h3>' + (S.compagnons.length ? '<ul>' + S.compagnons.map(function (c) {
      var Cp = FF.COMPAGNONS[c];
      if (Cp.taverne) { var T = FF.TALENTS[Cp.talent]; return '<li>' + esc(Cp.nom) + ' · ' + T.icone + ' ' + esc(T.nom) + ' <small class="muted">(' + esc(T.desc) + ')</small> <button class="btn petit" data-renvoi="' + c + '">Renvoyer</button></li>'; }
      return '<li>' + esc(Cp.nom) + (c !== 'yusuf' ? ' · ❤️ ' + (S.aff[c] || 0) + (S.drapeaux['romance_' + c] ? ' 💕' : '') : ' (guide, ne combat pas)') + '</li>'; }).join('') + '</ul>' : '<p class="muted">Aucun pour l\'instant.</p>');
    h += '<p class="muted">🍺 Des héros attendent dans les tavernes : ' + FF.HEROS.filter(function (x) { return S.compagnons.indexOf(x.id) < 0; }).map(function (x) { return esc(x.nom.split(' ')[0]) + ' (' + esc(ouEstHeros(x.id)) + ')'; }).join(', ') + '.</p>';
    h += '<p>⛓️ Prisonniers : ' + nbPrisonniers() + ' / ' + capPrisonniers() + (S.suzerain ? ' · 👑 Vassal de ' + esc(FF.FACTIONS[S.suzerain].nom) + ' · 🏰 Fief : ' + esc(FF.LIEUX[S.fief].nom) : '') + '</p>';
    h += '<h3>Troupes (' + nbTroupes() + ' / ' + placeTroupes() + ')</h3>';
    var ks = Object.keys(S.troupes);
    h += ks.length ? '<div class="liste">' + ks.map(function (k) {
      var c = promoDe(k), U = FF.UNITES[k], ligne = '<div class="ligneUnite"><div><b>' + S.troupes[k] + ' × ' + esc(U.nom) + '</b>';
      if (c) {
        var need = U.promoXp || 10, xp = S.xp[k] || 0, cout = Math.round(FF.UNITES[c].prix * 0.4);
        ligne += '<small>Expérience ' + Math.min(xp, need) + ' / ' + need + ' pour devenir ' + esc(FF.UNITES[c].nom.toLowerCase()) + '</small></div>' +
          '<button class="btn or petit" data-promo="' + k + '"' + (xp < need || S.or < cout ? ' disabled' : '') + '>⬆️ Promouvoir 1 (' + cout + ' or)</button></div>';
      } else ligne += '</div></div>';
      return ligne;
    }).join('') + '</div><p class="muted">En bataille, jusqu\'à 11 soldats te suivent (les meilleurs d\'abord). Chaque victoire donne de l\'expérience aux troupes qui peuvent monter en grade.</p>' : '<p class="muted">Aucun soldat. Recrute dans les villes et les villages.</p>';
    majBanque();
    h += '<h3>Fortune</h3><p>💰 ' + S.or + ' or sur toi · 🏦 ' + S.banque.solde + ' or à la banque' + (S.banque.pret ? ' · 📜 dette : ' + S.banque.pret + ' or (à rendre avant le jour ' + S.banque.echeance + ', aujourd\'hui jour ' + S.jour + ')' : '') + '</p>';
    var inv = Object.keys(S.inv).filter(function (g) { return S.inv[g] > 0; });
    h += '<h3>Chargement (' + charge() + ' / ' + chargeMax() + ')</h3>' + (inv.length ? '<p>' + inv.map(function (g) { return FF.MARCH[g].icone + ' ' + S.inv[g] + ' ' + esc(FF.MARCH[g].nom.toLowerCase()); }).join(' · ') + '</p>' : '<p class="muted">Rien à vendre. Achète des marchandises au marché d\'une ville ou d\'un village.</p>');
    fenetre('🛡️ Ma compagnie', h);
    $('porHeros').getContext('2d').drawImage(portrait('heros'), 0, 0);
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-renvoi]'), function (b) { b.onclick = function () { renvoyerHeros(b.dataset.renvoi); compagnie(); }; });
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-promo]'), function (b) {
      b.onclick = function () {
        var k = b.dataset.promo, c = promoDe(k), U = FF.UNITES[k], need = U.promoXp || 10, cout = Math.round(FF.UNITES[c].prix * 0.4);
        if (!S.troupes[k] || (S.xp[k] || 0) < need || S.or < cout) return;
        S.or -= cout; S.xp[k] -= need; S.troupes[k]--; if (!S.troupes[k]) delete S.troupes[k];
        S.troupes[c] = (S.troupes[c] || 0) + 1; sauver(); majBarre(); M.son('victoire');
        petitMsg('Un ' + U.nom.toLowerCase() + ' devient ' + FF.UNITES[c].nom.toLowerCase() + ' !');
        compagnie();
      };
    });
  }
  function journal() {
    var e = etapeActuelle();
    var h = e ? '<p class="objectif">⭐ ' + esc(e.objectif) + '</p><p class="muted">Le lieu de ta mission est marqué d\'une étoile sur la carte.</p>' : '<p class="objectif">La démo est terminée ! Explore les lieux de légende ✦ et combats librement.</p>';
    h += '<h3>Chapitres</h3><ol class="chapitres">';
    FF.HISTOIRE[S.faction].forEach(function (c, i) { h += '<li class="' + (i < S.etape ? 'fait' : i === S.etape ? 'encours' : '') + '">' + esc(c.titre) + ' <small>' + esc(c.date) + '</small></li>'; });
    h += '</ol><h3>Lieux de légende ✦</h3><ul>';
    Object.keys(FF.LEGENDES).forEach(function (k) { h += '<li>' + (S.legendes[k] ? '✅ ' : '✦ ') + esc(FF.LIEUX[k].nom) + ' : ' + esc(FF.LEGENDES[k].titre) + '</li>'; });
    h += '</ul><h3>Tes choix</h3><ul>';
    var choix = { serment: 'Tu as conseillé de jurer fidélité à l\'empereur.', refus: 'Tu as conseillé de refuser le serment.', bertrand_epargne: 'Tu as épargné Bertrand de Mauves.', bertrand_juge: 'Tu as livré Bertrand aux barons.', antioche_romaine: 'Antioche a été rendue à l\'empereur (histoire alternative).', antioche_latine: 'Bohémond a gardé Antioche.', michel_arrete: 'Tu as démasqué le logothète Michel.', diplomate: 'Yusuf a parlé aux émirs de Kerbogha.', romance_melisende: 'Tu es en couple avec Mélisende.', romance_zoe: 'Tu es en couple avec Zoé.' };
    var any = false;
    Object.keys(choix).forEach(function (k) { if (S.drapeaux[k]) { any = true; h += '<li>' + esc(choix[k]) + '</li>'; } });
    if (!any) h += '<li class="muted">Pas encore de grand choix.</li>';
    h += '</ul>';
    fenetre('📜 Journal', h);
  }
  function codex() {
    var h = '<div class="onglets"><button class="btn petit actif" data-o="armes">Armes</button><button class="btn petit" data-o="religions">Religions</button><button class="btn petit" data-o="factions">Royaumes</button><button class="btn petit" data-o="troupes">Troupes</button></div><div id="codexCorps"></div>';
    fenetre('📖 Codex', h);
    function montre(o) {
      var c = '';
      if (o === 'armes') Object.keys(FF.ARMES).forEach(function (id) {
        var A = FF.ARMES[id], a = S && S.armes.indexOf(id) >= 0;
        var cache = A.type === 'legendaire' && !a;
        c += '<div class="codexLigne ' + (A.type === 'legendaire' ? 'leg' : '') + '"><b>' + (cache ? '✦ ' : '') + esc(A.nom) + (a ? ' ✅' : '') + '</b><small>' + esc(A.origine) + '</small><p>' + esc(A.desc) + (A.pouvoir ? ' ✨ ' + esc(A.pouvoir.nom) + ' : ' + esc(A.pouvoir.desc) : '') + '</p></div>';
      });
      if (o === 'religions') Object.keys(FF.RELIGIONS).forEach(function (k) {
        var R = FF.RELIGIONS[k], ou = Object.keys(FF.LIEUX).filter(function (l) { return FF.LIEUX[l].religion === k || (FF.LIEUX[l].minorites || []).indexOf(k) >= 0; }).map(function (l) { return FF.LIEUX[l].nom; });
        c += '<div class="codexLigne"><b>' + (R.icone || '') + ' ' + esc(R.nom) + (S.vus['savoir_' + k] ? ' <span class="tag or">connue</span>' : '') + '</b><p>' + esc(R.texte) + '</p>' +
          (R.chef && k !== 'mystere' ? '<small>👤 ' + esc(R.chef) + '</small><small>🏛️ ' + esc(R.culte) + '</small><small>🎉 ' + esc(R.fete) + '</small>' : '') + (ou.length ? '<small>📍 ' + esc(ou.join(', ')) + '</small>' : '') + '</div>'; });
      if (o === 'factions') Object.keys(FF.FACTIONS).forEach(function (k) { var F = FF.FACTIONS[k]; if (k === 'legende') return; c += '<div class="codexLigne"><b><span class="pastille" style="background:' + F.couleur + '"></span> ' + esc(F.nom) + '</b><small>' + esc(FF.RELIGIONS[F.religion].nom) + '</small>' + (F.souverain ? '<p>👑 ' + esc(F.souverain) + '</p>' : '') + (F.histoire ? '<p>' + esc(F.histoire) + '</p>' : '') + (F.bonus ? '<ul>' + F.bonus.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' : '') + '</div>'; });
      if (o === 'troupes') Object.keys(FF.UNITES).forEach(function (k) { var U = FF.UNITES[k]; if (!U.prix) return; c += '<div class="codexLigne"><b>' + esc(U.nom) + (U.merc ? ' <span class="tag">mercenaire</span>' : '') + '</b><small>❤️ ' + U.pv + ' · ⚔️ ' + U.deg + (U.faction ? ' · ' + esc(FF.FACTIONS[U.faction].nom) + ' seulement' : '') + '</small>' + (U.histo ? '<p>' + esc(U.histo) + '</p>' : '') + '</div>'; });
      $('codexCorps').innerHTML = c;
    }
    montre('armes');
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-o]'), function (b) {
      b.onclick = function () { Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-o]'), function (x) { x.classList.toggle('actif', x === b); }); montre(b.dataset.o); };
    });
  }

  // ---------- Épilogue ----------
  function epilogue() {
    S.fini = true; sauver();
    quitterVilleSiBesoin();
    var l = [];
    l.push(S.drapeaux.paix ? 'Grâce à la reddition négociée, Jérusalem a été épargnée. Une histoire différente commence, où l\'on se souviendra de ton nom des deux côtés des murailles.' : S.drapeaux.protecteur ? 'Jérusalem est tombée dans le sang, comme dans l\'Histoire. Mais des familles entières te doivent la vie.' : 'Jérusalem est tombée. Tu as vaincu Raoul, mais la ville a payé un prix terrible.');
    l.push(S.drapeaux.antioche_romaine ? 'Antioche est redevenue romaine : Latins et Romains restent alliés, et l\'Empire envoie ses flottes au secours de la Terre sainte.' : 'Bohémond règne sur Antioche. La méfiance entre Latins et Romains ne fera que grandir.');
    if (S.drapeaux.romance_melisende) l.push('Mélisende ne rentre pas à Liège. Main dans la main, vous partez voir le monde.');
    else if (S.drapeaux.romance_zoe) l.push('Sur le pont du « Saint-Phocas », Zoé te tend la barre. Second capitaine, pour toujours.');
    l.push('Les armes des légendes sont rendues au Sanctuaire… sauf celles que tu gardes pour la suite.');
    var h = '<div class="epilogue">' + l.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      '<p class="or grand">✠ Fin de la démo ✠</p><p>Merci d\'avoir joué à <b>Ferrum et Fides</b> ! La version complète arrive plus tard (sur Steam) avec des chevaux, les ordres de chevalerie (Templiers, Hospitaliers), d\'autres croisades et plus de batailles.</p>' +
      '<p class="muted">Tu peux continuer à explorer : lieux de légende ✦, cour de Jérusalem, Frères de l\'Hôpital à recruter.</p></div>' +
      '<button class="btn or" id="okFin">Continuer à explorer</button>';
    fenetre('Épilogue', h);
    $('okFin').onclick = function () { $('fenetre').classList.add('hide'); ecran('carte'); };
  }

  // ---------- Aide et pause ----------
  function aide(suite) {
    var pc = '<ul class="touches"><li><kbd>Z Q S D</kbd> / <kbd>W A S D</kbd> se déplacer · <kbd>Maj</kbd> courir</li>' +
      '<li><kbd>Souris</kbd> tourner la caméra (clique d\'abord dans le jeu)</li>' +
      '<li><kbd>Clic gauche</kbd> frapper · <kbd>Clic droit</kbd> parer (au bon moment : parade parfaite !)</li>' +
      '<li><kbd>Espace</kbd> roulade · <kbd>X</kbd> / molette : changer d\'arme · <kbd>E</kbd> pouvoir de l\'arme légendaire</li>' +
      '<li><kbd>1</kbd> suivez-moi · <kbd>2</kbd> tenez la position · <kbd>3</kbd> chargez (ordres aux troupes)</li>' +
      '<li><kbd>Échap</kbd> pause</li></ul>' +
      '<p><b>Comme dans Mount &amp; Blade :</b> bouge la souris juste avant de frapper pour choisir la direction du coup (gauche, droite, haut, ou vers le bas pour l\'estoc). Active la <b>parade directionnelle</b> dans les options pour devoir parer dans la direction de la flèche affichée au-dessus de l\'ennemi.</p>' +
      '<p><b>En mer :</b> Z/S voiles, Q/D gouvernail, Espace tirer, E feu grégeois (Romains), F aborder.</p>';
    var mob = '<ul class="touches"><li>🕹️ Joystick à gauche pour bouger, glisse à droite pour tourner la caméra.</li><li>⚔️ frapper (glisse sur le bouton pour choisir la direction) · 🛡️ parer (maintenir) · 💨 roulade · ✨ pouvoir · ⇄ changer d\'arme · 🚩 ordre aux troupes</li><li>En mer : joystick = voiles et gouvernail, ⚔️ tirer, ✨ feu grégeois, ⇄ aborder.</li></ul>';
    fenetre('🎮 Commandes', (M.mobile ? mob : pc) + (suite ? '<button class="btn or" id="okAide">J\'ai compris, au combat !</button>' : ''), suite ? null : undefined);
    if (suite) $('okAide').onclick = function () { $('fenetre').classList.add('hide'); suite(); };
  }
  function menuPause() {
    if (!$('fenetre').classList.contains('hide') || !$('dialogue').classList.contains('hide')) return;
    M.pause(true);
    var h = '<button class="btn or" data-p="reprendre">▶️ Reprendre</button><button class="btn" data-p="aide">🎮 Commandes</button>' +
      '<button class="btn" data-p="son">' + (OPT.son ? '🔊 Son : oui' : '🔇 Son : non') + '</button>';
    if (M.enBataille() || M.enNaval()) h += '<button class="btn rouge" data-p="fuir">🏳️ Fuir le combat</button>';
    if (M.enVille()) h += '<button class="btn" data-p="sortir">🚪 Quitter la ville</button>';
    fenetre('Pause', h, function () { M.pause(false); });
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-p]'), function (b) {
      b.onclick = function () {
        var p = b.dataset.p;
        if (p === 'reprendre') fermerFenetre();
        else if (p === 'aide') { $('fenetre').onFerme = null; aide(); $('fenetre').onFerme = function () { M.pause(false); }; }
        else if (p === 'son') { OPT.son = !OPT.son; M.muet(!OPT.son); sauver(); $('fenetre').onFerme = null; $('fenetre').classList.add('hide'); menuPause(); }
        else if (p === 'fuir') { $('fenetre').onFerme = null; $('fenetre').classList.add('hide'); M.pause(false); if (M.enBataille()) M.abandonner(); else M.abandonnerNaval(); }
        else if (p === 'sortir') { $('fenetre').onFerme = null; $('fenetre').classList.add('hide'); M.pause(false); M.quitterVille(); }
      };
    });
  }
  $('btnPause').onclick = menuPause;

  // ---------- Barre du haut de la carte ----------
  function majBarre() {
    if (!S) return;
    $('barreDate').textContent = '📅 ' + dateTexte();
    $('barreOr').textContent = '💰 ' + S.or;
    $('barreTroupes').textContent = '👥 ' + nbTroupes() + '/' + placeTroupes();
    $('barreNiveau').textContent = '⭐ Niv. ' + niveau();
    var e = etapeActuelle();
    $('barreObjectif').textContent = e ? '⭐ ' + e.objectif : '✦ Démo terminée : explore les légendes';
  }
  $('bCompagnie').onclick = compagnie;
  $('bDiplo').onclick = function () { diplomatie(); };
  $('bJournal').onclick = journal;
  $('bCodex').onclick = codex;
  $('bMenu').onclick = function () { M.arreter(); accueil(); };
  $('barreObjectif').onclick = function () { var o = objectifLieu(); if (o) { centrerSur(o, VUE.z); choisirLieu(o); } };

  // ---------- Accueil et création ----------
  function accueil() {
    var d = lire();
    $('btnContinuer').classList.toggle('hide', !d);
    if (d) $('btnContinuer').textContent = '▶️ Continuer (' + d.heros + ', ' + FF.FACTIONS[d.faction].nom.split(' (')[0] + ')';
    $('optDiff').value = OPT.diff; $('optDir').checked = OPT.dir; $('optSon').checked = OPT.son;
    ecran('accueil');
  }
  $('btnContinuer').onclick = function () { S = completer(lire()); if (!S) return; OPT = Object.assign(OPT, S.options || {}); M.muet(!OPT.son); VUE.ok = false; ecran('carte'); centrerSur(S.lieu, 1.6); var e = etapeActuelle(); if (e) petitMsg('Objectif : ' + e.objectif); };
  $('btnNouvelle').onclick = function () {
    if (lire() && !confirm('Commencer une nouvelle partie ? L\'ancienne sera remplacée.')) return;
    choisirFaction('latins');
    ecran('creation');
  };
  var factionChoisie = 'latins';
  function choisirFaction(f) {
    factionChoisie = f;
    Array.prototype.forEach.call(document.querySelectorAll('[data-faction]'), function (b) { b.classList.toggle('actif', b.dataset.faction === f); });
    var F = FF.FACTIONS[f];
    $('detailFaction').innerHTML = '<p>' + esc(F.histoire) + '</p><ul>' + F.bonus.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul><p class="muted">' +
      (f === 'latins' ? 'Tu commences à Bouillon (Belgique) en 1096, comme écuyer de Godefroy.' : 'Tu commences à Constantinople en 1096, officier de l\'empereur Alexis.') + '</p>';
    var champ = $('nomHeros');
    if (!champ.dataset.touche) champ.value = f === 'latins' ? 'Aymeric' : 'Nikolaos';
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-faction]'), function (b) { b.onclick = function () { choisirFaction(b.dataset.faction); }; });
  $('nomHeros').addEventListener('input', function () { this.dataset.touche = '1'; });
  $('btnCommencer').onclick = function () {
    var nom = ($('nomHeros').value || '').trim().slice(0, 20) || (factionChoisie === 'latins' ? 'Aymeric' : 'Nikolaos');
    nouvellePartie(factionChoisie, nom);
    VUE.ok = false;
    ecran('carte');
    centrerSur(S.lieu, 1.6);
    var e = etapeActuelle();
    dialogue([
      { q: 'narrateur', t: factionChoisie === 'latins' ? '1096. Le pape Urbain II a appelé les chevaliers d\'Occident à partir vers Jérusalem. Dans les Ardennes, un jeune écuyer nommé ' + nom + ' ne se doute pas que sa vie va basculer.' : '1096. Des armées entières de « Francs » marchent vers Constantinople. L\'empereur Alexis s\'inquiète. Son jeune officier, ' + nom + ', va devoir les accompagner jusqu\'au bout du monde.' },
      { q: 'narrateur', t: 'Sur la carte, clique sur un lieu pour t\'y rendre. L\'étoile ⭐ montre ta mission. Entre dans les villes pour parler aux gens, recruter, acheter des armes et vivre l\'aventure.' }
    ], function () { M.pause(false); choisirLieu(e.lieu); });
  };
  $('btnRetourCreation').onclick = accueil;
  $('btnAide').onclick = function () { aide(); };
  $('optDiff').onchange = function () { OPT.diff = this.value; sauverOptions(); };
  $('optDir').onchange = function () { OPT.dir = this.checked; sauverOptions(); };
  $('optSon').onchange = function () { OPT.son = this.checked; M.muet(!OPT.son); sauverOptions(); };
  function sauverOptions() { var d = lire(); if (d) { d.options = OPT; try { localStorage.setItem(CLE, JSON.stringify(d)); } catch (e) {} } if (S) S.options = OPT; }
  // Bataille rapide (sans histoire)
  $('btnRapide').onclick = function () {
    var presets = [
      { titre: 'Embuscade dans les Ardennes', decor: 'foret', vagues: [[['brigand', 5]], [['noir', 3], ['noir_tir', 2]]], boss: 'gautier' },
      { titre: 'Choc à Dorylée', decor: 'desert', vagues: [[['seldjoukide', 4], ['archer_turc', 2]], [['seldjoukide', 5]]] },
      { titre: 'Duel contre le Cid', decor: 'desert', vagues: [], boss: 'cid', amical: true },
      { titre: 'La crypte hantée', decor: 'crypte', vagues: [[['spectre', 4]]], boss: 'paladin' },
      { mer: true, titre: 'Pirates en Méditerranée', ennemis: [['pirate', 3]] }
    ];
    var h = presets.map(function (p, i) { return '<button class="btn" data-pr="' + i + '">' + (p.mer ? '⚓ ' : '⚔️ ') + esc(p.titre) + '</button>'; }).join('') +
      '<div class="rangee"><button class="btn petit actif" data-f="latins">Latins</button><button class="btn petit" data-f="romains">Romains</button></div>';
    fenetre('⚔️ Bataille rapide', h);
    var fac = 'latins';
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-f]'), function (b) { b.onclick = function () { fac = b.dataset.f; Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-f]'), function (x) { x.classList.toggle('actif', x === b); }); }; });
    Array.prototype.forEach.call($('fenCorps').querySelectorAll('[data-pr]'), function (b) {
      b.onclick = function () {
        $('fenetre').classList.add('hide');
        var anc = S;
        S = { faction: fac, heros: fac === 'latins' ? 'Aymeric' : 'Nikolaos', troupes: fac === 'latins' ? { chevalier: 2, sergent: 3, arbaletrier: 2 } : { varegue: 2, skutatos: 3, toxotes: 2 },
          equip: fac === 'latins' ? ['ulfberht', 'excalibur'] : ['spathion', 'mjollnir'], armes: [], compagnons: [], renom: 50, or: 0, stats: { tues: 0, victoires: 0 }, drapeaux: {}, aff: {}, rapide: true };
        combat(presets[+b.dataset.pr], function () { S = anc; accueil(); }, {});
      };
    });
  };

  // ---------- Démarrage ----------
  window.addEventListener('resize', function () { if (!$('carte').classList.contains('hide')) redim(); });
  lireOptions();
  M.init($('vue3d'));
  accueil();
  // Pour les tests automatiques
  window.FFJeu = { etat: function () { return S; }, combat: combat, entrerLieu: entrerLieu, mission: mission, nouvellePartie: nouvellePartie, ecran: ecran, sauver: sauver,
    marche: marche, banque: banque, tournoi: tournoi, ancien: ancien, compagnie: compagnie, prixAchat: prixAchat, prixVente: prixVente, codex: codex, taverne: taverne, diplomatie: diplomatie, fief: fief, rancons: rancons, majMonde: majMonde, choisirLieu: choisirLieu, rencontreHeros: rencontreHeros, parlerPnj: parlerPnj, herosIci: herosIci };
})();
