import { notFound } from "next/navigation";
import {
  buscarLotePorId,
  conPlazo,
  INICIAL_MODOS,
  LOTES,
  type InicialModo,
} from "@/lib/altosDeSacta";
import {
  FORMATO_FICHA,
  FORMATOS_FICHA,
  type FormatoFicha,
} from "@/lib/configCotizacion";
import { FichaCara1, FichaCara2 } from "@/components/FichaCotizacion";

/**
 * Vista previa en pantalla de las dos imágenes de la cotización (solo desarrollo).
 *   /ficha                          → lote 5-1, inicial en 2 partes, formato configurado
 *   /ficha?lote=5-440&inicial=tres  → otro lote / forma de pago (completa | dos | tres)
 *   /ficha?zoom=1                   → tamaño real
 *   /ficha?formato=cuadrado         → compara con el formato anterior (cuadrado | vertical)
 *   /ficha?nombre=Ana%20Pérez&dni=74123456 → con otros datos del cliente
 *   /ficha?cuotas=36                → otra cantidad de cuotas (12, 24, 36, 48, 60, 80)
 *   /ficha?sinCliente=1             → sin la franja del cliente (como con PEDIR_DATOS_CLIENTE = false)
 * Por defecto muestra un cliente de ejemplo para poder ver la franja.
 * En producción la ruta no existe.
 */
export default async function VistaPreviaFicha({
  searchParams,
}: {
  searchParams: Promise<{
    lote?: string;
    inicial?: string;
    zoom?: string;
    formato?: string;
    nombre?: string;
    dni?: string;
    sinCliente?: string;
    cuotas?: string;
  }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const {
    lote: idLote,
    inicial,
    zoom,
    formato: f,
    nombre,
    dni,
    sinCliente,
    cuotas,
  } = await searchParams;
  const lote = conPlazo(
    (idLote && buscarLotePorId(idLote)) || LOTES[0],
    Number(cuotas) || 80,
  );
  const inicialModo = (INICIAL_MODOS.find((m) => m.key === inicial)?.key ??
    "dos") as InicialModo;
  const formato = (
    f && f in FORMATOS_FICHA ? f : FORMATO_FICHA
  ) as FormatoFicha;
  const { ancho, alto } = FORMATOS_FICHA[formato];
  const z = Math.min(1.5, Math.max(0.2, Number(zoom) || 0.6));
  const cliente = sinCliente
    ? null
    : nombre && dni
      ? { nombre, dni }
      : { nombre: "Juan Pérez Huamán", dni: "72849102" }; // ejemplo
  const emitida = new Date();

  return (
    <main className="px-4 py-8">
      <p className="mx-auto mb-6 max-w-[88rem] text-center text-sm text-[var(--text-muted)]">
        Vista previa de las 2 imágenes · lote <strong>{lote.lote}</strong> ·
        inicial <strong>{inicialModo}</strong> · formato{" "}
        <strong>{formato}</strong> · zoom {Math.round(z * 100)} % · cada imagen
        mide {ancho} × {alto} px
      </p>
      <div className="flex flex-wrap items-start justify-center gap-8">
        {[FichaCara1, FichaCara2].map((Cara, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl shadow-[0_12px_40px_rgba(20,22,28,0.18)]"
            style={{ width: ancho * z, height: alto * z }}
          >
            <div
              style={{
                width: ancho,
                height: alto,
                transform: `scale(${z})`,
                transformOrigin: "top left",
              }}
            >
              <Cara
                lote={lote}
                inicialModo={inicialModo}
                emitida={emitida}
                cliente={cliente}
                formato={formato}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
