import numpy as np, wave
SR=44100
def t(d): return np.arange(int(SR*d))/SR
def env(n,a=0.01,r=0.1):
    e=np.ones(n); ai=int(a*SR); ri=int(r*SR)
    if ai: e[:ai]=np.linspace(0,1,ai)
    if ri: e[-ri:]=np.linspace(1,0,ri)
    return e
def brass(f,d,vib=0,vf=5):
    x=t(d); ph=2*np.pi*np.cumsum(f*(1+vib*np.sin(2*np.pi*vf*x)))/SR
    s=sum(np.sin(k*ph)/k**0.8 for k in range(1,9))
    return s*env(len(x),0.03,0.08)
def save(name,s):
    s=s/np.max(np.abs(s))*0.85
    w=wave.open(name+'.wav','w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((s*32767).astype(np.int16).tobytes()); w.close()
rng=np.random.default_rng(1)
def tom(f,d=0.25):
    x=t(d); fr=f*(1+0.6*np.exp(-x*25)); s=np.sin(2*np.pi*np.cumsum(fr)/SR)*np.exp(-x*12)
    return s+0.2*rng.standard_normal(len(x))*np.exp(-x*60)
def cymb(d=1.3):
    x=t(d); n=rng.standard_normal(len(x)); n=np.diff(n,prepend=0)
    return n*np.exp(-x*3.5)*0.5
gap=lambda d: np.zeros(int(SR*d))
save('ba-dum-tss',np.concatenate([tom(180),gap(0.05),tom(140),gap(0.08),cymb()]))
notes=[(392,0.45),(370,0.45),(349,0.45),(330,1.6)]
save('trombone-triste',np.concatenate([brass(f,d,vib=0.03 if d>1 else 0.01,vf=6) for f,d in notes]))
def bell(d=2.2):
    x=t(d); s=sum(a*np.sin(2*np.pi*f*x)*np.exp(-x*k) for f,a,k in [(523,1,1.5),(1250,0.6,2.5),(1690,0.4,3),(2380,0.3,4),(3100,0.2,5)])
    s[:200]*=np.linspace(0,1,200); return s
save('cloche-du-navire',np.concatenate([bell(1.0),bell(2.4)]))
x=t(0.9); f=200+500*np.exp(-x*3)+40*np.sin(2*np.pi*14*x)*np.exp(-x*2)
save('boing',np.sin(2*np.pi*np.cumsum(f)/SR)*env(len(x),0.005,0.25))
fan=[(523,0.14),(659,0.14),(784,0.14),(1047,0.5),(784,0.14),(1047,1.0)]
save('victoire',np.concatenate([brass(f,d,vib=0.006 if d>0.4 else 0) for f,d in fan]))
def honk(d=0.35):
    x=t(d); s=np.sign(np.sin(2*np.pi*(420+30*np.sin(2*np.pi*30*x))*x))*0.6+np.sin(2*np.pi*840*x)*0.3
    return s*env(len(x),0.01,0.05)
save('pouet-pouet',np.concatenate([honk(),gap(0.12),honk(0.5)]))
save('suspense',np.concatenate([brass(147,0.35),gap(0.12),brass(139,0.35),gap(0.15),brass(117,2.0,vib=0.012,vf=5)]))
