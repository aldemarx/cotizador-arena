import json,re,pickle,math,collections
from shapely.geometry import Point
cands,out=pickle.load(open('build_out.pkl','rb'))
d=json.load(open('cand.json'))
clean=lambda s:re.sub(r'\[A-Za-z][^;]*;|[{}]','',s).strip()
T=[(clean(t),x,y) for t,x,y in d['texts'] if x is not None]
num=lambda t:float(re.sub(r'[^\d.]','',t.split('m')[0]))
at=[(num(t),x,y) for t,x,y in T if re.fullmatch(r'\d+(\.\d+)?( ?m2)?',t,re.I) and 100<=num(t)<=700 and 100<=x<=420 and 480<=y<=1200]
polys=[c['g'] for c in cands]
from shapely.strtree import STRtree
tr=STRtree(polys)
miss=[]
for a,x,y in at:
    p=Point(x,y)
    if not any(polys[i].contains(p) for i in tr.query(p)): miss.append((a,x,y))
print('areas sin lote:',len(miss))
ex=json.load(open(r'C:/Users/ALDEMAR/Downloads/cotizador-arenas/src/data/arenas-lotes.json',encoding='utf-8'))['lotes']
ids={f'{m}-{n}' for m,n,i in out}
falt=[l for l in ex if l['lote'] not in ids]
print('lotes faltantes:',len(falt),collections.Counter(l['mz'] for l in falt))
for a,x,y in sorted(miss,key=lambda t:(round(t[1]/30),t[2])): print(a,round(x,1),round(y,1))
json.dump({'miss':miss},open('miss.json','w'))
