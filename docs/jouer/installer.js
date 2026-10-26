/* Mot Mystère : bouton « Installer » (PC et téléphone) + mode hors ligne.
   Le bouton de l'accueil du site mène à /jouer/#installer, qui ouvre directement la fenêtre d'installation.
   Si tu refais `expo export -p web`, remets dans docs/jouer/index.html les lignes
   manifest / theme-color / apple-touch-icon et <script src="/jouer/installer.js" defer></script>. */
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/jouer/sw.js', { scope: '/jouer/' }).catch(function () {}); });
  }
  var installe = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  var demande = location.hash === '#installer';
  var cache = false;
  try { cache = localStorage.getItem('mm-installer-cache') === '1'; } catch (e) {}
  if (installe) return;

  var invite = null, bloc = null;
  var ios = /iPhone|iPad|iPod/.test(navigator.userAgent), mobile = ios || /Android|Mobi/.test(navigator.userAgent);
  var style = document.createElement('style');
  style.textContent =
    '#mmInstaller{position:fixed;top:10px;right:10px;z-index:9999;display:flex;align-items:center;gap:2px;font:700 14px system-ui,sans-serif}' +
    '#mmInstaller button{border:0;cursor:pointer;color:#fff;font:inherit}' +
    '#mmInstaller .go{background:#3a9b55;padding:8px 12px;border-radius:999px 0 0 999px;box-shadow:0 4px 14px rgba(0,0,0,.35)}' +
    '#mmInstaller .x{background:#3a3a3c;padding:8px 10px;border-radius:0 999px 999px 0}' +
    '@media (max-width:600px){#mmInstaller{top:6px;right:4px}#mmInstaller .go{font-size:0;padding:7px 9px}#mmInstaller .go::before{content:"📲";font-size:16px}#mmInstaller .x{padding:7px 7px;font-size:12px}}' +
    '#mmAide{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.45 system-ui,sans-serif}' +
    '#mmAide>div{background:#1e1e1e;color:#eee;border-radius:16px;padding:18px;max-width:360px}' +
    '#mmAide h3{margin:0 0 8px}#mmAide ol{padding-left:20px;margin:8px 0 14px}' +
    '#mmAide button{width:100%;border:0;border-radius:12px;padding:12px;background:#3a9b55;color:#fff;font-weight:700;font-size:15px;cursor:pointer;margin-top:6px}' +
    '#mmAide button.gris{background:#3a3a3c}';
  document.head.appendChild(style);

  function fenetre(html) {
    var f = document.getElementById('mmAide');
    if (f) f.remove();
    f = document.createElement('div');
    f.id = 'mmAide';
    f.innerHTML = '<div>' + html + '</div>';
    f.onclick = function (e) { if (e.target === f || e.target.hasAttribute('data-ok')) f.remove(); };
    document.body.appendChild(f);
    return f;
  }
  function etapes() {
    var li = ios
      ? '<li>Ouvre cette page dans <b>Safari</b>.</li><li>Touche <b>Partager</b> (carré avec une flèche).</li><li>Choisis <b>« Sur l’écran d’accueil »</b>.</li>'
      : mobile
        ? '<li>Ouvre cette page dans <b>Chrome</b>.</li><li>Touche le menu <b>⋮</b>.</li><li>Choisis <b>« Installer l’application »</b>.</li>'
        : '<li>Ouvre cette page dans <b>Chrome</b> ou <b>Edge</b>.</li><li>Clique sur l’icône <b>Installer</b> (écran avec une flèche) au bout de la barre d’adresse, ou menu <b>⋮</b> → <b>« Installer Mot Mystère »</b>.</li><li>Le jeu s’ouvre dans sa propre fenêtre et apparaît dans le menu Démarrer.</li>';
    fenetre('<h3>📲 Installer Mot Mystère</h3>Le jeu devient une appli sur ton ' + (mobile ? 'téléphone' : 'PC') + ', et marche même sans internet.<ol>' + li + '</ol><button type="button" data-ok>OK</button>');
  }
  function installer() {
    if (invite) {
      var i = invite;
      invite = null;
      i.prompt();
      i.userChoice.then(function (r) { if (r && r.outcome === 'accepted' && bloc) bloc.remove(); });
      return;
    }
    etapes();
  }
  // Venu du bouton de l'accueil : grande fenêtre avec le bouton d'installation (un clic est obligatoire pour le navigateur).
  function accueil() {
    var f = fenetre('<h3>📲 Installer Mot Mystère</h3>Ajoute le jeu sur ton ' + (mobile ? 'téléphone' : 'PC') + ' comme une vraie appli : une icône, sa propre fenêtre, et il marche même sans internet.' +
      '<button type="button" class="go">📲 Installer maintenant</button><button type="button" class="gris" data-ok>Plus tard</button>');
    f.querySelector('.go').onclick = function () { f.remove(); installer(); };
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); invite = e; });
  window.addEventListener('appinstalled', function () { if (bloc) bloc.remove(); });
  document.addEventListener('DOMContentLoaded', function () {
    if (!cache || demande) {
      bloc = document.createElement('div');
      bloc.id = 'mmInstaller';
      bloc.innerHTML = '<button class="go" type="button">📲 Installer</button><button class="x" type="button" aria-label="Masquer">✕</button>';
      bloc.querySelector('.go').onclick = installer;
      bloc.querySelector('.x').onclick = function () {
        bloc.remove();
        try { localStorage.setItem('mm-installer-cache', '1'); } catch (e) {}
      };
      document.body.appendChild(bloc);
    }
    if (demande) setTimeout(accueil, 600);
  });
})();
