// Imperium of Wars, version PC : une fenêtre Electron qui lance le jeu du dossier app/
// (copie de docs/strategie préparée par preparer.cjs, sans pub et sans internet obligatoire).
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

const SITE = 'https://lesnaufrages-mc.github.io';

// Une seule fenêtre du jeu à la fois.
if (!app.requestSingleInstanceLock()) app.quit();

let fenetre = null;

function creerFenetre() {
  fenetre = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0b1220',
    title: 'Imperium of Wars',
    icon: path.join(__dirname, 'app', 'icone-512.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  Menu.setApplicationMenu(null);
  fenetre.once('ready-to-show', () => fenetre.show());
  // Le jeu est pensé pour le téléphone : sur un grand écran on agrandit tout,
  // comme si la fenêtre faisait environ 1280 x 720 (x1,5 en 1920 x 1080).
  const ajusterZoom = () => {
    const [l, h] = fenetre.getContentSize();
    fenetre.webContents.setZoomFactor(Math.max(1, Math.min(2.5, l / 1280, h / 720)));
  };
  fenetre.on('resize', ajusterZoom);
  fenetre.webContents.on('did-finish-load', ajusterZoom);
  fenetre.loadFile(path.join(__dirname, 'app', 'index.html'));

  // Les liens vers internet (Discord, forum...) s'ouvrent dans le navigateur, jamais dans le jeu.
  fenetre.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  fenetre.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('file:')) return;
    e.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
  });

  // F11 : plein écran. F12 : outils de développement (pour chercher un bug).
  fenetre.webContents.on('before-input-event', (e, touche) => {
    if (touche.type !== 'keyDown') return;
    if (touche.key === 'F11') { fenetre.setFullScreen(!fenetre.isFullScreen()); e.preventDefault(); }
    if (touche.key === 'F12' && !app.isPackaged) fenetre.webContents.toggleDevTools();
  });
  fenetre.on('closed', () => { fenetre = null; });
}

ipcMain.on('quitter', () => app.quit());
ipcMain.on('plein-ecran', () => { if (fenetre) fenetre.setFullScreen(!fenetre.isFullScreen()); });
ipcMain.on('ouvrir-site', (e, chemin) => shell.openExternal(SITE + (chemin || '/')));

app.on('second-instance', () => {
  if (fenetre) { if (fenetre.isMinimized()) fenetre.restore(); fenetre.focus(); }
});
app.whenReady().then(creerFenetre);
app.on('window-all-closed', () => app.quit());
