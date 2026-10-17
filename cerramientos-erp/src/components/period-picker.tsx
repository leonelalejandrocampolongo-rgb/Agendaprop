import Link from "next/link";
import { Icon } from "@/components/icons";
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

function href(year: number, month: number, extra?: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(extra ?? {})) if (v) params.set(k, v);
  params.set("anio", String(year));
  params.set("mes", String(month));
  return `?${params.toString()}`;
}

const arrowClass =
  "flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-white text-ink shadow-sm hover:border-brand hover:text-brand-dark";

/** Selector de período con flechas ← →. Son links: funciona sin JavaScript. */
export function PeriodPicker({
  selected,
  extra,
}: {
  selected: SelectedPeriod;
  /** Otros filtros de la página a conservar al cambiar el período. */
  extra?: Record<string, string | undefined>;
}) {
  const [todayYear, todayMonth] = todayIso().split("-").map(Number);
  const { year, month } = selected;
  const prev = month ? (month === 1 ? href(year - 1, 12, extra) : href(year, month - 1, extra)) : href(year - 1, 0, extra);
  const next = month ? (month === 12 ? href(year + 1, 1, extra) : href(year, month + 1, extra)) : href(year + 1, 0, extra);
  const isCurrent = year === todayYear && (month === null || month === todayMonth);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={prev} className={arrowClass} aria-label="Período anterior">
        <Icon name="left" />
      </Link>
      <p className="min-w-40 text-center text-lg font-semibold text-ink">
        {month ? `${MONTH_NAMES[month - 1]} ${year}` : `Año ${year}`}
      </p>
      <Link href={next} className={arrowClass} aria-label="Período siguiente">
        <Icon name="right" />
      </Link>
      <div className="flex gap-2 text-sm">
        {!isCurrent && (
          <Link href={href(todayYear, month ? todayMonth : 0, extra)} className="rounded-lg px-3 py-2 text-brand-dark hover:bg-brand/10">
            {month ? "Este mes" : "Este año"}
          </Link>
        )}
        <Link
          href={month ? href(year, 0, extra) : href(year, year === todayYear ? todayMonth : 1, extra)}
          className="rounded-lg px-3 py-2 text-brand-dark hover:bg-brand/10"
        >
          {month ? "Ver el año completo" : "Ver por mes"}
        </Link>
      </div>
    </div>
  );
}
