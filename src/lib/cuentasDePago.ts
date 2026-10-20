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

export const TITULAR = "Nombre de la Empresa S.A.C.";

export const BANCOS: Banco[] = [
  {
    nombre: "BanBif",
    logo: "/images/banbif.svg",
    alto: "h-8",
    color: "#20a6ff",
    cuentas: [
      { moneda: "SOLES", numero: "0000000000", cci: "038-710-100000000000-08" },
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
        numero: "000-0000000000",
        cci: "000-000-000000000000-00",
      },
    ],
  },
];

export const COLOR_MONEDA: Record<Cuenta["moneda"], string> = {
  SOLES: "#10b981",
  DÓLARES: "#3b82f6",
};
