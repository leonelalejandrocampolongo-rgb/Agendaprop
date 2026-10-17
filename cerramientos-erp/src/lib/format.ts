import type {
  EmployeePaymentType,
  JobPaymentType,
  JobStatus,
  PayFrequency,
  PaymentMethod,
} from "@/lib/db-types";

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Convierte lo que se escribe en un input de plata a centavos. Acepta
 * "150000", "150.000", "150.000,50" y "150000.50". Devuelve null si no es
 * un número válido.
 */
export function parseMoneyToCents(raw: string): number | null {
  let s = raw.trim().replace(/[$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    // Formato argentino: los puntos son miles y la coma son decimales.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "150.000" sin decimales: los puntos son separadores de miles.
    s = s.replace(/\./g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY". */
export function formatDate(date: string | null): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/** Fecha de hoy en Argentina, como "YYYY-MM-DD". */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  presupuestado: "Presupuestado",
  en_curso: "En curso",
  terminado: "Terminado",
  cancelado: "Cancelado",
};

export const JOB_PAYMENT_TYPE_LABELS: Record<JobPaymentType, string> = {
  sena: "Seña",
  pago: "Pago parcial",
  saldo: "Saldo final",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  cheque: "Cheque",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  mensual: "Mensual",
  quincenal: "Quincenal",
  semanal: "Semanal",
  por_dia: "Por día",
  por_obra: "Por obra",
};

export const EMPLOYEE_PAYMENT_TYPE_LABELS: Record<EmployeePaymentType, string> = {
  sueldo: "Sueldo / jornal",
  adelanto: "Adelanto",
  aguinaldo: "Aguinaldo",
  cargas_sociales: "Cargas sociales / ART",
  bono: "Bono / extra",
  otro: "Otro",
};
