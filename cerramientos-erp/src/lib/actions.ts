"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { applyImport, undoImport, type ImportSummary } from "@/lib/import-apply";
import { isImportKind, parseRows } from "@/lib/import";
import { mutateDb, newId } from "@/lib/db";
import { parseMoneyToCents } from "@/lib/format";
import type {
  EmployeePaymentType,
  JobPaymentType,
  JobStatus,
  PayFrequency,
  PaymentMethod,
} from "@/lib/db-types";

/**
 * Todas las acciones devuelven `{ error }` en vez de tirar una excepción,
 * para que el formulario (ver ActionForm) pueda mostrar el mensaje: en
 * producción Next oculta el texto de los errores lanzados en el servidor.
 */
export type ActionResult = { error?: string; ok?: boolean } | null;

class InputError extends Error {}

const JOB_STATUSES: JobStatus[] = ["presupuestado", "en_curso", "terminado", "cancelado"];
const PAYMENT_METHODS: PaymentMethod[] = ["efectivo", "transferencia", "cheque", "tarjeta", "otro"];
const JOB_PAYMENT_TYPES: JobPaymentType[] = ["sena", "pago", "saldo"];
const PAY_FREQUENCIES: PayFrequency[] = ["mensual", "quincenal", "semanal", "por_dia", "por_obra"];
const EMPLOYEE_PAYMENT_TYPES: EmployeePaymentType[] = [
  "sueldo",
  "adelanto",
  "aguinaldo",
  "cargas_sociales",
  "bono",
  "otro",
];

function text(fd: FormData, name: string): string {
  const value = fd.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function requiredText(fd: FormData, name: string, label: string): string {
  const value = text(fd, name);
  if (!value) throw new InputError(`Falta completar: ${label}`);
  return value;
}

function money(fd: FormData, name: string, label: string, { allowZero = false } = {}): number {
  const cents = parseMoneyToCents(text(fd, name));
  if (cents === null || (!allowZero && cents <= 0)) {
    throw new InputError(`${label}: ingresá un monto válido`);
  }
  return cents;
}

function date(fd: FormData, name: string, label: string): string {
  const value = text(fd, name);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InputError(`${label}: ingresá una fecha válida`);
  }
  return value;
}

function optionalDate(fd: FormData, name: string, label: string): string | null {
  return text(fd, name) ? date(fd, name, label) : null;
}

function oneOf<T extends string>(fd: FormData, name: string, options: T[], fallback: T): T {
  const value = text(fd, name);
  return (options as string[]).includes(value) ? (value as T) : fallback;
}

function optionalId(fd: FormData, name: string): string | null {
  return text(fd, name) || null;
}

/**
 * Envuelve cada acción: verifica la sesión, convierte los errores de
 * validación en un mensaje para el formulario y refresca todas las páginas
 * (los totales del resumen dependen de casi todo).
 */
async function run(task: () => Promise<void>): Promise<ActionResult> {
  await requireUser();
  try {
    await task();
  } catch (err) {
    if (err instanceof InputError) return { error: err.message };
    throw err;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- Obras ----------

function jobFields(fd: FormData) {
  return {
    clientName: requiredText(fd, "clientName", "Cliente"),
    clientPhone: text(fd, "clientPhone"),
    address: text(fd, "address"),
    description: requiredText(fd, "description", "Descripción del trabajo"),
    status: oneOf(fd, "status", JOB_STATUSES, "presupuestado"),
    priceCents: money(fd, "price", "Precio", { allowZero: true }),
    startDate: optionalDate(fd, "startDate", "Fecha de inicio"),
    endDate: optionalDate(fd, "endDate", "Fecha de entrega"),
    notes: text(fd, "notes"),
  };
}

export async function createJob(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let jobId = "";
  const result = await run(async () => {
    const fields = jobFields(fd);
    jobId = newId();
    await mutateDb((db) => {
      db.jobs.push({ id: jobId, ...fields, createdAt: new Date().toISOString() });
    });
  });
  if (result?.ok) redirect(`/obras/${jobId}`);
  return result;
}

export async function updateJob(jobId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const fields = jobFields(fd);
    await mutateDb((db) => {
      const job = db.jobs.find((j) => j.id === jobId);
      if (!job) throw new InputError("La obra ya no existe");
      Object.assign(job, fields);
    });
  });
}

export async function deleteJob(jobId: string): Promise<ActionResult> {
  const result = await run(async () => {
    await mutateDb((db) => {
      db.jobs = db.jobs.filter((j) => j.id !== jobId);
      db.jobPayments = db.jobPayments.filter((p) => p.jobId !== jobId);
      // Los gastos y pagos a empleados siguen existiendo (la plata salió
      // igual), solo dejan de estar asociados a la obra.
      for (const e of db.expenses) if (e.jobId === jobId) e.jobId = null;
      for (const p of db.employeePayments) if (p.jobId === jobId) p.jobId = null;
    });
  });
  if (result?.ok) redirect("/obras");
  return result;
}

export async function addJobPayment(jobId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return saveJobPayment(jobId, fd);
}

/** Igual que addJobPayment, pero la obra se elige en el formulario (pantalla "Cargar"). */
export async function addJobPaymentPickingJob(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return saveJobPayment(text(fd, "jobId"), fd);
}

async function saveJobPayment(jobId: string, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    if (!jobId) throw new InputError("Elegí la obra");
    const payment = {
      id: newId(),
      jobId,
      date: date(fd, "date", "Fecha"),
      type: oneOf(fd, "type", JOB_PAYMENT_TYPES, "pago"),
      amountCents: money(fd, "amount", "Monto"),
      method: oneOf(fd, "method", PAYMENT_METHODS, "efectivo"),
      notes: text(fd, "notes"),
      createdAt: new Date().toISOString(),
    };
    await mutateDb((db) => {
      const job = db.jobs.find((j) => j.id === jobId);
      if (!job) throw new InputError("La obra ya no existe");
      db.jobPayments.push(payment);
      // Al cobrar la seña de un presupuesto, la obra pasa a estar en curso.
      if (job.status === "presupuestado") job.status = "en_curso";
    });
  });
}

export async function deleteJobPayment(paymentId: string): Promise<ActionResult> {
  return run(async () => {
    await mutateDb((db) => {
      db.jobPayments = db.jobPayments.filter((p) => p.id !== paymentId);
    });
  });
}

// ---------- Gastos ----------

export async function addExpense(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const expense = {
      id: newId(),
      date: date(fd, "date", "Fecha"),
      category: requiredText(fd, "category", "Categoría"),
      description: text(fd, "description"),
      amountCents: money(fd, "amount", "Monto"),
      method: oneOf(fd, "method", PAYMENT_METHODS, "efectivo"),
      jobId: optionalId(fd, "jobId"),
      createdAt: new Date().toISOString(),
    };
    await mutateDb((db) => {
      if (expense.jobId && !db.jobs.some((j) => j.id === expense.jobId)) {
        throw new InputError("La obra elegida ya no existe");
      }
      db.expenses.push(expense);
    });
  });
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  return run(async () => {
    await mutateDb((db) => {
      db.expenses = db.expenses.filter((e) => e.id !== expenseId);
    });
  });
}

// ---------- Empleados ----------

function employeeFields(fd: FormData) {
  return {
    name: requiredText(fd, "name", "Nombre"),
    role: text(fd, "role"),
    phone: text(fd, "phone"),
    payFrequency: oneOf(fd, "payFrequency", PAY_FREQUENCIES, "semanal"),
    baseAmountCents: money(fd, "baseAmount", "Sueldo de referencia", { allowZero: true }),
    active: fd.get("active") !== null,
    notes: text(fd, "notes"),
  };
}

export async function createEmployee(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const fields = employeeFields(fd);
    await mutateDb((db) => {
      db.employees.push({ id: newId(), ...fields, createdAt: new Date().toISOString() });
    });
  });
}

export async function updateEmployee(employeeId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const fields = employeeFields(fd);
    await mutateDb((db) => {
      const employee = db.employees.find((e) => e.id === employeeId);
      if (!employee) throw new InputError("El empleado ya no existe");
      Object.assign(employee, fields);
    });
  });
}

export async function deleteEmployee(employeeId: string): Promise<ActionResult> {
  const result = await run(async () => {
    await mutateDb((db) => {
      if (db.employeePayments.some((p) => p.employeeId === employeeId)) {
        // Borrarlo haría desaparecer sus pagos de los gastos de meses
        // pasados y cambiaría las ganancias ya calculadas.
        throw new InputError(
          "Este empleado tiene pagos registrados. En vez de borrarlo, desmarcá \"Trabaja actualmente\".",
        );
      }
      db.employees = db.employees.filter((e) => e.id !== employeeId);
    });
  });
  if (result?.ok) redirect("/empleados");
  return result;
}

export async function addEmployeePayment(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const payment = {
      id: newId(),
      employeeId: requiredText(fd, "employeeId", "Empleado"),
      date: date(fd, "date", "Fecha"),
      type: oneOf(fd, "type", EMPLOYEE_PAYMENT_TYPES, "sueldo"),
      amountCents: money(fd, "amount", "Monto"),
      method: oneOf(fd, "method", PAYMENT_METHODS, "efectivo"),
      jobId: optionalId(fd, "jobId"),
      notes: text(fd, "notes"),
      createdAt: new Date().toISOString(),
    };
    await mutateDb((db) => {
      if (!db.employees.some((e) => e.id === payment.employeeId)) {
        throw new InputError("El empleado elegido ya no existe");
      }
      if (payment.jobId && !db.jobs.some((j) => j.id === payment.jobId)) {
        throw new InputError("La obra elegida ya no existe");
      }
      db.employeePayments.push(payment);
    });
  });
}

export async function deleteEmployeePayment(paymentId: string): Promise<ActionResult> {
  return run(async () => {
    await mutateDb((db) => {
      db.employeePayments = db.employeePayments.filter((p) => p.id !== paymentId);
    });
  });
}

// ---------- Retiros del dueño ----------

export async function addWithdrawal(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const withdrawal = {
      id: newId(),
      date: date(fd, "date", "Fecha"),
      amountCents: money(fd, "amount", "Monto"),
      method: oneOf(fd, "method", PAYMENT_METHODS, "efectivo"),
      notes: text(fd, "notes"),
      createdAt: new Date().toISOString(),
    };
    await mutateDb((db) => {
      db.ownerWithdrawals.push(withdrawal);
    });
  });
}

export async function deleteWithdrawal(withdrawalId: string): Promise<ActionResult> {
  return run(async () => {
    await mutateDb((db) => {
      db.ownerWithdrawals = db.ownerWithdrawals.filter((w) => w.id !== withdrawalId);
    });
  });
}

// ---------- Configuración ----------

export async function updateSettings(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const categories = text(fd, "expenseCategories")
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
    if (categories.length === 0) {
      throw new InputError("Dejá al menos una categoría de gastos");
    }
    const settings = {
      businessName: requiredText(fd, "businessName", "Nombre del negocio"),
      ownerName: text(fd, "ownerName"),
      expenseCategories: [...new Set(categories)],
    };
    await mutateDb((db) => {
      db.settings = settings;
    });
  });
}

export async function changePassword(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  return run(async () => {
    const current = text(fd, "currentPassword");
    const next = text(fd, "newPassword");
    if (next.length < 8) {
      throw new InputError("La contraseña nueva tiene que tener al menos 8 caracteres");
    }
    if (next !== text(fd, "confirmPassword")) {
      throw new InputError("Las contraseñas nuevas no coinciden");
    }
    const passwordHash = await bcrypt.hash(next, 10);
    await mutateDb(async (db) => {
      const stored = db.users.find((u) => u.email === user.email);
      if (!stored || !(await bcrypt.compare(current, stored.passwordHash))) {
        throw new InputError("La contraseña actual no es correcta");
      }
      stored.passwordHash = passwordHash;
    });
  });
}

// ---------- Importar planillas ----------

const importPayload = z.object({
  kind: z.string().refine(isImportKind),
  fileName: z.string().max(300),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))).max(20000),
  mapping: z.record(z.string(), z.number().int().min(0).nullable()),
  firstSheetRow: z.number().int().min(1),
});

export type ImportResult = { error?: string; summary?: ImportSummary };

/**
 * Recibe las filas crudas de la planilla y el mapeo de columnas, y las
 * vuelve a interpretar acá (no se confía en lo que calculó el navegador).
 */
export async function importSpreadsheet(input: z.input<typeof importPayload>): Promise<ImportResult> {
  await requireUser();
  const parsed = importPayload.safeParse(input);
  if (!parsed.success) return { error: "La planilla no se pudo leer. Probá de nuevo." };
  const { fileName, rows, mapping, firstSheetRow } = parsed.data;
  const kind = parsed.data.kind as Parameters<typeof parseRows>[0];

  const parsedRows = parseRows(kind, rows, mapping, firstSheetRow);
  if (!parsedRows.some((r) => !r.skipped && !r.error)) {
    return { error: "No hay ninguna fila válida para importar." };
  }

  const batchId = newId();
  const now = new Date().toISOString();
  const summary = await mutateDb((db) => {
    const result = applyImport(db, kind, parsedRows, { batchId, now });
    db.importBatches.push({ id: batchId, kind, fileName, count: result.created, createdAt: now });
    return result;
  });
  revalidatePath("/", "layout");
  return { summary };
}

export async function undoImportBatch(batchId: string): Promise<ActionResult> {
  return run(async () => {
    await mutateDb((db) => {
      if (!db.importBatches.some((b) => b.id === batchId)) {
        throw new InputError("Esa importación ya se deshizo");
      }
      undoImport(db, batchId);
    });
  });
}
