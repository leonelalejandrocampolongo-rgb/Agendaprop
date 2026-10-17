import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { deleteEmployee, deleteEmployeePayment, updateEmployee } from "@/lib/actions";
import { EMPLOYEE_PAYMENT_TYPE_LABELS, formatDate, formatMoney, PAYMENT_METHOD_LABELS, todayIso } from "@/lib/format";
import { ActionForm, DeleteButton, SubmitButton } from "@/components/action-form";
import { EmployeeForm } from "@/components/employee-form";
import { EmployeePaymentForm } from "@/components/employee-payment-form";
import { Card, Empty, Stat, tableClass, tdClass } from "@/components/ui";

export default async function EmpleadoPage({ params }: PageProps<"/empleados/[id]">) {
  const { id } = await params;
  const db = await getDb();
  const employee = db.employees.find((e) => e.id === id);
  if (!employee) notFound();

  const payments = db.employeePayments
    .filter((p) => p.employeeId === id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const thisYear = todayIso().slice(0, 4);
  const thisMonth = todayIso().slice(0, 7);
  const sumWhere = (pred: (date: string) => boolean) =>
    payments.filter((p) => pred(p.date)).reduce((acc, p) => acc + p.amountCents, 0);
  const jobName = (jobId: string | null) => (jobId ? db.jobs.find((j) => j.id === jobId)?.clientName : undefined);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/empleados" className="text-sm text-steel hover:text-brand-dark">
          ← Empleados
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">{employee.name}</h1>
        <p className="text-steel">
          {employee.role}
          {!employee.active && " · ya no trabaja"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pagado este mes" cents={sumWhere((d) => d.startsWith(thisMonth))} />
        <Stat label={`Pagado en ${thisYear}`} cents={sumWhere((d) => d.startsWith(thisYear))} />
        <Stat label="Pagado en total" cents={sumWhere(() => true)} />
      </div>

      <Card title="Registrar un pago">
        <EmployeePaymentForm employees={[employee]} jobs={db.jobs} employeeId={employee.id} />
      </Card>

      <Card title="Historial de pagos">
        {payments.length === 0 ? (
          <Empty>Todavía no se le registró ningún pago.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDate(p.date)}</td>
                    <td className={tdClass}>
                      {EMPLOYEE_PAYMENT_TYPE_LABELS[p.type]}
                      <span className="block text-xs text-steel">
                        {PAYMENT_METHOD_LABELS[p.method]}
                        {jobName(p.jobId) && ` · obra ${jobName(p.jobId)}`}
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

      <Card title="Datos del empleado">
        <EmployeeForm key={JSON.stringify(employee)} action={updateEmployee.bind(null, employee.id)} employee={employee} submitLabel="Guardar cambios" />
      </Card>

      <div className="flex justify-end">
        <ActionForm action={deleteEmployee.bind(null, employee.id)} confirm="¿Borrar este empleado?">
          <SubmitButton variant="danger">Borrar empleado</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
