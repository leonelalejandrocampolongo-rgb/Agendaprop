import { getDb } from "@/lib/db";
import { addWithdrawal, deleteWithdrawal } from "@/lib/actions";
import { inPeriod, summarizePeriod } from "@/lib/finance";
import { formatDate, formatMoney, PAYMENT_METHOD_LABELS, todayIso } from "@/lib/format";
import { ActionForm, DeleteButton, SubmitButton } from "@/components/action-form";
import { paymentMethodOptions } from "@/components/options";
import { PeriodPicker, readPeriod } from "@/components/period-picker";
import { Card, Empty, Field, inputClass, MoneyInput, PageHeader, Stat, signTone, tableClass, tdClass } from "@/components/ui";

export default async function RetirosPage({ searchParams }: PageProps<"/retiros">) {
  const params = (await searchParams) as { anio?: string; mes?: string };
  const selected = readPeriod(params);
  const db = await getDb();
  const s = summarizePeriod(db, selected.period);

  const withdrawals = db.ownerWithdrawals
    .filter((w) => inPeriod(w.date, selected.period))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis retiros"
        description="La plata que sacás del negocio para vos. No es un gasto del negocio: es tu ganancia. Registrándola sabés cuánto te llevaste y cuánto queda para reinvertir o para los meses flojos."
      />

      <Card title="Registrar un retiro">
        <ActionForm action={addWithdrawal} className="flex flex-wrap items-end gap-3" successMessage="Retiro registrado.">
          <Field label="Fecha" className="w-40">
            <input type="date" name="date" required defaultValue={todayIso()} className={inputClass} />
          </Field>
          <Field label="Monto" className="w-40">
            <MoneyInput name="amount" />
          </Field>
          <Field label="Forma" className="w-40">
            <select name="method" className={inputClass}>
              {paymentMethodOptions()}
            </select>
          </Field>
          <Field label="Nota" className="flex-1 min-w-40">
            <input name="notes" className={inputClass} />
          </Field>
          <SubmitButton>Registrar retiro</SubmitButton>
        </ActionForm>
      </Card>

      <PeriodPicker selected={selected} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={`Ganancia neta (${selected.label})`} cents={s.netProfitCents} tone={signTone(s.netProfitCents)} />
        <Stat label="Retiraste" cents={s.withdrawalsCents} />
        <Stat
          label="Te queda por retirar"
          cents={s.retainedCents}
          tone={signTone(s.retainedCents)}
          hint={s.retainedCents < 0 ? "Retiraste más de lo que ganó el negocio en este período" : undefined}
        />
      </div>

      <Card title={`Retiros de ${selected.label}`}>
        {withdrawals.length === 0 ? (
          <Empty>No registraste retiros en este período.</Empty>
        ) : (
          <table className={tableClass}>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.id}>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDate(w.date)}</td>
                  <td className={tdClass}>
                    {PAYMENT_METHOD_LABELS[w.method]}
                    {w.notes && <span className="block text-xs text-steel">{w.notes}</span>}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(w.amountCents)}</td>
                  <td className={`${tdClass} text-right`}>
                    <DeleteButton action={deleteWithdrawal.bind(null, w.id)} confirm="¿Borrar este retiro?" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
