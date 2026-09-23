import type { DbShape, Service } from "@/lib/db-types";

export function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export function makeService(overrides: Partial<Service> = {}): Service {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Maderoterapia + Drenaje",
    description: null,
    durationMinutes: 60,
    priceCents: 3800000,
    active: true,
    isPack: false,
    packSessionsCount: null,
    hidden: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makePackService(overrides: Partial<Service> = {}): Service {
  return makeService({
    name: "Maderoterapia + Drenaje | Pack x4",
    isPack: true,
    packSessionsCount: 4,
    priceCents: 13500000, // $135.000
    ...overrides,
  });
}

export function makeHiddenService(overrides: Partial<Service> = {}): Service {
  return makeService({
    name: "Personalizado – Masaje de espalda + Maderoterapia",
    hidden: true,
    ...overrides,
  });
}

/** DbShape vacío con disponibilidad todos los días 09:00-20:00 (evita depender del día de la semana). */
export function makeDb(services: Service[] = [], bufferMinutes = 0): DbShape {
  const weeklyAvailability = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    id: crypto.randomUUID(),
    dayOfWeek,
    startTime: "09:00",
    endTime: "20:00",
  }));

  return {
    admins: [],
    services,
    weeklyAvailability,
    blockedDates: [],
    appointments: [],
    packs: [],
    packPayments: [],
    settings: {
      bufferMinutes,
      businessName: "Negocio de Prueba",
      depositAlias: "prueba.alias",
      depositAccountHolder: "Titular de Prueba",
      depositWhatsappNumber: "5491100000000",
      businessAddress: "Calle Falsa 123",
      heroTagline: "Tu momento de bienestar empieza acá.",
      colorTheme: "dorado",
    },
  };
}
