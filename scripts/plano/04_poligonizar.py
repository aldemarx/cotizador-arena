import json,math,re,collections,pickle,sys
from shapely.geometry import LineString,Point
from shapely.ops import unary_union,polygonize
from shapely.strtree import STRtree
EXT=float(sys.argv[1]); MINL=float(sys.argv[2])
segs=json.load(open('segs_R2.json'))
seen=set(); ls=[]
for a,b,c,d in segs:
    L=math.hypot(c-a,d-b)
    if L<MINL: continue
    k=(round(a,2),round(b,2),round(c,2),round(d,2)); k2=(k[2],k[3],k[0],k[1])
    if k in seen or k2 in seen: continue
    seen.add(k)
    ux,uy=(c-a)/L,(d-b)/L
    ls.append(LineString([(a-ux*EXT,b-uy*EXT),(c+ux*EXT,d+uy*EXT)]))
u=unary_union(ls); faces=[p for p in polygonize(u) if 80<=p.area<=700]
print('EXT',EXT,'caras 80-700:',len(faces))
pickle.dump(faces,open('faces_ext.pkl','wb'))
d=json.load(open('cand.json'))
clean=lambda s:re.sub(r'\[A-Za-z][^;]*;|[{}]','',s).strip()
T=[(clean(t),x,y) for t,x,y in d['texts'] if x is not None]
num=lambda t:float(re.sub(r'[^\d.]','',t.split('m')[0]))
at=[(num(t),x,y) for t,x,y in T if re.fullmatch(r'\d+(\.\d+)?( ?m2)?',t,re.I) and 100<=num(t)<=700 and 100<=x<=440 and 480<=y<=1200]
tree=STRtree(faces); ok=0; sin=[]
for a,x,y in at:
    cs=[i for i in tree.query(Point(x,y)) if faces[i].contains(Point(x,y)) and abs(faces[i].area-a)/a<0.08]
    if cs: ok+=1
    else: sin.append((a,round(x),round(y)))
sin=[s for s in sin if s[1]<420]; print('sin (x<420):',len(sin),sin[:40])
