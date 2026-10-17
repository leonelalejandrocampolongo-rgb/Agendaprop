import type { DbShape, Job } from "@/lib/db-types";

/**
 * Cálculos de plata del negocio. Todo es "a caja": un ingreso cuenta el día
 * que se cobró (no el día que se vendió la obra) y un gasto el día que se
 * pagó. Así el resumen del mes refleja la plata que realmente entró y salió.
 *
 * Fechas siempre como "YYYY-MM-DD", que se pueden comparar como texto.
 */

export type Period = { from: string; to: string };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function monthPeriod(year: number, month: number): Period {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

export function yearPeriod(year: number): Period {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function inPeriod(date: string, period: Period): boolean {
  return date >= period.from && date <= period.to;
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export type PeriodSummary = {
  /** Lo que se cobró a clientes. */
  incomeCents: number;
  /** Gastos del negocio (materiales, alquiler, combustible...). */
  businessExpensesCents: number;
  /** Sueldos, adelantos, cargas sociales, etc. */
  employeeCostsCents: number;
  /** Ingresos - gastos - empleados: lo que ganó el negocio. */
  netProfitCents: number;
  /** Lo que el dueño ya se llevó. */
  withdrawalsCents: number;
  /** Ganancia neta - retiros: lo que queda en el negocio. */
  retainedCents: number;
  expensesByCategory: { category: string; totalCents: number }[];
  employeeCostsByEmployee: {
    employeeId: string;
    name: string;
    totalCents: number;
  }[];
};

export function summarizePeriod(db: DbShape, period: Period): PeriodSummary {
  const payments = db.jobPayments.filter((p) => inPeriod(p.date, period));
  const expenses = db.expenses.filter((e) => inPeriod(e.date, period));
  const employeePayments = db.employeePayments.filter((p) =>
    inPeriod(p.date, period),
  );
  const withdrawals = db.ownerWithdrawals.filter((w) =>
    inPeriod(w.date, period),
  );

  const incomeCents = sum(payments.map((p) => p.amountCents));
  const businessExpensesCents = sum(expenses.map((e) => e.amountCents));
  const employeeCostsCents = sum(employeePayments.map((p) => p.amountCents));
  const withdrawalsCents = sum(withdrawals.map((w) => w.amountCents));
  const netProfitCents =
    incomeCents - businessExpensesCents - employeeCostsCents;

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amountCents);
  }

  const byEmployee = new Map<string, number>();
  for (const p of employeePayments) {
    byEmployee.set(p.employeeId, (byEmployee.get(p.employeeId) ?? 0) + p.amountCents);
  }

  return {
    incomeCents,
    businessExpensesCents,
    employeeCostsCents,
    netProfitCents,
    withdrawalsCents,
    retainedCents: netProfitCents - withdrawalsCents,
    expensesByCategory: [...byCategory.entries()]
      .map(([category, totalCents]) => ({ category, totalCents }))
      .sort((a, b) => b.totalCents - a.totalCents),
    employeeCostsByEmployee: [...byEmployee.entries()]
      .map(([employeeId, totalCents]) => ({
        employeeId,
        name:
          db.employees.find((e) => e.id === employeeId)?.name ??
          "(empleado borrado)",
        totalCents,
      }))
      .sort((a, b) => b.totalCents - a.totalCents),
  };
}

/** Resumen de cada mes del año, para la tabla/gráfico anual. */
export function monthlySummaries(db: DbShape, year: number): PeriodSummary[] {
  return Array.from({ length: 12 }, (_, i) =>
    summarizePeriod(db, monthPeriod(year, i + 1)),
  );
}

/**
 * Plata que debería haber en el negocio desde que se empezó a usar la app:
 * todo lo cobrado menos todo lo gastado, pagado a empleados y retirado.
 */
export function estimatedCashCents(db: DbShape): number {
  return (
    sum(db.jobPayments.map((p) => p.amountCents)) -
    sum(db.expenses.map((e) => e.amountCents)) -
    sum(db.employeePayments.map((p) => p.amountCents)) -
    sum(db.ownerWithdrawals.map((w) => w.amountCents))
  );
}

export type JobFinancials = {
  priceCents: number;
  collectedCents: number;
  /** Lo que el cliente todavía debe (solo obras en curso o terminadas). */
  pendingCents: number;
  materialsCents: number;
  laborCents: number;
  /** Ganancia de la obra: precio - materiales - mano de obra. */
  profitCents: number;
  /** Ganancia / precio, en %. null si no hay precio. */
  marginPct: number | null;
};

export function jobFinancials(db: DbShape, job: Job): JobFinancials {
  const collectedCents = sum(
    db.jobPayments.filter((p) => p.jobId === job.id).map((p) => p.amountCents),
  );
  const materialsCents = sum(
    db.expenses.filter((e) => e.jobId === job.id).map((e) => e.amountCents),
  );
  const laborCents = sum(
    db.employeePayments
      .filter((p) => p.jobId === job.id)
      .map((p) => p.amountCents),
  );

  const owes = job.status === "en_curso" || job.status === "terminado";
  // Una obra cancelada no va a cobrar el precio completo: lo que se gana (o
  // se pierde) es lo que se llegó a cobrar menos lo que ya se gastó.
  const revenue = job.status === "cancelado" ? collectedCents : job.priceCents;
  const profitCents = revenue - materialsCents - laborCents;

  return {
    priceCents: job.priceCents,
    collectedCents,
    pendingCents: owes ? Math.max(0, job.priceCents - collectedCents) : 0,
    materialsCents,
    laborCents,
    profitCents,
    marginPct: revenue > 0 ? Math.round((profitCents / revenue) * 1000) / 10 : null,
  };
}

/** Total que deben todos los clientes (cuentas por cobrar). */
export function totalReceivableCents(db: DbShape): number {
  return sum(db.jobs.map((j) => jobFinancials(db, j).pendingCents));
}
