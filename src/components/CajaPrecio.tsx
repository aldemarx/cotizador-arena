/** Caja de precio centrada: gris con la cifra tachada (precio de lista) o verde con la cifra en negrita (con descuento). */
export function CajaPrecio({
  etiqueta,
  tachado = false,
  destacado = false,
  azul = false,
  grande = false,
  medio = false,
  children,
}: {
  etiqueta: string;
  tachado?: boolean;
  destacado?: boolean;
  /** Variante azul (la del color de la tarjeta «Datos del lote»). */
  azul?: boolean;
  /** Caja blanca con la etiqueta en gris y letra mayor (Metraje y Ubicación). */
  grande?: boolean;
  /** Mismos colores que la caja normal, pero más alta y con la cifra mayor (los precios). */
  medio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border px-2 text-center ${
        grande
          ? "min-h-[6rem] gap-2 py-3.5 sm:min-h-[7rem] sm:py-4"
          : medio
            ? "gap-1.5 py-3 sm:gap-2 sm:py-5"
            : "gap-1.5 py-3 sm:py-4"
      } ${
        destacado
          ? "border-[#5f9b3c]/35 bg-[#5f9b3c]/10"
          : azul
            ? "border-[#2b7de0]/35 bg-[#2b7de0]/10"
            : grande
              ? "border-[var(--border)] bg-white"
              : "border-[var(--border)] bg-[var(--surface-2)]"
      }`}
    >
      <span
        className={`rounded-full px-2.5 py-0.5 font-bold tracking-[0.04em] whitespace-nowrap uppercase sm:tracking-[0.12em] ${
          grande ? "text-[10px] sm:text-xs" : medio ? "text-xs sm:text-sm" : "text-[10px] sm:text-xs"
        } ${
          destacado
            ? "bg-[#5f9b3c]/15 text-[#4c8030]"
            : azul
              ? "bg-[#2b7de0]/15 text-[#2468bd]"
              : grande
                ? "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]"
                : "bg-[var(--ceinys-grafito-100)] text-[var(--text-secondary)]"
        }`}
      >
        {etiqueta}
      </span>
      <span
        className={`[font-variant-numeric:tabular-nums] ${
          grande
            ? "text-xl sm:text-[28px] sm:leading-none"
            : medio
              ? "text-[26px] leading-none sm:text-[34px]"
              : "text-base sm:text-2xl"
        } ${
          tachado
            ? "font-medium text-[var(--text-muted)] line-through"
            : "font-extrabold text-[var(--text-primary)]"
        }`}
      >
        {children}
      </span>
    </div>
  );
}
