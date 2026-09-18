"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDateLong, formatDuration, formatPrice } from "@/lib/format";
import { BUSINESS_WHATSAPP_NUMBER, buildWhatsAppLink } from "@/lib/whatsapp";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
};

type Slot = { start: string; end: string };

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function ReservarPage() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [date, setDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const minDate = todayDateString();

  useEffect(() => {
    fetch("/api/public/services")
      .then((r) => r.json())
      .then((data) => setServices(data.services ?? []))
      .catch(() => setServices([]));
  }, []);

  const selectedService = useMemo(
    () => services?.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  useEffect(() => {
    setSlots(null);
    setSelectedSlot(null);
    if (!selectedServiceId || !date) return;

    setLoadingSlots(true);
    const params = new URLSearchParams({ serviceId: selectedServiceId, date });
    fetch(`/api/public/availability?${params}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedServiceId, date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedServiceId || !date || !selectedSlot) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          date,
          startTime: selectedSlot.start,
          clientName,
          clientPhone,
          clientEmail: clientEmail || undefined,
          notes: notes || undefined,
        }),
      });

      if (res.status === 409) {
        setError("Ese horario ya no está disponible, elegí otro.");
        setSelectedSlot(null);
        const params = new URLSearchParams({
          serviceId: selectedServiceId,
          date,
        });
        const slotsRes = await fetch(`/api/public/availability?${params}`);
        const slotsData = await slotsRes.json();
        setSlots(slotsData.slots ?? []);
        return;
      }

      if (!res.ok) {
        setError("No pudimos registrar el turno. Intentá de nuevo.");
        return;
      }

      setConfirmed(true);
    } catch {
      setError("No pudimos registrar el turno. Revisá tu conexión.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed && selectedService && selectedSlot) {
    return (
      <main className="flex-1 mx-auto max-w-lg px-6 py-16 text-center">
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-8">
          <h1 className="text-2xl font-semibold text-stone-900">
            ¡Turno reservado!
          </h1>
          <p className="mt-3 text-stone-600">
            Te esperamos para tu turno de{" "}
            <strong>{selectedService.name}</strong>
          </p>
          <p className="mt-1 text-stone-600">
            {formatDateLong(date)}, {selectedSlot.start} hs
          </p>
          <p className="mt-4 text-sm text-stone-500">
            Te vamos a confirmar el turno a la brevedad. Si necesitás
            cancelar o reprogramar, contactanos.
          </p>

          {BUSINESS_WHATSAPP_NUMBER && (
            <a
              href={buildWhatsAppLink(
                BUSINESS_WHATSAPP_NUMBER,
                `Hola! Soy ${clientName || "una clienta"} y acabo de reservar un turno de ${selectedService.name} para el ${formatDateLong(date)} a las ${selectedSlot.start} hs. ¡Gracias!`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-6 rounded-full bg-emerald-600 px-6 py-2.5 text-white text-sm font-medium hover:bg-emerald-700"
            >
              Avisar por WhatsApp
            </a>
          )}

          <div>
            <Link
              href="/"
              className="inline-block mt-4 text-sm text-amber-700 hover:underline"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 mx-auto max-w-2xl w-full px-6 py-12">
      <Link href="/" className="text-sm text-amber-700 hover:underline">
        ← Volver
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-stone-900">
        Reservar turno
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <fieldset>
          <legend className="font-medium text-stone-900 mb-3">
            1. Elegí un servicio
          </legend>
          {services === null ? (
            <p className="text-stone-500 text-sm">Cargando servicios…</p>
          ) : services.length === 0 ? (
            <p className="text-stone-500 text-sm">
              No hay servicios disponibles por el momento.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <label
                  key={service.id}
                  className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                    selectedServiceId === service.id
                      ? "border-amber-600 bg-amber-50"
                      : "border-stone-200 bg-white hover:border-amber-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="service"
                    className="sr-only"
                    checked={selectedServiceId === service.id}
                    onChange={() => setSelectedServiceId(service.id)}
                  />
                  <p className="font-medium text-stone-900">
                    {service.name}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    {formatDuration(service.durationMinutes)} ·{" "}
                    {formatPrice(service.priceCents)}
                  </p>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {selectedServiceId && (
          <fieldset>
            <legend className="font-medium text-stone-900 mb-3">
              2. Elegí una fecha
            </legend>
            <input
              type="date"
              required
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-stone-900"
            />
          </fieldset>
        )}

        {selectedServiceId && date && (
          <fieldset>
            <legend className="font-medium text-stone-900 mb-3">
              3. Elegí un horario
            </legend>
            {loadingSlots ? (
              <p className="text-stone-500 text-sm">Buscando horarios…</p>
            ) : slots && slots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.start}
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      selectedSlot?.start === slot.start
                        ? "border-amber-600 bg-amber-700 text-white"
                        : "border-stone-300 bg-white text-stone-700 hover:border-amber-300"
                    }`}
                  >
                    {slot.start}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-stone-500 text-sm">
                No hay horarios disponibles ese día. Probá con otra fecha.
              </p>
            )}
          </fieldset>
        )}

        {selectedSlot && (
          <fieldset className="space-y-4">
            <legend className="font-medium text-stone-900 mb-1">
              4. Tus datos
            </legend>
            <div>
              <label className="block text-sm text-stone-700 mb-1">
                Nombre y apellido
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-700 mb-1">
                Email (opcional)
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-700 mb-1">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-amber-700 px-6 py-3 text-white font-medium hover:bg-amber-800 disabled:opacity-60"
            >
              {submitting ? "Reservando…" : "Confirmar turno"}
            </button>
          </fieldset>
        )}
      </form>
    </main>
  );
}
