import { ActionForm, SubmitButton } from "@/components/action-form";
import { jobOptions, jobPaymentTypeOptions, paymentMethodOptions } from "@/components/options";
import { Field, inputClass, MoneyInput } from "@/components/ui";
import { addExpense, addJobPaymentPickingJob, addWithdrawal } from "@/lib/actions";
import { todayIso } from "@/lib/format";
import type { Job } from "@/lib/db-types";

// Formularios de carga que se usan en más de una pantalla.

export function ExpenseForm({ categories, jobs }: { categories: string[]; jobs: Job[] }) {
  return (
    <ActionForm action={addExpense} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" successMessage="Gasto guardado.">
      <Field label="Monto *">
        <MoneyInput name="amount" />
      </Field>
      <Field label="Categoría *">
        <select name="category" required className={inputClass}>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Fecha *">
        <input type="date" name="date" required defaultValue={todayIso()} className={inputClass} />
      </Field>
      <Field label="Detalle" className="lg:col-span-2">
        <input name="description" placeholder="Ej: 6 tiras de perfil, factura 0001-2345…" className={inputClass} />
      </Field>
      <Field label="Forma de pago">
        <select name="method" className={inputClass}>
          {paymentMethodOptions()}
        </select>
      </Field>
      <Field
        label="¿Es para una obra?"
        className="sm:col-span-2"
        hint="Si el material es para una obra puntual, elegila: así sabés cuánto te dejó ese trabajo."
      >
        <select name="jobId" defaultValue="" className={inputClass}>
          <option value="">No, gasto general del negocio</option>
          {jobOptions(jobs)}
        </select>
      </Field>
      <div className="flex items-end">
        <SubmitButton>Guardar gasto</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function JobPaymentPickJobForm({ jobs }: { jobs: Job[] }) {
  const open = jobs.filter((j) => j.status !== "cancelado");
  return (
    <ActionForm action={addJobPaymentPickingJob} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" successMessage="Cobro registrado.">
      <Field label="Obra *" className="sm:col-span-2 lg:col-span-3">
        <select name="jobId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Elegí la obra…
          </option>
          {jobOptions(open)}
        </select>
      </Field>
      <Field label="Monto *">
        <MoneyInput name="amount" />
      </Field>
      <Field label="Tipo">
        <select name="type" defaultValue="pago" className={inputClass}>
          {jobPaymentTypeOptions()}
        </select>
      </Field>
      <Field label="Fecha *">
        <input type="date" name="date" required defaultValue={todayIso()} className={inputClass} />
      </Field>
      <Field label="Forma de pago">
        <select name="method" className={inputClass}>
          {paymentMethodOptions()}
        </select>
      </Field>
      <Field label="Nota">
        <input name="notes" className={inputClass} />
      </Field>
      <div className="flex items-end">
        <SubmitButton>Registrar cobro</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function WithdrawalForm() {
  return (
    <ActionForm action={addWithdrawal} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" successMessage="Retiro registrado.">
      <Field label="Monto *">
        <MoneyInput name="amount" />
      </Field>
      <Field label="Fecha *">
        <input type="date" name="date" required defaultValue={todayIso()} className={inputClass} />
      </Field>
      <Field label="Forma">
        <select name="method" className={inputClass}>
          {paymentMethodOptions()}
        </select>
      </Field>
      <Field label="Nota">
        <input name="notes" className={inputClass} />
      </Field>
      <div>
        <SubmitButton>Registrar retiro</SubmitButton>
      </div>
    </ActionForm>
  );
}
