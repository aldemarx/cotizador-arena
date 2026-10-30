/** Tarjeta con cabecera de color (icono + título): la usan el cotizador de lotes y el de la membresía del club. */
export function TarjetaInfo({
  color,
  fondo,
  titulo,
  icono,
  acciones,
  children,
}: {
  color: string;
  fondo?: string;
  titulo: React.ReactNode;
  icono: React.ReactNode;
  /** Algo a la derecha del título (por ejemplo la etiqueta de promoción). */
  acciones?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card rounded-xl p-0">
      <div
        className="flex items-center gap-3 rounded-t-[11px] py-3 pr-8 pl-8"
        style={{ backgroundColor: fondo ?? `${color}26` }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
          style={{ backgroundColor: color }}
        >
          {icono}
        </div>
        <h2
          className="ml-1.5 text-sm font-bold sm:text-base lg:text-[17px]"
          style={{ color: color }}
        >
          {titulo}
        </h2>
        {acciones && <div className="-mr-3 ml-auto shrink-0">{acciones}</div>}
      </div>
      <div className="flex flex-col gap-0.5 px-4 py-1.5">{children}</div>
    </div>
  );
}
