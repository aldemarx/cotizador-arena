import json,re,collections,math,pickle
import numpy as np
from shapely.geometry import Point
from shapely.strtree import STRtree
faces=pickle.load(open('faces_ext.pkl','rb'))
d=json.load(open('cand.json'))
clean=lambda s:re.sub(r'\[A-Za-z][^;]*;|[{}]','',s).strip()
T=[(clean(t),x,y) for t,x,y in d['texts'] if x is not None]
num=lambda t:float(re.sub(r'[^\d.]','',t.split('m')[0]))
R=lambda x,y:100<=x<=420 and 480<=y<=1200
at=[(num(t),x,y) for t,x,y in T if re.fullmatch(r'\d+(\.\d+)?( ?m2)?',t,re.I) and 100<=num(t)<=700 and R(x,y)]
ints=[(int(t),x,y) for t,x,y in T if re.fullmatch(r'\d{1,2}',t) and R(x,y)]
tree=STRtree(faces)
def fa(x,y): return [i for i in tree.query(Point(x,y)) if faces[i].contains(Point(x,y))]
lot={}
for a,x,y in at:
    cs=[i for i in fa(x,y) if abs(faces[i].area-a)/a<0.08]
    if not cs: continue
    i=min(cs,key=lambda i:faces[i].area)
    lot.setdefault(i,{'area':a,'ints':[]})
for n,x,y in ints:
    for i in fa(x,y):
        if i in lot: lot[i]['ints'].append(n)
print('caras-lote',len(lot),'enteros:',collections.Counter(len(v['ints']) for v in lot.values()))
pickle.dump(lot,open('uni_lot.pkl','wb'))
# adyacencia por interseccion con buffer pequeño
idx=list(lot); geoms=[faces[i].buffer(0.35) for i in idx]
st=STRtree(geoms); par=list(range(len(idx)))
def f(a):
    while par[a]!=a: par[a]=par[par[a]]; a=par[a]
    return a
for a,g in enumerate(geoms):
    for b in st.query(g):
        if b!=a and g.intersects(geoms[b]): par[f(a)]=f(b)
comp=collections.defaultdict(list)
for a in range(len(idx)): comp[f(a)].append(idx[a])
print('componentes',len(comp),sorted(collections.Counter(len(v) for v in comp.values()).items()))
pickle.dump(dict(comp),open('uni_comp.pkl','wb'))
