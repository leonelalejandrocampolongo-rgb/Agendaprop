"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatDateLong, formatPrice } from "@/lib/format";

type PackListItem = {
  id: string;
  name: string;
  clientName: string;
  sessionsCount: number;
  completedSessions: number;
  totalPriceCents: number;
  paidCents: number;
  balanceCents: number;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  sessions: { date: string; startTime: string; status: string }[];
};

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "ACTIVE", label: "Activos" },
  { value: "COMPLETED", label: "Completados" },
  { value: "CANCELLED", label: "Cancelados" },
];

function nextSession(pack: PackListItem) {
  const today = new Date().toISOString().slice(0, 10);
  return pack.sessions
    .filter((s) => s.status !== "CANCELLED" && s.status !== "COMPLETED" && s.date >= today)
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))[0];
}

export default function PacksPage() {
  const [packs, setPacks] = useState<PackListItem[] | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/packs?${params}`);
    const data = await res.json();
    setPacks(data.packs ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-cocoa">Packs</h1>
        <Link
          href="/admin/packs/nuevo"
          className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-white hover:bg-gold-dark"
        >
          Crear pack manualmente
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-taupe mb-1">Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-taupe/30 px-3 py-1.5 text-sm"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {packs === null ? (
        <p className="text-taupe text-sm">Cargando…</p>
      ) : packs.length === 0 ? (
        <p className="text-taupe text-sm">No hay packs para mostrar.</p>
      ) : (
        <ul className="divide-y divide-nude rounded-xl border border-nude bg-white">
          {packs.map((pack) => {
            const next = nextSession(pack);
            return (
              <li key={pack.id}>
                <Link
                  href={`/admin/packs/${pack.id}`}
                  className="px-4 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-nude/40 block"
                >
                  <div>
                    <p className="font-medium text-cocoa">
                      {pack.clientName} · {pack.name}
                    </p>
                    <p className="text-sm text-taupe">
                      Progreso: {pack.completedSessions}/{pack.sessionsCount}
                      {next && ` · Próxima sesión: ${formatDateLong(next.date)} ${next.startTime} hs`}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={pack.status} />
                    <p className="text-xs text-taupe mt-1">
                      {formatPrice(pack.paidCents)} / {formatPrice(pack.totalPriceCents)}
                      {pack.balanceCents > 0 && (
                        <> · saldo {formatPrice(pack.balanceCents)}</>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
