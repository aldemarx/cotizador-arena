import json,pickle,math,collections,sys
from shapely.geometry import Polygon,Point,MultiPolygon
from shapely.ops import unary_union
from shapely.strtree import STRtree
sys.setrecursionlimit(10000)
cands,out=pickle.load(open('build_out.pkl','rb'))
fit=pickle.load(open('fit.pkl','rb'))
ex=json.load(open(r'C:/Users/ALDEMAR/Downloads/cotizador-arenas/src/data/arenas-lotes.json',encoding='utf-8'))['lotes']
E={(l['mz'],l['lt']):l['metraje_m2'] for l in ex}
asig={i:(m,n) for m,n,i in out}
# 1) recortar los rectangulos nuevos contra lo ya dibujado y entre si
exist=[c['g'] for c in cands]
tr=STRtree(exist)
nuevos=[]
orden=sorted(fit,key=lambda f:-f[3])  # mejor ajuste primero
placed=[]
for a,x,y,sc,ang,dx,dy,r,w in orden:
    g=r
    for i in tr.query(g):
        inter=exist[i].intersection(g)
        if inter.area>0.5: g=g.difference(exist[i].buffer(0.05))
    for p in placed:
        if p.intersects(g) and p.intersection(g).area>0.5: g=g.difference(p.buffer(0.05))
    if isinstance(g,MultiPolygon): g=max(g.geoms,key=lambda q:q.area)
    if g.is_empty or g.area<0.6*a: print('descartado/pequeno',a,round(x),round(y),round(g.area,1)); 
    if g.is_empty: continue
    placed.append(g); nuevos.append({'g':g,'area':a,'x':x,'y':y,'ajuste':sc})
print('nuevos',len(nuevos))
# 2) candidatos: poligonos sin asignar (caras naranja) + nuevos
sin=[i for i in range(len(cands)) if i not in asig and cands[i]['area']>0]
pol=[{'g':cands[i]['g'],'area':cands[i]['area'],'src':'cara'} for i in sin]+[{'g':n['g'],'area':n['area'],'src':'nuevo'} for n in nuevos]
print('poligonos por numerar:',len(pol),'| faltan en Excel: 57')
pickle.dump((pol,nuevos),open('pol_nuevos.pkl','wb'))
