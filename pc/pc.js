// Réglages propres à la version PC, ajoutés à la page du jeu par preparer.cjs.
(function () {
  var pc = window.imperiumPC;
  function $(id) { return document.getElementById(id); }
  document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.classList.add('version-pc');
    // Pas besoin d'« installer » : c'est déjà une vraie appli.
    var inst = $('bInstaller');
    if (inst) inst.remove();
    var q = $('bQuitter');
    if (q) q.onclick = function (e) { e.preventDefault(); if (pc) pc.quitter(); else window.close(); };
    var pe = $('bPleinEcran');
    if (pe) pe.onclick = function (e) { e.preventDefault(); if (pc) pc.pleinEcran(); };
  });
})();
