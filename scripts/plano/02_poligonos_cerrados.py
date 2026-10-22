import json,re,collections,math
import numpy as np
d=json.load(open('cand.json'))
clean=lambda s:re.sub(r'\[A-Za-z][^;]*;|[{}]','',s).strip()
T=[(clean(t),x,y) for t,x,y in d['texts'] if x is not None]
P=[]
for xs,ys in d['polys']:
    if len(xs)>3 and xs[0]==xs[-1] and ys[0]==ys[-1]: xs=xs[:-1]; ys=ys[:-1]
    a=0
    for i in range(len(xs)):
        j=(i+1)%len(xs); a+=xs[i]*ys[j]-xs[j]*ys[i]
    P.append((abs(a)/2,xs,ys))
C=30; G=collections.defaultdict(list)
for k,(a,xs,ys) in enumerate(P):
    if 60<=a<=700:
        for gx in range(int(min(xs)//C),int(max(xs)//C)+1):
            for gy in range(int(min(ys)//C),int(max(ys)//C)+1): G[(gx,gy)].append(k)
def inside(px,py,xs,ys):
    c=False;n=len(xs);j=n-1
    for i in range(n):
        if (ys[i]>py)!=(ys[j]>py) and px<(xs[j]-xs[i])*(py-ys[i])/(ys[j]-ys[i])+xs[i]: c=not c
        j=i
    return c
num=lambda t:float(re.sub(r'[^\d.]','',t.split('m')[0]))
at=[(num(t),x,y) for t,x,y in T if re.fullmatch(r'\d+(\.\d+)?( ?m2)?',t,re.I) and 100<=num(t)<=700]
ints=[(int(t),x,y) for t,x,y in T if re.fullmatch(r'\d{1,2}',t)]
tg=collections.defaultdict(list)
for i,(n,x,y) in enumerate(ints): tg[(int(x//C),int(y//C))].append(i)
lots=[]; used=set(); sin_poly=0; dist=0
for a,x,y in at:
    cs=[k for k in G.get((int(x//C),int(y//C)),[]) if inside(x,y,P[k][1],P[k][2])]
    cs=[k for k in cs if abs(P[k][0]-a)/a<0.03]
    if not cs: sin_poly+=1; continue
    k=min(cs,key=lambda k:P[k][0])
    if k in used: continue
    used.add(k)
    xs,ys=P[k][1],P[k][2]; cand=[]
    for gx in range(int(min(xs)//C),int(max(xs)//C)+1):
        for gy in range(int(min(ys)//C),int(max(ys)//C)+1):
            for i in tg.get((gx,gy),[]):
                n,tx,ty=ints[i]
                if inside(tx,ty,xs,ys): cand.append(n)
    lots.append({'k':k,'area':a,'ints':cand,'cx':sum(xs)/len(xs),'cy':sum(ys)/len(ys)})
print('textos de area:',len(at),'| lotes con poligono:',len(lots),'| area sin poligono coincidente:',sin_poly)
print('enteros dentro:',collections.Counter(len(l['ints']) for l in lots))
lots=[l for l in lots if len(l['ints'])==1]
H=0.4; vg=collections.defaultdict(list)
for i,l in enumerate(lots):
    for x,y in zip(P[l['k']][1],P[l['k']][2]): vg[(round(x/H),round(y/H))].append(i)
par=list(range(len(lots)))
def f(a):
    while par[a]!=a: par[a]=par[par[a]]; a=par[a]
    return a
for key,ids in vg.items():
    for dx in(-1,0,1):
        for dy in(-1,0,1):
            for j in vg.get((key[0]+dx,key[1]+dy),[]):
                for i in ids:
                    if i!=j: par[f(i)]=f(j)
comp=collections.defaultdict(list)
for i in range(len(lots)): comp[f(i)].append(i)
print('lotes',len(lots),'componentes',len(comp),sorted(collections.Counter(len(v) for v in comp.values()).items()))
ex=json.load(open(r'C:/Users/ALDEMAR/Downloads/cotizador-arenas/src/data/arenas-lotes.json',encoding='utf-8'))['lotes']
E=collections.defaultdict(dict)
for l in ex: E[l['mz']][l['lt']]=l['metraje_m2']
mzl=sorted(E,key=lambda s:int(s[1:]))
labels={t:(x,y) for t,x,y in T if re.fullmatch(r'[RU]-\d+( [RU]-\d+)?',t)}
def lab_xy(m):
    for k,v in labels.items():
        if k.startswith('R-') and m[1:] in re.findall(r'R-(\d+)',k): return v
cids=list(comp); S_=[]
for c in cids:
    ids=comp[c]; pairs={lots[i]['ints'][0]:lots[i]['area'] for i in ids}
    cx=sum(lots[i]['cx'] for i in ids)/len(ids); cy=sum(lots[i]['cy'] for i in ids)/len(ids)
    row=[]
    for m in mzl:
        dm=E[m]; both=sum(1 for k,v in pairs.items() if k in dm and abs(dm[k]-v)<0.6)
        lx,ly=lab_xy(m); row.append(both*10-math.hypot(lx-cx,ly-cy)/20)
    S_.append(row)
A=np.array(S_); n,mm=A.shape; Cm=(-A).T if n>mm else -A
r,cn=Cm.shape; INF=1e18
u=[0]*(r+1); v=[0]*(cn+1); p=[0]*(cn+1); way=[0]*(cn+1)
for i in range(1,r+1):
    p[0]=i; j0=0; minv=[INF]*(cn+1); usd=[False]*(cn+1)
    while True:
        usd[j0]=True; i0=p[j0]; delta=INF; j1=0
        for j in range(1,cn+1):
            if not usd[j]:
                cur=Cm[i0-1][j-1]-u[i0]-v[j]
                if cur<minv[j]: minv[j]=cur; way[j]=j0
                if minv[j]<delta: delta=minv[j]; j1=j
        for j in range(cn+1):
            if usd[j]: u[p[j]]+=delta; v[j]-=delta
            else: minv[j]-=delta
        j0=j1
        if p[j0]==0: break
    while True:
        j1=way[j0]; p[j0]=p[j1]; j0=j1
        if j0==0: break
assign={}
for j in range(1,cn+1):
    if p[j]:
        a_,b_=(p[j]-1,j-1)
        if n>mm: assign[cids[b_]]=mzl[a_]
        else: assign[cids[a_]]=mzl[b_]
for c,m in sorted(assign.items(),key=lambda kv:int(kv[1][1:])):
    ids=comp[c]; pairs={lots[i]['ints'][0]:lots[i]['area'] for i in ids}
    dm=E[m]; both=sum(1 for k,v_ in pairs.items() if k in dm and abs(dm[k]-v_)<0.6)
    print(m,'plano',len(ids),'Excel',len(dm),'coinciden nro+m2:',both,'solo nro:',len(set(pairs)&set(dm)))
json.dump({'lots':lots,'assign':{str(c):m for c,m in assign.items()},'comp':{str(c):v_ for c,v_ in comp.items()}},open('pipe_out.json','w'))
