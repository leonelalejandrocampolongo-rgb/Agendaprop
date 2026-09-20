import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createCustomAppointment, CustomAppointmentError } from "@/lib/custom-appointments";
import { activePackSessions, packPaidCents } from "@/lib/packs";
import { isSlotStillAvailable } from "@/lib/availability";
import { futureDate, makeDb } from "./helpers";

describe("createCustomAppointment — turno único", () => {
  it("crea un servicio oculto y un turno confirmado que bloquea el horario", () => {
    const db = makeDb([]);
    const date = futureDate(10);

    const result = createCustomAppointment(db, {
      clientName: "Clienta X",
      clientPhone: "1111111111",
      treatmentName: "Personalizado – Masaje de espalda + Maderoterapia",
      description: "Combinación armada para esta clienta",
      durationMinutes: 90,
      isPack: false,
      priceCents: 5000000,
      date,
      startTime: "18:00",
      status: "CONFIRMED",
      depositPaidCents: 1000000,
    });

    assert.equal(result.kind, "appointment");
    assert.equal(db.services.length, 1);
    assert.equal(db.services[0].hidden, true);
    assert.equal(db.services[0].active, true);
    assert.equal(db.services[0].durationMinutes, 90);

    if (result.kind !== "appointment") throw new Error("expected appointment");
    assert.equal(result.appointment.status, "CONFIRMED");
    assert.equal(result.appointment.endTime, "19:30");
    assert.equal(result.appointment.depositPaidCents, 1000000);
    assert.equal(result.appointment.packId, null);

    // bloquea el horario igual que cualquier turno
    assert.equal(
      isSlotStillAvailable({
        db,
        serviceId: result.service.id,
        date,
        startTime: "18:00",
        endTime: "19:30",
      }),
      false,
    );
  });

  it("no aparece en el catálogo público (servicio oculto)", () => {
    const db = makeDb([]);
    createCustomAppointment(db, {
      clientName: "Clienta X",
      clientPhone: "1111111111",
      treatmentName: "Personalizado – Tratamiento único",
      durationMinutes: 60,
      isPack: false,
      priceCents: 2000000,
      date: futureDate(5),
      startTime: "10:00",
    });

    const publicServices = db.services.filter((s) => s.active && !s.hidden);
    assert.equal(publicServices.length, 0);
  });

  it("respeta la disponibilidad: rechaza un horario ya ocupado", () => {
    const db = makeDb([]);
    const date = futureDate(10);

    createCustomAppointment(db, {
      clientName: "Clienta X",
      clientPhone: "1111111111",
      treatmentName: "Personalizado – A",
      durationMinutes: 60,
      isPack: false,
      priceCents: 1000000,
      date,
      startTime: "18:00",
    });

    assert.throws(
      () =>
        createCustomAppointment(db, {
          clientName: "Clienta Y",
          clientPhone: "2222222222",
          treatmentName: "Personalizado – B",
          durationMinutes: 60,
          isPack: false,
          priceCents: 1000000,
          date,
          startTime: "18:00",
        }),
      (err: unknown) => err instanceof CustomAppointmentError && err.reason === "SLOT_TAKEN",
    );
  });
});

describe("createCustomAppointment — pack personalizado", () => {
  it("crea un pack oculto usando el mismo sistema de packs, con sesiones agendables por separado", () => {
    const db = makeDb([]);

    const result = createCustomAppointment(db, {
      clientName: "Clienta Pack",
      clientPhone: "3333333333",
      treatmentName: "Personalizado – Masaje de espalda + Maderoterapia",
      durationMinutes: 90,
      isPack: true,
      sessionsCount: 4,
      totalPriceCents: 20000000,
      paidCents: 10000000,
      paymentDate: futureDate(0),
      paymentMethod: "TRANSFER",
      packStatus: "ACTIVE",
    });

    assert.equal(result.kind, "pack");
    if (result.kind !== "pack") throw new Error("expected pack");

    assert.equal(result.pack.sessionsCount, 4);
    assert.equal(result.pack.totalPriceCents, 20000000);
    assert.equal(result.pack.status, "ACTIVE");
    assert.equal(packPaidCents(db, result.pack.id), 10000000);
    // no agenda sesiones automáticamente; se agendan después, como cualquier pack
    assert.equal(activePackSessions(db, result.pack.id).length, 0);

    assert.equal(result.service.hidden, true);
    assert.equal(result.service.isPack, true);
    assert.equal(result.service.packSessionsCount, 4);
  });
});
