# Son de synthèse du kit (aucun fichier externe, aucun droit à payer) : nappe + bruitages calés sur EVENTS().
# python3 audio.py <donnees>.events.json sortie.wav [ambiance]   ambiance = epique (défaut) | calme | tension
import json, sys, wave, numpy as np
ev = json.load(open(sys.argv[1])); out = sys.argv[2]; amb = sys.argv[3] if len(sys.argv) > 3 else 'epique'
SR = 48000; D = ev['duree']; N = int(SR * D); t = np.arange(N) / SR; rng = np.random.default_rng(3)
mix = np.zeros((N, 2))
def add(sig, g, pan=0): mix[:, 0] += sig * g * (1 - pan * .5); mix[:, 1] += sig * g * (1 + pan * .5)
def band(lo, hi, n):
    x = rng.standard_normal(n); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR); X *= ((f >= lo) & (f <= hi)); y = np.fft.irfft(X, n); return y / (np.abs(y).max() + 1e-9)
SUITES = {'epique': [[110, 130.8, 164.8], [87.3, 110, 130.8], [130.8, 164.8, 196], [98, 123.5, 146.8]],
          'calme': [[130.8, 164.8, 196], [110, 130.8, 164.8], [87.3, 110, 130.8], [98, 123.5, 146.8]],
          'tension': [[110, 130.8, 155.6], [103.8, 123.5, 155.6], [110, 130.8, 164.8], [98, 116.5, 146.8]]}
ch = SUITES.get(amb, SUITES['epique']); pad = np.zeros(N)
for i in range(int(D / 4) + 1):
    a = i * 4; c = ch[i % 4]; m = (t >= a) & (t < a + 4.3); tt = t[m] - a
    e = np.clip(tt / .7, 0, 1) * np.clip((4.3 - tt) / .7, 0, 1)
    for f in c: pad[m] += e * (np.sin(2 * np.pi * f * tt) + .3 * np.sin(2 * np.pi * 2 * f * tt + .4) + .12 * np.sin(2 * np.pi * 3 * f * tt))
pad /= np.abs(pad).max(); fade = np.clip(t / 1.0, 0, 1) * np.clip((D - t) / 1.2, 0, 1)
add(pad * fade, .2)
if amb != 'calme':  # pulsation de basse
    k = np.zeros(N)
    for b in np.arange(1, D - 1, .5): m = (t >= b) & (t < b + .35); tt = t[m] - b; k[m] += np.sin(2 * np.pi * 55 * tt * (1 - tt)) * np.exp(-tt * 10)
    add(k * fade, .32)
for e in ev['events']:
    a = e['t']; ty = e['type']
    if ty == 'whoosh':
        n = int(SR * .7); s = band(500, 7000, n) * np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    elif ty == 'tick':
        n = int(SR * .25); tt = np.arange(n) / SR; s = (np.sin(2 * np.pi * 1320 * tt) + .5 * np.sin(2 * np.pi * 1980 * tt)) * np.exp(-tt * 28) + .4 * band(2000, 9000, n) * np.exp(-tt * 60)
    elif ty == 'impact':
        n = int(SR * 1.4); tt = np.arange(n) / SR; s = np.sin(2 * np.pi * 48 * tt * (1 - .3 * tt)) * np.exp(-tt * 3.5) * 1.3 + band(60, 900, n) * np.exp(-tt * 7) * .7
    else:  # fin : accord qui s'ouvre
        n = int(SR * 3); tt = np.arange(n) / SR; s = sum(np.sin(2 * np.pi * f * tt) for f in (196, 246.9, 293.7, 392)) / 4 * np.clip(tt / .3, 0, 1) * np.exp(-tt * .9)
    i0 = int(a * SR); i1 = min(N, i0 + len(s)); s = s[: i1 - i0]
    if len(s): mix[i0:i1, 0] += s * .5; mix[i0:i1, 1] += s * .5
mix /= max(1e-9, np.abs(mix).max() / .89)
w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes()); w.close()
print('son', out, round(D, 1), 's')
