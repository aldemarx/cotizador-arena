import { COMPARTIR_EN_ESCRITORIO } from "@/lib/configCotizacion";

/** Piezas comunes para convertir las fichas en PNG y entregarlas (cotización y cuentas de pago). */

let cacheFuentes: Promise<string> | null = null;

/**
 * CSS de las fuentes de la página, con los archivos ya incrustados como data URL, para que el PNG
 * conserve la tipografía. Se arma aquí en lugar de dejar que la librería recorra todas las hojas de
 * estilo: si hay una hoja de otro origen (p. ej. la que inyecta una extensión del navegador), leer
 * sus reglas lanza SecurityError y Next lo muestra como un error en pantalla.
 */
export function cssDeFuentes(): Promise<string> {
  cacheFuentes ??= (async () => {
    const reglas: CSSFontFaceRule[] = [];
    for (const hoja of Array.from(document.styleSheets)) {
      let lista: CSSRuleList;
      try {
        lista = hoja.cssRules;
      } catch {
        continue; // hoja de otro origen: no se puede leer y tampoco hace falta
      }
      for (const regla of Array.from(lista)) {
        if (regla instanceof CSSFontFaceRule) reglas.push(regla);
      }
    }
    const partes = await Promise.all(
      reglas.map(async (regla) => {
        let css = regla.cssText;
        const base = regla.parentStyleSheet?.href ?? location.href;
        for (const m of css.matchAll(/url\((["']?)([^"')]+)\1\)/g)) {
          if (m[2].startsWith("data:")) continue;
          try {
            const respuesta = await fetch(new URL(m[2], base).href);
            const blob = await respuesta.blob();
            const dataUrl = await new Promise<string>((listo, falla) => {
              const lector = new FileReader();
              lector.onload = () => listo(String(lector.result));
              lector.onerror = () => falla(lector.error);
              lector.readAsDataURL(blob);
            });
            css = css.replace(m[0], `url(${dataUrl})`);
          } catch {
            /* si una fuente no se puede leer, el PNG usa la tipografía de respaldo */
          }
        }
        return css;
      }),
    );
    return partes.join("\n");
  })();
  return cacheFuentes;
}

/**
 * Escritorio = ni teléfono ni tableta. Allí el menú de compartir del sistema exige tener WhatsApp
 * instalado y no siempre admite varias imágenes, así que se ofrece descargar o copiar.
 */
export function esEscritorio(): boolean {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return false;
  // iPadOS se presenta como un Mac con pantalla táctil.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return false;
  return true;
}

export const sinMenuDeCompartir = () =>
  esEscritorio() && !COMPARTIR_EN_ESCRITORIO;

export function invalidarCacheFuentes() {
  cacheFuentes = null;
}
