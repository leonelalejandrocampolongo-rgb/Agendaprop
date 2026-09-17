"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { formatDateLong, formatPrice } from "@/lib/format";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type Appointment = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  notes: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  service: { name: string; priceCents: number } | null;
};

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "CONFIRMED", label: "Confirmados" },
  { value: "COMPLETED", label: "Completados" },
  { value: "CANCELLED", label: "Cancelados" },
];

export default function TurnosPage() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(
    null,
  );
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/appointments?${params}`);
    const data = await res.json();
    setAppointments(data.appointments ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, statusFilter]);

  async function updateStatus(id: string, status: Appointment["status"]) {
    setUpdatingId(id);
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setUpdatingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Turnos</h1>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Fecha</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        {dateFilter && (
          <button
            onClick={() => setDateFilter("")}
            className="text-sm text-rose-700 hover:underline"
          >
            Limpiar fecha
          </button>
        )}
      </div>

      {appointments === null ? (
        <p className="text-stone-500 text-sm">Cargando…</p>
      ) : appointments.length === 0 ? (
        <p className="text-stone-500 text-sm">No hay turnos para mostrar.</p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {appointments.map((a) => (
            <li key={a.id} className="px-4 py-4 flex flex-wrap items-center gap-4 justify-between">
              <div>
                <p className="font-medium text-stone-900">
                  {a.date} · {a.startTime}–{a.endTime}
                </p>
                <p className="text-sm text-stone-600">
                  {a.service?.name ?? "Servicio eliminado"}
                  {a.service && ` · ${formatPrice(a.service.priceCents)}`}
                </p>
                <p className="text-sm text-stone-500 mt-0.5">
                  {a.clientName} · {a.clientPhone}
                  {a.clientEmail && ` · ${a.clientEmail}`}
                </p>
                {a.notes && (
                  <p className="text-sm text-stone-400 mt-0.5 italic">
                    &ldquo;{a.notes}&rdquo;
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={a.status} />
                <select
                  value={a.status}
                  disabled={updatingId === a.id}
                  onChange={(e) =>
                    updateStatus(a.id, e.target.value as Appointment["status"])
                  }
                  className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm disabled:opacity-50"
                >
                  <option value="PENDING">Pendiente</option>
                  <option value="CONFIRMED">Confirmado</option>
                  <option value="COMPLETED">Completado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
                <a
                  href={buildWhatsAppLink(a.clientPhone, whatsappMessageFor(a))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50"
                >
                  WhatsApp
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function whatsappMessageFor(a: Appointment): string {
  const when = `${formatDateLong(a.date)} a las ${a.startTime} hs`;
  const service = a.service?.name ?? "tu turno";

  if (a.status === "CANCELLED") {
    return `Hola ${a.clientName}! Te escribo porque tu turno de ${service} del ${when} quedó cancelado. Si querés reprogramarlo, contame.`;
  }
  return `Hola ${a.clientName}! Te confirmo tu turno de ${service} el ${when}. ¡Te esperamos!`;
}
