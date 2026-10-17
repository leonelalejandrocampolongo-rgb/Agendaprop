import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyDb } from "../src/lib/db";
import {
  estimatedCashCents,
  jobFinancials,
  monthPeriod,
  summarizePeriod,
  totalReceivableCents,
} from "../src/lib/finance";
import { parseMoneyToCents } from "../src/lib/format";
import type { DbShape, Job } from "../src/lib/db-types";

const now = "2026-01-01T00:00:00.000Z";

function job(id: string, status: Job["status"], priceCents: number): Job {
  return {
    id,
    clientName: id,
    clientPhone: "",
    address: "",
    description: "",
    status,
    priceCents,
    startDate: null,
    endDate: null,
    notes: "",
    createdAt: now,
  };
}

function sampleDb(): DbShape {
  const db = emptyDb();
  db.jobs.push(job("a", "terminado", 1_000_000), job("b", "en_curso", 500_000), job("c", "presupuestado", 300_000));
  db.jobPayments.push(
    { id: "p1", jobId: "a", date: "2026-03-05", type: "sena", amountCents: 400_000, method: "efectivo", notes: "", createdAt: now },
    { id: "p2", jobId: "a", date: "2026-04-02", type: "saldo", amountCents: 600_000, method: "efectivo", notes: "", createdAt: now },
    { id: "p3", jobId: "b", date: "2026-03-20", type: "sena", amountCents: 200_000, method: "transferencia", notes: "", createdAt: now },
  );
  db.expenses.push(
    { id: "e1", date: "2026-03-06", category: "Vidrios", description: "", amountCents: 150_000, method: "efectivo", jobId: "a", createdAt: now },
    { id: "e2", date: "2026-03-31", category: "Alquiler del taller", description: "", amountCents: 100_000, method: "efectivo", jobId: null, createdAt: now },
    { id: "e3", date: "2026-04-01", category: "Vidrios", description: "", amountCents: 50_000, method: "efectivo", jobId: "b", createdAt: now },
  );
  db.employees.push({ id: "emp", name: "Juan", role: "", phone: "", payFrequency: "semanal", baseAmountCents: 0, active: true, notes: "", createdAt: now });
  db.employeePayments.push(
    { id: "s1", employeeId: "emp", date: "2026-03-10", type: "sueldo", amountCents: 120_000, method: "efectivo", jobId: "a", notes: "", createdAt: now },
    { id: "s2", employeeId: "emp", date: "2026-03-28", type: "adelanto", amountCents: 30_000, method: "efectivo", jobId: null, notes: "", createdAt: now },
  );
  db.ownerWithdrawals.push({ id: "w1", date: "2026-03-30", amountCents: 100_000, method: "efectivo", notes: "", createdAt: now });
  return db;
}

test("monthPeriod covers the whole month, including leap years", () => {
  assert.deepEqual(monthPeriod(2026, 2), { from: "2026-02-01", to: "2026-02-28" });
  assert.deepEqual(monthPeriod(2028, 2), { from: "2028-02-01", to: "2028-02-29" });
  assert.deepEqual(monthPeriod(2026, 12), { from: "2026-12-01", to: "2026-12-31" });
});

test("summarizePeriod computes net profit and what stays in the business", () => {
  const s = summarizePeriod(sampleDb(), monthPeriod(2026, 3));
  assert.equal(s.incomeCents, 600_000); // p1 + p3
  assert.equal(s.businessExpensesCents, 250_000); // e1 + e2
  assert.equal(s.employeeCostsCents, 150_000); // s1 + s2
  assert.equal(s.netProfitCents, 200_000);
  assert.equal(s.withdrawalsCents, 100_000);
  assert.equal(s.retainedCents, 100_000);
  assert.deepEqual(s.expensesByCategory, [
    { category: "Vidrios", totalCents: 150_000 },
    { category: "Alquiler del taller", totalCents: 100_000 },
  ]);
  assert.deepEqual(s.employeeCostsByEmployee, [{ employeeId: "emp", name: "Juan", totalCents: 150_000 }]);
});

test("summarizePeriod only counts what falls inside the period", () => {
  const s = summarizePeriod(sampleDb(), monthPeriod(2026, 4));
  assert.equal(s.incomeCents, 600_000);
  assert.equal(s.businessExpensesCents, 50_000);
  assert.equal(s.employeeCostsCents, 0);
  assert.equal(s.netProfitCents, 550_000);
});

test("jobFinancials: profit is price minus materials and labor", () => {
  const db = sampleDb();
  const a = jobFinancials(db, db.jobs[0]);
  assert.equal(a.collectedCents, 1_000_000);
  assert.equal(a.pendingCents, 0);
  assert.equal(a.materialsCents, 150_000);
  assert.equal(a.laborCents, 120_000);
  assert.equal(a.profitCents, 730_000);
  assert.equal(a.marginPct, 73);

  const b = jobFinancials(db, db.jobs[1]);
  assert.equal(b.pendingCents, 300_000);
});

test("a quote (presupuestado) is not counted as money owed", () => {
  const db = sampleDb();
  assert.equal(jobFinancials(db, db.jobs[2]).pendingCents, 0);
  assert.equal(totalReceivableCents(db), 300_000);
});

test("a cancelled job earns only what was collected, minus what was spent", () => {
  const db = sampleDb();
  db.jobs[1].status = "cancelado";
  const b = jobFinancials(db, db.jobs[1]);
  assert.equal(b.pendingCents, 0);
  assert.equal(b.profitCents, 150_000); // 200.000 de seña − 50.000 de vidrio
});

test("estimatedCashCents subtracts everything that went out", () => {
  // 1.200.000 cobrado − 300.000 gastos − 150.000 empleados − 100.000 retiros
  assert.equal(estimatedCashCents(sampleDb()), 650_000);
});

test("parseMoneyToCents accepts the usual ways of typing pesos", () => {
  assert.equal(parseMoneyToCents("150000"), 15_000_000);
  assert.equal(parseMoneyToCents("150.000"), 15_000_000);
  assert.equal(parseMoneyToCents("1.250.000,50"), 125_000_050);
  assert.equal(parseMoneyToCents("$ 2.500"), 250_000);
  assert.equal(parseMoneyToCents("99.5"), 9_950);
  assert.equal(parseMoneyToCents("0"), 0);
  assert.equal(parseMoneyToCents(""), null);
  assert.equal(parseMoneyToCents("abc"), null);
  assert.equal(parseMoneyToCents("-500"), null);
});

test("formatTyping adds thousands dots while typing, and parses back", async () => {
  const { formatTyping } = await import("../src/components/money-input");
  assert.equal(formatTyping("1500000"), "1.500.000");
  assert.equal(formatTyping("1.500.000,505"), "1.500.000,50");
  assert.equal(formatTyping("$ 2500"), "2.500");
  assert.equal(formatTyping("007"), "7");
  assert.equal(parseMoneyToCents(formatTyping("1500000,5")), 150_000_050);
  assert.equal(parseMoneyToCents(formatTyping("150000")), 15_000_000);
});
