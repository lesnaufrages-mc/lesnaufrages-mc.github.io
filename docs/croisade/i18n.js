/* Ferrum et Fides : langues (français / English).
   _t('texte français') renvoie la traduction anglaise si le joueur a choisi l'anglais (dictionnaire en.js).
   Les données du jeu (donnees.js) et les textes fixes de la page sont traduits au chargement. */
(function () {
  'use strict';
  var L = 'fr';
  try {
    L = localStorage.getItem('ferrum-langue') || '';
    if (!L) L = /^fr/i.test(navigator.language || 'fr') ? 'fr' : 'en';
  } catch (e) { L = 'fr'; }
  if (L !== 'en') L = 'fr';
  window.FF_LANGUE = L;
  document.documentElement.lang = L;
  window._t = function (s) {
    if (L !== 'en' || !window.FF_EN) return s;
    var r = window.FF_EN[s];
    return r === undefined ? s : r;
  };
  // Traduit en place toutes les phrases d'un objet de données (sauf les identifiants)
  var CLES_ID = { id: 1, q: 1, si: 1, drapeau: 1, lieu: 1, faction: 1, religion: 1, arme: 1, decor: 1, boss: 1, combat: 1, region: 1 };
  window.FF_traduireObjet = function (o, vus) {
    if (L !== 'en' || !window.FF_EN || !o || typeof o !== 'object') return;
    vus = vus || [];
    if (vus.indexOf(o) >= 0) return;
    vus.push(o);
    for (var k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k) || CLES_ID[k]) continue;
      var v = o[k];
      if (typeof v === 'string') { if (window.FF_EN[v] !== undefined) o[k] = window.FF_EN[v]; }
      else if (v && typeof v === 'object') window.FF_traduireObjet(v, vus);
    }
  };
  // Textes fixes de la page
  function traduirePage() {
    var sel = document.getElementById('optLangue');
    if (sel) sel.value = L;
    if (L !== 'en' || !window.FF_EN) return;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n, l = [];
    while ((n = w.nextNode())) l.push(n);
    l.forEach(function (n) {
      var brut = n.nodeValue, s = brut.trim();
      if (s && window.FF_EN[s] !== undefined) n.nodeValue = brut.replace(s, window.FF_EN[s]);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[title],[aria-label],[placeholder]'), function (e) {
      ['title', 'aria-label', 'placeholder'].forEach(function (a) { var v = e.getAttribute(a); if (v && window.FF_EN[v] !== undefined) e.setAttribute(a, window.FF_EN[v]); });
    });
  }
  window.FF_changerLangue = function (l) {
    try { localStorage.setItem('ferrum-langue', l); } catch (e) {}
    location.reload();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', traduirePage);
  else traduirePage();
})();
