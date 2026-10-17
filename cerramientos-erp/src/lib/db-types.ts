// Todos los montos se guardan en centavos (enteros) para no arrastrar
// errores de redondeo de punto flotante al sumar.

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
};

export type JobStatus = "presupuestado" | "en_curso" | "terminado" | "cancelado";

/** Una obra / trabajo: lo que se le vende a un cliente. */
export type Job = Imported & {
  id: string;
  clientName: string;
  clientPhone: string;
  address: string;
  description: string;
  status: JobStatus;
  /** Precio total pactado con el cliente. */
  priceCents: number;
  /** "YYYY-MM-DD" */
  startDate: string | null;
  endDate: string | null;
  notes: string;
  createdAt: string;
};

export type PaymentMethod = "efectivo" | "transferencia" | "cheque" | "tarjeta" | "otro";

export type JobPaymentType = "sena" | "pago" | "saldo";

/** Un cobro a un cliente (seña, pago parcial o saldo final). */
export type JobPayment = Imported & {
  id: string;
  jobId: string;
  date: string;
  type: JobPaymentType;
  amountCents: number;
  method: PaymentMethod;
  notes: string;
  createdAt: string;
};

/**
 * Un gasto del negocio. Si tiene `jobId`, es un gasto de esa obra (por
 * ejemplo el aluminio o el vidrio de ese trabajo) y cuenta para su
 * rentabilidad; si no, es un gasto general (alquiler, luz, combustible...).
 */
export type Expense = Imported & {
  id: string;
  date: string;
  category: string;
  description: string;
  amountCents: number;
  method: PaymentMethod;
  jobId: string | null;
  createdAt: string;
};

export type PayFrequency = "mensual" | "quincenal" | "semanal" | "por_dia" | "por_obra";

export type Employee = Imported & {
  id: string;
  name: string;
  role: string;
  phone: string;
  payFrequency: PayFrequency;
  /** Sueldo / jornal de referencia, solo informativo. */
  baseAmountCents: number;
  active: boolean;
  notes: string;
  createdAt: string;
};

export type EmployeePaymentType =
  | "sueldo"
  | "adelanto"
  | "aguinaldo"
  | "cargas_sociales"
  | "bono"
  | "otro";

/** Plata que salió para un empleado. Cuenta como "gasto de empleados". */
export type EmployeePayment = Imported & {
  id: string;
  employeeId: string;
  date: string;
  type: EmployeePaymentType;
  amountCents: number;
  method: PaymentMethod;
  /** Si el pago corresponde a una obra puntual, suma a su mano de obra. */
  jobId: string | null;
  notes: string;
  createdAt: string;
};

/** Plata que el dueño saca del negocio para él. No es un gasto del negocio. */
export type OwnerWithdrawal = Imported & {
  id: string;
  date: string;
  amountCents: number;
  method: PaymentMethod;
  notes: string;
  createdAt: string;
};

export type ImportBatch = {
  id: string;
  kind: string;
  fileName: string;
  /** Cuántos registros principales se crearon (obras, cobros, gastos...). */
  count: number;
  createdAt: string;
};

/**
 * Los registros que vienen de una planilla guardan de qué importación
 * salieron, para poder deshacerla entera si algo quedó mal.
 */
type Imported = { importBatchId?: string };

export type Settings = {
  businessName: string;
  ownerName: string;
  /** Categorías disponibles al cargar un gasto. */
  expenseCategories: string[];
};

export type DbShape = {
  users: User[];
  jobs: Job[];
  jobPayments: JobPayment[];
  expenses: Expense[];
  employees: Employee[];
  employeePayments: EmployeePayment[];
  ownerWithdrawals: OwnerWithdrawal[];
  importBatches: ImportBatch[];
  settings: Settings;
};
