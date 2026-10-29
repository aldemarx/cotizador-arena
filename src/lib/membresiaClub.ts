/**
 * Membresía del Club Carhuaz (Excel «CRONOGRMA CLUB.xlsx»): la membresía básica cuesta S/ 4,900 y su precio baja por tandas de clientes (de 30 en 30,
 * del 70 % al 30 % de descuento). El fraccionado es una inicial del 20 % y el saldo en 12 cuotas iguales, sin interés.
 * Es una cotización estática: no depende del lote.
 */

export const PRECIO_MEMBRESIA = 4900;
/** Inicial del fraccionado, sobre el precio con descuento. */
export const INICIAL_PORCENTAJE = 0.2;
export const CUOTAS_MEMBRESIA = 12;

export type TandaMembresia = {
  /** Descuento sobre el precio de S/ 4,900 (0.7 = 70 %). */
  descuento: number;
  /** A quiénes se aplica. */
  clientes: string;
};

export const TANDAS: TandaMembresia[] = [
  { descuento: 0.7, clientes: "Primeros 30 clientes" },
  { descuento: 0.6, clientes: "Siguientes 30 clientes" },
  { descuento: 0.5, clientes: "Siguientes 30 clientes" },
  { descuento: 0.4, clientes: "Siguientes 30 clientes" },
  { descuento: 0.3, clientes: "Resto de clientes" },
];

/** La tanda con la que el Excel calcula el fraccionado (30 % de descuento). */
export const TANDA_POR_DEFECTO = TANDAS.length - 1;

// Medio céntimo sube, como el Excel; la tolerancia evita que el ruido de coma flotante lo baje.
const aCentimos = (x: number) => Math.floor(x * 100 + 0.5 + 1e-7) / 100;

export type CotizacionMembresia = {
  regular: number;
  /** Precio al contado con el descuento de la tanda. */
  precio: number;
  ahorro: number;
  inicial: number;
  saldo: number;
  cuota: number;
};

export function cotizarMembresia(tanda: TandaMembresia): CotizacionMembresia {
  const precio = aCentimos(PRECIO_MEMBRESIA * (1 - tanda.descuento));
  const inicial = aCentimos(precio * INICIAL_PORCENTAJE);
  const saldo = aCentimos(precio - inicial);
  return {
    regular: PRECIO_MEMBRESIA,
    precio,
    ahorro: aCentimos(PRECIO_MEMBRESIA - precio),
    inicial,
    saldo,
    cuota: aCentimos(saldo / CUOTAS_MEMBRESIA),
  };
}
