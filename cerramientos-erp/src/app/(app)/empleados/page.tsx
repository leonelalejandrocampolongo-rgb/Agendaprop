import Link from "next/link";
import { getDb } from "@/lib/db";
import { createEmployee, deleteEmployeePayment } from "@/lib/actions";
import { inPeriod } from "@/lib/finance";
import {
  EMPLOYEE_PAYMENT_TYPE_LABELS,
  formatDate,
  formatMoney,
  PAY_FREQUENCY_LABELS,
} from "@/lib/format";
import { DeleteButton } from "@/components/action-form";
import { EmployeeForm } from "@/components/employee-form";
import { EmployeePaymentForm } from "@/components/employee-payment-form";
import { PeriodPicker, readPeriod } from "@/components/period-picker";
import { Card, Empty, PageHeader, tableClass, tdClass, thClass } from "@/components/ui";

export default async function EmpleadosPage({ searchParams }: PageProps<"/empleados">) {
  const params = (await searchParams) as { anio?: string; mes?: string };
  const selected = readPeriod(params);
  const db = await getDb();

  const payments = db.employeePayments
    .filter((p) => inPeriod(p.date, selected.period))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const paidBy = (employeeId: string) =>
    payments.filter((p) => p.employeeId === employeeId).reduce((acc, p) => acc + p.amountCents, 0);
  const total = payments.reduce((acc, p) => acc + p.amountCents, 0);
  const employees = [...db.employees].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
  );
  const active = employees.filter((e) => e.active);
  const employeeName = (id: string) => db.employees.find((e) => e.id === id)?.name ?? "(empleado borrado)";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empleados"
        description="Tu equipo y todo lo que se les paga: sueldos, jornales, adelantos, aguinaldo y cargas sociales. Todo esto cuenta como gasto de empleados."
      />

      {active.length > 0 && (
        <Card title="Registrar un pago">
          <EmployeePaymentForm employees={active} jobs={db.jobs} />
        </Card>
      )}

      <PeriodPicker selected={selected} />

      <Card>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-base font-semibold text-ink">Equipo</h2>
          <p className="text-sm text-steel">
            Pagado en {selected.label}:{" "}
            <span className="font-semibold text-ink tabular-nums">{formatMoney(total)}</span>
          </p>
        </div>
        {employees.length === 0 ? (
          <Empty>Todavía no cargaste empleados. Agregalos abajo.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Nombre</th>
                  <th className={thClass}>Se le paga</th>
                  <th className={`${thClass} text-right`}>Referencia</th>
                  <th className={`${thClass} text-right`}>Pagado ({selected.label})</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className={e.active ? undefined : "opacity-60"}>
                    <td className={tdClass}>
                      <Link href={`/empleados/${e.id}`} className="font-medium hover:text-brand-dark">
                        {e.name}
                      </Link>
                      <span className="block text-xs text-steel">
                        {e.role}
                        {!e.active && " · ya no trabaja"}
                      </span>
                    </td>
                    <td className={tdClass}>{PAY_FREQUENCY_LABELS[e.payFrequency]}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(e.baseAmountCents)}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(paidBy(e.id))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={`Pagos de ${selected.label}`}>
        {payments.length === 0 ? (
          <Empty>No hay pagos a empleados en este período.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDate(p.date)}</td>
                    <td className={tdClass}>
                      {employeeName(p.employeeId)}
                      <span className="block text-xs text-steel">
                        {EMPLOYEE_PAYMENT_TYPE_LABELS[p.type]}
                        {p.notes && ` · ${p.notes}`}
                      </span>
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(p.amountCents)}</td>
                    <td className={`${tdClass} text-right`}>
                      <DeleteButton action={deleteEmployeePayment.bind(null, p.id)} confirm="¿Borrar este pago?" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Agregar empleado">
        <EmployeeForm action={createEmployee} submitLabel="Agregar empleado" />
      </Card>
    </div>
  );
}
