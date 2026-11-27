# Kit de formats vidéo des Naufragés

Idée reprise d'un TikTok @system_ia (« Kit Systemia » : 20 formats de vidéos animées,
chaque image est **codée**, pas devinée par une IA : 0 crédit par vidéo, rien ne fond,
tout reste modifiable). Chez nous : un format = une page HTML, une vidéo = un petit
fichier JSON. On change le texte, on relance, la vidéo est refaite.

| Format | Pour quoi | Exemple |
|---|---|---|
| `classement` | Top 10 révélé du 10e au 1er, barres qui poussent, + une surprise | `exemples/plus-grands-empires.json` |
| `chronologie` | Une frise qui défile, une date toutes les 3 s, la dernière en rouge | `exemples/rome-en-7-dates.json` |
| `versus` | A contre B, critère par critère, score, verdict | `exemples/rome-contre-mongols.json` |

Tous finissent par la même carte : question + « Les Naufragés · lesnaufrages.net ».
Format 1080x1920 (TikTok, Shorts, Reels), son de synthèse sans droits.

## Faire une vidéo
```bash
cd tools/formats/moteur
cp ../exemples/rome-en-7-dates.json ../exemples/mon-sujet.json   # puis modifier le texte
node compose.js chronologie ../exemples/mon-sujet.json - 2 10 20   # aperçus PNG
bash rendre.sh chronologie ../exemples/mon-sujet.json tension      # vidéo complète (~1 min)
```
Ambiances du son : `epique` (défaut), `calme`, `tension`.
Il faut Node + Playwright (Chromium), Python 3 + numpy, ffmpeg.

## Règles
- **Un chiffre = une source**, écrite dans le champ `source` (affichée en bas).
- L'accroche (2 premières secondes) contredit une idée reçue : « Rome n'est même pas dans le top 10 ».
- Ajouter un format = copier un HTML de `formats/`, garder `DURATION`, `render(t)` et `EVENTS()`
  (voir l'en-tête de `moteur/commun.js`).
- Thèmes faciles : empires, batailles, rois, papes, Minecraft (records, mobs), CK3 (dynasties).
