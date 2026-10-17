import Link from "next/link";
import { getDb } from "@/lib/db";
import {
  estimatedCashCents,
  jobFinancials,
  monthlySummaries,
  summarizePeriod,
  totalReceivableCents,
} from "@/lib/finance";
import { formatMoney, MONTH_NAMES } from "@/lib/format";
import { PeriodPicker, readPeriod } from "@/components/period-picker";
import { Card, Empty, PageHeader, Stat, signTone, tableClass, tdClass, thClass } from "@/components/ui";

export default async function ResumenPage({ searchParams }: PageProps<"/">) {
  const params = (await searchParams) as { anio?: string; mes?: string };
  const selected = readPeriod(params);
  const db = await getDb();

  const s = summarizePeriod(db, selected.period);
  const months = monthlySummaries(db, selected.year);
  const receivable = totalReceivableCents(db);
  const cash = estimatedCashCents(db);

  const debtors = db.jobs
    .map((job) => ({ job, f: jobFinancials(db, job) }))
    .filter(({ f }) => f.pendingCents > 0)
    .sort((a, b) => b.f.pendingCents - a.f.pendingCents)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Resumen"
        description="Cuánta plata entró, cuánta salió y cuánto ganó el negocio. Se cuenta todo por la fecha en que se cobró o se pagó."
      />

      <PeriodPicker selected={selected} />

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-steel uppercase tracking-wide">
          {selected.label}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Cobrado a clientes" cents={s.incomeCents} tone="brand" />
          <Stat label="Gastos del negocio" cents={s.businessExpensesCents} hint="Materiales, alquiler, combustible, etc." />
          <Stat label="Gastos de empleados" cents={s.employeeCostsCents} hint="Sueldos, adelantos, cargas sociales" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Ganancia neta del negocio"
            cents={s.netProfitCents}
            tone={signTone(s.netProfitCents)}
            hint="Cobrado − gastos − empleados"
            big
          />
          <Stat label="Lo que retiraste para vos" cents={s.withdrawalsCents} hint="Ver «Mis retiros»" big />
          <Stat
            label="Queda en el negocio"
            cents={s.retainedCents}
            tone={signTone(s.retainedCents)}
            hint={
              s.retainedCents >= 0
                ? "Ganancia que todavía podés retirar o reinvertir"
                : "Retiraste más de lo que ganó el negocio"
            }
            big
          />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Te deben los clientes (todas las obras)"
          cents={receivable}
          hint="Saldo pendiente de obras en curso o terminadas"
        />
        <Stat
          label="Plata que debería haber en caja"
          cents={cash}
          tone={signTone(cash)}
          hint="Todo lo cobrado − todo lo gastado y retirado desde que usás la app"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Gastos por categoría (${selected.label})`}>
          {s.expensesByCategory.length === 0 ? (
            <Empty>No hay gastos cargados en este período.</Empty>
          ) : (
            <table className={tableClass}>
              <tbody>
                {s.expensesByCategory.map((row) => (
                  <tr key={row.category}>
                    <td className={tdClass}>{row.category}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(row.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title={`Gastos por empleado (${selected.label})`}>
          {s.employeeCostsByEmployee.length === 0 ? (
            <Empty>No hay pagos a empleados en este período.</Empty>
          ) : (
            <table className={tableClass}>
              <tbody>
                {s.employeeCostsByEmployee.map((row) => (
                  <tr key={row.employeeId}>
                    <td className={tdClass}>
                      <Link href={`/empleados/${row.employeeId}`} className="hover:text-brand-dark">
                        {row.name}
                      </Link>
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(row.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card title="Clientes que deben">
        {debtors.length === 0 ? (
          <Empty>Ningún cliente tiene saldo pendiente.</Empty>
        ) : (
          <table className={tableClass}>
            <tbody>
              {debtors.map(({ job, f }) => (
                <tr key={job.id}>
                  <td className={tdClass}>
                    <Link href={`/obras/${job.id}`} className="font-medium hover:text-brand-dark">
                      {job.clientName}
                    </Link>
                    <span className="block text-xs text-steel">{job.description}</span>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums text-red-700`}>
                    {formatMoney(f.pendingCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title={`Mes a mes — ${selected.year}`}>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Mes</th>
                <th className={`${thClass} text-right`}>Cobrado</th>
                <th className={`${thClass} text-right`}>Gastos</th>
                <th className={`${thClass} text-right`}>Empleados</th>
                <th className={`${thClass} text-right`}>Ganancia neta</th>
                <th className={`${thClass} text-right`}>Retiros</th>
                <th className={`${thClass} text-right`}>Queda</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => (
                <tr key={i} className={selected.month === i + 1 ? "bg-surface" : undefined}>
                  <td className={tdClass}>
                    <Link href={`/?anio=${selected.year}&mes=${i + 1}`} className="hover:text-brand-dark">
                      {MONTH_NAMES[i]}
                    </Link>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(m.incomeCents)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(m.businessExpensesCents)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(m.employeeCostsCents)}</td>
                  <td
                    className={`${tdClass} text-right tabular-nums font-medium ${
                      m.netProfitCents < 0 ? "text-red-700" : ""
                    }`}
                  >
                    {formatMoney(m.netProfitCents)}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(m.withdrawalsCents)}</td>
                  <td className={`${tdClass} text-right tabular-nums ${m.retainedCents < 0 ? "text-red-700" : ""}`}>
                    {formatMoney(m.retainedCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
