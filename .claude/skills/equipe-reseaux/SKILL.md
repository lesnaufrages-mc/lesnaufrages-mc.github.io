---
name: equipe-reseaux
description: Lance l'équipe réseaux des Naufragés (chercheur, espion, scénariste, réalisateur, monteur, publieur) pour produire des Shorts ; lord ne fait que dire oui ou non. À utiliser pour « lance l'équipe réseaux », « trouve-moi des sujets de Shorts », « prépare les vidéos de la semaine ».
---

# Équipe réseaux

Six agents (dans `.claude/agents/`) travaillent à la chaîne. Leur règle commune est
dans `reseaux/niche.md` : lis-la d'abord.

## Étape A : les idées (automatique)
1. Crée le dossier du jour : `/mnt/project-files/reseaux/AAAA-MM-JJ/`
   (sur le PC de lord, sans dossier de projet : `reseaux/sorties/AAAA-MM-JJ/`).
2. Lance **chercheur** et **espion** en parallèle (ils écrivent `1-tendances.md`
   et `2-concurrents.md`).
3. Lance **scenariste** : 3 scripts dans `scripts/`.
4. Montre à lord les 3 accroches (une ligne chacune) et demande **lequel tourner**.
   Arrête-toi là tant qu'il n'a pas choisi.

## Étape B : la vidéo (après le choix de lord)
5. **realisateur** puis **monteur** sur le script choisi.
6. **publieur** : `a-valider.md`, puis **oui / non** de lord par vidéo.
   Jamais de publication sans « oui ».

## Bon à savoir
- Coût : les recherches vidIQ coûtent des crédits (5 à 10 par appel) : chercheur
  et espion se limitent à 6 appels chacun par lancement.
- Une fois par semaine suffit (par exemple le lundi), pas tous les jours.
- Si un agent n'a pas d'outil vidIQ, il passe par la recherche web et le dit.
