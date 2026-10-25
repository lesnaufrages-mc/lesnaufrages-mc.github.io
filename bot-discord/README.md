# 🤖 Bot des Naufragés

Bot Discord pour **Les Naufragés Community**, relié au jeu **Mot Mystère**.

## Ce qu'il fait

| Fonction | Comment |
|---|---|
| 👋 Bienvenue | Message avec bouton « Jouer » quand quelqu'un arrive, + rôle automatique (facultatif) |
| 🧩 Rappel du mot du jour | Chaque jour à l'heure choisie, dans le salon choisi, en mentionnant le rôle 🔔 |
| 🏆 Classement | Les membres collent leur résultat du jeu (« Mot Mystère #3 4/6 … »), le bot le compte : `/classement` |
| 🔔 Rôle à la carte | `/roles` poste un bouton pour prendre/enlever le rôle « Mot du jour » |
| 🛡️ Modération | `/clear` (supprimer des messages), `/mute` (exclusion temporaire) |
| ℹ️ Autres | `/aide`, `/jouer`, `/motdujour`, `/invitation` |

Le bot ne connaît jamais le mot : il ne peut pas spoiler.

## 1. Créer le bot sur Discord (gratuit, 5 minutes)

1. Va sur <https://discord.com/developers/applications> et clique **New Application**. Nom : « Naufragés Bot ».
2. Menu **Bot** :
   - clique **Reset Token** puis **Copy**. ⚠️ Ce token, c'est le mot de passe du bot : ne le donne à personne, ne le colle ni dans un chat ni sur GitHub.
   - plus bas, active **Server Members Intent** et **Message Content Intent**, puis **Save Changes**.
3. Menu **OAuth2** > **URL Generator** :
   - coche `bot` et `applications.commands` ;
   - dans les permissions, coche : *Manage Roles*, *Manage Messages*, *Moderate Members*, *Send Messages*, *Embed Links*, *Add Reactions*, *Read Message History*, *View Channels* ;
   - copie le lien en bas, ouvre-le, choisis ton serveur. Le bot arrive (hors ligne pour l'instant).
4. Sur ton serveur, **Paramètres du serveur > Rôles** : glisse le rôle du bot **au-dessus** des rôles qu'il doit donner (arrivant, 🔔 Mot du jour).

## 2. Récupérer les identifiants

Dans Discord : **Paramètres utilisateur > Avancés > Mode développeur** (active-le).
Ensuite, clic droit > **Copier l'identifiant** sur : le serveur, le salon de bienvenue, le salon du mot du jour, et les rôles.

## 3. Lancer le bot sur ton PC

1. Installe **Node.js** (version LTS) : <https://nodejs.org>
2. Télécharge ce dossier `bot-discord`.
3. Copie `.env.example` et renomme la copie en `.env`. Ouvre-la avec le Bloc-notes et remplis-la (token + identifiants).
4. Ouvre un terminal dans le dossier et tape :
   ```
   npm install
   npm start
   ```
5. Quand tu vois `✅ Connecté en tant que …`, c'est bon. Tape `/aide` sur ton serveur.

Le bot reste en ligne tant que le terminal est ouvert.

## 4. L'héberger gratuitement 24 h/24 (sans carte bancaire)

On utilise **Daki** (<https://free.daki.cc>) : gratuit, connexion avec Discord, 512 Mo de RAM.
Le bot a un compteur de jours : chaque pub regardée ajoute 3 jours (2 pubs max par jour, jusqu'à 30 jours d'avance).
Si le compteur tombe à zéro, le bot s'arrête. Guide officiel : <https://daki.cc/wiki/guides/free-tier>

1. Connecte-toi sur <https://free.daki.cc> avec ton compte Discord.
2. Crée un serveur gratuit de type **Node.js**.
3. Dans **Files** : envoie `package.json`, `package-lock.json` et les dossiers `src` et `test` (pas `node_modules`),
   puis crée un fichier `.env` avec les mêmes lignes que sur ton PC.
4. Dans **Startup** : mets le fichier principal (main file) sur `src/index.js`.
5. **Console** > **Start**. Quand tu vois `✅ Connecté`, c'est bon.

Éteins le bot sur ton PC (ferme la fenêtre noire) : le même bot ne doit tourner qu'à un seul endroit.
Le fichier `.env` reste privé chez l'hébergeur : il n'est jamais envoyé sur GitHub (voir `.gitignore`).

## Tests

```
npm test
```
