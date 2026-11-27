---
name: trouve-client
description: Cherche les 3 meilleurs clients possibles pour un travail payé (mod CK3 ou plugin Minecraft sur commande) avec plusieurs chercheurs, un contrôle qualité et un vote secret, puis prépare le premier message. À utiliser pour « /trouve-client », « trouve mon prochain client », « qui pourrait me payer un mod ».
---

# /trouve-client : trouver le prochain client payant

Idée reprise d'un TikTok @henriexploria (12 agents qui cherchent chacun dans un coin,
un contrôle qualité, un vote secret, les 3 meilleurs clients + le premier message).
Adapté aux Naufragés : on ne vend **pas** des sites à des boulangeries, on vend ce que
lord sait déjà livrer, à des gens qui en **demandent publiquement** :

| Offre | Prix (voir `/mnt/project-files/premier-client/plan-premier-client.md`) |
|---|---|
| Mod CK3 sur mesure (décision, événements, mini-mod) | 15 à 150 €, PayPal, 50 % avant |
| Plugin Minecraft Paper sur mesure (comme NaufragesMachines) | 20 à 150 €, même règle |
| Mise à jour d'un mod CK3 abandonné vers la version actuelle | 15 à 40 € |

**Règles absolues**
- Rien n'est envoyé : la skill prépare les messages, **lord** les poste lui-même (ou dit « oui »).
- Uniquement des demandes **publiques** (posts, fils de discussion). Pas d'adresse e-mail
  devinée, pas de liste achetée, pas de MP en masse. Une personne = un message.
- Une demande de plus de 60 jours, sans moyen de répondre, ou déjà résolue (quelqu'un a
  répondu avec un mod qui existe) est jetée.
- Respecter les règles de chaque forum : sur Reddit, répondre dans le fil, pas de pub sèche.

## Étape 1 : les chercheurs (en parallèle)
Lance **6 agents** (type `general-purpose`, en parallèle, chacun avec sa source de
`sources.md`). Consigne commune :
> Cherche des demandes publiques de moins de 60 jours où quelqu'un veut un mod / plugin
> qui n'existe pas, ou cherche quelqu'un pour le faire. Pour chaque piste : lien, date,
> pseudo, ce qu'il veut en une phrase, phrase exacte qui le prouve (citation courte),
> s'il parle de payer (oui / non / pas dit), comment lui répondre. 8 pistes maximum.
> N'écris à personne.

Chaque agent rend une liste ; garde tout dans `1-pistes.md`.

## Étape 2 : le contrôle qualité (toi)
Pour chaque piste : le lien existe ? la date est récente ? la demande est encore ouverte ?
lord sait le faire en moins de 3 soirs ? Barre ce qui ne passe pas (avec la raison).

## Étape 3 : le vote secret
Lance **5 juges** (agents `general-purpose`, en parallèle, **sans** voir les notes des autres).
Chacun reçoit la liste nettoyée et note chaque piste de 0 à 10 sur :
envie de payer · demande claire · faisable vite · lord peut répondre là où c'est posté.
Additionne. Les **3 premiers** gagnent ; en cas d'égalité, la piste la plus récente.

## Étape 4 : les 3 meilleurs clients
Écris `/mnt/project-files/premier-client/clients/AAAA-MM-JJ.md` :
- pour chacun : lien, qui, ce qu'il veut, preuve (citation), votes, formule et prix proposés ;
- **le premier message prêt à coller**, dans la langue du post, court (5 lignes max) :
  1. ce qu'on a compris de sa demande, 2. une preuve (un mod des Naufragés qui ressemble),
  3. l'offre (prix, délai), 4. une question simple (« je te fais un aperçu ? »).
  Pas de « Cher Monsieur », pas de pavé, pas de lien raccourci.
- en bas : les pistes recalées et pourquoi (pour ne pas les rechercher la prochaine fois).

Puis ajoute les 3 au compteur de contacts du plan (section compteur de `plan-premier-client.md`)
avec l'état « à envoyer », et montre à lord les 3 messages pour son **oui / non**.

## Bon à savoir
- Coût : 11 agents par lancement. Une fois par semaine suffit.
- Depuis le cloud, Reddit, le forum Paradox et les discussions Steam bloquent les robots
  (vérifié le 2026-11-27 : page de vérification, contenu masqué, erreur 429 sur Nexus).
  **Lance donc /trouve-client depuis le PC de lord** (Claude Code dans `C:\Users\jolis`)
  avec Claude in Chrome : les chercheurs lisent les pages dans son Chrome, comme lui.
  Ne jamais passer une vérification anti-robot à sa place : si une page en demande une,
  l'agent le note et passe à la source suivante.
- Si une source reste invisible, l'agent le dit au lieu d'inventer.
- Quand un client dit oui : le mod se code avec un préfixe unique et des fichiers
  `zz_<prefixe>_*` (règle des mods CK3 des Naufragés).
