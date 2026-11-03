"""Convierte el mapa del parque recreativo (PNG con transparencia) en public/plano/parque-recreativo.webp.
Uso: python scripts/plano/30_parque_isometrico.py "<parque recreativo.png>"
La imagen se coloca A MANO en public/plano/arenas.svg (id="parque-recreativo", girada 90° a la derecha, debajo de las manzanas
y pegada a la zona gris de otras etapas) junto con un <rect id="limite-club"> invisible que marca su caja ya girada: la vista
previa del cotizador (VistaPreviaLote.tsx) lo usa para dejar alejar el zoom hasta ver el club entero. Si se mueve la imagen,
hay que mover también ese rectángulo."""
import sys

from PIL import Image

Image.open(sys.argv[1]).convert("RGBA").save("public/plano/parque-recreativo.webp", quality=92, method=6)
print("listo: public/plano/parque-recreativo.webp")
