import type {
  Appointment,
  AppointmentStatus,
  DbShape,
  Pack,
  PackPayment,
  PackPaymentMethod,
  Service,
} from "@/lib/db-types";
import { isSlotStillAvailable, minutesToTime, timeToMinutes } from "@/lib/availability";
import { createManualPack } from "@/lib/packs";

export class CustomAppointmentError extends Error {
  reason: "VALIDATION" | "SLOT_TAKEN";
  constructor(reason: "VALIDATION" | "SLOT_TAKEN", message: string) {
    super(message);
    this.reason = reason;
  }
}

export type CreateCustomAppointmentInput = {
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  treatmentName: string;
  description?: string | null;
  durationMinutes: number;
  isPack: boolean;

  // Turno único (isPack === false)
  priceCents?: number;
  date?: string;
  startTime?: string;
  status?: AppointmentStatus;
  depositPaidCents?: number | null;

  // Pack (isPack === true) — mismos campos que "Crear pack manualmente"
  sessionsCount?: number;
  totalPriceCents?: number;
  paidCents?: number;
  paymentDate?: string;
  paymentMethod?: PackPaymentMethod;
  packStatus?: "PENDING" | "ACTIVE";
};

export type CreateCustomAppointmentResult =
  | { kind: "appointment"; service: Service; appointment: Appointment }
  | { kind: "pack"; service: Service; pack: Pack; payment: PackPayment | null };

/**
 * Crea un turno personalizado (tratamiento armado para una sola clienta, que
 * no debe figurar en el catálogo público). Se modela con un Service oculto
 * (`hidden: true`) creado al vuelo, para reutilizar toda la lógica existente
 * de disponibilidad, turnos y packs sin duplicarla. El servicio oculto nunca
 * se lista en el catálogo público ni puede reservarse desde la web (ver los
 * filtros `!s.hidden` en las rutas públicas).
 */
export function createCustomAppointment(
  db: DbShape,
  input: CreateCustomAppointmentInput,
): CreateCustomAppointmentResult {
  const now = new Date().toISOString();
  const service: Service = {
    id: crypto.randomUUID(),
    name: input.treatmentName,
    description: input.description || null,
    durationMinutes: input.durationMinutes,
    priceCents: input.isPack ? input.totalPriceCents ?? 0 : input.priceCents ?? 0,
    active: true,
    isPack: input.isPack,
    packSessionsCount: input.isPack ? input.sessionsCount ?? null : null,
    hidden: true,
    createdAt: now,
    updatedAt: now,
  };
  db.services.push(service);

  if (input.isPack) {
    if (!input.sessionsCount || input.sessionsCount < 1) {
      throw new CustomAppointmentError("VALIDATION", "La cantidad de sesiones del pack debe ser al menos 1.");
    }
    const { pack, payment } = createManualPack(db, service, {
      serviceId: service.id,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      clientEmail: input.clientEmail,
      sessionsCount: input.sessionsCount,
      totalPriceCents: input.totalPriceCents ?? 0,
      status: input.packStatus ?? "ACTIVE",
      notes: input.description,
      initialPayment:
        input.paidCents && input.paidCents > 0
          ? {
              amountCents: input.paidCents,
              paymentDate: input.paymentDate || now.slice(0, 10),
              method: input.paymentMethod || "TRANSFER",
            }
          : undefined,
    });
    return { kind: "pack", service, pack, payment };
  }

  if (!input.date || !input.startTime) {
    throw new CustomAppointmentError("VALIDATION", "Elegí fecha y horario.");
  }

  const endTime = minutesToTime(timeToMinutes(input.startTime) + input.durationMinutes);
  if (
    !isSlotStillAvailable({
      db,
      serviceId: service.id,
      date: input.date,
      startTime: input.startTime,
      endTime,
    })
  ) {
    throw new CustomAppointmentError("SLOT_TAKEN", "Ese horario ya no está disponible, elegí otro.");
  }

  const appointment: Appointment = {
    id: crypto.randomUUID(),
    serviceId: service.id,
    date: input.date,
    startTime: input.startTime,
    endTime,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    clientEmail: input.clientEmail || null,
    notes: null,
    status: input.status ?? "CONFIRMED",
    packId: null,
    packSessionNumber: null,
    archivedAt: null,
    depositPaidCents: input.depositPaidCents || null,
    priceCentsAtBooking: service.priceCents,
    createdAt: now,
    updatedAt: now,
  };
  db.appointments.push(appointment);

  return { kind: "appointment", service, appointment };
}
