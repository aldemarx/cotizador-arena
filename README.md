# Plantilla de cotizador (marca blanca)

Cotizador inmobiliario de Altos de Sacta **sin base de datos y sin panel de administración**, para usarlo como punto de partida de un cotizador de otro nicho.

- Guía completa: [docs/plantilla-cotizador-marca-blanca.md](docs/plantilla-cotizador-marca-blanca.md)
- Datos: `src/data/*.json` (los precios ya vienen calculados). Motor de cuotas: `src/lib/altosDeSacta.ts`.
- Cuentas de pago: `src/lib/cuentasDePago.ts` (aquí con datos ficticios).

```bash
npm install
npm run dev -- -p 3100   # http://localhost:3100
npm run build            # genera también los tipos (LayoutProps) que pide `tsc`
```

Todavía conserva la marca, los textos, las fotos y los precios de Altos de Sacta: cambiarlos es el paso 3–6 de la guía.
