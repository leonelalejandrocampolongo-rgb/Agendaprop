import {
  EMPLOYEE_PAYMENT_TYPE_LABELS,
  JOB_PAYMENT_TYPE_LABELS,
  JOB_STATUS_LABELS,
  PAY_FREQUENCY_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/format";
import type { Job } from "@/lib/db-types";

function fromLabels(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => (
    <option key={value} value={value}>
      {label}
    </option>
  ));
}

export const paymentMethodOptions = () => fromLabels(PAYMENT_METHOD_LABELS);
export const jobStatusOptions = () => fromLabels(JOB_STATUS_LABELS);
export const jobPaymentTypeOptions = () => fromLabels(JOB_PAYMENT_TYPE_LABELS);
export const payFrequencyOptions = () => fromLabels(PAY_FREQUENCY_LABELS);
export const employeePaymentTypeOptions = () => fromLabels(EMPLOYEE_PAYMENT_TYPE_LABELS);

/** Obras activas primero, para asociar un gasto o un pago a una obra. */
export function jobOptions(jobs: Job[]) {
  const order = { en_curso: 0, presupuestado: 1, terminado: 2, cancelado: 3 };
  return [...jobs]
    .sort((a, b) => order[a.status] - order[b.status] || b.createdAt.localeCompare(a.createdAt))
    .map((j) => (
      <option key={j.id} value={j.id}>
        {j.clientName} — {j.description}
      </option>
    ));
}
