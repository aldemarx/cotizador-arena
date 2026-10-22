import json,re,collections,math,pickle
import numpy as np
from shapely.geometry import Polygon,Point
from shapely.strtree import STRtree
R=lambda x,y:100<=x<=420 and 480<=y<=1200
d=json.load(open('cand.json')); polys=d['polys']
o=json.load(open('pipe_out.json'))
faces=pickle.load(open('faces_ext.pkl','rb')); ulot=pickle.load(open('uni_lot.pkl','rb'))
cands=[]  # dict(geom, area, num|None, src)
for l in o['lots']:
    if not R(l['cx'],l['cy']): continue
    xs,ys=polys[l['k']]
    g=Polygon(list(zip(xs,ys)))
    if not g.is_valid: g=g.buffer(0)
    cands.append({'g':g,'area':l['area'],'num':l['ints'][0],'src':'poly'})
cp=[c['g'].centroid for c in cands]
tree=STRtree([c['g'].centroid for c in cands]) if cands else None
for i,v in ulot.items():
    g=faces[i]; c=g.centroid
    near=[j for j in tree.query(c.buffer(3.0)) if cands[j]['g'].centroid.distance(c)<3.0]
    if near:
        j=near[0]
        if cands[j]['num'] is None and len(v['ints'])==1: cands[j]['num']=v['ints'][0]
        continue
    cands.append({'g':g,'area':v['area'],'num':v['ints'][0] if len(v['ints'])==1 else None,'src':'face'})
print('lotes unidos:',len(cands),'| de poligono:',sum(c['src']=='poly' for c in cands),'| de caras:',sum(c['src']=='face' for c in cands),'| sin numero:',sum(c['num'] is None for c in cands))
# adyacencia
geoms=[c['g'].buffer(0.35) for c in cands]; st=STRtree(geoms); par=list(range(len(cands)))
def f(a):
    while par[a]!=a: par[a]=par[par[a]]; a=par[a]
    return a
for a,g in enumerate(geoms):
    for b in st.query(g):
        if b!=a and g.intersects(geoms[b]): par[f(a)]=f(b)
comp=collections.defaultdict(list)
for a in range(len(cands)): comp[f(a)].append(a)
print('componentes',len(comp),sorted(collections.Counter(len(v) for v in comp.values()).items()))
ex=json.load(open(r'C:/Users/ALDEMAR/Downloads/cotizador-arenas/src/data/arenas-lotes.json',encoding='utf-8'))['lotes']
E=collections.defaultdict(dict)
for l in ex: E[l['mz']][l['lt']]=l['metraje_m2']
mzl=sorted(E,key=lambda s:int(s[1:]))
def sig(ids,m):
    ea=sorted(E[m].values()); pa=sorted(cands[i]['area'] for i in ids); used=[False]*len(ea); n=0
    for a in pa:
        for j,e in enumerate(ea):
            if not used[j] and abs(e-a)<0.8: used[j]=True; n+=1; break
    return n
cids=list(comp); sc=np.array([[sig(comp[c],m) for m in mzl] for c in cids],dtype=float)
pairs=sorted(((sc[i,j],i,j) for i in range(len(cids)) for j in range(len(mzl))),reverse=True)
ac=set();am=set();assign={}
for s,i,j in pairs:
    if s<5: break
    if i in ac or j in am: continue
    ac.add(i);am.add(j);assign[cids[i]]=mzl[j]
out=[]  # lote final
for c,m in assign.items():
    ids=comp[c]; Em=dict(E[m]); used=set(); res={}
    for i in ids:
        n=cands[i]['num']
        if n is not None and n in Em and abs(Em[n]-cands[i]['area'])<0.8: res[i]=n; used.add(n)
        elif n is not None and n in Em: res[i]=n; used.add(n)  # numero impreso manda aunque el area difiera
    # sin numero: por area unica, luego por secuencia
    pend=[i for i in ids if i not in res]
    changed=True
    while pend and changed:
        changed=False
        for i in list(pend):
            cs=[n for n,a in Em.items() if n not in used and abs(a-cands[i]['area'])<0.06]
            if len(cs)==1: res[i]=cs[0]; used.add(cs[0]); pend.remove(i); changed=True
    if pend:
        # grupos por area; ordenar a lo largo desde el vecino numerado mas cercano con numero menor
        grp=collections.defaultdict(list)
        for i in pend: grp[round(cands[i]['area'],1)].append(i)
        for k,lst in grp.items():
            cs=sorted(n for n,a in Em.items() if n not in used and abs(a-cands[lst[0]]['area'])<0.06)
            if len(cs)<len(lst): continue
            lo=[n for n in used if n<cs[0]]; 
            anchor=None
            if lo:
                lo_n=max(lo); anchor=next((i for i,n in res.items() if n==lo_n),None)
            if anchor is None:
                hi=[n for n in used if n>cs[-1]]
                if hi: hi_n=min(hi); anchor=next((i for i,n in res.items() if n==hi_n),None); rev=True
                else: continue
            else: rev=False
            pa=cands[anchor]['g'].centroid
            order=sorted(lst,key=lambda i:cands[i]['g'].centroid.distance(pa),reverse=rev)
            take=cs[:len(lst)] if not rev else cs[-len(lst):]
            if rev: take=sorted(take)
            for i,n in zip(order,take): res[i]=n; used.add(n)
            for i in lst:
                if i in res: pend.remove(i)
    for i,n in res.items(): out.append((m,n,i))
cnt=collections.Counter(m for m,_,_ in out)
tot=0
for m in mzl:
    ids=[i for mm,n,i in out if mm==m]
    bien=sum(1 for mm,n,i in out if mm==m and abs(E[m][n]-cands[i]['area'])<0.8)
    dup=len(ids)-len({n for mm,n,i in out if mm==m})
    tot+=len(ids)
    print(m,'asignados',len(ids),'de',len(E[m]),'| area coincide',bien,'| duplicados',dup)
print('TOTAL',tot,'de',sum(len(v) for v in E.values()))
pickle.dump((cands,out),open('build_out.pkl','wb'))
