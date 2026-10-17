import type { DbShape, Employee, Job } from "@/lib/db-types";
import {
  guessEmployeePaymentType,
  guessJobStatus,
  guessPaymentMethod,
  normalizeText,
  type ImportKind,
  type ParsedRow,
} from "@/lib/import";

export type ImportSummary = {
  /** Registros principales creados (los que se cuentan en la importación). */
  created: number;
  jobsCreated: number;
  employeesCreated: number;
  categoriesAdded: string[];
  /** Gastos/pagos cuya obra no se encontró y quedaron como generales. */
  unmatchedJobs: number;
};

type Context = { batchId: string; now: string };

function str(v: string | number | null | undefined): string {
  return v === null || v === undefined ? "" : String(v);
}

function num(v: string | number | null | undefined): number {
  return typeof v === "number" ? v : 0;
}

/** La obra más reciente de un cliente con ese nombre (sin importar acentos o mayúsculas). */
function findJob(db: DbShape, clientName: string): Job | undefined {
  const key = normalizeText(clientName);
  return db.jobs
    .filter((j) => normalizeText(j.clientName) === key)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/**
 * Guarda en `db` las filas válidas de una planilla ya interpretada. Las
 * filas con error o vacías se ignoran (la vista previa ya se las mostró al
 * usuario). Todo lo creado queda marcado con `batchId` para poder deshacerlo.
 */
export function applyImport(db: DbShape, kind: ImportKind, rows: ParsedRow[], ctx: Context): ImportSummary {
  const summary: ImportSummary = {
    created: 0,
    jobsCreated: 0,
    employeesCreated: 0,
    categoriesAdded: [],
    unmatchedJobs: 0,
  };
  const valid = rows.filter((r) => !r.skipped && !r.error).map((r) => r.values);
  const base = { importBatchId: ctx.batchId, createdAt: ctx.now };
  const id = () => crypto.randomUUID();

  const newJob = (fields: Partial<Job> & { clientName: string }): Job => {
    const job: Job = {
      id: id(),
      clientPhone: "",
      address: "",
      description: "Importado de planilla",
      status: "terminado",
      priceCents: 0,
      startDate: null,
      endDate: null,
      notes: "",
      ...base,
      ...fields,
    };
    db.jobs.push(job);
    return job;
  };

  const jobIdFor = (clientName: string): string | null => {
    if (!clientName) return null;
    const job = findJob(db, clientName);
    if (!job) summary.unmatchedJobs++;
    return job?.id ?? null;
  };

  switch (kind) {
    case "obras":
      for (const v of valid) {
        const job = newJob({
          clientName: str(v.clientName),
          description: str(v.description) || "(sin detalle)",
          status: guessJobStatus(str(v.status)),
          priceCents: num(v.price),
          startDate: str(v.startDate) || null,
          endDate: str(v.endDate) || null,
          address: str(v.address),
          clientPhone: str(v.clientPhone),
          notes: str(v.notes),
        });
        summary.created++;
        if (num(v.collected) > 0) {
          db.jobPayments.push({
            id: id(),
            jobId: job.id,
            date: str(v.endDate) || str(v.startDate),
            type: "pago",
            amountCents: num(v.collected),
            method: "efectivo",
            notes: "Cobrado según planilla",
            ...base,
          });
        }
      }
      break;

    case "cobros": {
      const autoCreated = new Set<string>();
      for (const v of valid) {
        const clientName = str(v.clientName);
        let job = findJob(db, clientName);
        if (!job) {
          // Obra vieja que no está cargada: se crea terminada y con precio
          // igual a lo cobrado, para que no figure como deuda.
          job = newJob({ clientName });
          autoCreated.add(job.id);
          summary.jobsCreated++;
        }
        if (autoCreated.has(job.id)) job.priceCents += num(v.amount);
        db.jobPayments.push({
          id: id(),
          jobId: job.id,
          date: str(v.date),
          type: "pago",
          amountCents: num(v.amount),
          method: guessPaymentMethod(str(v.method)),
          notes: str(v.notes),
          ...base,
        });
        summary.created++;
      }
      break;
    }

    case "gastos": {
      const categoryByKey = new Map(db.settings.expenseCategories.map((c) => [normalizeText(c), c]));
      const categoryFor = (raw: string): string => {
        const name = raw || "Otros";
        const existing = categoryByKey.get(normalizeText(name));
        if (existing) return existing;
        db.settings.expenseCategories.push(name);
        categoryByKey.set(normalizeText(name), name);
        summary.categoriesAdded.push(name);
        return name;
      };
      for (const v of valid) {
        db.expenses.push({
          id: id(),
          date: str(v.date),
          category: categoryFor(str(v.category)),
          description: str(v.description),
          amountCents: num(v.amount),
          method: guessPaymentMethod(str(v.method)),
          jobId: jobIdFor(str(v.clientName)),
          ...base,
        });
        summary.created++;
      }
      break;
    }

    case "sueldos": {
      const employeeFor = (name: string): Employee => {
        const key = normalizeText(name);
        const existing = db.employees.find((e) => normalizeText(e.name) === key);
        if (existing) return existing;
        const employee: Employee = {
          id: id(),
          name,
          role: "",
          phone: "",
          payFrequency: "semanal",
          baseAmountCents: 0,
          active: true,
          notes: "Creado al importar una planilla",
          ...base,
        };
        db.employees.push(employee);
        summary.employeesCreated++;
        return employee;
      };
      for (const v of valid) {
        db.employeePayments.push({
          id: id(),
          employeeId: employeeFor(str(v.employeeName)).id,
          date: str(v.date),
          type: guessEmployeePaymentType(str(v.type)),
          amountCents: num(v.amount),
          method: guessPaymentMethod(str(v.method)),
          jobId: jobIdFor(str(v.clientName)),
          notes: str(v.notes),
          ...base,
        });
        summary.created++;
      }
      break;
    }

    case "retiros":
      for (const v of valid) {
        db.ownerWithdrawals.push({
          id: id(),
          date: str(v.date),
          amountCents: num(v.amount),
          method: guessPaymentMethod(str(v.method)),
          notes: str(v.notes),
          ...base,
        });
        summary.created++;
      }
      break;
  }

  return summary;
}

/** Borra todo lo que creó una importación. */
export function undoImport(db: DbShape, batchId: string): void {
  const removedJobs = new Set(db.jobs.filter((j) => j.importBatchId === batchId).map((j) => j.id));
  db.jobs = db.jobs.filter((j) => !removedJobs.has(j.id));
  db.jobPayments = db.jobPayments.filter((p) => p.importBatchId !== batchId && !removedJobs.has(p.jobId));
  db.expenses = db.expenses.filter((e) => e.importBatchId !== batchId);
  db.employeePayments = db.employeePayments.filter((p) => p.importBatchId !== batchId);
  db.ownerWithdrawals = db.ownerWithdrawals.filter((w) => w.importBatchId !== batchId);
  for (const e of db.expenses) if (e.jobId && removedJobs.has(e.jobId)) e.jobId = null;
  for (const p of db.employeePayments) if (p.jobId && removedJobs.has(p.jobId)) p.jobId = null;
  // Un empleado creado por la importación se conserva si después se le
  // cargaron pagos a mano.
  db.employees = db.employees.filter(
    (e) => e.importBatchId !== batchId || db.employeePayments.some((p) => p.employeeId === e.id),
  );
  db.importBatches = db.importBatches.filter((b) => b.id !== batchId);
}
