"use client";

import { useEffect, useState } from "react";
import { formatPrice, MONTH_NAMES } from "@/lib/format";

type MonthlyRevenue = {
  year: number;
  month: number;
  appointmentsTotalCents: number;
  appointmentsCount: number;
  packPaymentsTotalCents: number;
  packPaymentsCount: number;
  totalCents: number;
};

function currentYear(): number {
  return new Date().getFullYear();
}

function currentMonth(): number {
  return new Date().getMonth() + 1;
}

export default function ContabilidadPage() {
  const [year, setYear] = useState(currentYear());
  const [month, setMonth] = useState(currentMonth());
  const [revenue, setRevenue] = useState<MonthlyRevenue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reports/monthly-revenue?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => setRevenue(data.revenue ?? null))
      .finally(() => setLoading(false));
  }, [year, month]);

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear() - 4 + i);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-cocoa">Contabilidad</h1>
        <p className="mt-1 text-sm text-taupe">
          Ingresos mensuales en base a los turnos realizados y los pagos de
          packs cobrados.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-taupe mb-1">Mes</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-taupe/30 px-3 py-1.5 text-sm"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-taupe mb-1">Año</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-taupe/30 px-3 py-1.5 text-sm"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading || !revenue ? (
        <p className="text-taupe text-sm">Cargando…</p>
      ) : (
        <>
          <div className="rounded-xl border border-nude bg-white p-6 text-center">
            <p className="text-sm text-taupe">
              Ingresos de {MONTH_NAMES[revenue.month - 1]} {revenue.year}
            </p>
            <p className="mt-2 text-3xl font-semibold text-cocoa">
              {formatPrice(revenue.totalCents)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-nude bg-white p-4">
              <p className="text-sm text-taupe">Turnos realizados</p>
              <p className="mt-1 text-xl font-semibold text-cocoa">
                {formatPrice(revenue.appointmentsTotalCents)}
              </p>
              <p className="mt-1 text-xs text-taupe">
                {revenue.appointmentsCount} turno
                {revenue.appointmentsCount === 1 ? "" : "s"} completado
                {revenue.appointmentsCount === 1 ? "" : "s"} (sin pack)
              </p>
            </div>
            <div className="rounded-xl border border-nude bg-white p-4">
              <p className="text-sm text-taupe">Pagos de packs</p>
              <p className="mt-1 text-xl font-semibold text-cocoa">
                {formatPrice(revenue.packPaymentsTotalCents)}
              </p>
              <p className="mt-1 text-xs text-taupe">
                {revenue.packPaymentsCount} pago
                {revenue.packPaymentsCount === 1 ? "" : "s"} registrado
                {revenue.packPaymentsCount === 1 ? "" : "s"} este mes
              </p>
            </div>
          </div>

          <p className="text-xs text-taupe">
            Los turnos cancelados o pendientes no se cuentan. Las sesiones
            de un pack no suman su precio individualmente (ya están
            representadas por los pagos del pack), para no contar el valor
            del pack más de una vez.
          </p>
        </>
      )}
    </div>
  );
}
