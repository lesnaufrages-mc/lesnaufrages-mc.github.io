# Sortir Imperium of Wars sur Steam : le guide pas à pas

*Règles vérifiées sur le site officiel de Steamworks le 26 octobre 2026.*

## En bref

| | |
|---|---|
| **Coût** | **100 $ US** par jeu (environ 95 €), payés une fois, **non remboursables**. Steam te les rend sur un versement une fois que le jeu a fait **1 000 $** de ventes. |
| **Âge** | Tu signes un **contrat** avec Valve et tu donnes un compte bancaire et des infos d'impôts **à ton nom**. Si tu as moins de 18 ans, c'est un **parent** qui doit créer le compte Steamworks à son nom (son identité, sa banque, ses impôts). |
| **Délai minimum** | **21 jours** entre le paiement des 100 $ et la sortie, avec une page « Bientôt disponible » visible **au moins 2 semaines**. Compte plutôt **1 mois à 1 mois et demi**. |
| **Part de Steam** | Steam garde **30 %** de chaque vente. |
| **Déjà prêt** | Le jeu PC (.exe), les 8 images du magasin, 8 captures 1920 x 1080, le trailer 16:9. |

> 💡 Conseil budget : ne paie pas les 100 $ tant que tu n'as pas l'argent « en trop ». Les 25 $ de Google Play d'abord, Steam ensuite. Tout le reste (jeu PC, images, textes) est déjà prêt et ne coûte rien.

---

## Étape 1 : tester la version PC (gratuit, 5 minutes)

1. Va sur GitHub : dépôt **lesnaufrages-mc.github.io** > onglet **Actions** > **Version PC (Steam)**.
2. Ouvre le dernier lancement avec une coche verte (ou **Run workflow** pour en lancer un).
3. Tout en bas, rubrique **Artifacts**, télécharge **ImperiumOfWars-windows**, puis dézippe-le.
4. Double-clique sur **ImperiumOfWars.exe**.
   Windows peut afficher « Windows a protégé votre ordinateur » : clique **Informations complémentaires** puis **Exécuter quand même** (normal, le jeu n'est pas « signé » ; une fois sur Steam, ce message n'apparaît plus).
5. Joue une partie : F11 pour le plein écran, bouton **Quitter** sur le menu.

Ce **dossier entier** (pas seulement le .exe) est ce que tu enverras sur Steam.

## Étape 2 : créer le compte Steamworks (gratuit)

1. Il te faut un compte Steam normal, protégé par **Steam Guard mobile** (appli Steam sur ton téléphone).
2. Va sur **partner.steamgames.com/steamdirect** et clique pour t'inscrire.
3. Choisis de t'inscrire **en tant que particulier** (« individual »), c'est autorisé.
4. Mets ton **vrai nom légal**, exactement comme sur ta carte d'identité (pas de pseudo, pas « Les Naufragés »). Le nom « Les Naufragés » sera ton nom de **développeur/éditeur** affiché sur la page du jeu, ça se règle plus tard.
5. Signe les deux documents en ligne : l'accord de confidentialité (NDA) et l'accord de distribution Steam.

## Étape 3 : banque, impôts, identité

1. **Banque** : IBAN, BIC, adresse de la banque. Le titulaire du compte doit avoir **le même nom** que celui de l'étape 2.
2. **Questionnaire fiscal** (il est en anglais, c'est l'équivalent du formulaire américain **W-8BEN**) :
   - tu es une personne physique, **non américaine**, résidente en **France** ;
   - numéro fiscal : ton **numéro fiscal de référence** français (13 chiffres, en haut de l'avis d'impôt du foyer) ;
   - coche le **traité fiscal France - États-Unis** : la retenue américaine passe alors à **0 %**.
   - La vérification peut prendre **jusqu'à 30 jours** et on ne peut plus rien modifier pendant ce temps : fais-la tôt.
3. **Vérification d'identité** : pièce d'identité à envoyer en ligne.
4. En France, l'argent gagné sur Steam se **déclare aux impôts**. Pour quelques ventes, ça passe dans la déclaration de revenus ; si ça devient régulier, le statut de **micro-entrepreneur** (gratuit sur autoentrepreneur.urssaf.fr) est le plus simple. Demande à un adulte de confiance si tu as un doute.

## Étape 4 : payer les 100 $ (Steam Direct)

1. Dans Steamworks, paie le **droit d'entrée Steam Direct** : 100 $ US (carte bancaire ou PayPal). C'est **un crédit pour un seul jeu**.
2. Le jour du paiement démarre le compteur de **21 jours** avant la sortie possible.
3. Steam te donne alors un **AppID** (le numéro du jeu) et un **DepotID** (le numéro du « dossier » où on envoie les fichiers). Note-les.

## Étape 5 : remplir la page magasin

Dans Steamworks, ouvre ton jeu > **Modifier la page magasin**.

### Les textes (à copier-coller)

**Nom** : Imperium of Wars

**Description courte** :
> De Charlemagne à Louis XIV, choisis ton royaume sur la vraie carte de l'Europe et de l'Orient, signe des alliances, assiège les forteresses et commande tes armées dans des batailles en 3D. 5 campagnes historiques, de 771 à 1800.

**Description longue** (« À propos de ce jeu ») :
> **Écris l'histoire de ton empire.**
> Imperium of Wars est un jeu de grande stratégie historique au tour par tour, avec des batailles tactiques en 3D.
>
> - **5 campagnes historiques** : l'empire de Charlemagne (771), Guillaume le Conquérant (1066), les croisades (1190), la chute de Constantinople (1453) et l'âge des rois (1700).
> - **104 provinces** sur la vraie carte de l'Europe, du Maghreb et du Moyen-Orient.
> - **Diplomatie** : paix, alliances, demandes d'or et de renforts, guerres déclarées.
> - **Villes et sièges** : construis marchés, casernes et remparts, puis brise les murailles ennemies au canon.
> - **Batailles en 3D** : place tes piquiers, archers, chevaliers et canons, puis mène la charge, ou laisse la résolution automatique décider.
> - Les armées **évoluent avec les siècles** : des chevaliers aux mousquets.
> - Jouable **hors ligne**, parties sauvegardées automatiquement.

**Développeur / Éditeur** : Les Naufragés

### Les cases à cocher

- **Genre** : Stratégie. **Tags** : Grande stratégie, Stratégie au tour par tour, Médiéval, Historique, Tactique, Guerre, Solo, 3D.
- **Langues** : **Français** (interface). ⚠️ Le jeu n'existe qu'en français, ne coche rien d'autre. Une traduction anglaise multiplierait les acheteurs possibles : ça peut se faire plus tard.
- **Systèmes** : Windows.
- **Configuration minimale** : Windows 10 64 bits, processeur double cœur, 4 Go de mémoire, carte graphique compatible DirectX 11, 400 Mo d'espace disque.

### Les images (déjà faites)

Dans les fichiers du projet, dossier **steam/images-magasin/** : chaque fichier porte le nom et la taille exacte demandés par Steam.

| Case Steam | Fichier |
|---|---|
| Capsule d'en-tête (Header) | header_capsule_920x430.png |
| Petite capsule (Small) | small_capsule_462x174.png |
| Capsule principale (Main) | main_capsule_1232x706.png |
| Capsule verticale (Vertical) | vertical_capsule_748x896.png |
| Arrière-plan de la page (facultatif) | page_background_1438x810.png |
| Bibliothèque : capsule | library_capsule_600x900.png |
| Bibliothèque : en-tête | header_capsule_920x430.png (le même) |
| Bibliothèque : héros (sans texte) | library_hero_3840x1240.png |
| Bibliothèque : logo (fond transparent) | library_logo_1280x720.png |

**Captures** (au moins 5, en 1920 x 1080) : dossier **steam/captures-1920x1080/**, 8 captures du vrai jeu. Coche « **convient à tous les âges** » sur au moins 4 d'entre elles (les batailles n'ont pas de sang, c'est bon).

**Trailer** : envoie **trailer/Imperium-of-Wars-trailer-16x9.mp4** (1920 x 1080, déjà au bon format). Les versions verticales sont pour TikTok, pas pour Steam.

### Le questionnaire de contenu

- **Violence** : batailles stylisées entre petites figurines, sans sang ni gore.
- **IA générative** : Steam demande de déclarer le contenu du jeu fait avec une IA. Réponds honnêtement : **« Contenu pré-généré »**, en expliquant que des textes du jeu, les images et le code ont été réalisés avec l'aide d'une IA puis vérifiés par toi. Ce n'est pas interdit, il faut juste le dire.

### Le prix

Le jeu est gratuit sur le site, donc vise un **petit prix** : **2,99 €** (ou 1,99 €). Steam propose ensuite des prix automatiques pour chaque pays. Exemple : à 2,99 €, il te reste environ 1,75 € par vente une fois la TVA et la part de Steam retirées ; il faut environ 400 ventes pour que Steam te rende les 100 $.

> Option : le mettre **gratuit** sur Steam aussi. Tu ne gagnes rien sur les ventes, mais beaucoup plus de joueurs, donc plus de monde sur le Discord et sur le site (qui a des pubs).

## Étape 6 : page « Bientôt disponible » (2 semaines minimum)

1. Quand la page est remplie, clique **Demander une revue** de la page magasin. Envoie-la **au moins 7 jours ouvrés** avant la date où tu veux qu'elle soit visible. La revue prend en général **1 à 5 jours**.
2. Une fois acceptée, publie-la en **« Bientôt disponible »** (Coming Soon). Elle doit rester visible **au moins 2 semaines** avant la sortie.
3. Pendant ce temps, fais ajouter le jeu à la **liste de souhaits** : lien de la page sur le Discord, dans la description des vidéos TikTok/YouTube, sur le site. Plus il y a de souhaits, plus Steam montre le jeu le jour de la sortie.

## Étape 7 : envoyer le jeu sur Steam

1. **Réglages d'installation** (Steamworks > ton jeu > Installation > Général) : ajoute une **option de lancement**
   - Exécutable : `ImperiumOfWars.exe`
   - Système : Windows
   puis va dans l'onglet **Publier** pour enregistrer.
2. **Envoyer les fichiers** : le plus simple est l'outil **SteamPipe GUI** (Windows), qui se trouve dans le **SDK Steamworks** (Steamworks > Documentation > Télécharger le SDK, dossier `tools/SteamPipeGUI`).
   - Indique ton AppID, ton DepotID et le **dossier dézippé** de l'étape 1.
   - Connecte-toi avec ton compte Steam et clique **Upload**.
   - (Méthode experte : SteamCMD avec les fichiers `pc/steam/app_build.vdf` et `depot_build.vdf` du dépôt, en remplaçant les numéros.)
3. Sur la page **Builds** de Steamworks, ton envoi apparaît : choisis-le et mets-le sur la branche **default** (« Set build live »).
4. Teste : dans Steamworks, demande des **clés Steam** pour toi (et quelques amis du Discord), active-en une dans Steam, installe le jeu et lance-le.
5. Dans la **liste de vérification avant sortie**, clique **Demander une revue du build**. Valve lance le jeu et vérifie qu'il marche (en général **1 à 5 jours**).

## Étape 8 : la sortie 🎉

Quand tout est vert dans la liste de vérification, que les 21 jours depuis le paiement et les 2 semaines de « Bientôt disponible » sont passés, choisis la date et clique **Publier le jeu**. Annonce-le partout : Discord, TikTok avec le trailer viral, actualités du site.

## Calendrier conseillé

| Quand | Quoi |
|---|---|
| Jour 0 | Compte Steamworks, banque, impôts, identité, **paiement 100 $** |
| Jours 1 à 3 | Page magasin remplie (textes et images ci-dessus), envoi du jeu, demande de revue de la page |
| Vers le jour 7 | Page acceptée : **« Bientôt disponible »** en ligne, on fait de la pub pour la liste de souhaits |
| Jours 7 à 21 | Revue du build, tests, petites corrections |
| **Jour 21 ou plus** | **Sortie** (si la page est en ligne depuis au moins 2 semaines) |

## Plus tard (gratuit, je peux le faire)

- **Succès Steam** (« Conquérir Constantinople », « Gagner une campagne »...) et **sauvegarde Steam Cloud**.
- **Traduction anglaise** pour toucher le monde entier.
- Version **Linux / Steam Deck** (le jeu marche déjà sous Linux).

## Mettre à jour le jeu sur Steam

1. Modifie le jeu comme d'habitude dans `docs/strategie/` (le site et le PC partagent le même code).
2. Monte le numéro `version` dans `pc/package.json` (ex. 1.0.1).
3. Récupère le nouveau dossier dans **Actions** (étape 1), renvoie-le avec SteamPipe GUI (étape 7) et mets le nouveau build sur **default**.

---

Sources officielles : [Frais Steam Direct](https://partner.steamgames.com/doc/gettingstarted/appfee?l=french) · [Inscription (onboarding)](https://partner.steamgames.com/doc/gettingstarted/onboarding) · [Page « Bientôt disponible »](https://partner.steamgames.com/doc/store/coming_soon) · [Images du magasin](https://partner.steamgames.com/doc/store/assets/standard) · [Images de bibliothèque](https://partner.steamgames.com/doc/store/assets/libraryassets) · [Questionnaire de contenu](https://partner.steamgames.com/doc/gettingstarted/contentsurvey) · [Envoyer sur Steam](https://partner.steamgames.com/doc/sdk/uploading)
