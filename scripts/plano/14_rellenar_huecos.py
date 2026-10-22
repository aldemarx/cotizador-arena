import json,pickle,math
from shapely.geometry import Polygon,Point,MultiPolygon,box
from shapely.ops import unary_union
cands,out=pickle.load(open('build_out.pkl','rb'))
asig={(m,n):i for m,n,i in out}
def idx_cerca(x,y):
    p=Point(x,y); return min(range(len(cands)),key=lambda i:cands[i]['g'].centroid.distance(p))
def rellenar(izq,der,anclas):
    """Celdas que llenan el hueco entre dos lotes, repartido por area. anclas = [(area,x,y)]"""
    gz,gd=cands[izq]['g'],cands[der]['g']
    hueco=unary_union([gz,gd]).convex_hull.difference(unary_union([gz.buffer(0.05),gd.buffer(0.05)]))
    if isinstance(hueco,MultiPolygon): hueco=max(hueco.geoms,key=lambda p:p.area)
    # direccion de corte: la del borde de gz que mira a gd
    cz=gz.centroid; cd=gd.centroid
    n=(cd.x-cz.x,cd.y-cz.y); L=math.hypot(*n); n=(n[0]/L,n[1]/L)
    t=(-n[1],n[0])
    minx=hueco.bounds
    pts=list(hueco.exterior.coords)
    s_all=[p[0]*n[0]+p[1]*n[1] for p in pts]; s0,s1=min(s_all),max(s_all)
    anclas=sorted(anclas,key=lambda a:a[1]*n[0]+a[2]*n[1])
    tot=sum(a for a,_,_ in anclas)
    def area_hasta(s):
        R=box(-1e4,-1e4,1e4,1e4)
        # semiplano n.p<=s: poligono grande rotado
        cx,cy=n[0]*s,n[1]*s
        W=1e3
        pl=Polygon([(cx-t[0]*W,cy-t[1]*W),(cx+t[0]*W,cy+t[1]*W),(cx+t[0]*W-n[0]*W,cy+t[1]*W-n[1]*W),(cx-t[0]*W-n[0]*W,cy-t[1]*W-n[1]*W)])
        return hueco.intersection(pl),pl
    cortes=[s0]; acum=0
    for a,_,_ in anclas[:-1]:
        acum+=a; frac=acum/tot; lo,hi=s0,s1
        for _ in range(40):
            mid=(lo+hi)/2; ar=area_hasta(mid)[0].area
            if ar<frac*hueco.area: lo=mid
            else: hi=mid
        cortes.append((lo+hi)/2)
    cortes.append(s1+1)
    celdas=[]
    for k,(a,x,y) in enumerate(anclas):
        _,pa=area_hasta(cortes[k+1]); _,pb=area_hasta(cortes[k])
        c=hueco.intersection(pa).difference(pb)
        if isinstance(c,MultiPolygon): c=max(c.geoms,key=lambda p:p.area)
        celdas.append((a,x,y,c))
    return celdas
if __name__=='__main__':
    # fila superior: R7-8 | 207.83 | 207.83 | cara naranja 207.83 ; fila inferior: R7-14 | 223.5 | 223.5 | cara naranja 223.5
    r78=asig[('R7',8)]; r714=asig[('R7',14)]
    o1=idx_cerca(234.8,971.2); o2=idx_cerca(231.0,948.9)
    print('R7-8',cands[r78]['area'],'naranja1',cands[o1]['area'],'R7-14',cands[r714]['area'],'naranja2',cands[o2]['area'])
    A=rellenar(r78,o1,[(207.83,213.2,960.7),(207.83,223.1,963.1)])
    B=rellenar(r714,o2,[(223.5,207.9,938.6),(223.5,218.5,941.7)])
    for a,x,y,c in A+B: print(a,round(c.area,1),round(c.centroid.x,1),round(c.centroid.y,1))
    pickle.dump(A+B,open('rellenos.pkl','wb'))
