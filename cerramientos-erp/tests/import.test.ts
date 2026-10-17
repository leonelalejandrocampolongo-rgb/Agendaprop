import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyDb } from "../src/lib/db";
import { parseCsv } from "../src/lib/csv";
import { jobFinancials, summarizePeriod, monthPeriod } from "../src/lib/finance";
import {
  detectHeaderRow,
  guessMapping,
  parseDateCell,
  parseMoneyCell,
  parseRows,
  type Cell,
} from "../src/lib/import";
import { applyImport, undoImport } from "../src/lib/import-apply";

const ctx = { batchId: "batch-1", now: "2026-10-01T00:00:00.000Z" };

test("parseDateCell understands the usual date formats", () => {
  assert.equal(parseDateCell("2025-03-15"), "2025-03-15");
  assert.equal(parseDateCell("15/03/2025"), "2025-03-15");
  assert.equal(parseDateCell("5-3-25"), "2025-03-05");
  assert.equal(parseDateCell("15.03.2025"), "2025-03-15");
  assert.equal(parseDateCell(45731), "2025-03-15"); // número de serie de Excel
  assert.equal(parseDateCell("31/02/2025"), null);
  assert.equal(parseDateCell("hola"), null);
  assert.equal(parseDateCell(12), null);
});

test("parseMoneyCell takes absolute values and Argentine formats", () => {
  assert.equal(parseMoneyCell(150000), 15_000_000);
  assert.equal(parseMoneyCell(-2500.5), 250_050);
  assert.equal(parseMoneyCell("$ 1.250.000,50"), 125_000_050);
  assert.equal(parseMoneyCell("(15.000)"), 1_500_000);
  assert.equal(parseMoneyCell("-15.000"), 1_500_000);
  assert.equal(parseMoneyCell("abc"), null);
});

test("guessMapping picks columns from typical headers", () => {
  const headers = ["Fecha", "Concepto", "Detalle", "Importe", "Forma de pago", "Obra"];
  assert.deepEqual(guessMapping("gastos", headers), {
    date: 0,
    amount: 3,
    category: 1,
    description: 2,
    clientName: 5,
    method: 4,
  });
});

test("detectHeaderRow skips title rows above the headers", () => {
  const rows: Cell[][] = [["GASTOS 2025"], [], ["Fecha", "Importe"], ["01/02/2025", 100]];
  assert.equal(detectHeaderRow(rows), 2);
});

test("parseRows reports bad rows and skips rows without amount", () => {
  const rows: Cell[][] = [
    ["01/02/2025", 1000],
    ["mañana", 500],
    ["03/02/2025", null],
    [null, null],
  ];
  const parsed = parseRows("retiros", rows, { date: 0, amount: 1, method: null, notes: null }, 2);
  assert.equal(parsed[0].error, null);
  assert.equal(parsed[0].values.amount, 100_000);
  assert.match(parsed[1].error ?? "", /Fecha/);
  assert.equal(parsed[1].sheetRow, 3);
  assert.equal(parsed[2].skipped, true);
  assert.equal(parsed[3].skipped, true);
});

test("importing obras creates jobs and their collected payment", () => {
  const db = emptyDb();
  const rows: Cell[][] = [
    ["Familia López", "Ventanas", 1_000_000, 600_000, "Terminado", "2025-05-02"],
    ["Ana Díaz", "Balcón", 500_000, 0, "en curso", null],
  ];
  const mapping = guessMapping("obras", ["Cliente", "Trabajo", "Precio", "Cobrado", "Estado", "Fecha inicio"]);
  const summary = applyImport(db, "obras", parseRows("obras", rows, mapping, 2), ctx);
  assert.equal(summary.created, 2);
  assert.equal(db.jobs.length, 2);
  assert.equal(db.jobs[0].status, "terminado");
  assert.equal(db.jobs[1].status, "en_curso");
  assert.equal(jobFinancials(db, db.jobs[0]).pendingCents, 40_000_000);
  assert.equal(db.jobPayments[0].date, "2025-05-02");
});

test("obras with something collected but no date are rejected", () => {
  const parsed = parseRows("obras", [["X", "Y", 100, 50]], { clientName: 0, description: 1, price: 2, collected: 3 }, 2);
  assert.match(parsed[0].error ?? "", /fecha/);
});

test("importing cobros matches existing jobs and creates the missing ones", () => {
  const db = emptyDb();
  applyImport(db, "obras", parseRows("obras", [["Familia López", "Ventanas", 100_000]], { clientName: 0, description: 1, price: 2 }, 2), {
    ...ctx,
    batchId: "obras",
  });
  const rows: Cell[][] = [
    ["2025-06-01", "familia lopez", 40_000, "transferencia"],
    ["2025-06-02", "Pedro", 10_000, ""],
    ["2025-06-09", "PEDRO", 5_000, "efectivo"],
  ];
  const summary = applyImport(db, "cobros", parseRows("cobros", rows, { date: 0, clientName: 1, amount: 2, method: 3 }, 2), ctx);
  assert.equal(summary.created, 3);
  assert.equal(summary.jobsCreated, 1);
  const lopez = db.jobs.find((j) => j.clientName === "Familia López")!;
  assert.equal(jobFinancials(db, lopez).collectedCents, 4_000_000);
  assert.equal(db.jobPayments[0].method, "transferencia");
  // La obra creada para Pedro vale lo que se le cobró: no figura como deuda.
  const pedro = db.jobs.find((j) => j.clientName === "Pedro")!;
  assert.equal(pedro.priceCents, 1_500_000);
  assert.equal(jobFinancials(db, pedro).pendingCents, 0);
});

test("importing gastos adds unknown categories and links obras", () => {
  const db = emptyDb();
  db.jobs.push({ id: "j1", clientName: "Ruiz", clientPhone: "", address: "", description: "", status: "en_curso", priceCents: 0, startDate: null, endDate: null, notes: "", createdAt: ctx.now });
  const rows: Cell[][] = [
    ["2025-07-01", 5000, "vidrios", "DVH", "Ruiz"],
    ["2025-07-02", 3000, "Fletes", "", "Desconocido"],
    ["2025-07-03", 1000, null, "", null],
  ];
  const summary = applyImport(db, "gastos", parseRows("gastos", rows, { date: 0, amount: 1, category: 2, description: 3, clientName: 4, method: null }, 2), ctx);
  assert.equal(summary.created, 3);
  assert.deepEqual(summary.categoriesAdded, ["Fletes"]);
  assert.equal(summary.unmatchedJobs, 1);
  assert.equal(db.expenses[0].category, "Vidrios");
  assert.equal(db.expenses[0].jobId, "j1");
  assert.equal(db.expenses[1].jobId, null);
  assert.equal(db.expenses[2].category, "Otros");
  assert.equal(summarizePeriod(db, monthPeriod(2025, 7)).businessExpensesCents, 900_000);
});

test("importing sueldos creates each employee once", () => {
  const db = emptyDb();
  const rows: Cell[][] = [
    ["2025-08-01", "Juan", 1000, "Adelanto"],
    ["2025-08-08", "juan ", 2000, "semana"],
    ["2025-08-08", "Lucas", 1500, "Aguinaldo"],
  ];
  const summary = applyImport(db, "sueldos", parseRows("sueldos", rows, { date: 0, employeeName: 1, amount: 2, type: 3 }, 2), ctx);
  assert.equal(summary.employeesCreated, 2);
  assert.deepEqual(db.employeePayments.map((p) => p.type), ["adelanto", "sueldo", "aguinaldo"]);
});

test("undoImport removes everything a batch created, and only that", () => {
  const db = emptyDb();
  db.ownerWithdrawals.push({ id: "manual", date: "2025-01-01", amountCents: 1, method: "efectivo", notes: "", createdAt: ctx.now });
  applyImport(db, "cobros", parseRows("cobros", [["2025-06-02", "Pedro", 10_000]], { date: 0, clientName: 1, amount: 2 }, 2), ctx);
  applyImport(db, "sueldos", parseRows("sueldos", [["2025-08-01", "Juan", 1000]], { date: 0, employeeName: 1, amount: 2 }, 2), ctx);
  db.importBatches.push({ id: ctx.batchId, kind: "cobros", fileName: "x.xlsx", count: 2, createdAt: ctx.now });
  // Un gasto cargado a mano en la obra importada sobrevive, sin obra.
  db.expenses.push({ id: "e", date: "2025-06-03", category: "Otros", description: "", amountCents: 5, method: "efectivo", jobId: db.jobs[0].id, createdAt: ctx.now });

  undoImport(db, ctx.batchId);
  assert.equal(db.jobs.length, 0);
  assert.equal(db.jobPayments.length, 0);
  assert.equal(db.employees.length, 0);
  assert.equal(db.employeePayments.length, 0);
  assert.equal(db.importBatches.length, 0);
  assert.equal(db.ownerWithdrawals.length, 1);
  assert.equal(db.expenses[0].jobId, null);
});

test("parseCsv handles Excel's semicolon CSV with quotes", () => {
  const csv = '﻿Fecha;Detalle;Importe\r\n01/02/2025;"Perfiles; varios";"1.500,50"\r\n02/02/2025;"Dijo ""hola""";200\r\n';
  assert.deepEqual(parseCsv(csv), [
    ["Fecha", "Detalle", "Importe"],
    ["01/02/2025", "Perfiles; varios", "1.500,50"],
    ["02/02/2025", 'Dijo "hola"', "200"],
  ]);
});
