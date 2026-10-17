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
import { ProfitChart } from "@/components/profit-chart";
import { Card, Empty, Stat, signTone, tableClass, tdClass, thClass } from "@/components/ui";

function Line({
  label,
  cents,
  sign,
  href,
}: {
  label: string;
  cents: number;
  sign: "+" | "−";
  href?: string;
}) {
  const content = (
    <>
      <span className="text-steel">{label}</span>
      <span className="tabular-nums text-ink">
        {sign} {formatMoney(cents)}
      </span>
    </>
  );
  return href ? (
    <Link href={href} className="flex items-baseline justify-between gap-4 py-2 hover:text-brand-dark">
      {content}
    </Link>
  ) : (
    <div className="flex items-baseline justify-between gap-4 py-2">{content}</div>
  );
}

function Total({ label, cents, hint, big }: { label: string; cents: number; hint?: string; big?: boolean }) {
  const color = cents < 0 ? "text-red-700" : cents > 0 ? "text-emerald-700" : "text-ink";
  return (
    <div className="border-t-2 border-ink/80 pt-3 pb-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className={`font-semibold text-ink ${big ? "text-lg" : ""}`}>{label}</span>
        <span className={`font-semibold tracking-tight ${big ? "text-3xl sm:text-4xl" : "text-xl"} ${color}`}>
          {formatMoney(cents)}
        </span>
      </div>
      {hint && <p className="mt-1 text-xs text-steel text-right">{hint}</p>}
    </div>
  );
}

export default async function ResumenPage({ searchParams }: PageProps<"/">) {
  const params = (await searchParams) as { anio?: string; mes?: string };
  const selected = readPeriod(params);
  const db = await getDb();

  const s = summarizePeriod(db, selected.period);
  const months = monthlySummaries(db, selected.year);
  const receivable = totalReceivableCents(db);
  const cash = estimatedCashCents(db);
  const periodQuery = `anio=${selected.year}&mes=${selected.month ?? 0}`;
  const maxCategory = Math.max(1, ...s.expensesByCategory.map((c) => c.totalCents));

  const debtors = db.jobs
    .map((job) => ({ job, f: jobFinancials(db, job) }))
    .filter(({ f }) => f.pendingCents > 0)
    .sort((a, b) => b.f.pendingCents - a.f.pendingCents)
    .slice(0, 5);

  const isEmpty = db.jobs.length === 0 && db.expenses.length === 0 && db.employeePayments.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">Resumen</h1>
        <PeriodPicker selected={selected} />
      </div>

      {isEmpty && (
        <div className="rounded-2xl border border-brand/30 bg-brand/5 p-5">
          <p className="font-semibold text-ink">¡Bienvenido! Todavía no hay nada cargado.</p>
          <p className="mt-1 text-sm text-steel">
            Empezá cargando tus{" "}
            <Link href="/obras/nueva" className="text-brand-dark underline">
              obras
            </Link>
            , tus{" "}
            <Link href="/cargar?tipo=gasto" className="text-brand-dark underline">
              gastos
            </Link>{" "}
            o{" "}
            <Link href="/importar" className="text-brand-dark underline">
              importá tus planillas de Excel
            </Link>
            .
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2" title={`Las cuentas de ${selected.month ? MONTH_NAMES[selected.month - 1] : selected.year}`}>
          <Line label="Cobrado a clientes" cents={s.incomeCents} sign="+" href={`/obras?estado=todas`} />
          <Line label="Gastos del negocio" cents={s.businessExpensesCents} sign="−" href={`/gastos?${periodQuery}`} />
          <Line label="Gastos de empleados" cents={s.employeeCostsCents} sign="−" href={`/empleados?${periodQuery}`} />
          <Total label="Ganancia neta" cents={s.netProfitCents} big />
          <Line label="Lo que retiraste para vos" cents={s.withdrawalsCents} sign="−" href={`/retiros?${periodQuery}`} />
          <Total
            label="Queda en el negocio"
            cents={s.retainedCents}
            hint={
              s.retainedCents < 0
                ? "Retiraste más de lo que ganó el negocio"
                : s.retainedCents > 0
                  ? "Lo podés retirar o dejar para reinvertir"
                  : undefined
            }
          />
        </Card>

        <Card className="lg:col-span-3" title={`Ganancia neta mes a mes — ${selected.year}`}>
          <ProfitChart
            points={months.map((m, i) => ({ month: i + 1, netCents: m.netProfitCents }))}
            selectedMonth={selected.month}
          />
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-brand-dark">Ver la tabla con todos los números</summary>
            <div className="mt-3 overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Mes</th>
                    <th className={`${thClass} text-right`}>Cobrado</th>
                    <th className={`${thClass} text-right`}>Gastos</th>
                    <th className={`${thClass} text-right`}>Empleados</th>
                    <th className={`${thClass} text-right`}>Ganancia</th>
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
                      <td className={`${tdClass} text-right tabular-nums font-medium ${m.netProfitCents < 0 ? "text-red-700" : ""}`}>
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
          </details>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Te deben los clientes" cents={receivable} hint="Saldo pendiente de obras en curso o terminadas" />
        <Stat
          label="Plata que debería haber en caja"
          cents={cash}
          tone={signTone(cash)}
          hint="Todo lo cobrado − todo lo gastado y retirado desde que usás la app"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="¿En qué se fue la plata?">
          {s.expensesByCategory.length === 0 ? (
            <Empty>No hay gastos cargados en este período.</Empty>
          ) : (
            <ul className="space-y-3">
              {s.expensesByCategory.map((row) => (
                <li key={row.category}>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <Link
                      href={`/gastos?${periodQuery}&categoria=${encodeURIComponent(row.category)}`}
                      className="text-ink hover:text-brand-dark"
                    >
                      {row.category}
                    </Link>
                    <span className="tabular-nums text-ink">{formatMoney(row.totalCents)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-surface">
                    <div
                      className="h-2 rounded-full bg-[#2a6fb0]"
                      style={{ width: `${Math.max(2, (row.totalCents / maxCategory) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Clientes que deben">
            {debtors.length === 0 ? (
              <Empty>Ningún cliente tiene saldo pendiente.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {debtors.map(({ job, f }) => (
                  <li key={job.id}>
                    <Link href={`/obras/${job.id}`} className="flex items-center justify-between gap-4 py-3 hover:text-brand-dark">
                      <span className="min-w-0">
                        <span className="block font-medium truncate">{job.clientName}</span>
                        <span className="block text-xs text-steel truncate">{job.description}</span>
                      </span>
                      <span className="shrink-0 font-medium tabular-nums text-red-700">{formatMoney(f.pendingCents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Sueldos por empleado">
            {s.employeeCostsByEmployee.length === 0 ? (
              <Empty>No hay pagos a empleados en este período.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {s.employeeCostsByEmployee.map((row) => (
                  <li key={row.employeeId}>
                    <Link
                      href={`/empleados/${row.employeeId}`}
                      className="flex items-center justify-between gap-4 py-3 hover:text-brand-dark"
                    >
                      <span>{row.name}</span>
                      <span className="tabular-nums">{formatMoney(row.totalCents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
