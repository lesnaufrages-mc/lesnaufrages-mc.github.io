/* Mot Mystère : bouton « Installer » (PC et téléphone) + mode hors ligne.
   Si tu refais `expo export -p web`, remets dans docs/jouer/index.html les lignes
   manifest / theme-color / apple-touch-icon et <script src="/jouer/installer.js" defer></script>. */
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/jouer/sw.js', { scope: '/jouer/' }).catch(function () {}); });
  }
  var installe = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  var cache = false;
  try { cache = localStorage.getItem('mm-installer-cache') === '1'; } catch (e) {}
  if (installe || cache) return;

  var invite = null;
  var style = document.createElement('style');
  style.textContent =
    '#mmInstaller{position:fixed;top:10px;right:10px;z-index:9999;display:flex;align-items:center;gap:2px;font:700 14px system-ui,sans-serif}' +
    '#mmInstaller button{border:0;cursor:pointer;color:#fff;font:inherit}' +
    '#mmInstaller .go{background:#3a9b55;padding:8px 12px;border-radius:999px 0 0 999px;box-shadow:0 4px 14px rgba(0,0,0,.35)}' +
    '#mmInstaller .x{background:#3a3a3c;padding:8px 10px;border-radius:0 999px 999px 0}' +
    '@media (max-width:600px){#mmInstaller{top:6px;right:4px}#mmInstaller .go{font-size:0;padding:7px 9px}#mmInstaller .go::before{content:"📲";font-size:16px}#mmInstaller .x{padding:7px 7px;font-size:12px}}' +
    '#mmAide{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.45 system-ui,sans-serif}' +
    '#mmAide div{background:#1e1e1e;color:#eee;border-radius:16px;padding:18px;max-width:360px}' +
    '#mmAide h3{margin:0 0 8px}#mmAide ol{padding-left:20px;margin:8px 0 14px}' +
    '#mmAide button{width:100%;border:0;border-radius:12px;padding:12px;background:#3a9b55;color:#fff;font-weight:700;font-size:15px}';
  document.head.appendChild(style);

  var bloc = document.createElement('div');
  bloc.id = 'mmInstaller';
  bloc.innerHTML = '<button class="go" type="button">📲 Installer</button><button class="x" type="button" aria-label="Masquer">✕</button>';
  bloc.querySelector('.go').onclick = function () {
    if (invite) {
      invite.prompt();
      invite.userChoice.then(function () { invite = null; });
      return;
    }
    var ios = /iPhone|iPad|iPod/.test(navigator.userAgent), mobile = /Android|Mobi/.test(navigator.userAgent);
    var etapes = ios
      ? '<li>Ouvre cette page dans <b>Safari</b>.</li><li>Touche <b>Partager</b> (carré avec une flèche).</li><li>Choisis <b>« Sur l’écran d’accueil »</b>.</li>'
      : mobile
        ? '<li>Ouvre cette page dans <b>Chrome</b>.</li><li>Touche le menu <b>⋮</b>.</li><li>Choisis <b>« Installer l’application »</b>.</li>'
        : '<li>Ouvre cette page dans <b>Chrome</b> ou <b>Edge</b>.</li><li>Clique sur l’icône <b>Installer</b> (écran avec une flèche) au bout de la barre d’adresse, ou menu <b>⋮</b> → <b>« Installer Mot Mystère »</b>.</li><li>Le jeu s’ouvre dans sa propre fenêtre et apparaît dans le menu Démarrer.</li>';
    var aide = document.createElement('div');
    aide.id = 'mmAide';
    aide.innerHTML = '<div><h3>📲 Installer Mot Mystère</h3>Le jeu devient une appli sur ton ' + (mobile || ios ? 'téléphone' : 'PC') + ', et marche même sans internet.<ol>' + etapes + '</ol><button type="button">OK</button></div>';
    aide.onclick = function (e) { if (e.target === aide || e.target.tagName === 'BUTTON') aide.remove(); };
    document.body.appendChild(aide);
  };
  bloc.querySelector('.x').onclick = function () {
    bloc.remove();
    try { localStorage.setItem('mm-installer-cache', '1'); } catch (e) {}
  };
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); invite = e; });
  window.addEventListener('appinstalled', function () { bloc.remove(); });
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(bloc); });
})();
