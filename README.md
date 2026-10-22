# Cotizador Arenas del Valle

Cotizador de lotes de **Arenas del Valle** (CEINYS), basado en la plantilla de cotizador sin base de datos.

- **Datos y pendientes:** [docs/pendientes-arenas.md](docs/pendientes-arenas.md)
- **Precios:** `src/data/arenas-lotes.json`, generado con `python -I scripts/consolidar-arenas.py "<ARENAS Y AURA.xlsx>" "<PRECIOS PROMOCION ARENAS.xlsx>"`. El Excel consolidado para revisión queda en `datos/`.
- **Motor y datos en código:** `src/lib/arenas.ts`.
- **Guía de la plantilla (referencia):** [docs/plantilla-cotizador-marca-blanca.md](docs/plantilla-cotizador-marca-blanca.md)

```bash
npm install
npm run dev
```
