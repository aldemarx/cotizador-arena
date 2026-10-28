"use server";

import { redirect } from "next/navigation";
import { requerirParaCambioDeClave } from "@/lib/admin/acceso";
import { crearClienteServicio } from "@/lib/supabase/servicio";

export type ResultadoClave = { error?: string } | null;

/** Cambio de contraseña obligatorio en el primer ingreso (o tras un restablecimiento). Mismas cuentas y mismas reglas que en Altos de Sacta. */
export async function cambiarClave(_previo: ResultadoClave, formData: FormData): Promise<ResultadoClave> {
  const { supabase, usuarioId } = await requerirParaCambioDeClave();

  const nueva = String(formData.get("nueva") ?? "");
  const repetir = String(formData.get("repetir") ?? "");
  if (nueva.length < 12) return { error: "La contraseña debe tener al menos 12 caracteres." };
  if (!/[A-Za-z]/.test(nueva) || !/\d/.test(nueva)) return { error: "Usa letras y números." };
  if (nueva !== repetir) return { error: "Las contraseñas no coinciden." };

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) {
    return {
      error: /same|different/i.test(error.message)
        ? "La nueva contraseña debe ser distinta de la temporal."
        : "No se pudo cambiar la contraseña. Intenta de nuevo.",
    };
  }

  // Quitar la marca solo se puede con la clave de servicio (nadie escribe `perfiles` desde la app).
  let sb;
  try {
    sb = crearClienteServicio();
  } catch {
    return { error: "El servidor no está configurado para guardar el cambio." };
  }
  await sb.from("perfiles").update({ debe_cambiar_clave: false }).eq("id", usuarioId);
  redirect("/admin");
}
