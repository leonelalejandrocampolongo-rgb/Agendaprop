"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Service = {
  id: string;
  name: string;
  isPack?: boolean;
  packSessionsCount?: number | null;
  priceCents: number;
  active: boolean;
};

const PAYMENT_METHODS = [
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CASH", label: "Efectivo" },
  { value: "MERCADOPAGO", label: "Mercado Pago" },
  { value: "OTHER", label: "Otro" },
];

export default function NuevoPackPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[] | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [sessionsCount, setSessionsCount] = useState("4");
  const [price, setPrice] = useState("");
  const [paid, setPaid] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("TRANSFER");
  const [status, setStatus] = useState<"PENDING" | "ACTIVE">("ACTIVE");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/services")
      .then((r) => r.json())
      .then((data) => {
        const list: Service[] = data.services ?? [];
        setServices(list);
        const firstPack = list.find((s) => s.isPack && s.active);
        if (firstPack) {
          setServiceId(firstPack.id);
          setSessionsCount(String(firstPack.packSessionsCount ?? 4));
          setPrice(String(firstPack.priceCents / 100));
        }
      });
  }, []);

  function onServiceChange(id: string) {
    setServiceId(id);
    const service = services?.find((s) => s.id === id);
    if (service) {
      if (service.packSessionsCount) setSessionsCount(String(service.packSessionsCount));
      setPrice(String(service.priceCents / 100));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceNumber = Number(price.replace(",", "."));
    const paidNumber = paid.trim() ? Number(paid.replace(",", ".")) : 0;
    const sessionsNumber = Number(sessionsCount);

    if (!serviceId) {
      setError("Elegí un servicio.");
      return;
    }
    if (!clientName.trim() || !clientPhone.trim()) {
      setError("Completá el nombre y teléfono de la clienta.");
      return;
    }
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      setError("Revisá el precio total.");
      return;
    }
    if (!Number.isFinite(paidNumber) || paidNumber < 0) {
      setError("Revisá el monto ya abonado.");
      return;
    }
    if (paidNumber > priceNumber) {
      setError("El monto ya abonado no puede superar el precio total.");
      return;
    }
    if (!Number.isInteger(sessionsNumber) || sessionsNumber < 1) {
      setError("Revisá la cantidad de sesiones.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/admin/packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        sessionsCount: sessionsNumber,
        totalPriceCents: Math.round(priceNumber * 100),
        paidCents: paidNumber > 0 ? Math.round(paidNumber * 100) : undefined,
        paymentDate: paidNumber > 0 ? paymentDate : undefined,
        paymentMethod: paidNumber > 0 ? paymentMethod : undefined,
        status,
        notes: notes.trim() || undefined,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "No se pudo crear el pack.");
      return;
    }

    const data = await res.json();
    router.push(`/admin/packs/${data.pack.id}`);
  }

  const packServices = services?.filter((s) => s.isPack) ?? [];

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/admin/packs" className="text-sm text-gold-dark hover:underline">
          ← Volver a Packs
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-cocoa">Crear pack manualmente</h1>
        <p className="mt-1 text-sm text-taupe">
          Para cargar una clienta que ya contrató un pack por WhatsApp.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-nude bg-white p-5 space-y-4"
      >
        <div>
          <label htmlFor="pack-service" className="block text-sm text-taupe mb-1">Servicio</label>
          {services === null ? (
            <p className="text-sm text-taupe">Cargando…</p>
          ) : packServices.length === 0 ? (
            <p className="text-sm text-taupe">
              No hay servicios marcados como pack todavía. Creá uno en{" "}
              <Link href="/admin/servicios" className="text-gold-dark hover:underline">
                Servicios
              </Link>
              .
            </p>
          ) : (
            <select
              id="pack-service"
              required
              value={serviceId}
              onChange={(e) => onServiceChange(e.target.value)}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            >
              <option value="" disabled>
                Elegí un servicio
              </option>
              {packServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (x{s.packSessionsCount})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pack-client-name" className="block text-sm text-taupe mb-1">Cliente</label>
            <input
              id="pack-client-name"
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="pack-client-phone" className="block text-sm text-taupe mb-1">Teléfono</label>
            <input
              id="pack-client-phone"
              type="tel"
              required
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="pack-client-email" className="block text-sm text-taupe mb-1">Email (opcional)</label>
            <input
              id="pack-client-email"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="pack-sessions-count" className="block text-sm text-taupe mb-1">Cantidad de sesiones</label>
            <input
              id="pack-sessions-count"
              type="number"
              required
              min={1}
              value={sessionsCount}
              onChange={(e) => setSessionsCount(e.target.value)}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="pack-price" className="block text-sm text-taupe mb-1">Precio total ($)</label>
            <input
              id="pack-price"
              type="text"
              inputMode="decimal"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="pack-paid" className="block text-sm text-taupe mb-1">Ya abonado ($)</label>
            <input
              id="pack-paid"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          {Number(paid.replace(",", ".")) > 0 && (
            <>
              <div>
                <label htmlFor="pack-payment-date" className="block text-sm text-taupe mb-1">Fecha del pago</label>
                <input
                  id="pack-payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-lg border border-taupe/30 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="pack-payment-method" className="block text-sm text-taupe mb-1">Método de pago</label>
                <select
                  id="pack-payment-method"
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
          <div>
            <label htmlFor="pack-status" className="block text-sm text-taupe mb-1">Estado</label>
            <select
              id="pack-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "PENDING" | "ACTIVE")}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            >
              <option value="ACTIVE">Activo</option>
              <option value="PENDING">Pendiente</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="pack-notes" className="block text-sm text-taupe mb-1">Notas (opcional)</label>
            <textarea
              id="pack-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving || packServices.length === 0}
          className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-white hover:bg-gold-dark disabled:opacity-60"
        >
          {saving ? "Creando…" : "Crear pack"}
        </button>
      </form>
    </div>
  );
}
