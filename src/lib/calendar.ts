import { timeToMinutes } from "@/lib/availability";

export type CalendarView = "day" | "week" | "month";

export type CalendarAppointment = {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  notes: string | null;
  depositPaidCents: number | null;
  archivedAt: string | null;
  service: { id: string; name: string; priceCents: number } | null;
};

/** Suma/resta días a una fecha "YYYY-MM-DD", sin problemas de huso horario. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = (dt.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = dt.getUTCDate().toString().padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Suma/resta meses a una fecha "YYYY-MM-DD" (conserva el día 1, útil para navegar meses). */
export function addMonths(date: string, months: number): string {
  const [y, m] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, 1));
  const yy = dt.getUTCFullYear();
  const mm = (dt.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${yy}-${mm}-01`;
}

/** Lunes de la semana que contiene `date` (semana lunes a domingo). */
export function startOfWeek(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=domingo..6=sábado
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  return addDays(date, diffToMonday);
}

/** Las 7 fechas (lunes a domingo) de la semana que contiene `date`. */
export function datesOfWeek(date: string): string[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Grilla de 6 semanas (42 días, lunes a domingo) que cubre el mes de `date`. */
export function datesOfMonthGrid(date: string): string[] {
  const [y, m] = date.split("-").map(Number);
  const firstOfMonth = `${y}-${String(m).padStart(2, "0")}-01`;
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function isSameMonth(date: string, reference: string): boolean {
  return date.slice(0, 7) === reference.slice(0, 7);
}

const DEFAULT_GRID_START_MINUTES = 8 * 60;
const DEFAULT_GRID_END_MINUTES = 20 * 60;

/**
 * Rango vertical (en minutos desde medianoche) que debe cubrir la grilla
 * semana/día: la unión del horario semanal configurado y los turnos
 * visibles, para que nunca quede un turno fuera de la grilla. Si no hay
 * nada cargado todavía, usa un rango por defecto razonable.
 */
export function computeGridRange(
  weeklyRanges: { startTime: string; endTime: string }[],
  appointments: { startTime: string; endTime: string }[],
): { startMinutes: number; endMinutes: number } {
  let start = Infinity;
  let end = -Infinity;

  for (const r of weeklyRanges) {
    start = Math.min(start, timeToMinutes(r.startTime));
    end = Math.max(end, timeToMinutes(r.endTime));
  }
  for (const a of appointments) {
    start = Math.min(start, timeToMinutes(a.startTime));
    end = Math.max(end, timeToMinutes(a.endTime));
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { startMinutes: DEFAULT_GRID_START_MINUTES, endMinutes: DEFAULT_GRID_END_MINUTES };
  }
  // Un poco de margen arriba/abajo para que los turnos en el borde no queden pegados.
  start = Math.max(0, Math.floor(start / 60) * 60 - 30);
  end = Math.min(24 * 60, Math.ceil(end / 60) * 60 + 30);
  return { startMinutes: start, endMinutes: end };
}

/** Tramos "cerrados" (sin disponibilidad) dentro de [startMinutes,endMinutes), para sombrear la grilla. */
export function closedSegments(
  dayRanges: { startTime: string; endTime: string }[],
  startMinutes: number,
  endMinutes: number,
): { start: number; end: number }[] {
  const open = dayRanges
    .map((r) => ({ start: timeToMinutes(r.startTime), end: timeToMinutes(r.endTime) }))
    .filter((r) => r.end > startMinutes && r.start < endMinutes)
    .sort((a, b) => a.start - b.start);

  const segments: { start: number; end: number }[] = [];
  let cursor = startMinutes;
  for (const range of open) {
    const s = Math.max(range.start, startMinutes);
    const e = Math.min(range.end, endMinutes);
    if (s > cursor) segments.push({ start: cursor, end: s });
    cursor = Math.max(cursor, e);
  }
  if (cursor < endMinutes) segments.push({ start: cursor, end: endMinutes });
  return segments;
}

export type PositionedAppointment<T> = {
  appt: T;
  column: number;
  columnCount: number;
  topMinutes: number;
  heightMinutes: number;
};

/**
 * Asigna a cada turno de un día una columna (para que los superpuestos se
 * vean lado a lado en vez de tapados), estilo Google Calendar: agrupa en
 * "clusters" de turnos que se solapan entre sí y reparte columnas dentro
 * de cada cluster con un algoritmo greedy.
 */
export function layoutDayAppointments<T extends { startTime: string; endTime: string }>(
  appointments: T[],
  gridStartMinutes: number,
): PositionedAppointment<T>[] {
  const sorted = [...appointments].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  );

  const clusters: T[][] = [];
  let current: T[] = [];
  let currentEnd = -Infinity;
  for (const a of sorted) {
    const start = timeToMinutes(a.startTime);
    if (current.length > 0 && start >= currentEnd) {
      clusters.push(current);
      current = [];
      currentEnd = -Infinity;
    }
    current.push(a);
    currentEnd = Math.max(currentEnd, timeToMinutes(a.endTime));
  }
  if (current.length > 0) clusters.push(current);

  const result: PositionedAppointment<T>[] = [];
  for (const cluster of clusters) {
    const columnEndTimes: number[] = [];
    const assigned: { appt: T; column: number }[] = [];
    for (const a of cluster) {
      const start = timeToMinutes(a.startTime);
      let col = columnEndTimes.findIndex((end) => end <= start);
      if (col === -1) {
        col = columnEndTimes.length;
        columnEndTimes.push(timeToMinutes(a.endTime));
      } else {
        columnEndTimes[col] = timeToMinutes(a.endTime);
      }
      assigned.push({ appt: a, column: col });
    }
    const columnCount = columnEndTimes.length;
    for (const { appt, column } of assigned) {
      const start = timeToMinutes(appt.startTime);
      const end = timeToMinutes(appt.endTime);
      result.push({
        appt,
        column,
        columnCount,
        topMinutes: start - gridStartMinutes,
        heightMinutes: Math.max(end - start, 15),
      });
    }
  }
  return result;
}
