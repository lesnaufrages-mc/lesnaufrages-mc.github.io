#!/bin/bash
# Rend une vidéo complète d'un format du kit, avec son, en 4 morceaux parallèles.
#   bash rendre.sh <format> <donnees.json> [ambiance]
#   -> <donnees>.mp4 à côté du fichier de données
set -e
M=$(cd "$(dirname "$0")" && pwd); F=$1; J=$(cd "$(dirname "$2")" && pwd)/$(basename "$2"); A=${3:-epique}
B=${J%.json}; W=$B.tmp; mkdir -p "$W"
node "$M/compose.js" "$F" "$J" events
D=$(python3 -c "import json;print(json.load(open('$B.events.json'))['duree'])")
python3 "$M/audio.py" "$B.events.json" "$W/son.wav" "$A"
python3 -c "
D=$D;n=4;s=D/n
for i in range(n): print(i, round(i*s,3), round(min(D,(i+1)*s),3))" > "$W/jobs.txt"
while read i a z; do node "$M/compose.js" "$F" "$J" "$W/m$i.mp4" $a $z > "$W/log$i.txt" 2>&1 & done < "$W/jobs.txt"; wait
for i in 0 1 2 3; do echo "file '$W/m$i.mp4'"; done > "$W/liste.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$W/liste.txt" -i "$W/son.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$B.mp4"
rm -rf "$W"; echo "OK $B.mp4"
