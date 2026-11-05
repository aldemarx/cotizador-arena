"""Pasa al plano original (public/plano/arenas.svg) lo que se mejoró en Illustrator: las capas de calles, parques, veredas y «otras etapas»
y los lotes cuya forma cambió. NO toca los marcadores (insignias), los grupos de manzana ni los ids de los lotes.
Uso: python -I scripts/plano/31_aplicar_illustrator_vias.py <arenas-illustrator.svg> public/plano/arenas.svg [--aplicar]

Illustrator exporta con el origen en la esquina de la mesa de trabajo (= esquina del viewBox del original), con clases CSS (.stNN) y
trazos relativos. Aquí cada forma se pasa tal cual, con su estilo en línea, dentro de un grupo con translate(origen del viewBox):
así la geometría no se reescribe. Los lotes que cambiaron se reescriben con sus vértices en coordenadas del original.
Un lote que falte en el archivo de Illustrator se conserva como está (R7-20 faltó la primera vez).
"""
import re
import sys

ai, destino = sys.argv[1], sys.argv[2]
aplicar = "--aplicar" in sys.argv
nuevo = open(ai, encoding="utf8").read()
orig = open(destino, encoding="utf8").read()

# origen: la esquina del viewBox del original
vb = re.search(r'viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"', orig)
OX, OY = float(vb.group(1)), float(vb.group(2))
print("origen de Illustrator → original:", OX, OY)

# ---- clases → estilo en línea ----
css = re.search(r"<style>(.*?)</style>", nuevo, re.S).group(1)
estilos = {}
for m in re.finditer(r"([^{}]+)\{([^}]*)\}", css):
    decl = ";".join(x.strip() for x in m.group(2).replace("\n", " ").split(";") if x.strip())
    for c in re.findall(r"\.(st\d+)", m.group(1)):
        estilos.setdefault(c, []).append(decl)
estilo_de = {c: ";".join(v) for c, v in estilos.items()}


def clase(f):
    m = re.search(r'class="(st\d+)"', f)
    return m.group(1) if m else None


def en_linea(elemento):
    """Cambia class="stN" por style="...", con el estilo ya resuelto."""
    def r(m):
        st = estilo_de.get(m.group(1), "")
        return f'style="{st}"' if st else ""

    return re.sub(r'class="(st\d+)"', r, elemento)


def grupo(s, abre):
    """Posiciones (inicio, fin) del <g ...> que empieza en `abre`, con sus anidados."""
    i = s.index(abre)
    depth = 0
    for m in re.finditer(r"<(/?)g\b[^>]*?(/?)>", s[i:]):
        if m.group(1):
            depth -= 1
        elif not m.group(2):
            depth += 1
        if depth == 0:
            return i, i + m.end()
    raise ValueError(abre)


def formas(texto):
    return re.findall(r"<(?:path|polygon|rect|circle|polyline)\b[^>]*/>", texto)


def visible(f):
    st = estilo_de.get(clase(f) or "", "")
    return "fill: none" not in st.replace("fill:none", "fill: none")


# ---- capas de Illustrator ----
i, j = grupo(nuevo, '<g id="otras-etapas"')
otras = "".join(en_linea(f) for f in formas(nuevo[i:j]))
i, j = grupo(nuevo, '<g id="veredas"')
veredas = "".join(en_linea(f) for f in formas(nuevo[i:j]))
# calles: el grupo «calzadas» (si Illustrator lo conservó) o, en la primera exportación, el grupo sin nombre que sigue a «fondo»
# (las formas con fill:none no se ven y se descartan)
if '<g id="calzadas"' in nuevo:
    i, j = grupo(nuevo, '<g id="calzadas"')
    calles = "".join(en_linea(f) for f in formas(nuevo[i:j]) if visible(f))
else:
    _, fin_fondo = grupo(nuevo, '<g id="fondo"')
    resto = nuevo[fin_fondo:]
    k0, k1 = grupo(resto, "<g>")
    calles = "".join(en_linea(f) for f in formas(resto[k0:k1]) if visible(f))
# parques: las del grupo «parques-planos» (si existe) más las formas verdes sueltas al final del archivo, después de las insignias.
# Illustrator duplica a veces una forma al copiarla: se descartan las idénticas.
tras = nuevo[nuevo.index('<g id="insignias"'):]
_, fin_ins = grupo(tras, '<g id="insignias"')
en_grupo = ""
if '<g id="parques-planos"' in nuevo:
    i, j = grupo(nuevo, '<g id="parques-planos"')
    en_grupo = nuevo[i:j]
vistas, lista = set(), []
for f in formas(en_grupo) + formas(tras[fin_ins:]):
    clave = re.sub(r'\s+', " ", re.sub(r'class="[^"]*"', "", f))
    if clave not in vistas:
        vistas.add(clave)
        lista.append(en_linea(f))
parques = "".join(lista)
print("formas → calles:", calles.count("<"), "| parques:", parques.count("<"), "| veredas:", veredas.count("<"), "| otras etapas:", otras.count("<"))
assert parques and calles and veredas and otras

T = f'transform="translate({OX:g} {OY:g})"'


def reemplazar(s, abre, nuevo_g):
    i, j = grupo(s, abre)
    return s[:i] + nuevo_g + s[j:]


salida = orig
salida = reemplazar(salida, '<g id="otras-etapas"', f'<g id="otras-etapas" {T}>{otras}</g>')
salida = reemplazar(salida, '<g id="calzadas"', f'<g id="calzadas" {T}>{calles}</g>')
salida = reemplazar(salida, '<g id="parques-planos"', f'<g id="parques-planos" {T}>{parques}</g>')
salida = reemplazar(salida, '<g id="veredas"', f'<g id="veredas" {T}>{veredas}</g>')


# ---- lotes que cambiaron de forma ----
def num(t):
    return re.findall(r"-?\d*\.?\d+(?:e-?\d+)?", t)


def vertices(d):
    """Vértices absolutos de un trazo M/L/H/V/Z (relativo o absoluto)."""
    pts, cur = [], (0.0, 0.0)
    for cmd, args in re.findall(r"([MmLlHhVvZz])([^MmLlHhVvZz]*)", d):
        n = [float(x) for x in num(args)]
        rel, c = cmd.islower(), cmd.upper()
        if c == "Z":
            continue
        if c == "M":
            x, y = n[0], n[1]
            if rel:
                x += cur[0]
                y += cur[1]
            cur = (x, y)
            pts.append(cur)
            n = n[2:]
            c = "L"
        if c == "L":
            for q in range(0, len(n), 2):
                cur = (cur[0] + n[q], cur[1] + n[q + 1]) if rel else (n[q], n[q + 1])
                pts.append(cur)
        elif c == "H":
            for v in n:
                cur = (cur[0] + v if rel else v, cur[1])
                pts.append(cur)
        elif c == "V":
            for v in n:
                cur = (cur[0], cur[1] + v if rel else v)
                pts.append(cur)
    if len(pts) > 1 and abs(pts[0][0] - pts[-1][0]) < 0.06 and abs(pts[0][1] - pts[-1][1]) < 0.06:
        pts.pop()
    return pts


def lotes(s, de_illustrator):
    r = {}
    for m in re.finditer(r'<path id="(lote-[^"]+)"[^>]*? d="([^"]*)"', s):
        p = vertices(m.group(2))
        if de_illustrator:
            p = [(x + OX, y + OY) for x, y in p]
        r[m.group(1)] = p
    return r


LN, LO = lotes(nuevo, True), lotes(salida, False)
cambios = []
for k, p in LO.items():
    q = LN.get(k)
    if q is None:
        print("  falta en Illustrator (se conserva):", k)
        continue
    if len(p) != len(q) or any(abs(a[0] - b[0]) > 0.06 or abs(a[1] - b[1]) > 0.06 for a, b in zip(p, q)):
        cambios.append(k)
        d = "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in q) + "Z"
        salida, n = re.subn(rf'(<path id="{re.escape(k)}"[^>]*? d=")[^"]*(")', lambda m: m.group(1) + d + m.group(2), salida, count=1)
        assert n == 1
print("lotes con forma nueva:", cambios)

print("tamaño:", len(orig), "→", len(salida))
if aplicar:
    open(destino, "w", encoding="utf8").write(salida)
    print("plano actualizado.")
