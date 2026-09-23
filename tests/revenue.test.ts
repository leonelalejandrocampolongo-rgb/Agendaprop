import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeMonthlyRevenue } from "@/lib/revenue";
import { createManualPack, registerPackPayment, schedulePackSession } from "@/lib/packs";
import { futureDate, makeDb, makePackService, makeService } from "./helpers";

function pushAppointment(
  db: ReturnType<typeof makeDb>,
  overrides: Partial<{
    serviceId: string;
    date: string;
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    priceCentsAtBooking: number | null;
    packId: string | null;
  }>,
) {
  const now = new Date().toISOString();
  db.appointments.push({
    id: crypto.randomUUID(),
    serviceId: overrides.serviceId ?? "",
    date: overrides.date ?? "2026-05-10",
    startTime: "10:00",
    endTime: "11:00",
    clientName: "Clienta",
    clientPhone: "1111111111",
    clientEmail: null,
    notes: null,
    status: overrides.status ?? "COMPLETED",
    packId: overrides.packId ?? null,
    packSessionNumber: overrides.packId ? 1 : null,
    archivedAt: null,
    depositPaidCents: null,
    priceCentsAtBooking: "priceCentsAtBooking" in overrides ? overrides.priceCentsAtBooking! : 1000000,
    createdAt: now,
    updatedAt: now,
  });
}

describe("computeMonthlyRevenue", () => {
  it("suma los turnos sueltos completados del mes, usando el precio congelado", () => {
    const service = makeService({ priceCents: 2000000 });
    const db = makeDb([service]);
    pushAppointment(db, { serviceId: service.id, date: "2026-05-05", priceCentsAtBooking: 1500000 });
    pushAppointment(db, { serviceId: service.id, date: "2026-05-20", priceCentsAtBooking: 1800000 });

    const revenue = computeMonthlyRevenue(db, 2026, 5);
    assert.equal(revenue.appointmentsTotalCents, 3300000);
    assert.equal(revenue.appointmentsCount, 2);
  });

  it("ignora turnos cancelados y pendientes", () => {
    const service = makeService();
    const db = makeDb([service]);
    pushAppointment(db, { serviceId: service.id, date: "2026-05-05", status: "CANCELLED" });
    pushAppointment(db, { serviceId: service.id, date: "2026-05-06", status: "PENDING" });
    pushAppointment(db, { serviceId: service.id, date: "2026-05-06", status: "CONFIRMED" });

    const revenue = computeMonthlyRevenue(db, 2026, 5);
    assert.equal(revenue.appointmentsTotalCents, 0);
    assert.equal(revenue.appointmentsCount, 0);
  });

  it("ignora turnos de otros meses o años", () => {
    const service = makeService();
    const db = makeDb([service]);
    pushAppointment(db, { serviceId: service.id, date: "2026-04-30", priceCentsAtBooking: 1000000 });
    pushAppointment(db, { serviceId: service.id, date: "2025-05-15", priceCentsAtBooking: 1000000 });
    pushAppointment(db, { serviceId: service.id, date: "2026-06-01", priceCentsAtBooking: 1000000 });

    const revenue = computeMonthlyRevenue(db, 2026, 5);
    assert.equal(revenue.appointmentsCount, 0);
  });

  it("si el turno no tiene precio congelado (dato viejo), usa el precio actual del servicio", () => {
    const service = makeService({ priceCents: 4200000 });
    const db = makeDb([service]);
    pushAppointment(db, { serviceId: service.id, date: "2026-05-05", priceCentsAtBooking: null });

    const revenue = computeMonthlyRevenue(db, 2026, 5);
    assert.equal(revenue.appointmentsTotalCents, 4200000);
  });

  it("las sesiones de pack completadas NO suman su precio individualmente (evita contarlas 4 veces)", () => {
    const packService = makePackService({ priceCents: 20000000 });
    const db = makeDb([packService]);
    const { pack } = createManualPack(db, packService, {
      serviceId: packService.id,
      clientName: "Clienta Pack",
      clientPhone: "2222222222",
      sessionsCount: 4,
      totalPriceCents: 20000000,
      status: "ACTIVE",
    });

    const date = futureDate(10);
    const startTimes = ["10:00", "12:00", "14:00", "16:00"];
    for (const startTime of startTimes) {
      const session = schedulePackSession(db, pack, packService, { date, startTime });
      session.status = "COMPLETED";
    }

    const [year, month] = date.split("-").map(Number);
    const revenue = computeMonthlyRevenue(db, year, month);
    assert.equal(revenue.appointmentsTotalCents, 0);
    assert.equal(revenue.appointmentsCount, 0);
  });

  it("suma los pagos de pack por la fecha real en que se cobraron, no por la fecha de las sesiones", () => {
    const packService = makePackService({ priceCents: 20000000 });
    const db = makeDb([packService]);
    const { pack } = createManualPack(db, packService, {
      serviceId: packService.id,
      clientName: "Clienta Pack",
      clientPhone: "2222222222",
      sessionsCount: 4,
      totalPriceCents: 20000000,
      status: "ACTIVE",
      initialPayment: { amountCents: 10000000, paymentDate: "2026-04-28", method: "TRANSFER" },
    });
    registerPackPayment(db, pack, { amountCents: 5000000, paymentDate: "2026-05-03", method: "CASH" });
    registerPackPayment(db, pack, { amountCents: 5000000, paymentDate: "2026-06-01", method: "CASH" });

    const mayRevenue = computeMonthlyRevenue(db, 2026, 5);
    assert.equal(mayRevenue.packPaymentsTotalCents, 5000000);
    assert.equal(mayRevenue.packPaymentsCount, 1);

    const aprilRevenue = computeMonthlyRevenue(db, 2026, 4);
    assert.equal(aprilRevenue.packPaymentsTotalCents, 10000000);

    const juneRevenue = computeMonthlyRevenue(db, 2026, 6);
    assert.equal(juneRevenue.packPaymentsTotalCents, 5000000);
  });

  it("el total del mes combina turnos sueltos completados + pagos de pack", () => {
    const service = makeService();
    const packService = makePackService();
    const db = makeDb([service, packService]);
    pushAppointment(db, { serviceId: service.id, date: "2026-05-05", priceCentsAtBooking: 1200000 });

    const { pack } = createManualPack(db, packService, {
      serviceId: packService.id,
      clientName: "Clienta Pack",
      clientPhone: "2222222222",
      sessionsCount: 4,
      totalPriceCents: 20000000,
      status: "ACTIVE",
      initialPayment: { amountCents: 6750000, paymentDate: "2026-05-10", method: "TRANSFER" },
    });
    void pack;

    const revenue = computeMonthlyRevenue(db, 2026, 5);
    assert.equal(revenue.appointmentsTotalCents, 1200000);
    assert.equal(revenue.packPaymentsTotalCents, 6750000);
    assert.equal(revenue.totalCents, 7950000);
  });
});
