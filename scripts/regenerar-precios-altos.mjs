#!/usr/bin/env node
/**
 * Regenera src/data/precios-altos-de-sacta.json a partir del respaldo con la
 * regla original de inicial (src/data/precios-altos-de-sacta.inicial-5pct.json),
 * aplicando la fórmula oficial de docs/contexto-simulador-altos-de-sacta.md.
 *
 * Uso:
 *   node scripts/regenerar-precios-altos.mjs --verificar
 *       Recalcula con la regla original y comprueba que reproduce el respaldo
 *       lote por lote (sirve para confiar en la fórmula). No escribe nada.
 *
 *   node scripts/regenerar-precios-altos.mjs --inicial=2000
 *       PRUEBA: inicial fija de S/ 2,000 en todos los lotes. Escribe el JSON.
 *
 *   node scripts/regenerar-precios-altos.mjs --inicial=5pct
 *       VUELTA ATRÁS: inicial = MAX(2000, 5 % del contado a la centena).
 *       Deja el JSON idéntico al respaldo.
 *
 * El precio de contado, el metraje y las tarifas NO cambian: solo la inicial
 * y, por consecuencia, las cuotas, el total financiado y el precio de lista.
 */
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const RESPALDO = join(RAIZ, "src/data/precios-altos-de-sacta.inicial-5pct.json");
const SALIDA = join(RAIZ, "src/data/precios-altos-de-sacta.json");

const arg = process.argv.slice(2);
const verificar = arg.includes("--verificar");
const modo = (arg.find((a) => a.startsWith("--inicial=")) ?? "--inicial=5pct").split("=")[1];
if (!verificar && !["2000", "5pct"].includes(modo)) {
  console.error('Modo no válido. Usa --inicial=2000, --inicial=5pct o --verificar.');
  process.exit(1);
}

const base = JSON.parse(readFileSync(RESPALDO, "utf8"));
const P = base.parametros;
const i = P.tasa_mensual;
const N = P.numero_cuotas;
const MESES_TRAMO = P.meses_por_tramo;
const TRAMOS = P.tramos;

/** REDONDEAR.MAS de Excel para positivos (con tolerancia a ruido de coma flotante). */
const techo = (x) => Math.ceil(Math.round(x * 1e9) / 1e9);

function inicialDe(precioContado, modoInicial) {
  if (modoInicial === "2000") return 2000;
  return Math.max(P.inicial_minima, Math.ceil(precioContado * P.inicial_porcentaje_contado / 100) * 100);
}

const tramoDe = (m) => Math.floor((m - 1) / MESES_TRAMO);
const tamanos = Array.from({ length: TRAMOS }, (_, k) =>
  k < TRAMOS - 1 ? MESES_TRAMO : N - MESES_TRAMO * (TRAMOS - 1),
);

function plan(contado, m1, m2, g) {
  const pv = contado - m1 - m2 / (1 + i);
  let den = 0;
  for (let m = 1; m <= N; m++) den += (1 + g) ** tramoDe(m) / (1 + i) ** (m + 1);
  const C = pv / den;
  const cuotas = Array.from({ length: TRAMOS }, (_, k) => techo(C * (1 + g) ** k));
  const total = cuotas.reduce((s, c, k) => s + c * tamanos[k], 0);
  return { cuotas_por_tramo: cuotas, total_cuotas: total, precio_financiado: m1 + m2 + total };
}

function recalcular(lote, modoInicial) {
  const contado = lote.precio_contado;
  const inicial = inicialDe(contado, modoInicial);
  const m1 = Math.ceil(inicial / 2);
  const m2 = inicial - m1;
  const planes = {
    fija: plan(contado, m1, m2, 0),
    ascendente: plan(contado, m1, m2, P.variacion_anual_ascendente),
    descendente: plan(contado, m1, m2, P.variacion_anual_descendente),
  };
  const lista = Math.ceil(planes.fija.precio_financiado / (1 - P.descuento_lista) / 100) * 100;
  return { ...lote, precio_lista: lista, inicial, inicial_mes_1: m1, inicial_mes_2: m2, planes };
}

if (verificar) {
  let mal = 0;
  const detalle = [];
  for (const l of base.lotes) {
    const r = recalcular(l, "5pct");
    if (JSON.stringify(r) !== JSON.stringify(l)) {
      mal++;
      if (detalle.length < 5) detalle.push(l.lote);
    }
  }
  console.log(`Verificación con la regla original: ${base.lotes.length - mal}/${base.lotes.length} lotes coinciden con el respaldo.`);
  if (mal) {
    console.log(`Diferencias en ${mal} lotes (ej.: ${detalle.join(", ")}).`);
    process.exit(2);
  }
  process.exit(0);
}

if (modo === "5pct") {
  // Vuelta atrás exacta: se restaura el respaldo byte a byte.
  copyFileSync(RESPALDO, SALIDA);
  console.log(`Restaurado ${SALIDA} desde el respaldo (inicial = MAX(2000, 5 % del contado)).`);
  process.exit(0);
}

const lotes = base.lotes.map((l) => recalcular(l, modo));
const salida = { ...base, lotes };

if (modo === "2000") {
  salida.version = "2026-10-01-prueba-inicial-2000";
  salida.parametros = {
    ...base.parametros,
    inicial_modo: "fija_2000",
    en_prueba:
      "Inicial fija de S/ 2,000 en todos los lotes. Vuelta atrás: node scripts/regenerar-precios-altos.mjs --inicial=5pct (ver docs/contexto-simulador-altos-de-sacta.md).",
  };
}

// Misma indentación (1 espacio) y sin salto final, como el archivo original: el diff de git solo muestra lo que cambia.
writeFileSync(SALIDA, JSON.stringify(salida, null, 1), "utf8");
console.log(`Escrito ${SALIDA} con inicial fija de S/ 2,000.`);
