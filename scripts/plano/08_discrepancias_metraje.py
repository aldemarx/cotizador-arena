import json,collections
o=json.load(open('pipe_out.json')); lots=o['lots']; comp=o['comp']; assign=o['assign']
ex=json.load(open(r'C:/Users/ALDEMAR/Downloads/cotizador-arenas/src/data/arenas-lotes.json',encoding='utf-8'))['lotes']
E={(l['mz'],l['lt']):l for l in ex}
malos={'R5','R7','R11','R12'}
dif=[];falt=[];tot=0
for c,m in assign.items():
    if m in malos: continue
    seen=set()
    for i in comp[c]:
        l=lots[i]; lt=l['ints'][0]; seen.add(lt); e=E.get((m,lt)); tot+=1
        if e is None: dif.append((m,lt,l['area'],None)); continue
        if abs(e['metraje_m2']-l['area'])>0.6: dif.append((m,lt,l['area'],e['metraje_m2']))
    for (mm,lt),e in E.items():
        if mm==m and lt not in seen: falt.append((m,lt))
print('lotes del plano comparados:',tot)
print('METRAJE DISTINTO (plano vs Excel):',len(dif))
for x in sorted(dif,key=lambda t:(int(t[0][1:]),t[1])): print('  ',x)
print('lotes del Excel que no aparecen en el plano (manzanas buenas):',len(falt))
print('  ',sorted(falt,key=lambda t:(int(t[0][1:]),t[1])))
