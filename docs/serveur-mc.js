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
    var etats = document.querySelectorAll('[data-mc-etat]');
    if (!etats.length || !window.fetch) return;
    var hote = etats[0].getAttribute('data-mc-etat');
    function ecrire(classe, msg) {
      etats.forEach(function (etat) {
        if (classe) etat.className = 'mc-etat ' + classe;
        etat.querySelector('span:last-child').textContent = msg;
      });
    }
    fetch('https://api.mcsrvstat.us/3/' + encodeURIComponent(hote))
      .then(function (r) { if (!r.ok) throw r; return r.json(); })
      .then(function (d) {
        if (d.online) {
          var n = d.players ? d.players.online : 0;
          ecrire('on', 'En ligne · ' + n + (n > 1 ? ' joueurs connectés' : ' joueur connecté'));
        } else {
          ecrire('off', 'Hors ligne pour le moment');
        }
      })
      .catch(function () { ecrire('', 'État indisponible'); });
  });
})();
