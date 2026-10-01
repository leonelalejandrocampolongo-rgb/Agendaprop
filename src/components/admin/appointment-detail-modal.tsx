"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { formatDateLong, formatPrice } from "@/lib/format";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { CalendarAppointment } from "@/lib/calendar";

type Props = {
  appointment: CalendarAppointment;
  onClose: () => void;
  /** Se llama después de guardar un cambio, para que la vista recargue los turnos. */
  onChanged: () => void;
};

export function AppointmentDetailModal({ appointment, onClose, onChanged }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [date, setDate] = useState(appointment.date);
  const [startTime, setStartTime] = useState(appointment.startTime);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "No se pudo guardar el cambio.");
      return false;
    }
    onChanged();
    return true;
  }

  async function updateStatus(status: CalendarAppointment["status"]) {
    await patch({ status });
  }

  async function saveReschedule() {
    const ok = await patch({ date, startTime });
    if (ok) setRescheduling(false);
  }

  function whatsappMessage(): string {
    const when = `${formatDateLong(appointment.date)} a las ${appointment.startTime} hs`;
    const service = appointment.service?.name ?? "tu turno";
    if (appointment.status === "CANCELLED") {
      return `Hola ${appointment.clientName}! Te escribo porque tu turno de ${service} del ${when} quedó cancelado. Si querés reprogramarlo, contame.`;
    }
    return `Hola ${appointment.clientName}! Te confirmo tu turno de ${service} el ${when}. ¡Te esperamos!`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-cocoa/40 px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-cocoa">{appointment.clientName}</p>
            <p className="text-sm text-taupe">
              {formatDateLong(appointment.date)} · {appointment.startTime}–{appointment.endTime}
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <div className="space-y-1 text-sm text-taupe">
          <p>{appointment.service?.name ?? "Servicio eliminado"}</p>
          {appointment.service && <p>{formatPrice(appointment.service.priceCents)}</p>}
          {appointment.depositPaidCents != null && (
            <p>Abonado: {formatPrice(appointment.depositPaidCents)}</p>
          )}
          <p>
            {appointment.clientPhone}
            {appointment.clientEmail && ` · ${appointment.clientEmail}`}
          </p>
          {appointment.notes && <p className="italic">&ldquo;{appointment.notes}&rdquo;</p>}
        </div>

        {rescheduling ? (
          <div className="space-y-2 rounded-lg bg-nude/50 p-3">
            <div className="flex flex-wrap gap-2">
              <div>
                <label className="block text-xs text-taupe mb-1">Nueva fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-taupe/30 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-taupe mb-1">Nuevo horario</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-lg border border-taupe/30 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveReschedule}
                disabled={saving}
                className="rounded-full bg-gold px-4 py-1.5 text-sm font-medium text-white hover:bg-gold-dark disabled:opacity-60"
              >
                Guardar
              </button>
              <button
                onClick={() => setRescheduling(false)}
                className="rounded-full border border-taupe/30 px-4 py-1.5 text-sm text-taupe"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          !appointment.archivedAt && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={appointment.status}
                disabled={saving}
                onChange={(e) => updateStatus(e.target.value as CalendarAppointment["status"])}
                className="rounded-lg border border-taupe/30 px-2 py-1.5 text-sm disabled:opacity-50"
              >
                <option value="PENDING">Pendiente</option>
                <option value="CONFIRMED">Confirmado</option>
                <option value="COMPLETED">Completado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
              <button
                onClick={() => setRescheduling(true)}
                disabled={saving}
                className="rounded-full border border-taupe/30 px-3 py-1.5 text-sm text-taupe hover:border-gold-light disabled:opacity-50"
              >
                Reprogramar
              </button>
              <a
                href={buildWhatsAppLink(appointment.clientPhone, whatsappMessage())}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50"
              >
                WhatsApp
              </a>
            </div>
          )
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={onClose}
          className="w-full rounded-full border border-taupe/30 px-4 py-2 text-sm text-taupe"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
