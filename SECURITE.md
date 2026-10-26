# Sécurité du site

Le site est un site « fixe » (GitHub Pages) : les vraies protections sont dans **Supabase**
(qui a le droit de faire quoi) et dans **tes comptes** (GitHub, Supabase, Google, Discord).
Voici ce qui est déjà fait, puis ce que toi seul peux faire.

## Déjà en place sur le site

- **Règles Supabase (RLS)** : chaque action (poster, modifier, bannir, publier une actu) est vérifiée
  par la base de données, pas seulement par la page. Même quelqu'un qui bidouille le code du site
  ne peut pas se donner un grade, modifier le message d'un autre ou lire les signalements.
- **Seule la clé publique** (`sb_publishable_…`) est dans `docs/supabase-config.js`. C'est normal.
  La clé `secret` / `service_role` ne doit **jamais** aller dans le dépôt (il est public).
- **Textes échappés** : un pseudo, un titre ou un message ne peut pas glisser de code dans la page (XSS).
- **Liens des actus** : seulement des liens web (`https://…`) ou des pages du site, jamais `javascript:`.
- **Photos de profil** : uniquement depuis le stockage du site, une seule image par membre.
- **Anti-spam** : 15 s entre deux messages, 10 sujets et 60 messages par heure, 1 signalement par message.
- **Scripts externes vérifiés** (Supabase, PeerJS) : si le site qui les héberge était piraté,
  le navigateur refuserait le fichier modifié (empreinte « integrity »).
- **Espace admin** : règle stricte (CSP) qui bloque tout script venant d'un autre site,
  et le forum/l'admin refusent d'être affichés dans le cadre d'un autre site (anti-clickjacking).

## À faire toi-même (15 min en tout)

### 1. Lancer le script de sécurité (2 min)
Supabase → **SQL Editor** → **New query** → colle tout [`supabase/securite.sql`](supabase/securite.sql) → **Run**.
Désactive la traduction automatique de Chrome avant de copier.

### 2. Activer la double authentification (2FA) partout (10 min)
Avec une appli comme **Google Authenticator** ou **Microsoft Authenticator** sur ton téléphone.
Garde les **codes de secours** sur papier.

- **GitHub** : photo en haut à droite → Settings → **Password and authentication** → Enable 2FA.
  Puis l'organisation `lesnaufrages-mc` → Settings → **Authentication security** →
  coche « Require two-factor authentication ».
- **Supabase** : photo en haut à droite → Account preferences → **Multi-factor authentication**.
- **Google** (AdSense, AdMob, Gmail) : <https://myaccount.google.com/security> → Validation en deux étapes.
- **Discord** : Paramètres → Mon compte → **Activer l'authentification à deux facteurs**.

### 3. Réglages Supabase (3 min)
- **Authentication → Sign In / Providers → Email** : laisse **Confirm email** activé ;
  **Minimum password length** : 8 (ou plus).
- **Authentication → URL Configuration** : seulement `https://lesnaufrages-mc.github.io/**`
  dans les Redirect URLs (supprime les autres adresses inconnues).
- **Advisors → Security Advisor** : clique **Refresh** et regarde s'il reste un avertissement rouge.

### 4. Bot Discord
Le token du bot a été montré dans une discussion : va sur
<https://discord.com/developers/applications> → ton bot → **Bot** → **Reset Token**,
puis colle le nouveau token sur bot-hosting.net (fichier `.env`). Ne le mets jamais sur GitHub.

### 5. Protéger la branche `main` (1 min)
Dépôt sur GitHub → Settings → **Branches** → Add rule `main` → coche
« Require a pull request before merging ». Personne ne pourra modifier le site sans PR.

## Si tu penses avoir été piraté
1. Change le mot de passe du compte concerné et vérifie la 2FA.
2. Supabase : Project Settings → API Keys → **régénère** la clé publique et mets la nouvelle
   dans `docs/supabase-config.js`.
3. Espace admin → Membres : retire les grades suspects.
