"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatDateLong, formatPrice } from "@/lib/format";

type Session = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  packSessionNumber: number | null;
};

type PackDetail = {
  id: string;
  name: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  sessionsCount: number;
  totalPriceCents: number;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  paidCents: number;
  balanceCents: number;
  completedSessions: number;
  activeSessions: number;
  sessions: Session[];
};

type Payment = {
  id: string;
  amountCents: number;
  paymentDate: string;
  method: string;
  notes: string | null;
};

type Slot = { start: string; end: string };

const PAYMENT_METHODS = [
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CASH", label: "Efectivo" },
  { value: "MERCADOPAGO", label: "Mercado Pago" },
  { value: "OTHER", label: "Otro" },
];

const SESSION_STATUS_LABELS: Record<Session["status"], string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

export default function PackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = usePromise(params);

  const [pack, setPack] = useState<PackDetail | null>(null);
  const [service, setService] = useState<{ id: string; name: string } | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("TRANSFER");

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/packs/${id}`);
    if (!res.ok) {
      setPack(null);
      return;
    }
    const data = await res.json();
    setPack(data.pack);
    setService(data.service);
    setPayments(data.payments ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!showScheduleForm || !scheduleDate || !pack) {
      setSlots(null);
      return;
    }
    setLoadingSlots(true);
    const params = new URLSearchParams({ serviceId: service?.id ?? "", date: scheduleDate });
    fetch(`/api/public/availability?${params}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [showScheduleForm, scheduleDate, pack, service]);

  async function registerPayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = Number(paymentAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/packs/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountCents: Math.round(amount * 100),
        paymentDate,
        method: paymentMethod,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "No se pudo registrar el pago.");
      return;
    }
    setPaymentAmount("");
    setShowPaymentForm(false);
    await load();
  }

  async function confirmPack() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/packs/${id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "No se pudo confirmar el pack.");
      return;
    }
    await load();
  }

  async function cancelPack() {
    if (!confirm("¿Cancelar este pack? Se cancelarán también sus sesiones pendientes.")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/packs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("No se pudo cancelar el pack.");
      return;
    }
    await load();
  }

  async function scheduleSession(date: string, startTime: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/packs/${id}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, startTime }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "No se pudo agendar la sesión.");
      return;
    }
    setShowScheduleForm(false);
    setScheduleDate("");
    await load();
  }

  async function updateSessionStatus(sessionId: string, status: Session["status"]) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/appointments/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("No se pudo actualizar la sesión.");
      return;
    }
    await load();
  }

  if (pack === null) {
    return (
      <div className="space-y-4">
        <Link href="/admin/packs" className="text-sm text-gold-dark hover:underline">
          ← Volver a Packs
        </Link>
        <p className="text-taupe text-sm">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <Link href="/admin/packs" className="text-sm text-gold-dark hover:underline">
          ← Volver a Packs
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-cocoa">{pack.name}</h1>
          <StatusBadge status={pack.status} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* DATOS DEL PACK */}
      <section className="rounded-xl border border-nude bg-white p-5 space-y-2">
        <h2 className="font-medium text-cocoa mb-2">Datos del pack</h2>
        <p className="text-sm text-taupe">
          Cliente: <span className="text-cocoa">{pack.clientName}</span> ·{" "}
          {pack.clientPhone}
          {pack.clientEmail && ` · ${pack.clientEmail}`}
        </p>
        <p className="text-sm text-taupe">
          Progreso: <span className="text-cocoa">{pack.completedSessions}/{pack.sessionsCount}</span> sesiones utilizadas
          {pack.activeSessions < pack.sessionsCount && (
            <> · {pack.sessionsCount - pack.activeSessions} sin agendar</>
          )}
        </p>
        {pack.notes && <p className="text-sm text-taupe italic">&ldquo;{pack.notes}&rdquo;</p>}
        {pack.status === "COMPLETED" && (
          <p className="text-sm font-medium text-sky-700">Pack completado ✓</p>
        )}

        <div className="flex gap-2 pt-2">
          {pack.status === "PENDING" && (
            <button
              onClick={confirmPack}
              disabled={busy}
              className="rounded-full bg-gold px-4 py-1.5 text-sm font-medium text-white hover:bg-gold-dark disabled:opacity-60"
            >
              Confirmar pack
            </button>
          )}
          {pack.status !== "CANCELLED" && (
            <button
              onClick={cancelPack}
              disabled={busy}
              className="rounded-full border border-red-300 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Cancelar pack
            </button>
          )}
        </div>
      </section>

      {/* PAGOS */}
      <section className="rounded-xl border border-nude bg-white p-5 space-y-3">
        <h2 className="font-medium text-cocoa">Pagos</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-taupe">Total</p>
            <p className="font-medium text-cocoa">{formatPrice(pack.totalPriceCents)}</p>
          </div>
          <div>
            <p className="text-xs text-taupe">Abonado</p>
            <p className="font-medium text-cocoa">{formatPrice(pack.paidCents)}</p>
          </div>
          <div>
            <p className="text-xs text-taupe">Saldo</p>
            <p className={`font-medium ${pack.balanceCents > 0 ? "text-cocoa" : "text-emerald-700"}`}>
              {pack.balanceCents > 0 ? formatPrice(pack.balanceCents) : "Pago completo"}
            </p>
          </div>
        </div>

        {payments.length > 0 && (
          <ul className="divide-y divide-nude text-sm">
            {payments.map((p) => (
              <li key={p.id} className="py-2 flex justify-between">
                <span className="text-taupe">
                  {formatDateLong(p.paymentDate)} ·{" "}
                  {PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method}
                </span>
                <span className="text-cocoa font-medium">{formatPrice(p.amountCents)}</span>
              </li>
            ))}
          </ul>
        )}

        {pack.balanceCents > 0 && pack.status !== "CANCELLED" && (
          showPaymentForm ? (
            <form onSubmit={registerPayment} className="space-y-2 pt-2 border-t border-nude">
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="Monto ($)"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="rounded-lg border border-taupe/30 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="rounded-lg border border-taupe/30 px-3 py-2 text-sm"
                />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="rounded-lg border border-taupe/30 px-3 py-2 text-sm"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full bg-gold px-4 py-1.5 text-sm font-medium text-white hover:bg-gold-dark disabled:opacity-60"
                >
                  Guardar pago
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="rounded-full border border-taupe/30 px-4 py-1.5 text-sm text-taupe"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="rounded-full border border-gold/50 px-4 py-1.5 text-sm text-gold-dark hover:bg-nude"
            >
              Registrar pago
            </button>
          )
        )}
      </section>

      {/* SESIONES */}
      <section className="rounded-xl border border-nude bg-white p-5 space-y-3">
        <h2 className="font-medium text-cocoa">Sesiones</h2>

        {pack.sessions.length === 0 ? (
          <p className="text-sm text-taupe">Todavía no se agendó ninguna sesión.</p>
        ) : (
          <ul className="divide-y divide-nude text-sm">
            {pack.sessions.map((s) => (
              <li key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-cocoa font-medium">
                    Sesión {s.packSessionNumber}/{pack.sessionsCount}
                  </p>
                  <p className="text-taupe">
                    {formatDateLong(s.date)} · {s.startTime}–{s.endTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={s.status} />
                  <select
                    value={s.status}
                    disabled={busy}
                    onChange={(e) =>
                      updateSessionStatus(s.id, e.target.value as Session["status"])
                    }
                    className="rounded-lg border border-taupe/30 px-2 py-1 text-xs disabled:opacity-50"
                  >
                    <option value="PENDING">{SESSION_STATUS_LABELS.PENDING}</option>
                    <option value="CONFIRMED">{SESSION_STATUS_LABELS.CONFIRMED}</option>
                    <option value="COMPLETED">{SESSION_STATUS_LABELS.COMPLETED}</option>
                    <option value="CANCELLED">{SESSION_STATUS_LABELS.CANCELLED}</option>
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pack.activeSessions < pack.sessionsCount && pack.status !== "CANCELLED" && pack.status !== "COMPLETED" && (
          showScheduleForm ? (
            <div className="space-y-2 pt-2 border-t border-nude">
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="rounded-lg border border-taupe/30 px-3 py-2 text-sm"
              />
              {scheduleDate && (
                loadingSlots ? (
                  <p className="text-sm text-taupe">Buscando horarios…</p>
                ) : slots && slots.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.start}
                        type="button"
                        disabled={busy}
                        onClick={() => scheduleSession(scheduleDate, slot.start)}
                        className="rounded-full border border-taupe/30 px-3 py-1.5 text-sm text-cocoa hover:border-gold-light disabled:opacity-50"
                      >
                        {slot.start}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-taupe">No hay horarios disponibles ese día.</p>
                )
              )}
              <button
                type="button"
                onClick={() => {
                  setShowScheduleForm(false);
                  setScheduleDate("");
                }}
                className="text-sm text-taupe hover:underline"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowScheduleForm(true)}
              className="rounded-full border border-gold/50 px-4 py-1.5 text-sm text-gold-dark hover:bg-nude"
            >
              Agendar sesión
            </button>
          )
        )}
      </section>
    </div>
  );
}
