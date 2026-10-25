# Mot Mystère

Jeu de mots gratuit en français : un mot de 5 lettres par jour, le même pour tout le monde,
6 essais. À la fin, on partage sa grille d'emojis (🟩🟨⬛) sans spoiler le mot. C'est ce
partage qui a rendu Wordle viral (des millions de joueurs en quelques semaines, sans pub payée).

## Pourquoi cette idée (et pas une autre)
| Idée | Viral ? | Revenus | Difficulté |
|---|---|---|---|
| **Jeu de mots du jour (choisie)** | Partage de grille quotidien, habitude chaque jour | Pubs récompensées + abonnement « sans pub » | Faible, codable seul |
| Quiz « Quel % de … es-tu ? » | Très partageable, mais s'essouffle vite | Pubs | Faible, mais rétention faible |
| Défis photo entre amis | Fort potentiel | Pubs, achats | Élevée (serveur, modération) |

**Honnêtement :** aucun gain n'est garanti. La plupart des applis gagnent 0 €. Ordre de
grandeur AdMob en France : environ 5 à 20 € pour 1000 pubs récompensées vues. Pour 300 €/mois,
il faut viser environ 1000 à 2000 joueurs actifs par jour. Le travail le plus dur, c'est de
faire connaître l'appli (TikTok, Instagram, Reddit, bouche-à-oreille).

## Lancer sur ton téléphone (5 min)
1. Installe [Node.js](https://nodejs.org) sur ton ordi, et l'appli **Expo Go** sur ton téléphone.
2. Dans ce dossier : `npm install` puis `npx expo start`
3. Scanne le QR code avec Expo Go. Le jeu s'ouvre.

Tests de la logique du jeu : `npm test`

## Avant de publier : ce que TU dois remplir
1. **AdMob** : crée un compte sur admob.google.com, ajoute l'appli (Android puis iOS), crée un bloc
   d'annonces « Avec récompense ». Remplace :
   - les deux `ca-app-pub-...~...` dans `app.json` (ce sont les ID de test de Google) par tes **ID d'appli** ;
   - les `ca-app-pub-xxxx/xxxx` dans `src/ads.js` par tes **ID de blocs d'annonces**.
   Dans AdMob, active aussi le message de consentement RGPD (Confidentialité et messages > RGPD).
2. **Politique de confidentialité** : remplace `[TON NOM]` et `[TON E-MAIL]` dans
   `politique-confidentialite.html`, puis mets-la en ligne (GitHub Pages, ou copie-la dans un Google Doc public).
   Colle son lien dans la Play Console et l'App Store Connect.
3. **Tester les vraies pubs** : elles ne marchent pas dans Expo Go. Fais `eas build --profile preview -p android`
   pour obtenir un fichier .apk à installer sur ton téléphone.

## Ce qui est déjà fait
- Mot du jour identique pour tous, grille, clavier AZERTY coloré, accents ignorés
- Statistiques et série de jours (🔥) sauvegardées sur le téléphone
- Bouton « Partager mon score » (WhatsApp, Insta, SMS…)
- Bouton « Rejouer (partie bonus) » derrière une vraie pub récompensée AdMob (simulée dans Expo Go)
- Consentement RGPD au démarrage, icône de l'appli, politique de confidentialité, config de build `eas.json`

## Pour gagner de l'argent (prochaines étapes)
1. **Abonnement « sans pub + parties illimitées »** à ~1,99 €/mois via RevenueCat.
2. **Liste de mots** : passer de 109 à 1000+ mots (`src/words.js`) et vérifier que l'essai
   est un vrai mot (dictionnaire).
3. **Publier** : compte Google Play (25 $ une fois), Apple (99 $/an). `eas build` puis `eas submit`.
4. **Lien de partage** : acheter un nom de domaine et changer `motmystere.app` dans `src/game.js`.

## Site web (dossier `docs/`)
- **Ajouter une actualité** : ouvre `docs/actualites.js` sur GitHub (crayon ✏️), copie un bloc `{ ... }`,
  colle-le en haut de la liste, change la date, la catégorie et le texte, puis « Commit changes ».
  Les 3 plus récentes s'affichent sur l'accueil, toutes sur `actualites.html`.
- **Statistiques de visites** : [GoatCounter](https://www.goatcounter.com) (gratuit, sans cookie). Le code du compte
  est dans `docs/site.js` (`GOATCOUNTER`). Les visites se consultent sur https://lesnaufrages.goatcounter.com.
- **Si tu refais `expo export -p web`** vers `docs/jouer/`, remets la ligne `<script src="/site.js" defer></script>`
  dans `docs/jouer/index.html` pour continuer à compter les visites du jeu.
- **Pubs du site (Google AdSense)** : le code AdSense est déjà dans le `<head>` de `index.html`, `actualites.html`
  et `confidentialite.html`, et `docs/ads.txt` est servi sur https://lesnaufrages-mc.github.io/ads.txt.
  Ce qu'il reste à faire sur https://adsense.google.com (avec le même compte Google que AdMob) :
  1. Ajouter le site `lesnaufrages-mc.github.io` et demander l'examen (quelques jours à 2-4 semaines).
  2. Confidentialité et messages > RGPD : créer et publier le message de consentement (gratuit, obligatoire en Europe).
  3. Une fois accepté : Annonces > Annonces automatiques > activer. Les pubs se placent toutes seules.
  Le jeu (`docs/jouer/`) n'a pas de pub web pour ne pas gêner le clavier.
