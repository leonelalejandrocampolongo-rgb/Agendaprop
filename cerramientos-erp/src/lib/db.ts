import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type { DbShape } from "@/lib/db-types";

// En producción, DATA_DIR debe apuntar a un disco persistente (por ejemplo
// un Volume de Railway montado en /data); si no, cada deploy empieza de cero.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Perfiles de aluminio",
  "Vidrios",
  "Herrajes y accesorios",
  "Selladores y tornillería",
  "Herramientas",
  "Vehículo y combustible",
  "Alquiler del taller",
  "Servicios (luz, gas, internet)",
  "Impuestos y monotributo",
  "Contador y trámites",
  "Publicidad",
  "Otros",
];

export function emptyDb(): DbShape {
  return {
    users: [],
    jobs: [],
    jobPayments: [],
    expenses: [],
    employees: [],
    employeePayments: [],
    ownerWithdrawals: [],
    settings: {
      businessName: "Cerramientos de Aluminio",
      ownerName: "",
      expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES],
    },
  };
}

/**
 * Crea el primer usuario a partir de ADMIN_EMAIL/ADMIN_PASSWORD si se
 * proveen por variable de entorno. Solo corre la primera vez (cuando todavía
 * no existe el archivo de datos), para no necesitar acceso a una terminal
 * en el servidor de producción.
 */
async function seedUserFromEnv(db: DbShape): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  db.users.push({
    id: crypto.randomUUID(),
    email,
    passwordHash: await bcrypt.hash(password, 10),
    name: process.env.ADMIN_NAME || "Administrador",
    createdAt: new Date().toISOString(),
  });
}

// Serializa lecturas/escrituras dentro del proceso para que dos requests
// simultáneos nunca pisen el archivo. Alcanza para una app de un solo server.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}

async function readDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    const empty = emptyDb();
    // `settings` se combina campo por campo para que un archivo viejo no
    // pierda los campos agregados en versiones posteriores.
    return {
      ...empty,
      ...parsed,
      settings: { ...empty.settings, ...parsed.settings },
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
      const db = emptyDb();
      await seedUserFromEnv(db);
      await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
      return db;
    }
    throw err;
  }
}

async function writeDb(data: DbShape): Promise<void> {
  const tmpPath = `${DB_PATH}.tmp`;
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2));
  await fs.rename(tmpPath, DB_PATH);
}

/** Lee toda la base. Se puede llamar en paralelo sin problema. */
export function getDb(): Promise<DbShape> {
  return enqueue(readDb);
}

/**
 * Lee-modifica-escribe la base como un único paso atómico respecto de otros
 * llamados a getDb/mutateDb. `mutator` recibe los datos actuales y los
 * modifica en el lugar.
 */
export function mutateDb<T>(
  mutator: (db: DbShape) => T | Promise<T>,
): Promise<T> {
  return enqueue(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  });
}

export function newId(): string {
  return crypto.randomUUID();
}
