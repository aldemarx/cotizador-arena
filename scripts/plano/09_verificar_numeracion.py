import pickle,json,collections
cands,out=pickle.load(open('build_out.pkl','rb'))
ex=json.load(open(r'C:/Users/ALDEMAR/Downloads/cotizador-arenas/src/data/arenas-lotes.json',encoding='utf-8'))['lotes']
E={(l['mz'],l['lt']):l['metraje_m2'] for l in ex}
by=collections.defaultdict(dict)
for m,n,i in out: by[m][n]=i
tot=bad=0; peor=[]
for m,d in by.items():
    b=0;t=0
    for n in d:
        if n+1 in d:
            t+=1
            if cands[d[n]]['g'].distance(cands[d[n+1]]['g'])>0.8: b+=1
    tot+=t;bad+=b
    if b>2: peor.append((m,b,t))
print('pares consecutivos no vecinos:',bad,'de',tot); print('manzanas con >2 no vecinos:',peor)
print('R5:',[(n,cands[by['R5'][n]]['area'],E[('R5',n)]) for n in sorted(by['R5'])])
exact=[(m,n) for m,n,i in out if abs(E[(m,n)]-cands[i]['area'])>0.06]
print('lotes con area exacta distinta (revisar):',len(exact))
