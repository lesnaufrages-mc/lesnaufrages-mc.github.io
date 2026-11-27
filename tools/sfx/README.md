# Sound designer (bruitages automatiques)

Ajoute de **vrais bruitages libres** à une vidéo, calés à la frame près.
Idée reprise d'un TikTok « Claude sound designer » (Real SFX + Openverse + Earshot),
refaite ici **sans compte ni abonnement** : Python 3 + numpy + ffmpeg.

## Les 6 étapes
1. **Trouver les moments** : `python3 sfx.py moments video.mp4 > moments.json`
   repère les coupes franches et les fondus. Ensuite on complète à la main (ou Claude
   le fait) : texte qui apparaît, coup d'épée, pièces, rugissement…
2. **Chercher** : pour chaque moment, 6 candidats sur [Openverse](https://openverse.org)
   (Freesound), licences **CC0, domaine public ou CC BY** seulement
   (pas de NC : nos vidéos sont monétisées ; pas de ND : on coupe les sons).
   Les sons « célèbres » (lion MGM, sabre laser, cri Wilhelm, sons de films ou de jeux) sont
   écartés même s'ils sont mis en CC0 : ce sont des marques, Content ID les repère.
3. **Écouter** : chaque son est analysé (durée utile, position du pic, attaque,
   brillance, niveau, saturation) et noté sur 100 par rapport au type de moment.
   Les 3 meilleurs ont un spectrogramme dans `ecoute/` pour vérifier à l'œil.
4. **Choisir / fabriquer** : on prend le meilleur s'il a au moins 60/100.
   Sinon on **fabrique** un son (synthèse) au lieu de garder « le moins pire ».
5. **Placer et mixer** : silence du début coupé ; un whoosh est calé sur son pic,
   un impact sur son attaque ; ambiances bouclées sur la durée `d` avec fondus.
   Mélange avec la musique (`--fond`), limiteur doux, vérification du niveau (LUFS).
6. **Rapport** : `rapport.md` (tableau : temps, son, licence, pourquoi, autres
   candidats) + `credits.txt` à coller dans la description si un son est en CC BY.

## Commande complète
```
python3 tools/sfx/sfx.py tout video.mp4 moments.json sortie/ --fond musique.wav --fond-gain 0.55
```
Sortie : `sortie/<video>-SFX.mp4`, `rapport.md`, `credits.txt`, `sons/`, `ecoute/`.

## moments.json
```json
[
 {"t": 4.02, "type": "impact", "q": "war drum hit", "gain": 0.9, "note": "rang I"},
 {"t": 20.3, "type": "ambiance", "d": 7.4, "q": "crowd cheering", "gain": 0.8, "note": "procession"}
]
```
Types : `whoosh`, `impact`, `pop`, `clic`, `metal` (épée), `piece`, `rugissement`, `cloche`, `ambiance`.
`q` = recherche en anglais (Freesound est surtout en anglais). `pan` de -1 à 1.

Exemple réel : `exemple-cour-de-byzance.json` (Short « Ta vie à chaque rang de la cour de Byzance »).
