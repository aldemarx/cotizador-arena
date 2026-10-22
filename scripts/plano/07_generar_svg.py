import json,pickle,math,collections
from shapely.geometry import Polygon,Point
from shapely.strtree import STRtree
cands,out=pickle.load(open('build_out.pkl','rb'))
o=json.load(open('pipe_out.json')); d=json.load(open('cand.json')); polys=d['polys']
segs=json.load(open('segs_R2.json'))
lots=[(m,n,cands[i]) for m,n,i in out]
R=lambda x,y:100<=x<=420 and 480<=y<=1200
# ---- contexto: otros lotes del plano (Aura) -------------------------------------------------
ctx=[]
for l in o['lots']:
    if R(l['cx'],l['cy']): continue
    xs,ys=polys[l['k']]; ctx.append(list(zip(xs,ys)))
xs=[x for _,_,c in lots for x,_ in c['g'].exterior.coords]; ys=[y for _,_,c in lots for _,y in c['g'].exterior.coords]
cx_=[p[0] for c in ctx for p in c]+xs; cy_=[p[1] for c in ctx for p in c]+ys
x0,x1,y0,y1=min(cx_)-30,max(cx_)+30,min(cy_)-30,max(cy_)+30
vx0,vx1,vy0,vy1=min(xs)-40,max(xs)+40,min(ys)-40,max(ys)+40
r=lambda v:f'{v:.1f}'.rstrip('0').rstrip('.') if abs(v-round(v))>1e-9 else str(int(round(v)))
def P(pts): return 'M'+'L'.join(f'{r(x)} {r(-y)}' for x,y in pts)+'Z'
# ---- vias ------------------------------------------------------------------------------------
lotpolys=[c['g'].buffer(0.4) for _,_,c in lots]; st=STRtree(lotpolys)
seen=set(); vias=[]
for a,b,c,e in segs:
    if math.hypot(c-a,e-b)<3: continue
    if not (vx0<=a<=vx1 and vy0<=b<=vy1 and vx0<=c<=vx1 and vy0<=e<=vy1): continue
    k=(round(a,1),round(b,1),round(c,1),round(e,1)); k2=(k[2],k[3],k[0],k[1])
    if k in seen or k2 in seen: continue
    seen.add(k); mx,my=(a+c)/2,(b+e)/2
    if any(lotpolys[j].contains(Point(mx,my)) for j in st.query(Point(mx,my))): continue
    vias.append(f'M{r(a)} {r(-b)}L{r(c)} {r(-e)}')
by=collections.defaultdict(list)
for m,n,c in lots: by[m].append((n,c))
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{r(x0)} {r(-y1)} {r(x1-x0)} {r(y1-y0)}" data-metros-por-unidad="1" data-fuente="LOTE-35 ENTREGABLE 20-10-26.dwg">']
svg.append('<defs><radialGradient id="g-som" cx="50%" cy="50%" r="50%"><stop offset="0.4" stop-color="#1b1d22" stop-opacity="0.24"/><stop offset="1" stop-color="#1b1d22" stop-opacity="0"/></radialGradient><linearGradient id="g-ins" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fa660"/><stop offset="1" stop-color="#5a7d43"/></linearGradient></defs>')
svg.append('<g id="fondo">')
svg.append('<g id="otras-etapas" fill="#ececea" stroke="#d6d4cf" stroke-width="0.12"><path d="'+''.join(P(c) for c in ctx)+'"/></g>')
svg.append('<path id="vias-dwg" fill="none" stroke="#c9c5bd" stroke-width="0.18" d="'+''.join(vias)+'"/>')
svg.append('</g>')
for m in sorted(by,key=lambda s:int(s[1:])):
    svg.append(f'<g id="mz-{m}" fill="#fef7e2" stroke="#a8a08a" stroke-width="0.14">')
    for n,c in sorted(by[m],key=lambda t:t[0]): svg.append(f'<path id="lote-{m}-{n}" d="{P(list(c["g"].exterior.coords)[:-1])}"/>')
    svg.append('</g>')
svg.append('<style>.ins .som{fill:url(#g-som)}.ins .cue{fill:url(#g-ins)}.ins .aro{fill:none;stroke:#fff;stroke-opacity:.45;stroke-width:.16}.ins text{paint-order:stroke;stroke:#000;stroke-opacity:.14;stroke-width:.2;stroke-linejoin:round}</style>')
svg.append('<g id="insignias" font-family="Montserrat, Arial, sans-serif" font-weight="700" text-anchor="middle" fill="#ffffff" pointer-events="none">')
for m,n,c in sorted(lots,key=lambda t:(int(t[0][1:]),t[1])):
    g=c['g']; rp=g.representative_point(); cx,cy=rp.x,-rp.y
    rect=g.minimum_rotated_rectangle; pts=list(rect.exterior.coords)[:4]
    e=[math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]) for i in range(3)]
    corto=min(e[0],e[1]); largo=max(e[0],e[1])
    rad=max(1.7,min(2.9,corto*0.3)); fs=rad*0.9
    mx,my=cx,cy-rad*0.55            # marcador algo arriba del centro
    ty=my+rad+0.4                   # el metraje va debajo del marcador
    ancho=max(2.0,corto*0.9)
    svg.append(f'<g class="ins" data-lote="{m}-{n}" data-m="{r(cx)} {r(ty)} 0 {r(ancho)} 1.6 0"><circle class="som" cx="{r(mx-0.5)}" cy="{r(my+0.8)}" r="{r(rad*1.35)}"/><circle class="cue" cx="{r(mx)}" cy="{r(my)}" r="{r(rad)}"/><circle class="aro" cx="{r(mx)}" cy="{r(my)}" r="{r(rad*0.85)}"/><text x="{r(mx)}" y="{r(my+fs*0.36)}" font-size="{r(fs)}">{n}</text></g>')
svg.append('</g></svg>')
open('arenas2.svg','w',encoding='utf-8').write('\n'.join(svg))
import os;print('bytes',os.path.getsize('arenas2.svg'),'lotes',len(lots),'contexto',len(ctx),'vias',len(vias))
