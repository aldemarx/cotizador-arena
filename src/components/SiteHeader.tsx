/** Barra superior fija (56 px): enmarca la pantalla como plataforma oficial de CEINYS. */
export function SiteHeader() {
  return (
    <header
      id="barra-superior"
      className="fixed inset-x-0 top-0 z-30 h-[var(--barra-h)] border-b border-[var(--ceinys-grafito-200)] bg-white"
    >
      <div className="mx-auto grid h-full w-full max-w-[88rem] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3 justify-self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-ceinys-horizontal.png"
            alt="CEINYS Constructora e Inmobiliaria"
            className="block h-[calc(var(--barra-h)*0.5)] w-auto -translate-y-[3px]"
          />
        </div>

        <p className="m-0 hidden items-center gap-3 text-[length:clamp(0.625rem,0.55vw,0.75rem)] font-semibold tracking-[0.18em] whitespace-nowrap text-[var(--text-muted)] uppercase sm:flex">
          Plataforma Comercial
          <span
            aria-hidden
            className="h-4 w-px bg-[var(--ceinys-grafito-300)]"
          />
          <span className="text-[var(--text-primary)]">Arenas del Valle</span>
        </p>

        <p className="m-0 flex items-center gap-2 justify-self-end text-[length:clamp(0.6875rem,0.6vw,0.8125rem)] font-medium tracking-wide whitespace-nowrap text-[var(--text-secondary)] col-start-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10b981] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10b981]" />
          </span>
          Sistema en vivo
        </p>
      </div>
    </header>
  );
}
