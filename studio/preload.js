// Indique à l'éditeur qu'il tourne dans le programme Windows (et pas dans un navigateur).
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('STUDIO_PC', { version: process.versions.electron });
