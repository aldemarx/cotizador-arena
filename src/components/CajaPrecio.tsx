/** Caja de precio centrada: gris con la cifra tachada (precio de lista) o verde con la cifra en negrita (con descuento). */
export function CajaPrecio({
  etiqueta,
  tachado = false,
  destacado = false,
  children,
}: {
  etiqueta: string;
  tachado?: boolean;
  destacado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center sm:py-4 ${
        destacado
          ? "border-[#5f9b3c]/35 bg-[#5f9b3c]/10"
          : "border-[var(--border)] bg-[var(--surface-2)]"
      }`}
    >
      <span
        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.04em] whitespace-nowrap uppercase sm:text-xs sm:tracking-[0.12em] ${
          destacado
            ? "bg-[#5f9b3c]/15 text-[#4c8030]"
            : "bg-[var(--ceinys-grafito-100)] text-[var(--text-secondary)]"
        }`}
      >
        {etiqueta}
      </span>
      <span
        className={`text-base [font-variant-numeric:tabular-nums] sm:text-2xl ${
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
