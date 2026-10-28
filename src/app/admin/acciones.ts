"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { ETIQUETA_LOTES } from "@/lib/lotesSupabase";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { requerirAdmin } from "@/lib/admin/acceso";
import type { EstadoLote } from "@/lib/arenas";

export type ResultadoForm = { error?: string } | null;

const ESTADOS: EstadoLote[] = ["libre", "bloqueado", "vendido"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Inicio de sesión con correo y contraseña. El mensaje de error es genérico a propósito. */
export async function iniciarSesion(
  _previo: ResultadoForm,
  formData: FormData,
): Promise<ResultadoForm> {
  const correo = String(formData.get("correo") ?? "").trim();
  const clave = String(formData.get("clave") ?? "");
  if (!correo || !clave) return { error: "Escribe tu correo y tu contraseña." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: clave,
  });
  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect("/admin");
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/**
 * Primera vez: genera el código QR para enlazar la app de códigos (Google/Microsoft Authenticator).
 * Antes borra los intentos anteriores que nunca se verificaron.
 */
export async function iniciarActivacionMfa(): Promise<
  { error: string } | { factorId: string; qr: string; secreto: string }
> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: factores } = await supabase.auth.mfa.listFactors();
  for (const f of factores?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Panel CEINYS",
  });
  if (error || !data)
    return { error: "No se pudo generar el código QR. Intenta de nuevo." };
  return {
    factorId: data.id,
    qr: data.totp.qr_code,
    secreto: data.totp.secret,
  };
}

/** Comprueba el código de 6 dígitos y eleva la sesión al nivel con segundo factor. */
export async function verificarCodigo(
  factorId: string,
  codigo: string,
): Promise<{ error: string }> {
  const limpio = codigo.replace(/\s/g, "");
  if (!/^\d{6}$/.test(limpio)) return { error: "El código tiene 6 dígitos." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: limpio,
  });
  if (error)
    return { error: "Código incorrecto o vencido. Prueba con el siguiente." };
  redirect("/admin");
}

/**
 * Cambia el estado de un lote. Se hace con la sesión de la persona: la base solo lo permite a un
 * administrador con segundo factor, y registra quién lo hizo en el historial.
 */
export async function cambiarEstado(
  loteId: string,
  estado: EstadoLote,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requerirAdmin();
  if (!UUID.test(loteId) || !ESTADOS.includes(estado))
    return { ok: false, error: "Datos no válidos." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("lotes")
    .update({ estado })
    .eq("id", loteId)
    .select("id");
  if (error || !data?.length)
    return { ok: false, error: "No se pudo guardar el cambio." };

  updateTag(ETIQUETA_LOTES);
  // El simulador se regenera ya, sin esperar sus 30 segundos.
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Bloquea o desbloquea un lote por gerencia. No toca su estado ni su precio: solo la marca
 * `bloqueo_gerencia` (migración 0007). El asesor lo ve como «Reservado» y no puede cotizarlo. Se hace
 * con la sesión de la persona: la base solo lo permite a un administrador con segundo factor.
 */
export async function cambiarBloqueoGerencia(
  loteId: string,
  bloqueado: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requerirAdmin();
  if (!UUID.test(loteId) || typeof bloqueado !== "boolean")
    return { ok: false, error: "Datos no válidos." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("lotes")
    .update({ bloqueo_gerencia: bloqueado })
    .eq("id", loteId)
    .select("id");
  if (error || !data?.length)
    return { ok: false, error: "No se pudo guardar el cambio." };

  updateTag(ETIQUETA_LOTES);
  revalidatePath("/");
  revalidatePath("/mapa");
  revalidatePath("/admin");
  revalidatePath("/admin/mapa");
  return { ok: true };
}
