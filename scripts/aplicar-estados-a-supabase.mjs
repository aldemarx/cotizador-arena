// Aplica en Supabase los estados sacados del plano PDF de ventas (scripts/plano/21_estados_desde_pdf.py):
//   · puntos rojos            -> estado = 'vendido'
//   · puntos rosados y las manzanas rotuladas «BLOQUEADO» -> bloqueo_gerencia = true («Reservado» para el asesor)
// Uso:  node scripts/aplicar-estados-a-supabase.mjs <estados.json> [--aplicar]      (sin --aplicar solo muestra lo que haría)
// Solo toca lotes de 'arenas-del-valle'. Nunca pone un lote en 'libre': no deshace nada que ya esté marcado a mano.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SECRET_KEY;
if (!URL_BASE || !KEY) throw new Error("Faltan variables en .env.local");
const PROYECTO = "arenas-del-valle";
const MANZANAS_BLOQUEADAS = ["R16", "R17", "R18", "R19", "R20", "R21", "R22"]; // rotuladas «BLOQUEADO» en el plano de ventas
const [archivo] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const aplicar = process.argv.includes("--aplicar");
const est = JSON.parse(readFileSync(archivo, "utf8"));

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
async function api(ruta, op = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...op, headers: { ...headers, ...op.headers } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${ruta} -> HTTP ${r.status}: ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

// Todos los lotes de Arenas con su estado actual
const lotes = [];
for (let d = 0; ; d += 1000) {
  const p = await api(`lotes?proyecto_id=eq.${PROYECTO}&select=id,manzana,lote,estado,bloqueo_gerencia&order=manzana,lote`, { headers: { Range: `${d}-${d + 999}` } });
  lotes.push(...p);
  if (p.length < 1000) break;
}
const porClave = new Map(lotes.map((l) => [`${l.manzana}-${l.lote}`, l]));

const vendidos = new Set(est.vendidos);
const bloqueados = new Set(est.bloqueados);
for (const l of lotes) if (MANZANAS_BLOQUEADAS.includes(l.manzana)) bloqueados.add(`${l.manzana}-${l.lote}`);
const choque = [...vendidos].filter((k) => bloqueados.has(k));
const faltan = [...vendidos, ...bloqueados].filter((k) => !porClave.has(k));
console.log(`lotes en Supabase: ${lotes.length}`);
console.log(`vendidos a marcar: ${vendidos.size} · bloqueados a marcar: ${bloqueados.size}`);
console.log(`lotes que son a la vez vendido y bloqueado: ${choque.length}${choque.length ? " -> " + choque.join(", ") : ""}`);
console.log(`claves que no existen en la base: ${faltan.length}${faltan.length ? " -> " + faltan.join(", ") : ""}`);
if (!aplicar) { console.log("(simulación: no se escribió nada; agrega --aplicar)"); process.exit(0); }
if (faltan.length) throw new Error("Hay claves que no existen: se cancela");

let n = 0;
for (const k of vendidos) {
  await api(`lotes?id=eq.${porClave.get(k).id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ estado: "vendido" }) });
  n++;
}
for (const k of bloqueados) {
  await api(`lotes?id=eq.${porClave.get(k).id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ bloqueo_gerencia: true }) });
  n++;
}
console.log(`escritos: ${n}`);
// Verificación
const despues = await api(`lotes?proyecto_id=eq.${PROYECTO}&select=estado,bloqueo_gerencia&limit=1000`);
const cuenta = (f) => despues.filter(f).length;
console.log(`ahora: vendido ${cuenta((l) => l.estado === "vendido")} · bloqueo_gerencia ${cuenta((l) => l.bloqueo_gerencia)} · libres ${cuenta((l) => l.estado === "libre")} (de ${despues.length})`);
