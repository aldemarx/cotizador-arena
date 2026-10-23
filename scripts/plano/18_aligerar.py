"""Aligera el plano para que vaya fluido en el celular (ver memoria «planos ligeros»: lo que pesa es el número de elementos).
1) El parque (1 400 elementos) pasa a ser UNA imagen: public/plano/parque.webp (el SVG original, renderizado a ~14 px/m).
2) El marcador de cada lote baja de 5 elementos a 3: se quita la sombra circular y el aro pasa a ser el borde del círculo.
Uso: python -I scripts/plano/18_aligerar.py public/plano/arenas.svg   (después de 16 y 17)."""
import re, sys
ruta = sys.argv[1]
s = open(ruta, encoding="utf8").read()

k = 0.07  # misma escala y esquina que 17_insertar_parque.py; la imagen incluye 20 unidades de margen (sombra)
x0, y0 = -1074 - 20 * k, -261 - 20 * k
img = f'<image id="parque" href="/plano/parque.webp" x="{x0:.3f}" y="{y0:.3f}" width="{730 * k:.3f}" height="{1935 * k:.3f}" pointer-events="none"/>\n'
s = re.sub(r'<g id="parque".*?</g><!--/parque-->\n', lambda m: img, s, flags=re.S)

s = re.sub(r'<circle class="som"[^>]*/>', "", s)
s = re.sub(r'<circle class="aro"[^>]*/>', "", s)
s = s.replace(".ins .som{fill:url(#g-som)}", "").replace(".ins .aro{fill:none;stroke:#fff;stroke-opacity:.45;stroke-width:.16}", "")
s = s.replace(".ins .cue{fill:url(#g-ins)}", ".ins .cue{fill:url(#g-ins);stroke:#fff;stroke-opacity:.45;stroke-width:.16}")
s = re.sub(r'<radialGradient id="g-som".*?</radialGradient>', "", s, flags=re.S)
open(ruta, "w", encoding="utf8").write(s)
