# Brancher le forum et l'espace admin (Supabase, gratuit)

Le site est hébergé gratuitement par GitHub Pages, qui ne sait afficher que des pages fixes.
Pour les comptes et les messages du forum, on utilise **Supabase** : une base de données
gratuite (sans carte bancaire) qui gère aussi les inscriptions par e-mail.

Tant que ce n'est pas fait, la page `/forum/` affiche « Le forum ouvre très bientôt ».

## 1. Créer le projet (5 min)

1. Va sur <https://supabase.com> → **Start your project** → connecte-toi avec GitHub.
2. **New project** : nom `lesnaufrages`, un mot de passe de base de données (garde-le pour toi),
   région **Europe (Paris ou Frankfurt)**, offre **Free**. Attends 1 à 2 minutes.

## 2. Créer les tables du forum (1 min)

1. Menu de gauche → **SQL Editor** → **New query**.
2. Copie tout le contenu de [`forum.sql`](forum.sql), colle-le, clique **Run**.
   Tu dois voir « Success. No rows returned ».

## 3. Régler les e-mails de connexion (1 min)

Menu **Authentication** → **URL Configuration** :

- **Site URL** : `https://lesnaufrages-mc.github.io/forum/`
- **Redirect URLs** → **Add URL** : `https://lesnaufrages-mc.github.io/**`

(Sinon le lien de confirmation reçu par e-mail ne ramène pas sur le site.)

## 4. Brancher le site (2 min)

Menu **Project Settings** → **API Keys** (ou bouton **Connect** en haut) et copie :

- le **Project URL** (`https://xxxxx.supabase.co`) ;
- la clé **publishable** (`sb_publishable_…`) — ou, sur un ancien projet, la clé **anon public** (`eyJ…`).

Colle-les dans [`docs/supabase-config.js`](../docs/supabase-config.js) (sur GitHub : ouvre le fichier → crayon ✏️ → Commit).

> Ces deux valeurs sont faites pour être publiques. Ne colle **jamais** la clé `secret` /
> `service_role` ni le mot de passe de la base : ceux-là doivent rester privés.

## 5. Devenir admin (1 min)

1. Sur <https://lesnaufrages-mc.github.io/forum/>, clique **Se connecter → Inscris-toi**, choisis ton pseudo, confirme ton e-mail.
2. Retourne dans Supabase → **SQL Editor** → **New query**, colle (en remplaçant le pseudo) puis **Run** :

   ```sql
   update public.profils set role = 'fondateur' where pseudo = 'TonPseudo';
   ```

3. Recharge le site : ton menu affiche **🛡️ Espace admin** (`/admin/`).

Depuis l'espace admin tu peux ensuite donner les grades du staff sans repasser par Supabase.

## Mise à jour : grades du staff, photo de profil et bio

Si tu as installé le forum avant l'arrivée des grades, lance **une fois** [`mise-a-jour-staff-profils.sql`](mise-a-jour-staff-profils.sql)
(SQL Editor → New query → colle tout → Run). Désactive la traduction automatique de Chrome avant de copier le code.

## Grades du staff

Les mêmes noms que les rôles du Discord (le bot les crée avec `/staff-setup`).

| Grade | Sur le site |
|---|---|
| **Fondateur** | Tout, y compris nommer des admins |
| **Admin** | Membres, grades (en dessous du sien), actualités, modération |
| **Responsable**, **Modo** | Supprimer les messages, épingler, verrouiller, voir les signalements |
| **Helper**, **Builder**, **Dev**, **Animateur** | Badge staff et place sur la page `/staff/` (droits d'un membre) |
| **Membre** | Lire, créer des sujets, répondre, signaler, modifier sa photo et sa bio |

On ne peut gérer que les membres d'un grade inférieur au sien, et jamais son propre grade.
Un membre banni peut encore lire mais plus écrire. Anti-spam : 15 secondes minimum entre deux messages.

## Bon à savoir (offre gratuite)

- **500 Mo** de base de données et **50 000 comptes** : largement assez.
- Supabase envoie seulement **quelques e-mails par heure** (inscriptions, mot de passe oublié).
  Si beaucoup de monde s'inscrit le même jour, certains devront réessayer un peu plus tard.
- Un projet gratuit **sans aucune visite pendant 7 jours** est mis en pause : il suffit de
  cliquer « Restore » dans Supabase. Avec les visites du site, ça ne devrait pas arriver.
- Les actus écrites dans `docs/actualites.js` restent affichées ; celles publiées depuis l'admin s'ajoutent par-dessus.
