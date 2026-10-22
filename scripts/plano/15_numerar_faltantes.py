import json,pickle,math,collections,sys
from shapely.geometry import Polygon,MultiPolygon
sys.setrecursionlimit(100000)
cands,out=pickle.load(open('build_out.pkl','rb'))
pol,nuevos=pickle.load(open('pol_nuevos.pkl','rb'))
rell=pickle.load(open('rellenos.pkl','rb'))
ex=json.load(open(r'C:/Users/ALDEMAR/Downloads/cotizador-arenas/src/data/arenas-lotes.json',encoding='utf-8'))['lotes']
E={(l['mz'],l['lt']):l['metraje_m2'] for l in ex}
asig={i:(m,n) for m,n,i in out}
# poligonos por numerar: caras sin asignar + rectangulos ajustados (menos los 4 de R7, que reemplazan los rellenos)
quitar={(223.5,208),(207.83,213),(207.83,223),(223.5,218)}
P=[p for p in pol if p['src']=='cara']
for nv in nuevos:
    if (nv['area'],round(nv['x'])) in quitar: continue
    P.append({'g':nv['g'],'area':nv['area'],'src':'nuevo'})
for a,x,y,c in rell: P.append({'g':c,'area':a,'src':'relleno'})
print('poligonos por numerar:',len(P))
falt_all=[(m,n) for (m,n) in E if (m,n) not in {v for v in asig.values()}]
fijos={v:cands[i]['g'] for i,v in asig.items()}
def en_r7(p):
    c=p['g'].centroid; return 128<=c.x<=262 and 933.5<=c.y<=985
P7=[p for p in P if en_r7(p)]; PR=[p for p in P if not en_r7(p)]
print('R7:',len(P7),'poligonos | R11/R12/R13/R18:',len(PR))
resultado={}
# ---- R7: reglas ----
falt7=[ln for ln in falt_all if ln[0]=='R7']
def tomar(area,cond=None,usados=set()):
    c=[p for p in P7 if abs(p['area']-area)<0.06 and id(p) not in usados and (cond is None or cond(p))]
    return c
usados7=set()
def poner(ln,p): resultado[ln]=p; usados7.add(id(p))
cx=lambda p:p['g'].centroid.x; cy=lambda p:p['g'].centroid.y
c=sorted(tomar(189.92),key=cy)             # 24 abajo, 1 arriba
poner(('R7',24),c[0]); poner(('R7',1),c[1])
c=sorted(tomar(207.83),key=cx)             # 9,10,11 de izquierda a derecha en la fila superior
for n,p in zip((9,10,11),c): poner(('R7',n),p)
poner(('R7',12),tomar(436.49)[0]); poner(('R7',13),tomar(344.79)[0])
c=sorted({id(p):p for p in tomar(223.51)}.values(),key=cx)   # 19..22: de izquierda a derecha (19 junto al 14)
for n,p in zip((19,20,21,22),c): poner(('R7',n),p)
print('R7 asignados',sum(1 for k in resultado if k[0]=='R7'),'de',len(falt7))
# ---- R11, R12, R13, R18: busqueda con vecindad ----
TOL=2.5
adj=lambda a,b:a.distance(b)<=TOL
falt=[ln for ln in falt_all if ln[0]!='R7']
dom={ln:[k for k,p in enumerate(PR) if abs(p['area']-E[ln])<0.06] for ln in falt}
print('dominios vacios:',[ln for ln,d in dom.items() if not d])
orden=sorted(falt,key=lambda ln:len(dom[ln]))
sol=[];cuenta=[0]
def vec(ln):
    m,n=ln; return [fijos[(m,n+d)] for d in(-1,1) if (m,n+d) in fijos]
def dfs(i,usado,asg):
    if i==len(orden):
        cuenta[0]+=1
        if cuenta[0]==1: sol.append(dict(asg))
        return
    if cuenta[0]>=200: return
    ln=orden[i]; m,n=ln
    for k in dom[ln]:
        if k in usado: continue
        g=PR[k]['g']
        if any(not adj(g,v) for v in vec(ln)): continue
        if any(((m,n+d) in asg and not adj(g,PR[asg[(m,n+d)]]['g'])) for d in(-1,1)): continue
        usado.add(k); asg[ln]=k; dfs(i+1,usado,asg); usado.discard(k); del asg[ln]
dfs(0,set(),{})
print('soluciones (tope 200):',cuenta[0])
if sol:
    for ln,k in sol[0].items(): resultado[ln]=PR[k]
print('total numerados:',len(resultado),'de',len(falt_all))
pickle.dump(resultado,open('numerado.pkl','wb'))


# ---- elegir, entre las soluciones con tolerancia amplia, la de menor suma de distancias entre numeros consecutivos ----
TOL=8; adj=lambda a,b:a.distance(b)<=TOL
todas=[]
def dfs2(i,usado,asg):
    if len(todas)>=5000: return
    if i==len(orden): todas.append(dict(asg)); return
    ln=orden[i]; m,n=ln
    for k in dom[ln]:
        if k in usado: continue
        g=PR[k]['g']
        if any(not adj(g,v) for v in vec(ln)): continue
        if any(((m,n+d) in asg and not adj(g,PR[asg[(m,n+d)]]['g'])) for d in(-1,1)): continue
        usado.add(k); asg[ln]=k; dfs2(i+1,usado,asg); usado.discard(k); del asg[ln]
dfs2(0,set(),{})
print('soluciones con tolerancia 8:',len(todas))
def costo(s):
    c=0.0; worst=[]
    for (m,n),k in s.items():
        g=PR[k]['g']
        for d in (1,):
            v=(m,n+d)
            h=PR[s[v]]['g'] if v in s else fijos.get(v)
            if h is not None:
                dist=g.distance(h); c+=dist*dist; worst.append((dist,(m,n),v))
    return c,worst
mejor=min(todas,key=lambda s:costo(s)[0])
c,worst=costo(mejor)
print('costo',round(c,1)); worst.sort(reverse=True)
print('peores pares consecutivos:',[(round(d,1),a,b) for d,a,b in worst[:8]])
for ln,k in mejor.items(): resultado[ln]=PR[k]
print('total numerados:',len(resultado),'de',len(falt_all))
pickle.dump(resultado,open('numerado.pkl','wb'))
