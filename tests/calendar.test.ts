import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  addMonths,
  closedSegments,
  computeGridRange,
  datesOfMonthGrid,
  datesOfWeek,
  isSameMonth,
  layoutDayAppointments,
  startOfWeek,
} from "@/lib/calendar";

describe("addDays", () => {
  it("suma días cruzando meses y años", () => {
    assert.equal(addDays("2026-09-30", 1), "2026-10-01");
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  });

  it("resta días", () => {
    assert.equal(addDays("2026-10-01", -1), "2026-09-30");
  });
});

describe("addMonths", () => {
  it("avanza al mes siguiente, siempre en el día 1", () => {
    assert.equal(addMonths("2026-09-23", 1), "2026-10-01");
  });

  it("retrocede cruzando el año", () => {
    assert.equal(addMonths("2026-01-15", -1), "2025-12-01");
  });
});

describe("startOfWeek / datesOfWeek", () => {
  it("devuelve el lunes de la semana para un día cualquiera (miércoles)", () => {
    // 2026-09-23 es un miércoles
    assert.equal(startOfWeek("2026-09-23"), "2026-09-21");
  });

  it("un domingo pertenece a la semana que empezó el lunes anterior", () => {
    // 2026-09-27 es domingo
    assert.equal(startOfWeek("2026-09-27"), "2026-09-21");
  });

  it("datesOfWeek devuelve 7 fechas consecutivas empezando el lunes", () => {
    const dates = datesOfWeek("2026-09-23");
    assert.deepEqual(dates, [
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ]);
  });
});

describe("datesOfMonthGrid / isSameMonth", () => {
  it("cubre 42 días e incluye el primer y último día del mes", () => {
    const dates = datesOfMonthGrid("2026-09-15");
    assert.equal(dates.length, 42);
    assert.ok(dates.includes("2026-09-01"));
    assert.ok(dates.includes("2026-09-30"));
  });

  it("isSameMonth distingue días del mes vecino que entran en la grilla", () => {
    const dates = datesOfMonthGrid("2026-09-15");
    const outsideMonth = dates.filter((d) => !isSameMonth(d, "2026-09-15"));
    assert.ok(outsideMonth.length > 0);
    for (const d of outsideMonth) {
      assert.ok(!d.startsWith("2026-09"));
    }
  });
});

describe("computeGridRange", () => {
  it("usa el rango por defecto si no hay disponibilidad ni turnos", () => {
    const range = computeGridRange([], []);
    assert.equal(range.startMinutes, 8 * 60);
    assert.equal(range.endMinutes, 20 * 60);
  });

  it("cubre el horario semanal con margen de media hora", () => {
    const range = computeGridRange(
      [{ startTime: "09:00", endTime: "18:00" }],
      [],
    );
    assert.equal(range.startMinutes, 8 * 60 + 30);
    assert.equal(range.endMinutes, 18 * 60 + 30);
  });

  it("se extiende si hay un turno fuera del horario semanal configurado", () => {
    const range = computeGridRange(
      [{ startTime: "09:00", endTime: "18:00" }],
      [{ startTime: "07:00", endTime: "07:30" }],
    );
    assert.ok(range.startMinutes <= 7 * 60);
  });
});

describe("closedSegments", () => {
  it("todo el rango está cerrado si no hay disponibilidad ese día", () => {
    const segments = closedSegments([], 9 * 60, 18 * 60);
    assert.deepEqual(segments, [{ start: 9 * 60, end: 18 * 60 }]);
  });

  it("detecta el hueco de almuerzo entre dos rangos abiertos", () => {
    const segments = closedSegments(
      [
        { startTime: "09:00", endTime: "13:00" },
        { startTime: "14:00", endTime: "18:00" },
      ],
      9 * 60,
      18 * 60,
    );
    assert.deepEqual(segments, [{ start: 13 * 60, end: 14 * 60 }]);
  });

  it("sin huecos si la disponibilidad cubre todo el rango", () => {
    const segments = closedSegments(
      [{ startTime: "09:00", endTime: "18:00" }],
      9 * 60,
      18 * 60,
    );
    assert.deepEqual(segments, []);
  });
});

describe("layoutDayAppointments", () => {
  it("turnos que no se solapan quedan todos en la columna 0 con columnCount 1", () => {
    const appts = [
      { startTime: "09:00", endTime: "10:00" },
      { startTime: "10:00", endTime: "11:00" },
    ];
    const positioned = layoutDayAppointments(appts, 9 * 60);
    assert.ok(positioned.every((p) => p.column === 0 && p.columnCount === 1));
    assert.equal(positioned[0].topMinutes, 0);
    assert.equal(positioned[1].topMinutes, 60);
  });

  it("dos turnos solapados se reparten en 2 columnas", () => {
    const appts = [
      { startTime: "09:00", endTime: "10:00" },
      { startTime: "09:30", endTime: "10:30" },
    ];
    const positioned = layoutDayAppointments(appts, 9 * 60);
    const columns = positioned.map((p) => p.column).sort();
    assert.deepEqual(columns, [0, 1]);
    assert.ok(positioned.every((p) => p.columnCount === 2));
  });

  it("un tercer turno que empieza cuando termina el primero reutiliza esa columna", () => {
    const appts = [
      { startTime: "09:00", endTime: "10:00" },
      { startTime: "09:30", endTime: "10:30" },
      { startTime: "10:00", endTime: "10:30" },
    ];
    const positioned = layoutDayAppointments(appts, 9 * 60);
    // el tercero (10:00-10:30) puede ir en la columna del primero (libre desde 10:00)
    const third = positioned.find((p) => p.appt.startTime === "10:00");
    assert.equal(third?.column, 0);
    assert.equal(third?.columnCount, 2);
  });

  it("la altura mínima evita bloques invisibles para turnos muy cortos", () => {
    const positioned = layoutDayAppointments(
      [{ startTime: "09:00", endTime: "09:05" }],
      9 * 60,
    );
    assert.equal(positioned[0].heightMinutes, 15);
  });
});
