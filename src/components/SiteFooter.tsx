const REDES = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/ceinys.inmobiliaria/",
    icono: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
      </>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/ceinys.inmobiliaria",
    icono: (
      <path d="M15 3h-2a3.5 3.5 0 00-3.5 3.5V9H7v3h2.5v9h3v-9H15l.5-3h-3V7a1 1 0 011-1H15V3z" strokeLinejoin="round" />
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@ceinysinmobiliaria",
    icono: (
      <>
        <path d="M14 3v11a3 3 0 11-3-3" />
        <path d="M14 3c.5 2.2 2.3 4 4.5 4.3" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/ceinys-inmobiliaria/?originalSubdomain=pe",
    icono: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 10v7M7 7v.5M11 17v-4a2.5 2.5 0 015 0v4M11 17v-7" strokeLinecap="round" />
      </>
    ),
  },
];

const linkCls = "text-white/70 transition-colors hover:text-white";

export function SiteFooter() {
  return (
    <footer className="bg-[#1B1D22] px-4 py-10 text-sm text-white/70 lg:px-6">
      <div className="mx-auto flex max-w-[88rem] flex-col gap-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logoCeinys2.png" alt="CEINYS" className="mb-4 block h-9 w-auto brightness-0 invert" />
            <p className="font-medium text-white/80">CEINYS — Constructora e Inmobiliaria</p>
            <p className="mt-1 font-mono text-[13px] text-white/55">RUC 20611776391</p>
          </div>

          <div className="flex flex-col gap-4 md:items-end">
            <p className="flex flex-wrap gap-x-5 gap-y-1">
              <a href="mailto:contacto@ceinys.pe" className={linkCls}>
                contacto@ceinys.pe
              </a>
              <a href="tel:+51960203135" className={linkCls}>
                +51 960 203 135
              </a>
            </p>
            <div className="flex gap-2.5">
              {REDES.map((r) => (
                <a
                  key={r.label}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={r.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                    {r.icono}
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        <p className="border-t border-white/10 pt-6 text-xs text-white/50">
          © 2026 CEINYS — Constructora e Inmobiliaria. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
