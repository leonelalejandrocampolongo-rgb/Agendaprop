"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  archivedAt: string | null;
  depositPaidCents: number | null;
  service: { name: string; priceCents: number } | null;
};

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "CONFIRMED", label: "Confirmados" },
  { value: "COMPLETED", label: "Completados" },
  { value: "CANCELLED", label: "Cancelados" },
];

const VIEW_FILTERS = [
  { value: "", label: "Activos" },
  { value: "true", label: "Archivados" },
  { value: "all", label: "Todos" },
];

export default function TurnosPage() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(
    null,
  );
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewFilter, setViewFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (viewFilter) params.set("archived", viewFilter);
    const res = await fetch(`/api/admin/appointments?${params}`);
    const data = await res.json();
    setAppointments(data.appointments ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, statusFilter, viewFilter]);

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

  async function archiveAppointment(id: string) {
    const ok = confirm(
      "¿Querés eliminar este turno de la lista?\n\nEl turno dejará de mostrarse en tu agenda, pero se conservará en el historial.",
    );
    if (!ok) return;
    setUpdatingId(id);
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    await load();
    setUpdatingId(null);
  }

  async function restoreAppointment(id: string) {
    setUpdatingId(id);
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    await load();
    setUpdatingId(null);
  }

  function startReschedule(a: Appointment) {
    setReschedulingId(a.id);
    setRescheduleDate(a.date);
    setRescheduleTime(a.startTime);
    setRescheduleError(null);
  }

  async function saveReschedule(id: string) {
    if (!rescheduleDate || !rescheduleTime) return;
    setUpdatingId(id);
    setRescheduleError(null);
    const res = await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: rescheduleDate, startTime: rescheduleTime }),
    });
    setUpdatingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setRescheduleError(data?.error || "No se pudo reprogramar el turno.");
      return;
    }
    setReschedulingId(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-cocoa">Turnos</h1>
        <Link
          href="/admin/turnos/personalizado"
          className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-white hover:bg-gold-dark"
        >
          Crear turno personalizado
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-taupe mb-1">Fecha</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-taupe/30 px-3 py-1.5 text-sm"
          />
        </div>
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
        <div>
          <label className="block text-xs text-taupe mb-1">Mostrar</label>
          <select
            value={viewFilter}
            onChange={(e) => setViewFilter(e.target.value)}
            className="rounded-lg border border-taupe/30 px-3 py-1.5 text-sm"
          >
            {VIEW_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        {dateFilter && (
          <button
            onClick={() => setDateFilter("")}
            className="text-sm text-gold-dark hover:underline"
          >
            Limpiar fecha
          </button>
        )}
      </div>

      {appointments === null ? (
        <p className="text-taupe text-sm">Cargando…</p>
      ) : appointments.length === 0 ? (
        <p className="text-taupe text-sm">No hay turnos para mostrar.</p>
      ) : (
        <ul className="divide-y divide-nude rounded-xl border border-nude bg-white">
          {appointments.map((a) => (
            <li key={a.id} className="px-4 py-4 space-y-3">
              <div className="flex flex-wrap items-center gap-4 justify-between">
                <div>
                  <p className="font-medium text-cocoa">
                    {a.date} · {a.startTime}–{a.endTime}
                  </p>
                  <p className="text-sm text-taupe">
                    {a.service?.name ?? "Servicio eliminado"}
                    {a.service && ` · ${formatPrice(a.service.priceCents)}`}
                    {a.depositPaidCents != null && ` · Abonado: ${formatPrice(a.depositPaidCents)}`}
                  </p>
                  <p className="text-sm text-taupe mt-0.5">
                    {a.clientName} · {a.clientPhone}
                    {a.clientEmail && ` · ${a.clientEmail}`}
                  </p>
                  {a.notes && (
                    <p className="text-sm text-taupe mt-0.5 italic">
                      &ldquo;{a.notes}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={a.status} />
                  {a.archivedAt ? (
                    <button
                      onClick={() => restoreAppointment(a.id)}
                      disabled={updatingId === a.id}
                      className="rounded-full border border-gold/50 px-3 py-1.5 text-sm text-gold-dark hover:bg-nude disabled:opacity-50"
                    >
                      Restaurar
                    </button>
                  ) : (
                    <>
                      <select
                        value={a.status}
                        disabled={updatingId === a.id}
                        onChange={(e) =>
                          updateStatus(a.id, e.target.value as Appointment["status"])
                        }
                        className="rounded-lg border border-taupe/30 px-2 py-1.5 text-sm disabled:opacity-50"
                      >
                        <option value="PENDING">Pendiente</option>
                        <option value="CONFIRMED">Confirmado</option>
                        <option value="COMPLETED">Completado</option>
                        <option value="CANCELLED">Cancelado</option>
                      </select>
                      <button
                        onClick={() => startReschedule(a)}
                        disabled={updatingId === a.id}
                        className="rounded-full border border-taupe/30 px-3 py-1.5 text-sm text-taupe hover:border-gold-light disabled:opacity-50"
                      >
                        Reprogramar
                      </button>
                      <a
                        href={buildWhatsAppLink(a.clientPhone, whatsappMessageFor(a))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50"
                      >
                        WhatsApp
                      </a>
                      {a.status === "CANCELLED" && (
                        <button
                          onClick={() => archiveAppointment(a.id)}
                          disabled={updatingId === a.id}
                          className="rounded-full border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          🗑 Eliminar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {reschedulingId === a.id && (
                <div className="flex flex-wrap items-end gap-2 rounded-lg bg-nude/50 p-3">
                  <div>
                    <label className="block text-xs text-taupe mb-1">Nueva fecha</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="rounded-lg border border-taupe/30 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-taupe mb-1">Nuevo horario</label>
                    <input
                      type="time"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="rounded-lg border border-taupe/30 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => saveReschedule(a.id)}
                    disabled={updatingId === a.id}
                    className="rounded-full bg-gold px-4 py-1.5 text-sm font-medium text-white hover:bg-gold-dark disabled:opacity-60"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setReschedulingId(null)}
                    className="rounded-full border border-taupe/30 px-4 py-1.5 text-sm text-taupe"
                  >
                    Cancelar
                  </button>
                  {rescheduleError && (
                    <p className="w-full text-sm text-red-600">{rescheduleError}</p>
                  )}
                </div>
              )}
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
