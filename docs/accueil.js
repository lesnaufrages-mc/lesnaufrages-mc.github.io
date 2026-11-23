/* Accueil : ferme le menu « Nos autres créations » quand on clique ailleurs ou sur un lien. */
(function () {
  document.addEventListener('click', function (e) {
    document.querySelectorAll('details.menu-crea[open]').forEach(function (d) {
      if (!d.contains(e.target) || e.target.closest('a')) d.removeAttribute('open');
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.querySelectorAll('details.menu-crea[open]').forEach(function (d) { d.removeAttribute('open'); });
  });
})();
