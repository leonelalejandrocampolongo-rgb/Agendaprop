"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PAYMENT_METHODS = [
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CASH", label: "Efectivo" },
  { value: "MERCADOPAGO", label: "Mercado Pago" },
  { value: "OTHER", label: "Otro" },
];

export default function TurnoPersonalizadoPage() {
  const router = useRouter();

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [treatmentName, setTreatmentName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [isPack, setIsPack] = useState(false);

  // turno único
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [status, setStatus] = useState("CONFIRMED");
  const [depositPaid, setDepositPaid] = useState("");

  // pack
  const [sessionsCount, setSessionsCount] = useState("4");
  const [totalPrice, setTotalPrice] = useState("");
  const [paid, setPaid] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("TRANSFER");
  const [packStatus, setPackStatus] = useState<"PENDING" | "ACTIVE">("ACTIVE");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clientName.trim() || !clientPhone.trim()) {
      setError("Completá el nombre y teléfono de la clienta.");
      return;
    }
    if (!treatmentName.trim()) {
      setError("Ingresá el nombre del tratamiento personalizado.");
      return;
    }
    const durationNumber = Number(durationMinutes);
    if (!Number.isFinite(durationNumber) || durationNumber < 5) {
      setError("Revisá la duración.");
      return;
    }

    const payload: Record<string, unknown> = {
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim() || undefined,
      treatmentName: treatmentName.trim(),
      description: description.trim() || undefined,
      durationMinutes: durationNumber,
      isPack,
    };

    if (isPack) {
      const totalPriceNumber = Number(totalPrice.replace(",", "."));
      const paidNumber = paid.trim() ? Number(paid.replace(",", ".")) : 0;
      const sessionsNumber = Number(sessionsCount);
      if (!Number.isFinite(totalPriceNumber) || totalPriceNumber <= 0) {
        setError("Revisá el precio total del pack.");
        return;
      }
      if (!Number.isInteger(sessionsNumber) || sessionsNumber < 1) {
        setError("Revisá la cantidad de sesiones.");
        return;
      }
      if (paidNumber > totalPriceNumber) {
        setError("El monto ya abonado no puede superar el precio total.");
        return;
      }
      payload.sessionsCount = sessionsNumber;
      payload.totalPriceCents = Math.round(totalPriceNumber * 100);
      payload.paidCents = paidNumber > 0 ? Math.round(paidNumber * 100) : undefined;
      payload.paymentDate = paidNumber > 0 ? paymentDate : undefined;
      payload.paymentMethod = paidNumber > 0 ? paymentMethod : undefined;
      payload.packStatus = packStatus;
    } else {
      const priceNumber = Number(price.replace(",", "."));
      const depositNumber = depositPaid.trim() ? Number(depositPaid.replace(",", ".")) : 0;
      if (!Number.isFinite(priceNumber) || priceNumber < 0) {
        setError("Revisá el precio.");
        return;
      }
      if (!date || !startTime) {
        setError("Elegí fecha y horario.");
        return;
      }
      payload.priceCents = Math.round(priceNumber * 100);
      payload.date = date;
      payload.startTime = startTime;
      payload.status = status;
      payload.depositPaidCents = depositNumber > 0 ? Math.round(depositNumber * 100) : undefined;
    }

    setSaving(true);
    const res = await fetch("/api/admin/appointments/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "No se pudo crear el turno.");
      return;
    }

    const data = await res.json();
    if (data.kind === "pack") {
      router.push(`/admin/packs/${data.pack.id}`);
    } else {
      router.push(`/admin/turnos?date=${date}`);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/admin/turnos" className="text-sm text-gold-dark hover:underline">
          ← Volver a Turnos
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-cocoa">Crear turno personalizado</h1>
        <p className="mt-1 text-sm text-taupe">
          Para tratamientos armados para una clienta puntual, que no forman
          parte del catálogo público. No aparece en la web ni puede
          reservarse desde ahí.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-nude bg-white p-5 space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ct-client-name" className="block text-sm text-taupe mb-1">Cliente</label>
            <input
              id="ct-client-name"
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="ct-client-phone" className="block text-sm text-taupe mb-1">Teléfono</label>
            <input
              id="ct-client-phone"
              type="tel"
              required
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ct-client-email" className="block text-sm text-taupe mb-1">Email (opcional)</label>
            <input
              id="ct-client-email"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="ct-treatment-name" className="block text-sm text-taupe mb-1">
              Nombre del tratamiento personalizado
            </label>
            <input
              id="ct-treatment-name"
              type="text"
              required
              placeholder="Personalizado – Masaje de espalda + Maderoterapia"
              value={treatmentName}
              onChange={(e) => setTreatmentName(e.target.value)}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ct-description" className="block text-sm text-taupe mb-1">
              Descripción / notas internas (opcional)
            </label>
            <textarea
              id="ct-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="ct-duration" className="block text-sm text-taupe mb-1">Duración (minutos)</label>
            <input
              id="ct-duration"
              type="number"
              required
              min={5}
              step={5}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="ct-is-pack"
              checked={isPack}
              onChange={(e) => setIsPack(e.target.checked)}
              className="rounded border-taupe/30"
            />
            <label htmlFor="ct-is-pack" className="text-sm text-taupe">
              Convertir en pack / Es un pack
            </label>
          </div>

          {isPack ? (
            <>
              <div>
                <label htmlFor="ct-sessions-count" className="block text-sm text-taupe mb-1">
                  Cantidad de sesiones
                </label>
                <input
                  id="ct-sessions-count"
                  type="number"
                  required
                  min={1}
                  value={sessionsCount}
                  onChange={(e) => setSessionsCount(e.target.value)}
                  className="w-full rounded-lg border border-taupe/30 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="ct-total-price" className="block text-sm text-taupe mb-1">
                  Precio total del pack ($)
                </label>
                <input
                  id="ct-total-price"
                  type="text"
                  inputMode="decimal"
                  required
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  className="w-full rounded-lg border border-taupe/30 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="ct-paid" className="block text-sm text-taupe mb-1">Ya abonado ($)</label>
                <input
                  id="ct-paid"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                  className="w-full rounded-lg border border-taupe/30 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="ct-pack-status" className="block text-sm text-taupe mb-1">Estado del pack</label>
                <select
                  id="ct-pack-status"
                  value={packStatus}
                  onChange={(e) => setPackStatus(e.target.value as "PENDING" | "ACTIVE")}
                  className="w-full rounded-lg border border-taupe/30 px-3 py-2"
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="PENDING">Pendiente</option>
                </select>
              </div>
              {Number(paid.replace(",", ".")) > 0 && (
                <>
                  <div>
                    <label htmlFor="ct-payment-date" className="block text-sm text-taupe mb-1">Fecha del pago</label>
                    <input
                      id="ct-payment-date"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full rounded-lg border border-taupe/30 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label htmlFor="ct-payment-method" className="block text-sm text-taupe mb-1">Método de pago</label>
                    <select
                      id="ct-payment-method"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-lg border border-taupe/30 px-3 py-2"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <p className="sm:col-span-2 text-xs text-taupe">
                Se crea el pack; después agendás cada sesión desde el detalle
                del pack, igual que con cualquier otro pack.
              </p>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="ct-price" className="block text-sm text-taupe mb-1">Precio ($)</label>
                <input
                  id="ct-price"
                  type="text"
                  inputMode="decimal"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-lg border border-taupe/30 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="ct-deposit-paid" className="block text-sm text-taupe mb-1">
                  Monto abonado (opcional)
                </label>
                <input
                  id="ct-deposit-paid"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={depositPaid}
                  onChange={(e) => setDepositPaid(e.target.value)}
                  className="w-full rounded-lg border border-taupe/30 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="ct-date" className="block text-sm text-taupe mb-1">Fecha</label>
                <input
                  id="ct-date"
                  type="date"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-taupe/30 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="ct-start-time" className="block text-sm text-taupe mb-1">Horario</label>
                <input
                  id="ct-start-time"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-taupe/30 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="ct-status" className="block text-sm text-taupe mb-1">Estado del turno</label>
                <select
                  id="ct-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-taupe/30 px-3 py-2"
                >
                  <option value="CONFIRMED">Confirmado</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="COMPLETED">Completado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>
            </>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-white hover:bg-gold-dark disabled:opacity-60"
        >
          {saving ? "Creando…" : "Crear turno personalizado"}
        </button>
      </form>
    </div>
  );
}
