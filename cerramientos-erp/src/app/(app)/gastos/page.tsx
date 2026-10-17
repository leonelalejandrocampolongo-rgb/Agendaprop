import Link from "next/link";
import { getDb } from "@/lib/db";
import { deleteExpense } from "@/lib/actions";
import { inPeriod } from "@/lib/finance";
import { formatDate, formatMoney, PAYMENT_METHOD_LABELS } from "@/lib/format";
import { DeleteButton } from "@/components/action-form";
import { ExpenseForm } from "@/components/quick-forms";
import { PeriodPicker, readPeriod } from "@/components/period-picker";
import { Card, Empty, inputClass, PageHeader, tableClass, tdClass, thClass } from "@/components/ui";

export default async function GastosPage({ searchParams }: PageProps<"/gastos">) {
  const params = (await searchParams) as { anio?: string; mes?: string; categoria?: string };
  const selected = readPeriod(params);
  const db = await getDb();

  const expenses = db.expenses
    .filter((e) => inPeriod(e.date, selected.period))
    .filter((e) => !params.categoria || e.category === params.categoria)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const total = expenses.reduce((acc, e) => acc + e.amountCents, 0);
  const jobName = (jobId: string | null) => {
    const job = jobId ? db.jobs.find((j) => j.id === jobId) : null;
    return job ? job.clientName : null;
  };

  // Categorías configuradas + las que aparecen en gastos viejos (por si se
  // renombró o sacó alguna desde Configuración).
  const categories = [...new Set([...db.settings.expenseCategories, ...db.expenses.map((e) => e.category)])];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gastos del negocio"
        description="Todo lo que se paga para que el negocio funcione: materiales, herramientas, alquiler, combustible, impuestos. Los sueldos se cargan en Empleados."
      />

      <Card title="Cargar un gasto">
        <ExpenseForm categories={db.settings.expenseCategories} jobs={db.jobs} />
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <PeriodPicker selected={selected} extra={{ categoria: params.categoria }} />
        <form method="get" className="flex items-end gap-2">
          <input type="hidden" name="anio" value={selected.year} />
          <input type="hidden" name="mes" value={selected.month ?? 0} />
          <label>
            <span className="block text-xs text-steel mb-1">Categoría</span>
            <select name="categoria" defaultValue={params.categoria ?? ""} className={inputClass}>
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg border border-steel/40 bg-white px-4 py-2 text-sm hover:border-brand">
            Filtrar
          </button>
        </form>
      </div>

      <Card>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-base font-semibold text-ink">
            Gastos de {selected.label}
            {params.categoria && ` · ${params.categoria}`}
          </h2>
          <p className="text-lg font-semibold tabular-nums">{formatMoney(total)}</p>
        </div>
        {expenses.length === 0 ? (
          <Empty>No hay gastos en este período.</Empty>
        ) : (
          <>
          <ul className="sm:hidden divide-y divide-line">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{e.category}</p>
                  <p className="text-sm text-steel">
                    {formatDate(e.date)}
                    {e.description && ` · ${e.description}`}
                    {jobName(e.jobId) && ` · obra ${jobName(e.jobId)}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium tabular-nums">{formatMoney(e.amountCents)}</p>
                  <DeleteButton action={deleteExpense.bind(null, e.id)} confirm="¿Borrar este gasto?" />
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Fecha</th>
                  <th className={thClass}>Categoría / detalle</th>
                  <th className={thClass}>Obra</th>
                  <th className={thClass}>Pago</th>
                  <th className={`${thClass} text-right`}>Monto</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDate(e.date)}</td>
                    <td className={tdClass}>
                      {e.category}
                      {e.description && <span className="block text-xs text-steel">{e.description}</span>}
                    </td>
                    <td className={tdClass}>
                      {e.jobId && jobName(e.jobId) ? (
                        <Link href={`/obras/${e.jobId}`} className="hover:text-brand-dark">
                          {jobName(e.jobId)}
                        </Link>
                      ) : (
                        <span className="text-steel">General</span>
                      )}
                    </td>
                    <td className={tdClass}>{PAYMENT_METHOD_LABELS[e.method]}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(e.amountCents)}</td>
                    <td className={`${tdClass} text-right`}>
                      <DeleteButton action={deleteExpense.bind(null, e.id)} confirm="¿Borrar este gasto?" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>
    </div>
  );
}
