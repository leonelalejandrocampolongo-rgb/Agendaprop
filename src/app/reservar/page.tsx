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
  isPack?: boolean;
  packSessionsCount?: number | null;
};

type Slot = { start: string; end: string };

type PublicSettings = {
  businessName: string;
  depositAlias: string;
  depositAccountHolder: string;
  depositWhatsappNumber: string;
  businessAddress: string;
};

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
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  const minDate = todayDateString();

  useEffect(() => {
    fetch("/api/public/services")
      .then((r) => r.json())
      .then((data) => setServices(data.services ?? []))
      .catch(() => setServices([]));
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((data) => setSettings(data.settings ?? null))
      .catch(() => setSettings(null));
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

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedServiceId || !date || !selectedSlot) return;
    setShowDepositModal(true);
  }

  async function submitAppointment() {
    if (!selectedServiceId || !date || !selectedSlot) return;

    setShowDepositModal(false);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        selectedService?.isPack ? "/api/public/packs" : "/api/public/appointments",
        {
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
        },
      );

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
        <div className="rounded-2xl border border-dustypink/40 bg-champagne p-8">
          <h1 className="text-2xl font-semibold text-cocoa">
            {selectedService.isPack ? "¡Pack solicitado!" : "¡Turno reservado!"}
          </h1>
          <p className="mt-3 text-taupe">
            {selectedService.isPack
              ? "Te esperamos para tu primera sesión de "
              : "Te esperamos para tu turno de "}
            <strong>{selectedService.name}</strong>
            {selectedService.isPack && ` (1/${selectedService.packSessionsCount})`}
          </p>
          <p className="mt-1 text-taupe">
            {formatDateLong(date)}, {selectedSlot.start} hs
          </p>
          <p className="mt-4 text-sm text-taupe">
            {selectedService.isPack
              ? "Te vamos a confirmar el pack y tu primera sesión a la brevedad."
              : "Te vamos a confirmar el turno a la brevedad."}{" "}
            Si necesitás cancelar o reprogramar, contactanos.
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
              className="inline-block mt-4 text-sm text-gold-dark hover:underline"
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
      <Link href="/" className="text-sm text-gold-dark hover:underline">
        ← Volver
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-cocoa">
        Reservar turno
      </h1>

      <form onSubmit={handleFormSubmit} className="mt-8 space-y-8">
        <fieldset>
          <legend className="font-medium text-cocoa mb-3">
            1. Elegí un servicio
          </legend>
          {services === null ? (
            <p className="text-taupe text-sm">Cargando servicios…</p>
          ) : services.length === 0 ? (
            <p className="text-taupe text-sm">
              No hay servicios disponibles por el momento.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <label
                  key={service.id}
                  className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                    selectedServiceId === service.id
                      ? "border-gold bg-nude"
                      : "border-nude bg-white hover:border-gold-light"
                  }`}
                >
                  <input
                    type="radio"
                    name="service"
                    className="sr-only"
                    checked={selectedServiceId === service.id}
                    onChange={() => setSelectedServiceId(service.id)}
                  />
                  <p className="font-medium text-cocoa">
                    {service.name}
                    {service.isPack && (
                      <span className="ml-2 text-xs rounded-full bg-champagne text-cocoa px-2 py-0.5 align-middle">
                        Pack x{service.packSessionsCount}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-taupe">
                    {formatDuration(service.durationMinutes)} ·{" "}
                    {formatPrice(service.priceCents)}
                    {service.isPack && " (pack completo)"}
                  </p>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {selectedServiceId && (
          <fieldset>
            <legend className="font-medium text-cocoa mb-3">
              2. Elegí la fecha {selectedService?.isPack ? "de tu primera sesión" : ""}
            </legend>
            <input
              type="date"
              required
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-taupe/30 px-3 py-2 text-cocoa"
            />
          </fieldset>
        )}

        {selectedServiceId && date && (
          <fieldset>
            <legend className="font-medium text-cocoa mb-3">
              3. Elegí un horario
            </legend>
            {loadingSlots ? (
              <p className="text-taupe text-sm">Buscando horarios…</p>
            ) : slots && slots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.start}
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      selectedSlot?.start === slot.start
                        ? "border-gold bg-gold text-white"
                        : "border-taupe/30 bg-white text-cocoa hover:border-gold-light"
                    }`}
                  >
                    {slot.start}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-taupe text-sm">
                No hay horarios disponibles ese día. Probá con otra fecha.
              </p>
            )}
          </fieldset>
        )}

        {selectedSlot && (
          <fieldset className="space-y-4">
            <legend className="font-medium text-cocoa mb-1">
              4. Tus datos
            </legend>
            <div>
              <label className="block text-sm text-taupe mb-1">
                Nombre y apellido
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-lg border border-taupe/30 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-taupe mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full rounded-lg border border-taupe/30 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-taupe mb-1">
                Email (opcional)
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full rounded-lg border border-taupe/30 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-taupe mb-1">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-taupe/30 px-3 py-2"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-gold px-6 py-3 text-white font-medium hover:bg-gold-dark disabled:opacity-60"
            >
              {submitting ? "Reservando…" : "Confirmar turno"}
            </button>
          </fieldset>
        )}
      </form>

      {showDepositModal && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-cocoa">
              {selectedService?.isPack ? "Confirmación de tu pack" : "Confirmación de tu turno"}
            </h2>

            {selectedService?.isPack ? (
              <>
                <p className="mt-3 text-sm text-taupe">
                  Pack x{selectedService.packSessionsCount}:{" "}
                  <strong>{formatPrice(selectedService.priceCents)}</strong>
                </p>
                <p className="text-sm text-taupe">
                  Pago inicial 50%:{" "}
                  <strong>{formatPrice(selectedService.priceCents / 2)}</strong>
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-taupe">
                Para reservar tu turno se solicita una seña del 50% del valor
                del servicio
                {selectedService && (
                  <>
                    {" "}
                    (<strong>{formatPrice(selectedService.priceCents / 2)}</strong>)
                  </>
                )}
                .
              </p>
            )}

            <div className="mt-4 rounded-xl bg-nude p-4 text-sm text-cocoa">
              <p>
                <strong>Alias:</strong> {settings?.depositAlias}
              </p>
              <p>
                <strong>Titular:</strong> {settings?.depositAccountHolder}
              </p>
            </div>

            <p className="mt-4 text-sm text-taupe">
              Una vez realizada la transferencia, enviame el comprobante por
              WhatsApp al <strong>{settings?.depositWhatsappNumber}</strong>.
            </p>
            {selectedService?.isPack ? (
              <>
                <p className="mt-2 text-sm text-taupe">
                  Tu primera sesión quedará pendiente de confirmación hasta
                  que recibamos el comprobante. Una vez confirmado el pack,
                  coordinaremos las sesiones restantes.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-taupe">
                Tu turno quedará pendiente de confirmación hasta recibir la
                seña.
              </p>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={submitAppointment}
                disabled={submitting}
                className="w-full rounded-full bg-gold px-6 py-3 text-white font-medium hover:bg-gold-dark disabled:opacity-60"
              >
                {submitting ? "Reservando…" : "Continuar con la reserva"}
              </button>
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                disabled={submitting}
                className="w-full rounded-full px-6 py-2 text-sm text-taupe hover:underline disabled:opacity-60"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
