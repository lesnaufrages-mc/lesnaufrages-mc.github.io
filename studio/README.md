# Naufragés Studio

Logiciel de montage vidéo gratuit pour Windows 10/11, Mac et Linux (Electron). Page de téléchargement : https://lesnaufrages-mc.github.io/montage/

- `app/` : l'éditeur (HTML, CSS, JS). Tout le montage est dans `app/montage.js`.
- `main.js` : la fenêtre Windows (export enregistré dans le dossier Vidéos).
- Essayer sur le PC : `npm install` puis `npm start`.
- Construire : `npm run build` (Windows), `npm run build:mac` (sur un Mac), `npm run build:linux` → dossier `dist/`.
- Sur GitHub, chaque changement de `studio/` fusionné dans main est construit et publié tout seul dans « Releases »
  (workflow « Naufragés Studio (Windows) »). Pour une nouvelle version, monter `version` dans `package.json`.
- Projets et médias : IndexedDB du logiciel (dossier `%APPDATA%\Naufrages Studio`).
