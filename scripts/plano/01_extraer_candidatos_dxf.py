import sys, collections, json, re
path=sys.argv[1]; out=sys.argv[2]
sec=None; cur=None
texts=[]; polys=[]
t=None; xs=[]; ys=[]; closed=0; nv=0; tx=ty=None; lay=None; color=None
verts=collections.Counter(); closedc=collections.Counter()
def flush():
    global cur,t,xs,ys,closed,nv,tx,ty,lay
    if sec=='ENTITIES' and cur:
        if cur=='MTEXT' and t is not None: texts.append((t,tx,ty))
        elif cur=='LWPOLYLINE':
            n=len(xs); verts[min(n,30)]+=1; closedc[closed]+=1
            if closed and 3<=n<=12: polys.append((xs,ys))
    cur=None; t=None; xs=[]; ys=[]; closed=0; tx=ty=None
with open(path,'r',encoding='utf-8',errors='replace') as f:
    it=iter(f)
    while True:
        try: c=next(it).strip(); v=next(it).rstrip('\r\n')
        except StopIteration: break
        if c=='0':
            flush()
            if v=='ENDSEC': sec=None
            elif v=='EOF': break
            elif v!='SECTION': cur=v
        elif c=='2' and cur is None and sec is None and v in('HEADER','CLASSES','TABLES','BLOCKS','ENTITIES','OBJECTS'): sec=v
        elif sec=='ENTITIES' and cur:
            if cur=='MTEXT':
                if c=='1' and t is None: t=v
                elif c=='3' and t is None: t=v
                elif c=='10': tx=float(v)
                elif c=='20': ty=float(v)
            elif cur=='LWPOLYLINE':
                if c=='70': closed=int(v)&1
                elif c=='10': xs.append(float(v))
                elif c=='20': ys.append(float(v))
flush()
print('verts hist',sorted(verts.items())[:32]); print('closed',closedc)
print('closed polys 3-12 verts:',len(polys))
json.dump({'texts':texts,'polys':polys},open(out,'w'))
