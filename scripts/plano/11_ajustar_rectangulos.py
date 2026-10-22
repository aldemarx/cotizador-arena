import json,pickle,math,collections,time
from shapely.geometry import Polygon,Point,LineString,box
from shapely import affinity
cands,out=pickle.load(open('build_out.pkl','rb'))
miss=json.load(open('miss.json'))['miss']
segs=json.load(open('segs_R2.json'))
long=[LineString([(a,b),(c,e)]) for a,b,c,e in segs if math.hypot(c-a,e-b)>=3 and 120<=a<=330 and 620<=b<=990]
print('segmentos',len(long))
from shapely.strtree import STRtree
tr=STRtree(long)
def ajustar(a,x,y):
    mejor=None
    for L in (20.0,):
        w=a/L
        for ang in range(0,180,2):
            base=affinity.rotate(box(-L/2,-w/2,L/2,w/2),ang,origin=(0,0))
            for dx in (-1.5,-0.75,0,0.75,1.5):
                for dy in (-1.5,-0.75,0,0.75,1.5):
                    r=affinity.translate(base,x+dx,y+dy)
                    borde=r.exterior.buffer(0.3)
                    sc=0.0
                    for i in tr.query(borde):
                        sc+=long[i].intersection(borde).length
                    sc-=0.4*math.hypot(dx,dy)
                    if mejor is None or sc>mejor[0]: mejor=(sc,ang,dx,dy,r,w)
    return mejor
t=time.time(); res=[]
for a,x,y in miss:
    m=ajustar(a,x,y); res.append((a,x,y)+m)
    print(a,round(x),round(y),'ang',m[1],'dx,dy',m[2],m[3],'score',round(m[0],1),'w',round(m[5],1))
print('seg',round(time.time()-t))
pickle.dump(res,open('fit.pkl','wb'))
