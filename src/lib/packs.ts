import type {
  Appointment,
  DbShape,
  Pack,
  PackPayment,
  PackPaymentMethod,
  Service,
} from "@/lib/db-types";
import { isSlotStillAvailable, minutesToTime, timeToMinutes } from "@/lib/availability";

/** Sesiones del pack que todavía ocupan un cupo (no canceladas). */
export function activePackSessions(db: DbShape, packId: string): Appointment[] {
  return db.appointments.filter((a) => a.packId === packId && a.status !== "CANCELLED");
}

/** Todas las sesiones del pack, incluidas las canceladas (para mostrar historial). */
export function allPackSessions(db: DbShape, packId: string): Appointment[] {
  return db.appointments
    .filter((a) => a.packId === packId)
    .sort((a, b) => (a.packSessionNumber ?? 0) - (b.packSessionNumber ?? 0));
}

/**
 * Sesiones realmente utilizadas: solo cuentan las COMPLETED. Se calcula
 * siempre a partir de los turnos, nunca se guarda un contador aparte, para
 * que no pueda quedar desincronizado.
 */
export function completedPackSessionsCount(db: DbShape, packId: string): number {
  return db.appointments.filter((a) => a.packId === packId && a.status === "COMPLETED").length;
}

/** Total abonado del pack: suma de sus pagos registrados. Nunca se guarda aparte. */
export function packPaidCents(db: DbShape, packId: string): number {
  return db.packPayments
    .filter((p) => p.packId === packId)
    .reduce((sum, p) => sum + p.amountCents, 0);
}

/** Saldo pendiente = precio total - abonado. Siempre calculado, nunca guardado. */
export function packBalanceCents(pack: Pack, paidCents: number): number {
  return Math.max(0, pack.totalPriceCents - paidCents);
}

/** Próximo número de sesión libre (1-based) dentro del pack. */
export function nextPackSessionNumber(db: DbShape, pack: Pack): number {
  const used = new Set(
    activePackSessions(db, pack.id)
      .map((a) => a.packSessionNumber)
      .filter((n): n is number => n != null),
  );
  for (let n = 1; n <= pack.sessionsCount; n++) {
    if (!used.has(n)) return n;
  }
  return pack.sessionsCount + 1;
}

export type PackScheduleBlockReason =
  | "PACK_NOT_SCHEDULABLE"
  | "PACK_FULL"
  | "SLOT_TAKEN";

/** Chequea si se puede agendar una sesión más del pack (sin mirar el horario todavía). */
export function canScheduleAnotherSession(
  db: DbShape,
  pack: Pack,
): { ok: true } | { ok: false; reason: PackScheduleBlockReason; message: string } {
  if (pack.status === "CANCELLED" || pack.status === "COMPLETED") {
    return {
      ok: false,
      reason: "PACK_NOT_SCHEDULABLE",
      message: "Este pack no admite nuevas sesiones.",
    };
  }
  if (activePackSessions(db, pack.id).length >= pack.sessionsCount) {
    return {
      ok: false,
      reason: "PACK_FULL",
      message: `Este pack ya tiene sus ${pack.sessionsCount} sesiones asignadas.`,
    };
  }
  return { ok: true };
}

/**
 * Si todas las sesiones del pack ya están COMPLETED, marca el pack como
 * COMPLETED. Si el pack estaba COMPLETED pero ya no corresponde (por ej. se
 * revirtió el estado de una sesión), lo vuelve a ACTIVE. No toca packs
 * CANCELLED. Muta `pack` en el lugar.
 */
export function syncPackStatus(db: DbShape, pack: Pack): void {
  if (pack.status === "CANCELLED") return;

  const allDone =
    pack.sessionsCount > 0 && completedPackSessionsCount(db, pack.id) >= pack.sessionsCount;

  if (allDone && pack.status !== "COMPLETED") {
    pack.status = "COMPLETED";
    pack.updatedAt = new Date().toISOString();
  } else if (!allDone && pack.status === "COMPLETED") {
    pack.status = "ACTIVE";
    pack.updatedAt = new Date().toISOString();
  }
}

export type CreateManualPackInput = {
  serviceId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  sessionsCount: number;
  totalPriceCents: number;
  status: "PENDING" | "ACTIVE";
  notes?: string | null;
  /** Pago inicial opcional a registrar junto con la creación. */
  initialPayment?: {
    amountCents: number;
    paymentDate: string;
    method: PackPaymentMethod;
    notes?: string | null;
  };
};

/** Crea un pack manualmente (ej. clienta que reservó por WhatsApp). No agenda sesiones. */
export function createManualPack(
  db: DbShape,
  service: Service,
  input: CreateManualPackInput,
): { pack: Pack; payment: PackPayment | null } {
  const now = new Date().toISOString();
  const pack: Pack = {
    id: crypto.randomUUID(),
    serviceId: service.id,
    name: service.name,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    clientEmail: input.clientEmail || null,
    sessionsCount: input.sessionsCount,
    totalPriceCents: input.totalPriceCents,
    status: input.status,
    notes: input.notes || null,
    createdAt: now,
    updatedAt: now,
  };
  db.packs.push(pack);

  let payment: PackPayment | null = null;
  if (input.initialPayment && input.initialPayment.amountCents > 0) {
    payment = registerPackPayment(db, pack, {
      amountCents: input.initialPayment.amountCents,
      paymentDate: input.initialPayment.paymentDate,
      method: input.initialPayment.method,
      notes: input.initialPayment.notes,
    });
  }

  return { pack, payment };
}

export type RegisterPaymentInput = {
  amountCents: number;
  paymentDate: string;
  method: PackPaymentMethod;
  notes?: string | null;
};

export class PackPaymentError extends Error {}

/** Registra un pago del pack. Valida monto positivo y que no supere el saldo. */
export function registerPackPayment(
  db: DbShape,
  pack: Pack,
  input: RegisterPaymentInput,
): PackPayment {
  if (input.amountCents <= 0) {
    throw new PackPaymentError("El monto debe ser mayor a cero.");
  }
  const paidSoFar = packPaidCents(db, pack.id);
  const balance = packBalanceCents(pack, paidSoFar);
  if (input.amountCents > balance) {
    throw new PackPaymentError(
      "El monto supera el saldo pendiente del pack.",
    );
  }

  const payment: PackPayment = {
    id: crypto.randomUUID(),
    packId: pack.id,
    amountCents: input.amountCents,
    paymentDate: input.paymentDate,
    method: input.method,
    notes: input.notes || null,
    createdAt: new Date().toISOString(),
  };
  db.packPayments.push(payment);
  pack.updatedAt = new Date().toISOString();
  return payment;
}

export class PackScheduleError extends Error {
  reason: PackScheduleBlockReason;
  constructor(reason: PackScheduleBlockReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

export type SchedulePackSessionInput = {
  date: string;
  startTime: string;
  /** Si no se pasa, se toma de los datos del pack. */
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string | null;
  notes?: string | null;
};

/**
 * Agenda una nueva sesión para un pack ya existente. Corre dentro de la
 * misma sección crítica que el resto de las escrituras de turnos (llamar
 * siempre desde dentro de mutateDb) para que el chequeo de disponibilidad y
 * la creación sean atómicos.
 */
export function schedulePackSession(
  db: DbShape,
  pack: Pack,
  service: Service,
  input: SchedulePackSessionInput,
): Appointment {
  const canSchedule = canScheduleAnotherSession(db, pack);
  if (!canSchedule.ok) {
    throw new PackScheduleError(canSchedule.reason, canSchedule.message);
  }

  const endTime = minutesToTime(
    timeToMinutes(input.startTime) + service.durationMinutes,
  );

  if (
    !isSlotStillAvailable({
      db,
      serviceId: service.id,
      date: input.date,
      startTime: input.startTime,
      endTime,
    })
  ) {
    throw new PackScheduleError("SLOT_TAKEN", "Ese horario ya no está disponible, elegí otro.");
  }

  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: crypto.randomUUID(),
    serviceId: service.id,
    date: input.date,
    startTime: input.startTime,
    endTime,
    clientName: input.clientName ?? pack.clientName,
    clientPhone: input.clientPhone ?? pack.clientPhone,
    clientEmail: (input.clientEmail ?? pack.clientEmail) || null,
    notes: input.notes || null,
    status: pack.status === "ACTIVE" ? "CONFIRMED" : "PENDING",
    packId: pack.id,
    packSessionNumber: nextPackSessionNumber(db, pack),
    archivedAt: null,
    depositPaidCents: null,
    createdAt: now,
    updatedAt: now,
  };
  db.appointments.push(appointment);
  return appointment;
}

export class PackConfirmError extends Error {}

/**
 * Confirma un pack luego de recibir el pago inicial: activa el pack,
 * registra el pago (si se pasa) y confirma su primera sesión pendiente.
 * NO genera sesiones nuevas ni vuelve a pedir seña para las restantes.
 */
export function confirmPack(
  db: DbShape,
  pack: Pack,
  payment?: RegisterPaymentInput,
): { pack: Pack; confirmedSession: Appointment | null } {
  if (pack.status !== "PENDING") {
    throw new PackConfirmError("Este pack no está pendiente de confirmación.");
  }

  if (payment) {
    registerPackPayment(db, pack, payment);
  }

  pack.status = "ACTIVE";
  pack.updatedAt = new Date().toISOString();

  const firstSession = allPackSessions(db, pack.id).find(
    (a) => a.status === "PENDING",
  );
  if (firstSession) {
    firstSession.status = "CONFIRMED";
    firstSession.updatedAt = new Date().toISOString();
  }

  return { pack, confirmedSession: firstSession ?? null };
}

/** Cancela el pack y todas sus sesiones futuras (no completadas), liberando esos horarios. */
export function cancelPack(db: DbShape, pack: Pack): void {
  pack.status = "CANCELLED";
  pack.updatedAt = new Date().toISOString();

  const now = new Date().toISOString();
  for (const session of db.appointments) {
    if (session.packId === pack.id && session.status !== "COMPLETED" && session.status !== "CANCELLED") {
      session.status = "CANCELLED";
      session.updatedAt = now;
    }
  }
}

export type PackWithProgress = Pack & {
  paidCents: number;
  balanceCents: number;
  completedSessions: number;
  activeSessions: number;
  sessions: Appointment[];
};

/** Arma la vista "serializada" de un pack con todos los campos calculados. */
export function packWithProgress(db: DbShape, pack: Pack): PackWithProgress {
  const paidCents = packPaidCents(db, pack.id);
  return {
    ...pack,
    paidCents,
    balanceCents: packBalanceCents(pack, paidCents),
    completedSessions: completedPackSessionsCount(db, pack.id),
    activeSessions: activePackSessions(db, pack.id).length,
    sessions: allPackSessions(db, pack.id),
  };
}
