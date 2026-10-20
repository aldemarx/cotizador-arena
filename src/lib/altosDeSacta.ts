import data from "@/data/precios-altos-de-sacta.json";

// Fuente oficial de datos y reglas: docs/contexto-simulador-altos-de-sacta.md
// El JSON trae los 1,112 lotes de Altos de Sacta (Tercera Etapa, Mz 5 y 6) con
// precios y cuotas YA CALCULADOS. Este archivo solo los lee, expande el
// cronograma mensual real y los da formato: no recalcula el modelo financiero.

export type TipoModalidad = "fija" | "ascendente" | "descendente";

export type EstadoLote = "libre" | "bloqueado" | "vendido";

/** Cómo se nombra cada estado en pantalla. */
export const ESTADO_ETIQUETA: Record<EstadoLote, string> = {
  libre: "Disponible",
  bloqueado: "Reservado",
  vendido: "Vendido",
};

/** ¿Se puede enviar la cotización de este lote? Solo si está libre. */
export function estaLibre(lote: Lote): boolean {
  return (lote.estado ?? "libre") === "libre";
}

export type Plan = {
  cuotas_por_tramo: number[];
  total_cuotas: number;
  precio_financiado: number;
};

export type Lote = {
  lote: string;
  etapa: string;
  mz: number;
  lt: number;
  metraje_m2: number;
  ubicacion: string;
  tarifa_m2: number;
  precio_lista: number;
  /** Contado + inicial: es el «Precio con dscto» que ve el cliente (en el Excel, columna H). */
  precio_con_dscto: number;
  precio_contado: number;
  inicial: number;
  inicial_mes_1: number;
  inicial_mes_2: number;
  planes: Record<TipoModalidad, Plan>;
  /** Cantidad de cuotas de `planes`. Si falta, son las del proyecto (PARAMETROS.numero_cuotas = 80). */
  plazo?: number;
  // El tarifario no indica disponibilidad. Campo listo para cuando llegue
  // esa data; hasta entonces se debe verificar manualmente antes del live
  // (ver "Cuidados" en el contexto oficial).
  /** Estado comercial; si falta (JSON de respaldo) el lote se considera libre. */
  estado?: EstadoLote;
};

export type Parametros = {
  tasa_mensual: number;
  numero_cuotas: number;
  meses_por_tramo: number;
  tramos: number;
  variacion_anual_ascendente: number;
  variacion_anual_descendente: number;
  inicial_minima: number;
  inicial_porcentaje_contado: number;
  /** Solo presente durante la prueba de inicial fija (ver docs/contexto-simulador-altos-de-sacta.md). */
  inicial_modo?: "fija_2000";
  en_prueba?: string;
  /** Modelo anterior (con interés): lista = financiado / (1 - descuento). */
  descuento_lista?: number;
  /** Modelo del Excel: lista = precio con dscto + recargo. */
  recargo_lista?: number;
  modelo?: string;
  calendario: string;
};

type Data = {
  proyecto: string;
  moneda: string;
  version: string;
  parametros: Parametros;
  tarifas_m2: Record<string, number>;
  lotes: Lote[];
};

const DATA = data as Data;

export const PROYECTO = DATA.proyecto;
export const VERSION_DATA = DATA.version;
export const PARAMETROS = DATA.parametros;
export const TARIFAS_M2 = DATA.tarifas_m2;
// Ordenados por manzana y lote: el JSON viene en el orden del Excel (la Manzana 6 empieza en el 285) y el
// lote por defecto de cada manzana es el primero de esta lista. Supabase los devuelve ya ordenados.
export const LOTES: Lote[] = [...DATA.lotes].sort(
  (a, b) => a.mz - b.mz || a.lt - b.lt,
);

export const MODALIDADES: {
  key: TipoModalidad;
  label: string;
  color: string;
}[] = [
  { key: "fija", label: "Fija", color: "var(--series-clasico)" },
  { key: "ascendente", label: "Ascendente", color: "var(--series-ascendente)" },
  {
    key: "descendente",
    label: "Descendente",
    color: "var(--series-descendente)",
  },
];

export function buscarLotePorId(
  id: string,
  lotes: Lote[] = LOTES,
): Lote | undefined {
  const normalizado = id.trim().toUpperCase();
  if (!normalizado) return undefined;
  return lotes.find((l) => l.lote.toUpperCase() === normalizado);
}

export function filtrarLotesPorTexto(
  texto: string,
  opciones?: { mz?: number; limite?: number },
  lotes: Lote[] = LOTES,
): Lote[] {
  const q = texto.trim().toUpperCase();
  const limite = opciones?.limite ?? 8;
  const base =
    opciones?.mz != null ? lotes.filter((l) => l.mz === opciones.mz) : lotes;
  if (!q) return base.slice(0, limite);
  return base.filter((l) => l.lote.toUpperCase().includes(q)).slice(0, limite);
}

export function manzanasDisponibles(lotes: Lote[] = LOTES): number[] {
  return Array.from(new Set(lotes.map((l) => l.mz))).sort((a, b) => a - b);
}

// --- Cronograma mensual real (calendario de la sección 4 del contexto) ---

export type CuotaMensual = {
  numero: number; // 1..numero_cuotas
  tramo: number; // 1..tramos
  monto: number;
  esInicioTramo: boolean;
  mesIndice: number; // mes relativo a la firma (0 = firma)
};

/** Tamaño en meses de cada tramo: todos `meses_por_tramo`, salvo el último. */
export function tamanosDeTramo(params: Parametros = PARAMETROS): number[] {
  const { tramos, meses_por_tramo, numero_cuotas } = params;
  const tamanos = Array.from({ length: tramos - 1 }, () => meses_por_tramo);
  tamanos.push(numero_cuotas - meses_por_tramo * (tramos - 1));
  return tamanos;
}

/** Expande las 7 cuotas por tramo a las 80 cuotas mensuales individuales. */
export function expandirCuotas(
  plan: Plan,
  params: Parametros = PARAMETROS,
): CuotaMensual[] {
  const tamanos = tamanosDeTramo(params);
  const cuotas: CuotaMensual[] = [];
  let numero = 1;
  tamanos.forEach((tamano, i) => {
    const monto = plan.cuotas_por_tramo[i];
    for (let j = 0; j < tamano; j++) {
      cuotas.push({
        numero,
        tramo: i + 1,
        monto,
        esInicioTramo: j === 0,
        // Calendario real: la cuota "numero" se paga en el mes numero+1
        // (mes 0 = firma, mes 1 = 2da parte de la inicial).
        mesIndice: numero + 1,
      });
      numero++;
    }
  });
  return cuotas;
}

const MESES_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export function etiquetaMes(
  mesIndice: number,
  base: Date = new Date(),
): string {
  const fecha = new Date(base.getFullYear(), base.getMonth() + mesIndice, 1);
  return `${MESES_ES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

// --- Forma de pago de la inicial ---

/** Cómo se paga la inicial: de una vez, en 2 partes o en 3 partes. */
export type InicialModo = "completa" | "dos" | "tres";

export const INICIAL_MODOS: {
  key: InicialModo;
  label: string;
  partes: number;
}[] = [
  { key: "completa", label: "Completa", partes: 1 },
  { key: "dos", label: "2 partes", partes: 2 },
  { key: "tres", label: "3 partes", partes: 3 },
];

export type ParteInicial = { monto: number; fecha: string };

/** Monto fijo de la 2.ª y la 3.ª parte cuando la inicial se paga en 3 partes. */
const PARTE_FIJA_INICIAL = 500;

/**
 * Reparte la inicial del lote en 1, 2 o 3 pagos consecutivos (mes 0 = firma).
 * En 2 partes usa las cifras oficiales del JSON. En 3 partes la 2.ª y la 3.ª
 * son fijas (S/ 500 cada una) y la 1.ª lleva el resto: S/ 1,000 en una inicial
 * de S/ 2,000, y cualquier excedente sobre ese mínimo va en la 1.ª parte.
 * La suma siempre es exactamente la inicial; el total no cambia.
 */
export function partesDeInicial(
  lote: Lote,
  modo: InicialModo,
  base: Date = new Date(),
): ParteInicial[] {
  let montos: number[];
  if (modo === "completa") montos = [lote.inicial];
  else if (modo === "dos") montos = [lote.inicial_mes_1, lote.inicial_mes_2];
  else {
    montos = [
      lote.inicial - PARTE_FIJA_INICIAL * 2,
      PARTE_FIJA_INICIAL,
      PARTE_FIJA_INICIAL,
    ];
  }
  return montos.map((monto, i) => ({ monto, fecha: etiquetaMes(i, base) }));
}

export type FilaCalendario = {
  concepto: string;
  monto: number;
  mesIndice: number;
  fecha: string;
  tramo?: number;
  esInicioTramo?: boolean;
  esInicial?: boolean;
};

/** Cronograma completo (2 iniciales + 80 cuotas) listo para tabla, con fecha calendario a partir de hoy. */
export function construirCalendarioCompleto(
  lote: Lote,
  modalidad: TipoModalidad,
  base: Date = new Date(),
): FilaCalendario[] {
  const plan = lote.planes[modalidad];
  const cuotas = expandirCuotas(plan);

  const filas: FilaCalendario[] = [
    {
      concepto: "Inicial (al firmar)",
      monto: lote.inicial_mes_1,
      mesIndice: 0,
      fecha: etiquetaMes(0, base),
      esInicial: true,
    },
    {
      concepto: "Inicial (2da parte)",
      monto: lote.inicial_mes_2,
      mesIndice: 1,
      fecha: etiquetaMes(1, base),
      esInicial: true,
    },
  ];

  for (const c of cuotas) {
    filas.push({
      concepto: `Cuota ${c.numero}`,
      monto: c.monto,
      mesIndice: c.mesIndice,
      fecha: etiquetaMes(c.mesIndice, base),
      tramo: c.tramo,
      esInicioTramo: c.esInicioTramo,
    });
  }

  return filas;
}

/** Cantidad de cuotas del plan que trae el lote. */
export function plazoDe(lote: Lote): number {
  return lote.plazo ?? PARAMETROS.numero_cuotas;
}

function parametrosParaPlazo(params: Parametros, cuotas: number): Parametros {
  return {
    ...params,
    numero_cuotas: cuotas,
    tramos: Math.ceil(cuotas / params.meses_por_tramo),
  };
}

// Medio céntimo sube (como Excel); la tolerancia evita que el ruido de coma flotante lo baje.
const aCentimos = (x: number) => Math.floor(x * 100 + 0.5 + 1e-7) / 100;

/** Plan de `cuotas` cuotas por tramos de `meses_por_tramo`; con g = 0 es la cuota fija. */
function planParaPlazo(
  saldo: number,
  inicial: number,
  cuotas: number,
  g: number,
  params: Parametros,
): Plan {
  const mes = params.meses_por_tramo;
  const tamanos = tamanosDeTramo(parametrosParaPlazo(params, cuotas));
  let divisor = 0;
  for (let m = 1; m <= cuotas; m++)
    divisor += (1 + g) ** Math.floor((m - 1) / mes);
  const base = saldo / divisor;
  const cuotasPorTramo = tamanos.map((_, k) => aCentimos(base * (1 + g) ** k));
  const total = aCentimos(
    cuotasPorTramo.reduce((suma, c, k) => suma + c * tamanos[k], 0),
  );
  return {
    cuotas_por_tramo: cuotasPorTramo,
    total_cuotas: total,
    precio_financiado: aCentimos(inicial + total),
  };
}

/**
 * El mismo lote financiado en otra cantidad de cuotas. El total no cambia (precio con dscto fijo):
 * solo se reparte en más o menos cuotas. Con el plazo estándar devuelve el lote tal cual.
 */
export function conPlazo(
  lote: Lote,
  cuotas: number,
  params: Parametros = PARAMETROS,
): Lote {
  if (cuotas === plazoDe(lote)) return lote;
  const saldo = lote.precio_con_dscto - lote.inicial;
  return {
    ...lote,
    plazo: cuotas,
    planes: {
      fija: planParaPlazo(saldo, lote.inicial, cuotas, 0, params),
      ascendente: planParaPlazo(
        saldo,
        lote.inicial,
        cuotas,
        params.variacion_anual_ascendente,
        params,
      ),
      descendente: planParaPlazo(
        saldo,
        lote.inicial,
        cuotas,
        params.variacion_anual_descendente,
        params,
      ),
    },
  };
}

/** Con un plazo de un solo año las tres modalidades dan lo mismo: solo se ofrece la fija. */
export function modalidadesDe(lote: Lote) {
  return plazoDe(lote) > PARAMETROS.meses_por_tramo
    ? MODALIDADES
    : MODALIDADES.filter((m) => m.key === "fija");
}

/** Etiqueta de cada tramo para el gráfico comparativo (7 barras). */
export function categoriasDeTramo(params: Parametros = PARAMETROS): string[] {
  // El último tramo dura menos de 12 meses (8 con 80 cuotas), pero se rotula
  // igual como "Año N" para que la lectura sea uniforme.
  return tamanosDeTramo(params).map((_, i) => `Año ${i + 1}`);
}

export type SegmentoTramo = {
  label: string;
  meses: number;
  monto: number;
};

/** Los 7 tramos del plan elegido, listos para dibujar como línea de tiempo horizontal. */
export function segmentosDeTramo(
  lote: Lote,
  modalidad: TipoModalidad,
  params: Parametros = PARAMETROS,
): SegmentoTramo[] {
  const parametros = parametrosParaPlazo(params, plazoDe(lote));
  const tamanos = tamanosDeTramo(parametros);
  const categorias = categoriasDeTramo(parametros);
  const plan = lote.planes[modalidad];
  return tamanos.map((meses, i) => ({
    label: categorias[i],
    meses,
    monto: plan.cuotas_por_tramo[i],
  }));
}

export type ResumenModalidad = {
  inicial: number;
  inicialMes1: number;
  inicialMes2: number;
  cuotaPrimerMes: number;
  cuotaUltimoMes: number;
  totalCuotas: number;
  totalAPagar: number;
};

export function resumenModalidad(
  lote: Lote,
  modalidad: TipoModalidad,
): ResumenModalidad {
  const plan = lote.planes[modalidad];
  return {
    inicial: lote.inicial,
    inicialMes1: lote.inicial_mes_1,
    inicialMes2: lote.inicial_mes_2,
    cuotaPrimerMes: plan.cuotas_por_tramo[0],
    cuotaUltimoMes: plan.cuotas_por_tramo[plan.cuotas_por_tramo.length - 1],
    totalCuotas: plan.total_cuotas,
    totalAPagar: plan.precio_financiado,
  };
}

export function fraseUtil(lote: Lote, modalidad: TipoModalidad): string {
  const { cuotaPrimerMes, cuotaUltimoMes } = resumenModalidad(lote, modalidad);
  if (modalidad === "ascendente") {
    return `Con la ascendente empiezas pagando ${formatSoles(cuotaPrimerMes)} y tu cuota sube 5% cada año, hasta ${formatSoles(cuotaUltimoMes)}.`;
  }
  if (modalidad === "descendente") {
    return `Con la descendente empiezas pagando ${formatSoles(cuotaPrimerMes)} y tu cuota baja 5% cada año, hasta ${formatSoles(cuotaUltimoMes)}.`;
  }
  return `Con la fija pagas siempre ${formatSoles(cuotaPrimerMes)} al mes, del inicio al final.`;
}

/** Monto como en el Excel: con céntimos cuando los tiene (384.26), sin ellos cuando es exacto (2,000). */
export function formatearMonto(valor: number): string {
  const centimos = Math.round(valor * 100) / 100;
  const entero = Number.isInteger(centimos);
  return centimos.toLocaleString("es-PE", {
    minimumFractionDigits: entero ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function formatSoles(valor: number): string {
  return `S/ ${formatearMonto(valor)}`;
}

/** Texto de la nota al pie: explica qué significan los números entre paréntesis (meses de cada tramo). */
export function notaMeses(segmentos: { meses: number }[]): string {
  const total = segmentos.reduce((suma, s) => suma + s.meses, 0);
  const ultimo = segmentos[segmentos.length - 1].meses;
  const resto = segmentos.slice(0, -1);
  const mesesBase = resto[0]?.meses ?? ultimo;
  const iguales = resto.every((s) => s.meses === mesesBase);
  const detalle = iguales
    ? ultimo === mesesBase
      ? `${segmentos.length} ${segmentos.length === 1 ? "tramo" : "tramos"} de ${mesesBase} meses`
      : `${resto.length} ${resto.length === 1 ? "tramo" : "tramos"} de ${mesesBase} meses y un último tramo de ${ultimo} meses`
    : segmentos.map((s) => `${s.meses}`).join(" + ") + " meses";
  return `El número entre paréntesis indica cuántos meses se paga cada cuota mensual. El plan comprende ${total} cuotas mensuales consecutivas (${detalle}).`;
}
