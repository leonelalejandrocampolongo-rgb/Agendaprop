"use client";

import { useEffect, useMemo, useState } from "react";
import { dayOfWeekFromDateString, minutesToTime, timeToMinutes, todayDateString } from "@/lib/availability";
import {
  addDays,
  addMonths,
  closedSegments,
  computeGridRange,
  datesOfMonthGrid,
  datesOfWeek,
  isSameMonth,
  layoutDayAppointments,
  type CalendarAppointment,
  type CalendarView,
} from "@/lib/calendar";
import { DAY_NAMES, MONTH_NAMES } from "@/lib/format";
import { AppointmentDetailModal } from "@/components/admin/appointment-detail-modal";

type WeeklyRange = { id: string; dayOfWeek: number; startTime: string; endTime: string };

const PX_PER_MIN = 1.5;

const STATUS_BLOCK_CLASSES: Record<CalendarAppointment["status"], string> = {
  PENDING: "bg-amber-100 border-amber-500 text-amber-900",
  CONFIRMED: "bg-emerald-100 border-emerald-500 text-emerald-900",
  COMPLETED: "bg-sky-100 border-sky-500 text-sky-900",
  CANCELLED: "bg-stone-200 border-stone-400 text-stone-500 line-through decoration-stone-400",
};

const STATUS_DOT_CLASSES: Record<CalendarAppointment["status"], string> = {
  PENDING: "bg-amber-500",
  CONFIRMED: "bg-emerald-500",
  COMPLETED: "bg-sky-500",
  CANCELLED: "bg-stone-400",
};

export default function CalendarioPage() {
  const [view, setView] = useState<CalendarView>("week");
  const [anchorDate, setAnchorDate] = useState(todayDateString());
  const [weekly, setWeekly] = useState<WeeklyRange[] | null>(null);
  const [appointments, setAppointments] = useState<CalendarAppointment[] | null>(null);
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);
  const today = todayDateString();

  useEffect(() => {
    fetch("/api/admin/availability")
      .then((r) => r.json())
      .then((data) => setWeekly(data.weeklyAvailability ?? []));
  }, []);

  const range = useMemo(() => {
    if (view === "day") return { from: anchorDate, to: anchorDate };
    if (view === "week") {
      const dates = datesOfWeek(anchorDate);
      return { from: dates[0], to: dates[6] };
    }
    const dates = datesOfMonthGrid(anchorDate);
    return { from: dates[0], to: dates[41] };
  }, [view, anchorDate]);

  async function loadAppointments() {
    const params = new URLSearchParams({ from: range.from, to: range.to });
    const res = await fetch(`/api/admin/appointments?${params}`);
    const data = await res.json();
    setAppointments(data.appointments ?? []);
  }

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  function goPrev() {
    if (view === "day") setAnchorDate(addDays(anchorDate, -1));
    else if (view === "week") setAnchorDate(addDays(anchorDate, -7));
    else setAnchorDate(addMonths(anchorDate, -1));
  }

  function goNext() {
    if (view === "day") setAnchorDate(addDays(anchorDate, 1));
    else if (view === "week") setAnchorDate(addDays(anchorDate, 7));
    else setAnchorDate(addMonths(anchorDate, 1));
  }

  function goToday() {
    setAnchorDate(today);
  }

  function openDay(date: string) {
    setAnchorDate(date);
    setView("day");
  }

  const visibleDates = useMemo(() => {
    if (view === "day") return [anchorDate];
    if (view === "week") return datesOfWeek(anchorDate);
    return datesOfMonthGrid(anchorDate);
  }, [view, anchorDate]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const a of appointments ?? []) {
      const list = map.get(a.date) ?? [];
      list.push(a);
      map.set(a.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    }
    return map;
  }, [appointments]);

  const weeklyByDay = useMemo(() => {
    const map = new Map<number, WeeklyRange[]>();
    for (const r of weekly ?? []) {
      const list = map.get(r.dayOfWeek) ?? [];
      list.push(r);
      map.set(r.dayOfWeek, list);
    }
    return map;
  }, [weekly]);

  const rangeLabel = useMemo(() => {
    if (view === "day") {
      const [y, m, d] = anchorDate.split("-").map(Number);
      return `${d} de ${MONTH_NAMES[m - 1]} ${y}`;
    }
    if (view === "week") {
      const dates = datesOfWeek(anchorDate);
      const [, m1, d1] = dates[0].split("-").map(Number);
      const [y2, m2, d2] = dates[6].split("-").map(Number);
      if (m1 === m2) return `${d1} al ${d2} de ${MONTH_NAMES[m1 - 1]} ${y2}`;
      return `${d1} ${MONTH_NAMES[m1 - 1]} – ${d2} ${MONTH_NAMES[m2 - 1]} ${y2}`;
    }
    const [y, m] = anchorDate.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  }, [view, anchorDate]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-cocoa">Calendario</h1>
        <p className="mt-1 text-sm text-taupe">
          Vista interna para ver de un vistazo tus turnos, horarios ocupados
          y espacios libres. Las clientas no ven esta pantalla.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            aria-label="Anterior"
            className="rounded-full border border-taupe/30 w-8 h-8 flex items-center justify-center text-taupe hover:border-gold-light"
          >
            ‹
          </button>
          <button
            onClick={goToday}
            className="rounded-full border border-taupe/30 px-3 py-1.5 text-sm text-taupe hover:border-gold-light"
          >
            Hoy
          </button>
          <button
            onClick={goNext}
            aria-label="Siguiente"
            className="rounded-full border border-taupe/30 w-8 h-8 flex items-center justify-center text-taupe hover:border-gold-light"
          >
            ›
          </button>
          <span className="font-medium text-cocoa ml-1">{rangeLabel}</span>
        </div>

        <div className="flex rounded-full border border-taupe/30 overflow-hidden text-sm">
          {(["day", "week", "month"] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 ${
                view === v ? "bg-gold text-white" : "text-taupe hover:bg-nude"
              }`}
            >
              {v === "day" ? "Día" : v === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      {appointments === null || weekly === null ? (
        <p className="text-taupe text-sm">Cargando…</p>
      ) : view === "month" ? (
        <MonthGrid
          dates={visibleDates}
          anchorDate={anchorDate}
          today={today}
          appointmentsByDate={appointmentsByDate}
          onOpenDay={openDay}
          onSelect={setSelected}
        />
      ) : (
        <TimeGrid
          dates={visibleDates}
          today={today}
          weeklyByDay={weeklyByDay}
          appointmentsByDate={appointmentsByDate}
          onSelect={setSelected}
        />
      )}

      <div className="flex flex-wrap gap-4 text-xs text-taupe">
        <LegendItem colorClass="bg-amber-500" label="Pendiente" />
        <LegendItem colorClass="bg-emerald-500" label="Confirmado" />
        <LegendItem colorClass="bg-sky-500" label="Completado" />
        <LegendItem colorClass="bg-stone-400" label="Cancelado" />
      </div>

      {selected && (
        <AppointmentDetailModal
          appointment={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            loadAppointments();
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function LegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
      {label}
    </span>
  );
}

function TimeGrid({
  dates,
  today,
  weeklyByDay,
  appointmentsByDate,
  onSelect,
}: {
  dates: string[];
  today: string;
  weeklyByDay: Map<number, WeeklyRange[]>;
  appointmentsByDate: Map<string, CalendarAppointment[]>;
  onSelect: (a: CalendarAppointment) => void;
}) {
  const visibleWeeklyRanges = dates.flatMap((d) => weeklyByDay.get(dayOfWeekFromDateString(d)) ?? []);
  const visibleAppointments = dates.flatMap((d) => appointmentsByDate.get(d) ?? []);
  const { startMinutes, endMinutes } = computeGridRange(visibleWeeklyRanges, visibleAppointments);
  const totalHeight = (endMinutes - startMinutes) * PX_PER_MIN;

  const hourMarks: number[] = [];
  for (let h = Math.ceil(startMinutes / 60) * 60; h <= endMinutes; h += 60) {
    hourMarks.push(h);
  }

  const nowMinutes = (() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  })();

  return (
    <div className="rounded-xl border border-nude bg-white overflow-x-auto">
      <div className="flex min-w-max" style={{ minWidth: dates.length > 1 ? `${64 + dates.length * 140}px` : undefined }}>
        <div className="sticky left-0 z-10 bg-white w-16 shrink-0 border-r border-nude">
          <div className="h-12 border-b border-nude" />
          <div className="relative" style={{ height: totalHeight }}>
            {hourMarks.map((m) => (
              <div
                key={m}
                className="absolute left-0 right-0 text-right pr-2 text-xs text-taupe -translate-y-1/2"
                style={{ top: (m - startMinutes) * PX_PER_MIN }}
              >
                {minutesToTime(m)}
              </div>
            ))}
          </div>
        </div>

        {dates.map((date) => {
          const dayRanges = weeklyByDay.get(dayOfWeekFromDateString(date)) ?? [];
          const segments = closedSegments(dayRanges, startMinutes, endMinutes);
          const dayAppointments = appointmentsByDate.get(date) ?? [];
          const positioned = layoutDayAppointments(dayAppointments, startMinutes);
          const isToday = date === today;
          const [, , d] = date.split("-");

          return (
            <div key={date} className="flex-1 min-w-[140px] border-r border-nude last:border-r-0">
              <div
                className={`h-12 border-b border-nude flex flex-col items-center justify-center ${
                  isToday ? "bg-gold/10" : ""
                }`}
              >
                <span className="text-xs text-taupe">{DAY_NAMES[dayOfWeekFromDateString(date)].slice(0, 3)}</span>
                <span className={`text-sm font-medium ${isToday ? "text-gold-dark" : "text-cocoa"}`}>
                  {Number(d)}
                </span>
              </div>
              <div className="relative" style={{ height: totalHeight }}>
                {hourMarks.map((m) => (
                  <div
                    key={m}
                    className="absolute left-0 right-0 border-t border-nude/70"
                    style={{ top: (m - startMinutes) * PX_PER_MIN }}
                  />
                ))}
                {segments.map((seg, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 bg-taupe/10"
                    style={{
                      top: (seg.start - startMinutes) * PX_PER_MIN,
                      height: (seg.end - seg.start) * PX_PER_MIN,
                    }}
                  />
                ))}
                {isToday && nowMinutes >= startMinutes && nowMinutes <= endMinutes && (
                  <div
                    className="absolute left-0 right-0 border-t-2 border-red-500 z-10"
                    style={{ top: (nowMinutes - startMinutes) * PX_PER_MIN }}
                  >
                    <span className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
                  </div>
                )}
                {positioned.map(({ appt, column, columnCount, topMinutes, heightMinutes }) => (
                  <button
                    key={appt.id}
                    onClick={() => onSelect(appt)}
                    className={`absolute overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-left text-xs leading-tight hover:brightness-95 ${STATUS_BLOCK_CLASSES[appt.status]}`}
                    style={{
                      top: topMinutes * PX_PER_MIN,
                      height: heightMinutes * PX_PER_MIN - 2,
                      left: `${(column / columnCount) * 100}%`,
                      width: `${100 / columnCount}%`,
                    }}
                  >
                    <p className="font-medium truncate">{appt.clientName}</p>
                    <p className="truncate">{appt.service?.name ?? "—"}</p>
                    <p className="truncate">
                      {appt.startTime}–{appt.endTime}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({
  dates,
  anchorDate,
  today,
  appointmentsByDate,
  onOpenDay,
  onSelect,
}: {
  dates: string[];
  anchorDate: string;
  today: string;
  appointmentsByDate: Map<string, CalendarAppointment[]>;
  onOpenDay: (date: string) => void;
  onSelect: (a: CalendarAppointment) => void;
}) {
  const MAX_CHIPS = 3;
  return (
    <div className="rounded-xl border border-nude bg-white overflow-hidden">
      <div className="grid grid-cols-7 border-b border-nude">
        {DAY_NAMES.slice(1).concat(DAY_NAMES[0]).map((name) => (
          <div key={name} className="px-2 py-2 text-center text-xs font-medium text-taupe">
            {name.slice(0, 3)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dates.map((date) => {
          const inMonth = isSameMonth(date, anchorDate);
          const isToday = date === today;
          const dayAppointments = appointmentsByDate.get(date) ?? [];
          const [, , d] = date.split("-");

          return (
            <div
              key={date}
              className="min-h-[96px] border-b border-r border-nude p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0"
            >
              <button
                onClick={() => onOpenDay(date)}
                className={`text-xs font-medium rounded-full w-6 h-6 flex items-center justify-center ${
                  isToday ? "bg-gold text-white" : inMonth ? "text-cocoa hover:bg-nude" : "text-taupe/50"
                }`}
              >
                {Number(d)}
              </button>
              <div className="mt-1 space-y-0.5">
                {dayAppointments.slice(0, MAX_CHIPS).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onSelect(a)}
                    className="w-full flex items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] leading-tight hover:bg-nude truncate"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT_CLASSES[a.status]}`} />
                    <span className="truncate text-cocoa">
                      {a.startTime} {a.clientName}
                    </span>
                  </button>
                ))}
                {dayAppointments.length > MAX_CHIPS && (
                  <button
                    onClick={() => onOpenDay(date)}
                    className="text-[11px] text-gold-dark hover:underline pl-1"
                  >
                    +{dayAppointments.length - MAX_CHIPS} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
