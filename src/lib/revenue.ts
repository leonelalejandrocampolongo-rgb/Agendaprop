import type { Appointment, DbShape, PackPayment } from "@/lib/db-types";

export type MonthlyRevenue = {
  year: number;
  month: number; // 1-12
  /** Turnos sueltos (sin pack) en estado COMPLETED, por su precio congelado. */
  appointmentsTotalCents: number;
  appointmentsCount: number;
  /** Pagos de packs (cualquier estado del pack) cobrados en el mes, por fecha real de pago. */
  packPaymentsTotalCents: number;
  packPaymentsCount: number;
  totalCents: number;
};

function isInMonth(dateStr: string, year: number, month: number): boolean {
  const [y, m] = dateStr.split("-").map(Number);
  return y === year && m === month;
}

/**
 * Precio a usar para un turno en el reporte de ingresos: el precio
 * congelado al momento de la reserva si existe, o si no (turnos creados
 * antes de que existiera ese campo) el precio actual del servicio, igual
 * que hace el resto del panel hoy.
 */
function appointmentRevenueCents(db: DbShape, appointment: Appointment): number {
  if (appointment.priceCentsAtBooking != null) return appointment.priceCentsAtBooking;
  const service = db.services.find((s) => s.id === appointment.serviceId);
  return service?.priceCents ?? 0;
}

/**
 * Ingresos de un mes calendario. No cuenta turnos cancelados/pendientes.
 * Los turnos que pertenecen a un pack NO se suman individualmente (su
 * dinero ya está representado por los pagos del pack) para no contar el
 * valor del pack una vez por cada sesión realizada.
 */
export function computeMonthlyRevenue(
  db: DbShape,
  year: number,
  month: number,
): MonthlyRevenue {
  const qualifyingAppointments = db.appointments.filter(
    (a) => a.packId === null && a.status === "COMPLETED" && isInMonth(a.date, year, month),
  );
  const appointmentsTotalCents = qualifyingAppointments.reduce(
    (sum, a) => sum + appointmentRevenueCents(db, a),
    0,
  );

  const qualifyingPayments: PackPayment[] = db.packPayments.filter((p) =>
    isInMonth(p.paymentDate, year, month),
  );
  const packPaymentsTotalCents = qualifyingPayments.reduce((sum, p) => sum + p.amountCents, 0);

  return {
    year,
    month,
    appointmentsTotalCents,
    appointmentsCount: qualifyingAppointments.length,
    packPaymentsTotalCents,
    packPaymentsCount: qualifyingPayments.length,
    totalCents: appointmentsTotalCents + packPaymentsTotalCents,
  };
}
