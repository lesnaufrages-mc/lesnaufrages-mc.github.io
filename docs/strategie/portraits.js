/* Imperium of Wars — portraits peints des souverains (SVG dessiné par le code).
   Portrait.svg(personne, { coul, culture, age, taille }) renvoie le code SVG du portrait.
   personne : { nom, ne, sexe, look: { barbe, ch, tete } } (même format que le moteur).
   Si un vrai tableau existe pour ce personnage (TABLEAUX, dans tableaux.js), il est posé
   par-dessus le dessin : sans internet ou si l'image manque, le dessin reste visible. */
(function (root) {
  'use strict';
  var uid = 0;
  var PEAUX = {
    clair: ['#f3d2b3', '#d9a988'], moyen: ['#e2b48c', '#c08c66'], mat: ['#c99566', '#a06e45'], fonce: ['#a87148', '#7d5131']
  };
  var PEAU_CULTURE = { arabe: 'mat', turc: 'moyen', perse: 'mat', steppe: 'moyen', byz: 'moyen', ital: 'moyen', iber: 'moyen', caucase: 'moyen' };
  var CHEVEUX = { brun: '#4a2f1d', noir: '#1d1611', blond: '#c9a25a', roux: '#9a4a22', gris: '#8c8a86', blanc: '#e3e0d8', perruque: '#5b3b22' };

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function assombrir(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var f = function (v) { return Math.max(0, Math.min(255, Math.round(v * k))); };
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  function svg(p, o) {
    o = o || {};
    var tab = typeof TABLEAUX !== 'undefined' && p.nom ? TABLEAUX[p.nom + '|' + p.ne] : null;
    var id = 'pt' + (++uid), h = hash(p.nom || 'x'), look = p.look || {}, femme = p.sexe === 'f';
    var age = o.age == null ? 40 : o.age, enfant = age < 14;
    var coul = o.coul || '#7a1f1f', fonce = assombrir(coul, 0.55), clair = assombrir(coul, 1.25);
    var peau = PEAUX[PEAU_CULTURE[o.culture] || (h % 7 === 0 ? 'moyen' : 'clair')];
    var ch = look.ch || 'brun';
    if (ch !== 'perruque' && !enfant) { if (age >= 70) ch = 'blanc'; else if (age >= 55 && ch !== 'blanc') ch = 'gris'; }
    var cCh = CHEVEUX[ch] || CHEVEUX.brun;
    if (ch === 'perruque') cCh = ['#5b3b22', '#2e2119', '#cbb38a', '#d8d4cc'][h % 4];
    var barbe = femme || enfant ? 'rase' : look.barbe || 'rase';
    var tete = enfant ? (look.tete === 'turban' ? 'turban' : 'aucun') : look.tete || 'aucun';
    if (femme && tete !== 'voile' && tete !== 'couronne' && tete !== 'byzance' && tete !== 'aucun') tete = 'couronne';
    var cx = 50, fy = enfant ? 62 : 58, rx = enfant ? 14 : 16 + (h % 3), ry = enfant ? 16 : 20 + (h % 2);
    var s = [];
    s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="' + (o.taille || 64) + '" height="' + Math.round((o.taille || 64) * 1.2) + '" class="portrait" role="img" aria-label="' + (p.nom || '').replace(/"/g, '') + '">');
    s.push('<defs>' +
      '<radialGradient id="' + id + 'f" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#5a4a36"/><stop offset="0.6" stop-color="#2c241b"/><stop offset="1" stop-color="#140f0a"/></radialGradient>' +
      '<radialGradient id="' + id + 'p" cx="42%" cy="40%" r="70%"><stop offset="0" stop-color="' + peau[0] + '"/><stop offset="1" stop-color="' + peau[1] + '"/></radialGradient>' +
      '<linearGradient id="' + id + 'v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + clair + '"/><stop offset="1" stop-color="' + fonce + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="0.5" stop-color="#d4a017"/><stop offset="1" stop-color="#8a6a12"/></linearGradient>' +
      '<clipPath id="' + id + 'c"><rect x="5" y="5" width="90" height="110" rx="40" ry="46"/></clipPath>' +
      '</defs>');
    s.push('<rect x="1" y="1" width="98" height="118" rx="44" ry="50" fill="url(#' + id + 'o)"/>');
    s.push('<rect x="5" y="5" width="90" height="110" rx="40" ry="46" fill="url(#' + id + 'f)"/>');
    s.push('<g clip-path="url(#' + id + 'c)"><g transform="translate(50 66) scale(1.22) translate(-50 -60)">');

    // Perruque ou cheveux longs derrière les épaules
    if (ch === 'perruque') {
      for (var k = 0; k < 7; k++) {
        s.push('<circle cx="' + (cx - 24 + (k % 2) * 4) + '" cy="' + (fy - 14 + k * 8) + '" r="9" fill="' + assombrir(cCh, 0.9 + (k % 2) * 0.15) + '"/>');
        s.push('<circle cx="' + (cx + 24 - (k % 2) * 4) + '" cy="' + (fy - 14 + k * 8) + '" r="9" fill="' + assombrir(cCh, 0.9 + (k % 2) * 0.15) + '"/>');
      }
    } else if (femme && tete !== 'voile') {
      s.push('<path d="M' + (cx - 21) + ',' + (fy - 8) + ' Q' + (cx - 26) + ',' + (fy + 30) + ' ' + (cx - 16) + ',' + (fy + 42) + ' L' + (cx + 16) + ',' + (fy + 42) + ' Q' + (cx + 26) + ',' + (fy + 30) + ' ' + (cx + 21) + ',' + (fy - 8) + ' Z" fill="' + assombrir(cCh, 0.85) + '"/>');
    }
    if (tete === 'voile') s.push('<path d="M' + (cx - 26) + ',' + (fy - 6) + ' Q' + (cx - 30) + ',' + (fy + 40) + ' ' + (cx - 20) + ',' + (fy + 52) + ' L' + (cx + 20) + ',' + (fy + 52) + ' Q' + (cx + 30) + ',' + (fy + 40) + ' ' + (cx + 26) + ',' + (fy - 6) + ' Z" fill="#efe9dc" stroke="#cfc6b2" stroke-width="0.8"/>');

    // Buste et vêtements
    var by = fy + ry + 6;
    s.push('<path d="M8,124 Q10,' + (by + 6) + ' ' + (cx - 16) + ',' + by + ' L' + (cx + 16) + ',' + by + ' Q90,' + (by + 6) + ' 92,124 Z" fill="url(#' + id + 'v)"/>');
    if (/couronne|byzance|aucun|kalpak/.test(tete) && !femme) {
      // Manteau d'hermine
      s.push('<path d="M' + (cx - 30) + ',' + (by + 4) + ' Q' + cx + ',' + (by + 16) + ' ' + (cx + 30) + ',' + (by + 4) + ' L' + (cx + 34) + ',' + (by + 12) + ' Q' + cx + ',' + (by + 26) + ' ' + (cx - 34) + ',' + (by + 12) + ' Z" fill="#f4f1ea"/>');
      for (var e = 0; e < 7; e++) s.push('<rect x="' + (cx - 26 + e * 8.5) + '" y="' + (by + 9 + (e % 2) * 3 + Math.abs(e - 3) * -1.2) + '" width="1.6" height="3.2" fill="#1b1b1b"/>');
    } else if (tete === 'turban' || tete === 'fourrure') {
      s.push('<path d="M' + (cx - 6) + ',' + by + ' L' + cx + ',' + (by + 30) + ' L' + (cx + 6) + ',' + by + ' Z" fill="' + assombrir(coul, 0.4) + '"/>');
      s.push('<path d="M' + (cx - 30) + ',' + (by + 6) + ' Q' + cx + ',' + (by + 2) + ' ' + (cx + 30) + ',' + (by + 6) + '" stroke="url(#' + id + 'o)" stroke-width="2.4" fill="none"/>');
    } else if (tete === 'tiare') {
      s.push('<path d="M' + (cx - 34) + ',' + (by + 10) + ' Q' + cx + ',' + (by - 2) + ' ' + (cx + 34) + ',' + (by + 10) + ' L' + (cx + 34) + ',124 L' + (cx - 34) + ',124 Z" fill="#f2efe6"/>');
      s.push('<path d="M' + (cx - 8) + ',' + (by + 4) + ' L' + (cx - 8) + ',124 M' + (cx + 8) + ',' + (by + 4) + ' L' + (cx + 8) + ',124" stroke="url(#' + id + 'o)" stroke-width="3"/>');
    } else {
      s.push('<path d="M' + (cx - 14) + ',' + by + ' Q' + cx + ',' + (by + 12) + ' ' + (cx + 14) + ',' + by + '" stroke="#f4f1ea" stroke-width="3" fill="none"/>');
    }
    if (ch === 'perruque') s.push('<path d="M' + (cx - 8) + ',' + (by + 2) + ' l8,10 l8,-10 z" fill="#f8f6f0"/>');

    // Cou, oreilles, visage
    s.push('<rect x="' + (cx - 7) + '" y="' + (fy + ry - 6) + '" width="14" height="12" fill="' + peau[1] + '"/>');
    s.push('<ellipse cx="' + (cx - rx) + '" cy="' + (fy + 1) + '" rx="3" ry="5" fill="' + peau[1] + '"/><ellipse cx="' + (cx + rx) + '" cy="' + (fy + 1) + '" rx="3" ry="5" fill="' + peau[1] + '"/>');
    s.push('<ellipse cx="' + cx + '" cy="' + fy + '" rx="' + rx + '" ry="' + ry + '" fill="url(#' + id + 'p)"/>');
    // Joues
    s.push('<ellipse cx="' + (cx - rx * 0.55) + '" cy="' + (fy + 6) + '" rx="4" ry="2.6" fill="#d9776a" opacity="' + (femme ? 0.35 : 0.18) + '"/><ellipse cx="' + (cx + rx * 0.55) + '" cy="' + (fy + 6) + '" rx="4" ry="2.6" fill="#d9776a" opacity="' + (femme ? 0.35 : 0.18) + '"/>');
    // Yeux et sourcils
    var ey = fy - 3, ex = rx * 0.42, regard = (h % 3) - 1;
    s.push('<ellipse cx="' + (cx - ex) + '" cy="' + ey + '" rx="3.4" ry="2" fill="#f7f3ea"/><ellipse cx="' + (cx + ex) + '" cy="' + ey + '" rx="3.4" ry="2" fill="#f7f3ea"/>');
    s.push('<circle cx="' + (cx - ex + regard * 0.8) + '" cy="' + ey + '" r="1.5" fill="#2a1a10"/><circle cx="' + (cx + ex + regard * 0.8) + '" cy="' + ey + '" r="1.5" fill="#2a1a10"/>');
    s.push('<path d="M' + (cx - ex - 4) + ',' + (ey - 2.2) + ' Q' + (cx - ex) + ',' + (ey - 4.5) + ' ' + (cx - ex + 4) + ',' + (ey - 2.6) + ' M' + (cx + ex - 4) + ',' + (ey - 2.6) + ' Q' + (cx + ex) + ',' + (ey - 4.5) + ' ' + (cx + ex + 4) + ',' + (ey - 2.2) + '" stroke="' + assombrir(cCh === CHEVEUX.blanc ? '#9b968c' : cCh, 0.8) + '" stroke-width="1.3" fill="none" stroke-linecap="round"/>');
    // Nez et bouche
    s.push('<path d="M' + cx + ',' + (ey + 1) + ' Q' + (cx - 2.6) + ',' + (ey + 8 + (h % 3)) + ' ' + (cx - 0.5) + ',' + (ey + 9 + (h % 3)) + ' Q' + (cx + 1.5) + ',' + (ey + 10 + (h % 3)) + ' ' + (cx + 2.5) + ',' + (ey + 9) + '" stroke="' + peau[1] + '" stroke-width="1.2" fill="none"/>');
    var my = fy + ry * 0.55;
    s.push('<path d="M' + (cx - 4.5) + ',' + my + ' Q' + cx + ',' + (my + 2 + (h % 2)) + ' ' + (cx + 4.5) + ',' + my + '" stroke="' + (femme ? '#a3423b' : '#8a4b3c') + '" stroke-width="' + (femme ? 1.8 : 1.3) + '" fill="none" stroke-linecap="round"/>');
    if (age >= 50) s.push('<path d="M' + (cx - 9) + ',' + (ey + 5) + ' q-2,4 0,8 M' + (cx + 9) + ',' + (ey + 5) + ' q2,4 0,8" stroke="' + peau[1] + '" stroke-width="0.8" fill="none" opacity="0.8"/>');

    // Barbe
    var cB = assombrir(cCh, 0.95);
    if (barbe === 'pleine' || barbe === 'longue') {
      var bas = fy + ry + (barbe === 'longue' ? 16 : 6);
      s.push('<path d="M' + (cx - rx + 1) + ',' + (fy + 1) + ' Q' + (cx - rx + 2) + ',' + (bas - 4) + ' ' + cx + ',' + bas + ' Q' + (cx + rx - 2) + ',' + (bas - 4) + ' ' + (cx + rx - 1) + ',' + (fy + 1) + ' Q' + (cx + rx * 0.6) + ',' + (my + 4) + ' ' + cx + ',' + (my + 3) + ' Q' + (cx - rx * 0.6) + ',' + (my + 4) + ' ' + (cx - rx + 1) + ',' + (fy + 1) + ' Z" fill="' + cB + '"/>');
    } else if (barbe === 'courte') {
      s.push('<path d="M' + (cx - rx + 2) + ',' + (fy + 4) + ' Q' + (cx - rx + 4) + ',' + (fy + ry + 1) + ' ' + cx + ',' + (fy + ry + 2) + ' Q' + (cx + rx - 4) + ',' + (fy + ry + 1) + ' ' + (cx + rx - 2) + ',' + (fy + 4) + ' Q' + (cx + rx * 0.5) + ',' + (my + 5) + ' ' + cx + ',' + (my + 4) + ' Q' + (cx - rx * 0.5) + ',' + (my + 5) + ' ' + (cx - rx + 2) + ',' + (fy + 4) + ' Z" fill="' + cB + '" opacity="0.92"/>');
    }
    if (barbe === 'pleine' || barbe === 'longue' || barbe === 'courte' || barbe === 'moustache') {
      s.push('<path d="M' + (cx - 8) + ',' + (my - 0.5) + ' Q' + (cx - 4) + ',' + (my - 4.5) + ' ' + cx + ',' + (my - 2.5) + ' Q' + (cx + 4) + ',' + (my - 4.5) + ' ' + (cx + 8) + ',' + (my - 0.5) + ' Q' + (cx + 4) + ',' + (my - 2) + ' ' + cx + ',' + (my - 1) + ' Q' + (cx - 4) + ',' + (my - 2) + ' ' + (cx - 8) + ',' + (my - 0.5) + ' Z" fill="' + cB + '"/>');
    }

    // Cheveux sur le front
    var hy = fy - ry;
    if (ch === 'perruque') {
      s.push('<path d="M' + (cx - rx - 4) + ',' + (fy - 2) + ' Q' + (cx - rx - 2) + ',' + (hy - 8) + ' ' + cx + ',' + (hy - 6) + ' Q' + (cx + rx + 2) + ',' + (hy - 8) + ' ' + (cx + rx + 4) + ',' + (fy - 2) + ' Q' + (cx + rx * 0.4) + ',' + (hy + 3) + ' ' + cx + ',' + (hy + 4) + ' Q' + (cx - rx * 0.4) + ',' + (hy + 3) + ' ' + (cx - rx - 4) + ',' + (fy - 2) + ' Z" fill="' + cCh + '"/>');
    } else if (!/turban|tiare|casque|fourrure|voile|bonnet|chapeau/.test(tete)) {
      s.push('<path d="M' + (cx - rx - 1) + ',' + (fy + (femme ? 4 : -2)) + ' Q' + (cx - rx) + ',' + (hy - 3) + ' ' + cx + ',' + (hy - 2) + ' Q' + (cx + rx) + ',' + (hy - 3) + ' ' + (cx + rx + 1) + ',' + (fy + (femme ? 4 : -2)) + ' Q' + (cx + rx - 3) + ',' + (hy + 6) + ' ' + cx + ',' + (hy + 5) + ' Q' + (cx - rx + 3) + ',' + (hy + 6) + ' ' + (cx - rx - 1) + ',' + (fy + (femme ? 4 : -2)) + ' Z" fill="' + cCh + '"/>');
    }

    // Coiffes
    var o2 = 'url(#' + id + 'o)';
    if (tete === 'couronne') {
      var cy = hy + (femme ? 4 : 3), l = rx + 2;
      s.push('<path d="M' + (cx - l) + ',' + (cy + 2) + ' L' + (cx - l) + ',' + (cy - 7) + ' L' + (cx - l * 0.6) + ',' + (cy - 2) + ' L' + (cx - l * 0.3) + ',' + (cy - 10) + ' L' + cx + ',' + (cy - 3) + ' L' + (cx + l * 0.3) + ',' + (cy - 10) + ' L' + (cx + l * 0.6) + ',' + (cy - 2) + ' L' + (cx + l) + ',' + (cy - 7) + ' L' + (cx + l) + ',' + (cy + 2) + ' Z" fill="' + o2 + '" stroke="#6b4f0a" stroke-width="0.6"/>');
      s.push('<rect x="' + (cx - l) + '" y="' + (cy - 1) + '" width="' + l * 2 + '" height="4" fill="' + o2 + '" stroke="#6b4f0a" stroke-width="0.5"/>');
      s.push('<circle cx="' + cx + '" cy="' + (cy + 1) + '" r="1.5" fill="#c81e3a"/><circle cx="' + (cx - l * 0.55) + '" cy="' + (cy + 1) + '" r="1.2" fill="#1e5fc8"/><circle cx="' + (cx + l * 0.55) + '" cy="' + (cy + 1) + '" r="1.2" fill="#1e8a4a"/>');
    } else if (tete === 'byzance') {
      var by2 = hy + 1;
      s.push('<path d="M' + (cx - rx - 1) + ',' + (by2 + 2) + ' Q' + (cx - rx) + ',' + (by2 - 16) + ' ' + cx + ',' + (by2 - 17) + ' Q' + (cx + rx) + ',' + (by2 - 16) + ' ' + (cx + rx + 1) + ',' + (by2 + 2) + ' Z" fill="' + o2 + '" stroke="#6b4f0a" stroke-width="0.6"/>');
      s.push('<path d="M' + (cx - rx) + ',' + (by2 - 6) + ' L' + (cx + rx) + ',' + (by2 - 6) + '" stroke="#c81e3a" stroke-width="2"/>');
      s.push('<path d="M' + cx + ',' + (by2 - 23) + ' L' + cx + ',' + (by2 - 16) + ' M' + (cx - 3) + ',' + (by2 - 20) + ' L' + (cx + 3) + ',' + (by2 - 20) + '" stroke="' + o2 + '" stroke-width="1.6"/>');
      for (var q = 0; q < 4; q++) {
        s.push('<circle cx="' + (cx - rx - 1) + '" cy="' + (by2 + 4 + q * 4) + '" r="1.3" fill="#f5f0e6"/><circle cx="' + (cx + rx + 1) + '" cy="' + (by2 + 4 + q * 4) + '" r="1.3" fill="#f5f0e6"/>');
      }
    } else if (tete === 'turban') {
      var tc = h % 3 === 0 ? '#2f6b4f' : '#f2ede2', ty = hy + 4;
      s.push('<path d="M' + (cx - rx - 5) + ',' + (ty + 2) + ' Q' + (cx - rx - 8) + ',' + (ty - 22) + ' ' + cx + ',' + (ty - 24) + ' Q' + (cx + rx + 8) + ',' + (ty - 22) + ' ' + (cx + rx + 5) + ',' + (ty + 2) + ' Q' + cx + ',' + (ty + 6) + ' ' + (cx - rx - 5) + ',' + (ty + 2) + ' Z" fill="' + tc + '" stroke="' + assombrir(tc, 0.75) + '" stroke-width="0.8"/>');
      for (var t = 0; t < 4; t++) s.push('<path d="M' + (cx - rx - 4) + ',' + (ty - 3 - t * 5) + ' Q' + cx + ',' + (ty + 1 - t * 6) + ' ' + (cx + rx + 4) + ',' + (ty - 7 - t * 5) + '" stroke="' + assombrir(tc, 0.8) + '" stroke-width="0.9" fill="none"/>');
      s.push('<circle cx="' + cx + '" cy="' + (ty - 8) + '" r="2.6" fill="#c81e3a" stroke="' + o2 + '" stroke-width="1"/>');
      s.push('<path d="M' + cx + ',' + (ty - 10) + ' Q' + (cx + 3) + ',' + (ty - 24) + ' ' + (cx + 7) + ',' + (ty - 30) + '" stroke="#f8f8f8" stroke-width="2.4" fill="none" stroke-linecap="round"/>');
    } else if (tete === 'tiare') {
      var ty2 = hy + 3;
      s.push('<path d="M' + (cx - rx + 1) + ',' + (ty2 + 2) + ' Q' + (cx - rx + 2) + ',' + (ty2 - 30) + ' ' + cx + ',' + (ty2 - 34) + ' Q' + (cx + rx - 2) + ',' + (ty2 - 30) + ' ' + (cx + rx - 1) + ',' + (ty2 + 2) + ' Z" fill="#f4f1ea" stroke="#cfc6b2" stroke-width="0.8"/>');
      [0, 10, 20].forEach(function (d) { s.push('<path d="M' + (cx - rx + 2 + d * 0.15) + ',' + (ty2 - d) + ' L' + (cx + rx - 2 - d * 0.15) + ',' + (ty2 - d) + '" stroke="' + o2 + '" stroke-width="2.4"/>'); });
      s.push('<circle cx="' + cx + '" cy="' + (ty2 - 36) + '" r="2" fill="' + o2 + '"/>');
    } else if (tete === 'corno') {
      var ty3 = hy + 4;
      s.push('<path d="M' + (cx - rx - 2) + ',' + (ty3 + 2) + ' Q' + (cx - rx) + ',' + (ty3 - 14) + ' ' + (cx + 4) + ',' + (ty3 - 22) + ' Q' + (cx + rx + 6) + ',' + (ty3 - 12) + ' ' + (cx + rx + 2) + ',' + (ty3 + 2) + ' Z" fill="#c9a227" stroke="#7a5d10" stroke-width="0.8"/>');
      s.push('<path d="M' + (cx - rx - 2) + ',' + (ty3 + 1) + ' L' + (cx + rx + 2) + ',' + (ty3 + 1) + '" stroke="#f4f1ea" stroke-width="3"/>');
    } else if (tete === 'casque') {
      var ty4 = hy + 3;
      s.push('<path d="M' + (cx - rx - 2) + ',' + (ty4 + 4) + ' Q' + (cx - rx) + ',' + (ty4 - 16) + ' ' + cx + ',' + (ty4 - 20) + ' Q' + (cx + rx) + ',' + (ty4 - 16) + ' ' + (cx + rx + 2) + ',' + (ty4 + 4) + ' Z" fill="#8d949b" stroke="#4b5056" stroke-width="0.8"/>');
      s.push('<path d="M' + (cx - rx - 2) + ',' + (ty4 + 2) + ' L' + (cx + rx + 2) + ',' + (ty4 + 2) + '" stroke="#5f656b" stroke-width="3"/><rect x="' + (cx - 1.5) + '" y="' + (ty4 + 2) + '" width="3" height="11" fill="#7b8289"/>');
      s.push('<path d="M' + (cx - 6) + ',' + (ty4 - 12) + ' Q' + (cx - 3) + ',' + (ty4 - 17) + ' ' + cx + ',' + (ty4 - 18) + '" stroke="#c9cfd5" stroke-width="1.2" fill="none"/>');
    } else if (tete === 'bonnet') {
      var ty5 = hy + 4;
      s.push('<path d="M' + (cx - rx - 2) + ',' + (ty5 + 2) + ' Q' + (cx - rx - 3) + ',' + (ty5 - 14) + ' ' + cx + ',' + (ty5 - 15) + ' Q' + (cx + rx + 3) + ',' + (ty5 - 14) + ' ' + (cx + rx + 2) + ',' + (ty5 + 2) + ' Z" fill="#9b1b1b" stroke="#5c0f0f" stroke-width="0.8"/>');
    } else if (tete === 'chapeau') {
      var ty6 = hy + 4;
      s.push('<path d="M' + (cx - rx - 6) + ',' + (ty6 + 2) + ' Q' + (cx - rx - 8) + ',' + (ty6 - 12) + ' ' + (cx - 4) + ',' + (ty6 - 16) + ' Q' + (cx + rx + 10) + ',' + (ty6 - 18) + ' ' + (cx + rx + 6) + ',' + (ty6 + 2) + ' Q' + cx + ',' + (ty6 + 6) + ' ' + (cx - rx - 6) + ',' + (ty6 + 2) + ' Z" fill="#1f2328" stroke="#0c0e10" stroke-width="0.8"/>');
      s.push('<path d="M' + (cx + rx + 4) + ',' + (ty6 - 2) + ' Q' + (cx + rx + 12) + ',' + (ty6 + 14) + ' ' + (cx + rx + 6) + ',' + (ty6 + 30) + '" stroke="#1f2328" stroke-width="5" fill="none"/>');
    } else if (tete === 'kalpak' || tete === 'fourrure') {
      var ty7 = hy + 4, haut = tete === 'fourrure' ? 22 : 14;
      if (tete === 'kalpak') s.push('<path d="M' + (cx - rx + 2) + ',' + ty7 + ' Q' + (cx - rx + 2) + ',' + (ty7 - haut - 6) + ' ' + cx + ',' + (ty7 - haut - 8) + ' Q' + (cx + rx - 2) + ',' + (ty7 - haut - 6) + ' ' + (cx + rx - 2) + ',' + ty7 + ' Z" fill="' + coul + '" stroke="' + o2 + '" stroke-width="1"/>');
      else s.push('<path d="M' + (cx - rx - 3) + ',' + ty7 + ' Q' + (cx - rx + 2) + ',' + (ty7 - haut) + ' ' + cx + ',' + (ty7 - haut - 4) + ' Q' + (cx + rx - 2) + ',' + (ty7 - haut) + ' ' + (cx + rx + 3) + ',' + ty7 + ' Z" fill="#5a4330"/>');
      s.push('<rect x="' + (cx - rx - 4) + '" y="' + (ty7 - 5) + '" width="' + (rx * 2 + 8) + '" height="9" rx="4.5" fill="#6b5340"/>');
      for (var fz = 0; fz < 8; fz++) s.push('<circle cx="' + (cx - rx - 1 + fz * (rx * 2 + 2) / 7) + '" cy="' + (ty7 - 1 + (fz % 2)) + '" r="2.2" fill="#7c634d"/>');
      if (tete === 'kalpak') s.push('<path d="M' + cx + ',' + (ty7 - haut - 14) + ' L' + cx + ',' + (ty7 - haut - 7) + ' M' + (cx - 3) + ',' + (ty7 - haut - 11) + ' L' + (cx + 3) + ',' + (ty7 - haut - 11) + '" stroke="' + o2 + '" stroke-width="1.6"/>');
    } else if (tete === 'voile') {
      s.push('<path d="M' + (cx - rx - 5) + ',' + (fy + 4) + ' Q' + (cx - rx - 6) + ',' + (hy - 8) + ' ' + cx + ',' + (hy - 9) + ' Q' + (cx + rx + 6) + ',' + (hy - 8) + ' ' + (cx + rx + 5) + ',' + (fy + 4) + ' Q' + (cx + rx) + ',' + (hy + 2) + ' ' + cx + ',' + (hy + 1) + ' Q' + (cx - rx) + ',' + (hy + 2) + ' ' + (cx - rx - 5) + ',' + (fy + 4) + ' Z" fill="#efe9dc" stroke="#cfc6b2" stroke-width="0.8"/>');
      s.push('<path d="M' + (cx - rx + 1) + ',' + (hy + 1) + ' L' + (cx + rx - 1) + ',' + (hy + 1) + '" stroke="' + o2 + '" stroke-width="2.4"/><circle cx="' + cx + '" cy="' + (hy + 1) + '" r="1.6" fill="#c81e3a"/>');
    }
    // Vernis : léger reflet de tableau ancien
    s.push('<rect x="5" y="5" width="90" height="110" fill="#f7d58a" opacity="0.06"/>');
    s.push('</g></g>');
    if (tab) {
      // Vrai tableau (domaine public, Wikimedia Commons), recadré sur le visage.
      s.push('<image href="tableaux/' + tab[0] + '" x="5" y="5" width="90" height="110" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + id + 'c)"><title>' + (p.nom || '').replace(/</g, '') + ' · ' + tab[1].replace(/</g, '') + '</title></image>');
      s.push('<rect x="5" y="5" width="90" height="110" rx="40" ry="46" fill="none" stroke="#000" stroke-width="5" opacity="0.18"/>');
    }
    s.push('<rect x="5" y="5" width="90" height="110" rx="40" ry="46" fill="none" stroke="#3a2c10" stroke-width="1.2" opacity="0.7"/>');
    s.push('</svg>');
    return s.join('');
  }

  root.Portrait = { svg: svg };
})(this);
