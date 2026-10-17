import { ActionForm, SubmitButton } from "@/components/action-form";
import { payFrequencyOptions } from "@/components/options";
import { Field, inputClass, MoneyInput } from "@/components/ui";
import type { ActionResult } from "@/lib/actions";
import type { Employee } from "@/lib/db-types";

export function EmployeeForm({
  action,
  employee,
  submitLabel,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  employee?: Employee;
  submitLabel: string;
}) {
  return (
    <ActionForm
      action={action}
      resetOnSuccess={!employee}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      successMessage={employee ? "Cambios guardados." : "Empleado agregado."}
    >
      <Field label="Nombre *">
        <input name="name" required defaultValue={employee?.name} className={inputClass} />
      </Field>
      <Field label="Puesto">
        <input name="role" placeholder="Ej: oficial colocador" defaultValue={employee?.role} className={inputClass} />
      </Field>
      <Field label="Teléfono">
        <input name="phone" type="tel" defaultValue={employee?.phone} className={inputClass} />
      </Field>
      <Field label="Se le paga">
        <select name="payFrequency" defaultValue={employee?.payFrequency ?? "semanal"} className={inputClass}>
          {payFrequencyOptions()}
        </select>
      </Field>
      <Field label="Sueldo / jornal de referencia" hint="Solo de referencia; lo que cuenta es lo que registrás como pago.">
        <MoneyInput name="baseAmount" defaultValue={employee?.baseAmountCents} required={false} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink sm:pt-6">
        <input type="checkbox" name="active" defaultChecked={employee?.active ?? true} />
        Trabaja actualmente
      </label>
      <Field label="Notas" className="sm:col-span-2 lg:col-span-3">
        <input name="notes" defaultValue={employee?.notes} className={inputClass} />
      </Field>
      <div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
