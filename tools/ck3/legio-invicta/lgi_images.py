# Images for "Legio Invicta - Sons of Mars" (run from ck3-images-sources, output dir = argv[1])
import sys, os; sys.path.insert(0,'.')
from art import *
OUT=sys.argv[1]
GOLD=(214,170,50); CR=(250,226,170); TX=(225,210,195); DARK=(24,14,16); RED=(150,24,30); SIL=(18,10,14)
def rsky(w,h):
    im=Image.new('RGB',(w,h)); px=im.load()
    top=(20,8,12); mid=(110,24,28); bot=(240,150,60)
    for y in range(h):
        t=y/h
        a,b,u=(top,mid,t/0.6) if t<0.6 else (mid,bot,(t-0.6)/0.4)
        c=tuple(int(a[i]+(b[i]-a[i])*u) for i in range(3))
        for x in range(w): px[x,y]=c
    return im
def rays(im,cx,cy,n=28,r=1200,a=45):
    ov=Image.new('RGBA',im.size,(0,0,0,0)); od=ImageDraw.Draw(ov)
    for i in range(n):
        t=i/n*2*math.pi; t2=t+math.pi/n/1.5
        od.polygon([(cx,cy),(cx+r*math.cos(t),cy+r*math.sin(t)),(cx+r*math.cos(t2),cy+r*math.sin(t2))],fill=(255,210,120,a))
    return Image.alpha_composite(im.convert('RGBA'),ov.filter(ImageFilter.GaussianBlur(6))).convert('RGB')
def temple(d,x,g,s,c):
    w=260*s
    d.rectangle([x-w,g-20*s,x+w,g],fill=c)
    for k in range(8):
        cx=x-w+25*s+k*(2*w-50*s)/7; d.rectangle([cx-10*s,g-190*s,cx+10*s,g-20*s],fill=c)
    d.rectangle([x-w-10*s,g-215*s,x+w+10*s,g-190*s],fill=c)
    d.polygon([(x-w-15*s,g-215*s),(x,g-300*s),(x+w+15*s,g-215*s)],fill=c)
def eagle(d,x,y,s,c):
    # aquila: wings spread, on a pole with a wreath
    d.rectangle([x-4*s,y,x+4*s,y+330*s],fill=c)
    d.ellipse([x-40*s,y+40*s,x+40*s,y+110*s],outline=c,width=max(2,int(7*s)))
    d.polygon([(x,y-20*s),(x-110*s,y-90*s),(x-150*s,y-60*s),(x-90*s,y-20*s),(x-120*s,y),(x-30*s,y+20*s)],fill=c)
    d.polygon([(x,y-20*s),(x+110*s,y-90*s),(x+150*s,y-60*s),(x+90*s,y-20*s),(x+120*s,y),(x+30*s,y+20*s)],fill=c)
    d.ellipse([x-22*s,y-40*s,x+22*s,y+25*s],fill=c); d.ellipse([x-12*s,y-62*s,x+12*s,y-34*s],fill=c)
    d.polygon([(x+8*s,y-55*s),(x+28*s,y-48*s),(x+8*s,y-42*s)],fill=c)
def legionary(d,x,g,s,c,shield=RED):
    h=g-170*s
    d.ellipse([x-20*s,h-28*s,x+20*s,h+12*s],fill=c)
    d.polygon([(x-6*s,h-28*s),(x,h-60*s),(x+6*s,h-28*s)],fill=shield)  # crest
    d.polygon([(x-28*s,h+18*s),(x+28*s,h+18*s),(x+24*s,h+95*s),(x-24*s,h+95*s)],fill=c)
    d.rectangle([x-22*s,h+95*s,x-5*s,g],fill=c); d.rectangle([x+5*s,h+95*s,x+22*s,g],fill=c)
    d.line([x+36*s,g,x+36*s,h-70*s],fill=c,width=max(2,int(5*s)))
    d.rounded_rectangle([x-62*s,h+10*s,x-14*s,h+120*s],radius=int(8*s),fill=shield,outline=GOLD,width=max(1,int(3*s)))
    d.ellipse([x-46*s,h+55*s,x-30*s,h+75*s],fill=GOLD)
def hero(d,x,g,s,c):
    # floating Son of Mars with cape and raised fist
    h=g-230*s
    d.polygon([(x-30*s,h+20*s),(x-110*s,h+260*s),(x+110*s,h+260*s),(x+30*s,h+20*s)],fill=RED)
    d.ellipse([x-26*s,h-34*s,x+26*s,h+16*s],fill=c)
    d.polygon([(x-38*s,h+20*s),(x+38*s,h+20*s),(x+30*s,h+125*s),(x-30*s,h+125*s)],fill=c)
    d.rectangle([x-28*s,h+125*s,x-6*s,h+230*s],fill=c); d.rectangle([x+6*s,h+125*s,x+28*s,h+230*s],fill=c)
    d.polygon([(x+36*s,h+25*s),(x+60*s,h-80*s),(x+82*s,h-78*s),(x+52*s,h+40*s)],fill=c)
    d.ellipse([x+52*s,h-110*s,x+90*s,h-72*s],fill=c)
    d.polygon([(x-36*s,h+25*s),(x-70*s,h+100*s),(x-52*s,h+108*s),(x-24*s,h+45*s)],fill=c)
    # laurel
    for k in range(5):
        d.ellipse([x-30*s+k*12*s,h-44*s,x-18*s+k*12*s,h-30*s],fill=GOLD)
def keyart(w,h):
    im=rsky(w,h); s=min(w/1920,h/1080)*1.6; g=int(h*0.82)
    im=rays(im,w/2,g-330*s,r=max(w,h)*1.2); d=ImageDraw.Draw(im)
    d.polygon([(0,h),(0,g+15),(w*0.3,g-15),(w*0.7,g-15),(w,g+15),(w,h)],fill=SIL)
    temple(d,w*0.18,g,s*0.6,(40,16,20)); temple(d,w*0.82,g,s*0.6,(40,16,20))
    for k in range(-5,6):
        if k==0: continue
        legionary(d,w/2+k*95*s,g+6*s,s*0.42,SIL)
    eagle(d,w/2-360*s,g-330*s,s*0.5,GOLD); eagle(d,w/2+360*s,g-330*s,s*0.5,GOLD)
    hero(d,w/2,g-120*s,s*0.75,SIL)
    return im,d
def ct(d,t,y,f,c,x0,w): d.text((x0+(w-d.textlength(t,font=f))/2,y),t,font=f,fill=c)
def st(d,t,y,f,x0,w):
    for o in ((3,3),(2,2)): d.text((x0+(w-d.textlength(t,font=f))/2+o[0],y+o[1]),t,font=f,fill=(0,0,0))
    ct(d,t,y,f,CR,x0,w)
im,d=keyart(512,512)
st(d,'LEGIO',22,ImageFont.truetype(F,58),0,512); st(d,'INVICTA',84,ImageFont.truetype(F,58),0,512)
st(d,'Sons of Mars',154,ImageFont.truetype(F,28),0,512)
im.save(os.path.join(OUT,'thumbnail.png'))
im,d=keyart(1300,372)
st(d,'LEGIO INVICTA',22,ImageFont.truetype(F,72),0,1300)
st(d,'Sons of Mars  ·  Crusader Kings III',112,ImageFont.truetype(FR,30),0,1300)
im.save(os.path.join(OUT,'nexus-entete-1300x372.jpg'),quality=90)
im,d=keyart(1920,1080)
st(d,'LEGIO INVICTA',50,ImageFont.truetype(F,120),0,1920)
st(d,'Sons of Mars  ·  Fils de Mars',200,ImageFont.truetype(F,48),0,1920)
im.save(os.path.join(OUT,'nexus-image-1920x1080.jpg'),quality=90)
# How it works
im=rsky(1920,1080); d=ImageDraw.Draw(im)
fT=ImageFont.truetype(F,60); fN=ImageFont.truetype(F,56); fH=ImageFont.truetype(F,34); fB=ImageFont.truetype(FR,23)
ct(d,'HOW IT WORKS  ·  COMMENT ÇA MARCHE',45,fT,CR,0,1920)
ct(d,'Legio Invicta - Sons of Mars',125,ImageFont.truetype(FR,26),TX,0,1920)
steps=[('Awaken','Éveiller',['Decision "Awaken the Blood','of Mars": you become a Son','of Mars. Children inherit it.','—','Décision « Éveiller le sang','de Mars ». Vos enfants en','héritent (éveil à 16 ans).']),
('Grow stronger','Monter en puissance',['Train, fight wars and duels:','Legate at 100, immortal','Imperator Invictus at 300.','—','Entraînement, guerres, duels :','Légat à 100, Imperator','Invictus immortel à 300.']),
('Rule the world','Régner sur le monde',['Legions, triumphs, conquest','claims, subjugation and the','Imperium Invictum.','—','Légions, triomphes, droit de','conquête, soumission et','l\'Imperium Invictum.'])]
cw=540; gap=(1920-3*cw)/4; top=220; bh=800
for i,(en,fr,lines) in enumerate(steps):
    x0=gap+i*(cw+gap); cx=x0+cw/2
    d.rounded_rectangle([x0,top,x0+cw,top+bh],radius=24,fill=DARK,outline=GOLD,width=3)
    d.ellipse([cx-45,top-45,cx+45,top+45],fill=GOLD); ct(d,str(i+1),top-36,fN,DARK,x0,cw)
    ct(d,en,top+70,fH,CR,x0,cw); ct(d,fr,top+115,fB,TX,x0,cw)
    g=top+440
    if i==0: legionary(d,cx,g,1.1,(235,200,140))
    elif i==1: hero(d,cx,g-30,0.75,(235,200,140))
    else: eagle(d,cx,g-200,0.8,GOLD)
    d.line([x0+40,g+10,x0+cw-40,g+10],fill=GOLD,width=2)
    for k,t in enumerate(lines): ct(d,t,g+40+k*40,fB,CR if k<lines.index('—') else TX,x0,cw)
im.save(os.path.join(OUT,'comment-ca-marche-1920x1080.jpg'),quality=90)
# Trait icons 120x120 (dds)
def icon(name,bg,draw):
    im=Image.new('RGBA',(120,120),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.ellipse([4,4,116,116],fill=bg,outline=GOLD,width=5); draw(d)
    im.save(os.path.join(OUT,name+'.png')); return im
T=os.path.join(OUT,'legio_invicta','gfx','interface','icons','traits')
os.makedirs(T,exist_ok=True)
icons={
 'lgi_blood_latent':((70,30,34),lambda d:d.ellipse([46,40,74,80],fill=(200,40,40))),
 'lgi_blood_1':((120,20,26),lambda d:legionary(d,68,104,0.42,CR)),
 'lgi_blood_2':((130,20,26),lambda d:eagle(d,60,48,0.28,CR)),
 'lgi_blood_3':((40,10,14),lambda d:hero(d,58,104,0.27,GOLD)),
}
for n,(bg,fn) in icons.items():
    im=icon(n,bg,fn); im.save(os.path.join(T,n+'.dds')); os.remove(os.path.join(OUT,n+'.png'))
print('ok')
