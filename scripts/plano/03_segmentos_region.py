import sys,json
path=sys.argv[1]; x0,x1,y0,y1=map(float,sys.argv[2:6]); out=sys.argv[6]
import math
sec=None;cur=None;xs=[];ys=[];closed=0;segs=[];nl=0;arc={}
def flush():
    global cur,xs,ys,closed,nl,arc
    if sec=='ENTITIES' and cur=='ARC' and len(arc)>=5:
        cx,cy,r,a0,a1=arc['10'],arc['20'],arc['40'],arc['50'],arc['51']
        if x0<=cx<=x1 and y0<=cy<=y1:
            if a1<=a0: a1+=360
            n=max(2,int((a1-a0)/2)+1)
            pts=[(cx+r*math.cos(math.radians(a0+(a1-a0)*i/n)),cy+r*math.sin(math.radians(a0+(a1-a0)*i/n))) for i in range(n+1)]
            for i in range(n): segs.append((pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]))
    arc={}
    if sec=='ENTITIES' and cur=='LWPOLYLINE' and xs:
        if x0<=min(xs) and max(xs)<=x1 and y0<=min(ys) and max(ys)<=y1:
            nl+=1
            n=len(xs)
            for i in range(n-1): segs.append((xs[i],ys[i],xs[i+1],ys[i+1]))
            if closed and n>2: segs.append((xs[-1],ys[-1],xs[0],ys[0]))
    cur=None;xs=[];ys=[];closed=0
with open(path,'r',encoding='utf-8',errors='replace') as f:
    it=iter(f)
    while True:
        try:c=next(it).strip();v=next(it).rstrip('\r\n')
        except StopIteration:break
        if c=='0':
            flush()
            if v=='ENDSEC':sec=None
            elif v=='EOF':break
            elif v!='SECTION':cur=v
        elif c=='2' and cur is None and sec is None and v in('HEADER','CLASSES','TABLES','BLOCKS','ENTITIES','OBJECTS'):sec=v
        elif sec=='ENTITIES' and cur=='ARC':
            if c in('10','20','40','50','51') and c not in arc: arc[c]=float(v)
        elif sec=='ENTITIES' and cur=='LWPOLYLINE':
            if c=='70':closed=int(v)&1
            elif c=='10':xs.append(float(v))
            elif c=='20':ys.append(float(v))
flush()
print('polilineas en region:',nl,'segmentos:',len(segs))
json.dump(segs,open(out,'w'))
