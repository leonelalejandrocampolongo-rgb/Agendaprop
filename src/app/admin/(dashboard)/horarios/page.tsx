"use client";

import { useEffect, useState } from "react";
import { DAY_NAMES } from "@/lib/format";

type WeeklyRange = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type BlockedDate = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
};

export default function HorariosPage() {
  const [weekly, setWeekly] = useState<WeeklyRange[] | null>(null);
  const [blocked, setBlocked] = useState<BlockedDate[] | null>(null);

  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  const [blockDate, setBlockDate] = useState("");
  const [blockWholeDay, setBlockWholeDay] = useState(true);
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("13:00");
  const [blockReason, setBlockReason] = useState("");
  const [blockError, setBlockError] = useState<string | null>(null);

  async function loadWeekly() {
    const res = await fetch("/api/admin/availability");
    const data = await res.json();
    setWeekly(data.weeklyAvailability ?? []);
  }

  async function loadBlocked() {
    const res = await fetch("/api/admin/blocked-dates");
    const data = await res.json();
    setBlocked(data.blockedDates ?? []);
  }

  useEffect(() => {
    loadWeekly();
    loadBlocked();
  }, []);

  async function addWeeklyRange(e: React.FormEvent) {
    e.preventDefault();
    setWeeklyError(null);
    const res = await fetch("/api/admin/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
      }),
    });
    if (!res.ok) {
      setWeeklyError("No se pudo agregar el horario (revisá que el inicio sea antes que el fin).");
      return;
    }
    await loadWeekly();
  }

  async function removeWeeklyRange(id: string) {
    await fetch(`/api/admin/availability/${id}`, { method: "DELETE" });
    await loadWeekly();
  }

  async function addBlockedDate(e: React.FormEvent) {
    e.preventDefault();
    setBlockError(null);
    if (!blockDate) {
      setBlockError("Elegí una fecha.");
      return;
    }
    const res = await fetch("/api/admin/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: blockDate,
        startTime: blockWholeDay ? undefined : blockStart,
        endTime: blockWholeDay ? undefined : blockEnd,
        reason: blockReason.trim() || undefined,
      }),
    });
    if (!res.ok) {
      setBlockError("No se pudo bloquear la fecha.");
      return;
    }
    setBlockDate("");
    setBlockReason("");
    await loadBlocked();
  }

  async function removeBlockedDate(id: string) {
    await fetch(`/api/admin/blocked-dates/${id}`, { method: "DELETE" });
    await loadBlocked();
  }

  const weeklyByDay = new Map<number, WeeklyRange[]>();
  for (const range of weekly ?? []) {
    const list = weeklyByDay.get(range.dayOfWeek) ?? [];
    list.push(range);
    weeklyByDay.set(range.dayOfWeek, list);
  }

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold text-stone-900">Horarios</h1>

      <section className="space-y-4">
        <h2 className="font-medium text-stone-900">Horario semanal</h2>

        {weekly === null ? (
          <p className="text-stone-500 text-sm">Cargando…</p>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-200">
            {DAY_NAMES.map((name, idx) => (
              <div key={idx} className="px-4 py-3 flex flex-wrap items-center gap-3">
                <span className="w-24 font-medium text-stone-900 text-sm">
                  {name}
                </span>
                <div className="flex flex-wrap gap-2 flex-1">
                  {(weeklyByDay.get(idx) ?? []).length === 0 ? (
                    <span className="text-sm text-stone-400">Cerrado</span>
                  ) : (
                    weeklyByDay.get(idx)!.map((range) => (
                      <span
                        key={range.id}
                        className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-700 text-sm px-3 py-1"
                      >
                        {range.startTime}–{range.endTime}
                        <button
                          onClick={() => removeWeeklyRange(range.id)}
                          className="text-amber-400 hover:text-amber-700"
                          aria-label="Eliminar horario"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={addWeeklyRange}
          className="rounded-xl border border-stone-200 bg-white p-4 flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="block text-xs text-stone-500 mb-1">Día</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
            >
              {DAY_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Desde</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Hasta</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-amber-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
          >
            Agregar
          </button>
          {weeklyError && (
            <p className="w-full text-sm text-red-600">{weeklyError}</p>
          )}
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium text-stone-900">
          Días y horarios bloqueados
        </h2>
        <p className="text-sm text-stone-500">
          Usalo para feriados, vacaciones o cualquier excepción puntual al
          horario semanal.
        </p>

        {blocked === null ? (
          <p className="text-stone-500 text-sm">Cargando…</p>
        ) : blocked.length === 0 ? (
          <p className="text-stone-500 text-sm">No hay bloqueos cargados.</p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {blocked.map((b) => (
              <li key={b.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-stone-900 text-sm">
                    {b.date}{" "}
                    {b.startTime && b.endTime
                      ? `· ${b.startTime}–${b.endTime}`
                      : "· Todo el día"}
                  </p>
                  {b.reason && (
                    <p className="text-sm text-stone-500">{b.reason}</p>
                  )}
                </div>
                <button
                  onClick={() => removeBlockedDate(b.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={addBlockedDate}
          className="rounded-xl border border-stone-200 bg-white p-4 space-y-3"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-700 pb-2">
              <input
                type="checkbox"
                checked={blockWholeDay}
                onChange={(e) => setBlockWholeDay(e.target.checked)}
              />
              Todo el día
            </label>
            {!blockWholeDay && (
              <>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">
                    Desde
                  </label>
                  <input
                    type="time"
                    value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">
                    Hasta
                  </label>
                  <input
                    type="time"
                    value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                  />
                </div>
              </>
            )}
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">
              Motivo (opcional)
            </label>
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
              placeholder="Ej: Feriado, vacaciones…"
            />
          </div>
          {blockError && <p className="text-sm text-red-600">{blockError}</p>}
          <button
            type="submit"
            className="rounded-full bg-amber-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
          >
            Bloquear
          </button>
        </form>
      </section>
    </div>
  );
}
