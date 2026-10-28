/**
 * «Recordarme» del inicio de sesión de asesores.
 * Con la casilla marcada la sesión dura lo que dicen las cookies de Supabase (días). Sin marcar, la sesión es «de navegador»: las
 * cookies se escriben sin fecha de caducidad y se pierden al cerrar el navegador. Una cookie propia (`COOKIE_TEMPORAL`) recuerda la
 * elección para que también las renovaciones de sesión que hace el proxy sigan sin caducidad.
 */
export const COOKIE_TEMPORAL = "sesion-temporal";

type OpcionesCookie = {
  maxAge?: number;
  expires?: Date;
  [clave: string]: unknown;
};

/** Quita la caducidad a las cookies que se están escribiendo (no toca las que se borran, que llevan maxAge 0). */
export function opcionesSegunSesion<T extends OpcionesCookie>(
  opciones: T | undefined,
  temporal: boolean,
): T | undefined {
  if (!temporal || !opciones) return opciones;
  if (opciones.maxAge !== undefined && opciones.maxAge <= 0) return opciones;
  const { maxAge, expires, ...resto } = opciones;
  void maxAge;
  void expires;
  return resto as T;
}
