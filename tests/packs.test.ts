import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  activePackSessions,
  cancelPack,
  canScheduleAnotherSession,
  completedPackSessionsCount,
  confirmPack,
  createManualPack,
  nextPackSessionNumber,
  packBalanceCents,
  packPaidCents,
  PackPaymentError,
  PackScheduleError,
  registerPackPayment,
  schedulePackSession,
  syncPackStatus,
} from "@/lib/packs";
import { isSlotStillAvailable } from "@/lib/availability";
import { futureDate, makeDb, makePackService, makeService } from "./helpers";

describe("createManualPack", () => {
  it("crea el pack y registra el pago inicial", () => {
    const service = makePackService();
    const db = makeDb([service]);

    const { pack, payment } = createManualPack(db, service, {
      serviceId: service.id,
      clientName: "Clienta X",
      clientPhone: "1111111111",
      sessionsCount: 4,
      totalPriceCents: 13500000,
      status: "ACTIVE",
      initialPayment: {
        amountCents: 6750000,
        paymentDate: futureDate(0),
        method: "TRANSFER",
      },
    });

    assert.equal(db.packs.length, 1);
    assert.equal(pack.status, "ACTIVE");
    assert.ok(payment);
    assert.equal(packPaidCents(db, pack.id), 6750000);
    assert.equal(packBalanceCents(pack, packPaidCents(db, pack.id)), 6750000);
  });
});

describe("registerPackPayment", () => {
  it("suma pagos sucesivos y calcula el saldo correctamente", () => {
    const service = makePackService();
    const db = makeDb([service]);
    const { pack } = createManualPack(db, service, {
      serviceId: service.id,
      clientName: "Clienta",
      clientPhone: "1111111111",
      sessionsCount: 4,
      totalPriceCents: 13500000,
      status: "ACTIVE",
      initialPayment: { amountCents: 6750000, paymentDate: futureDate(0), method: "TRANSFER" },
    });

    registerPackPayment(db, pack, {
      amountCents: 3375000,
      paymentDate: futureDate(0),
      method: "TRANSFER",
    });
    assert.equal(packPaidCents(db, pack.id), 10125000);
    assert.equal(packBalanceCents(pack, packPaidCents(db, pack.id)), 3375000);

    registerPackPayment(db, pack, {
      amountCents: 3375000,
      paymentDate: futureDate(0),
      method: "TRANSFER",
    });
    assert.equal(packPaidCents(db, pack.id), 13500000);
    assert.equal(packBalanceCents(pack, packPaidCents(db, pack.id)), 0);
  });

  it("rechaza montos no positivos", () => {
    const service = makePackService();
    const db = makeDb([service]);
    const { pack } = createManualPack(db, service, {
      serviceId: service.id,
      clientName: "Clienta",
      clientPhone: "1111111111",
      sessionsCount: 4,
      totalPriceCents: 13500000,
      status: "ACTIVE",
    });

    assert.throws(
      () => registerPackPayment(db, pack, { amountCents: 0, paymentDate: futureDate(0), method: "CASH" }),
      PackPaymentError,
    );
    assert.throws(
      () => registerPackPayment(db, pack, { amountCents: -100, paymentDate: futureDate(0), method: "CASH" }),
      PackPaymentError,
    );
  });

  it("rechaza pagos que superan el saldo pendiente", () => {
    const service = makePackService();
    const db = makeDb([service]);
    const { pack } = createManualPack(db, service, {
      serviceId: service.id,
      clientName: "Clienta",
      clientPhone: "1111111111",
      sessionsCount: 4,
      totalPriceCents: 13500000,
      status: "ACTIVE",
      initialPayment: { amountCents: 13500000, paymentDate: futureDate(0), method: "TRANSFER" },
    });

    assert.throws(
      () => registerPackPayment(db, pack, { amountCents: 1, paymentDate: futureDate(0), method: "CASH" }),
      PackPaymentError,
    );
  });
});

describe("schedulePackSession", () => {
  it("agenda hasta el límite de sesiones y numera 1..N", () => {
    const service = makePackService();
    const db = makeDb([service]);
    const { pack } = createManualPack(db, service, {
      serviceId: service.id,
      clientName: "Clienta",
      clientPhone: "1111111111",
      sessionsCount: 4,
      totalPriceCents: 13500000,
      status: "ACTIVE",
    });

    const dates = [10, 17, 24, 31].map(futureDate);
    const sessions = dates.map((date) =>
      schedulePackSession(db, pack, service, { date, startTime: "10:00" }),
    );

    assert.deepEqual(
      sessions.map((s) => s.packSessionNumber),
      [1, 2, 3, 4],
    );
    assert.ok(sessions.every((s) => s.status === "CONFIRMED"));
    assert.equal(activePackSessions(db, pack.id).length, 4);
  });

  it("impide agendar una quinta sesión", () => {
    const service = makePackService();
    const db = makeDb([service]);
    const { pack } = createManualPack(db, service, {
      serviceId: service.id,
      clientName: "Clienta",
      clientPhone: "1111111111",
      sessionsCount: 4,
      totalPriceCents: 13500000,
      status: "ACTIVE",
    });

    [10, 17, 24, 31]
      .map(futureDate)
      .forEach((date) => schedulePackSession(db, pack, service, { date, startTime: "10:00" }));

    assert.equal(canScheduleAnotherSession(db, pack).ok, false);
    assert.throws(
      () => schedulePackSession(db, pack, service, { date: futureDate(38), startTime: "10:00" }),
      (err: unknown) => err instanceof PackScheduleError && err.reason === "PACK_FULL",
    );
  });

  it("cancelar una sesión libera el cupo para agendar otra", () => {
    const service = makePackService();
    const db = makeDb([service]);
    const { pack } = createManualPack(db, service, {
      serviceId: service.id,
      clientName: "Clienta",
      clientPhone: "1111111111",
      sessionsCount: 4,
      totalPriceCents: 13500000,
      status: "ACTIVE",
    });

    const dates = [10, 17, 24, 31].map(futureDate);
    const sessions = dates.map((date) =>
      schedulePackSession(db, pack, service, { date, startTime: "10:00" }),
    );

    // cancelar la sesión 2
    sessions[1].status = "CANCELLED";
    assert.equal(activePackSessions(db, pack.id).length, 3);
    assert.equal(canScheduleAnotherSession(db, pack).ok, true);

    // el próximo número libre es el 2 (el que quedó liberado)
    assert.equal(nextPackSessionNumber(db, pack), 2);

    const replacement = schedulePackSession(db, pack, service, {
      date: futureDate(45),
      startTime: "10:00",
    });
    assert.equal(replacement.packSessionNumber, 2);
    assert.equal(activePackSessions(db, pack.id).length, 4);
  });

  it("reprogramar (mover fecha/horario de la misma sesión) no consume otro cupo", () => {
    const service = makePackService();
    const db = makeDb([service]);
    const { pack } = createManualPack(db, service, {
      serviceId: service.id,
      clientName: "Clienta",
      clientPhone: "1111111111",
      sessionsCount: 4,
      totalPriceCents: 13500000,
      status: "ACTIVE",
    });

    const session = schedulePackSession(db, pack, service, {
      date: futureDate(10),
      startTime: "10:00",
    });
    const countBefore = activePackSessions(db, pack.id).length;
    const numberBefore = session.packSessionNumber;

    // reprogramar: se muta la misma reserva, no se crea una nueva
    session.date = futureDate(12);
    session.startTime = "11:00";
    session.endTime = "12:00";

    assert.equal(activePackSessions(db, pack.id).length, countBefore);
    assert.equal(session.packSessionNumber, numberBefore);
  });

  it("no permite doble reserva del mismo horario (disponibilidad real)", () => {
    const service = makePackService();
    const db = makeDb([service]);
    const { pack } = createManualPack(db, service, {
      serviceId: service.id,
      clientName: "Clienta",
      clientPhone: "1111111111",
      sessionsCount: 4,
      totalPriceCents: 13500000,
      status: "ACTIVE",
    });

    const date = futureDate(10);
    schedulePackSession(db, pack, service, { date, startTime: "10:00" });

    assert.throws(
      () => schedulePackSession(db, pack, service, { date, startTime: "10:00" }),
      (err: unknown) => err instanceof PackScheduleError && err.reason === "SLOT_TAKEN",
    );

    assert.equal(
      isSlotStillAvailable({
        db,
        serviceId: service.id,
        date,
        startTime: "10:00",
        endTime: "11:00",
      }),
      false,
    );
  });
});

describe("completar sesiones y el pack", () => {
  it("cuenta solo las COMPLETED, sin doble conteo, y completa el pack al llegar a N/N", () => {
    const service = makePackService();
    const db = makeDb([service]);
    const { pack } = createManualPack(db, service, {
      serviceId: service.id,
      clientName: "Clienta",
      clientPhone: "1111111111",
      sessionsCount: 4,
      totalPriceCents: 13500000,
      status: "ACTIVE",
    });

    const sessions = [10, 17, 24, 31]
      .map(futureDate)
      .map((date) => schedulePackSession(db, pack, service, { date, startTime: "10:00" }));

    assert.equal(completedPackSessionsCount(db, pack.id), 0);

    sessions[0].status = "COMPLETED";
    syncPackStatus(db, pack);
    assert.equal(completedPackSessionsCount(db, pack.id), 1);
    assert.equal(pack.status, "ACTIVE");

    // marcar la misma sesión como completada de nuevo no debe duplicar el conteo
    sessions[0].status = "COMPLETED";
    syncPackStatus(db, pack);
    assert.equal(completedPackSessionsCount(db, pack.id), 1);

    sessions[1].status = "COMPLETED";
    sessions[2].status = "COMPLETED";
    sessions[3].status = "COMPLETED";
    syncPackStatus(db, pack);

    assert.equal(completedPackSessionsCount(db, pack.id), 4);
    assert.equal(pack.status, "COMPLETED");
  });

  it("el pack completado puede tener saldo pendiente (son conceptos independientes)", () => {
    const service = makePackService();
    const db = makeDb([service]);
    const { pack } = createManualPack(db, service, {
      serviceId: service.id,
      clientName: "Clienta",
      clientPhone: "1111111111",
      sessionsCount: 1,
      totalPriceCents: 10000,
      status: "ACTIVE",
    });

    const session = schedulePackSession(db, pack, service, {
      date: futureDate(10),
      startTime: "10:00",
    });
    session.status = "COMPLETED";
    syncPackStatus(db, pack);

    assert.equal(pack.status, "COMPLETED");
    assert.equal(packBalanceCents(pack, packPaidCents(db, pack.id)), 10000);
  });
});

describe("confirmPack", () => {
  it("activa el pack y confirma solo la primera sesión pendiente", () => {
    const service = makePackService();
    const db = makeDb([service]);
    const { pack } = createManualPack(db, service, {
      serviceId: service.id,
      clientName: "Clienta",
      clientPhone: "1111111111",
      sessionsCount: 4,
      totalPriceCents: 13500000,
      status: "PENDING",
    });

    const firstSession = schedulePackSession(db, pack, service, {
      date: futureDate(10),
      startTime: "10:00",
    });
    assert.equal(firstSession.status, "PENDING");

    const { pack: confirmed, confirmedSession } = confirmPack(db, pack, {
      amountCents: 6750000,
      paymentDate: futureDate(0),
      method: "TRANSFER",
    });

    assert.equal(confirmed.status, "ACTIVE");
    assert.equal(confirmedSession?.id, firstSession.id);
    assert.equal(firstSession.status, "CONFIRMED");
    assert.equal(packPaidCents(db, pack.id), 6750000);

    // no genera sesiones nuevas
    assert.equal(activePackSessions(db, pack.id).length, 1);
  });
});

describe("cancelPack", () => {
  it("cancela el pack y sus sesiones no completadas, conservando pagos e historial", () => {
    const service = makePackService();
    const db = makeDb([service]);
    const { pack } = createManualPack(db, service, {
      serviceId: service.id,
      clientName: "Clienta",
      clientPhone: "1111111111",
      sessionsCount: 4,
      totalPriceCents: 13500000,
      status: "ACTIVE",
      initialPayment: { amountCents: 6750000, paymentDate: futureDate(0), method: "TRANSFER" },
    });

    const s1 = schedulePackSession(db, pack, service, { date: futureDate(10), startTime: "10:00" });
    const s2 = schedulePackSession(db, pack, service, { date: futureDate(17), startTime: "10:00" });
    s1.status = "COMPLETED";

    cancelPack(db, pack);

    assert.equal(pack.status, "CANCELLED");
    assert.equal(s1.status, "COMPLETED"); // no se toca una sesión ya realizada
    assert.equal(s2.status, "CANCELLED");
    assert.equal(db.packPayments.length, 1); // se conserva el pago
    assert.equal(db.appointments.length, 2); // se conservan las sesiones (no se borran)
  });
});

describe("reservas individuales (no pack)", () => {
  it("no se ven afectadas por los packs", () => {
    const normalService = makeService();
    const packService = makePackService();
    const db = makeDb([normalService, packService]);

    const { pack } = createManualPack(db, packService, {
      serviceId: packService.id,
      clientName: "Clienta pack",
      clientPhone: "2222222222",
      sessionsCount: 4,
      totalPriceCents: 13500000,
      status: "ACTIVE",
    });
    schedulePackSession(db, pack, packService, { date: futureDate(10), startTime: "10:00" });

    // turno normal, sin packId
    const now = new Date().toISOString();
    db.appointments.push({
      id: crypto.randomUUID(),
      serviceId: normalService.id,
      date: futureDate(10),
      startTime: "12:00",
      endTime: "13:00",
      clientName: "Clienta suelta",
      clientPhone: "3333333333",
      clientEmail: null,
      notes: null,
      status: "CONFIRMED",
      packId: null,
      packSessionNumber: null,
      createdAt: now,
      updatedAt: now,
    });

    assert.equal(packPaidCents(db, pack.id), 0);
    assert.equal(activePackSessions(db, pack.id).length, 1);
    assert.equal(
      isSlotStillAvailable({
        db,
        serviceId: normalService.id,
        date: futureDate(10),
        startTime: "12:00",
        endTime: "13:00",
      }),
      false, // ya está tomado por el turno normal que acabamos de crear
    );
  });
});
