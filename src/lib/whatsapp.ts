/** Enlaces para abrir el chat de WhatsApp del cliente con el mensaje ya escrito (sin API ni costo). */

/**
 * Celular con o sin código de país. 9 dígitos = número peruano (se agrega el 51, sin exigir que empiece con 9);
 * más de 9 dígitos = ya trae el código de su país (p. ej. 573001234567, 5491122334455).
 */
export const celularValido = (v: string) => /^\d{9,15}$/.test(v);

/** Solo dígitos (se ignoran espacios, guiones y el «+»), máximo 15. */
export const soloCelular = (v: string) => v.replace(/\D/g, "").slice(0, 15);

const CODIGO_PAIS = "51";

/** Mensaje precargado: saluda por el primer nombre y menciona el lote cotizado. */
export function mensajeCotizacion(
  nombreCompleto: string,
  mz: string,
  lt: number,
): string {
  const primero = nombreCompleto.trim().split(/\s+/)[0] ?? "";
  const saludo = primero ? `Hola ${primero}` : "Hola";
  return `${saludo}, te comparto tu cotización del lote MZ ${mz} · LOTE ${lt} de Arenas del Valle.`;
}

/** wa.me abre WhatsApp (app o web) en el chat de ese número. No puede adjuntar archivos. */
/** Número completo para WhatsApp: 9 dígitos son de Perú (51); si trae más, ya lleva su código de país. */
const conPais = (celular: string) =>
  celular.length === 9 ? `${CODIGO_PAIS}${celular}` : celular;

export function enlaceWaMe(celular: string, texto: string): string {
  return `https://wa.me/${conPais(celular)}?text=${encodeURIComponent(texto)}`;
}

/** WhatsApp Web directo en el chat del número (útil en escritorio). */
export function enlaceWhatsAppWeb(celular: string, texto: string): string {
  return `https://web.whatsapp.com/send?phone=${conPais(celular)}&text=${encodeURIComponent(texto)}`;
}
