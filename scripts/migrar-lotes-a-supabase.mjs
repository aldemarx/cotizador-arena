// Carga los lotes de Arenas del Valle (src/data/arenas-lotes.json) en la tabla `lotes` de Supabase, con proyecto_id = 'arenas-del-valle'.
// Uso:  node scripts/migrar-lotes-a-supabase.mjs [--solo-verificar]
// Antes: ejecutar supabase/migrations/0008_arenas_del_valle.sql en el SQL Editor de Supabase.
// Lee .env.local (NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY). Es repetible: hace upsert por (proyecto, manzana, lote) y NO toca la
// columna estado, así un cambio manual no se pierde. Nunca escribe ni borra filas de otro proyecto.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SECRET_KEY;
if (!URL_BASE || !KEY) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");

const PROYECTO_ID = "arenas-del-valle";
const json = JSON.parse(readFileSync("src/data/arenas-lotes.json", "utf8"));
const soloVerificar = process.argv.includes("--solo-verificar");

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function api(ruta, opciones = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...opciones, headers: { ...headers, ...opciones.headers } });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${ruta} → HTTP ${r.status}: ${texto.slice(0, 300)}`);
  return texto ? JSON.parse(texto) : null;
}

// El proyecto debe existir (lo crea la migración 0008): si no, se avisa antes de escribir nada.
const proyecto = await api(`proyectos?id=eq.${PROYECTO_ID}&select=id`);
if (proyecto.length === 0) throw new Error("Falta el proyecto «arenas-del-valle»: ejecuta primero supabase/migrations/0008_arenas_del_valle.sql");

const filas = json.lotes.map((l) => ({
  proyecto_id: PROYECTO_ID,
  manzana: l.mz, // «R4»
  lote: String(l.lt),
  metraje: l.metraje_m2,
  tarifa_m2: l.tarifa_m2,
  precio_lista: l.precio_lista, // precio de lanzamiento = contado + inicial
  precio_contado: l.precio_contado,
  inicial: l.inicial,
  inicial_mes_1: l.inicial, // la inicial se paga completa al firmar
  inicial_mes_2: 0,
  ubicacion: l.ubicacion,
  etapa: null, // el Excel de Arenas no la indica
  planes: null, // las cuotas se calculan en el código de Arenas (cambian con la inicial y el plazo que elige el asesor)
  promocion: l.promocion,
  // estado: se omite a propósito (queda 'libre' al crear y no se pisa al repetir la carga)
}));

const claves = new Set(filas.map((f) => `${f.manzana}-${f.lote}`));
if (claves.size !== filas.length) throw new Error("Hay lotes duplicados en el JSON");
console.log(`JSON: ${filas.length} lotes de ${PROYECTO_ID}`);

if (!soloVerificar) {
  for (let i = 0; i < filas.length; i += 250) {
    await api("lotes?on_conflict=proyecto_id,manzana,lote", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(filas.slice(i, i + 250)),
    });
    console.log(`  cargados ${Math.min(i + 250, filas.length)} / ${filas.length}`);
  }
}

// Verificación: compara lo guardado contra el JSON (la API devuelve como máximo 1000 filas por consulta: se lee por páginas).
const guardados = [];
for (let desde = 0; ; desde += 1000) {
  const pagina = await api(
    `lotes?proyecto_id=eq.${PROYECTO_ID}&select=manzana,lote,precio_contado,inicial,metraje,promocion,estado&order=manzana,lote`,
    { headers: { Range: `${desde}-${desde + 999}` } },
  );
  guardados.push(...pagina);
  if (pagina.length < 1000) break;
}
// jsonb reordena las claves: se comparan con las claves ordenadas.
const canonico = (v) =>
  JSON.stringify(v, (_, x) =>
    x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x,
  );
let difieren = 0;
const porClave = new Map(guardados.map((g) => [`${g.manzana}-${g.lote}`, g]));
for (const f of filas) {
  const g = porClave.get(`${f.manzana}-${f.lote}`);
  if (
    !g ||
    Number(g.precio_contado) !== f.precio_contado ||
    Number(g.inicial) !== f.inicial ||
    Number(g.metraje) !== f.metraje ||
    canonico(g.promocion) !== canonico(f.promocion)
  )
    difieren++;
}
const estados = guardados.reduce((a, g) => ((a[g.estado] = (a[g.estado] ?? 0) + 1), a), {});
console.log(`Supabase: ${guardados.length} lotes · estados ${JSON.stringify(estados)}`);
console.log(difieren === 0 ? "✔ Todo coincide con el JSON" : `✖ ${difieren} lotes difieren del JSON`);
process.exit(difieren === 0 && guardados.length === filas.length ? 0 : 1);
