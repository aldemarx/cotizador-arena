"""Inserta el parque entre R3 y R6 (mapa-parque.svg) en el plano horizontal.
Uso: python -I scripts/plano/17_insertar_parque.py <mapa-parque.svg> public/plano/arenas.svg
El parque se pone en la esquina (-1074, -261) del plano, con escala 0.07 (su contenido útil mide 690 x 1895 y ocupa 48 x 133 m)."""
import re, sys
orig, ruta = sys.argv[1:3]
p = open(orig, encoding="utf8").read()
s = open(ruta, encoding="utf8").read()
s = re.sub(r'<g id="parque".*?</g><!--/parque-->', "", s, flags=re.S)  # reemplaza una versión anterior

p = re.sub(r"<metadata>.*?</metadata>", "", p, flags=re.S)
p = re.sub(r"<style>.*?</style>", "", p, flags=re.S)
p = re.sub(r"<title>.*?</title>", "", p, flags=re.S)
p = re.sub(r"<svg[^>]*>", "", p, count=1).rsplit("</svg>", 1)[0]
p = re.sub(r'\s(role|tabindex|aria-label)="[^"]*"', "", p)
p = re.sub(r'\sclass="(zone|path-hit)"', "", p)
ids = set(re.findall(r'\bid="([^"]+)"', p))
p = re.sub(r'\bid="([^"]+)"', r'id="pq-\1"', p)
p = re.sub(r'url\(#([^)]+)\)', lambda m: f"url(#pq-{m.group(1)})" if m.group(1) in ids else m.group(0), p)
p = re.sub(r'((?:xlink:)?href)="#([^"]+)"', lambda m: f'{m.group(1)}="#pq-{m.group(2)}"', p)

if "xmlns:xlink" not in s[:300]:
    s = s.replace('<svg xmlns="http://www.w3.org/2000/svg"', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"', 1)
k = 0.07
g = (f'<g id="parque" transform="translate({-1074 - 40 * k:.3f} {-261 - 40 * k:.3f}) scale({k})" pointer-events="none">'
     + p + "</g><!--/parque-->\n")
i = s.index('<g id="mz-')
s = s[:i] + g + s[i:]
open(ruta, "w", encoding="utf8").write(s)
