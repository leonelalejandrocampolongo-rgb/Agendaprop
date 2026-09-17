export type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
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

export type DbShape = {
  admins: Admin[];
  services: Service[];
  weeklyAvailability: WeeklyAvailability[];
  blockedDates: BlockedDate[];
  appointments: Appointment[];
};
