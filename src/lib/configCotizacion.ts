/**
 * Interruptores de las PRUEBAS de la cotización que se envía por WhatsApp.
 * Cada uno se revierte cambiando una sola línea. Detalle en docs/envio-cotizacion-whatsapp.md.
 */

/** Medidas posibles de cada una de las 2 imágenes (ancho × alto, en px). */
export const FORMATOS_FICHA = {
  /** Formato anterior: 4:5, casi cuadrado. */
  cuadrado: { ancho: 1080, alto: 1350 },
  /**
   * PRUEBA: más alto (≈ 5:8). Ahora que la lámina 1 lleva la franja del cliente y el aviso legal necesita
   * 1760 px para que los bloques respiren (con 1620 quedaban a ~13 px). WhatsApp reduce el lado mayor a
   * ~1600 px: la imagen se achica un 9 % al verla, sin perder legibilidad.
   */
  vertical: { ancho: 1080, alto: 1760 },
} as const;

export type FormatoFicha = keyof typeof FORMATOS_FICHA;

/** PRUEBA: formato de las imágenes. Para volver al anterior, poner "cuadrado". */
export const FORMATO_FICHA: FormatoFicha = "vertical";

/**
 * PRUEBA: al tocar "Enviar" se pide nombre y DNI del cliente en un pop-up y se imprimen en las
 * imágenes. Con `false` vuelve el envío directo, sin pedir datos (y sin datos en la imagen).
 */
export const PEDIR_DATOS_CLIENTE = true;

/**
 * Si es `true`, el DNI se imprime parcialmente oculto (74••••21). Por defecto se muestra completo
 * porque la cotización va al propio cliente; ocultarlo reduce el riesgo si la imagen se reenvía.
 */
export const ENMASCARAR_DNI = false;

/**
 * PRUEBA: en escritorio no se abre el menú de compartir del sistema (exige tener WhatsApp instalado
 * y no siempre acepta varias imágenes). Se ofrece descargar las 2 imágenes o copiar cada una para
 * pegarla en WhatsApp Web. Con `true` vuelve el menú de compartir también en escritorio.
 */
export const COMPARTIR_EN_ESCRITORIO = false;

/**
 * Cantidades de cuotas que el asesor puede elegir en el cotizador. La regla es que el TOTAL NO CAMBIA
 * con el plazo (precio con dscto = contado + inicial): solo se divide en más o menos cuotas. Cámbialo
 * según las reglas de tu producto.
 */
export const PLAZOS_CUOTAS = [12, 24, 36, 48, 60, 80] as const;
