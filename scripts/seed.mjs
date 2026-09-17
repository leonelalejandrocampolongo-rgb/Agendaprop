// Creates data/db.json with an admin account and some sample services/hours
// if it doesn't already exist. Run with: npm run seed
//
// Customize the admin login via env vars:
//   ADMIN_EMAIL=vos@ejemplo.com ADMIN_PASSWORD=algoSeguro123 npm run seed

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@agendaprop.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cambiar123";
const ADMIN_NAME = process.env.ADMIN_NAME || "Administradora";

async function main() {
  let existing = null;
  try {
    existing = JSON.parse(await fs.readFile(DB_PATH, "utf-8"));
  } catch {
    // no existe todavía, se crea desde cero
  }

  if (existing && existing.admins?.length) {
    console.log(
      "data/db.json ya existe y tiene un admin cargado. No se pisa nada.",
    );
    console.log("Si querés recrear los datos, borrá data/db.json primero.");
    return;
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const db = {
    admins: [
      {
        id: crypto.randomUUID(),
        email: ADMIN_EMAIL,
        passwordHash,
        name: ADMIN_NAME,
        createdAt: now,
      },
    ],
    services: [
      {
        id: crypto.randomUUID(),
        name: "Masaje descontracturante",
        description: "Masaje enfocado en aliviar tensión y contracturas.",
        durationMinutes: 60,
        priceCents: 1500000,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        name: "Limpieza facial profunda",
        description: "Limpieza, exfoliación e hidratación facial.",
        durationMinutes: 45,
        priceCents: 1200000,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        name: "Masaje piedras calientes",
        description: "Masaje relajante con piedras volcánicas.",
        durationMinutes: 75,
        priceCents: 1800000,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    // Martes a sábado, 9 a 18, con corte de 13 a 14 para almorzar.
    weeklyAvailability: [2, 3, 4, 5, 6].flatMap((dayOfWeek) => [
      { id: crypto.randomUUID(), dayOfWeek, startTime: "09:00", endTime: "13:00" },
      { id: crypto.randomUUID(), dayOfWeek, startTime: "14:00", endTime: "18:00" },
    ]),
    blockedDates: [],
    appointments: [],
  };

  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));

  console.log("Listo! Se creó data/db.json con datos de ejemplo.");
  console.log("");
  console.log("Login del panel admin (/admin/login):");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("");
  console.log("Cambiá la contraseña apenas puedas o volvé a correr el seed");
  console.log("con ADMIN_EMAIL/ADMIN_PASSWORD propios antes del primer uso real.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
