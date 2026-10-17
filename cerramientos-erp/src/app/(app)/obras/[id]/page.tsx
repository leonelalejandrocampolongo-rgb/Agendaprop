import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { jobFinancials } from "@/lib/finance";
import {
  addEmployeePayment,
  addExpense,
  addJobPayment,
  deleteEmployeePayment,
  deleteExpense,
  deleteJob,
  deleteJobPayment,
  updateJob,
} from "@/lib/actions";
import {
  EMPLOYEE_PAYMENT_TYPE_LABELS,
  formatDate,
  formatMoney,
  JOB_PAYMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  todayIso,
} from "@/lib/format";
import { ActionForm, DeleteButton, SubmitButton } from "@/components/action-form";
import { JobForm } from "@/components/job-form";
import {
  employeePaymentTypeOptions,
  jobPaymentTypeOptions,
  paymentMethodOptions,
} from "@/components/options";
import { StatusBadge } from "@/components/status-badge";
import { Card, Empty, Field, inputClass, MoneyInput, Stat, signTone, tableClass, tdClass } from "@/components/ui";

export default async function ObraPage({ params }: PageProps<"/obras/[id]">) {
  const { id } = await params;
  const db = await getDb();
  const job = db.jobs.find((j) => j.id === id);
  if (!job) notFound();

  const f = jobFinancials(db, job);
  const payments = db.jobPayments.filter((p) => p.jobId === id).sort((a, b) => a.date.localeCompare(b.date));
  const expenses = db.expenses.filter((e) => e.jobId === id).sort((a, b) => a.date.localeCompare(b.date));
  const labor = db.employeePayments.filter((p) => p.jobId === id).sort((a, b) => a.date.localeCompare(b.date));
  const employeeName = (employeeId: string) =>
    db.employees.find((e) => e.id === employeeId)?.name ?? "(empleado borrado)";
  const activeEmployees = db.employees.filter((e) => e.active);
  const today = todayIso();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/obras" className="text-sm text-steel hover:text-brand-dark">
          ← Obras
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink">{job.clientName}</h1>
          <StatusBadge status={job.status} />
        </div>
        <p className="mt-1 text-steel">{job.description}</p>
        {(job.address || job.clientPhone) && (
          <p className="mt-1 text-sm text-steel">
            {job.address}
            {job.address && job.clientPhone && " · "}
            {job.clientPhone && (
              <a href={`tel:${job.clientPhone}`} className="hover:text-brand-dark">
                {job.clientPhone}
              </a>
            )}
          </p>
        )}
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Stat label="Precio pactado" cents={f.priceCents} />
        <Stat label="Cobrado" cents={f.collectedCents} tone="brand" />
        <Stat label="Falta cobrar" cents={f.pendingCents} tone={f.pendingCents > 0 ? "negative" : "neutral"} />
        <Stat label="Materiales y gastos" cents={f.materialsCents} />
        <Stat label="Mano de obra" cents={f.laborCents} />
        <Stat
          label="Ganancia de la obra"
          cents={f.profitCents}
          tone={signTone(f.profitCents)}
          hint={f.marginPct !== null ? `${f.marginPct}% del precio` : undefined}
        />
      </div>

      <Card title="Cobros (señas y pagos)">
        {payments.length === 0 ? (
          <Empty>Todavía no se registró ningún cobro.</Empty>
        ) : (
          <table className={`${tableClass} mb-4`}>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDate(p.date)}</td>
                  <td className={tdClass}>
                    {JOB_PAYMENT_TYPE_LABELS[p.type]}
                    <span className="block text-xs text-steel">
                      {PAYMENT_METHOD_LABELS[p.method]}
                      {p.notes && ` · ${p.notes}`}
                    </span>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(p.amountCents)}</td>
                  <td className={`${tdClass} text-right`}>
                    <DeleteButton action={deleteJobPayment.bind(null, p.id)} confirm="¿Borrar este cobro?" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <ActionForm action={addJobPayment.bind(null, job.id)} className="flex flex-wrap items-end gap-3 pt-2 border-t border-line">
          <Field label="Fecha" className="w-40">
            <input type="date" name="date" required defaultValue={today} className={inputClass} />
          </Field>
          <Field label="Tipo" className="w-36">
            <select name="type" defaultValue={payments.length === 0 ? "sena" : "pago"} className={inputClass}>
              {jobPaymentTypeOptions()}
            </select>
          </Field>
          <Field label="Monto" className="w-36">
            <MoneyInput name="amount" />
          </Field>
          <Field label="Forma de pago" className="w-40">
            <select name="method" className={inputClass}>
              {paymentMethodOptions()}
            </select>
          </Field>
          <Field label="Nota" className="flex-1 min-w-40">
            <input name="notes" className={inputClass} />
          </Field>
          <SubmitButton>Registrar cobro</SubmitButton>
        </ActionForm>
      </Card>

      <Card title="Materiales y gastos de esta obra">
        {expenses.length === 0 ? (
          <Empty>No hay gastos cargados para esta obra.</Empty>
        ) : (
          <table className={`${tableClass} mb-4`}>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDate(e.date)}</td>
                  <td className={tdClass}>
                    {e.category}
                    {e.description && <span className="block text-xs text-steel">{e.description}</span>}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(e.amountCents)}</td>
                  <td className={`${tdClass} text-right`}>
                    <DeleteButton action={deleteExpense.bind(null, e.id)} confirm="¿Borrar este gasto?" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <ActionForm action={addExpense} className="flex flex-wrap items-end gap-3 pt-2 border-t border-line">
          <input type="hidden" name="jobId" value={job.id} />
          <Field label="Fecha" className="w-40">
            <input type="date" name="date" required defaultValue={today} className={inputClass} />
          </Field>
          <Field label="Categoría" className="w-52">
            <select name="category" required className={inputClass}>
              {db.settings.expenseCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Detalle" className="flex-1 min-w-40">
            <input name="description" placeholder="Ej: perfilería, DVH, cierres…" className={inputClass} />
          </Field>
          <Field label="Monto" className="w-36">
            <MoneyInput name="amount" />
          </Field>
          <Field label="Forma de pago" className="w-40">
            <select name="method" className={inputClass}>
              {paymentMethodOptions()}
            </select>
          </Field>
          <SubmitButton>Agregar gasto</SubmitButton>
        </ActionForm>
      </Card>

      <Card title="Mano de obra de esta obra">
        {labor.length === 0 ? (
          <Empty>No hay pagos a empleados asociados a esta obra.</Empty>
        ) : (
          <table className={`${tableClass} mb-4`}>
            <tbody>
              {labor.map((p) => (
                <tr key={p.id}>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDate(p.date)}</td>
                  <td className={tdClass}>
                    {employeeName(p.employeeId)}
                    <span className="block text-xs text-steel">{EMPLOYEE_PAYMENT_TYPE_LABELS[p.type]}</span>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(p.amountCents)}</td>
                  <td className={`${tdClass} text-right`}>
                    <DeleteButton action={deleteEmployeePayment.bind(null, p.id)} confirm="¿Borrar este pago?" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeEmployees.length === 0 ? (
          <p className="text-sm text-steel">
            Para cargar mano de obra primero{" "}
            <Link href="/empleados" className="text-brand-dark underline">
              agregá a tus empleados
            </Link>
            .
          </p>
        ) : (
          <ActionForm action={addEmployeePayment} className="flex flex-wrap items-end gap-3 pt-2 border-t border-line">
            <input type="hidden" name="jobId" value={job.id} />
            <Field label="Fecha" className="w-40">
              <input type="date" name="date" required defaultValue={today} className={inputClass} />
            </Field>
            <Field label="Empleado" className="w-48">
              <select name="employeeId" required className={inputClass}>
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Concepto" className="w-48">
              <select name="type" className={inputClass}>
                {employeePaymentTypeOptions()}
              </select>
            </Field>
            <Field label="Monto" className="w-36">
              <MoneyInput name="amount" />
            </Field>
            <Field label="Forma de pago" className="w-40">
              <select name="method" className={inputClass}>
                {paymentMethodOptions()}
              </select>
            </Field>
            <SubmitButton>Registrar pago</SubmitButton>
          </ActionForm>
        )}
      </Card>

      <Card title="Datos de la obra">
        <JobForm key={JSON.stringify(job)} action={updateJob.bind(null, job.id)} job={job} submitLabel="Guardar cambios" />
      </Card>

      <div className="flex justify-end">
        <ActionForm
          action={deleteJob.bind(null, job.id)}
          confirm="¿Borrar esta obra y sus cobros? Los gastos y pagos a empleados se conservan, pero dejan de estar asociados a la obra."
        >
          <SubmitButton variant="danger">Borrar obra</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
