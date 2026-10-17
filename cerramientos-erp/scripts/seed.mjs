// Crea data/db.json con un usuario para entrar a la app, si todavía no existe.
// Uso: npm run seed
//
// Para elegir tus propias credenciales:
//   ADMIN_EMAIL=vos@ejemplo.com ADMIN_PASSWORD=algoSeguro123 npm run seed
//
// Para cargar además datos de ejemplo (obras, gastos, empleados) y ver cómo
// queda la app antes de cargar los datos reales:
//   npm run seed -- --demo

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@cerramientos.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cambiar123";
const ADMIN_NAME = process.env.ADMIN_NAME || "Administrador";
const WITH_DEMO = process.argv.includes("--demo");

const id = () => crypto.randomUUID();
const pesos = (n) => Math.round(n * 100);

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function demoData(now) {
  const juan = { id: id(), name: "Juan Pérez", role: "Oficial colocador", phone: "1155550001", payFrequency: "semanal", baseAmountCents: pesos(180000), active: true, notes: "", createdAt: now };
  const lucas = { id: id(), name: "Lucas Gómez", role: "Ayudante", phone: "1155550002", payFrequency: "semanal", baseAmountCents: pesos(120000), active: true, notes: "", createdAt: now };

  const job = (fields) => ({ id: id(), clientPhone: "", notes: "", startDate: null, endDate: null, createdAt: now, ...fields });
  const casaMartinez = job({ clientName: "Familia Martínez", address: "Av. San Martín 1234", description: "3 ventanas corredizas Módena + puerta balcón", status: "terminado", priceCents: pesos(2850000), startDate: isoDaysAgo(40), endDate: isoDaysAgo(25) });
  const localRuiz = job({ clientName: "Ferretería Ruiz", address: "Belgrano 560", description: "Frente vidriado con puerta de abrir", status: "en_curso", priceCents: pesos(4200000), startDate: isoDaysAgo(10) });
  const dptoSosa = job({ clientName: "Carla Sosa", address: "Mitre 88, 4°B", description: "Cerramiento de balcón", status: "presupuestado", priceCents: pesos(1900000) });

  const pay = (jobId, daysAgo, type, amount, method = "transferencia") => ({ id: id(), jobId, date: isoDaysAgo(daysAgo), type, amountCents: pesos(amount), method, notes: "", createdAt: now });
  const exp = (daysAgo, category, description, amount, jobId = null, method = "transferencia") => ({ id: id(), date: isoDaysAgo(daysAgo), category, description, amountCents: pesos(amount), method, jobId, createdAt: now });
  const emp = (employeeId, daysAgo, amount, jobId = null, type = "sueldo") => ({ id: id(), employeeId, date: isoDaysAgo(daysAgo), type, amountCents: pesos(amount), method: "efectivo", jobId, notes: "", createdAt: now });

  return {
    jobs: [casaMartinez, localRuiz, dptoSosa],
    jobPayments: [
      pay(casaMartinez.id, 40, "sena", 1400000),
      pay(casaMartinez.id, 24, "saldo", 1450000, "efectivo"),
      pay(localRuiz.id, 10, "sena", 2000000),
    ],
    expenses: [
      exp(38, "Perfiles de aluminio", "Perfilería línea Módena", 820000, casaMartinez.id),
      exp(36, "Vidrios", "DVH 4+9+4", 410000, casaMartinez.id),
      exp(35, "Herrajes y accesorios", "Cierres y rodamientos", 95000, casaMartinez.id),
      exp(9, "Perfiles de aluminio", "Perfilería línea A30", 1250000, localRuiz.id),
      exp(8, "Vidrios", "Laminado 3+3", 600000, localRuiz.id),
      exp(30, "Alquiler del taller", "Alquiler mensual", 350000),
      exp(2, "Alquiler del taller", "Alquiler mensual", 350000),
      exp(15, "Vehículo y combustible", "Nafta camioneta", 85000, null, "efectivo"),
      exp(5, "Servicios (luz, gas, internet)", "Luz del taller", 62000),
    ],
    employees: [juan, lucas],
    employeePayments: [
      emp(juan.id, 32, 180000, casaMartinez.id), emp(lucas.id, 32, 120000, casaMartinez.id),
      emp(juan.id, 25, 180000, casaMartinez.id), emp(lucas.id, 25, 120000, casaMartinez.id),
      emp(juan.id, 7, 180000, localRuiz.id), emp(lucas.id, 7, 120000, localRuiz.id),
      emp(lucas.id, 3, 50000, null, "adelanto"),
    ],
    ownerWithdrawals: [
      { id: id(), date: isoDaysAgo(20), amountCents: pesos(400000), method: "efectivo", notes: "Retiro personal", createdAt: now },
    ],
  };
}

/**
 * Para probar en una compu sin configurar nada: si no existe .env.local, lo
 * crea con un AUTH_SECRET al azar (Auth.js no arranca sin uno).
 */
async function ensureEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    await fs.access(envPath);
  } catch {
    const secret = crypto.randomBytes(32).toString("base64");
    await fs.writeFile(envPath, `AUTH_SECRET="${secret}"\n`);
    console.log("Se creó .env.local con una clave AUTH_SECRET nueva.");
  }
}

async function main() {
  await ensureEnvFile();
  let existing = null;
  try {
    existing = JSON.parse(await fs.readFile(DB_PATH, "utf-8"));
  } catch {
    // no existe todavía, se crea desde cero
  }

  if (existing && existing.users?.length) {
    console.log("data/db.json ya existe y tiene un usuario cargado. No se pisa nada.");
    console.log("Si querés recrear los datos, borrá data/db.json primero.");
    return;
  }

  const now = new Date().toISOString();
  const db = {
    users: [
      {
        id: id(),
        email: ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
        name: ADMIN_NAME,
        createdAt: now,
      },
    ],
    jobs: [],
    jobPayments: [],
    expenses: [],
    employees: [],
    employeePayments: [],
    ownerWithdrawals: [],
    ...(WITH_DEMO ? demoData(now) : {}),
  };

  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));

  console.log(`Listo! Se creó data/db.json${WITH_DEMO ? " con datos de ejemplo" : ""}.`);
  console.log("");
  console.log("Para entrar (/login):");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("");
  console.log("Cambiá la contraseña desde Configuración apenas entres.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
