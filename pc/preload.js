// Petit pont sûr entre le jeu (page web) et la fenêtre PC.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('imperiumPC', {
  quitter: () => ipcRenderer.send('quitter'),
  pleinEcran: () => ipcRenderer.send('plein-ecran'),
  ouvrirSite: (chemin) => ipcRenderer.send('ouvrir-site', chemin)
});
