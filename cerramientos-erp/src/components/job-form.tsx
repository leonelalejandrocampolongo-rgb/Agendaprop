import { ActionForm, SubmitButton } from "@/components/action-form";
import { jobStatusOptions } from "@/components/options";
import { Field, inputClass, MoneyInput } from "@/components/ui";
import type { ActionResult } from "@/lib/actions";
import type { Job } from "@/lib/db-types";

/**
 * Para editar, renderizarlo con `key` atado a los datos de la obra: los
 * campos usan defaultValue y no se actualizarían solos si la obra cambia
 * desde otro formulario (por ejemplo, al cobrar la seña pasa a "En curso").
 */
export function JobForm({
  action,
  job,
  submitLabel,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  job?: Job;
  submitLabel: string;
}) {
  return (
    <ActionForm
      action={action}
      resetOnSuccess={!job}
      className="grid gap-4 sm:grid-cols-2"
      successMessage={job ? "Cambios guardados." : undefined}
    >
      <Field label="Cliente *">
        <input name="clientName" required defaultValue={job?.clientName} className={inputClass} />
      </Field>
      <Field label="Teléfono">
        <input name="clientPhone" type="tel" defaultValue={job?.clientPhone} className={inputClass} />
      </Field>
      <Field label="Dirección de la obra" className="sm:col-span-2">
        <input name="address" defaultValue={job?.address} className={inputClass} />
      </Field>
      <Field label="Trabajo *" className="sm:col-span-2" hint="Ej: 3 ventanas corredizas Módena + puerta balcón">
        <input name="description" required defaultValue={job?.description} className={inputClass} />
      </Field>
      <Field label="Precio total pactado *" hint="Lo que se le cobra al cliente por toda la obra">
        <MoneyInput name="price" defaultValue={job?.priceCents} />
      </Field>
      <Field label="Estado">
        <select name="status" defaultValue={job?.status ?? "presupuestado"} className={inputClass}>
          {jobStatusOptions()}
        </select>
      </Field>
      <Field label="Fecha de inicio">
        <input type="date" name="startDate" defaultValue={job?.startDate ?? ""} className={inputClass} />
      </Field>
      <Field label="Fecha de entrega">
        <input type="date" name="endDate" defaultValue={job?.endDate ?? ""} className={inputClass} />
      </Field>
      <Field label="Notas" className="sm:col-span-2">
        <textarea name="notes" rows={3} defaultValue={job?.notes} className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
