export type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
  /** Si es true, este servicio se vende como pack de varias sesiones. */
  isPack: boolean;
  /** Cantidad de sesiones que incluye el pack. Solo aplica si isPack. */
  packSessionsCount: number | null;
  /** Si es true, no se muestra en el catálogo público ni se puede reservar desde la web (turno personalizado de un solo admin). */
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WeeklyAvailability = {
  id: string;
  dayOfWeek: number; // 0 = domingo ... 6 = sábado
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
};

export type BlockedDate = {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string | null; // null = todo el día bloqueado
  endTime: string | null;
  reason: string | null;
};

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

export type Appointment = {
  id: string;
  serviceId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  notes: string | null;
  status: AppointmentStatus;
  /** Si esta sesión pertenece a un pack, el id de ese pack. Si no, null. */
  packId: string | null;
  /** Número de sesión dentro del pack (1-based). Solo aplica si packId. */
  packSessionNumber: number | null;
  /** "Eliminado visual": sigue existiendo, pero no se muestra en la lista por defecto. */
  archivedAt: string | null;
  /** Monto ya abonado (opcional, informativo). En centavos. */
  depositPaidCents: number | null;
  /**
   * Precio del servicio congelado al momento de crear el turno, en
   * centavos. Se usa para reportes de ingresos, para que no cambien
   * retroactivamente si después se edita el precio del servicio. Nullable
   * porque los turnos creados antes de este campo no lo tienen.
   */
  priceCentsAtBooking: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Admin = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
};

export type PackStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type Pack = {
  id: string;
  serviceId: string;
  name: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  sessionsCount: number;
  /** Precio total del pack, en centavos. */
  totalPriceCents: number;
  status: PackStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PackPaymentMethod = "CASH" | "TRANSFER" | "MERCADOPAGO" | "OTHER";

export type PackPayment = {
  id: string;
  packId: string;
  amountCents: number;
  paymentDate: string; // "YYYY-MM-DD"
  method: PackPaymentMethod;
  notes: string | null;
  createdAt: string;
};

export type Settings = {
  /** Margen mínimo obligatorio (en minutos) entre el fin de un turno y el inicio del siguiente. */
  bufferMinutes: number;
};

export type DbShape = {
  admins: Admin[];
  services: Service[];
  weeklyAvailability: WeeklyAvailability[];
  blockedDates: BlockedDate[];
  appointments: Appointment[];
  packs: Pack[];
  packPayments: PackPayment[];
  settings: Settings;
};
