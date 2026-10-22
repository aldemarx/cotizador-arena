import json,pickle,math
from shapely.geometry import Polygon,Point,LineString,box
from shapely import affinity
from shapely.strtree import STRtree
cands,out=pickle.load(open('build_out.pkl','rb'))
fit=pickle.load(open('fit.pkl','rb'))
segs=json.load(open('segs_R2.json'))
long=[LineString([(a,b),(c,e)]) for a,b,c,e in segs if math.hypot(c-a,e-b)>=3 and 180<=a<=250 and 900<=b<=990]
tr=STRtree(long)
exist=[c['g'] for c in cands]; te=STRtree(exist)
objetivo=[(223.5,208,939),(207.83,213,961),(207.83,223,963),(223.5,218,942)]
nuevo={}
for a,x,y in objetivo:
    w=a/20; mejor=None
    for ang in range(0,60,2):
        base=affinity.rotate(box(-10,-w/2,10,w/2),ang,origin=(0,0))
        for dx in [i*0.75 for i in range(-5,6)]:
            for dy in [i*0.75 for i in range(-5,6)]:
                r=affinity.translate(base,x+dx,y+dy)
                borde=r.exterior.buffer(0.3)
                sc=sum(long[i].intersection(borde).length for i in tr.query(borde))-0.3*math.hypot(dx,dy)
                ov=sum(exist[i].intersection(r).area for i in te.query(r))
                sc-=2.5*ov
                if mejor is None or sc>mejor[0]: mejor=(sc,ang,dx,dy,r,ov)
    print(a,x,y,'ang',mejor[1],'dx,dy',mejor[2],mejor[3],'solape',round(mejor[5],1),'score',round(mejor[0],1))
    nuevo[(a,x,y)]=mejor
new_fit=[]
for f in fit:
    k=(f[0],f[1],f[2])
    if k in nuevo:
        m=nuevo[k]; new_fit.append((f[0],f[1],f[2],m[0],m[1],m[2],m[3],m[4],f[8]))
    else: new_fit.append(f)
pickle.dump(new_fit,open('fit.pkl','wb'))
