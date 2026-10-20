export const REDES = [
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
      <path
        d="M15 3h-2a3.5 3.5 0 00-3.5 3.5V9H7v3h2.5v9h3v-9H15l.5-3h-3V7a1 1 0 011-1H15V3z"
        strokeLinejoin="round"
      />
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
        <path
          d="M7 10v7M7 7v.5M11 17v-4a2.5 2.5 0 015 0v4M11 17v-7"
          strokeLinecap="round"
        />
      </>
    ),
  },
];

export function RedesSociales() {
  return (
    <div className="flex items-center justify-center gap-3">
      {REDES.map((r) => (
        <a
          key={r.label}
          href={r.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={r.label}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ceinys-grafito-100)] text-[var(--ceinys-grafito-700)] transition-colors duration-150 hover:bg-[var(--ceinys-grafito-700)] hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="h-4 w-4"
          >
            {r.icono}
          </svg>
        </a>
      ))}
    </div>
  );
}
