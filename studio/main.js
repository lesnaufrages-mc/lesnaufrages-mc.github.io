// Naufragés Studio, logiciel de montage vidéo pour Windows : une fenêtre Electron
// qui ouvre l'éditeur du dossier app/. Tout marche sans internet.
const { app, BrowserWindow, Menu, shell, session } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) app.quit();

let fenetre = null;

function creerFenetre() {
  fenetre = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: '#0c0c10',
    title: 'Naufragés Studio',
    icon: path.join(__dirname, 'app', 'icone.png'),
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
  fenetre.once('ready-to-show', () => { fenetre.maximize(); fenetre.show(); });
  fenetre.loadFile(path.join(__dirname, 'app', 'index.html'));

  // Liens vers internet : dans le navigateur, jamais dans le logiciel.
  fenetre.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  fenetre.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('file:')) return;
    e.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
  });

  // F11 : plein écran. Ctrl + molette du navigateur désactivée (sert au zoom de la timeline).
  fenetre.webContents.setVisualZoomLevelLimits(1, 1);
  fenetre.webContents.on('before-input-event', (e, touche) => {
    if (touche.type !== 'keyDown') return;
    if (touche.key === 'F11') { fenetre.setFullScreen(!fenetre.isFullScreen()); e.preventDefault(); }
    if (touche.key === 'F12' && touche.shift) fenetre.webContents.toggleDevTools();
  });
  fenetre.on('closed', () => { fenetre = null; });
}

app.on('second-instance', () => {
  if (fenetre) { if (fenetre.isMinimized()) fenetre.restore(); fenetre.focus(); }
});

app.whenReady().then(() => {
  // Vidéo exportée : on propose de l'enregistrer dans le dossier Vidéos, puis on l'affiche dans l'Explorateur.
  session.defaultSession.on('will-download', (e, item) => {
    item.setSaveDialogOptions({
      title: 'Enregistrer la vidéo',
      defaultPath: path.join(app.getPath('videos'), item.getFilename()),
      filters: [{ name: 'Vidéo', extensions: [path.extname(item.getFilename()).slice(1) || 'mp4'] }]
    });
    item.once('done', (ev, etat) => { if (etat === 'completed') shell.showItemInFolder(item.getSavePath()); });
  });
  creerFenetre();
});
app.on('window-all-closed', () => app.quit());
