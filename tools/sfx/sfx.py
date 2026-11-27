#!/usr/bin/env python3
"""Sound designer des Naufragés : ajoute de vrais bruitages libres à une vidéo.

Inspiré de la méthode « Claude sound designer » (Real SFX + Openverse + Earshot),
refaite ici sans compte ni abonnement : Python + numpy + ffmpeg.

  python3 sfx.py moments  video.mp4  > moments.json    # 1. trouver les moments (coupes)
  python3 sfx.py tout     video.mp4  moments.json  dossier_sortie  [--fond fond.wav]

`tout` enchaîne : 2. chercher (Openverse, licences CC0 / CC BY / domaine public)
                  3. écouter (analyse + spectrogramme, note sur 100, 3 candidats)
                  4. placer et mixer (calé sur le pic ou l'attaque)
                  5. vérifier (niveau, saturation) et 6. rapport.md + credits.txt

moments.json = liste de {"t": 4.0, "type": "impact", "q": "war drum hit",
                         "d": 0, "gain": 0.8, "note": "changement de rang"}
Types : whoosh, impact, pop, clic, metal (épée), piece, rugissement, cloche, ambiance (d = durée).
"""
import json, os, re, subprocess, sys, time, urllib.parse, urllib.request
import numpy as np

SR = 48000
UA = 'NaufragesSoundDesigner/1.0'
LICENCES_OK = ('cc0', 'pdm', 'by')
# sons « célèbres » déposés comme marques ou repris de films : jamais, même s'ils sont mis en CC0 par l'uploadeur
INTERDITS = re.compile(r'mgm|metro.?goldwyn|disney|star ?wars|lightsaber|marvel|pixar|warner|thx|netflix|nintendo|mario|zelda|pokemon|minecraft|wilhelm|copyright|from (the )?(movie|film)', re.I)          # pas de NC (vidéos monétisées), pas de ND (on coupe le son)

# Profil attendu par type : durée (s), position du pic (0-1), brillance (Hz), attaque max (s), aligner sur
PROFILS = {
    'whoosh':      dict(dur=(0.3, 2.5), pic=(0.25, 0.85), cent=(600, 6000), att=None, cale='pic'),
    'impact':      dict(dur=(0.3, 5.0), pic=(0.0, 0.25), cent=(40, 1800), att=0.04, cale='attaque'),
    'pop':         dict(dur=(0.04, 0.8), pic=(0.0, 0.3), cent=(700, 9000), att=0.02, cale='attaque'),
    'clic':        dict(dur=(0.02, 0.5), pic=(0.0, 0.3), cent=(1000, 12000), att=0.01, cale='attaque'),
    'metal':       dict(dur=(0.2, 2.5), pic=(0.0, 0.6), cent=(1200, 12000), att=0.15, cale='attaque'),
    'piece':       dict(dur=(0.1, 4.0), pic=(0.0, 0.5), cent=(1800, 12000), att=0.03, cale='attaque'),
    'rugissement': dict(dur=(0.8, 6.0), pic=(0.05, 0.7), cent=(80, 2500), att=None, cale='attaque'),
    'cloche':      dict(dur=(0.5, 20.0), pic=(0.0, 0.2), cent=(300, 6000), att=0.03, cale='attaque'),
    'ambiance':    dict(dur=(2.0, 600), pic=(0.0, 1.0), cent=(80, 9000), att=None, cale='debut'),
}

def log(*a): print(*a, file=sys.stderr, flush=True)

def lire_audio(chemin, mono=True):
    cmd = ['ffmpeg', '-v', 'error', '-i', chemin, '-f', 'f32le', '-ac', '1' if mono else '2', '-ar', str(SR), '-']
    x = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype='<f4').copy()
    return x if mono else x.reshape(-1, 2)

def ecrire_wav(chemin, st):
    import wave
    st = np.clip(st, -1, 1)
    w = wave.open(chemin, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype('<i2').tobytes()); w.close()

def duree_video(v):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', v], capture_output=True, text=True).stdout
    return float(out.strip())

# ---------- 1. TROUVER LES MOMENTS (équivalent Real SFX) ----------
def moments(video, seuil=0.045):
    """Coupes franches ET fondus enchaînés (scores de changement d'image regroupés sur 0,8 s).
    Le type est deviné : forte coupe = impact, fondu = whoosh. À relire et compléter à la main
    (textes qui apparaissent, clics, coups) : c'est Claude/le monteur qui affine."""
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', video, '-vf', "scale=180:-1,select='gte(scene,0)',metadata=print",
                        '-an', '-f', 'null', '-'], capture_output=True, text=True)
    pts = re.findall(r'pts_time:([\d.]+)[^\n]*\n[^\n]*scene_score=([\d.]+)', r.stderr)
    pts = [(float(t), float(s)) for t, s in pts if float(t) > 0.3]
    groupes, cur = [], []
    for t, sc in pts:
        if sc < seuil: continue
        if cur and t - cur[-1][0] > 0.8: groupes.append(cur); cur = []
        cur.append((t, sc))
    if cur: groupes.append(cur)
    res = []
    for g in groupes:
        tm = (g[0][0] + g[-1][0]) / 2; mx = max(s for _, s in g)
        fort = mx > 0.18 and len(g) <= 2
        res.append({'t': round(tm, 2), 'type': 'impact' if fort else 'whoosh',
                    'q': 'cinematic boom' if fort else 'whoosh transition', 'gain': 0.6,
                    'note': ('coupe franche' if fort else 'fondu / transition') + f' (score {mx:.2f})'})
    return res

# ---------- 2. CHERCHER (Openverse) ----------
def openverse(q, n=12):
    p = urllib.parse.urlencode({'q': q, 'license': ','.join(LICENCES_OK), 'page_size': n, 'source': 'freesound'})
    req = urllib.request.Request('https://api.openverse.org/v1/audio/?' + p, headers={'User-Agent': UA})
    for essai in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r: return json.load(r).get('results', [])
        except Exception as e:
            log('  openverse:', e); time.sleep(5 * (essai + 1))
    return []

def telecharger(url, chemin):
    if os.path.exists(chemin) and os.path.getsize(chemin) > 1000: return True
    # on ne prend que le début (≈ 40 s en mp3) : les longues ambiances suffisent largement et le CDN est lent
    r = subprocess.run(['curl', '-sfL', '--max-time', '40', '-r', '0-650000', '-A', UA, '-o', chemin, url])
    if r.returncode == 28 and os.path.exists(chemin) and os.path.getsize(chemin) > 50000: r = subprocess.CompletedProcess([], 0)
    if r.returncode != 0 or not os.path.exists(chemin) or os.path.getsize(chemin) < 1000:
        if os.path.exists(chemin): os.remove(chemin)
        log('  téléchargement raté', url); return False
    return True

# ---------- 3. ÉCOUTER (équivalent Earshot) ----------
def analyser(x):
    """Ce que « l'oreille » retient d'un son : durée utile, pic, attaque, brillance, niveau, régularité."""
    a = np.abs(x); seuil = max(a.max() * 0.03, 1e-4)
    idx = np.nonzero(a > seuil)[0]
    if len(idx) == 0: return None
    deb, fin = idx[0], idx[-1]
    y = x[deb:fin + 1]
    hop = 480; nfen = max(1, len(y) // hop)
    rms = np.sqrt(np.mean(y[:nfen * hop].reshape(nfen, hop) ** 2, axis=1) + 1e-12) if nfen > 1 else np.array([np.sqrt(np.mean(y ** 2))])
    ipic = int(np.argmax(rms))
    jatt = np.nonzero(rms > rms.max() * 0.8)[0]
    attaque = (jatt[0] * hop) / SR if len(jatt) else 0
    seg = y[:min(len(y), SR * 4)]
    spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))); f = np.fft.rfftfreq(len(seg), 1 / SR)
    cent = float((spec * f).sum() / (spec.sum() + 1e-12))
    regul = float(np.std(20 * np.log10(rms + 1e-9)))     # faible = son stable (ambiance)
    return dict(debut=deb / SR, duree=len(y) / SR, pic=(ipic * hop) / SR, pic_rel=ipic / max(1, len(rms) - 1),
                attaque=attaque, centroide=cent, crete_db=float(20 * np.log10(a.max() + 1e-9)),
                rms_db=float(20 * np.log10(np.sqrt(np.mean(y ** 2)) + 1e-9)), irregularite_db=regul,
                sature=bool((a > 0.995).mean() > 0.001))

def noter(an, m):
    """Note sur 100 : est-ce que ça colle au moment ? (durée, forme, brillance, attaque, propreté)"""
    pr = PROFILS.get(m['type'], PROFILS['impact']); note, pourquoi = 100, []
    def dans(v, lo, hi): return lo <= v <= hi
    if not dans(an['duree'], *pr['dur']): note -= 30; pourquoi.append(f"durée {an['duree']:.1f}s hors {pr['dur']}")
    if m['type'] == 'ambiance' and m.get('d') and an['duree'] < m['d'] * 0.5: note -= 15; pourquoi.append('trop court, il faudra boucler')
    if not dans(an['pic_rel'], *pr['pic']): note -= 20; pourquoi.append(f"pic mal placé ({an['pic_rel']:.0%})")
    if not dans(an['centroide'], *pr['cent']): note -= 20; pourquoi.append(f"brillance {an['centroide']:.0f} Hz hors {pr['cent']}")
    if pr['att'] and an['attaque'] > pr['att']: note -= 15; pourquoi.append(f"attaque molle ({an['attaque']*1000:.0f} ms)")
    if m['type'] == 'ambiance' and an['irregularite_db'] > 9: note -= 15; pourquoi.append('ambiance irrégulière')
    if an['sature']: note -= 15; pourquoi.append('saturé')
    if an['rms_db'] < -45: note -= 20; pourquoi.append('trop faible')
    return max(0, note), (', '.join(pourquoi) or 'colle au moment')

def spectrogramme(chemin, png):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', chemin, '-lavfi',
                    'showspectrumpic=s=480x160:legend=0:color=intensity,format=rgb24', png])

# ---------- son de secours (si aucun candidat n'est bon : on fabrique, pas « le moins pire ») ----------
def synthese(m):
    typ = m['type']; d = {'whoosh': 1.0, 'impact': 1.5, 'pop': .15, 'clic': .05, 'metal': .8, 'piece': .3,
                          'rugissement': 2.5, 'cloche': 3, 'ambiance': m.get('d') or 4}.get(typ, 1)
    n = int(SR * d); t = np.arange(n) / SR; rng = np.random.default_rng(int(m['t'] * 1000))
    def bruit(lo, hi):
        X = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR); X *= (f >= lo) & (f <= hi)
        y = np.fft.irfft(X, n); return y / (np.abs(y).max() + 1e-9)
    if typ == 'whoosh': x = bruit(300, 6000) * np.sin(np.pi * t / d) ** 3
    elif typ == 'impact': x = np.sin(2 * np.pi * (45 + 80 * np.exp(-t * 12)) * t) * np.exp(-t * 3.5) + .3 * bruit(100, 2000) * np.exp(-t * 25)
    elif typ in ('pop', 'clic'): x = np.sin(2 * np.pi * (1800 if typ == 'pop' else 4000) * t) * np.exp(-t * 60)
    elif typ == 'metal': x = (np.sin(2 * np.pi * 2900 * t) + .7 * np.sin(2 * np.pi * 4100 * t) + .4 * bruit(2000, 9000)) * np.exp(-t * 5) * np.clip(t / .3, 0, 1)
    elif typ == 'piece': x = (np.sin(2 * np.pi * 4200 * t) + .6 * np.sin(2 * np.pi * 6200 * t)) * np.exp(-t * 18)
    elif typ == 'cloche': x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, k in [(523, 1.2), (1046, 2), (1569, 3)])
    elif typ == 'rugissement': g = np.sin(2 * np.pi * (95 + 30 * np.sin(t * 9)) * t); x = (np.sign(g) * .6 + g * .4) * np.clip(t / .08, 0, 1) * np.exp(-np.clip(t - 1.6, 0, None) * 3)
    else: x = bruit(200, 3000) * np.clip(t / .5, 0, 1) * np.clip((d - t) / .5, 0, 1)
    return x / (np.abs(x).max() + 1e-9) * 0.8

# ---------- 4. PLACER ----------
def preparer(x, an, m):
    """Coupe le silence du début, boucle une ambiance trop courte, fondus doux."""
    y = x[int(an['debut'] * SR): int((an['debut'] + an['duree']) * SR)].copy()
    if m['type'] == 'ambiance' and m.get('d'):
        need = int(m['d'] * SR)
        while len(y) < need:
            fade = min(int(.3 * SR), len(y) // 4); r = np.linspace(0, 1, fade)
            y = np.concatenate([y[:-fade], y[-fade:] * (1 - r) + y[:fade] * r, y[fade:]])
        y = y[:need]; fi = min(len(y) // 4, int(.6 * SR))
        y[:fi] *= np.linspace(0, 1, fi); y[-fi:] *= np.linspace(1, 0, fi)
    else:
        fo = min(len(y) // 5, int(.15 * SR)); y[-fo:] *= np.linspace(1, 0, fo)
        if len(y) > SR * PROFILS.get(m['type'], PROFILS['impact'])['dur'][1]:
            y = y[:int(SR * PROFILS[m['type']]['dur'][1])]; f2 = int(.3 * SR); y[-f2:] *= np.linspace(1, 0, f2)
    rms = np.sqrt(np.mean(y ** 2)) + 1e-9
    return y * (0.12 / rms) if m['type'] != 'ambiance' else y * (0.05 / rms)   # niveau de base, puis gain du moment

def tout(video, fichier_moments, sortie, fond=None, fond_gain=1.0):
    os.makedirs(sortie, exist_ok=True); cache = os.path.join(sortie, 'sons'); os.makedirs(cache, exist_ok=True)
    ecoute = os.path.join(sortie, 'ecoute'); os.makedirs(ecoute, exist_ok=True)
    ms = json.load(open(fichier_moments)); D = duree_video(video); N = int(D * SR) + SR
    piste = np.zeros(N); pan = np.zeros((N, 2)); choix = []
    cache_req = {}
    for i, m in enumerate(ms):
        log(f"[{i+1}/{len(ms)}] {m['t']:6.2f}s {m['type']:<11} « {m['q']} »")
        if m['q'] not in cache_req: cache_req[m['q']] = openverse(m['q']); time.sleep(1.5)
        cands = []
        for r in cache_req[m['q']]:
            if r.get('license') not in LICENCES_OK or not r.get('url'): continue
            if INTERDITS.search((r.get('title') or '') + ' ' + ' '.join(t['name'] for t in r.get('tags') or [])): continue
            dur = (r.get('duration') or 0) / 1000
            if dur and dur > PROFILS.get(m['type'], PROFILS['impact'])['dur'][1] * 4 and m['type'] != 'ambiance': continue
            ch = os.path.join(cache, r['id'] + '.mp3')
            if not telecharger(r['url'], ch): continue
            try: x = lire_audio(ch)
            except Exception: continue
            an = analyser(x)
            if not an: continue
            note, pq = noter(an, m)
            if r['license'] == 'by': note -= 3          # CC0 préféré : pas de crédit obligatoire
            cands.append(dict(r=r, x=x, an=an, note=note, pourquoi=pq, fichier=ch))
            if len(cands) >= 5: break
        cands.sort(key=lambda c: -c['note']); top = cands[:3]
        for j, c in enumerate(top): spectrogramme(c['fichier'], os.path.join(ecoute, f"{i+1:02d}-{j+1}.png"))
        if top and top[0]['note'] >= 60:
            c = top[0]; y = preparer(c['x'], c['an'], m); src = dict(titre=c['r']['title'], auteur=c['r'].get('creator'),
                licence=c['r']['license'].upper() + ' ' + (c['r'].get('license_version') or ''), lien=c['r']['foreign_landing_url'])
            pic = c['an']['pic'] - c['an']['debut']; why = f"{c['note']}/100 : {c['pourquoi']}"
        else:
            x = synthese(m); an = analyser(x); y = preparer(x, an, m); src = dict(titre='son fabriqué (synthèse)', auteur='Les Naufragés', licence='—', lien='')
            pic = an['pic']; why = 'aucun candidat ≥ 60/100' + (f" (meilleur {top[0]['note']}/100 : {top[0]['pourquoi']})" if top else ' (aucun résultat)') + ' → son fabriqué'
        cale = PROFILS.get(m['type'], PROFILS['impact'])['cale']
        debut = m['t'] - (pic if cale == 'pic' else 0)
        a = int(max(0, debut) * SR); y = y[int(max(0, -debut) * SR):] * m.get('gain', 1.0); b = min(N, a + len(y))
        p = m.get('pan', 0.0); pan[a:b, 0] += y[:b - a] * (1 - p * .5); pan[a:b, 1] += y[:b - a] * (1 + p * .5)
        choix.append(dict(m=m, src=src, why=why, candidats=[(c['r']['title'], c['note']) for c in top]))
        log('   ->', src['titre'], '|', why)
    # mix avec le fond (musique d'origine) puis limiteur doux
    mix = pan.copy()
    if fond:
        f = lire_audio(fond, mono=False)[:N]; mix[:len(f)] += f * fond_gain
    mix = mix[:int(D * SR)]
    crete = np.abs(mix).max(); mix = np.tanh(mix * 1.1) if crete > 0.9 else mix
    mix /= max(np.abs(mix).max() / 0.89, 1.0)
    wav = os.path.join(sortie, 'mix-sfx.wav'); ecrire_wav(wav, mix)
    nom = os.path.splitext(os.path.basename(video))[0] + '-SFX.mp4'; out = os.path.join(sortie, nom)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
    # ---------- 5. VÉRIFIER ----------
    r = subprocess.run(['ffmpeg', '-i', out, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    lufs = re.findall(r'I:\s+(-?[\d.]+) LUFS', r); lufs = lufs[-1] if lufs else '?'
    # ---------- 6. RAPPORT ----------
    with open(os.path.join(sortie, 'rapport.md'), 'w') as fr:
        fr.write(f"# Rapport sound design : {os.path.basename(video)}\n\nVidéo : {nom} · niveau {lufs} LUFS (cible réseaux ≈ -14) · {len(choix)} bruitages\n\n")
        fr.write('| Temps | Moment | Son retenu | Licence | Pourquoi | Autres candidats |\n|---|---|---|---|---|---|\n')
        for c in choix:
            m, s = c['m'], c['src']; lien = f"[{s['titre']}]({s['lien']})" if s['lien'] else s['titre']
            autres = '; '.join(f"{t} ({n})" for t, n in c['candidats'][1:]) or '—'
            fr.write(f"| {m['t']:.2f} s | {m.get('note', m['type'])} | {lien} — {s['auteur']} | {s['licence']} | {c['why']} | {autres} |\n")
        fr.write('\nSpectrogrammes des 3 meilleurs candidats par moment : dossier ecoute/ (NN-1.png = retenu).\n')
    cred = sorted({(c['src']['titre'], c['src']['auteur'], c['src']['licence'], c['src']['lien']) for c in choix if c['src']['lien']})
    with open(os.path.join(sortie, 'credits.txt'), 'w') as fc:
        fc.write('Bruitages (Freesound via Openverse) :\n')
        for t, a, l, u in cred: fc.write(f"- « {t} » par {a} ({l.strip()}) {u}\n")
    log('OK', out, lufs, 'LUFS')
    return out

if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(1)
    if a[0] == 'moments': print(json.dumps(moments(a[1]), ensure_ascii=False, indent=1))
    elif a[0] == 'tout':
        fond = a[a.index('--fond') + 1] if '--fond' in a else None
        g = float(a[a.index('--fond-gain') + 1]) if '--fond-gain' in a else 1.0
        tout(a[1], a[2], a[3], fond, g)
    else: print(__doc__); sys.exit(1)
