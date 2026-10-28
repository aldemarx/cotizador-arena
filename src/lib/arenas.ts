
// Datos y pendientes: docs/pendientes-arenas.md. El JSON (src/data/arenas-lotes.json) lo genera
// scripts/consolidar-arenas.py a partir de los dos Excel de Arenas y trae, por lote, metraje, precio
// de lanzamiento, contado, inicial y (en 138 lotes) las condiciones de promoción. Aquí se convierte
// en `Lote` con el plan de cuotas fijas y se da formato a los montos.

export type TipoModalidad = "fija" | "ascendente" | "descendente";

export type EstadoLote = "libre" | "bloqueado" | "vendido";

/** Cómo se nombra cada estado en pantalla. */
export const ESTADO_ETIQUETA: Record<EstadoLote, string> = {
  libre: "Disponible",
  bloqueado: "Separado",
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

/** Promoción especial del Excel de promoción (solo algunos lotes). */
export type Promocion = {
  tipo: "standard" | "preferencial";
  /** Precio «real» (el más alto, tachado). */
  precio_real: number;
  precio_promo_contado: number;
  /** Solo Standard: precio promocional financiado y su cuota fija a `PLAZO_PROMOCION` cuotas. Preferencial: no aplica. */
  precio_promo_financiado?: number;
  cuota_promo?: number;
};

/** Cantidad de cuotas de la promoción financiada: está fijada en el Excel de promoción (`/60`). */
export const PLAZO_PROMOCION = 60;

export type Lote = {
  lote: string;
  /** El Excel de Arenas no indica la etapa de cada lote: queda sin mostrar (ver docs/pendientes-arenas.md). */
  etapa?: string;
  /** Manzana tal como la nombra el Excel: «R1», «R10»… */
  mz: string;
  lt: number;
  metraje_m2: number;
  ubicacion: string;
  tarifa_m2: number;
  precio_lista: number;
  /** Contado + inicial: es el «Precio con dscto» que ve el cliente (en el Excel, el precio de lanzamiento). */
  precio_con_dscto: number;
  precio_contado: number;
  inicial: number;
  inicial_mes_1: number;
  inicial_mes_2: number;
  planes: Record<TipoModalidad, Plan>;
  /** Cantidad de cuotas de `planes`. Si falta, son las del proyecto (PARAMETROS.numero_cuotas = 80). */
  plazo?: number;
  /** Cotización puntual con una sola cuota fija (sin plan ascendente ni descendente). */
  soloFija?: boolean;
  // El tarifario no indica disponibilidad. Campo listo para cuando llegue
  // esa data; hasta entonces se debe verificar manualmente antes del live
  // (ver "Cuidados" en el contexto oficial).
  /** Estado comercial; si falta (JSON de respaldo) el lote se considera libre. */
  estado?: EstadoLote;
  /** Presente solo en los lotes con promoción especial. */
  promocion?: Promocion;
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

/** Un lote tal como lo guarda el JSON (y como se reconstruye desde Supabase). */
export type LoteJson = {
  lote: string;
  mz: string;
  lt: number;
  metraje_m2: number;
  ubicacion: string;
  tarifa_m2: number;
  /** Precio de lanzamiento: contado + inicial. */
  precio_lista: number;
  precio_contado: number;
  inicial: number;
  promocion: {
    tipo: "standard" | "preferencial";
    precio_real: number;
    promo_contado: number;
    promo_financiado: number | null;
  } | null;
};

export const PROYECTO = "Arenas del Valle";

/** Reglas de Arenas (Excel «ARENAS Y AURA»): sin interés, inicial S/ 2,000 en dos partes, cuota fija = contado / cuotas. */
export const PARAMETROS: Parametros = {
  tasa_mensual: 0,
  numero_cuotas: 80,
  meses_por_tramo: 12,
  tramos: 7,
  // El Excel de Arenas no tiene cuotas ascendentes ni descendentes: solo la fija.
  variacion_anual_ascendente: 0,
  variacion_anual_descendente: 0,
  inicial_minima: 2000,
  inicial_porcentaje_contado: 0,
  // En el Excel de promoción, «precio real» = precio de lanzamiento + 4,000.
  recargo_lista: 4000,
  modelo: "arenas-2026",
  calendario: "inicial 1000 + 1000; cuotas = contado / cantidad de cuotas",
};

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

export function buscarLotePorId(id: string, lotes: Lote[]): Lote | undefined {
  const normalizado = id.trim().toUpperCase();
  if (!normalizado) return undefined;
  return lotes.find((l) => l.lote.toUpperCase() === normalizado);
}

export function filtrarLotesPorTexto(
  texto: string,
  opciones: { mz?: string; limite?: number } | undefined,
  lotes: Lote[],
): Lote[] {
  const q = texto.trim().toUpperCase();
  const limite = opciones?.limite ?? 8;
  const base =
    opciones?.mz != null ? lotes.filter((l) => l.mz === opciones.mz) : lotes;
  if (!q) return base.slice(0, limite);
  return base.filter((l) => l.lote.toUpperCase().includes(q)).slice(0, limite);
}

export function manzanasDisponibles(lotes: Lote[]): string[] {
  return Array.from(new Set(lotes.map((l) => l.mz))).sort(
    (a, b) => numeroDeManzana(a) - numeroDeManzana(b),
  );
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
        // Calendario real: la inicial se paga en el mes 0 (firma) y la cuota "numero" en el mes numero.
        mesIndice: numero,
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

/** Inicial que elige el cliente: solo hay tres, se paga completa al firmar y el precio total no cambia (cambia la cuota). */
export type InicialModo = "500" | "1000" | "2000";

export const INICIAL_MODOS: {
  key: InicialModo;
  label: string;
  monto: number;
}[] = [
  { key: "500", label: "S/ 500", monto: 500 },
  { key: "1000", label: "S/ 1,000", monto: 1000 },
  { key: "2000", label: "S/ 2,000", monto: 2000 },
];

export const INICIAL_POR_DEFECTO: InicialModo = "2000";

export type ParteInicial = { monto: number; fecha: string };

/** La inicial se paga de una vez, al firmar (mes 0). */
export function partesDeInicial(
  lote: Lote,
  base: Date = new Date(),
): ParteInicial[] {
  return [{ monto: lote.inicial, fecha: etiquetaMes(0, base) }];
}

/**
 * El mismo lote con otra inicial. El precio con dscto no cambia: lo que baja o sube es el saldo que se reparte
 * en cuotas (precio con dscto − inicial). Se conserva el plazo que ya traía el lote.
 */
export function conInicial(
  lote: Lote,
  inicial: number,
  params: Parametros = PARAMETROS,
): Lote {
  if (inicial === lote.inicial) return lote;
  const saldo = lote.precio_con_dscto - inicial;
  const fija = planParaPlazo(saldo, inicial, plazoDe(lote), 0, params);
  const promo = lote.promocion;
  return {
    ...lote,
    inicial,
    inicial_mes_1: inicial,
    inicial_mes_2: 0,
    planes: { fija, ascendente: fija, descendente: fija },
    promocion:
      promo?.precio_promo_financiado != null
        ? {
            ...promo,
            cuota_promo: aCentimos(
              (promo.precio_promo_financiado - inicial) / PLAZO_PROMOCION,
            ),
          }
        : promo,
  };
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
      monto: lote.inicial,
      mesIndice: 0,
      fecha: etiquetaMes(0, base),
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

/** Arma el lote con sus cuotas calculadas. `estado` viene de Supabase; sin él (JSON de respaldo) el lote se considera libre. */
export function aLote(l: LoteJson, estado?: EstadoLote): Lote {
  const inicial = l.inicial;
  const saldo = l.precio_lista - inicial; // = contado
  const fija = planParaPlazo(saldo, inicial, PARAMETROS.numero_cuotas, 0, PARAMETROS);
  const pj = l.promocion;
  return {
    lote: l.lote,
    mz: l.mz,
    lt: l.lt,
    metraje_m2: l.metraje_m2,
    ubicacion: l.ubicacion,
    tarifa_m2: l.tarifa_m2,
    precio_lista: pj?.precio_real ?? l.precio_lista + (PARAMETROS.recargo_lista ?? 0),
    precio_con_dscto: l.precio_lista,
    precio_contado: l.precio_contado,
    inicial,
    inicial_mes_1: inicial / 2,
    inicial_mes_2: inicial / 2,
    planes: { fija, ascendente: fija, descendente: fija },
    ...(estado && { estado }),
    promocion: pj
      ? {
          tipo: pj.tipo,
          precio_real: pj.precio_real,
          precio_promo_contado: aCentimos(pj.promo_contado),
          ...(pj.promo_financiado != null && {
            precio_promo_financiado: aCentimos(pj.promo_financiado),
            cuota_promo: aCentimos((pj.promo_financiado - inicial) / PLAZO_PROMOCION),
          }),
        }
      : undefined,
  };
}

/** «R10» → 10: orden natural de las manzanas. */
export const numeroDeManzana = (mz: string) => Number(mz.replace(/\D/g, "")) || 0;


/** Arenas solo tiene cuota fija (el Excel no define ascendente ni descendente). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function modalidadesDe(_lote: Lote) {
  return MODALIDADES.filter((m) => m.key === "fija");
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
