export type Cuenta = {
  moneda: "SOLES" | "DÓLARES";
  numero: string;
  cci: string;
};
export type Banco = {
  nombre: string;
  logo: string;
  alto: string;
  color: string;
  cuentas: Cuenta[];
};

export const TITULAR = "Constructora y Urbanizadora Las Pampas S.A.C.";

export const BANCOS: Banco[] = [
  {
    nombre: "BanBif",
    logo: "/images/banbif.svg",
    alto: "h-8",
    color: "#20a6ff",
    cuentas: [
      { moneda: "SOLES", numero: "7000763736", cci: "038-710-107000763736-08" },
    ],
  },
  {
    nombre: "Interbank",
    logo: "/images/interbank.png",
    alto: "h-7",
    color: "#00a651",
    cuentas: [
      {
        moneda: "SOLES",
        numero: "400-3005850188",
        cci: "003-400-003005850188-90",
      },
      // Cuenta en dólares: oculta por ahora (descomentar para volver a mostrarla).
      // {
      //   moneda: "DÓLARES",
      //   numero: "400-3005850195",
      //   cci: "003-400-003005850195-95",
      // },
    ],
  },
];

export const COLOR_MONEDA: Record<Cuenta["moneda"], string> = {
  SOLES: "#10b981",
  DÓLARES: "#3b82f6",
};
