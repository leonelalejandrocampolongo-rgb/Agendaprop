import Link from "next/link";
import { getDb } from "@/lib/db";
import { addExpense, deleteExpense } from "@/lib/actions";
import { inPeriod } from "@/lib/finance";
import { formatDate, formatMoney, PAYMENT_METHOD_LABELS, todayIso } from "@/lib/format";
import { ActionForm, DeleteButton, SubmitButton } from "@/components/action-form";
import { jobOptions, paymentMethodOptions } from "@/components/options";
import { PeriodPicker, readPeriod } from "@/components/period-picker";
import { Card, Empty, Field, inputClass, MoneyInput, PageHeader, tableClass, tdClass, thClass } from "@/components/ui";

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
        <ActionForm action={addExpense} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" successMessage="Gasto guardado.">
          <Field label="Fecha *">
            <input type="date" name="date" required defaultValue={todayIso()} className={inputClass} />
          </Field>
          <Field label="Categoría *">
            <select name="category" required className={inputClass}>
              {db.settings.expenseCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Monto *">
            <MoneyInput name="amount" />
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
            className="lg:col-span-2"
            hint="Si el material es para una obra puntual, elegila: así sabés cuánto te dejó ese trabajo."
          >
            <select name="jobId" defaultValue="" className={inputClass}>
              <option value="">No, gasto general del negocio</option>
              {jobOptions(db.jobs)}
            </select>
          </Field>
          <div className="flex items-end">
            <SubmitButton>Guardar gasto</SubmitButton>
          </div>
        </ActionForm>
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
          <div className="overflow-x-auto">
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
        )}
      </Card>
    </div>
  );
}
