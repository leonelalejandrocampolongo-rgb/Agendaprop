import { inputClass } from "@/components/ui";
import { MONTH_NAMES, todayIso } from "@/lib/format";
import { monthPeriod, yearPeriod, type Period } from "@/lib/finance";

export type SelectedPeriod = {
  year: number;
  /** 1-12, o null para el año completo. */
  month: number | null;
  period: Period;
  label: string;
};

/** Lee ?anio=2026&mes=3 (mes=0 es el año completo). Por defecto, el mes actual. */
export function readPeriod(params: { anio?: string; mes?: string }): SelectedPeriod {
  const [todayYear, todayMonth] = todayIso().split("-").map(Number);
  const year = Number(params.anio) || todayYear;
  const rawMonth = params.mes === undefined ? todayMonth : Number(params.mes);
  const month = rawMonth >= 1 && rawMonth <= 12 ? rawMonth : null;
  return {
    year,
    month,
    period: month ? monthPeriod(year, month) : yearPeriod(year),
    label: month ? `${MONTH_NAMES[month - 1]} ${year}` : `todo ${year}`,
  };
}

/** Selector de mes/año. Es un form GET: funciona sin JavaScript. */
export function PeriodPicker({
  selected,
  extra,
}: {
  selected: SelectedPeriod;
  /** Otros filtros de la página a conservar al cambiar el período. */
  extra?: Record<string, string | undefined>;
}) {
  const currentYear = Number(todayIso().slice(0, 4));
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 4 + i);
  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      {Object.entries(extra ?? {}).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <label>
        <span className="block text-xs text-steel mb-1">Mes</span>
        <select name="mes" defaultValue={selected.month ?? 0} className={inputClass}>
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
          <option value={0}>Año completo</option>
        </select>
      </label>
      <label>
        <span className="block text-xs text-steel mb-1">Año</span>
        <select name="anio" defaultValue={selected.year} className={inputClass}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-lg border border-steel/40 bg-white px-4 py-2 text-sm text-ink hover:border-brand"
      >
        Ver
      </button>
    </form>
  );
}
