import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAvailableSlots, isSlotStillAvailable } from "@/lib/availability";
import { createCustomAppointment } from "@/lib/custom-appointments";
import { futureDate, makeDb, makeService } from "./helpers";

function bookAppointment(db: ReturnType<typeof makeDb>, serviceId: string, date: string, startTime: string, endTime: string) {
  const now = new Date().toISOString();
  db.appointments.push({
    id: crypto.randomUUID(),
    serviceId,
    date,
    startTime,
    endTime,
    clientName: "Clienta",
    clientPhone: "1111111111",
    clientEmail: null,
    notes: null,
    status: "CONFIRMED",
    packId: null,
    packSessionNumber: null,
    archivedAt: null,
    depositPaidCents: null,
    priceCentsAtBooking: null,
    createdAt: now,
    updatedAt: now,
  });
}

describe("margen entre turnos (buffer)", () => {
  it("con 15 min de margen, un turno de 9:30 a 10:00 bloquea las 10:00 y deja libre 10:15", () => {
    const service = makeService({ durationMinutes: 30 });
    const db = makeDb([service], 15);
    const date = futureDate(10);
    bookAppointment(db, service.id, date, "09:30", "10:00");

    const slots = getAvailableSlots({ db, serviceId: service.id, date });
    const starts = slots.map((s) => s.start);

    assert.ok(!starts.includes("10:00"), "10:00 no debería estar disponible");
    assert.ok(starts.includes("10:15"), "10:15 debería estar disponible");
  });

  it("funciona con cualquier duración: termina 10:30 -> próximo disponible 10:45", () => {
    const service = makeService({ durationMinutes: 60 });
    const db = makeDb([service], 15);
    const date = futureDate(10);
    bookAppointment(db, service.id, date, "09:30", "10:30");

    const slots = getAvailableSlots({ db, serviceId: service.id, date });
    const starts = slots.map((s) => s.start);

    assert.ok(!starts.includes("10:30"));
    assert.ok(starts.includes("10:45"));
  });

  it("termina 11:15 -> próximo disponible 11:30", () => {
    const service = makeService({ durationMinutes: 45 });
    const db = makeDb([service], 15);
    const date = futureDate(10);
    bookAppointment(db, service.id, date, "10:30", "11:15");

    const slots = getAvailableSlots({ db, serviceId: service.id, date });
    const starts = slots.map((s) => s.start);

    assert.ok(!starts.includes("11:15"));
    assert.ok(!starts.includes("11:20"));
    assert.ok(starts.includes("11:30"));
  });

  it("también bloquea el margen ANTES de un turno ya reservado (simétrico)", () => {
    const service = makeService({ durationMinutes: 30 });
    const db = makeDb([service], 15);
    const date = futureDate(10);
    bookAppointment(db, service.id, date, "10:00", "10:30");

    // un turno que terminaría a las 10:00 en punto (9:30-10:00) no deja el margen de 15' antes del de las 10:00
    assert.equal(
      isSlotStillAvailable({ db, serviceId: service.id, date, startTime: "09:30", endTime: "10:00" }),
      false,
    );
    // uno que termina a las 9:45 sí deja el hueco completo
    assert.equal(
      isSlotStillAvailable({ db, serviceId: service.id, date, startTime: "09:15", endTime: "09:45" }),
      true,
    );
  });

  it("con margen en 0, los turnos pueden quedar pegados", () => {
    const service = makeService({ durationMinutes: 30 });
    const db = makeDb([service], 0);
    const date = futureDate(10);
    bookAppointment(db, service.id, date, "09:30", "10:00");

    const slots = getAvailableSlots({ db, serviceId: service.id, date });
    assert.ok(slots.some((s) => s.start === "10:00"));
  });

  it("con margen en 30, hace falta más espacio", () => {
    const service = makeService({ durationMinutes: 30 });
    const db = makeDb([service], 30);
    const date = futureDate(10);
    bookAppointment(db, service.id, date, "09:30", "10:00");

    const slots = getAvailableSlots({ db, serviceId: service.id, date });
    const starts = slots.map((s) => s.start);
    assert.ok(!starts.includes("10:00"));
    assert.ok(!starts.includes("10:15"));
    assert.ok(starts.includes("10:30"));
  });

  it("se aplica también a turnos cargados manualmente desde administración (turno personalizado)", () => {
    const db = makeDb([], 15);
    const date = futureDate(10);

    createCustomAppointment(db, {
      clientName: "Clienta A",
      clientPhone: "1111111111",
      treatmentName: "Personalizado – A",
      durationMinutes: 30,
      isPack: false,
      priceCents: 1000000,
      date,
      startTime: "09:30",
    });

    // otro turno personalizado a las 10:00 debe rechazarse por el margen
    assert.throws(() =>
      createCustomAppointment(db, {
        clientName: "Clienta B",
        clientPhone: "2222222222",
        treatmentName: "Personalizado – B",
        durationMinutes: 30,
        isPack: false,
        priceCents: 1000000,
        date,
        startTime: "10:00",
      }),
    );

    // a las 10:15 sí se puede
    const result = createCustomAppointment(db, {
      clientName: "Clienta C",
      clientPhone: "3333333333",
      treatmentName: "Personalizado – C",
      durationMinutes: 30,
      isPack: false,
      priceCents: 1000000,
      date,
      startTime: "10:15",
    });
    assert.equal(result.kind, "appointment");
  });

  it("no se aplica a los bloqueos manuales de horario, solo entre turnos", () => {
    const service = makeService({ durationMinutes: 30 });
    const db = makeDb([service], 15);
    const date = futureDate(10);
    db.blockedDates.push({
      id: crypto.randomUUID(),
      date,
      startTime: "09:30",
      endTime: "10:00",
      reason: "Almuerzo",
    });

    const slots = getAvailableSlots({ db, serviceId: service.id, date });
    // el bloqueo en sí no tiene margen extra: justo a las 10:00 ya está libre
    assert.ok(slots.some((s) => s.start === "10:00"));
  });
});
