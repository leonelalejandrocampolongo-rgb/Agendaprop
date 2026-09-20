import type { DbShape } from "@/lib/db-types";

const SLOT_STEP_MINUTES = 15;
const DEFAULT_BUFFER_MINUTES = 15;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Day of week (0=domingo..6=sábado) for a "YYYY-MM-DD" string, timezone-safe. */
export function dayOfWeekFromDateString(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function nowMinutesOfDay(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export type Slot = { start: string; end: string };

/**
 * Slots disponibles para un servicio en una fecha dada, en base al horario
 * semanal, los bloqueos puntuales y los turnos ya reservados (no cancelados).
 */
export function getAvailableSlots({
  db,
  serviceId,
  date,
  excludeAppointmentId,
}: {
  db: DbShape;
  serviceId: string;
  date: string;
  /** Ignora este turno al calcular ocupación (útil al reprogramarlo). */
  excludeAppointmentId?: string;
}): Slot[] {
  const service = db.services.find((s) => s.id === serviceId && s.active);
  if (!service) return [];

  const today = todayDateString();
  if (date < today) return [];

  const dayOfWeek = dayOfWeekFromDateString(date);
  const dayRanges = db.weeklyAvailability
    .filter((w) => w.dayOfWeek === dayOfWeek)
    .map((w) => ({
      start: timeToMinutes(w.startTime),
      end: timeToMinutes(w.endTime),
    }));
  if (dayRanges.length === 0) return [];

  const blockedForDate = db.blockedDates.filter((b) => b.date === date);
  if (blockedForDate.some((b) => !b.startTime || !b.endTime)) return [];
  const blockedRanges = blockedForDate.map((b) => ({
    start: timeToMinutes(b.startTime as string),
    end: timeToMinutes(b.endTime as string),
  }));

  // El margen se aplica a ambos lados de cada turno ya reservado, así queda
  // el mismo hueco obligatorio entre dos turnos sin importar cuál se agende
  // primero. No se aplica a los bloqueos manuales (son cierres explícitos).
  const bufferMinutes = db.settings?.bufferMinutes ?? DEFAULT_BUFFER_MINUTES;
  const busyRanges = db.appointments
    .filter(
      (a) =>
        a.date === date &&
        a.id !== excludeAppointmentId &&
        (a.status === "PENDING" || a.status === "CONFIRMED"),
    )
    .map((a) => ({
      start: timeToMinutes(a.startTime) - bufferMinutes,
      end: timeToMinutes(a.endTime) + bufferMinutes,
    }));

  const blockingRanges = [...blockedRanges, ...busyRanges];
  const minStart = date === today ? nowMinutesOfDay() : 0;

  const slots: Slot[] = [];
  for (const range of dayRanges) {
    for (
      let start = range.start;
      start + service.durationMinutes <= range.end;
      start += SLOT_STEP_MINUTES
    ) {
      if (start < minStart) continue;
      const end = start + service.durationMinutes;
      const blocked = blockingRanges.some((b) =>
        rangesOverlap(start, end, b.start, b.end),
      );
      if (!blocked) {
        slots.push({ start: minutesToTime(start), end: minutesToTime(end) });
      }
    }
  }

  return slots;
}

/** True si un nuevo turno [startTime,endTime) en `date` no pisa otro existente. */
export function isSlotStillAvailable({
  db,
  serviceId,
  date,
  startTime,
  endTime,
  excludeAppointmentId,
}: {
  db: DbShape;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  excludeAppointmentId?: string;
}): boolean {
  const slots = getAvailableSlots({ db, serviceId, date, excludeAppointmentId });
  return slots.some((s) => s.start === startTime && s.end === endTime);
}
