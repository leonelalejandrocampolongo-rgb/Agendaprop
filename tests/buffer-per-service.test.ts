import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAvailableSlots } from "@/lib/availability";
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

describe("margen entre turnos configurable por servicio", () => {
  it("un servicio con bufferMinutes propio ignora el margen general", () => {
    const service = makeService({ durationMinutes: 30, bufferMinutes: 30 });
    // margen general = 15, pero el servicio pide 30
    const db = makeDb([service], 15);
    const date = futureDate(10);
    bookAppointment(db, service.id, date, "09:30", "10:00");

    const slots = getAvailableSlots({ db, serviceId: service.id, date });
    const starts = slots.map((s) => s.start);

    assert.ok(!starts.includes("10:00"));
    assert.ok(!starts.includes("10:15"), "con margen de 30, 10:15 no alcanza");
    assert.ok(starts.includes("10:30"));
  });

  it("un servicio con bufferMinutes: null usa el margen general", () => {
    const service = makeService({ durationMinutes: 30, bufferMinutes: null });
    const db = makeDb([service], 15);
    const date = futureDate(10);
    bookAppointment(db, service.id, date, "09:30", "10:00");

    const slots = getAvailableSlots({ db, serviceId: service.id, date });
    const starts = slots.map((s) => s.start);

    assert.ok(!starts.includes("10:00"));
    assert.ok(starts.includes("10:15"));
  });

  it("un servicio con bufferMinutes: 0 permite turnos pegados aunque el margen general sea mayor", () => {
    const service = makeService({ durationMinutes: 30, bufferMinutes: 0 });
    const db = makeDb([service], 15);
    const date = futureDate(10);
    bookAppointment(db, service.id, date, "09:30", "10:00");

    const slots = getAvailableSlots({ db, serviceId: service.id, date });
    assert.ok(slots.some((s) => s.start === "10:00"));
  });
});
