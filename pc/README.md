# Imperium of Wars : version PC (Steam)

Ce dossier transforme le jeu du site (`docs/strategie/`) en vrai jeu PC Windows avec
[Electron](https://www.electronjs.org/). Il n'y a **qu'un seul code** : quand tu modifies le jeu
dans `docs/strategie/`, la version PC suit toute seule à la prochaine construction.

Différences avec la version du site :

- pas de pub AdSense ni de compteur de visites ;
- marche **sans internet** (three.js et la police Cinzel sont inclus) ;
- boutons « Plein écran (F11) » et « Quitter » à la place de « Retour au site » ;
- le bouton « Installer le jeu » disparaît (c'est déjà une appli) ;
- tout est agrandi sur les grands écrans (x1,5 en 1920 x 1080) ;
- les liens Discord / forum s'ouvrent dans le navigateur.

## Récupérer le .exe sans rien installer

1. Sur GitHub, onglet **Actions** > **Version PC (Steam)**.
2. Ouvre le dernier lancement vert (ou clique **Run workflow** pour en faire un).
3. En bas, rubrique **Artifacts**, télécharge **ImperiumOfWars-windows** et dézippe-le.
4. Double-clique sur `ImperiumOfWars.exe`. C'est ce dossier entier qu'on envoie sur Steam.

## Construire sur ton PC (facultatif)

Il faut [Node.js](https://nodejs.org/) 22, puis dans ce dossier `pc/` :

```
npm install
npm start        # lance le jeu dans une fenêtre pour tester
npm run build    # crée dist/win-unpacked/ImperiumOfWars.exe (+ un .zip)
```

## Envoyer sur Steam

Le guide complet est dans [GUIDE-STEAM.md](GUIDE-STEAM.md). Les fichiers `steam/app_build.vdf`
et `steam/depot_build.vdf` servent à l'envoi avec SteamCMD : remplace `APPID_A_REMPLACER` et
`DEPOTID_A_REMPLACER` par les numéros donnés par Steamworks.

## Si la construction s'arrête avec « introuvable »

`preparer.cjs` adapte la page du jeu en cherchant des lignes précises (pub, three.js, lien
« Retour au site »...). Si le jeu change et qu'une ligne n'existe plus, il s'arrête exprès
plutôt que de sortir une version PC à moitié adaptée : mets la règle à jour dans `preparer.cjs`.
