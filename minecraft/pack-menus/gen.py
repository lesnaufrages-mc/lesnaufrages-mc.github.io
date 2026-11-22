from PIL import Image, ImageDraw
import random, json, os
W=176
def H(rows): return 17+18*rows+97   # 6 rows -> 222
C=dict(wd=(58,38,22),w1=(84,56,33),w2=(96,65,39),w3=(74,49,29),seam=(40,26,15),
       g0=(110,80,30),g1=(201,161,74),g2=(240,210,122),gd=(80,56,20),
       p0=(232,213,168),p1=(217,192,138),p2=(196,166,108),pe=(150,118,70),
       s0=(43,29,18),s1=(28,19,12),sl=(120,92,60),
       red=(120,28,28),red2=(150,40,36),navy=(26,40,66),navy2=(38,58,92))
def planks(im,x0,y0,x1,y1,seed=1,ph=6):
    r=random.Random(seed); d=ImageDraw.Draw(im)
    y=y0; k=0
    while y<y1:
        base=[C['w1'],C['w2'],C['w3']][k%3]
        d.rectangle([x0,y,x1,min(y+ph-1,y1)],fill=base)
        # grain
        for _ in range((x1-x0)//6):
            gx=r.randint(x0,x1-4); gy=r.randint(y,min(y+ph-2,y1))
            c=tuple(max(0,v-12) for v in base); d.line([gx,gy,gx+r.randint(2,6),gy],fill=c)
        # seam + offset joints
        if y+ph-1<=y1: d.line([x0,y+ph-1,x1,y+ph-1],fill=C['seam'])
        jx=x0+r.randint(10,60)
        while jx<x1:
            d.line([jx,y,jx,min(y+ph-2,y1)],fill=C['seam'])
            if r.random()<.5: d.point([jx+2,y+2],fill=(30,20,12))
            jx+=r.randint(40,80)
        y+=ph; k+=1
def frame(im,x0,y0,x1,y1,gold=True):
    d=ImageDraw.Draw(im)
    d.rectangle([x0,y0,x1,y1],outline=C['s1'])
    if gold:
        d.rectangle([x0+1,y0+1,x1-1,y1-1],outline=C['g1'])
        d.line([x0+1,y0+1,x1-1,y0+1],fill=C['g2']); d.line([x0+1,y0+1,x0+1,y1-1],fill=C['g2'])
        d.line([x0+1,y1-1,x1-1,y1-1],fill=C['g0']); d.line([x1-1,y0+1,x1-1,y1-1],fill=C['g0'])
        d.rectangle([x0+2,y0+2,x1-2,y1-2],outline=C['gd'])
def parchment(im,x0,y0,x1,y1,seed=3):
    r=random.Random(seed); d=ImageDraw.Draw(im)
    d.rectangle([x0,y0,x1,y1],fill=C['p0'])
    for _ in range((x1-x0)*(y1-y0)//18):
        d.point([r.randint(x0,x1),r.randint(y0,y1)],fill=r.choice([C['p1'],C['p1'],C['p2']]))
    for i in range(3):
        d.rectangle([x0+i,y0+i,x1-i,y1-i],outline=[C['pe'],C['p2'],C['p1']][i])
    # burnt corners
    for (cx,cy) in [(x0,y0),(x1,y0),(x0,y1),(x1,y1)]:
        for dx in range(3):
            for dy in range(3-dx):
                d.point([cx+(dx if cx==x0 else -dx), cy+(dy if cy==y0 else -dy)],fill=C['wd'])
def slot(im,x,y,style='std'):
    d=ImageDraw.Draw(im)
    if style=='gold':
        d.rectangle([x-1,y-1,x+18,y+18],outline=C['g0'])
        d.rectangle([x,y,x+17,y+17],fill=C['g1'])
        d.line([x,y,x+17,y],fill=C['g2']); d.line([x,y,x,y+17],fill=C['g2'])
        d.rectangle([x+1,y+1,x+16,y+16],fill=C['s0'])
        d.line([x+1,y+16,x+16,y+16],fill=C['sl']); d.line([x+16,y+1,x+16,y+16],fill=C['sl'])
        for (a,b) in [(x-1,y-1),(x+18,y-1),(x-1,y+18),(x+18,y+18)]: d.point([a,b],fill=C['g2'])
    elif style in ('tile','or','argent','bronze'):
        hi,mid,lo={'tile':(C['g2'],C['g1'],C['g0']),'or':((255,236,140),(222,180,60),(150,110,20)),
                   'argent':((240,240,248),(190,190,200),(120,120,130)),'bronze':((230,160,100),(185,115,60),(110,65,30))}[style]
        d.rectangle([x,y,x+17,y+17],fill=mid)
        d.line([x,y,x+17,y],fill=hi); d.line([x,y,x,y+17],fill=hi)
        d.line([x,y+17,x+17,y+17],fill=lo); d.line([x+17,y,x+17,y+17],fill=lo)
        d.rectangle([x+1,y+1,x+16,y+16],fill=(52,36,22))
        d.rectangle([x+2,y+2,x+15,y+15],fill=(66,46,28))
        d.line([x+1,y+1,x+16,y+1],fill=C['s1']); d.line([x+1,y+1,x+1,y+16],fill=C['s1'])
    else:
        d.rectangle([x,y,x+17,y+17],fill=C['s0'])
        d.line([x,y,x+17,y],fill=C['s1']); d.line([x,y,x,y+17],fill=C['s1'])
        d.line([x+1,y+17,x+17,y+17],fill=C['sl']); d.line([x+17,y+1,x+17,y+17],fill=C['sl'])
def pos(s): return 7+18*(s%9), 17+18*(s//9)
def anchor(im,x,y,col):
    d=ImageDraw.Draw(im)
    pts=[(3,0),(2,1),(4,1),(3,1),(3,2),(1,3),(2,3),(3,3),(4,3),(5,3),(3,4),(3,5),(3,6),(0,5),(6,5),(1,6),(5,6),(2,7),(3,7),(4,7)]
    for a,b in pts: d.point([x+a,y+b],fill=col)
def banner(im,color,color2):
    d=ImageDraw.Draw(im)
    d.rectangle([4,3,171,15],fill=color)
    d.line([4,3,171,3],fill=color2); d.line([4,15,171,15],fill=C['s1'])
    frame(im,3,2,172,16)
    # remove inner gold 2nd line inside banner to keep it slim
    d.rectangle([5,4,170,14],fill=color); d.line([5,4,170,4],fill=color2)
    anchor(im,160,5,C['g2'])
def podium(im,s,col,h):
    d=ImageDraw.Draw(im); x,y=pos(s)
    d.rectangle([x-3,y+19,x+20,y+19+h],fill=col[0]); d.line([x-3,y+19,x+20,y+19],fill=col[1])
    d.rectangle([x-3,y+19,x+20,y+19+h],outline=C['s1'])
def build(name,rows,slots,gold=(),bar=True,bcol=('navy','navy2'),extra=None,seed=7):
    h=H(rows); im=Image.new('RGBA',(W,h),(0,0,0,0))
    planks(im,0,0,W-1,h-1,seed)
    d=ImageDraw.Draw(im)
    # outer frame with cut corners
    frame(im,0,0,W-1,h-1)
    for (cx,cy) in [(0,0),(W-1,0),(0,h-1),(W-1,h-1)]:
        im.putpixel((cx,cy),(0,0,0,0))
    banner(im,C[bcol[0]],C[bcol[1]])
    top=17+18; bottom=17+18*(rows-1)-1 if bar else 17+18*rows-1
    parchment(im,5,top-1,W-6,bottom+1,seed+1)
    if extra: extra(im)
    for s in slots: slot(im,*pos(s),gold.get(s,'tile') if isinstance(gold,dict) else ('gold' if s in gold else 'tile'))
    # player inventory
    iy=17+18*rows+13
    d.rectangle([5,iy-2,W-6,iy+3*18+4+18+1],outline=C['seam'])
    for r_ in range(3):
        for c in range(9): slot(im,7+18*c,iy+r_*18)
    for c in range(9): slot(im,7+18*c,iy+58)
    im.save(f'assets/naufrages/textures/gui/{name}.png')
    return h
os.makedirs('assets/naufrages/textures/gui',exist_ok=True)
menus={}
r=lambda a,b: list(range(a,b+1))
menus['metiers']=(6, [4]+r(10,16)+r(19,25)+[30,32]+[45,47,48,49,50,51,53], [4], ('red','red2'))
def top_extra(im):
    podium(im,13,[(212,175,55),(255,223,120)],3)
    podium(im,21,[(170,170,180),(220,220,230)],3)
    podium(im,23,[(160,100,50),(205,140,80)],3)
menus['metiers_top']=(5, [4,13,21,23]+r(28,34)+[40,44], {4:'gold',13:'or',21:'argent',23:'bronze'}, ('red','red2'))
menus['faction']=(6, [4]+r(10,16)+r(19,25)+r(29,33)+[45,49,53], [4], ('navy','navy2'))
menus['faction_relations']=(4, [10,11,12,13,15,16,22,31], [], ('navy','navy2'))
menus['faction_membres']=(6, [4]+r(10,16)+r(19,25)+r(28,34)+r(37,43)+[45,47,49,51,53], [4], ('navy','navy2'))
menus['faction_top']=(6, [4,13,21,23]+r(28,34)+r(37,43)+[45,49,53], {4:'gold',13:'or',21:'argent',23:'bronze'}, ('red','red2'))
menus['menu']=(5, [4]+r(10,16)+r(20,25)+[30,31,32,40], [4], ('navy','navy2'))
heights={}
for i,(n,v) in enumerate(menus.items()):
    rows,sl,gd,bc=v[:4]; ex=v[4] if len(v)>4 else None
    heights[n]=build(n,rows,sl,gd,True,bc,ex,seed=11+i)
# font
chars={'metiers':'','metiers_top':'','faction':'','faction_relations':'','menu':'','faction_membres':'','faction_top':''}
prov=[{"type":"bitmap","file":f"naufrages:gui/{n}.png","ascent":13,"height":heights[n],"chars":[chars[n]]} for n in chars]
prov.append({"type":"space","advances":{"":-1,"":-2,"":-4,"":-8,"":-16,"":-32,"":-64,"":-128}})
os.makedirs('assets/minecraft/font',exist_ok=True)
json.dump({"providers":prov},open('assets/minecraft/font/default.json','w'),ensure_ascii=True,indent=1)
json.dump({"pack":{"description":"§6Les Naufragés §7- menus","pack_format":75,"min_format":46,"max_format":99,"supported_formats":[46,99]}},open('pack.mcmeta','w'),ensure_ascii=False)
print(heights)
