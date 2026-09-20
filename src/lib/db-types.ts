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

export type DbShape = {
  admins: Admin[];
  services: Service[];
  weeklyAvailability: WeeklyAvailability[];
  blockedDates: BlockedDate[];
  appointments: Appointment[];
  packs: Pack[];
  packPayments: PackPayment[];
};
