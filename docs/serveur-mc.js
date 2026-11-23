/* Serveur Minecraft : boutons « Copier » et état en direct (api.mcsrvstat.us).
   Pour changer l'adresse ou le port Bedrock : modifier index.html (bloc .mc-join). */
(function () {
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copier]');
    if (!b) return;
    var txt = b.getAttribute('data-copier'), avant = b.textContent;
    function ok() { b.textContent = 'Copié !'; setTimeout(function () { b.textContent = avant; }, 1500); }
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, function () {});
  });
  document.addEventListener('DOMContentLoaded', function () {
    var etat = document.querySelector('[data-mc-etat]');
    if (!etat || !window.fetch) return;
    var hote = etat.getAttribute('data-mc-etat');
    var texte = etat.querySelector('span:last-child');
    fetch('https://api.mcsrvstat.us/3/' + encodeURIComponent(hote))
      .then(function (r) { if (!r.ok) throw r; return r.json(); })
      .then(function (d) {
        if (d.online) {
          etat.className = 'mc-etat on';
          var n = d.players ? d.players.online : 0;
          texte.textContent = 'En ligne · ' + n + (n > 1 ? ' joueurs connectés' : ' joueur connecté');
        } else {
          etat.className = 'mc-etat off';
          texte.textContent = 'Hors ligne pour le moment';
        }
      })
      .catch(function () { texte.textContent = 'État indisponible'; });
  });
})();
