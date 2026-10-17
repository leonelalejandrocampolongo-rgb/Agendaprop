import { ActionForm, SubmitButton } from "@/components/action-form";
import { employeePaymentTypeOptions, jobOptions, paymentMethodOptions } from "@/components/options";
import { Field, inputClass, MoneyInput } from "@/components/ui";
import { addEmployeePayment } from "@/lib/actions";
import { todayIso } from "@/lib/format";
import type { Employee, Job } from "@/lib/db-types";

/** Registrar un pago a un empleado. Si se pasa `employeeId`, queda fijo. */
export function EmployeePaymentForm({
  employees,
  jobs,
  employeeId,
}: {
  employees: Employee[];
  jobs: Job[];
  employeeId?: string;
}) {
  return (
    <ActionForm
      action={addEmployeePayment}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      successMessage="Pago registrado."
    >
      {employeeId ? (
        <input type="hidden" name="employeeId" value={employeeId} />
      ) : (
        <Field label="Empleado *">
          <select name="employeeId" required className={inputClass}>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Fecha *">
        <input type="date" name="date" required defaultValue={todayIso()} className={inputClass} />
      </Field>
      <Field label="Concepto">
        <select name="type" className={inputClass}>
          {employeePaymentTypeOptions()}
        </select>
      </Field>
      <Field label="Monto *">
        <MoneyInput name="amount" />
      </Field>
      <Field label="Forma de pago">
        <select name="method" className={inputClass}>
          {paymentMethodOptions()}
        </select>
      </Field>
      <Field label="¿Trabajó en una obra puntual?" hint="Opcional: suma a la mano de obra de esa obra.">
        <select name="jobId" defaultValue="" className={inputClass}>
          <option value="">No / varias obras</option>
          {jobOptions(jobs)}
        </select>
      </Field>
      <Field label="Nota" className={employeeId ? "lg:col-span-2" : ""}>
        <input name="notes" placeholder="Ej: semana del 6 al 11" className={inputClass} />
      </Field>
      <div className="flex items-end">
        <SubmitButton>Registrar pago</SubmitButton>
      </div>
    </ActionForm>
  );
}
